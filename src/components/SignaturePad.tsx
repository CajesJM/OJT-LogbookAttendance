import { useEffect, useRef } from "react";
import { Eraser, PenLine } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

type Point = { x: number; y: number };

export function SignaturePad({ value, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const previousPointRef = useRef<Point | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!value) return;

    const image = new Image();
    image.onload = () => context.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.src = value;
  }, [value]);

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>): Point {
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * (canvas.width / bounds.width),
      y: (event.clientY - bounds.top) * (canvas.height / bounds.height),
    };
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    const point = pointFromEvent(event);
    previousPointRef.current = point;
    const context = event.currentTarget.getContext("2d");
    if (context) {
      context.beginPath();
      context.arc(point.x, point.y, 2, 0, Math.PI * 2);
      context.fillStyle = "#18231f";
      context.fill();
    }
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !previousPointRef.current) return;
    event.preventDefault();
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const point = pointFromEvent(event);
    context.beginPath();
    context.moveTo(previousPointRef.current.x, previousPointRef.current.y);
    context.lineTo(point.x, point.y);
    context.strokeStyle = "#18231f";
    context.lineWidth = 4;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.stroke();
    previousPointRef.current = point;
  }

  function finishDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    previousPointRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    onChange(event.currentTarget.toDataURL("image/png"));
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  }

  return (
    <div className="signature-field">
      <div className="signature-head">
        <span><PenLine size={15} /> Signature</span>
        <div className="signature-head-actions">
          {value && (
            <button type="button" onClick={clearSignature}>
              <Eraser size={14} /> Clear
            </button>
          )}
          <small>Optional</small>
        </div>
      </div>
      <div className="signature-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="signature-canvas"
          width={720}
          height={220}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={finishDrawing}
          onPointerCancel={finishDrawing}
          aria-label="Draw your signature"
        />
      </div>
      <small>Sign inside the box using your finger, mouse, or stylus.</small>
    </div>
  );
}
