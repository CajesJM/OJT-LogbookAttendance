import { type CSSProperties, type PointerEvent, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import type { ToastMessage } from "../../types";

type Props = {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
};

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const SWIPE_DISTANCE = 42;
const SWIPE_VELOCITY = 0.45;

type ToastItemProps = {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
};

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const Icon = icons[toast.kind];
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [swipeDismissed, setSwipeDismissed] = useState(false);
  const dragStart = useRef({ pointerId: -1, y: 0, time: 0 });

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (toast.exiting || swipeDismissed || event.button !== 0) return;
    dragStart.current = {
      pointerId: event.pointerId,
      y: event.clientY,
      time: performance.now(),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragStart.current.pointerId !== event.pointerId) return;
    setDragOffset(Math.min(0, event.clientY - dragStart.current.y));
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragStart.current.pointerId !== event.pointerId) return;
    const elapsed = Math.max(1, performance.now() - dragStart.current.time);
    const distance = Math.min(0, event.clientY - dragStart.current.y);
    const upwardVelocity = Math.abs(distance) / elapsed;
    dragStart.current.pointerId = -1;
    setIsDragging(false);

    if (distance <= -SWIPE_DISTANCE || (distance < -12 && upwardVelocity >= SWIPE_VELOCITY)) {
      setSwipeDismissed(true);
      onDismiss(toast.id);
      return;
    }
    setDragOffset(0);
  }

  function cancelDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragStart.current.pointerId !== event.pointerId) return;
    dragStart.current.pointerId = -1;
    setIsDragging(false);
    setDragOffset(0);
  }

  return (
    <div
      className={`toast toast-${toast.kind}${toast.exiting ? " is-exiting" : ""}${isDragging ? " is-dragging" : ""}${swipeDismissed ? " is-swipe-dismissed" : ""}`}
      style={{
        "--toast-drag-y": `${dragOffset}px`,
        "--toast-drag-opacity": Math.max(0.58, 1 - Math.abs(dragOffset) / 140),
      } as CSSProperties}
      role="status"
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={finishDrag}
      onPointerCancel={cancelDrag}
    >
      <Icon size={18} aria-hidden="true" />
      <span>{toast.message}</span>
    </div>
  );
}

export function ToastViewport({ toasts, onDismiss }: Props) {
  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <ToastItem toast={toast} onDismiss={onDismiss} key={toast.id} />
      ))}
    </div>
  );
}
