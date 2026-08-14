import type { BackupReminderState, DailyRecord } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_AFTER_MS = 7 * DAY_MS;
const SIGNIFICANTLY_OVERDUE_AFTER_MS = 14 * DAY_MS;

export const EMPTY_BACKUP_REMINDER: BackupReminderState = {
  lastBackupAt: null,
  snoozedUntil: null,
};

function validTimestamp(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function firstRecordTimestamp(records: DailyRecord[]) {
  const timestamps = records
    .map(
      (record) =>
        validTimestamp(record.createdAt) ??
        validTimestamp(`${record.date}T00:00:00`),
    )
    .filter((timestamp): timestamp is number => timestamp !== null);
  return timestamps.length > 0 ? Math.min(...timestamps) : null;
}

export function getBackupReminderStatus(
  records: DailyRecord[],
  reminder: BackupReminderState,
  now = Date.now(),
) {
  const baseline =
    validTimestamp(reminder.lastBackupAt) ?? firstRecordTimestamp(records);
  const snoozedUntil = validTimestamp(reminder.snoozedUntil);
  const isSnoozed = snoozedUntil !== null && snoozedUntil > now;

  if (records.length === 0 || baseline === null || isSnoozed) {
    return { isDue: false, isSignificantlyOverdue: false };
  }

  return {
    isDue: now >= baseline + REMINDER_AFTER_MS,
    isSignificantlyOverdue: now >= baseline + SIGNIFICANTLY_OVERDUE_AFTER_MS,
  };
}

export function createBackupSnooze(
  now = Date.now(),
): BackupReminderState["snoozedUntil"] {
  return new Date(now + 12 * 60 * 60 * 1000).toISOString();
}
