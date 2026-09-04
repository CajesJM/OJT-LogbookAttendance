import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Clock3, Minus, Plus, X } from "lucide-react";

type TimeInput12HourProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

type Period = "AM" | "PM";

function parseTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour24 = Number(match[1]);
  return {
    hour: hour24 % 12 || 12,
    minute: Number(match[2]),
    period: (hour24 >= 12 ? "PM" : "AM") as Period,
  };
}

function getInitialTime(value: string) {
  const parsed = parseTime(value);
  if (parsed) return parsed;
  const now = new Date();
  return {
    hour: now.getHours() % 12 || 12,
    minute: now.getMinutes(),
    period: (now.getHours() >= 12 ? "PM" : "AM") as Period,
  };
}

function to24Hour(hour: number, minute: number, period: Period) {
  let hour24 = hour % 12;
  if (period === "PM") hour24 += 12;
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function clamp(value: string, minimum: number, maximum: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return minimum;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function TimeInput12Hour({
  id,
  label,
  value,
  onChange,
  required = false,
}: TimeInput12HourProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hour, setHour] = useState("12");
  const [minute, setMinute] = useState("00");
  const [period, setPeriod] = useState<Period>("AM");
  const dialogRef = useRef<HTMLElement>(null);
  const selectedTime = parseTime(value);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  function openPicker() {
    const initial = getInitialTime(value);
    setHour(String(initial.hour));
    setMinute(pad(initial.minute));
    setPeriod(initial.period);
    setIsOpen(true);
  }

  function adjustHour(amount: number) {
    const current = clamp(hour, 1, 12);
    setHour(String(((current - 1 + amount + 12) % 12) + 1));
  }

  function adjustMinute(amount: number) {
    const current = clamp(minute, 0, 59);
    setMinute(pad((current + amount + 60) % 60));
  }

  function saveTime() {
    onChange(
      to24Hour(clamp(hour, 1, 12), clamp(minute, 0, 59), period),
    );
    setIsOpen(false);
  }

  const picker = isOpen ? (
    <div
      className="modal-backdrop time-picker-backdrop"
      role="presentation"
      onMouseDown={(event) =>
        event.target === event.currentTarget && setIsOpen(false)
      }
    >
      <section
        ref={dialogRef}
        className="modal time-picker-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-dialog-title`}
        tabIndex={-1}
      >
        <div className="time-picker-heading">
          <div>
            <span className="time-picker-kicker">12-hour time</span>
            <h2 id={`${id}-dialog-title`}>{label}</h2>
          </div>
          <button
            className="icon-button time-picker-close"
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label={`Close ${label.toLowerCase()} picker`}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="time-picker-preview" aria-live="polite">
          <strong>
            {pad(clamp(hour, 1, 12))}
            <span>:</span>
            {pad(clamp(minute, 0, 59))}
          </strong>
          <div className="time-period-toggle" aria-label="Select AM or PM">
            {(["AM", "PM"] as Period[]).map((option) => (
              <button
                key={option}
                className={period === option ? "is-active" : ""}
                type="button"
                onClick={() => setPeriod(option)}
                aria-pressed={period === option}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="time-stepper-grid">
          <div className="time-stepper-group">
            <label htmlFor={`${id}-hour`}>Hour</label>
            <div className="time-stepper">
              <button type="button" onClick={() => adjustHour(-1)} aria-label="Previous hour">
                <Minus size={17} aria-hidden="true" />
              </button>
              <input
                id={`${id}-hour`}
                value={hour}
                onChange={(event) => setHour(event.target.value.replace(/\D/g, "").slice(0, 2))}
                onBlur={() => setHour(String(clamp(hour, 1, 12)))}
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label={`${label} hour`}
              />
              <button type="button" onClick={() => adjustHour(1)} aria-label="Next hour">
                <Plus size={17} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="time-stepper-group">
            <label htmlFor={`${id}-minute`}>Minute</label>
            <div className="time-stepper">
              <button type="button" onClick={() => adjustMinute(-1)} aria-label="Previous minute">
                <Minus size={17} aria-hidden="true" />
              </button>
              <input
                id={`${id}-minute`}
                value={minute}
                onChange={(event) => setMinute(event.target.value.replace(/\D/g, "").slice(0, 2))}
                onBlur={() => setMinute(pad(clamp(minute, 0, 59)))}
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label={`${label} minute`}
              />
              <button type="button" onClick={() => adjustMinute(1)} aria-label="Next minute">
                <Plus size={17} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <div className="modal-actions time-picker-actions">
          <button className="button secondary" type="button" onClick={() => setIsOpen(false)}>
            Cancel
          </button>
          <button className="button primary" type="button" onClick={saveTime}>
            Set time
          </button>
        </div>
      </section>
    </div>
  ) : null;

  return (
    <fieldset className="time-input-field">
      <legend>{label}</legend>
      <button
        id={id}
        className={`time-input-trigger${selectedTime ? " has-value" : ""}`}
        type="button"
        onClick={openPicker}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-required={required}
      >
        <Clock3 size={17} aria-hidden="true" />
        {selectedTime ? (
          <>
            <span className="time-input-value">
              {pad(selectedTime.hour)}:{pad(selectedTime.minute)}
            </span>
            <span className="time-input-period">{selectedTime.period}</span>
          </>
        ) : (
          <span className="time-input-placeholder">Select time</span>
        )}
      </button>
      {typeof document !== "undefined" && picker
        ? createPortal(picker, document.body)
        : null}
    </fieldset>
  );
}
