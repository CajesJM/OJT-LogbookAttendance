import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarCheck2,
  CalendarClock,
  Clock3,
  Target,
} from "lucide-react";
import { formatDate, formatHours } from "../lib/format";
import type { DailyRecord, StudentProfile } from "../types";
import { MiniCalendar } from "./MiniCalendar";

type Props = {
  records: DailyRecord[];
  profile: StudentProfile;
  onOpenRecords: () => void;
  onEditRecord: (record: DailyRecord) => void;
};

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function Dashboard({
  records,
  profile,
  onOpenRecords,
  onEditRecord,
}: Props) {
  const [now, setNow] = useState(() => new Date());
  const totalHours = records.reduce(
    (sum, record) => sum + record.totalHours,
    0,
  );
  const requiredHours = Number(profile.requiredHours) || 0;
  const progress =
    requiredHours > 0
      ? Math.min(100, Math.round((totalHours / requiredHours) * 100))
      : 0;
  const remaining = Math.max(0, requiredHours - totalHours);
  const recentRecords = [...records]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  const firstName = (profile.fullName || "Trainee").trim().split(" ")[0];

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="page-content dashboard-page">
      <section className="dashboard-intro">
        <div>
          <p className="eyebrow">
            {now.toLocaleDateString("en-PH", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h2>
            {greetingForHour(now.getHours())}, <span>{firstName}.</span>
          </h2>
          <p>Keep your training record current and ready to submit.</p>
        </div>
        <button
          className="dashboard-menu"
          onClick={onOpenRecords}
          aria-label="Add daily record"
        >
          <ArrowRight size={22} />
        </button>
      </section>

      <section className="dashboard-widgets" aria-label="OJT activity calendar">
        <MiniCalendar records={records} ojtStartDate={profile.ojtStartDate} />
      </section>

      <section
        className="progress-panel"
        aria-label={`OJT progress: ${progress}% complete`}
      >
        <div className="progress-heading">
          <div>
            <p className="section-kicker">Training progress</p>
            <h2>
              {formatHours(totalHours)} of {formatHours(requiredHours)}
            </h2>
          </div>
          <span className="progress-status">
            {progress >= 100
              ? "Completed"
              : progress >= 75
                ? "Almost there"
                : progress >= 25
                  ? "In progress"
                  : "Getting started"}
          </span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div className="progress-fill" style={{ width: `${progress}%` }} />
          <span
            className="progress-value"
            style={{ left: `clamp(22px, ${progress}%, calc(100% - 22px))` }}
          >
            {progress}%
          </span>
        </div>
        <div className="progress-labels">
          <span>0 hrs</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>{formatHours(requiredHours)}</span>
        </div>
      </section>

      <section className="stat-grid" aria-label="OJT summary">
        <article>
          <CalendarCheck2 size={22} />
          <span>Total records</span>
          <strong>{records.length}</strong>
        </article>
        <article>
          <Target size={22} />
          <span>Required hours</span>
          <strong>{formatHours(requiredHours)}</strong>
        </article>
        <article>
          <Clock3 size={22} />
          <span>Hours remaining</span>
          <strong>{formatHours(remaining)}</strong>
        </article>
      </section>

      <section className="surface recent-section">
        <div className="section-head">
          <div>
            <p className="section-kicker">Activity</p>
            <h2>Recent daily records</h2>
          </div>
          <button className="button secondary" onClick={onOpenRecords}>
            View all
          </button>
        </div>
        <div className="record-list compact">
          {recentRecords.length === 0 ? (
            <div className="empty-state">
              <CalendarClock size={28} />
              <h3>No records yet</h3>
              <p>Your latest OJT entries will appear here.</p>
              <button className="button primary" onClick={onOpenRecords}>
                Add your first record <ArrowRight size={18} />
              </button>
            </div>
          ) : (
            recentRecords.map((record) => (
              <button
                key={record.id}
                type="button"
                className="record-row record-row-button"
                onClick={() => onEditRecord(record)}
                aria-label={`Open ${record.taskTitle} from ${formatDate(record.date)}`}
              >
                <div className="date-tile">
                  <strong>
                    {new Date(`${record.date}T00:00:00`).getDate()}
                  </strong>
                  <span>
                    {new Date(`${record.date}T00:00:00`).toLocaleString("en", {
                      month: "short",
                    })}
                  </span>
                </div>
                <div className="record-summary">
                  <strong>{record.taskTitle}</strong>
                  <span>
                    {formatDate(record.date)} · {formatHours(record.totalHours)}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
