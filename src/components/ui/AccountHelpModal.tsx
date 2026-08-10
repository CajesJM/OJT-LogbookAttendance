import { useEffect } from "react";
import { Download, Info, KeyRound, Laptop, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AccountHelpModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop account-help-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        className="modal account-help-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-help-title"
      >
        <button
          className="icon-button modal-close"
          onClick={onClose}
          aria-label="Close account information"
        >
          <X size={17} />
        </button>
        <div className="modal-icon">
          <Info size={22} />
        </div>
        <h2 id="account-help-title">Account and backup information</h2>
        <p className="account-help-intro">
          Your account and OJT data are stored only in this browser. This app
          keeps one local account per browser.
        </p>
        <div className="account-help-content">
          <section>
            <Download size={18} aria-hidden="true" />
            <div>
              <strong>Creating a new account</strong>
              <p>
                On a browser with no account, enter a new username and a
                password with at least 6 characters. Your first sign-in creates
                the account automatically.
              </p>
            </div>
          </section>
          <section>
            <KeyRound size={18} aria-hidden="true" />
            <div>
              <strong>If you forget your password</strong>
              <p>
                The password cannot be recovered because there is no online
                account server. If you are still signed in, export a backup
                before clearing any app or browser data.
              </p>
            </div>
          </section>
          <section>
            <Laptop size={18} aria-hidden="true" />
            <div>
              <strong>Using another device or browser</strong>
              <p>
                Export your backup from Profile. On the new device, create a
                local account and import the backup. Backup files do not include
                your password.
              </p>
            </div>
          </section>
        </div>
        <div className="modal-actions">
          <button className="button primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </section>
    </div>
  );
}
