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

export function formatDate(value: string): string {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}
