import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCLP } from "./format";
import { getImagingPrep } from "@/data/imagingPrep";
import type { Exam, ExamCategory, Convenio, LabExam } from "@/data/catalog";
import { categoryMeta, convenioMeta } from "@/data/catalog";

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

function observationsBox(doc: jsPDF, y: number, text: string): number {
  if (!text.trim()) return y;
  doc.setDrawColor(...BRAND);
  doc.setFillColor(241, 247, 252);
  doc.setTextColor(...BRAND_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("OBSERVACIÓN", 15, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  const lines = doc.splitTextToSize(text, 180);
  doc.setFillColor(241, 247, 252);
  doc.setDrawColor(...BRAND);
  doc.roundedRect(15, y, 180, lines.length * 5 + 6, 2, 2, "FD");
  doc.text(lines, 19, y + 5);
  return y + lines.length * 5 + 12;
}

function footer(doc: jsPDF) {
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text(
    "Cotización referencial sujeta a confirmación. Los valores pueden variar según indicación médica.",
    105, 288, { align: "center" }
  );
}

// ── Imagenología PDF ────────────────────────────────────────────────────────

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

// ── Page / section helpers ────────────────────────────────────────────────────

function checkPage(doc: jsPDF, y: number, needed: number, pageTitle: string): number {
  if (y + needed > 276) {
    doc.addPage();
    doc.setFillColor(...BRAND_DARK);
    doc.rect(0, 0, 210, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("DiagnoPRO Temuco · " + pageTitle, 15, 8);
    return 18;
  }
  return y;
}

function prepSectionImaging(doc: jsPDF, y: number, items: ExamCartPDFItem[]): number {
  const seen = new Set<string>();
  const preps: { name: string; steps: string[]; postProtocol?: string }[] = [];
  for (const item of items) {
    const key = `${item.category}::${item.exam.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const p = getImagingPrep(item.exam.name, item.category);
    preps.push({ name: item.exam.name, steps: p.steps, postProtocol: p.postProtocol });
  }
  if (preps.length === 0) return y;

  y = checkPage(doc, y, 22, "Preparaciones Requeridas");
  doc.setFillColor(...BRAND);
  doc.rect(15, y, 180, 9, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("PREPARACIONES REQUERIDAS", 105, y + 6, { align: "center" });
  y += 13;

  for (const { name, steps, postProtocol } of preps) {
    const estH = 10 + steps.length * 5 + (postProtocol ? 14 : 0);
    y = checkPage(doc, y, estH, "Preparaciones Requeridas");

    doc.setFillColor(241, 247, 252);
    doc.setDrawColor(...BRAND);
    doc.roundedRect(15, y, 180, 8, 1, 1, "FD");
    doc.setTextColor(...BRAND_DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(name, 18, y + 5.5);
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(40, 40, 40);
    for (const step of steps) {
      y = checkPage(doc, y, 6, "Preparaciones Requeridas");
      const lines = doc.splitTextToSize(`• ${step}`, 172);
      doc.text(lines, 20, y);
      y += lines.length * 4.5;
    }

    if (postProtocol) {
      y = checkPage(doc, y, 16, "Preparaciones Requeridas");
      y += 2;
      const postLines = doc.splitTextToSize(`⚠  ${postProtocol}`, 166);
      doc.setFillColor(255, 251, 235);
      doc.setDrawColor(234, 179, 8);
      doc.roundedRect(15, y, 180, postLines.length * 4.5 + 7, 1, 1, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(120, 80, 0);
      doc.text(postLines, 19, y + 4.5);
      y += postLines.length * 4.5 + 11;
    }
    y += 4;
  }
  return y;
}

function labPrepSection(doc: jsPDF, y: number): number {
  y = checkPage(doc, y, 38, "Preparación de Laboratorio");
  doc.setFillColor(...BRAND);
  doc.rect(15, y, 180, 9, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("PREPARACIÓN DE LABORATORIO", 105, y + 6, { align: "center" });
  y += 13;

  const steps = [
    "Ayuno mínimo 8 horas y máximo 12 horas (sólidos y líquidos). Última colación recomendada: 23:00 hrs del día anterior.",
    "Traer cédula de identidad y orden médica.",
    "Horario de toma de muestras: Lunes a viernes 08:00–12:00 hrs · Sábados 09:00–12:00 hrs.",
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(40, 40, 40);
  for (const step of steps) {
    const lines = doc.splitTextToSize(`• ${step}`, 172);
    doc.text(lines, 20, y);
    y += lines.length * 4.5 + 1;
  }
  return y + 4;
}

export function generateExamPDF(args: {
  items: ExamCartPDFItem[];
  convenio: Convenio;
  prevision: string;
  grandTotal: number;
  patientName: string;
  patientRut: string;
  observations: string;
}) {
  const doc = new jsPDF();
  header(doc, "Cotización de Exámenes de Imagenología");
  let y = patientBox(doc, 38, args.patientName, args.patientRut);

  // Info row: previsión + convenio
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

  y = observationsBox(doc, y, args.observations);
  prepSectionImaging(doc, y, args.items);

  footer(doc);
  const firstName = args.items[0]?.exam.name.slice(0, 20).replace(/[^a-zA-Z0-9]/g, "_") ?? "Examen";
  doc.save(`Cotizacion_${firstName}.pdf`);
}

// ── Laboratorio PDF ────────────────────────────────────────────────────────

export function generateLabPDF(args: {
  items: LabExam[];
  prevision: string;
  selectedTotal: number;
  patientName: string;
  patientRut: string;
  observations: string;
}) {
  const doc = new jsPDF();
  header(doc, "Cotización de Exámenes de Laboratorio");
  let y = patientBox(doc, 38, args.patientName, args.patientRut);

  // Info row: previsión
  doc.setFillColor(241, 247, 252);
  doc.setDrawColor(...BRAND);
  doc.roundedRect(15, y, 180, 12, 2, 2, "FD");
  doc.setTextColor(...BRAND_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Previsión:", 20, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  doc.text(args.prevision, 48, y + 8);
  y += 18;

  const totalFonasaA = args.items.reduce((s, e) => s + (e.fonasa_a ?? e.particular), 0);
  const totalFonasaBcd = args.items.reduce((s, e) => s + (e.fonasa_bcd ?? e.particular), 0);
  const totalPart = args.items.reduce((s, e) => s + e.particular, 0);

  autoTable(doc, {
    startY: y,
    head: [["Código", "Examen", "FONASA A", "FONASA B/C/D", "Particular"]],
    body: args.items.map((e) => [
      e.code,
      e.name,
      e.fonasa_a != null ? formatCLP(e.fonasa_a) : "—",
      e.fonasa_bcd != null ? formatCLP(e.fonasa_bcd) : "—",
      e.particular > 0 ? formatCLP(e.particular) : "Consultar",
    ]),
    theme: "striped",
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 24, fontStyle: "bold", textColor: BRAND_DARK },
      2: { halign: "right", cellWidth: 28 },
      3: { halign: "right", cellWidth: 28 },
      4: { halign: "right", cellWidth: 28 },
    },
    styles: { fontSize: 8, cellPadding: 2.5 },
  });

  // @ts-expect-error lastAutoTable injected by plugin
  let yy = doc.lastAutoTable.finalY + 8;

  // Three reference totals
  const colW = 58;
  const totals = [
    { label: "FONASA A", value: formatCLP(totalFonasaA) },
    { label: "FONASA B/C/D", value: formatCLP(totalFonasaBcd) },
    { label: "PARTICULAR", value: formatCLP(totalPart) },
  ];
  totals.forEach((t, i) => {
    const x = 15 + i * (colW + 2);
    doc.setFillColor(241, 247, 252);
    doc.setDrawColor(...BRAND);
    doc.roundedRect(x, yy, colW, 22, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text(t.label, x + colW / 2, yy + 7, { align: "center" });
    doc.setFontSize(11);
    doc.text(t.value, x + colW / 2, yy + 17, { align: "center" });
  });
  yy += 30;

  // Big total box — shows selected prevision total
  doc.setFillColor(...BRAND_DARK);
  doc.roundedRect(15, yy, 180, 22, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`TOTAL A PAGAR (${args.prevision.toUpperCase()})`, 22, yy + 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(formatCLP(args.selectedTotal), 188, yy + 16, { align: "right" });
  yy += 32;

  yy = observationsBox(doc, yy, args.observations);
  labPrepSection(doc, yy);

  footer(doc);
  doc.save("Cotizacion_Laboratorio.pdf");
}
