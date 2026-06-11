import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCLP } from "./format";
import { getImagingPrepNote, hasContrastPostProtocol } from "@/data/imagingPrep";
import type { Exam, ExamCategory, Convenio, LabExam } from "@/data/catalog";
import { convenioMeta } from "@/data/catalog";

const BRAND: [number, number, number] = [25, 96, 165];
const BRAND_DARK: [number, number, number] = [20, 54, 93];
const GRAY_LIGHT: [number, number, number] = [245, 246, 248];
const GRAY_MID: [number, number, number] = [200, 205, 215];
const GRAY_TEXT: [number, number, number] = [80, 80, 80];
const BLACK: [number, number, number] = [20, 20, 20];

// ── Page helper ────────────────────────────────────────────────────────────────

function checkPage(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 274) {
    doc.addPage();
    return 18;
  }
  return y;
}

// ── Divider line ───────────────────────────────────────────────────────────────

function hline(doc: jsPDF, y: number, x1 = 15, x2 = 195, r = 150, g = 155, b = 165) {
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(0.3);
  doc.line(x1, y, x2, y);
}

// ── PDF Types ──────────────────────────────────────────────────────────────────

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

export type GenerateCombinedPDFArgs = {
  imagingItems: ExamCartPDFItem[];
  labItems: Array<{ exam: LabExam; qty: number }>;
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
};

// ── Main PDF ───────────────────────────────────────────────────────────────────

