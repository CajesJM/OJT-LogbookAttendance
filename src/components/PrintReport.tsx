import { formatDate, formatHours, formatTime12Hour } from "../lib/format";
import type {
  DailyRecord,
  ReportTemplate,
  StudentProfile,
  UserAccount,
} from "../types";

export function PrintReport({
  user,
  profile,
  records,
  separateByMonth,
  template,
}: {
  user: UserAccount;
  profile: StudentProfile;
  records: DailyRecord[];
  separateByMonth: boolean;
  template: ReportTemplate;
}) {
  const totalHours = records.reduce(
    (sum, record) => sum + record.totalHours,
    0,
  );
  const requiredHours = Number(profile.requiredHours) || 0;
  let cumulativeHours = 0;
  const recordsWithBalance = [...records]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((record) => {
      cumulativeHours += record.totalHours;
      return {
        record,
        remainingHours: Math.max(0, requiredHours - cumulativeHours),
      };
    });
  const reportGroups = recordsWithBalance.reduce<
    Array<{
      key: string;
      label: string | null;
      entries: typeof recordsWithBalance;
    }>
  >((groups, entry) => {
    if (!separateByMonth) {
      if (!groups.length) groups.push({ key: "all", label: null, entries: [] });
      groups[0].entries.push(entry);
      return groups;
    }
    const date = new Date(`${entry.record.date}T00:00:00`);
    const key = entry.record.date.slice(0, 7);
    const label = date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    const current = groups[groups.length - 1];
    if (!current || current.key !== key)
      groups.push({ key, label, entries: [entry] });
    else current.entries.push(entry);
    return groups;
  }, []);

  if (!reportGroups.length)
    reportGroups.push({ key: "all", label: null, entries: [] });

  if (template === "worklog") {
    return (
      <section className="print-report worklog-report">
        {reportGroups.map((group, groupIndex) => (
          <section
            className={`worklog-page ${separateByMonth && groupIndex > 0 ? "print-month-break" : ""}`}
            key={group.key}
          >
            <div className="worklog-title-row">
              <h1>Work Log</h1>
              <p>
                <b>Month:</b> {group.label || "All records"}
              </p>
            </div>
            <div className="worklog-meta">
              <span>
                <b>Name:</b> {profile.fullName || user.name}
              </span>
              <span>
                <b>Company:</b> {profile.companyName || "Not set"}
              </span>
            </div>
            <table className="worklog-table">
              <colgroup>
                <col className="worklog-date-column" />
                <col />
                <col className="worklog-time-column" />
                <col className="worklog-remaining-column" />
                {group.entries.some(({ record }) =>
                  Boolean(record.reflection?.trim()),
                ) && <col className="worklog-note-column" />}
                {group.entries.some(({ record }) =>
                  Boolean(record.signature),
                ) && <col className="worklog-signature-column" />}
              </colgroup>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Task</th>
                  <th>Total time</th>
                  <th>Time remaining</th>
                  {group.entries.some(({ record }) =>
                    Boolean(record.reflection?.trim()),
                  ) && <th>Note</th>}
                  {group.entries.some(({ record }) =>
                    Boolean(record.signature),
                  ) && <th>Signature</th>}
                </tr>
              </thead>
              <tbody>
                {group.entries.map(({ record, remainingHours }) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.date)}</td>
                    <td>{record.taskTitle}</td>
                    <td>{formatHours(record.totalHours)}</td>
                    <td>{formatHours(remainingHours)}</td>
                    {group.entries.some(({ record: item }) =>
                      Boolean(item.reflection?.trim()),
                    ) && <td>{record.reflection || ""}</td>}
                    {group.entries.some(({ record: item }) =>
                      Boolean(item.signature),
                    ) && (
                      <td className="worklog-signature-cell">
                        {record.signature && (
                          <img
                            src={record.signature}
                            alt="Record signature"
                            loading="lazy"
                          />
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </section>
    );
  }

  return (
    <section className="print-report">
      <h1>OJT Logbook Report</h1>
      <div className="print-summary">
        <p>
          <b>Name:</b> {profile.fullName || user.name}
        </p>
        <p>
          <b>Gmail:</b> {profile.email || user.email || "Not set"}
        </p>
        <p>
          <b>School:</b> {profile.school || "Not set"}
        </p>
        <p>
          <b>Course:</b> {profile.course || "Not set"}
        </p>
        <p>
          <b>Company:</b> {profile.companyName || "Not set"}
        </p>
        <p>
          <b>Department:</b> {profile.department || "Not set"}
        </p>
        <p>
          <b>Supervisor:</b> {profile.supervisorName || "Not set"}
        </p>
        <p>
          <b>Start date:</b> {formatDate(profile.ojtStartDate)}
        </p>
        <p>
          <b>Rendered hours:</b> {formatHours(totalHours)}
        </p>
        <p>
          <b>Required hours:</b> {formatHours(profile.requiredHours)}
        </p>
      </div>
      {reportGroups.map((group, groupIndex) => (
        <section
          className={`print-month-section ${separateByMonth && groupIndex > 0 ? "print-month-break" : ""}`}
          key={group.key}
        >
          <div className="print-record-head">
            <h2>Daily Records{group.label ? ` - ${group.label}` : ""}</h2>
            <b>Remaining hours</b>
            <b>Signature</b>
          </div>
          {group.entries.map(({ record, remainingHours }) => (
            <article key={record.id} className="printable-record">
              <div className="print-record-content">
                <h3>
                  {formatDate(record.date)} — {record.taskTitle}
                </h3>
                <p>
                  <b>Time:</b> {formatTime12Hour(record.timeIn)} to{" "}
                  {formatTime12Hour(record.timeOut)} (
                  {formatHours(record.totalHours)})
                </p>
                {record.activities && (
                  <p>
                    <b>Activities/accomplishments:</b> {record.activities}
                  </p>
                )}
                {record.skillsLearned && (
                  <p>
                    <b>Skills learned:</b> {record.skillsLearned}
                  </p>
                )}
                {record.challenges && (
                  <p>
                    <b>Challenges encountered:</b> {record.challenges}
                  </p>
                )}
                {record.reflection && (
                  <p>
                    <b>Reflection:</b> {record.reflection}
                  </p>
                )}
              </div>
              <aside
                className="print-hours-ledger"
                aria-label="OJT hours balance"
              >
                <strong>{formatHours(remainingHours)}</strong>
              </aside>
              <aside
                className="print-signature-column"
                aria-label="Record signature"
              >
                {record.signature && (
                  <div className="print-signature">
                    <img
                      src={record.signature}
                      alt="Record signature"
                      loading="lazy"
                    />
                  </div>
                )}
              </aside>
            </article>
          ))}
        </section>
      ))}
    </section>
  );
}
