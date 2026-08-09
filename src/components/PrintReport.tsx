import { formatDate, formatHours } from "../lib/format";
import type { DailyRecord, StudentProfile, UserAccount } from "../types";

export function PrintReport({
  user,
  profile,
  records,
}: {
  user: UserAccount;
  profile: StudentProfile;
  records: DailyRecord[];
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
  return (
    <section className="print-report">
      <h1>OJT Logbook Report</h1>
      <div className="print-summary">
        <p>
          <b>Name:</b> {profile.fullName || user.name}
        </p>
        <p>
          <b>Gmail:</b> {profile.email || user.email}
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
      <h2>Daily Records</h2>
      {recordsWithBalance.map(({ record, remainingHours }) => (
          <article key={record.id} className="printable-record">
            <div className="print-record-content">
            <h3>
              {formatDate(record.date)} — {record.taskTitle}
            </h3>
            <p>
              <b>Time:</b> {record.timeIn} to {record.timeOut} (
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
            {record.signature && (
              <div className="print-signature">
                <b>Signature:</b>
                <img src={record.signature} alt="Record signature" />
              </div>
            )}
            </div>
            <aside className="print-hours-ledger" aria-label="OJT hours balance">
              <span>Remaining hours</span>
              <strong>{formatHours(remainingHours)}</strong>
            </aside>
          </article>
        ))}
    </section>
  );
}