export function generateCombinedPDF(args: GenerateCombinedPDFArgs) {
  const doc = new jsPDF();
  const now = new Date();
  const dateStr = now.toLocaleDateString("es-CL");

  // ── Header ────────────────────────────────────────────────────────────────
  // Left: company
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...BRAND_DARK);
  doc.text("DiagnoPRO Temuco", 15, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY_TEXT);
  doc.text("Las Heras 453 esq. Av. Caupolican · Temuco", 15, 27);
  doc.text("(045) 2887405 · 2887400 · contacto@diagnopro.cl", 15, 33);

  // Right: quote info
  const labelX = 132;
  const valueX = 165;
  const rows: [string, string][] = [
    ["COTIZACIÓN", dateStr],
    ["FECHA:", dateStr],
    ["PACIENTE:", args.patientName || "No especificado"],
    ["RUT:", args.patientRut || "—"],
    ["PREVISIÓN:", args.previsionLabel],
  ];
  if (args.convenioLabel !== "Particular / Sin Convenio") {
    rows.push(["CONVENIO:", args.convenioLabel]);
  }

  let ry = 16;
  // "COTIZACIÓN" big label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...BRAND);
  doc.text("COTIZACIÓN", 195, ry, { align: "right" });
  ry += 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY_TEXT);
  for (const [label, value] of rows.slice(1)) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GRAY_TEXT);
    doc.text(label, labelX, ry);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BLACK);
    doc.text(value, 195, ry, { align: "right" });
    ry += 5.5;
  }

  hline(doc, 39, 15, 195, ...BRAND);
  let y = 44;

  // ── Imaging table ──────────────────────────────────────────────────────────
  if (args.imagingItems.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND_DARK);
    doc.text("EXÁMENES DE IMAGENOLOGÍA", 15, y);
    y += 4;

    const body = args.imagingItems.map((item) => [
      item.exam.name,
      String(item.qty),
      formatCLP(item.baseUnit),
      item.discountPct > 0 ? `−${item.discountPct}%` : "",
      formatCLP(item.lineTotal),
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Examen", "Cant.", "Precio unitario", "Descuento", "Total"]],
      body,
      foot: args.imagingDiscount > 0
        ? [["", "", "", "Ahorro convenio:", `−${formatCLP(args.imagingDiscount)}`]]
        : undefined,
      theme: "grid",
      headStyles: {
        fillColor: BRAND,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
        cellPadding: 3,
      },
      bodyStyles: { fontSize: 8.5, cellPadding: 3, textColor: BLACK },
      alternateRowStyles: { fillColor: GRAY_LIGHT },
      footStyles: {
        fillColor: [240, 253, 244],
        textColor: [21, 128, 61] as [number, number, number],
        fontStyle: "bold",
        fontSize: 8,
        cellPadding: 2.5,
      },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { halign: "center", cellWidth: 16 },
        2: { halign: "right", cellWidth: 34 },
        3: { halign: "center", cellWidth: 24 },
        4: { halign: "right", cellWidth: 32, fontStyle: "bold" },
      },
      styles: { lineColor: GRAY_MID, lineWidth: 0.25 },
    });

    // @ts-expect-error lastAutoTable injected by plugin
    y = doc.lastAutoTable.finalY;

    // Subtotal row
    doc.setFillColor(...GRAY_LIGHT);
    doc.setDrawColor(...GRAY_MID);
    doc.setLineWidth(0.25);
    doc.rect(15, y, 180, 9, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_DARK);
    doc.text("Subtotal Imagenología", 20, y + 6.2);
    doc.text(formatCLP(args.imagingTotal), 192, y + 6.2, { align: "right" });
    y += 14;
  }

  // ── Lab table ──────────────────────────────────────────────────────────────
  if (args.labItems.length > 0) {
    y = checkPage(doc, y, 22);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND_DARK);
    doc.text("EXÁMENES DE LABORATORIO", 15, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [["Código", "Nombre del examen", "Cant.", `Precio ${args.previsionLabel}`]],
      body: args.labItems.map(({ exam: e, qty }) => {
        const unitPrice =
          args.previsionKey === "fa" ? (e.fonasa_a ?? e.particular) :
          args.previsionKey === "fbcd" ? (e.fonasa_bcd ?? e.particular) :
          e.particular;
        return [
          e.code,
          e.name.replace(/\*PARTICULAR\*/gi, "").replace(/\s{2,}/g, " ").trim(),
          String(qty),
          unitPrice * qty > 0 ? formatCLP(unitPrice * qty) : "Consultar",
        ];
      }),
      theme: "grid",
      headStyles: {
        fillColor: BRAND,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
        cellPadding: 3,
      },
      bodyStyles: { fontSize: 8.5, cellPadding: 3, textColor: BLACK },
      alternateRowStyles: { fillColor: GRAY_LIGHT },
      columnStyles: {
        0: { cellWidth: 24, fontStyle: "bold", fontSize: 7.5 },
        2: { halign: "center", cellWidth: 16 },
        3: { halign: "right", cellWidth: 36, fontStyle: "bold" },
      },
      styles: { lineColor: GRAY_MID, lineWidth: 0.25 },
    });

    // @ts-expect-error lastAutoTable injected by plugin
    y = doc.lastAutoTable.finalY;

    doc.setFillColor(...GRAY_LIGHT);
    doc.setDrawColor(...GRAY_MID);
    doc.setLineWidth(0.25);
    doc.rect(15, y, 180, 9, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_DARK);
    doc.text(`Subtotal Laboratorio (${args.previsionLabel})`, 20, y + 6.2);
    doc.text(formatCLP(args.labTotal), 192, y + 6.2, { align: "right" });
    y += 14;
  }

  // ── Grand total ────────────────────────────────────────────────────────────
  y = checkPage(doc, y, 22);
  doc.setFillColor(...BRAND_DARK);
  doc.setDrawColor(...BRAND_DARK);
  doc.rect(105, y, 90, 13, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`TOTAL (${args.previsionLabel})`, 110, y + 5.5);
  doc.setFontSize(13);
  doc.text(formatCLP(args.grandTotal), 192, y + 10, { align: "right" });
  y += 20;

  // ── Observations ──────────────────────────────────────────────────────────
  if (args.observations.trim()) {
    y = checkPage(doc, y, 12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY_TEXT);
    doc.text("OBSERVACIONES:", 15, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BLACK);
    const lines = doc.splitTextToSize(args.observations, 155);
    doc.text(lines, 53, y);
    y += lines.length * 5 + 6;
  }

  // ── Preparation ───────────────────────────────────────────────────────────
  const prepRows = buildImagingPrepRows(args.imagingItems);
  const labPrepRows = buildLabPrepRows(args.labItems);
  const hasContrast = args.imagingItems.some((it) => hasContrastPostProtocol(it.category));
  const hasPrepData = prepRows.length > 0 || labPrepRows.length > 0;

  if (hasPrepData) {
    y = checkPage(doc, y, 20);
    hline(doc, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND_DARK);
    doc.text("PREPARACIÓN DEL PACIENTE", 15, y);
    y += 5;

    if (prepRows.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["Examen", "Indicaciones previas"]],
        body: prepRows,
        theme: "grid",
        headStyles: { fillColor: [230, 237, 248], textColor: BRAND_DARK, fontStyle: "bold", fontSize: 8, cellPadding: 2.5 },
        bodyStyles: { fontSize: 8, cellPadding: 2.5, textColor: GRAY_TEXT },
        alternateRowStyles: { fillColor: [250, 251, 254] },
        columnStyles: {
          0: { cellWidth: 60, fontStyle: "bold", textColor: BLACK },
          1: {},
        },
        styles: { lineColor: [215, 220, 230], lineWidth: 0.2 },
      });
      // @ts-expect-error lastAutoTable injected by plugin
      y = doc.lastAutoTable.finalY + 3;
    }

    if (labPrepRows.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["Examen de laboratorio", "Indicaciones"]],
        body: labPrepRows,
        theme: "grid",
        headStyles: { fillColor: [230, 237, 248], textColor: BRAND_DARK, fontStyle: "bold", fontSize: 8, cellPadding: 2.5 },
        bodyStyles: { fontSize: 8, cellPadding: 2.5, textColor: GRAY_TEXT },
        alternateRowStyles: { fillColor: [250, 251, 254] },
        columnStyles: {
          0: { cellWidth: 60, fontStyle: "bold", textColor: BLACK },
          1: {},
        },
        styles: { lineColor: [215, 220, 230], lineWidth: 0.2 },
      });
      // @ts-expect-error lastAutoTable injected by plugin
      y = doc.lastAutoTable.finalY + 3;
    }

    if (hasContrast) {
      y = checkPage(doc, y, 10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(130, 90, 10);
      doc.text("Post-contraste: ", 15, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY_TEXT);
      const cLines = doc.splitTextToSize(
        "Hidratarse con ≥2 L de agua/día durante 2–3 días. Si usa Metformina, consulte a su médico. Ante dificultad respiratoria, hinchazón facial o urticaria, consulte de inmediato.",
        168
      );
      doc.text(cLines, 44, y);
      y += cLines.length * 4.5 + 4;
    }

    // universal note
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    if (args.labItems.length > 0) {
      doc.text("Lab · Toma de muestras: Lun–Vie 08:00–12:00 · Sáb 09:00–12:00", 15, y);
      y += 5;
    }
    doc.text("Para todos los exámenes: traer cédula de identidad y orden médica · Llegar 15 min antes de su hora.", 15, y);
    y += 5;
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    hline(doc, 284, 15, 195, 180, 185, 195);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(170, 170, 170);
    doc.text("Cotización referencial sujeta a confirmación · Valores pueden variar según indicación médica · DiagnoPRO Temuco", 105, 289, { align: "center" });
    if (pageCount > 1) {
      doc.text(`Pág. ${i} / ${pageCount}`, 195, 289, { align: "right" });
    }
  }

  doc.save("Cotizacion_DiagnoPRO.pdf");
}

