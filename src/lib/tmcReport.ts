import type { DailyRecord } from "../types";

export type TmcDayEntry = {
  day: number;
  morning: DailyRecord | null;
  afternoon: DailyRecord | null;
  totalHours: number;
  experience: string;
};

export type TmcMonthGroup = {
  key: string;
  label: string;
  days: TmcDayEntry[];
};

function timeInMinutes(value: string) {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

export function formatTmcTime(value?: string) {
  if (!value) return "";
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")}`;
}

export function getTmcTimeCells(day: TmcDayEntry) {
  let morningOut = day.morning?.timeOut;
  let afternoonOut = day.afternoon?.timeOut;

  if (
    day.morning &&
    !day.afternoon &&
    timeInMinutes(day.morning.timeOut) > 12 * 60
  ) {
    morningOut = undefined;
    afternoonOut = day.morning.timeOut;
  }

  return [
    formatTmcTime(day.morning?.timeIn),
    formatTmcTime(morningOut),
    formatTmcTime(day.afternoon?.timeIn),
    formatTmcTime(afternoonOut),
  ];
}

export function formatTmcHours(value: number) {
  const totalMinutes = Math.max(0, Math.round((value || 0) * 60));
  return `${Math.floor(totalMinutes / 60)}:${String(totalMinutes % 60).padStart(2, "0")}`;
}

export function buildTmcMonthGroups(records: DailyRecord[]): TmcMonthGroup[] {
  const byMonth = new Map<string, DailyRecord[]>();

  [...records]
    .filter((record) => /^\d{4}-\d{2}-\d{2}$/.test(record.date))
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        timeInMinutes(a.timeIn) - timeInMinutes(b.timeIn),
    )
    .forEach((record) => {
      const key = record.date.slice(0, 7);
      const monthRecords = byMonth.get(key) || [];
      monthRecords.push(record);
      byMonth.set(key, monthRecords);
    });

  if (!byMonth.size) {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, []);
  }

  return [...byMonth.entries()].map(([key, monthRecords]) => {
    const recordsByDay = new Map<number, DailyRecord[]>();
    monthRecords.forEach((record) => {
      const day = Number(record.date.slice(8, 10));
      const dayRecords = recordsByDay.get(day) || [];
      dayRecords.push(record);
      recordsByDay.set(day, dayRecords);
    });

    const days = Array.from({ length: 31 }, (_, index): TmcDayEntry => {
      const day = index + 1;
      const dayRecords = [...(recordsByDay.get(day) || [])].sort(
        (a, b) => timeInMinutes(a.timeIn) - timeInMinutes(b.timeIn),
      );
      let morning =
        dayRecords.find((record) => timeInMinutes(record.timeIn) < 12 * 60) ||
        null;
      let afternoon =
        dayRecords.find(
          (record) =>
            timeInMinutes(record.timeIn) >= 12 * 60 &&
            record.id !== morning?.id,
        ) || null;

      if (dayRecords.length > 1) {
        morning ||= dayRecords[0];
        afternoon ||=
          dayRecords.find((record) => record.id !== morning?.id) || null;
      }

      return {
        day,
        morning,
        afternoon,
        totalHours: dayRecords.reduce(
          (sum, record) => sum + (record.totalHours || 0),
          0,
        ),
        experience: [...new Set(dayRecords.map((record) => record.taskTitle.trim()))]
          .filter(Boolean)
          .join(" / "),
      };
    });

    return {
      key,
      label: new Date(`${key}-01T00:00:00`).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
      days,
    };
  });
}
