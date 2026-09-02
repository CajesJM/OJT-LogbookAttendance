import {
  formatCourseBlock,
  formatDate,
  formatHours,
  formatTime12Hour,
} from "./format";
import {
  buildTmcMonthGroups,
  formatTmcHours,
  getTmcTimeCells,
} from "./tmcReport";
import tmcFormTemplateUrl from "../assets/BSIT-TMC-OJT-FORMAT-page-1.png";
import type {
  DailyRecord,
  ReportTemplate,
  StudentProfile,
  UserAccount,
} from "../types";

type DocxReportData = {
  user: UserAccount;
  profile: StudentProfile;
  records: DailyRecord[];
  separateByMonth?: boolean;
  template?: ReportTemplate;
};

type ZipEntry = { name: string; data: Uint8Array };

const encoder = new TextEncoder();
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

function canvasPngBytes(canvas: HTMLCanvasElement) {
  return new Promise<Uint8Array>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("The TMC DOCX page could not be created."));
        return;
      }
      blob
        .arrayBuffer()
        .then((buffer) => resolve(new Uint8Array(buffer)))
        .catch(reject);
    }, "image/png");
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

async function renderTmcDocxPage(
  templateImage: HTMLImageElement,
  group: ReturnType<typeof buildTmcMonthGroups>[number],
  user: UserAccount,
  profile: StudentProfile,
) {
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
  const office = [profile.companyName, profile.department]
    .filter(Boolean)
    .join(" - ");

  context.fillStyle = "#000";
  context.textBaseline = "alphabetic";
  context.textAlign = "left";
  context.font = `${point(7.2)}px Arial, sans-serif`;
  context.fillText(profile.fullName || user.name, x(51), y(62.7), x(63));
  context.fillText(office, x(138.5), y(62.7), x(63));
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
    const timeValues = getTmcTimeCells(day);
    const values: Array<[string, number]> = [
      ...timeValues.map(
        (value, cellIndex) =>
          [value, [36.9, 55.8, 74.7, 93.6][cellIndex]] as [string, number],
      ),
      [day.totalHours ? formatTmcHours(day.totalHours) : "", 113],
    ];
    values.forEach(([value, position]) => {
      if (value) context.fillText(value, x(position), y(baseline));
    });

    if (day.experience) {
      context.textAlign = "left";
      context.font = `${point(5.6)}px Arial, sans-serif`;
      const lines = wrapCanvasText(context, day.experience, x(77)).slice(0, 2);
      const firstLine = baseline - (lines.length > 1 ? 1.05 : 0);
      lines.forEach((line, lineIndex) =>
        context.fillText(line, x(124), y(firstLine + lineIndex * 2.1)),
      );
    }
  });

  return canvasPngBytes(canvas);
}

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function textRun(value: unknown, bold = false, size = 18) {
  return `<w:r><w:rPr>${bold ? "<w:b/>" : ""}<w:sz w:val="${size}"/></w:rPr><w:t xml:space="preserve">${escapeXml(value)}</w:t></w:r>`;
}

function paragraph(content: string, options = "") {
  return `<w:p><w:pPr>${options}</w:pPr>${content}</w:p>`;
}

function cell(content: string, width: number, align?: "right" | "center") {
  const alignment = align ? `<w:jc w:val="${align}"/>` : "";
  const body = content.startsWith("<w:p>")
    ? content
    : paragraph(content, alignment);
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:tcMar><w:top w:w="60" w:type="dxa"/><w:left w:w="70" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tcMar></w:tcPr>${body}</w:tc>`;
}

function table(rows: string, widths: number[], bordered = true) {
  const borders = bordered
    ? '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="BFC8C3"/><w:left w:val="single" w:sz="4" w:color="BFC8C3"/><w:bottom w:val="single" w:sz="4" w:color="BFC8C3"/><w:right w:val="single" w:sz="4" w:color="BFC8C3"/><w:insideH w:val="single" w:sz="4" w:color="D9DFDC"/><w:insideV w:val="single" w:sz="4" w:color="D9DFDC"/></w:tblBorders>'
    : '<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>';
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>${borders}</w:tblPr><w:tblGrid>${widths.map((width) => `<w:gridCol w:w="${width}"/>`).join("")}</w:tblGrid>${rows}</w:tbl>`;
}

function signatureDrawing(relationshipId: string, imageId: number) {
  return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="700000" cy="230000"/><wp:docPr id="${imageId}" name="Signature ${imageId}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${imageId}" name="signature-${imageId}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relationshipId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="700000" cy="230000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}

