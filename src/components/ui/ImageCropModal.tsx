import { PointerEvent, useEffect, useRef, useState } from "react";
import { Check, Image as ImageIcon, Minus, Plus, X } from "lucide-react";

type Point = { x: number; y: number };

type Props = {
  file: File | null;
  onCancel: () => void;
  onApply: (file: File) => Promise<void>;
};

const OUTPUT_SIZE = 512;

export function ImageCropModal({ file, onCancel, onApply }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    start: Point;
    origin: Point;
  } | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 });
  const [viewportSize, setViewportSize] = useState(280);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.src = url;
    setImageUrl(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    return () => {
      imageRef.current = null;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!file || !viewport) return;
    const updateSize = () =>
      setViewportSize(viewport.getBoundingClientRect().width || 280);
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [file, imageUrl]);

  useEffect(() => {
    if (!file) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onCancel();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [file, onCancel, saving]);

  if (!file) return null;
  const previewScale = Math.max(
    viewportSize / imageSize.width,
    viewportSize / imageSize.height,
  );

  function clampOffset(next: Point, nextZoom = zoom) {
    const size = viewportRef.current?.getBoundingClientRect().width || 280;
    const baseScale = Math.max(size / imageSize.width, size / imageSize.height);
    const renderedWidth = imageSize.width * baseScale * nextZoom;
    const renderedHeight = imageSize.height * baseScale * nextZoom;
    const maxX = Math.max(0, (renderedWidth - size) / 2);
    const maxY = Math.max(0, (renderedHeight - size) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, next.x)),
      y: Math.max(-maxY, Math.min(maxY, next.y)),
    };
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      origin: offset,
    };
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    const current = dragRef.current;
    if (!current || current.pointerId !== event.pointerId) return;
    setOffset(
      clampOffset({
        x: current.origin.x + event.clientX - current.start.x,
        y: current.origin.y + event.clientY - current.start.y,
      }),
    );
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  }

  function changeZoom(value: number) {
    const nextZoom = Math.max(1, Math.min(3, value));
    setZoom(nextZoom);
    setOffset((current) => clampOffset(current, nextZoom));
  }

  async function applyCrop() {
    const image = imageRef.current;
    const viewportWidth = viewportRef.current?.getBoundingClientRect().width;
    if (!image || !viewportWidth) return;
    setSaving(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is unavailable");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      const baseScale = Math.max(
        viewportWidth / image.naturalWidth,
        viewportWidth / image.naturalHeight,
      );
      const displayScale = baseScale * zoom;
      const renderedWidth = image.naturalWidth * displayScale;
      const renderedHeight = image.naturalHeight * displayScale;
      const ratio = OUTPUT_SIZE / viewportWidth;
      context.drawImage(
        image,
        ((viewportWidth - renderedWidth) / 2 + offset.x) * ratio,
        ((viewportWidth - renderedHeight) / 2 + offset.y) * ratio,
        renderedWidth * ratio,
        renderedHeight * ratio,
      );
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (result) =>
            result ? resolve(result) : reject(new Error("Crop failed")),
          "image/jpeg",
          0.9,
        ),
      );
      await onApply(
        new File([blob], "profile-photo.jpg", {
          type: "image/jpeg",
          lastModified: Date.now(),
        }),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop crop-backdrop" role="presentation">
      <section
        className="modal image-crop-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="crop-title"
      >
        <div className="modal-icon">
          <ImageIcon size={22} aria-hidden="true" />
        </div>
        <button
          className="icon-button modal-close"
          onClick={onCancel}
          disabled={saving}
          aria-label="Close photo crop"
        >
          <X size={18} />
        </button>
        <h2 id="crop-title">Crop profile photo</h2>
        <p>Drag the photo to position it inside the square.</p>
        <div
          ref={viewportRef}
          className="crop-viewport"
          onPointerDown={startDrag}
          onPointerMove={drag}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
        >
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Profile crop preview"
              draggable="false"
              style={{
                width: `${imageSize.width * previewScale}px`,
                height: `${imageSize.height * previewScale}px`,
                left: `calc(50% + ${offset.x}px)`,
                top: `calc(50% + ${offset.y}px)`,
                transform: `translate(-50%, -50%) scale(${zoom})`,
              }}
            />
          )}
          <span className="crop-guide" aria-hidden="true" />
        </div>
        <div className="crop-zoom-control">
          <Minus size={16} aria-hidden="true" />
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={(event) => changeZoom(Number(event.target.value))}
            aria-label="Photo zoom"
          />
          <Plus size={16} aria-hidden="true" />
        </div>
        <div className="modal-actions">
          <button
            className="button secondary"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="button primary"
            onClick={applyCrop}
            disabled={saving || !imageRef.current}
          >
            <Check size={17} /> {saving ? "Preparing..." : "Use photo"}
          </button>
        </div>
      </section>
    </div>
  );
}
