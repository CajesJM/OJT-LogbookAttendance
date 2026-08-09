import { useCallback, useRef, useState } from "react";

export type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: "default" | "danger";
};

export function useConfirm() {
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((approved: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    resolver.current?.(false);
    setDialog(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((approved: boolean) => {
    resolver.current?.(approved);
    resolver.current = null;
    setDialog(null);
  }, []);

  return {
    dialog,
    confirm,
    accept: () => close(true),
    cancel: () => close(false),
  };
}
