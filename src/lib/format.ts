export function calculateHours(timeIn: string, timeOut: string): number {
  if (!timeIn || !timeOut) return 0;
  const [inHour, inMinute] = timeIn.split(":").map(Number);
  const [outHour, outMinute] = timeOut.split(":").map(Number);
  const start = inHour * 60 + inMinute;
  let end = outHour * 60 + outMinute;
  if (end < start) end += 24 * 60;
  return Math.max(0, Math.round(((end - start) / 60) * 100) / 100);
}

export function formatHours(hours: number): string {
  const totalMinutes = Math.max(0, Math.round((Number(hours) || 0) * 60));
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${wholeHours}:${String(minutes).padStart(2, "0")} hrs`;
}

export function formatTime12Hour(time: string): string {
  if (!time || typeof time !== "string") return "";
  const parts = time.split(":");
  if (parts.length < 2) return time;
  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  if (isNaN(hour) || isNaN(minute)) return time;
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const formattedMinutes = String(minute).padStart(2, "0");
  return `${hour12}:${formattedMinutes} ${period}`;
}

export function formatDate(value: string): string {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}
