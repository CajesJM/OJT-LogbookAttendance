import type { DailyRecord } from "../types";

export const DEFAULT_DUTY_DAYS = [1, 2, 3, 4, 5];

type CompletionEstimate =
  | { status: "missing-required-hours" }
  | { status: "needs-records"; recordsNeeded: number }
  | { status: "completed" }
  | {
      status: "estimated";
      completionDate: Date;
      averageWeeklyHours: number;
      weeksRemaining: number;
      activeWeeks: number;
    };

export function normalizeDutyDays(days: number[] | undefined) {
  const normalized = [
    ...new Set(
      (days || []).filter(
        (day) => Number.isInteger(day) && day >= 0 && day <= 6,
      ),
    ),
  ];
  return normalized.length > 0
    ? normalized.sort((a, b) => a - b)
    : [...DEFAULT_DUTY_DAYS];
}

function localDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function weekKey(date: Date) {
  const monday = new Date(date);
  const daysSinceMonday = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - daysSinceMonday);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

export function calculateCompletionEstimate(
  records: DailyRecord[],
  requiredHours: number,
  dutyDays: number[] | undefined,
  now = new Date(),
): CompletionEstimate {
  if (!Number.isFinite(requiredHours) || requiredHours <= 0) {
    return { status: "missing-required-hours" };
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const renderedRecords = records.filter((record) => {
    const date = localDate(record.date);
    return date !== null && date <= today && Number(record.totalHours) > 0;
  });
  const renderedHours = renderedRecords.reduce(
    (sum, record) => sum + Number(record.totalHours),
    0,
  );

  if (renderedHours >= requiredHours) return { status: "completed" };
  if (renderedRecords.length < 5) {
    return {
      status: "needs-records",
      recordsNeeded: 5 - renderedRecords.length,
    };
  }

  const weeklyHours = new Map<string, number>();
  renderedRecords.forEach((record) => {
    const date = localDate(record.date)!;
    const key = weekKey(date);
    weeklyHours.set(
      key,
      (weeklyHours.get(key) || 0) + Number(record.totalHours),
    );
  });
  const recentWeeks = [...weeklyHours.entries()]
    .sort(([weekA], [weekB]) => weekB.localeCompare(weekA))
    .slice(0, 4);
  const averageWeeklyHours =
    recentWeeks.reduce((sum, [, hours]) => sum + hours, 0) / recentWeeks.length;
  if (!Number.isFinite(averageWeeklyHours) || averageWeeklyHours <= 0) {
    return { status: "needs-records", recordsNeeded: 1 };
  }

  const remainingHours = Math.max(0, requiredHours - renderedHours);
  const schedule = normalizeDutyDays(dutyDays);
  const averageDailyHours = averageWeeklyHours / schedule.length;
  const completionDate = new Date(today);
  let projectedRemaining = remainingHours;
  let safetyLimit = 3660;

  while (projectedRemaining > 0 && safetyLimit > 0) {
    completionDate.setDate(completionDate.getDate() + 1);
    if (schedule.includes(completionDate.getDay())) {
      projectedRemaining -= averageDailyHours;
    }
    safetyLimit -= 1;
  }

  return {
    status: "estimated",
    completionDate,
    averageWeeklyHours,
    weeksRemaining: remainingHours / averageWeeklyHours,
    activeWeeks: recentWeeks.length,
  };
}
