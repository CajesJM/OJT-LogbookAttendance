import { useEffect, useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onClear: () => Promise<boolean>;
};

export function ClearBrowserDataModal({ open, onClose, onClear }: Props) {
  const [confirmation, setConfirmation] = useState("");
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmation("");
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !clearing) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [clearing, onClose, open]);

  if (!open) return null;

  async function clearData() {
    if (confirmation !== "DELETE") return;
    setClearing(true);
    const cleared = await onClear();
    setClearing(false);
    if (cleared) onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !clearing && onClose()}>
      <section className="modal clear-data-modal" role="alertdialog" aria-modal="true" aria-labelledby="clear-data-title" aria-describedby="clear-data-description">
        <div className="modal-icon danger"><AlertTriangle size={23} aria-hidden="true" /></div>
        <button className="icon-button modal-close" onClick={onClose} disabled={clearing} aria-label="Close delete account dialog"><X size={18} /></button>
        <h2 id="clear-data-title">Delete this local account?</h2>
        <p id="clear-data-description">This permanently removes the account and all OJT information saved in this browser.</p>
        <ul className="clear-data-list">
          <li>Username and password</li>
          <li>Profile details and profile photo</li>
          <li>Daily records, reflections, and signatures</li>
        </ul>
        <p className="clear-data-warning">This cannot be undone without an exported backup.</p>
        <label className="clear-data-confirmation">
          <span>Type <b>DELETE</b> to continue</span>
          <input value={confirmation} onChange={(event) => setConfirmation(event.target.value.toUpperCase())} autoComplete="off" placeholder="DELETE" />
        </label>
        <div className="modal-actions">
          <button className="button secondary" onClick={onClose} disabled={clearing}>Cancel</button>
          <button className="button danger-solid" onClick={clearData} disabled={confirmation !== "DELETE" || clearing}>
            <Trash2 size={17} /> {clearing ? "Deleting..." : "Delete account and data"}
          </button>
        </div>
      </section>
    </div>
  );
}
