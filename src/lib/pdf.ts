import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCLP } from "./format";
import type { Exam, ExamCategory, Convenio, LabExam } from "@/data/catalog";
import { categoryMeta, convenioMeta } from "@/data/catalog";
import { preparationNotes, scheduleInfo, bloodSampleNote } from "@/data/preparation";

const BRAND: [number, number, number] = [25, 96, 165];
const BRAND_DARK: [number, number, number] = [20, 54, 93];

function header(doc: jsPDF, title: string) {
  doc.setFillColor(...BRAND_DARK);
  doc.rect(0, 0, 210, 30, "F");
  doc.setFillColor(...BRAND);
  doc.rect(0, 28, 210, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("DiagnoPRO Temuco", 15, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(title, 15, 22);
  const now = new Date();
  doc.setFontSize(8);
  doc.text(
    now.toLocaleDateString("es-CL") + " " + now.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
    195, 14, { align: "right" }
  );
}

function patientBox(doc: jsPDF, y: number, name: string, rut: string) {
  doc.setDrawColor(...BRAND);
  doc.setFillColor(241, 247, 252);
  doc.roundedRect(15, y, 180, 16, 2, 2, "FD");
  doc.setTextColor(...BRAND_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("PACIENTE", 20, y + 6);
  doc.text("RUT", 120, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  doc.text(name || "No especificado", 20, y + 12);
  doc.text(rut || "No especificado", 120, y + 12);
  return y + 22;
}

function footer(doc: jsPDF) {
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text(
    "Cotización referencial sujeta a confirmación. Los valores pueden variar según indicación médica.",
    105, 288, { align: "center" }
  );
}

// ── Imagenología PDF (multi-exam cart) ────────────────────────────────────────

export type ExamCartPDFItem = {
  exam: Exam;
  category: ExamCategory;
  qty: number;
  baseUnit: number;
  discountPct: number;
  discountAmt: number;
  discountedUnit: number;
  lineTotal: number;
};

export function generateExamPDF(args: {
  items: ExamCartPDFItem[];
  convenio: Convenio;
  prevision: string;
  grandTotal: number;
  patientName: string;
  patientRut: string;
  recommendations: string;
}) {
  const doc = new jsPDF();
  header(doc, "Cotización de Exámenes de Imagenología");
  let y = patientBox(doc, 38, args.patientName, args.patientRut);

  // Info row
  doc.setFillColor(241, 247, 252);
  doc.setDrawColor(...BRAND);
  doc.roundedRect(15, y, 180, 12, 2, 2, "FD");
  doc.setTextColor(...BRAND_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Previsión:", 20, y + 8);
  doc.text("Convenio:", 90, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  doc.text(args.prevision, 48, y + 8);
  doc.text(convenioMeta[args.convenio], 115, y + 8);
  y += 18;

  autoTable(doc, {
    startY: y,
    head: [["Tipo", "Examen", "Cant.", `Precio (${args.prevision})`, "Dto.", "Subtotal"]],
    body: args.items.map((it) => [
      categoryMeta[it.category].short,
      it.exam.name,
      String(it.qty),
      formatCLP(it.baseUnit),
      it.discountPct > 0 ? `${it.discountPct}%` : "—",
      formatCLP(it.lineTotal),
    ]),
    theme: "striped",
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 14, fontStyle: "bold", textColor: BRAND_DARK },
      2: { halign: "center", cellWidth: 14 },
      3: { halign: "right", cellWidth: 30 },
      4: { halign: "center", cellWidth: 16, textColor: [22, 163, 74] },
      5: { halign: "right", cellWidth: 30, fontStyle: "bold" },
    },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
  });

  // @ts-expect-error lastAutoTable injected by plugin
  y = doc.lastAutoTable.finalY + 8;

  const totalBefore = args.items.reduce((s, it) => s + it.baseUnit * it.qty, 0);
  const totalSaved = totalBefore - args.grandTotal;

  if (totalSaved > 0) {
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(22, 163, 74);
    doc.roundedRect(15, y, 180, 10, 2, 2, "FD");
    doc.setTextColor(22, 163, 74);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(`Ahorro por convenio ${convenioMeta[args.convenio]}: ${formatCLP(totalSaved)}`, 105, y + 7, { align: "center" });
    y += 16;
  }

  doc.setFillColor(...BRAND_DARK);
  doc.roundedRect(15, y, 180, 22, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("VALOR TOTAL A PAGAR", 22, y + 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(formatCLP(args.grandTotal), 188, y + 16, { align: "right" });
  y += 32;

  if (args.recommendations.trim()) {
    doc.setTextColor(...BRAND_DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Recomendaciones para el examen", 15, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(args.recommendations, 180);
    doc.text(lines, 15, y + 3);
  }

  footer(doc);
  const firstName = args.items[0]?.exam.name.slice(0, 20).replace(/[^a-zA-Z0-9]/g, "_") ?? "Examen";
  doc.save(`Cotizacion_${firstName}.pdf`);
}

// ── Laboratorio PDF ────────────────────────────────────────────────────────────

export function generateLabPDF(args: {
  items: LabExam[];
  patientName: string;
  patientRut: string;
}) {
  const doc = new jsPDF();
  header(doc, "Cotización de Exámenes de Laboratorio");
  const y = patientBox(doc, 38, args.patientName, args.patientRut);

  const totalFonasaA = args.items.reduce((s, e) => s + (e.fonasa_a ?? e.particular), 0);
  const totalFonasaBcd = args.items.reduce((s, e) => s + (e.fonasa_bcd ?? e.particular), 0);
  const totalPart = args.items.reduce((s, e) => s + e.particular, 0);

  autoTable(doc, {
    startY: y,
    head: [["Código", "Examen", "Obs.", "FONASA A", "FONASA B/C/D", "Particular"]],
    body: args.items.map((e) => [
      e.code,
      e.name,
      e.obs?.trim() || "",
      e.fonasa_a != null ? formatCLP(e.fonasa_a) : "—",
      e.fonasa_bcd != null ? formatCLP(e.fonasa_bcd) : "—",
      e.particular > 0 ? formatCLP(e.particular) : "Consultar",
    ]),
    theme: "striped",
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: "bold", textColor: BRAND_DARK },
      2: { cellWidth: 20, fontSize: 7.5, textColor: [160, 100, 20] },
      3: { halign: "right", cellWidth: 26 },
      4: { halign: "right", cellWidth: 26 },
      5: { halign: "right", cellWidth: 26 },
    },
    styles: { fontSize: 8, cellPadding: 2.5 },
  });

  // @ts-expect-error lastAutoTable injected by plugin
  let yy = doc.lastAutoTable.finalY + 8;

  // Three totals side by side
  const colW = 58;
  const totals = [
    { label: "FONASA A", value: formatCLP(totalFonasaA) },
    { label: "FONASA B/C/D", value: formatCLP(totalFonasaBcd) },
    { label: "PARTICULAR", value: formatCLP(totalPart) },
  ];
  totals.forEach((t, i) => {
    const x = 15 + i * (colW + 2);
    const isLast = i === 2;
    doc.setFillColor(isLast ? 25 : 241, isLast ? 96 : 247, isLast ? 165 : 252);
    doc.setDrawColor(...BRAND);
    doc.roundedRect(x, yy, colW, 22, 2, 2, isLast ? "F" : "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(isLast ? 255 : 80, isLast ? 255 : 80, isLast ? 255 : 80);
    doc.text(t.label, x + colW / 2, yy + 7, { align: "center" });
    doc.setFontSize(11);
    doc.text(t.value, x + colW / 2, yy + 17, { align: "center" });
  });
  yy += 30;

  // Big total box
  doc.setFillColor(...BRAND_DARK);
  doc.roundedRect(15, yy, 180, 22, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("TOTAL A PAGAR (PARTICULAR)", 22, yy + 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(formatCLP(totalPart), 188, yy + 16, { align: "right" });
  yy += 32;

  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(15, yy, 180, 12, 2, 2, "FD");
  doc.setTextColor(120, 75, 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const noteLines = doc.splitTextToSize(bloodSampleNote, 174);
  doc.text(noteLines, 18, yy + 7);
  yy += 18;

  doc.setTextColor(...BRAND_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("Indicaciones de preparación del paciente", 15, yy);
  yy += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text("Horario de toma de muestras:", 15, yy + 5);
  doc.setFont("helvetica", "normal");
  doc.text(`• ${scheduleInfo.weekdays}`, 15, yy + 11);
  doc.text(`• ${scheduleInfo.saturday}`, 15, yy + 17);
  yy += 23;

  for (const note of preparationNotes) {
    if (yy > 265) break;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    doc.text(`${note.title}:`, 15, yy);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(`• ${note.text}`, 180);
    doc.text(lines, 15, yy + 5);
    yy += 5 + lines.length * 4.5;
  }

  footer(doc);
  doc.save("Cotizacion_Laboratorio.pdf");
}
