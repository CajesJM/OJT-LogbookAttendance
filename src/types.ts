export type Tab = "dashboard" | "records" | "profile";
export type ReportTemplate = "detailed" | "worklog" | "tmc";

export type UserAccount = {
  id: string;
  name: string;
  email?: string;
  picture?: string;
};

export type LocalCredentials = {
  username: string;
  salt: string;
  passwordHash: string;
};

export type LoginRateLimit = {
  failedAttempts: number;
  lockedUntil: number | null;
};

export type BackupReminderState = {
  lastBackupAt: string | null;
  snoozedUntil: string | null;
};

export type StudentProfile = {
  fullName: string;
  email: string;
  school: string;
  course: string;
  companyName: string;
  department: string;
  supervisorName: string;
  ojtStartDate: string;
  requiredHours: number;
  dutyDays: number[];
};

export type DailyRecord = {
  id: string;
  date: string;
  timeIn: string;
  timeOut: string;
  totalHours: number;
  taskTitle: string;
  activities?: string;
  skillsLearned?: string;
  challenges?: string;
  reflection?: string;
  signature?: string;
  createdAt: string;
  updatedAt: string;
};

export type BackupData = {
  version: 1;
  exportedAt: string;
  user: UserAccount | null;
  profile: StudentProfile;
  records: DailyRecord[];
  profileImage?: {
    type: string;
    dataUrl: string;
  } | null;
};

export type ToastKind = "success" | "error" | "info";

export type ToastMessage = {
  id: string;
  message: string;
  kind: ToastKind;
  exiting?: boolean;
};
