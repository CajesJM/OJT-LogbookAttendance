import type { DailyRecord, StudentProfile } from "../types";
import { DEFAULT_DUTY_DAYS, normalizeDutyDays } from "./completionEstimate";

export const emptyProfile: StudentProfile = {
  fullName: "",
  email: "",
  school: "",
  course: "",
  companyName: "",
  department: "",
  supervisorName: "",
  ojtStartDate: "",
  requiredHours: 0,
  dutyDays: [...DEFAULT_DUTY_DAYS],
};

export function normalizeProfile(profile: StudentProfile): StudentProfile {
  return {
    ...emptyProfile,
    ...profile,
    dutyDays: normalizeDutyDays(profile.dutyDays),
  };
}

export function createEmptyRecord(): DailyRecord {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    date: now.toISOString().slice(0, 10),
    timeIn: "",
    timeOut: "",
    totalHours: 0,
    taskTitle: "",
    activities: "",
    skillsLearned: "",
    challenges: "",
    reflection: "",
    signature: "",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}
