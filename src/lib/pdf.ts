import { formatDate, formatHours, formatTime12Hour } from "./format";
import type { DailyRecord, ReportTemplate, StudentProfile, UserAccount } from "../types";

type PdfReportData = {
  user: UserAccount;
  profile: StudentProfile;
  records: DailyRecord[];
  separateByMonth?: boolean;
  template?: ReportTemplate;
};

export async function downloadOjtReportPdf({ user, profile, records, separateByMonth = false, template = "detailed" }: PdfReportData) {
  const { jsPDF } = await import("jspdf");
  const document = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const margin = 16;
  const remainingWidth = 24;
  const signatureWidth = 24;
  const columnGap = 5;
  const contentWidth = pageWidth - margin * 2 - remainingWidth - signatureWidth - columnGap * 2;
  const requiredHours = Number(profile.requiredHours) || 0;
  const totalHours = records.reduce((sum, record) => sum + record.totalHours, 0);
  const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));
  let y = margin;

  if (template === "worklog") {
    const innerWidth = pageWidth - margin * 2;
    const monthName = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    let worklogCumulativeHours = 0;
    const worklogEntries = sortedRecords.map((record) => {
      worklogCumulativeHours += record.totalHours;
      return { record, remainingHours: Math.max(0, requiredHours - worklogCumulativeHours) };
    });
    const groups = worklogEntries.reduce<Array<{ label: string; entries: typeof worklogEntries }>>((result, entry) => {
      const label = separateByMonth ? monthName(entry.record.date) : "All records";
      const current = result[result.length - 1];
      if (!current || current.label !== label) result.push({ label, entries: [entry] });
      else current.entries.push(entry);
      return result;
    }, []);
    if (!groups.length) groups.push({ label: "All records", entries: [] });

    groups.forEach((group, groupIndex) => {
      if (groupIndex > 0) {
        document.addPage();
        y = margin;
      }
      const showNote = group.entries.some(({ record }) => Boolean(record.reflection?.trim()));
      const showSignature = group.entries.some(({ record }) => Boolean(record.signature));
      const fixedWidth = 26 + 23 + 27 + (showNote ? 36 : 0) + (showSignature ? 24 : 0);
      const columns = [
        { heading: "DATE", width: 26, center: true },
        { heading: "TASK", width: innerWidth - fixedWidth, center: false },
        { heading: "TOTAL TIME", width: 23, center: true },
        { heading: "TIME REMAINING", width: 27, center: true },
        ...(showNote ? [{ heading: "NOTE", width: 36, center: false }] : []),
        ...(showSignature ? [{ heading: "SIGNATURE", width: 24, center: true }] : []),
      ];
      const positions = columns.reduce<number[]>((result, column) => [...result, result[result.length - 1] + column.width], [margin]);
      const drawWorklogHeader = (continued = false) => {
        document.setTextColor(20, 25, 23);
        document.setFont("helvetica", "normal");
        document.setFontSize(20);
        document.text("Work Log", margin, y + 5);
        document.setFont("helvetica", "bold");
        document.setFontSize(8);
        document.text(`Month: ${group.label}${continued ? " (continued)" : ""}`, pageWidth - margin, y + 4, { align: "right" });
        y += 12;
        document.setFontSize(7.5);
        document.text(`Name: ${profile.fullName || user.name}`, margin, y);
        document.text(`Company: ${profile.companyName || "Not set"}`, margin + innerWidth / 2, y);
        y += 4;
        document.setFillColor(232, 232, 232);
        document.setDrawColor(85, 85, 85);
        document.rect(margin, y, innerWidth, 7, "FD");
        positions.slice(1, -1).forEach((x) => document.line(x, y, x, y + 7));
        document.setFontSize(7);
        columns.forEach((column, index) => document.text(column.heading, positions[index] + column.width / 2, y + 4.5, { align: "center" }));
        y += 7;
      };
      drawWorklogHeader();

      group.entries.forEach(({ record, remainingHours }) => {
        const values = [formatDate(record.date), record.taskTitle, formatHours(record.totalHours), formatHours(remainingHours), ...(showNote ? [record.reflection || ""] : [])];
        const textColumns = showSignature ? columns.slice(0, -1) : columns;
        const lines = values.map((value, column) => document.splitTextToSize(value, textColumns[column].width - 4));
        const rowHeight = Math.max(showSignature && record.signature ? 9 : 8, ...lines.map((value) => value.length * 3.2 + 3));
        if (y + rowHeight > pageHeight - margin) {
          document.addPage();
          y = margin;
          drawWorklogHeader(true);
        }
        document.setDrawColor(85, 85, 85);
        document.rect(margin, y, innerWidth, rowHeight);
        positions.slice(1, -1).forEach((x) => document.line(x, y, x, y + rowHeight));
        document.setFont("helvetica", "normal");
        document.setFontSize(7.5);
        lines.forEach((value, column) => {
          const config = textColumns[column];
          document.text(value, config.center ? positions[column] + config.width / 2 : positions[column] + 2, y + 4.5, config.center ? { align: "center" } : undefined);
        });
        if (showSignature && record.signature) {
          const signatureIndex = columns.length - 1;
          try {
            document.addImage(record.signature, "PNG", positions[signatureIndex] + 2, y + 0.5, columns[signatureIndex].width - 4, 7, undefined, "FAST");
            document.line(positions[signatureIndex] + 2, y + 8, positions[signatureIndex + 1] - 2, y + 8);
          } catch {
            document.setFontSize(6.5);
            document.text("Saved signature", positions[signatureIndex + 1] - 2, y + 4.5, { align: "right" });
          }
        }
        y += rowHeight;
      });
    });
    document.save(`ojt-work-log-${new Date().toISOString().slice(0, 10)}.pdf`);
    return;
  }

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - margin) return;
    document.addPage();
    y = margin;
  };

  document.setTextColor(24, 35, 31);
  document.setFont("helvetica", "bold");
  document.setFontSize(16);
  document.text("OJT Logbook Report", margin, y);
  y += 10;

  const summary = [
    ["Name", profile.fullName || user.name],
    ["Gmail", profile.email || user.email || "Not set"],
    ["School", profile.school || "Not set"],
    ["Course", profile.course || "Not set"],
    ["Company", profile.companyName || "Not set"],
    ["Department", profile.department || "Not set"],
    ["Supervisor", profile.supervisorName || "Not set"],
    ["Start date", formatDate(profile.ojtStartDate)],
    ["Rendered hours", formatHours(totalHours)],
    ["Required hours", formatHours(requiredHours)],
  ];
  document.setFontSize(8);
  summary.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = margin + column * ((pageWidth - margin * 2) / 2);
    const rowY = y + row * 5;
    document.setFont("helvetica", "bold");
    document.text(`${label}:`, x, rowY);
    document.setFont("helvetica", "normal");
    document.text(String(value), x + 24, rowY, { maxWidth: 58 });
  });
  y += Math.ceil(summary.length / 2) * 5 + 6;

  const remainingHeaderX = margin + contentWidth + columnGap;
  const signatureHeaderX = remainingHeaderX + remainingWidth + columnGap;
  const monthLabel = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const drawRecordHeader = (label?: string) => {
    document.setFont("helvetica", "bold");
    document.setFontSize(11.5);
    document.text(`Daily Records${label ? ` - ${label}` : ""}`, margin, y);
    document.setFontSize(7);
    document.text("Remaining hours", remainingHeaderX + remainingWidth, y, { align: "right" });
    document.text("Signature", signatureHeaderX + signatureWidth, y, { align: "right" });
    y += 6;
  };
  drawRecordHeader(separateByMonth && sortedRecords[0] ? monthLabel(sortedRecords[0].date) : undefined);

  let cumulativeHours = 0;
  let currentMonth = sortedRecords[0]?.date.slice(0, 7);
  sortedRecords.forEach((record, index) => {
      const recordMonth = record.date.slice(0, 7);
      if (separateByMonth && index > 0 && recordMonth !== currentMonth) {
        document.addPage();
        y = margin;
        drawRecordHeader(monthLabel(record.date));
        currentMonth = recordMonth;
      }
      cumulativeHours += record.totalHours;
      const remainingHours = Math.max(0, requiredHours - cumulativeHours);
      const reflectionLines = record.reflection
        ? document.splitTextToSize(`Reflection: ${record.reflection}`, contentWidth)
        : [];
      const detailLines = [
        ...reflectionLines,
        ...(record.activities ? document.splitTextToSize(`Activities: ${record.activities}`, contentWidth) : []),
        ...(record.skillsLearned ? document.splitTextToSize(`Skills learned: ${record.skillsLearned}`, contentWidth) : []),
        ...(record.challenges ? document.splitTextToSize(`Challenges: ${record.challenges}`, contentWidth) : []),
      ];
      const contentHeight = 12.5 + detailLines.length * 3.6;
      const sideColumnHeight = record.signature ? 9 : 7;
      const recordHeight = 4 + Math.max(contentHeight, sideColumnHeight);
      ensureSpace(recordHeight + 4);

      document.setDrawColor(190, 198, 194);
      document.line(margin, y, pageWidth - margin, y);
      y += 4;
      const recordTop = y;
      document.setFont("helvetica", "bold");
      document.setFontSize(9);
      document.text(`${formatDate(record.date)} - ${record.taskTitle}`, margin, y, { maxWidth: contentWidth });
      y += 4.5;
      document.setFont("helvetica", "normal");
      document.setFontSize(7.8);
      document.text(`${formatTime12Hour(record.timeIn)} to ${formatTime12Hour(record.timeOut)} (${formatHours(record.totalHours)})`, margin, y);
      y += 4;
      if (detailLines.length) {
        document.text(detailLines, margin, y);
        y += detailLines.length * 3.6;
      }

      const remainingX = margin + contentWidth + columnGap;
      const signatureX = remainingX + remainingWidth + columnGap;
      document.setFont("helvetica", "bold");
      document.setFontSize(9.5);
      document.text(formatHours(remainingHours), remainingX + remainingWidth, recordTop + 4, { align: "right" });

      if (record.signature) {
        try {
          document.addImage(record.signature, "PNG", signatureX + 2, recordTop, signatureWidth - 2, 7, undefined, "FAST");
          document.setDrawColor(120, 120, 120);
          document.line(signatureX + 2, recordTop + 7.5, signatureX + signatureWidth, recordTop + 7.5);
        } catch {
          document.setFont("helvetica", "normal");
          document.setFontSize(7);
          document.text("Saved signature", signatureX + signatureWidth, recordTop + 4, { align: "right" });
        }
      }

      y = recordTop + Math.max(contentHeight, sideColumnHeight);
    });

  document.save(`ojt-logbook-${new Date().toISOString().slice(0, 10)}.pdf`);
}