function fullPageDrawing(relationshipId: string, imageId: number) {
  return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="7772400" cy="11925000"/><wp:docPr id="${imageId}" name="TMC form page ${imageId}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${imageId}" name="tmc-page-${imageId}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relationshipId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="7772400" cy="11925000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}

function dataUrlBytes(dataUrl: string) {
  const encoded = dataUrl.split(",")[1] || "";
  const binary = atob(encoded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1)
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function joinBytes(parts: Uint8Array[]) {
  const result = new Uint8Array(
    parts.reduce((sum, part) => sum + part.length, 0),
  );
  let offset = 0;
  parts.forEach((part) => {
    result.set(part, offset);
    offset += part.length;
  });
  return result;
}

function zip(entries: ZipEntry[]) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  const write16 = (view: DataView, position: number, value: number) =>
    view.setUint16(position, value, true);
  const write32 = (view: DataView, position: number, value: number) =>
    view.setUint32(position, value, true);

  entries.forEach(({ name, data }) => {
    const nameBytes = encoder.encode(name);
    const checksum = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    write32(localView, 0, 0x04034b50);
    write16(localView, 4, 20);
    write16(localView, 6, 0x0800);
    write32(localView, 14, checksum);
    write32(localView, 18, data.length);
    write32(localView, 22, data.length);
    write16(localView, 26, nameBytes.length);
    local.set(nameBytes, 30);
    localParts.push(local, data);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    write32(centralView, 0, 0x02014b50);
    write16(centralView, 4, 20);
    write16(centralView, 6, 20);
    write16(centralView, 8, 0x0800);
    write32(centralView, 16, checksum);
    write32(centralView, 20, data.length);
    write32(centralView, 24, data.length);
    write16(centralView, 28, nameBytes.length);
    write32(centralView, 42, offset);
    central.set(nameBytes, 46);
    centralParts.push(central);
    offset += local.length + data.length;
  });

  const centralDirectory = joinBytes(centralParts);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  write32(endView, 0, 0x06054b50);
  write16(endView, 8, entries.length);
  write16(endView, 10, entries.length);
  write32(endView, 12, centralDirectory.length);
  write32(endView, 16, offset);
  return joinBytes([...localParts, centralDirectory, end]);
}

