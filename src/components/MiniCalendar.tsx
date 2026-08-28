import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { formatTime12Hour } from "../lib/format";
import type { DailyRecord } from "../types";

type Props = {
  records: DailyRecord[];
  ojtStartDate: string;
};

const weekDayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function normalizeRecordDate(value: string) {
  const datePart = value.trim().match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!datePart) return null;
  const parsed = new Date(`${datePart}T00:00:00`);
  return Number.isNaN(parsed.getTime()) || localDateKey(parsed) !== datePart
    ? null
    : datePart;
}

function activityLevel(count: number) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  return 2;
}

export function MiniCalendar({ records, ojtStartDate }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();
  const todayKey = localDateKey(today);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  // Group records by normalized date key for quick lookup
  const recordsByDateKey = useMemo(() => {
    const map = new Map<string, DailyRecord[]>();
    records.forEach((record) => {
      const key = normalizeRecordDate(record.date);
      if (!key) return;
      const existing = map.get(key) || [];
      existing.push(record);
      map.set(key, existing);
    });
    return map;
  }, [records]);

  // Available years from records, ojtStartDate, and current year
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(currentYear);

    const startYear = parseInt(ojtStartDate.slice(0, 4), 10);
    if (!isNaN(startYear) && startYear > 2000 && startYear <= currentYear + 5) {
      yearsSet.add(startYear);
    }

    records.forEach((record) => {
      const dateKey = normalizeRecordDate(record.date);
      if (dateKey) {
        const yr = parseInt(dateKey.slice(0, 4), 10);
        if (!isNaN(yr)) yearsSet.add(yr);
      }
    });

    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [records, ojtStartDate, currentYear]);

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  useEffect(() => {
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0] || currentYear);
    }
  }, [availableYears, selectedYear, currentYear]);

  const {
    weeks,
    monthLabels,
    recordCountsByDate,
    hoursByDate,
    activeDays,
    totalHours,
  } = useMemo(() => {
    const counts = new Map<string, number>();
    const totals = new Map<string, number>();
    records.forEach((record) => {
      const dateKey = normalizeRecordDate(record.date);
      if (!dateKey) return;
      counts.set(dateKey, (counts.get(dateKey) || 0) + 1);
      totals.set(
        dateKey,
        (totals.get(dateKey) || 0) + Number(record.totalHours || 0),
      );
    });

    // Calendar grid from Jan 1 to Dec 31 of selectedYear
    const jan1 = new Date(selectedYear, 0, 1);
    const dec31 = new Date(selectedYear, 11, 31);

    const gridStart = new Date(jan1);
    gridStart.setDate(gridStart.getDate() - gridStart.getDay());

    const gridEnd = new Date(dec31);
    gridEnd.setDate(gridEnd.getDate() + (6 - dec31.getDay()));

    const totalDays =
      Math.round(
        (gridEnd.getTime() - gridStart.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;
    const totalWeeks = Math.ceil(totalDays / 7);

    const calendarWeeks = Array.from({ length: totalWeeks }, (_, weekIndex) =>
      Array.from({ length: 7 }, (_, dayIndex) => {
        const date = new Date(gridStart);
        date.setDate(gridStart.getDate() + weekIndex * 7 + dayIndex);
        return date;
      }),
    );

    // Month headers (Jan through Dec)
    const labels: { weekIndex: number; label: string }[] = [];
    for (let m = 0; m < 12; m++) {
      const targetMonthDate = new Date(selectedYear, m, 1);
      const monthName = targetMonthDate.toLocaleDateString("en-PH", {
        month: "short",
      });

      const weekIdx = calendarWeeks.findIndex(
        (week) =>
          week[3].getFullYear() === selectedYear && week[3].getMonth() === m,
      );

      if (weekIdx !== -1) {
        labels.push({ weekIndex: weekIdx, label: monthName });
      }
    }

    const startOfYearKey = `${selectedYear}-01-01`;
    const endOfYearKey = `${selectedYear}-12-31`;

    const visibleHours = [...totals.entries()]
      .filter(([date]) => date >= startOfYearKey && date <= endOfYearKey)
      .map(([, hours]) => hours);

    return {
      weeks: calendarWeeks,
      monthLabels: labels,
      recordCountsByDate: counts,
      hoursByDate: totals,
      activeDays: visibleHours.filter((hours) => hours > 0).length,
      totalHours: visibleHours.reduce((sum, hours) => sum + hours, 0),
    };
  }, [records, selectedYear]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const frame = window.requestAnimationFrame(() => {
      if (selectedYear === currentYear) {
        container.scrollTo({
          left: container.scrollWidth - container.clientWidth,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
        });
      } else {
        container.scrollTo({ left: 0, behavior: "auto" });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedYear, currentYear, records]);

  // Selected date details
  const selectedDayInfo = useMemo(() => {
    if (!selectedDateKey) return null;
    const dayRecords = recordsByDateKey.get(selectedDateKey) || [];
    const parsedDate = new Date(`${selectedDateKey}T00:00:00`);
    const dateFormatted = parsedDate.toLocaleDateString("en-PH", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const totalDayHours = dayRecords.reduce(
      (sum, r) => sum + Number(r.totalHours || 0),
      0,
    );
    return {
      key: selectedDateKey,
      dateFormatted,
      records: dayRecords,
      totalHours: totalDayHours,
    };
  }, [selectedDateKey, recordsByDateKey]);

  return (
    <article
      className="calendar-widget activity-widget"
      aria-label="OJT activity calendar"
    >
      <header className="activity-heading">
        <div>
          <span>OJT activity</span>
          <strong>
            {activeDays} active day{activeDays === 1 ? "" : "s"} ({selectedYear}
            )
          </strong>
        </div>
        <div className="activity-heading-actions">
          <b className="activity-total-hours">
            {totalHours.toLocaleString("en-PH", { maximumFractionDigits: 1 })}{" "}
            hrs
          </b>
          {availableYears.length >= 1 && (
            <div
              className={`activity-year-buttons${availableYears.length > 2 ? " is-scrollable" : ""}`}
              tabIndex={availableYears.length > 2 ? 0 : undefined}
              aria-label={
                availableYears.length > 2
                  ? "Scroll through activity years"
                  : "Activity years"
              }
            >
              {availableYears.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  className={`year-btn ${yr === selectedYear ? "active" : ""}`}
                  onClick={() => setSelectedYear(yr)}
                >
                  {yr}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div
        ref={scrollRef}
        className="activity-scroll"
        tabIndex={0}
        aria-label={`Scroll through ${selectedYear} OJT activity`}
      >
        <div className="activity-calendar">
          <div
            className="activity-months"
            aria-hidden="true"
            style={{ gridTemplateColumns: `repeat(${weeks.length}, 10px)` }}
          >
            {monthLabels.map(({ weekIndex, label }) => (
              <span
                key={`${label}-${weekIndex}`}
                style={{ gridColumnStart: weekIndex + 1 }}
              >
                {label}
              </span>
            ))}
          </div>
          <div className="activity-chart">
            <div className="activity-weekdays" aria-hidden="true">
              {weekDayLabels.map((day, index) => (
                <span key={`${day}-${index}`}>{day}</span>
              ))}
            </div>
            <div
              className="activity-grid"
              style={{ gridTemplateColumns: `repeat(${weeks.length}, 10px)` }}
            >
              {weeks.flatMap((week) =>
                week.map((date) => {
                  const key = localDateKey(date);
                  const count = recordCountsByDate.get(key) || 0;
                  const hours = hoursByDate.get(key) || 0;
                  const level = activityLevel(count);
                  const isFuture = key > todayKey;
                  const isOtherYear = date.getFullYear() !== selectedYear;
                  const isSelected = selectedDateKey === key;
                  const dateLabel = date.toLocaleDateString("en-PH", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={isOtherYear}
                      className={`activity-cell level-${level}${key === todayKey ? " is-today" : ""}${key === ojtStartDate ? " is-start" : ""}${isFuture ? " is-future" : ""}${isOtherYear ? " is-other-year" : ""}${isSelected ? " is-selected" : ""}`}
                      onClick={() => {
                        if (!isOtherYear) {
                          setSelectedDateKey((prev) =>
                            prev === key ? null : key,
                          );
                        }
                      }}
                      title={`${dateLabel}: ${count ? `${count} entry (${hours.toLocaleString("en-PH", { maximumFractionDigits: 1 })} hrs)` : "No OJT record"}`}
                      aria-label={`${dateLabel}: ${count ? `${count} entry (${hours} hrs)` : "No OJT record"}`}
                    />
                  );
                }),
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedDayInfo && (
        <div
          className="activity-day-details"
          role="region"
          aria-label={`Activity details for ${selectedDayInfo.dateFormatted}`}
        >
          <header className="activity-day-details-header">
            <div>
              <h4>{selectedDayInfo.dateFormatted}</h4>
              <span className="activity-day-badge">
                {selectedDayInfo.records.length > 0
                  ? `${selectedDayInfo.records.length} log entry (${selectedDayInfo.totalHours.toLocaleString("en-PH", { maximumFractionDigits: 1 })} hrs)`
                  : "No OJT record logged"}
              </span>
            </div>
            <button
              type="button"
              className="icon-button activity-day-close"
              onClick={() => setSelectedDateKey(null)}
              aria-label="Close activity details"
              title="Close activity details"
            >
              <X size={16} />
            </button>
          </header>

          {selectedDayInfo.records.length > 0 ? (
            <div className="activity-day-records-list">
              {selectedDayInfo.records.map((rec) => (
                <div key={rec.id} className="activity-day-record-card">
                  <p className="activity-day-record-title">
                    {rec.taskTitle || "OJT Daily Record"}
                  </p>
                  <p className="activity-day-time">
                    <span>
                      {formatTime12Hour(rec.timeIn)} –{" "}
                      {formatTime12Hour(rec.timeOut)}
                    </span>
                    <strong>({rec.totalHours} hrs)</strong>
                  </p>

                  {rec.activities && (
                    <div className="activity-day-section">
                      <span className="activity-day-section-label">
                        Activities:
                      </span>
                      <p className="activity-day-section-text">
                        {rec.activities}
                      </p>
                    </div>
                  )}

                  {rec.skillsLearned && (
                    <div className="activity-day-section">
                      <span className="activity-day-section-label">
                        Skills:
                      </span>
                      <p className="activity-day-section-text">
                        {rec.skillsLearned}
                      </p>
                    </div>
                  )}

                  {rec.challenges && (
                    <div className="activity-day-section">
                      <span className="activity-day-section-label">
                        Challenges:
                      </span>
                      <p className="activity-day-section-text">
                        {rec.challenges}
                      </p>
                    </div>
                  )}

                  {rec.reflection && (
                    <div className="activity-day-section">
                      <span className="activity-day-section-label">
                        Reflection:
                      </span>
                      <p className="activity-day-section-text">
                        {rec.reflection}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="activity-day-empty">
              <p>No record logged for this day.</p>
            </div>
          )}
        </div>
      )}

      <footer className="activity-footer">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span>Jan – Dec {selectedYear}</span>
        </div>
        <div
          className="activity-legend"
          aria-label="Activity intensity from less to more"
        >
          <span>Less</span>
          {[0, 1, 2].map((level) => (
            <i key={level} className={`activity-cell level-${level}`} />
          ))}
          <span>More</span>
        </div>
      </footer>
    </article>
  );
}
