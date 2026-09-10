import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  FileImage,
  MessageSquareWarning,
  Paperclip,
  Send,
  Trash2,
  X,
} from "lucide-react";
import {
  formatFeedbackCooldown,
  startFeedbackCooldown,
  useFeedbackCooldown,
} from "../../hooks/useFeedbackCooldown";

type Props = {
  open: boolean;
  defaultEmail: string;
  onClose: () => void;
};

type FeedbackKind = "bug" | "suggestion" | "feedback";
type FormErrors = Partial<
  Record<"subject" | "details" | "email" | "file", string>
>;

const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
const SEND_TIMEOUT_MS = 15_000;

const KIND_LABELS: Record<FeedbackKind, string> = {
  bug: "Problem or bug",
  suggestion: "Feature suggestion",
  feedback: "General feedback",
};

export function FeedbackModal({ open, defaultEmail, onClose }: Props) {
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [step, setStep] = useState<"form" | "review" | "sent">("form");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [website, setWebsite] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const cooldownRemaining = useFeedbackCooldown();
  const subjectRef = useRef<HTMLInputElement>(null);
  const openedAtRef = useRef(Date.now());
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      setKind("bug");
      setSubject("");
      setDetails("");
      setEmail(defaultEmail);
      setAttachment(null);
      setErrors({});
      setStep("form");
      setIsSending(false);
      setSendError("");
      setWebsite("");
      setIsClosing(false);
      return;
    }

    if (!wasOpenRef.current) {
      openedAtRef.current = Date.now();
      wasOpenRef.current = true;
    }
    const focusTimer = window.setTimeout(() => subjectRef.current?.focus(), 80);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSending) closeWithAnimation();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [defaultEmail, isSending, open]);

  function closeWithAnimation() {
    if (isClosing || isSending) return;
    setIsClosing(true);
    window.setTimeout(onClose, 220);
  }

  function validate() {
    const nextErrors: FormErrors = {};
    if (subject.trim().length < 4) {
      nextErrors.subject = "Add a short title with at least 4 characters.";
    }
    if (details.trim().length < 15) {
      nextErrors.details =
        "Describe what happened using at least 15 characters.";
    }
    if (!email.trim()) {
      nextErrors.email = "Enter an email address so we can reply to you.";
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      nextErrors.email = "Enter a valid email address.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function review(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    setStep("review");
  }

  function chooseAttachment(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors((current) => ({
        ...current,
        file: "Choose a JPG, PNG, or WebP image.",
      }));
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setErrors((current) => ({
        ...current,
        file: "Choose an image smaller than 2 MB.",
      }));
      return;
    }
    setAttachment(file);
    setErrors((current) => ({ ...current, file: undefined }));
  }

  function fileToBase64(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        const separatorIndex = result.indexOf(",");
        if (separatorIndex < 0) {
          reject(new Error("The screenshot could not be read."));
          return;
        }
        resolve(result.slice(separatorIndex + 1));
      };
      reader.onerror = () =>
        reject(new Error("The screenshot could not be read."));
      reader.readAsDataURL(file);
    });
  }

  async function sendFeedback() {
    if (cooldownRemaining > 0) {
      setSendError(
        `You can send another message in ${formatFeedbackCooldown(cooldownRemaining)}.`,
      );
      return;
    }
    setIsSending(true);
    setSendError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      SEND_TIMEOUT_MS,
    );

    try {
      const attachmentPayload = attachment
        ? {
            content: await fileToBase64(attachment),
            filename: attachment.name,
            contentType: attachment.type,
            size: attachment.size,
          }
        : undefined;
      const submissionId =
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          subject: subject.trim(),
          details: details.trim(),
          email: email.trim(),
          attachment: attachmentPayload,
          website,
          startedAt: openedAtRef.current,
          submissionId,
          pageUrl: window.location.href,
        }),
        signal: controller.signal,
      });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
        retryAfter?: number;
      } | null;
      if (!response.ok) {
        if (response.status === 429 && result?.retryAfter) {
          startFeedbackCooldown(result.retryAfter);
        }
        throw new Error(
          result?.error || "Feedback could not be sent. Please try again.",
        );
      }

      startFeedbackCooldown();
      setIsSending(false);
      setStep("sent");
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === "AbortError"
          ? "The request took too long. Check your connection and try again."
          : error instanceof Error
            ? error.message
            : "Feedback could not be sent. Please try again.";
      setSendError(message);
      setIsSending(false);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  if (!open) return null;

  return (
    <div
      className={`modal-backdrop feedback-backdrop${isClosing ? " is-closing" : ""}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeWithAnimation();
      }}
    >
      <section
        className={`modal feedback-modal${isClosing ? " is-closing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
      >
        <button
          className="icon-button modal-close"
          type="button"
          onClick={closeWithAnimation}
          disabled={isSending}
          aria-label="Close feedback form"
        >
          <X size={18} aria-hidden="true" />
        </button>

        {step === "sent" ? (
          <div className="feedback-success" role="status">
            <span>
              <Check size={25} aria-hidden="true" />
            </span>
            <p className="section-kicker">Feedback received</p>
            <h2 id="feedback-title">Thank you for helping us improve.</h2>
            <p>Your message was sent successfully.</p>
            <p className="feedback-success-cooldown">
              <Clock3 size={14} aria-hidden="true" /> You can send another in{" "}
              <strong>{formatFeedbackCooldown(cooldownRemaining)}</strong>
            </p>
            <button
              className="button primary"
              type="button"
              onClick={closeWithAnimation}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="feedback-modal-heading">
              <span className="modal-icon">
                <MessageSquareWarning size={22} aria-hidden="true" />
              </span>
              <div>
                <p className="section-kicker">Help improve OJT Logbook</p>
                <h2 id="feedback-title">
                  {step === "form"
                    ? "Report a problem or share feedback"
                    : "Review your feedback"}
                </h2>
              </div>
            </div>

            {step === "form" ? (
              <form className="feedback-form" onSubmit={review} noValidate>
                <label className="feedback-honeypot" aria-hidden="true">
                  <span>Website</span>
                  <input
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </label>
                <label>
                  <span>Feedback type</span>
                  <select
                    value={kind}
                    onChange={(event) =>
                      setKind(event.target.value as FeedbackKind)
                    }
                  >
                    <option value="bug">Problem or bug</option>
                    <option value="suggestion">Feature suggestion</option>
                    <option value="feedback">General feedback</option>
                  </select>
                </label>
                <label>
                  <span className="feedback-label-row">
                    <span>Title</span>
                    <small>{subject.length}/80</small>
                  </span>
                  <input
                    ref={subjectRef}
                    value={subject}
                    maxLength={80}
                    placeholder="Briefly describe the issue"
                    onChange={(event) => {
                      setSubject(event.target.value);
                      if (errors.subject)
                        setErrors((current) => ({
                          ...current,
                          subject: undefined,
                        }));
                    }}
                    aria-invalid={Boolean(errors.subject)}
                    aria-describedby={
                      errors.subject ? "feedback-subject-error" : undefined
                    }
                  />
                  {errors.subject && (
                    <small className="field-error" id="feedback-subject-error">
                      {errors.subject}
                    </small>
                  )}
                </label>
                <label>
                  <span className="feedback-label-row">
                    <span>What happened?</span>
                    <small>{details.length}/1000</small>
                  </span>
                  <textarea
                    value={details}
                    maxLength={1000}
                    placeholder="Tell us what you expected and what happened instead"
                    onChange={(event) => {
                      setDetails(event.target.value);
                      if (errors.details)
                        setErrors((current) => ({
                          ...current,
                          details: undefined,
                        }));
                    }}
                    aria-invalid={Boolean(errors.details)}
                    aria-describedby={
                      errors.details ? "feedback-details-error" : undefined
                    }
                  />
                  {errors.details && (
                    <small className="field-error" id="feedback-details-error">
                      {errors.details}
                    </small>
                  )}
                </label>
                <label>
                  <span>
                    Email for a reply
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    placeholder="name@gmail.com"
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (errors.email)
                        setErrors((current) => ({
                          ...current,
                          email: undefined,
                        }));
                    }}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={
                      errors.email ? "feedback-email-error" : undefined
                    }
                  />
                  {errors.email && (
                    <small className="field-error" id="feedback-email-error">
                      {errors.email}
                    </small>
                  )}
                </label>
                <div className="feedback-attachment">
                  <div>
                    <strong>Screenshot</strong>
                    <span>Optional image, up to 2 MB</span>
                  </div>
                  {attachment ? (
                    <div className="feedback-file">
                      <span title={attachment.name}>{attachment.name}</span>
                      <button
                        type="button"
                        onClick={() => setAttachment(null)}
                        aria-label="Remove screenshot"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <label className="button secondary feedback-file-button">
                      <Paperclip size={16} aria-hidden="true" /> Attach
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={chooseAttachment}
                      />
                    </label>
                  )}
                  {errors.file && (
                    <small className="field-error">{errors.file}</small>
                  )}
                </div>
                <div className="modal-actions feedback-actions">
                  <button
                    className="button secondary"
                    type="button"
                    onClick={closeWithAnimation}
                  >
                    Cancel
                  </button>
                  <button className="button primary" type="submit">
                    Review feedback <ArrowRight size={17} aria-hidden="true" />
                  </button>
                </div>
              </form>
            ) : (
              <div className="feedback-review">
                <div className="feedback-review-status">
                  <span><Check size={17} aria-hidden="true" /></span>
                  <div>
                    <strong>Ready to send</strong>
                    <p>Check the details below before sending your message.</p>
                  </div>
                </div>
                <dl>
                  <div className="feedback-review-kind">
                    <dt>Type</dt>
                    <dd><span>{KIND_LABELS[kind]}</span></dd>
                  </div>
                  <div className="feedback-review-title">
                    <dt>Title</dt>
                    <dd>{subject.trim()}</dd>
                  </div>
                  <div className="full">
                    <dt>Details</dt>
                    <dd>{details.trim()}</dd>
                  </div>
                  <div>
                    <dt>Reply to</dt>
                    <dd>{email.trim()}</dd>
                  </div>
                  {attachment && (
                    <div>
                      <dt>Screenshot</dt>
                      <dd className="feedback-review-file">
                        <FileImage size={15} aria-hidden="true" /> {attachment.name}
                      </dd>
                    </div>
                  )}
                </dl>
                {cooldownRemaining > 0 && (
                  <div className="feedback-cooldown" role="status">
                    <Clock3 size={17} aria-hidden="true" />
                    <span>
                      Another message can be sent in{" "}
                      <strong>{formatFeedbackCooldown(cooldownRemaining)}</strong>
                    </span>
                  </div>
                )}
                {sendError && (
                  <p className="feedback-submit-error" role="alert">
                    {sendError}
                  </p>
                )}
                <div className="modal-actions feedback-actions">
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => {
                      setSendError("");
                      setStep("form");
                    }}
                    disabled={isSending}
                  >
                    <ArrowLeft size={17} aria-hidden="true" /> Back
                  </button>
                  <button
                    className="button primary"
                    type="button"
                    onClick={sendFeedback}
                    disabled={isSending || cooldownRemaining > 0}
                  >
                    <Send size={17} aria-hidden="true" />{" "}
                    {isSending
                      ? "Sending..."
                      : cooldownRemaining > 0
                        ? `Send again in ${formatFeedbackCooldown(cooldownRemaining)}`
                        : "Send feedback"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
