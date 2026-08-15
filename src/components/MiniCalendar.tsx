import { useEffect, useMemo, useRef } from "react";
import type { DailyRecord } from "../types";

type Props = {
  records: DailyRecord[];
  ojtStartDate: string;
};

const DAYS_IN_WEEK = 7;
const WEEKS_TO_SHOW = 53;
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

function activityLevel(hours: number) {
  if (hours <= 0) return 0;
  if (hours <= 2) return 1;
  if (hours <= 4) return 2;
  if (hours <= 6) return 3;
  return 4;
}

export function MiniCalendar({ records, ojtStartDate }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => new Date(), []);
  const todayKey = localDateKey(today);
  const { weeks, monthLabels, hoursByDate, activeDays, totalHours } =
    useMemo(() => {
      const totals = new Map<string, number>();
      records.forEach((record) => {
        const dateKey = normalizeRecordDate(record.date);
        if (!dateKey) return;
        totals.set(
          dateKey,
          (totals.get(dateKey) || 0) + Number(record.totalHours || 0),
        );
      });

      const currentWeekStart = new Date(today);
      currentWeekStart.setHours(0, 0, 0, 0);
      currentWeekStart.setDate(
        currentWeekStart.getDate() - currentWeekStart.getDay(),
      );
      const firstWeekStart = new Date(currentWeekStart);
      firstWeekStart.setDate(
        firstWeekStart.getDate() - (WEEKS_TO_SHOW - 1) * DAYS_IN_WEEK,
      );

      const calendarWeeks = Array.from(
        { length: WEEKS_TO_SHOW },
        (_, weekIndex) =>
          Array.from({ length: DAYS_IN_WEEK }, (_, dayIndex) => {
            const date = new Date(firstWeekStart);
            date.setDate(
              firstWeekStart.getDate() + weekIndex * DAYS_IN_WEEK + dayIndex,
            );
            return date;
          }),
      );
      const labels = calendarWeeks.map((week, weekIndex) => {
        const firstOfMonth = week.find((date) => date.getDate() === 1);
        if (firstOfMonth)
          return firstOfMonth.toLocaleDateString("en-PH", { month: "short" });
        return weekIndex === 0
          ? week[0].toLocaleDateString("en-PH", { month: "short" })
          : "";
      });
      const firstVisibleKey = localDateKey(calendarWeeks[0][0]);
      const visibleHours = [...totals.entries()]
        .filter(([date]) => date >= firstVisibleKey && date <= todayKey)
        .map(([, hours]) => hours);

      return {
        weeks: calendarWeeks,
        monthLabels: labels,
        hoursByDate: totals,
        activeDays: visibleHours.filter((hours) => hours > 0).length,
        totalHours: visibleHours.reduce((sum, hours) => sum + hours, 0),
      };
    }, [records, today, todayKey]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const frame = window.requestAnimationFrame(() => {
      container.scrollTo({
        left: container.scrollWidth - container.clientWidth,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [records]);

  return (
    <article
      className="calendar-widget activity-widget"
      aria-label="OJT activity calendar"
    >
      <header className="activity-heading">
        <div>
          <span>OJT activity</span>
          <strong>
            {activeDays} active day{activeDays === 1 ? "" : "s"}
          </strong>
        </div>
        <b>
          {totalHours.toLocaleString("en-PH", { maximumFractionDigits: 1 })} hrs
        </b>
      </header>

      <div
        ref={scrollRef}
        className="activity-scroll"
        tabIndex={0}
        aria-label="Scroll through one year of OJT activity"
      >
        <div className="activity-calendar">
          <div className="activity-months" aria-hidden="true">
            {monthLabels.map((month, index) => (
              <span key={`${month}-${index}`}>{month}</span>
            ))}
          </div>
          <div className="activity-chart">
            <div className="activity-weekdays" aria-hidden="true">
              {weekDayLabels.map((day, index) => (
                <span key={`${day}-${index}`}>{day}</span>
              ))}
            </div>
            <div className="activity-grid">
              {weeks.flatMap((week) =>
                week.map((date) => {
                  const key = localDateKey(date);
                  const hours = hoursByDate.get(key) || 0;
                  const isFuture = key > todayKey;
                  const dateLabel = date.toLocaleDateString("en-PH", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  return (
                    <span
                      key={key}
                      className={`activity-cell level-${activityLevel(hours)}${key === todayKey ? " is-today" : ""}${key === ojtStartDate ? " is-start" : ""}${isFuture ? " is-future" : ""}`}
                      title={`${dateLabel}: ${hours ? `${hours.toLocaleString("en-PH", { maximumFractionDigits: 1 })} OJT hours` : "No OJT record"}`}
                      aria-label={`${dateLabel}: ${hours ? `${hours} OJT hours` : "No OJT record"}`}
                    />
                  );
                }),
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="activity-footer">
        <span>Last 12 months</span>
        <div
          className="activity-legend"
          aria-label="Activity intensity from less to more"
        >
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <i key={level} className={`activity-cell level-${level}`} />
          ))}
          <span>More</span>
        </div>
      </footer>
    </article>
  );
}
