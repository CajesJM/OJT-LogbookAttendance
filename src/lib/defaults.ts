import type { DailyRecord, StudentProfile } from "../types";

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
};

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
