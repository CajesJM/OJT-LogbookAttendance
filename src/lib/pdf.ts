import { formatDate, formatHours } from "./format";
import type { DailyRecord, StudentProfile, UserAccount } from "../types";

type PdfReportData = {
  user: UserAccount;
  profile: StudentProfile;
  records: DailyRecord[];
};

export async function downloadOjtReportPdf({ user, profile, records }: PdfReportData) {
  const { jsPDF } = await import("jspdf");
  const document = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const margin = 16;
  const ledgerWidth = 38;
  const columnGap = 8;
  const contentWidth = pageWidth - margin * 2 - ledgerWidth - columnGap;
  const requiredHours = Number(profile.requiredHours) || 0;
  const totalHours = records.reduce((sum, record) => sum + record.totalHours, 0);
  let y = margin;

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
    ["Gmail", profile.email || user.email],
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

  document.setFont("helvetica", "bold");
  document.setFontSize(11.5);
  document.text("Daily Records", margin, y);
  y += 6;

  let cumulativeHours = 0;
  [...records]
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((record) => {
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
      const signatureHeight = record.signature ? 16 : 0;
      const recordHeight = Math.max(21, 15 + detailLines.length * 3.6 + signatureHeight);
      ensureSpace(recordHeight + 4);

      document.setDrawColor(190, 198, 194);
      document.line(margin, y, pageWidth - margin, y);
      y += 4;
      document.setFont("helvetica", "bold");
      document.setFontSize(9);
      document.text(`${formatDate(record.date)} - ${record.taskTitle}`, margin, y, { maxWidth: contentWidth });
      y += 4.5;
      document.setFont("helvetica", "normal");
      document.setFontSize(7.8);
      document.text(`${record.timeIn} to ${record.timeOut} (${formatHours(record.totalHours)})`, margin, y);
      y += 4;
      if (detailLines.length) {
        document.text(detailLines, margin, y);
        y += detailLines.length * 3.6;
      }
      if (record.signature) {
        document.setFont("helvetica", "bold");
        document.text("Signature:", margin, y);
        try {
          document.addImage(record.signature, "PNG", margin + 18, y - 4, 42, 13, undefined, "FAST");
        } catch {
          document.setFont("helvetica", "normal");
          document.text("Saved signature", margin + 18, y);
        }
        y += 15;
      }

      const ledgerX = pageWidth - margin - ledgerWidth;
      const ledgerY = y - Math.max(14, detailLines.length * 4 + signatureHeight + 10);
      document.setFont("helvetica", "normal");
      document.setFontSize(7);
      document.text("Remaining hours", ledgerX + ledgerWidth, ledgerY + 6, { align: "right" });
      document.setFont("helvetica", "bold");
      document.setFontSize(9.5);
      document.text(formatHours(remainingHours), ledgerX + ledgerWidth, ledgerY + 13, { align: "right" });
      y = Math.max(y, ledgerY + 20);
    });

  document.save(`ojt-logbook-${new Date().toISOString().slice(0, 10)}.pdf`);
}
