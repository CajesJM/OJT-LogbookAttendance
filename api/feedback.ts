type FeedbackKind = "bug" | "suggestion" | "feedback";

type AttachmentPayload = {
  content?: unknown;
  filename?: unknown;
  contentType?: unknown;
  size?: unknown;
};

type FeedbackPayload = {
  kind?: unknown;
  subject?: unknown;
  details?: unknown;
  email?: unknown;
  attachment?: AttachmentPayload;
  website?: unknown;
  startedAt?: unknown;
  submissionId?: unknown;
  pageUrl?: unknown;
};

declare const process: {
  env: Record<string, string | undefined>;
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
const FEEDBACK_COOLDOWN_SECONDS = 5 * 60;
const FEEDBACK_COOLDOWN_COOKIE = "ojt_feedback_cooldown";
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const KIND_LABELS: Record<FeedbackKind, string> = {
  bug: "Problem or bug",
  suggestion: "Feature suggestion",
  feedback: "General feedback",
};

const recentRequests = new Map<string, number[]>();

function jsonResponse(
  body: unknown,
  status = 200,
  additionalHeaders: Record<string, string> = {},
) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...additionalHeaders,
    },
  });
}

function getCooldownRemaining(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cooldownCookie = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${FEEDBACK_COOLDOWN_COOKIE}=`));
  if (!cooldownCookie) return 0;
  const cooldownUntil = Number(cooldownCookie.split("=")[1]);
  if (!Number.isFinite(cooldownUntil)) return 0;
  return Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character,
  );
}

function isEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getClientKey(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isRateLimited(key: string) {
  const now = Date.now();
  const windowStart = now - 10 * 60 * 1000;
  const attempts = (recentRequests.get(key) ?? []).filter(
    (time) => time > windowStart,
  );
  if (attempts.length >= 5) return true;
  attempts.push(now);
  recentRequests.set(key, attempts);
  return false;
}

function safeFilename(value: string) {
  const cleaned = value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  return cleaned || "feedback-screenshot";
}

function validatePayload(payload: FeedbackPayload) {
  const kind = typeof payload.kind === "string" ? payload.kind : "";
  const subject =
    typeof payload.subject === "string" ? payload.subject.trim() : "";
  const details =
    typeof payload.details === "string" ? payload.details.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const pageUrl =
    typeof payload.pageUrl === "string" ? payload.pageUrl.slice(0, 500) : "";

  if (!(kind in KIND_LABELS))
    return { error: "Choose a valid feedback type." } as const;
  if (subject.length < 4 || subject.length > 80)
    return { error: "The title must contain 4 to 80 characters." } as const;
  if (details.length < 15 || details.length > 1000)
    return {
      error: "The details must contain 15 to 1000 characters.",
    } as const;
  if (!email) return { error: "A reply email address is required." } as const;
  if (!isEmail(email)) return { error: "Enter a valid reply email address." } as const;

  let attachment: { content: string; filename: string } | undefined;
  if (payload.attachment) {
    const { content, filename, contentType, size } = payload.attachment;
    if (
      typeof content !== "string" ||
      typeof filename !== "string" ||
      typeof contentType !== "string" ||
      typeof size !== "number"
    ) {
      return { error: "The screenshot is invalid." } as const;
    }
    if (
      !ALLOWED_ATTACHMENT_TYPES.has(contentType) ||
      size <= 0 ||
      size > MAX_ATTACHMENT_BYTES
    ) {
      return {
        error: "Use a JPG, PNG, or WebP screenshot smaller than 2 MB.",
      } as const;
    }
    const expectedBase64Length = Math.ceil(size / 3) * 4;
    if (
      !/^[A-Za-z0-9+/]*={0,2}$/.test(content) ||
      Math.abs(content.length - expectedBase64Length) > 4
    ) {
      return { error: "The screenshot data is invalid." } as const;
    }
    attachment = { content, filename: safeFilename(filename) };
  }

  return {
    data: {
      kind: kind as FeedbackKind,
      subject,
      details,
      email,
      pageUrl,
      attachment,
    },
  } as const;
}

export default {
  async fetch(request: Request) {
    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed." }, 405);
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return jsonResponse({ error: "Send feedback as JSON." }, 415);
    }

    let payload: FeedbackPayload;
    try {
      payload = (await request.json()) as FeedbackPayload;
    } catch {
      return jsonResponse({ error: "The feedback request is invalid." }, 400);
    }

    if (typeof payload.website === "string" && payload.website.trim()) {
      return jsonResponse({ ok: true });
    }
    const cooldownRemaining = getCooldownRemaining(request);
    if (cooldownRemaining > 0) {
      return jsonResponse(
        {
          error: `You can send another feedback message in ${cooldownRemaining} seconds.`,
          retryAfter: cooldownRemaining,
        },
        429,
      );
    }
    if (
      typeof payload.startedAt !== "number" ||
      Date.now() - payload.startedAt < 1200
    ) {
      return jsonResponse(
        { error: "Please review your feedback before sending it." },
        400,
      );
    }
    if (isRateLimited(getClientKey(request))) {
      return jsonResponse(
        {
          error: "Too many feedback messages. Please try again in 10 minutes.",
        },
        429,
      );
    }

    const validation = validatePayload(payload);
    if ("error" in validation)
      return jsonResponse({ error: validation.error }, 400);

    const apiKey = process.env.RESEND_API_KEY;
    const recipient = process.env.FEEDBACK_TO_EMAIL;
    const sender =
      process.env.RESEND_FROM_EMAIL || "OJT Logbook <onboarding@resend.dev>";
    if (!apiKey || !recipient) {
      console.error(
        "Feedback email is missing RESEND_API_KEY or FEEDBACK_TO_EMAIL.",
      );
      return jsonResponse(
        { error: "Feedback email is not configured yet." },
        503,
      );
    }

    const { kind, subject, details, email, pageUrl, attachment } =
      validation.data;
    const submittedAt = new Date().toISOString();
    const safeKind = escapeHtml(KIND_LABELS[kind]);
    const safeSubject = escapeHtml(subject);
    const safeDetails = escapeHtml(details).replace(/\n/g, "<br>");
    const safeEmail = escapeHtml(email);
    const safePageUrl = pageUrl ? escapeHtml(pageUrl) : "Not provided";
    const text = [
      `Feedback type: ${KIND_LABELS[kind]}`,
      `Title: ${subject}`,
      `Reply email: ${email}`,
      `Page: ${pageUrl || "Not provided"}`,
      `Submitted: ${submittedAt}`,
      "",
      details,
    ].join("\n");
    const html = `
      <div style="font-family:Arial,sans-serif;color:#14211c;line-height:1.6;max-width:640px">
        <h1 style="font-size:22px;margin:0 0 18px">New OJT Logbook feedback</h1>
        <table style="border-collapse:collapse;width:100%;margin-bottom:20px">
          <tr><td style="padding:7px 12px;background:#f1f7f4;font-weight:700">Type</td><td style="padding:7px 12px;background:#f1f7f4">${safeKind}</td></tr>
          <tr><td style="padding:7px 12px;font-weight:700">Title</td><td style="padding:7px 12px">${safeSubject}</td></tr>
          <tr><td style="padding:7px 12px;background:#f1f7f4;font-weight:700">Reply email</td><td style="padding:7px 12px;background:#f1f7f4">${safeEmail}</td></tr>
          <tr><td style="padding:7px 12px;font-weight:700">Page</td><td style="padding:7px 12px">${safePageUrl}</td></tr>
          <tr><td style="padding:7px 12px;background:#f1f7f4;font-weight:700">Submitted</td><td style="padding:7px 12px;background:#f1f7f4">${submittedAt}</td></tr>
        </table>
        <h2 style="font-size:16px;margin:0 0 8px">Details</h2>
        <p style="margin:0;padding:14px;background:#f7faf8;border:1px solid #dce7e1;border-radius:6px">${safeDetails}</p>
      </div>`;

    const submissionId =
      typeof payload.submissionId === "string"
        ? payload.submissionId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100)
        : "";
    const resendResponse = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(submissionId
          ? { "Idempotency-Key": `feedback-${submissionId}` }
          : {}),
      },
      body: JSON.stringify({
        from: sender,
        to: [recipient],
        subject: `[OJT Logbook ${KIND_LABELS[kind]}] ${subject}`,
        html,
        text,
        reply_to: email,
        ...(attachment ? { attachments: [attachment] } : {}),
        tags: [{ name: "feedback_type", value: kind }],
      }),
    });

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text();
      console.error(
        `Resend feedback request failed (${resendResponse.status}): ${resendError.slice(0, 500)}`,
      );
      return jsonResponse(
        { error: "Email delivery failed. Please try again shortly." },
        502,
      );
    }

    const result = (await resendResponse.json()) as { id?: string };
    const cooldownUntil = Date.now() + FEEDBACK_COOLDOWN_SECONDS * 1000;
    return jsonResponse(
      { ok: true, id: result.id, retryAfter: FEEDBACK_COOLDOWN_SECONDS },
      200,
      {
        "Set-Cookie": `${FEEDBACK_COOLDOWN_COOKIE}=${cooldownUntil}; Max-Age=${FEEDBACK_COOLDOWN_SECONDS}; Path=/api/feedback; HttpOnly; Secure; SameSite=Strict`,
      },
    );
  },
};
