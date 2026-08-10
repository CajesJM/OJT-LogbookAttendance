import type { BackupData, DailyRecord, StudentProfile, UserAccount } from "../types";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOptionalString(value: unknown) {
  return value === undefined || typeof value === "string";
}

function isUser(value: unknown): value is UserAccount | null {
  return value === null || (
    isObject(value)
    && typeof value.id === "string"
    && typeof value.name === "string"
    && isOptionalString(value.email)
    && isOptionalString(value.picture)
  );
}

function isProfile(value: unknown): value is StudentProfile {
  return isObject(value)
    && typeof value.fullName === "string"
    && typeof value.email === "string"
    && typeof value.school === "string"
    && typeof value.course === "string"
    && typeof value.companyName === "string"
    && typeof value.department === "string"
    && typeof value.supervisorName === "string"
    && typeof value.ojtStartDate === "string"
    && typeof value.requiredHours === "number"
    && Number.isFinite(value.requiredHours)
    && value.requiredHours > 0;
}

function isRecord(value: unknown): value is DailyRecord {
  return isObject(value)
    && typeof value.id === "string"
    && typeof value.date === "string"
    && typeof value.timeIn === "string"
    && typeof value.timeOut === "string"
    && typeof value.totalHours === "number"
    && Number.isFinite(value.totalHours)
    && value.totalHours >= 0
    && typeof value.taskTitle === "string"
    && isOptionalString(value.activities)
    && isOptionalString(value.skillsLearned)
    && isOptionalString(value.challenges)
    && isOptionalString(value.reflection)
    && isOptionalString(value.signature)
    && typeof value.createdAt === "string"
    && typeof value.updatedAt === "string";
}

function isProfileImage(value: unknown) {
  return value === null || value === undefined || (
    isObject(value)
    && typeof value.type === "string"
    && typeof value.dataUrl === "string"
    && /^data:image\/(jpeg|png|webp);base64,/i.test(value.dataUrl)
  );
}

export function parseBackup(text: string): BackupData {
  const value: unknown = JSON.parse(text);
  if (
    !isObject(value)
    || value.version !== 1
    || typeof value.exportedAt !== "string"
    || !isUser(value.user)
    || !isProfile(value.profile)
    || !Array.isArray(value.records)
    || !value.records.every(isRecord)
    || !isProfileImage(value.profileImage)
  ) {
    throw new Error("Invalid backup");
  }
  return value as BackupData;
}