function saveDocx(
  documentXml: string,
  relationships: string[],
  images: ZipEntry[],
  fileName: string,
) {
  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
  const rootRelationships = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const documentRelationships = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships.join("")}</Relationships>`;
  const archive = zip([
    { name: "[Content_Types].xml", data: encoder.encode(contentTypes) },
    { name: "_rels/.rels", data: encoder.encode(rootRelationships) },
    { name: "word/document.xml", data: encoder.encode(documentXml) },
    {
      name: "word/_rels/document.xml.rels",
      data: encoder.encode(documentRelationships),
    },
    ...images,
  ]);
  const blob = new Blob([archive], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadOjtReportDocx({
  user,
  profile,
  records,
  separateByMonth = false,
  template = "detailed",
}: DocxReportData) {
  if (template === "tmc") {
    const templateImage = await loadImage(tmcFormTemplateUrl);
    const monthGroups = buildTmcMonthGroups(records);
    const pageImages = await Promise.all(
      monthGroups.map((group) =>
        renderTmcDocxPage(templateImage, group, user, profile),
      ),
    );
    const relationships = pageImages.map(
      (_, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/tmc-page-${index + 1}.png"/>`,
    );
    const images = pageImages.map((data, index) => ({
      name: `word/media/tmc-page-${index + 1}.png`,
      data,
    }));
    const pages = pageImages
      .map((_, index) => {
        return paragraph(
          fullPageDrawing(`rId${index + 1}`, index + 1),
          `${index > 0 ? "<w:pageBreakBefore/>" : ""}<w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:line="1" w:lineRule="exact"/>`,
        );
      })
      .join("");
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${pages}<w:sectPr><w:pgSz w:w="12240" w:h="18824"/><w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`;
    saveDocx(
      documentXml,
      relationships,
      images,
      `tmc-daily-time-record-${new Date().toISOString().slice(0, 10)}.docx`,
    );
    return;
  }

  const requiredHours = Number(profile.requiredHours) || 0;
  const totalHours = records.reduce(
    (sum, record) => sum + record.totalHours,
    0,
  );
  let cumulativeHours = 0;
  const sortedRecords = [...records].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const entries = sortedRecords.map((record) => {
    cumulativeHours += record.totalHours;
    return { record, remaining: Math.max(0, requiredHours - cumulativeHours) };
  });
  const groups = entries.reduce<
    Array<{ key: string; label: string | null; entries: typeof entries }>
  >((result, entry) => {
    const key = separateByMonth ? entry.record.date.slice(0, 7) : "all";
    const date = new Date(`${entry.record.date}T00:00:00`);
    const label = separateByMonth
      ? date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : null;
    const current = result[result.length - 1];
    if (!current || current.key !== key)
      result.push({ key, label, entries: [entry] });
    else current.entries.push(entry);
    return result;
  }, []);
  if (!groups.length) groups.push({ key: "all", label: null, entries: [] });

  if (template === "worklog") {
    const worklogImages: ZipEntry[] = [];
    const worklogRelationships: string[] = [];
    const worklogSignatures = new Map<
      string,
      { relationshipId: string; imageId: number }
    >();
    let worklogImageId = 1;
    entries.forEach(({ record }) => {
      if (!record.signature) return;
      const relationshipId = `rId${worklogImageId}`;
      worklogImages.push({
        name: `word/media/signature-${worklogImageId}.png`,
        data: dataUrlBytes(record.signature),
      });
      worklogRelationships.push(
        `<Relationship Id="${relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/signature-${worklogImageId}.png"/>`,
      );
      worklogSignatures.set(record.id, {
        relationshipId,
        imageId: worklogImageId,
      });
      worklogImageId += 1;
    });
    const worklogGroups = groups
      .map((group, groupIndex) => {
        const pageBreak =
          separateByMonth && groupIndex > 0
            ? paragraph('<w:r><w:br w:type="page"/></w:r>')
            : "";
        const titleRow = `<w:tr>${cell(textRun("Work Log", false, 34), 6000)}${cell(textRun(`Month: ${group.label || "All records"}`, true, 18), 3800, "right")}</w:tr>`;
        const metaRow = `<w:tr>${cell(textRun(`Name: ${profile.fullName || user.name}`, false, 16), 4900)}${cell(textRun(`Company: ${profile.companyName || "Not set"}`, false, 16), 4900)}</w:tr>`;
        const showNote = group.entries.some(({ record }) =>
          Boolean(record.reflection?.trim()),
        );
        const showSignature = group.entries.some(({ record }) =>
          Boolean(record.signature),
        );
        const dateWidth = 1500;
        const timeWidth = 1250;
        const remainingWidth = 1500;
        const noteWidth = showNote ? 2100 : 0;
        const signatureWidth = showSignature ? 1450 : 0;
        const taskWidth =
          9800 -
          dateWidth -
          timeWidth -
          remainingWidth -
          noteWidth -
          signatureWidth;
        const widths = [
          dateWidth,
          taskWidth,
          timeWidth,
          remainingWidth,
          ...(showNote ? [noteWidth] : []),
          ...(showSignature ? [signatureWidth] : []),
        ];
        const header = `<w:tr><w:trPr><w:tblHeader/></w:trPr>${cell(textRun("DATE", true, 16), dateWidth, "center")}${cell(textRun("TASK", true, 16), taskWidth, "center")}${cell(textRun("TOTAL TIME", true, 16), timeWidth, "center")}${cell(textRun("TIME REMAINING", true, 16), remainingWidth, "center")}${showNote ? cell(textRun("NOTE", true, 16), noteWidth, "center") : ""}${showSignature ? cell(textRun("SIGNATURE", true, 16), signatureWidth, "center") : ""}</w:tr>`;
        const rows = group.entries
          .map(({ record, remaining }) => {
            const signature = worklogSignatures.get(record.id);
            const signatureXml = signature
              ? signatureDrawing(signature.relationshipId, signature.imageId)
              : "";
            return `<w:tr><w:trPr><w:cantSplit/></w:trPr>${cell(textRun(formatDate(record.date), false, 16), dateWidth, "center")}${cell(textRun(record.taskTitle, false, 16), taskWidth)}${cell(textRun(formatHours(record.totalHours), false, 16), timeWidth, "center")}${cell(textRun(formatHours(remaining), false, 16), remainingWidth, "center")}${showNote ? cell(textRun(record.reflection || "", false, 16), noteWidth) : ""}${showSignature ? cell(signatureXml, signatureWidth, "center") : ""}</w:tr>`;
          })
          .join("");
        return `${pageBreak}${table(titleRow, [6000, 3800], false)}${table(metaRow, [4900, 4900], false)}${paragraph("", '<w:spacing w:after="60"/>')}${table(header + rows, widths)}`;
      })
      .join("");
    const worklogDocument = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${worklogGroups}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="907" w:right="907" w:bottom="907" w:left="907"/></w:sectPr></w:body></w:document>`;
    saveDocx(
      worklogDocument,
      worklogRelationships,
      worklogImages,
      `ojt-work-log-${new Date().toISOString().slice(0, 10)}.docx`,
    );
    return;
  }

  const images: ZipEntry[] = [];
  const relationships: string[] = [];
  let imageId = 1;
  const recordSignature = new Map<
    string,
    { relationshipId: string; imageId: number }
  >();
  entries.forEach(({ record }) => {
    if (!record.signature) return;
    const relationshipId = `rId${imageId}`;
    images.push({
      name: `word/media/signature-${imageId}.png`,
      data: dataUrlBytes(record.signature),
    });
    relationships.push(
      `<Relationship Id="${relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/signature-${imageId}.png"/>`,
    );
    recordSignature.set(record.id, { relationshipId, imageId });
    imageId += 1;
  });

  const summary = [
    ["Name", profile.fullName || user.name],
    ["Gmail", profile.email || user.email || "Not set"],
    ["School", profile.school || "Not set"],
    ["Course", profile.course || "Not set"],
    ["Block", profile.block || "Not set"],
    ["Company", profile.companyName || "Not set"],
    ["Department", profile.department || "Not set"],
    ["Supervisor", profile.supervisorName || "Not set"],
    ["Start date", formatDate(profile.ojtStartDate)],
    ["Rendered hours", formatHours(totalHours)],
    ["Required hours", formatHours(requiredHours)],
  ];
  const summaryRows = summary.reduce((xml, item, index) => {
    if (index % 2) return xml;
    const next = summary[index + 1];
    return `${xml}<w:tr>${cell(textRun(`${item[0]}: `, true) + textRun(item[1]), 4300)}${cell(next ? textRun(`${next[0]}: `, true) + textRun(next[1]) : "", 4300)}</w:tr>`;
  }, "");

  const groupXml = groups
    .map((group, groupIndex) => {
      const pageBreak =
        separateByMonth && groupIndex > 0
          ? paragraph('<w:r><w:br w:type="page"/></w:r>')
          : "";
      const heading = paragraph(
        textRun(
          `Daily Records${group.label ? ` - ${group.label}` : ""}`,
          true,
          23,
        ),
        '<w:spacing w:before="160" w:after="80"/>',
      );
      const header = `<w:tr><w:trPr><w:tblHeader/></w:trPr>${cell(textRun("Daily Records", true, 16), 6700)}${cell(textRun("Remaining hours", true, 16), 1100, "right")}${cell(textRun("Signature", true, 16), 1100, "right")}</w:tr>`;
      const rows = group.entries
        .map(({ record, remaining }) => {
          const details = [
            paragraph(
              textRun(`${formatDate(record.date)} - ${record.taskTitle}`, true),
            ),
            paragraph(
              textRun(
                `${formatTime12Hour(record.timeIn)} to ${formatTime12Hour(record.timeOut)} (${formatHours(record.totalHours)})`,
                false,
                16,
              ),
            ),
            ...(record.activities
              ? [
                  paragraph(
                    textRun("Activities: ", true, 16) +
                      textRun(record.activities, false, 16),
                  ),
                ]
              : []),
            ...(record.skillsLearned
              ? [
                  paragraph(
                    textRun("Skills learned: ", true, 16) +
                      textRun(record.skillsLearned, false, 16),
                  ),
                ]
              : []),
            ...(record.challenges
              ? [
                  paragraph(
                    textRun("Challenges: ", true, 16) +
                      textRun(record.challenges, false, 16),
                  ),
                ]
              : []),
            ...(record.reflection
              ? [
                  paragraph(
                    textRun("Reflection: ", true, 16) +
                      textRun(record.reflection, false, 16),
                  ),
                ]
              : []),
          ].join("");
          const signature = recordSignature.get(record.id);
          const signatureXml = signature
            ? signatureDrawing(signature.relationshipId, signature.imageId)
            : "";
          return `<w:tr><w:trPr><w:cantSplit/></w:trPr>${cell(details, 6700)}${cell(textRun(formatHours(remaining), true), 1100, "right")}${cell(signatureXml, 1100, "right")}</w:tr>`;
        })
        .join("");
      return `${pageBreak}${heading}${table(header + rows, [6700, 1100, 1100])}`;
    })
    .join("");

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${paragraph(textRun("OJT Logbook Report", true, 32), '<w:spacing w:after="180"/>')}${table(summaryRows, [4300, 4300])}${groupXml}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="907" w:right="907" w:bottom="907" w:left="907"/></w:sectPr></w:body></w:document>`;
  saveDocx(
    documentXml,
    relationships,
    images,
    `ojt-logbook-${new Date().toISOString().slice(0, 10)}.docx`,
  );
}