// ── Helpers for prep rows ──────────────────────────────────────────────────────

function buildImagingPrepRows(items: ExamCartPDFItem[]): [string, string][] {
  const seen = new Set<string>();
  const rows: [string, string][] = [];
  for (const item of items) {
    const key = `${item.category}::${item.exam.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const note = getImagingPrepNote(item.exam.name, item.category);
    if (note) rows.push([item.exam.name, note]);
  }
  return rows;
}

function buildLabPrepRows(labItems: Array<{ exam: LabExam; qty: number }>): [string, string][] {
  const prepLabels: Record<string, string> = {
    orina_manana: "Primera orina de la mañana (segundo chorro). Ingresar al laboratorio en máximo 2 horas.",
    orina_24h: "Recolección de orina de 24 horas. Desechar la primera micción; guardar el resto en el envase provisto.",
    psa: "Abstinencia sexual de 48 horas previas.",
  };
  const rows: [string, string][] = [];
  for (const { exam } of labItems) {
    const notes: string[] = [];
    if (exam.fasting) notes.push("Ayuno mínimo 8 horas, máximo 12 horas.");
    if (exam.prep && prepLabels[exam.prep]) notes.push(prepLabels[exam.prep]);
    if (notes.length > 0) {
      const cleanName = exam.name.replace(/\*PARTICULAR\*/gi, "").replace(/\s{2,}/g, " ").trim();
      rows.push([cleanName, notes.join(" ")]);
    }
  }
  return rows;
}

// ── Indicaciones de Laboratorio PDF ───────────────────────────────────────────

export function generateLabIndicacionesPDF() {
  const doc = new jsPDF();
  const now = new Date();

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...BRAND_DARK);
  doc.text("DiagnoPRO Temuco", 15, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_TEXT);
  doc.text("Laboratorio Clínico · Indicaciones para Pacientes", 15, 26);
  doc.setFontSize(8);
  doc.text(now.toLocaleDateString("es-CL"), 195, 18, { align: "right" });
  doc.text("Las Heras 453, esq. Av. Caupolican · Temuco", 195, 24, { align: "right" });
  doc.text("(045) 2887405 · 2887400", 195, 30, { align: "right" });

  hline(doc, 34, 15, 195, ...BRAND);
  let y = 42;

  // Horario
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND_DARK);
  doc.text("HORARIO DE TOMA DE MUESTRAS", 15, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [["Día", "Horario"]],
    body: [
      ["Lunes a Viernes", "08:00 – 10:30 hrs"],
      ["Sábados", "09:00 – 10:30 hrs"],
    ],
    theme: "grid",
    headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9, cellPadding: 3 },
    bodyStyles: { fontSize: 10, cellPadding: 4, textColor: BLACK },
    columnStyles: { 0: { cellWidth: 80 }, 1: { fontStyle: "bold" } },
    styles: { lineColor: GRAY_MID, lineWidth: 0.25 },
    tableWidth: 100,
  });

  // @ts-expect-error lastAutoTable injected by plugin
  y = doc.lastAutoTable.finalY + 10;

  // Ayuno
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND_DARK);
  doc.text("AYUNO REQUERIDO", 15, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    body: [
      ["Mínimo", "8 horas"],
      ["Máximo", "12 horas (no exceder)"],
      ["Última colación recomendada", "23:00 hrs del día anterior"],
    ],
    theme: "grid",
    bodyStyles: { fontSize: 9.5, cellPadding: 3.5, textColor: BLACK },
    columnStyles: { 0: { cellWidth: 80, fontStyle: "bold", textColor: BRAND_DARK } },
    styles: { lineColor: GRAY_MID, lineWidth: 0.25 },
    tableWidth: 130,
  });

  // @ts-expect-error lastAutoTable injected by plugin
  y = doc.lastAutoTable.finalY + 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY_TEXT);
  const warnLines = doc.splitTextToSize(
    "No exceder las 12 horas de ayuno. Si esto ocurre, los resultados pueden verse alterados y podría ser necesario repetir el examen.",
    175
  );
  doc.text(warnLines, 15, y);
  y += warnLines.length * 5 + 8;

  // Indicaciones específicas
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND_DARK);
  doc.text("INDICACIONES ESPECÍFICAS", 15, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [["Examen", "Indicación"]],
    body: [
      ["Examen de Orina", "Recolectar la primera orina de la mañana (segundo chorro). Ingresar al laboratorio en máximo 2 horas."],
      ["Antígeno Prostático (PSA)", "Abstinencia sexual de 48 horas previas al examen."],
    ],
    theme: "grid",
    headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9, cellPadding: 3 },
    bodyStyles: { fontSize: 9, cellPadding: 3.5, textColor: BLACK },
    columnStyles: { 0: { cellWidth: 70, fontStyle: "bold" } },
    styles: { lineColor: GRAY_MID, lineWidth: 0.25 },
  });

  // @ts-expect-error lastAutoTable injected by plugin
  y = doc.lastAutoTable.finalY + 10;

  // Documentos
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND_DARK);
  doc.text("DOCUMENTOS REQUERIDOS", 15, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    body: [
      ["Cédula de identidad vigente"],
      ["Orden médica del examen solicitado"],
    ],
    theme: "grid",
    bodyStyles: { fontSize: 9.5, cellPadding: 3.5, textColor: BLACK },
    styles: { lineColor: GRAY_MID, lineWidth: 0.25 },
    tableWidth: 120,
  });

  // @ts-expect-error lastAutoTable injected by plugin
  y = doc.lastAutoTable.finalY + 10;

  hline(doc, y, 15, 195, 180, 185, 195);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(160, 160, 160);
  doc.text("DiagnoPRO Temuco · www.diagnopro.cl · Las Heras 453, esq. Av. Caupolican · (045) 2887405 – 2887400", 105, y, { align: "center" });

  doc.save("Indicaciones_Laboratorio_DiagnoPRO.pdf");
}

// ── Legacy exports ─────────────────────────────────────────────────────────────

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
    labItems: args.items.map((exam) => ({ exam, qty: 1 })),
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
