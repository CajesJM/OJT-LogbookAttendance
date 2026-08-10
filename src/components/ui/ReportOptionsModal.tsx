import { useEffect } from "react";
import { CalendarRange, Download, FileText, Files, Printer, Rows3, X } from "lucide-react";
import type { ReportTemplate } from "../../types";

export type ReportAction = "print" | "download";
export type ReportFormat = "pdf" | "docx";

type Props = {
  action: ReportAction | null;
  separateByMonth: boolean;
  format: ReportFormat;
  template: ReportTemplate;
  onSeparateByMonthChange: (value: boolean) => void;
  onFormatChange: (value: ReportFormat) => void;
  onTemplateChange: (value: ReportTemplate) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ReportOptionsModal({
  action,
  separateByMonth,
  format,
  template,
  onSeparateByMonthChange,
  onFormatChange,
  onTemplateChange,
  onCancel,
  onConfirm,
}: Props) {
  useEffect(() => {
    if (!action) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [action, onCancel]);

  if (!action) return null;
  const ActionIcon = action === "print" ? Printer : Download;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onCancel()}
    >
      <section className="modal report-options-modal" role="dialog" aria-modal="true" aria-labelledby="report-options-title">
        <div className="modal-icon"><ActionIcon size={22} aria-hidden="true" /></div>
        <button className="icon-button modal-close" onClick={onCancel} aria-label="Close report options">
          <X size={18} />
        </button>
        <h2 id="report-options-title">Choose report format</h2>
        <p>Select a paper preview, then choose how the pages should be arranged.</p>
        <div className="report-template-options" role="radiogroup" aria-label="Report design">
          <label className={template === "detailed" ? "selected" : ""}>
            <input type="radio" name="report-template" checked={template === "detailed"} onChange={() => onTemplateChange("detailed")} />
            <span className="report-paper-preview detailed-preview" aria-hidden="true">
              <i className="preview-title" /><i className="preview-summary" /><i className="preview-summary short" />
              <i className="preview-heading" /><i className="preview-record" /><i className="preview-record" /><i className="preview-record short" />
            </span>
            <span className="report-template-copy"><strong>Detailed report</strong><small>Full activities, reflections, balances, and signatures.</small></span>
          </label>
          <label className={template === "worklog" ? "selected" : ""}>
            <input type="radio" name="report-template" checked={template === "worklog"} onChange={() => onTemplateChange("worklog")} />
            <span className="report-paper-preview worklog-preview" aria-hidden="true">
              <i className="preview-worklog-title" /><i className="preview-month" />
              <i className="preview-table-head" />
              {Array.from({ length: 7 }, (_, index) => <i className="preview-table-row" key={index} />)}
            </span>
            <span className="report-template-copy"><strong>Monthly work log</strong><small>Compact time and balance table with optional notes and signatures.</small></span>
          </label>
        </div>
        <p className="report-option-label">Page layout</p>
        <div className="report-layout-options" role="radiogroup" aria-label="Report page layout">
          <label className={!separateByMonth ? "selected" : ""}>
            <input type="radio" name="report-layout" checked={!separateByMonth} onChange={() => onSeparateByMonthChange(false)} />
            <Rows3 size={18} aria-hidden="true" />
            <span><strong>Continuous report</strong><small>Use each page fully across all months.</small></span>
          </label>
          <label className={separateByMonth ? "selected" : ""}>
            <input type="radio" name="report-layout" checked={separateByMonth} onChange={() => onSeparateByMonthChange(true)} />
            <CalendarRange size={18} aria-hidden="true" />
            <span><strong>Separate by month</strong><small>Start every month on a new page.</small></span>
          </label>
        </div>
        {action === "download" && (
          <>
            <p className="report-option-label">File format</p>
            <div className="report-format-options" role="radiogroup" aria-label="Download file format">
              <label className={format === "pdf" ? "selected" : ""}>
                <input type="radio" name="report-format" checked={format === "pdf"} onChange={() => onFormatChange("pdf")} />
                <Files size={17} aria-hidden="true" />
                <span><strong>PDF</strong><small>Ready to print</small></span>
              </label>
              <label className={format === "docx" ? "selected" : ""}>
                <input type="radio" name="report-format" checked={format === "docx"} onChange={() => onFormatChange("docx")} />
                <FileText size={17} aria-hidden="true" />
                <span><strong>DOCX</strong><small>Editable in Word</small></span>
              </label>
            </div>
          </>
        )}
        <div className="modal-actions">
          <button className="button secondary" onClick={onCancel}>Cancel</button>
          <button className="button primary" onClick={onConfirm}>
            {action === "print" ? <Printer size={17} /> : <Files size={17} />}
            {action === "print" ? "Continue to print" : `Download ${format.toUpperCase()}`}
          </button>
        </div>
      </section>
    </div>
  );
}
