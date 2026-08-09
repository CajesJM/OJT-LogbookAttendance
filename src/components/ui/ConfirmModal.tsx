import { useEffect, useRef } from "react";
import { AlertTriangle, ShieldCheck, X } from "lucide-react";
import type { ConfirmOptions } from "../../hooks/useConfirm";

type Props = {
  dialog: ConfirmOptions | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmModal({ dialog, onCancel, onConfirm }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!dialog) return;
    confirmRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dialog, onCancel]);

  if (!dialog) return null;
  const Icon = dialog.tone === "danger" ? AlertTriangle : ShieldCheck;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) =>
        event.target === event.currentTarget && onCancel()
      }
    >
      <section
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
      >
        <div
          className={`modal-icon ${dialog.tone === "danger" ? "danger" : ""}`}
        >
          <Icon size={24} aria-hidden="true" />
        </div>
        <button
          className="icon-button modal-close"
          onClick={onCancel}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
        <h2 id="confirm-title">{dialog.title}</h2>
        <p id="confirm-description">{dialog.description}</p>
        <div className="modal-actions">
          <button className="button secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            ref={confirmRef}
            className={`button ${dialog.tone === "danger" ? "danger-solid" : "primary"}`}
            onClick={onConfirm}
          >
            {dialog.confirmLabel || "Confirm"}
          </button>
        </div>
      </section>
    </div>
  );
}
