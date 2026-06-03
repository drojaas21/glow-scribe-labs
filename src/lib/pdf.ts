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
  doc.rect(0, 0, 210, 34, "F");
  doc.setFillColor(...BRAND);
  doc.rect(0, 32, 210, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("DiagnoPRO Temuco", 15, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(title, 15, 26);
  const now = new Date();
  doc.setFontSize(9);
  doc.text(
    now.toLocaleDateString("es-CL") + "  " + now.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
    195, 16, { align: "right" }
  );
}

function patientBox(doc: jsPDF, y: number, name: string, rut: string) {
  doc.setDrawColor(...BRAND);
  doc.setFillColor(241, 247, 252);
  doc.roundedRect(15, y, 180, 22, 2, 2, "FD");
  doc.setTextColor(...BRAND_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("PACIENTE", 20, y + 8);
  doc.text("RUT", 120, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text(name || "No especificado", 20, y + 17);
  doc.text(rut || "No especificado", 120, y + 17);
  return y + 28;
}

function observationsBox(doc: jsPDF, y: number, text: string): number {
  if (!text.trim()) return y;
  doc.setDrawColor(...BRAND);
  doc.setFillColor(241, 247, 252);
  doc.setTextColor(...BRAND_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("OBSERVACIÓN", 15, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(text, 176);
  doc.setFillColor(241, 247, 252);
  doc.setDrawColor(...BRAND);
  doc.roundedRect(15, y, 180, lines.length * 6 + 8, 2, 2, "FD");
  doc.text(lines, 19, y + 7);
  return y + lines.length * 6 + 16;
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
    doc.rect(0, 0, 210, 14, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("DiagnoPRO Temuco · " + pageTitle, 15, 9);
    return 20;
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

  y = checkPage(doc, y, 26, "Preparaciones Requeridas");
  doc.setFillColor(...BRAND);
  doc.rect(15, y, 180, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("PREPARACIONES REQUERIDAS", 105, y + 7, { align: "center" });
  y += 14;

  for (const { name, steps, postProtocol } of preps) {
    const estH = 12 + steps.length * 6 + (postProtocol ? 16 : 0);
    y = checkPage(doc, y, estH, "Preparaciones Requeridas");

    doc.setFillColor(241, 247, 252);
    doc.setDrawColor(...BRAND);
    doc.roundedRect(15, y, 180, 10, 1, 1, "FD");
    doc.setTextColor(...BRAND_DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(name, 18, y + 7);
    y += 13;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    for (const step of steps) {
      y = checkPage(doc, y, 7, "Preparaciones Requeridas");
      const lines = doc.splitTextToSize(`• ${step}`, 172);
      doc.text(lines, 20, y);
      y += lines.length * 5.5;
    }

    if (postProtocol) {
      y = checkPage(doc, y, 18, "Preparaciones Requeridas");
      y += 2;
      const postLines = doc.splitTextToSize(`⚠  ${postProtocol}`, 166);
      doc.setFillColor(255, 251, 235);
      doc.setDrawColor(234, 179, 8);
      doc.roundedRect(15, y, 180, postLines.length * 5.5 + 9, 1, 1, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(120, 80, 0);
      doc.text(postLines, 19, y + 6);
      y += postLines.length * 5.5 + 13;
    }
    y += 4;
  }
  return y;
}

function labPrepSection(doc: jsPDF, y: number): number {
  y = checkPage(doc, y, 46, "Preparación de Laboratorio");
  doc.setFillColor(...BRAND);
  doc.rect(15, y, 180, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("PREPARACIÓN DE LABORATORIO", 105, y + 7, { align: "center" });
  y += 14;

  const steps = [
    "Ayuno mínimo 8 horas y máximo 12 horas (sólidos y líquidos). Última colación recomendada: 23:00 hrs del día anterior.",
    "Traer cédula de identidad y orden médica.",
    "Horario de toma de muestras: Lunes a viernes 08:00–12:00 hrs · Sábados 09:00–12:00 hrs.",
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  for (const step of steps) {
    const lines = doc.splitTextToSize(`• ${step}`, 172);
    doc.text(lines, 20, y);
    y += lines.length * 5.5 + 2;
  }
  return y + 4;
}

// ── Cotización Integral (Imagenología + Laboratorio) ─────────────────────────

export function generateCombinedPDF(args: {
  imagingItems: ExamCartPDFItem[];
  labItems: LabExam[];
  patientName: string;
  patientRut: string;
  previsionLabel: string;
  previsionKey: "particular" | "fa" | "fbcd";
  convenioLabel: string;
  imagingTotal: number;
  imagingDiscount: number;
  labTotal: number;
  grandTotal: number;
  observations: string;
}) {
  const doc = new jsPDF();
  header(doc, "Cotización de Exámenes");
  let y = patientBox(doc, 42, args.patientName, args.patientRut);

  // Info row: previsión + convenio
  doc.setFillColor(241, 247, 252);
  doc.setDrawColor(...BRAND);
  doc.roundedRect(15, y, 180, 14, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_DARK);
  doc.text("Previsión:", 20, y + 9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  doc.text(args.previsionLabel, 55, y + 9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND_DARK);
  doc.text("Convenio:", 115, y + 9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  doc.text(args.convenioLabel, 148, y + 9);
  y += 20;

  // ── Imagenología ──────────────────────────────────────────────────────────
  if (args.imagingItems.length > 0) {
    doc.setFillColor(...BRAND_DARK);
    doc.rect(15, y, 180, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("EXÁMENES DE IMAGENOLOGÍA", 105, y + 7, { align: "center" });
    y += 12;

    autoTable(doc, {
      startY: y,
      head: [["Examen", "Cant.", "Precio base", "Descuento", "Total a pagar"]],
      body: args.imagingItems.map((item) => [
        item.exam.name,
        String(item.qty),
        formatCLP(item.baseUnit),
        item.discountPct > 0 ? `−${item.discountPct}%` : "—",
        formatCLP(item.lineTotal),
      ]),
      theme: "striped",
      headStyles: { fillColor: BRAND, textColor: 255, fontStyle: "bold", fontSize: 10 },
      columnStyles: {
        1: { halign: "center", cellWidth: 18 },
        2: { halign: "right", cellWidth: 34 },
        3: { halign: "center", cellWidth: 24, textColor: [22, 163, 74] },
        4: { halign: "right", cellWidth: 34, fontStyle: "bold" },
      },
      styles: { fontSize: 10, cellPadding: 4 },
    });

    // @ts-expect-error lastAutoTable injected by plugin
    y = doc.lastAutoTable.finalY + 5;

    if (args.imagingDiscount > 0) {
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(34, 197, 94);
      doc.roundedRect(15, y, 180, 10, 1, 1, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(21, 128, 61);
      doc.text(`Ahorro por convenio ${args.convenioLabel}:  −${formatCLP(args.imagingDiscount)}`, 18, y + 7);
      y += 13;
    }

    doc.setFillColor(220, 235, 250);
    doc.roundedRect(15, y, 180, 12, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BRAND_DARK);
    doc.text("Subtotal Imagenología", 18, y + 8.5);
    doc.text(formatCLP(args.imagingTotal), 192, y + 8.5, { align: "right" });
    y += 18;
  }

  // ── Laboratorio ───────────────────────────────────────────────────────────
  if (args.labItems.length > 0) {
    y = checkPage(doc, y, 26, "Laboratorio");
    doc.setFillColor(...BRAND_DARK);
    doc.rect(15, y, 180, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("EXÁMENES DE LABORATORIO", 105, y + 7, { align: "center" });
    y += 12;

    const priceColLabel = args.previsionLabel.toUpperCase();

    autoTable(doc, {
      startY: y,
      head: [["Código", "Nombre del examen", `Precio ${priceColLabel}`]],
      body: args.labItems.map((e) => {
        const price =
          args.previsionKey === "fa" ? (e.fonasa_a ?? e.particular) :
          args.previsionKey === "fbcd" ? (e.fonasa_bcd ?? e.particular) :
          e.particular;
        return [
          e.code,
          e.name.replace(/\*PARTICULAR\*/gi, "").replace(/\s{2,}/g, " ").trim(),
          price > 0 ? formatCLP(price) : "Consultar",
        ];
      }),
      theme: "striped",
      headStyles: { fillColor: BRAND, textColor: 255, fontStyle: "bold", fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 28, fontStyle: "bold", textColor: BRAND_DARK, fontSize: 9 },
        2: { halign: "right", cellWidth: 40, fontStyle: "bold" },
      },
      styles: { fontSize: 10, cellPadding: 4 },
    });

    // @ts-expect-error lastAutoTable injected by plugin
    y = doc.lastAutoTable.finalY + 5;

    doc.setFillColor(220, 235, 250);
    doc.roundedRect(15, y, 180, 12, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BRAND_DARK);
    doc.text(`Subtotal Laboratorio (${args.previsionLabel})`, 18, y + 8.5);
    doc.text(formatCLP(args.labTotal), 192, y + 8.5, { align: "right" });
    y += 18;
  }

  // ── Total general ─────────────────────────────────────────────────────────
  y = checkPage(doc, y, 38, "Total General");
  doc.setFillColor(...BRAND_DARK);
  doc.roundedRect(15, y, 180, 28, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`TOTAL A PAGAR  (${args.previsionLabel})`, 22, y + 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text(formatCLP(args.grandTotal), 190, y + 22, { align: "right" });
  y += 38;

  y = observationsBox(doc, y, args.observations);
  if (args.imagingItems.length > 0) y = prepSectionImaging(doc, y, args.imagingItems);
  if (args.labItems.length > 0) labPrepSection(doc, y);

  footer(doc);
  doc.save("Cotizacion_DiagnoPRO.pdf");
}

// ── Indicaciones de Laboratorio PDF ──────────────────────────────────────────

export function generateLabIndicacionesPDF() {
  const doc = new jsPDF();

  // Header
  doc.setFillColor(...BRAND_DARK);
  doc.rect(0, 0, 210, 40, "F");
  doc.setFillColor(...BRAND);
  doc.rect(0, 38, 210, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("DiagnoPRO Temuco", 15, 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("Laboratorio Clínico · Indicaciones para Pacientes", 15, 28);

  const now = new Date();
  doc.setFontSize(9);
  doc.text(now.toLocaleDateString("es-CL"), 195, 17, { align: "right" });
  doc.text("Las Heras 453, esq. Av. Caupolican · Temuco", 195, 26, { align: "right" });
  doc.text("(045) 2887405 · 2887400", 195, 33, { align: "right" });

  let y = 54;

  // Welcome
  doc.setFillColor(241, 247, 252);
  doc.setDrawColor(...BRAND);
  doc.roundedRect(15, y, 180, 20, 3, 3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...BRAND_DARK);
  doc.text("Estimado/a Paciente", 105, y + 8, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text("Los exámenes de sangre se toman por orden de llegada.", 105, y + 15, { align: "center" });
  y += 28;

  // Horario section
  doc.setFillColor(...BRAND);
  doc.roundedRect(15, y, 180, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("HORARIO DE ATENCIÓN", 105, y + 7, { align: "center" });
  y += 14;

  doc.setFillColor(248, 250, 255);
  doc.setDrawColor(200, 215, 240);
  doc.roundedRect(15, y, 85, 24, 2, 2, "FD");
  doc.roundedRect(110, y, 85, 24, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_DARK);
  doc.text("Lunes a Viernes", 57.5, y + 8, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text("08:00 – 10:30 hrs", 57.5, y + 18, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_DARK);
  doc.text("Sábados", 152.5, y + 8, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text("09:00 – 10:30 hrs", 152.5, y + 18, { align: "center" });
  y += 32;

  // Ayuno section
  doc.setFillColor(...BRAND);
  doc.roundedRect(15, y, 180, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("AYUNO REQUERIDO", 105, y + 7, { align: "center" });
  y += 14;

  doc.setFillColor(241, 247, 252);
  doc.setDrawColor(...BRAND);
  doc.roundedRect(15, y, 180, 22, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_DARK);
  doc.text("Mínimo 8 horas · Máximo 12 horas", 105, y + 8, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const ayunoText = "El paciente debe venir con un mínimo de 08 horas de ayuno y máximo de 12 horas (no más de 12 horas para no alterar las muestras).";
  const ayunoLines = doc.splitTextToSize(ayunoText, 170);
  doc.text(ayunoLines, 105, y + 16, { align: "center" });
  y += 30;

  // Warning box
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(234, 179, 8);
  doc.roundedRect(15, y, 180, 26, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(120, 80, 0);
  doc.text("⚠  IMPORTANTE", 20, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const warnText = "Si se excede el tiempo de ayuno recomendado, los resultados podrían verse afectados, lo que puede llevar a diagnósticos incorrectos o a la necesidad de repetir la prueba.";
  const warnLines = doc.splitTextToSize(warnText, 170);
  doc.text(warnLines, 20, y + 15);
  y += 32;

  // Tip box
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(34, 197, 94);
  doc.roundedRect(15, y, 180, 14, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(21, 128, 61);
  doc.text("✓  Recomendación:", 20, y + 6);
  doc.setFont("helvetica", "normal");
  doc.text("Para no exceder el ayuno, realice su última colación a las 23:00 hrs del día anterior.", 20, y + 12);
  y += 22;

  // Indicaciones específicas
  doc.setFillColor(...BRAND);
  doc.roundedRect(15, y, 180, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("INDICACIONES ESPECÍFICAS", 105, y + 7, { align: "center" });
  y += 14;

  const specifics = [
    {
      icon: "🧪",
      title: "Examen de Orina",
      body: "Recolectar la primera orina de la mañana (segundo chorro). Una vez recolectada la muestra, debe ser ingresada al laboratorio en un plazo máximo de 2 horas.",
    },
    {
      icon: "🔬",
      title: "Examen de Antígeno Prostático (PSA)",
      body: "El paciente debe tener abstinencia sexual de 48 horas antes del examen.",
    },
  ];

  for (const s of specifics) {
    doc.setFillColor(248, 250, 255);
    doc.setDrawColor(200, 215, 240);
    const bodyLines = doc.splitTextToSize(s.body, 155);
    const boxH = 14 + bodyLines.length * 5.5;
    doc.roundedRect(15, y, 180, boxH, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BRAND_DARK);
    doc.text(`${s.icon}  ${s.title}`, 20, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(bodyLines, 22, y + 14);
    y += boxH + 5;
  }

  // Documentos requeridos
  doc.setFillColor(...BRAND);
  doc.roundedRect(15, y, 180, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("DOCUMENTOS REQUERIDOS", 105, y + 7, { align: "center" });
  y += 14;

  doc.setFillColor(241, 247, 252);
  doc.setDrawColor(...BRAND);
  doc.roundedRect(15, y, 180, 18, 2, 2, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text("• Cédula de identidad vigente", 22, y + 7);
  doc.text("• Orden médica del examen solicitado", 22, y + 14);
  y += 26;

  // Footer
  doc.setFillColor(...BRAND_DARK);
  doc.rect(0, 275, 210, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("DiagnoPRO Temuco", 105, 283, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("www.diagnopro.cl  ·  Las Heras 453, esq. Av. Caupolican  ·  (045) 2887405 – 2887400  ·  contacto@diagnopro.cl", 105, 290, { align: "center" });

  doc.save("Indicaciones_Laboratorio_DiagnoPRO.pdf");
}

// ── Keep legacy exports for backwards compatibility ──────────────────────────

export function generateExamPDF(args: {
  items: ExamCartPDFItem[];
  convenio: Convenio;
  prevision: string;
  grandTotal: number;
  patientName: string;
  patientRut: string;
  observations: string;
}) {
  generateCombinedPDF({
    imagingItems: args.items,
    labItems: [],
    patientName: args.patientName,
    patientRut: args.patientRut,
    previsionLabel: args.prevision,
    previsionKey: "particular",
    convenioLabel: convenioMeta[args.convenio],
    imagingTotal: args.grandTotal,
    imagingDiscount: args.items.reduce((s, it) => s + it.discountAmt, 0),
    labTotal: 0,
    grandTotal: args.grandTotal,
    observations: args.observations,
  });
}

export function generateLabPDF(args: {
  items: LabExam[];
  prevision: string;
  selectedTotal: number;
  patientName: string;
  patientRut: string;
  observations: string;
}) {
  const previsionKey =
    args.prevision === "FONASA A" ? "fa" :
    args.prevision.includes("B") ? "fbcd" : "particular";
  generateCombinedPDF({
    imagingItems: [],
    labItems: args.items,
    patientName: args.patientName,
    patientRut: args.patientRut,
    previsionLabel: args.prevision,
    previsionKey,
    convenioLabel: "Particular / Sin Convenio",
    imagingTotal: 0,
    imagingDiscount: 0,
    labTotal: args.selectedTotal,
    grandTotal: args.selectedTotal,
    observations: args.observations,
  });
}
