type TimeInput12HourProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

type Period = "AM" | "PM";

const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1));
const MINUTES = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, "0"),
);

function parseTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return { hour: "", minute: "00", period: "AM" as Period };
  }

  const hour24 = Number(match[1]);
  return {
    hour: String(hour24 % 12 || 12),
    minute: match[2],
    period: (hour24 >= 12 ? "PM" : "AM") as Period,
  };
}

function to24Hour(hour: string, minute: string, period: Period) {
  let hour24 = Number(hour) % 12;
  if (period === "PM") hour24 += 12;
  return `${String(hour24).padStart(2, "0")}:${minute}`;
}

export function TimeInput12Hour({
  id,
  label,
  value,
  onChange,
  required = false,
}: TimeInput12HourProps) {
  const time = parseTime(value);

  function commit(hour: string, minute: string, period: Period) {
    if (!hour) {
      onChange("");
      return;
    }
    onChange(to24Hour(hour, minute, period));
  }

  return (
    <fieldset className="time-input-field">
      <legend>{label}</legend>
      <div className="time-input-controls">
        <label className="time-input-part" htmlFor={`${id}-hour`}>
          <span>Hour</span>
          <select
            id={`${id}-hour`}
            value={time.hour}
            onChange={(event) =>
              commit(event.target.value, time.minute, time.period)
            }
            required={required}
            aria-label={`${label} hour`}
          >
            <option value="">--</option>
            {HOURS.map((hour) => (
              <option key={hour} value={hour}>
                {hour}
              </option>
            ))}
          </select>
        </label>

        <span className="time-input-separator" aria-hidden="true">
          :
        </span>

        <label className="time-input-part" htmlFor={`${id}-minute`}>
          <span>Minute</span>
          <select
            id={`${id}-minute`}
            value={time.minute}
            onChange={(event) =>
              commit(time.hour, event.target.value, time.period)
            }
            disabled={!time.hour}
            aria-label={`${label} minute`}
          >
            {MINUTES.map((minute) => (
              <option key={minute} value={minute}>
                {minute}
              </option>
            ))}
          </select>
        </label>

        <label className="time-input-part" htmlFor={`${id}-period`}>
          <span>AM/PM</span>
          <select
            id={`${id}-period`}
            value={time.period}
            onChange={(event) =>
              commit(time.hour, time.minute, event.target.value as Period)
            }
            disabled={!time.hour}
            aria-label={`${label} AM or PM`}
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </label>
      </div>
    </fieldset>
  );
}
