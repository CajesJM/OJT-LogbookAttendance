import { useEffect, useState } from "react";

const FEEDBACK_COOLDOWN_KEY = "ojt-logbook-feedback-cooldown-until";
const FEEDBACK_COOLDOWN_EVENT = "ojt-feedback-cooldown-change";
export const FEEDBACK_COOLDOWN_SECONDS = 5 * 60;

function readRemainingSeconds() {
  if (typeof window === "undefined") return 0;
  try {
    const cooldownUntil = Number(window.localStorage.getItem(FEEDBACK_COOLDOWN_KEY));
    if (!Number.isFinite(cooldownUntil)) return 0;
    return Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
  } catch {
    return 0;
  }
}

export function formatFeedbackCooldown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function startFeedbackCooldown(seconds = FEEDBACK_COOLDOWN_SECONDS) {
  if (typeof window === "undefined") return;
  const cooldownUntil = Date.now() + seconds * 1000;
  try {
    window.localStorage.setItem(FEEDBACK_COOLDOWN_KEY, String(cooldownUntil));
  } catch {
    // The server cookie still enforces the cooldown when storage is unavailable.
  }
  window.dispatchEvent(new Event(FEEDBACK_COOLDOWN_EVENT));
}

export function useFeedbackCooldown() {
  const [remainingSeconds, setRemainingSeconds] = useState(readRemainingSeconds);

  useEffect(() => {
    const updateRemaining = () => {
      const remaining = readRemainingSeconds();
      setRemainingSeconds(remaining);
      if (remaining === 0) {
        try {
          window.localStorage.removeItem(FEEDBACK_COOLDOWN_KEY);
        } catch {
          // Storage can be unavailable in strict privacy modes.
        }
      }
    };

    updateRemaining();
    const interval = window.setInterval(updateRemaining, 1000);
    window.addEventListener("storage", updateRemaining);
    window.addEventListener(FEEDBACK_COOLDOWN_EVENT, updateRemaining);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", updateRemaining);
      window.removeEventListener(FEEDBACK_COOLDOWN_EVENT, updateRemaining);
    };
  }, []);

  return remainingSeconds;
}
