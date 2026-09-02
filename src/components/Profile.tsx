import { ChangeEvent, FormEvent, useState } from "react";
import {
  Download,
  Info,
  LogOut,
  Pencil,
  Printer,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { ProfileAvatar } from "./ProfileAvatar";
import { AccountHelpModal } from "./ui/AccountHelpModal";
import { normalizeDutyDays } from "../lib/completionEstimate";
import type { StudentProfile } from "../types";

const DUTY_DAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

type Props = {
  profile: StudentProfile;
  onChange: (profile: StudentProfile) => void;
  onSave: () => Promise<boolean>;
  onSignOut: () => Promise<void>;
  onExport: () => Promise<void>;
  onImport: (file: File) => Promise<boolean>;
  onPrint: () => void;
  profileImageUrl: string | null;
  onProfileImageSelect: (file: File) => Promise<void>;
  onProfileImageRemove: () => Promise<void>;
};

export function Profile({
  profile,
  onChange,
  onSave,
  onSignOut,
  onExport,
  onImport,
  onPrint,
  profileImageUrl,
  onProfileImageSelect,
  onProfileImageRemove,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editSnapshot, setEditSnapshot] = useState<StudentProfile | null>(null);
  const [showAccountHelp, setShowAccountHelp] = useState(false);

  function update<K extends keyof StudentProfile>(
    key: K,
    value: StudentProfile[K],
  ) {
    onChange({ ...profile, [key]: value });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!isEditing) return;
    if (await onSave()) {
      setIsEditing(false);
      setEditSnapshot(null);
    }
  }

  function beginEditing() {
    setEditSnapshot({ ...profile });
    setIsEditing(true);
  }

  function cancelEditing() {
    if (editSnapshot) onChange(editSnapshot);
    setEditSnapshot(null);
    setIsEditing(false);
  }

  function toggleDutyDay(day: number) {
    const currentDays = normalizeDutyDays(profile.dutyDays);
    const nextDays = currentDays.includes(day)
      ? currentDays.filter((currentDay) => currentDay !== day)
      : [...currentDays, day];
    if (nextDays.length > 0)
      update(
        "dutyDays",
        nextDays.sort((a, b) => a - b),
      );
  }

  async function chooseBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file && (await onImport(file))) {
      setIsEditing(false);
      setEditSnapshot(null);
    }
    event.target.value = "";
  }

  return (
    <main className="page-content profile-layout">
      <section className="surface profile-surface">
        <div className="profile-identity-grid">
          <ProfileAvatar
            imageUrl={profileImageUrl}
            name={profile.fullName || "Trainee"}
            onSelect={onProfileImageSelect}
            size="large"
            disabled={!isEditing}
          />
          <div className="profile-identity-copy">
            <p className="section-kicker">Profile image</p>
            <p className="muted">
              {isEditing
                ? "Select the photo to upload a JPG, PNG, or WebP image."
                : "Select Edit to update your profile photo and personal information."}
            </p>
            {profileImageUrl && isEditing && (
              <button
                className="button secondary remove-photo"
                onClick={onProfileImageRemove}
              >
                <Trash2 size={17} /> Remove photo
              </button>
            )}
          </div>
        </div>
        <div className="section-head profile-head">
          <div>
            <p className="section-kicker">Personal details</p>
            <h2>{profile.fullName || "Trainee"}</h2>
          </div>
          <div className="profile-head-actions">
            {isEditing ? (
              <button
                className="button secondary"
                type="button"
                onClick={cancelEditing}
              >
                <X size={16} /> Cancel
              </button>
            ) : (
              <button
                className="button secondary"
                type="button"
                onClick={beginEditing}
              >
                <Pencil size={16} /> Edit
              </button>
            )}
            <button
              className="button secondary"
              type="button"
              onClick={onSignOut}
            >
              <LogOut size={18} /> Sign out
            </button>
          </div>
        </div>
        <form className="form-grid" onSubmit={submit}>
          <label>
            <span>Full name</span>
            <input
              value={profile.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              readOnly={!isEditing}
            />
          </label>
          <label>
            <span>Gmail</span>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => update("email", e.target.value)}
              readOnly={!isEditing}
            />
          </label>
          <label>
            <span>School</span>
            <input
              value={profile.school}
              onChange={(e) => update("school", e.target.value)}
              readOnly={!isEditing}
            />
          </label>
          <label>
            <span>Course</span>
            <input
              value={profile.course}
              onChange={(e) => update("course", e.target.value)}
              readOnly={!isEditing}
            />
          </label>
          <label>
            <span>Block</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{0,3}"
              maxLength={3}
              value={profile.block}
              placeholder="BLOCK :"
              onChange={(event) =>
                update(
                  "block",
                  event.target.value.replace(/\D/g, "").slice(0, 3),
                )
              }
              readOnly={!isEditing}
            />
          </label>
          <label>
            <span>Company</span>
            <input
              value={profile.companyName}
              onChange={(e) => update("companyName", e.target.value)}
              readOnly={!isEditing}
            />
          </label>
          <label>
            <span>Department</span>
            <input
              value={profile.department}
              onChange={(e) => update("department", e.target.value)}
              readOnly={!isEditing}
            />
          </label>
          <label>
            <span>Supervisor</span>
            <input
              value={profile.supervisorName}
              onChange={(e) => update("supervisorName", e.target.value)}
              readOnly={!isEditing}
            />
          </label>
          <label>
            <span>OJT start date</span>
            <input
              type="date"
              value={profile.ojtStartDate}
              onChange={(e) => update("ojtStartDate", e.target.value)}
              readOnly={!isEditing}
            />
          </label>
          <label className="full">
            <span>Required hours</span>
            <input
              type="number"
              min="1"
              value={profile.requiredHours > 0 ? profile.requiredHours : ""}
              placeholder="Enter required OJT hours"
              onChange={(e) => update("requiredHours", Number(e.target.value))}
              readOnly={!isEditing}
              required
            />
          </label>
          <fieldset className="duty-schedule full" disabled={!isEditing}>
            <legend>Regular duty days</legend>
            <div className="duty-day-options">
              {DUTY_DAY_OPTIONS.map((day) => {
                const selected = normalizeDutyDays(profile.dutyDays).includes(
                  day.value,
                );
                return (
                  <label key={day.value} className={selected ? "selected" : ""}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleDutyDay(day.value)}
                    />
                    <span>{day.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          {isEditing && (
            <button className="button primary full" type="submit">
              <Save size={18} /> Review profile changes
            </button>
          )}
        </form>
      </section>

      <aside className="profile-tools">
        <section className="surface tool-section backup-tool">
          <div className="tool-heading-row">
            <div>
              <p className="section-kicker">Data safety</p>
              <h2>Backup and restore</h2>
            </div>
            <button
              className="icon-button account-help-button"
              type="button"
              onClick={() => setShowAccountHelp(true)}
              aria-label="Account and backup information"
              title="Account and backup information"
            >
              <Info size={16} />
            </button>
          </div>
          <p className="muted">
            Export a copy before changing devices or clearing browser data.
          </p>
          <div className="tool-actions">
            <button className="button primary" onClick={onExport}>
              <Download size={18} /> Export backup
            </button>
            <label className="button secondary file-button">
              <Upload size={18} /> Import backup
              <input
                type="file"
                accept="application/json"
                onChange={chooseBackup}
              />
            </label>
          </div>
        </section>
        <section className="surface tool-section document-tool">
          <p className="section-kicker">Documents</p>
          <h2>Print-ready report</h2>
          <p className="muted">
            Create a clean report containing your profile, hours, and all daily
            entries.
          </p>
          <button className="button secondary" onClick={onPrint}>
            <Printer size={18} /> Print records
          </button>
        </section>
      </aside>
      <AccountHelpModal
        open={showAccountHelp}
        onClose={() => setShowAccountHelp(false)}
      />
    </main>
  );
}
