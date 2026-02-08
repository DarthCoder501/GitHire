import type { HiringReport } from "@/lib/types/report";

/**
 * Generate and download a PDF report using jsPDF + jspdf-autotable.
 * All imports are dynamic so the ~200 kB library is only pulled in on demand.
 */
export async function downloadPDF(report: HiringReport): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  /* ── Helpers ── */
  const addPageIfNeeded = (spaceNeeded: number) => {
    if (y + spaceNeeded > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const heading = (text: string, size = 14) => {
    addPageIfNeeded(size + 24);
    doc.setFontSize(size);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 229, 176); // teal
    doc.text(text, margin, y);
    y += size + 8;
  };

  const body = (text: string, size = 10) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(text, contentWidth);
    addPageIfNeeded(lines.length * (size + 4));
    doc.text(lines, margin, y);
    y += lines.length * (size + 4) + 4;
  };

  const bullet = (text: string, size = 10) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const bulletText = `•  ${text}`;
    const lines = doc.splitTextToSize(bulletText, contentWidth - 10);
    addPageIfNeeded(lines.length * (size + 4));
    doc.text(lines, margin + 10, y);
    y += lines.length * (size + 4) + 2;
  };

  const spacer = (px = 12) => {
    y += px;
  };

  /* ── Title ── */
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 229, 176);
  doc.text(`GitHire Report`, margin, y);
  y += 14;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(
    `@${report.username}  —  ${new Date().toLocaleDateString()}`,
    margin,
    y,
  );
  y += 20;

  // Thin teal line
  doc.setDrawColor(0, 229, 176);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  /* ── Profile ── */
  heading("Profile");
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "plain",
    styles: { fontSize: 9.5, cellPadding: 4, textColor: [60, 60, 60] },
    headStyles: {
      fillColor: [240, 248, 245],
      textColor: [0, 150, 120],
      fontStyle: "bold",
    },
    head: [["Field", "Value"]],
    body: [
      ["Name", report.name || "—"],
      ["Username", `@${report.username}`],
      ["Bio", report.bio || "—"],
      ["Public Repos", String(report.publicRepos)],
      [
        "Followers",
        report.followers >= 1000
          ? `${(report.followers / 1000).toFixed(0)}k`
          : String(report.followers),
      ],
    ],
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 16;

  /* ── Recommended role(s) ── */
  if (report.recommendedRoles?.length) {
    heading("Recommended role(s)");
    for (const role of report.recommendedRoles) bullet(role);
    spacer();
  }

  /* ── Executive Summary ── */
  heading("Executive Summary");
  body(report.executiveSummary || "—");
  spacer();

  /* ── Overall Hiring Score ── */
  heading("Overall Hiring Score");
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 229, 176);
  addPageIfNeeded(36);
  doc.text(`${report.overallScore} / 100`, margin, y);
  y += 36;
  spacer();

  /* ── Hiring Decision ── */
  heading("Hiring Decision");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 40, 40);
  addPageIfNeeded(20);
  doc.text(`Verdict: ${report.verdict}`, margin, y);
  y += 18;
  body(report.verdictReasoning || "—");
  spacer();

  /* ── Score Breakdown ── */
  heading("Score Breakdown");
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "grid",
    styles: { fontSize: 9.5, cellPadding: 5, textColor: [60, 60, 60] },
    headStyles: {
      fillColor: [0, 229, 176],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    head: [["Category", "Score"]],
    body: [
      ["Code Quality", String(report.scores.codeQuality)],
      ["Consistency", String(report.scores.consistency)],
      ["Impact", String(report.scores.impact)],
      ["Documentation", String(report.scores.documentation)],
      ["Testing", String(report.scores.testing)],
    ],
    columnStyles: { 1: { halign: "right" } },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 16;

  /* ── Top Strengths ── */
  heading("Top Strengths");
  if (report.strengths.length > 0) {
    for (const s of report.strengths) bullet(s.label);
  } else {
    body("— None listed");
  }
  spacer();

  /* ── Growth Areas ── */
  heading("Growth Areas");
  if (report.weaknesses.length > 0) {
    for (const w of report.weaknesses) bullet(w.label);
  } else {
    body("— None listed");
  }
  spacer();

  /* ── Skills ── */
  heading("Skills");
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "grid",
    styles: { fontSize: 9.5, cellPadding: 5, textColor: [60, 60, 60] },
    headStyles: {
      fillColor: [0, 229, 176],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    head: [["Skill", "Score"]],
    body: report.skills.map((s) => [s.skill, String(s.value)]),
    columnStyles: { 1: { halign: "right" } },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 16;

  /* ── Technical Highlights ── */
  heading("Technical Highlights");
  if (report.highlights.length > 0) {
    for (const h of report.highlights) bullet(h);
  } else {
    body("— None listed");
  }
  spacer();

  /* ── Activity / Commit Velocity ── */
  heading("Activity / Commit Velocity");
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "grid",
    styles: { fontSize: 9.5, cellPadding: 5, textColor: [60, 60, 60] },
    headStyles: {
      fillColor: [0, 229, 176],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    head: [["Month", "Commits"]],
    body: report.activity.map((a) => [a.month, String(a.commits)]),
    columnStyles: { 1: { halign: "right" } },
  });

  /* ── Save ── */
  doc.save(`GitHire-Report-${report.username}.pdf`);
}
