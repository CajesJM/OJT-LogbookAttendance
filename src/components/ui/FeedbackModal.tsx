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
  MessageSquareWarning,
  Paperclip,
  Send,
  Trash2,
  X,
} from "lucide-react";

type Props = {
  open: boolean;
  defaultEmail: string;
  onClose: () => void;
};

type FeedbackKind = "bug" | "suggestion" | "feedback";
type FormErrors = Partial<Record<"subject" | "details" | "email" | "file", string>>;

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
  const [isClosing, setIsClosing] = useState(false);
  const subjectRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setKind("bug");
      setSubject("");
      setDetails("");
      setEmail(defaultEmail);
      setAttachment(null);
      setErrors({});
      setStep("form");
      setIsSending(false);
      setIsClosing(false);
      return;
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
      nextErrors.details = "Describe what happened using at least 15 characters.";
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      nextErrors.email = "Enter a valid email address or leave this empty.";
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
      setErrors((current) => ({ ...current, file: "Choose a JPG, PNG, or WebP image." }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((current) => ({ ...current, file: "Choose an image smaller than 5 MB." }));
      return;
    }
    setAttachment(file);
    setErrors((current) => ({ ...current, file: undefined }));
  }

  function simulateSend() {
    setIsSending(true);
    window.setTimeout(() => {
      setIsSending(false);
      setStep("sent");
    }, 650);
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
            <span><Check size={25} aria-hidden="true" /></span>
            <p className="section-kicker">Feedback received</p>
            <h2 id="feedback-title">Thank you for helping us improve.</h2>
            <p>Your report has been added to the feedback queue.</p>
            <button className="button primary" type="button" onClick={closeWithAnimation}>
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="feedback-modal-heading">
              <span className="modal-icon"><MessageSquareWarning size={22} aria-hidden="true" /></span>
              <div>
                <p className="section-kicker">Help improve OJT Logbook</p>
                <h2 id="feedback-title">
                  {step === "form" ? "Report a problem or share feedback" : "Review your feedback"}
                </h2>
              </div>
            </div>

            {step === "form" ? (
              <form className="feedback-form" onSubmit={review} noValidate>
                <label>
                  <span>Feedback type</span>
                  <select value={kind} onChange={(event) => setKind(event.target.value as FeedbackKind)}>
                    <option value="bug">Problem or bug</option>
                    <option value="suggestion">Feature suggestion</option>
                    <option value="feedback">General feedback</option>
                  </select>
                </label>
                <label>
                  <span className="feedback-label-row"><span>Title</span><small>{subject.length}/80</small></span>
                  <input
                    ref={subjectRef}
                    value={subject}
                    maxLength={80}
                    placeholder="Briefly describe the issue"
                    onChange={(event) => {
                      setSubject(event.target.value);
                      if (errors.subject) setErrors((current) => ({ ...current, subject: undefined }));
                    }}
                    aria-invalid={Boolean(errors.subject)}
                    aria-describedby={errors.subject ? "feedback-subject-error" : undefined}
                  />
                  {errors.subject && <small className="field-error" id="feedback-subject-error">{errors.subject}</small>}
                </label>
                <label>
                  <span className="feedback-label-row"><span>What happened?</span><small>{details.length}/1000</small></span>
                  <textarea
                    value={details}
                    maxLength={1000}
                    placeholder="Tell us what you expected and what happened instead"
                    onChange={(event) => {
                      setDetails(event.target.value);
                      if (errors.details) setErrors((current) => ({ ...current, details: undefined }));
                    }}
                    aria-invalid={Boolean(errors.details)}
                    aria-describedby={errors.details ? "feedback-details-error" : undefined}
                  />
                  {errors.details && <small className="field-error" id="feedback-details-error">{errors.details}</small>}
                </label>
                <label>
                  <span>Email for a reply <small>Optional</small></span>
                  <input
                    type="email"
                    value={email}
                    placeholder="name@gmail.com"
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
                    }}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? "feedback-email-error" : undefined}
                  />
                  {errors.email && <small className="field-error" id="feedback-email-error">{errors.email}</small>}
                </label>
                <div className="feedback-attachment">
                  <div>
                    <strong>Screenshot</strong>
                    <span>Optional image, up to 5 MB</span>
                  </div>
                  {attachment ? (
                    <div className="feedback-file">
                      <span title={attachment.name}>{attachment.name}</span>
                      <button type="button" onClick={() => setAttachment(null)} aria-label="Remove screenshot">
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <label className="button secondary feedback-file-button">
                      <Paperclip size={16} aria-hidden="true" /> Attach
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseAttachment} />
                    </label>
                  )}
                  {errors.file && <small className="field-error">{errors.file}</small>}
                </div>
                <div className="modal-actions feedback-actions">
                  <button className="button secondary" type="button" onClick={closeWithAnimation}>Cancel</button>
                  <button className="button primary" type="submit">Review feedback <ArrowRight size={17} aria-hidden="true" /></button>
                </div>
              </form>
            ) : (
              <div className="feedback-review">
                <dl>
                  <div><dt>Type</dt><dd>{KIND_LABELS[kind]}</dd></div>
                  <div><dt>Title</dt><dd>{subject.trim()}</dd></div>
                  <div className="full"><dt>Details</dt><dd>{details.trim()}</dd></div>
                  {email && <div><dt>Reply to</dt><dd>{email}</dd></div>}
                  {attachment && <div><dt>Screenshot</dt><dd>{attachment.name}</dd></div>}
                </dl>
                <div className="modal-actions feedback-actions">
                  <button className="button secondary" type="button" onClick={() => setStep("form")} disabled={isSending}>
                    <ArrowLeft size={17} aria-hidden="true" /> Back
                  </button>
                  <button className="button primary" type="button" onClick={simulateSend} disabled={isSending}>
                    <Send size={17} aria-hidden="true" /> {isSending ? "Sending..." : "Send feedback"}
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
