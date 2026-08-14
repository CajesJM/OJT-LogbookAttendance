import { useEffect, useState } from "react";
import { Clock3, Download, HardDriveDownload } from "lucide-react";

type Props = {
  open: boolean;
  onExport: () => Promise<void>;
  onSnooze: () => Promise<void>;
};

export function BackupReminderModal({ open, onExport, onSnooze }: Props) {
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!open) setWorking(false);
  }, [open]);

  if (!open) return null;

  async function run(action: () => Promise<void>) {
    setWorking(true);
    try {
      await action();
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="modal backup-reminder-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="backup-reminder-title"
        aria-describedby="backup-reminder-description"
      >
        <div className="modal-icon">
          <HardDriveDownload size={23} aria-hidden="true" />
        </div>
        <h2 id="backup-reminder-title">Your logbook backup is overdue</h2>
        <p id="backup-reminder-description">
          Your records are stored only in this browser. Export a backup now so
          you can restore them if this device or its browser data becomes
          unavailable.
        </p>
        <div className="modal-actions">
          <button
            className="button secondary"
            onClick={() => void run(onSnooze)}
            disabled={working}
          >
            <Clock3 size={17} /> Remind me in 12 hours
          </button>
          <button
            className="button primary"
            onClick={() => void run(onExport)}
            disabled={working}
          >
            <Download size={17} /> {working ? "Preparing..." : "Export backup"}
          </button>
        </div>
      </section>
    </div>
  );
}
