import { useCallback, useState } from "react";
import type { ToastKind, ToastMessage } from "../types";

const TOAST_DURATION = 4000;
const FADE_DURATION = 280;

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) =>
      current.map((toast) =>
        toast.id === id ? { ...toast, exiting: true } : toast,
      ),
    );
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, FADE_DURATION);
  }, []);

  const showToast = useCallback(
    (message: string, kind: ToastKind = "info") => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, message, kind }]);
      window.setTimeout(() => dismissToast(id), TOAST_DURATION - FADE_DURATION);
    },
    [dismissToast],
  );

  return { toasts, showToast, dismissToast };
}
