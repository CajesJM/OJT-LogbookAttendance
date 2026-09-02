import { useCallback, useEffect, useState } from "react";
import {
  CalendarRange,
  Download,
  FileText,
  Files,
  Info,
  Printer,
  Rows3,
  X,
} from "lucide-react";
import { PAPER_SIZES } from "../../lib/paperSizes";
import type { PaperSizeId, ReportTemplate } from "../../types";

export type ReportAction = "print" | "download";
export type ReportFormat = "pdf" | "docx";

type Props = {
  action: ReportAction | null;
  separateByMonth: boolean;
  format: ReportFormat;
  template: ReportTemplate;
  paperSize: PaperSizeId;
  onSeparateByMonthChange: (value: boolean) => void;
  onFormatChange: (value: ReportFormat) => void;
  onTemplateChange: (value: ReportTemplate) => void;
  onPaperSizeChange: (value: PaperSizeId) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ReportOptionsModal({
  action,
  separateByMonth,
  format,
  template,
  paperSize,
  onSeparateByMonthChange,
  onFormatChange,
  onTemplateChange,
  onPaperSizeChange,
  onCancel,
  onConfirm,
}: Props) {
  const [showTmcInfo, setShowTmcInfo] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const closeWithAnimation = useCallback(
    (complete: () => void) => {
      if (isClosing) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        complete();
        return;
      }
      setIsClosing(true);
      window.setTimeout(complete, 220);
    },
    [isClosing],
  );

  useEffect(() => {
    if (!action) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (showTmcInfo) setShowTmcInfo(false);
      else closeWithAnimation(onCancel);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [action, closeWithAnimation, onCancel, showTmcInfo]);

  if (!action) return null;
  const ActionIcon = action === "print" ? Printer : Download;
  const chooseTemplate = (value: ReportTemplate) => {
    onTemplateChange(value);
    if (value === "tmc") {
      onSeparateByMonthChange(true);
      onPaperSizeChange("long");
    }
  };

  return (
    <div
      className={`modal-backdrop report-options-backdrop${isClosing ? " is-closing" : ""}`}
      role="presentation"
      onMouseDown={(event) =>
        event.target === event.currentTarget && closeWithAnimation(onCancel)
      }
    >
      <section
        className={`modal report-options-modal${isClosing ? " is-closing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-options-title"
      >
        <div className="modal-icon">
          <ActionIcon size={22} aria-hidden="true" />
        </div>
        <button
          className="icon-button modal-close"
          onClick={() => closeWithAnimation(onCancel)}
          disabled={isClosing}
          aria-label="Close report options"
        >
          <X size={18} />
        </button>
        <h2 id="report-options-title">Choose report format</h2>
        <p>
          Select the report that matches how you need to submit your records.
        </p>
        <div
          className="report-template-options"
          role="radiogroup"
          aria-label="Report design"
        >
          <label className={template === "detailed" ? "selected" : ""}>
            <input
              type="radio"
              name="report-template"
              checked={template === "detailed"}
              onChange={() => chooseTemplate("detailed")}
            />
            <span
              className="report-paper-preview detailed-preview"
              aria-hidden="true"
            >
              <i className="preview-title" />
              <i className="preview-summary" />
              <i className="preview-summary short" />
              <i className="preview-heading" />
              <i className="preview-record" />
              <i className="preview-record" />
              <i className="preview-record short" />
            </span>
            <span className="report-template-copy">
              <strong>Detailed report</strong>
              <small>
                Full activities, reflections, balances, and signatures.
              </small>
            </span>
          </label>
          <label className={template === "worklog" ? "selected" : ""}>
            <input
              type="radio"
              name="report-template"
              checked={template === "worklog"}
              onChange={() => chooseTemplate("worklog")}
            />
            <span
              className="report-paper-preview worklog-preview"
              aria-hidden="true"
            >
              <i className="preview-worklog-title" />
              <i className="preview-month" />
              <i className="preview-table-head" />
              {Array.from({ length: 7 }, (_, index) => (
                <i className="preview-table-row" key={index} />
              ))}
            </span>
            <span className="report-template-copy">
              <strong>Monthly work log</strong>
              <small>
                Compact time and balance table with optional notes and
                signatures.
              </small>
            </span>
          </label>
          <div
            className={`report-template-with-info${template === "tmc" ? " selected" : ""}`}
          >
            <label>
              <input
                type="radio"
                name="report-template"
                checked={template === "tmc"}
                onChange={() => chooseTemplate("tmc")}
              />
              <span
                className="report-paper-preview tmc-preview"
                aria-hidden="true"
              >
                <i className="preview-tmc-banner" />
                <i className="preview-tmc-logo" />
                <i className="preview-tmc-title" />
                <i className="preview-tmc-meta" />
                <i className="preview-tmc-table" />
              </span>
              <span className="report-template-copy">
                <strong>TMC daily time record</strong>
                <small>
                  Official monthly BSIT attendance and accomplishment form.
                </small>
              </span>
            </label>
            <button
              type="button"
              className="template-info-button"
              onClick={() => setShowTmcInfo(true)}
              aria-label="About the TMC daily time record"
              title="About this format"
            >
              <Info size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
        <p className="report-option-label">Page layout</p>
        <div
          className="report-layout-options"
          role="radiogroup"
          aria-label="Report page layout"
        >
          <label
            className={`${!separateByMonth ? "selected" : ""}${template === "tmc" ? " is-disabled" : ""}`}
          >
            <input
              type="radio"
              name="report-layout"
              checked={!separateByMonth}
              disabled={template === "tmc"}
              onChange={() => onSeparateByMonthChange(false)}
            />
            <Rows3 size={18} aria-hidden="true" />
            <span>
              <strong>Continuous report</strong>
              <small>Use each page fully across all months.</small>
            </span>
          </label>
          <label
            className={`${separateByMonth ? "selected" : ""}${template === "tmc" ? " is-fixed" : ""}`}
          >
            <input
              type="radio"
              name="report-layout"
              checked={separateByMonth}
              disabled={template === "tmc"}
              onChange={() => onSeparateByMonthChange(true)}
            />
            <CalendarRange size={18} aria-hidden="true" />
            <span>
              <strong>Separate by month</strong>
              <small>Start every month on a new page.</small>
            </span>
          </label>
        </div>
        <p className="report-option-label">Paper size</p>
        <div
          className="paper-size-options"
          role="radiogroup"
          aria-label="Report paper size"
        >
          {PAPER_SIZES.map((option) => (
            <label
              className={paperSize === option.id ? "selected" : ""}
              key={option.id}
            >
              <input
                type="radio"
                name="paper-size"
                checked={paperSize === option.id}
                onChange={() => onPaperSizeChange(option.id)}
              />
              <span
                className="paper-size-sheet"
                style={{ aspectRatio: `${option.widthMm} / ${option.heightMm}` }}
                aria-hidden="true"
              />
              <span className="paper-size-copy">
                <strong>{option.name}</strong>
                {option.alternateName && <small>{option.alternateName}</small>}
                <span>{option.dimensions}</span>
                <small>{option.metricDimensions}</small>
              </span>
            </label>
          ))}
        </div>
        {action === "download" && (
          <>
            <p className="report-option-label">File format</p>
            <div
              className="report-format-options"
              role="radiogroup"
              aria-label="Download file format"
            >
              <label className={format === "pdf" ? "selected" : ""}>
                <input
                  type="radio"
                  name="report-format"
                  checked={format === "pdf"}
                  onChange={() => onFormatChange("pdf")}
                />
                <Files size={17} aria-hidden="true" />
                <span>
                  <strong>PDF</strong>
                  <small>Ready to print</small>
                </span>
              </label>
              <label className={format === "docx" ? "selected" : ""}>
                <input
                  type="radio"
                  name="report-format"
                  checked={format === "docx"}
                  onChange={() => onFormatChange("docx")}
                />
                <FileText size={17} aria-hidden="true" />
                <span>
                  <strong>DOCX</strong>
                  <small>
                    {template === "tmc" ? "Opens in Word" : "Editable in Word"}
                  </small>
                </span>
              </label>
            </div>
          </>
        )}
        <div className="modal-actions">
          <button
            className="button secondary"
            onClick={() => closeWithAnimation(onCancel)}
            disabled={isClosing}
          >
            Cancel
          </button>
          <button
            className="button primary"
            onClick={() => closeWithAnimation(onConfirm)}
            disabled={isClosing}
          >
            {action === "print" ? <Printer size={17} /> : <Files size={17} />}
            {action === "print"
              ? "Continue to print"
              : `Download ${format.toUpperCase()}`}
          </button>
        </div>
      </section>
      {showTmcInfo && (
        <div
          className="report-info-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowTmcInfo(false);
          }}
        >
          <section
            className="modal report-info-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tmc-format-info-title"
          >
            <div className="modal-icon">
              <Info size={21} aria-hidden="true" />
            </div>
            <button
              type="button"
              className="icon-button modal-close"
              onClick={() => setShowTmcInfo(false)}
              aria-label="Close TMC format information"
            >
              <X size={18} />
            </button>
            <h2 id="tmc-format-info-title">Fixed monthly form</h2>
            <p>
              The official form defaults to Long Bond and creates one page per
              month. Other paper sizes fit the form proportionally. Record
              signatures are ignored, and downloads use PDF or DOCX.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="button primary"
                onClick={() => setShowTmcInfo(false)}
              >
                Got it
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
