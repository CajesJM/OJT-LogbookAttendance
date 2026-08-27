import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Eraser, Image as ImageIcon, PenLine, Upload, X } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

type Point = { x: number; y: number };

type SignatureMode = "draw" | "upload";
type PendingUpload = {
  dataUrl: string;
  unusualProportions: boolean;
};

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = 5;
const SIGNATURE_WIDTH = 720;
const SIGNATURE_HEIGHT = 220;

function prepareSignatureImage(image: HTMLImageElement): PendingUpload | null {
  const analysisScale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
  const analysisCanvas = document.createElement("canvas");
  analysisCanvas.width = Math.max(1, Math.round(image.naturalWidth * analysisScale));
  analysisCanvas.height = Math.max(1, Math.round(image.naturalHeight * analysisScale));
  const analysisContext = analysisCanvas.getContext("2d", { willReadFrequently: true });
  if (!analysisContext) return null;
  analysisContext.drawImage(image, 0, 0, analysisCanvas.width, analysisCanvas.height);

  const pixels = analysisContext.getImageData(0, 0, analysisCanvas.width, analysisCanvas.height).data;
  let minX = analysisCanvas.width;
  let minY = analysisCanvas.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < analysisCanvas.height; y += 1) {
    for (let x = 0; x < analysisCanvas.width; x += 1) {
      const index = (y * analysisCanvas.width + x) * 4;
      const alpha = pixels[index + 3];
      const hasInk = alpha > 20 && (pixels[index] < 245 || pixels[index + 1] < 245 || pixels[index + 2] < 245);
      if (!hasInk) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) return null;

  const trimPadding = Math.max(4, Math.round(Math.min(analysisCanvas.width, analysisCanvas.height) * 0.025));
  minX = Math.max(0, minX - trimPadding);
  minY = Math.max(0, minY - trimPadding);
  maxX = Math.min(analysisCanvas.width - 1, maxX + trimPadding);
  maxY = Math.min(analysisCanvas.height - 1, maxY + trimPadding);
  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;
  const cropRatio = cropWidth / cropHeight;

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = SIGNATURE_WIDTH;
  outputCanvas.height = SIGNATURE_HEIGHT;
  const outputContext = outputCanvas.getContext("2d");
  if (!outputContext) return null;
  const outputPadding = 12;
  const scale = Math.min(
    (outputCanvas.width - outputPadding * 2) / cropWidth,
    (outputCanvas.height - outputPadding * 2) / cropHeight,
  );
  const drawWidth = cropWidth * scale;
  const drawHeight = cropHeight * scale;
  outputContext.imageSmoothingEnabled = true;
  outputContext.imageSmoothingQuality = "high";
  outputContext.drawImage(
    analysisCanvas,
    minX,
    minY,
    cropWidth,
    cropHeight,
    (outputCanvas.width - drawWidth) / 2,
    (outputCanvas.height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );

  return {
    dataUrl: outputCanvas.toDataURL("image/png"),
    unusualProportions: cropRatio < 1.2 || cropRatio > 12,
  };
}

export function SignaturePad({ value, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const drawingRef = useRef(false);
  const previousPointRef = useRef<Point | null>(null);
  const [mode, setMode] = useState<SignatureMode>("upload");
  const [uploadError, setUploadError] = useState("");
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  const [uploadConfirmed, setUploadConfirmed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!value) return;

    const image = new Image();
    image.onload = () =>
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.src = value;
  }, [value, mode]);

  useEffect(() => {
    if (!pendingUpload) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPendingUpload(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [pendingUpload]);

  function pointFromEvent(
    event: React.PointerEvent<HTMLCanvasElement>,
  ): Point {
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

  function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadError("");

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setUploadError("Image must be smaller than " + MAX_SIZE_MB + " MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setUploadError("The selected image could not be read.");
        return;
      }
      const image = new Image();
      image.onload = () => {
        const prepared = prepareSignatureImage(image);
        if (!prepared) {
          setUploadError("The signature image could not be prepared.");
          return;
        }
        setUploadConfirmed(false);
        setPendingUpload(prepared);
      };
      image.onerror = () => setUploadError("The selected image could not be opened.");
      image.src = reader.result;
    };
    reader.onerror = () => setUploadError("The selected image could not be read.");
    reader.readAsDataURL(file);
  }

  function chooseAnotherUpload() {
    setPendingUpload(null);
    setUploadConfirmed(false);
    window.requestAnimationFrame(() => fileInputRef.current?.click());
  }

  function applyUploadedSignature() {
    if (!pendingUpload || !uploadConfirmed) return;
    onChange(pendingUpload.dataUrl);
    setPendingUpload(null);
    setUploadConfirmed(false);
  }

  return (
    <div className="signature-field">
      <div className="signature-head">
        <span>
          <PenLine size={15} /> Signature
        </span>
        <div className="signature-head-actions">
          {value && (
            <button type="button" onClick={clearSignature}>
              <Eraser size={14} /> Clear
            </button>
          )}
          <small>Optional</small>
        </div>
      </div>
      <div
        className="signature-mode-toggle"
        role="radiogroup"
        aria-label="Signature input method"
      >
        <label className={mode === "upload" ? "selected" : ""}>
          <input
            type="radio"
            name="sig-mode"
            checked={mode === "upload"}
            onChange={() => setMode("upload")}
          />
          <Upload size={14} /> Upload
        </label>
        <label className={mode === "draw" ? "selected" : ""}>
          <input
            type="radio"
            name="sig-mode"
            checked={mode === "draw"}
            onChange={() => setMode("draw")}
          />
          <PenLine size={14} /> Draw
        </label>
      </div>
      {mode === "draw" ? (
        <div className="signature-canvas-wrap">
          <canvas
            ref={canvasRef}
            className="signature-canvas"
            width={SIGNATURE_WIDTH}
            height={SIGNATURE_HEIGHT}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={finishDrawing}
            onPointerCancel={finishDrawing}
            aria-label="Draw your signature"
          />
        </div>
      ) : (
        <div className="signature-upload-area">
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleUpload}
          />
          <button
            type="button"
            className="signature-upload-button"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={20} />
            <span>Choose an image</span>
            <small>
              JPG, PNG, or WebP — max {MAX_SIZE_MB} MB
            </small>
          </button>
          {uploadError && (
            <p className="signature-upload-error">{uploadError}</p>
          )}
          {value && (
            <div className="signature-upload-preview">
              <img src={value} alt="Uploaded signature preview" loading="lazy" />
            </div>
          )}
        </div>
      )}
      <small>
        {mode === "draw"
          ? "Sign inside the box using your finger, mouse, or stylus."
          : "Upload a clean signature image for a consistent look across all records."}
      </small>
      {pendingUpload && (
        <div
          className="modal-backdrop signature-review-backdrop"
          role="presentation"
          onMouseDown={(event) => event.target === event.currentTarget && setPendingUpload(null)}
        >
          <section
            className="modal signature-review-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="signature-review-title"
            aria-describedby="signature-review-description"
          >
            <div className="modal-icon"><ImageIcon size={22} aria-hidden="true" /></div>
            <button className="icon-button modal-close" type="button" onClick={() => setPendingUpload(null)} aria-label="Close signature review">
              <X size={18} />
            </button>
            <h2 id="signature-review-title">Review signature image</h2>
            <p id="signature-review-description">
              Confirm that this image contains only your signature. Do not use a selfie, ID, private document, or another person’s signature.
            </p>
            <div className="signature-review-preview">
              <img src={pendingUpload.dataUrl} alt="Signature image awaiting confirmation" loading="lazy" />
            </div>
            {pendingUpload.unusualProportions && (
              <p className="signature-review-warning">
                <AlertTriangle size={16} aria-hidden="true" /> This image has unusual proportions for a signature. Review it carefully before continuing.
              </p>
            )}
            <label className="signature-review-confirm">
              <input type="checkbox" checked={uploadConfirmed} onChange={(event) => setUploadConfirmed(event.target.checked)} />
              <span>This image contains my signature only.</span>
            </label>
            <div className="modal-actions">
              <button className="button secondary" type="button" onClick={chooseAnotherUpload}>
                <Upload size={17} /> Choose another
              </button>
              <button className="button primary" type="button" onClick={applyUploadedSignature} disabled={!uploadConfirmed}>
                <Check size={17} /> Use signature
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
