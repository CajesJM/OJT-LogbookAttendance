import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import type { ToastMessage } from "../../types";

type Props = {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
};

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export function ToastViewport({ toasts, onDismiss }: Props) {
  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => {
        const Icon = icons[toast.kind];
        return (
          <div
            className={`toast toast-${toast.kind}${toast.exiting ? " is-exiting" : ""}`}
            key={toast.id}
            role="status"
          >
            <Icon size={17} aria-hidden="true" />
            <span>{toast.message}</span>
            <button
              className="icon-button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
