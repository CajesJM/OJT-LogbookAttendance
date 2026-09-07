import {
  buildTmcMonthGroups,
  formatTmcHours,
  getTmcTimeCells,
} from "./tmcReport";
import { formatCourseBlock } from "./format";
import tmcFormTemplateUrl from "../assets/BSIT-TMC-OJT-FORMAT-page-1.png";
import type { DailyRecord, StudentProfile, UserAccount } from "../types";

const TMC_PAGE_WIDTH_MM = 215.9;
const TMC_PAGE_HEIGHT_MM = 332.04;

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("The TMC report template could not be loaded."));
    image.src = source;
  });
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
) {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (line && context.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function canvasToDataUrl(canvas: HTMLCanvasElement) {
  return canvas.toDataURL("image/png");
}

export async function renderTmcPageImageUrls({
  user,
  profile,
  records,
}: {
  user: UserAccount;
  profile: StudentProfile;
  records: DailyRecord[];
}) {
  const templateImage = await loadImage(tmcFormTemplateUrl);
  const groups = buildTmcMonthGroups(records);

  return groups.map((group) => {
    const canvas = document.createElement("canvas");
    canvas.width = templateImage.naturalWidth || 1837;
    canvas.height = templateImage.naturalHeight || 2824;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is not available in this browser.");

    context.drawImage(templateImage, 0, 0, canvas.width, canvas.height);

    const x = (millimeters: number) =>
      (millimeters / TMC_PAGE_WIDTH_MM) * canvas.width;
    const y = (millimeters: number) =>
      (millimeters / TMC_PAGE_HEIGHT_MM) * canvas.height;
    const point = (size: number) => (size / 72) * (canvas.width / 8.5);

    context.fillStyle = "#000";
    context.textBaseline = "alphabetic";
    context.textAlign = "left";
    context.font = `${point(7.2)}px Arial, sans-serif`;
    context.fillText(profile.fullName || user.name, x(51), y(62.7), x(63));
    context.fillText(profile.companyName, x(138.5), y(62.7), x(63));
    context.fillText(
      formatCourseBlock(profile.course, profile.block),
      x(51),
      y(69.2),
      x(63),
    );
    context.fillText(group.label, x(138.5), y(69.2), x(63));

    group.days.forEach((day, index) => {
      const baseline = 89.55 + index * 5.26;
      context.textAlign = "center";
      context.font = `${point(6.2)}px Arial, sans-serif`;
      const values: Array<[string, number]> = [
        ...getTmcTimeCells(day).map(
          (value, cellIndex) =>
            [value, [36.9, 55.8, 74.7, 93.6][cellIndex]] as [
              string,
              number,
            ],
        ),
        [day.totalHours ? formatTmcHours(day.totalHours) : "", 113],
      ];
      values.forEach(([value, position]) => {
        if (value) context.fillText(value, x(position), y(baseline));
      });

      if (day.experience) {
        context.textAlign = "left";
        context.font = `${point(5.6)}px Arial, sans-serif`;
        const lines = wrapCanvasText(context, day.experience, x(77)).slice(
          0,
          2,
        );
        const firstLine = baseline - (lines.length > 1 ? 1.05 : 0);
        lines.forEach((line, lineIndex) =>
          context.fillText(line, x(124), y(firstLine + lineIndex * 2.1)),
        );
      }
    });

    return canvasToDataUrl(canvas);
  });
}
