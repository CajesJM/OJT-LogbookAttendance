import type { UserAccount } from "../types";

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
  return `${hours.toFixed(2).replace(/\.00$/, "")} hrs`;
}

export function formatDate(value: string): string {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function parseGoogleCredential(credential: string): UserAccount | null {
  try {
    const base64 = credential.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    return {
      id: payload.sub,
      name: payload.name || payload.email,
      email: payload.email,
      picture: payload.picture,
    };
  } catch {
    return null;
  }
}
