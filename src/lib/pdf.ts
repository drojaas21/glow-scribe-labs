import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCLP } from "./format";
import { getImagingPrepNote, hasContrastPostProtocol } from "@/data/imagingPrep";
import type { Exam, ExamCategory, Convenio, LabExam } from "@/data/catalog";
import { categoryMeta, convenioMeta } from "@/data/catalog";

// ── Palette ────────────────────────────────────────────────────────────────────
const BRAND:      [number,number,number] = [25,  96,  165];
const BRAND_DARK: [number,number,number] = [20,  54,   93];
const GRAY_LIGHT: [number,number,number] = [245,246,  248];
const GRAY_MID:   [number,number,number] = [200,205,  215];
const GRAY_TEXT:  [number,number,number] = [90,  90,   90];
const BLACK:      [number,number,number] = [20,  20,   20];

// ── PDF types ──────────────────────────────────────────────────────────────────
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

// ── Utilities ──────────────────────────────────────────────────────────────────

function hline(doc: jsPDF, y: number, color: [number,number,number] = GRAY_MID, lw = 0.3) {
  doc.setDrawColor(...color);
  doc.setLineWidth(lw);
  doc.line(15, y, 195, y);
}

/** Returns new y, adds a page if needed with a minimal continuation header. */
function checkPage(doc: jsPDF, y: number, needed: number, title = ""): number {
  if (y + needed > 274) {
    doc.addPage();
    if (title) {
      doc.setFillColor(...BRAND_DARK);
      doc.rect(0, 0, 210, 11, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text(`DiagnoPRO Temuco · ${title}`, 15, 7.5);
      return 17;
    }
    return 14;
  }
  return y;
}

function sectionLabel(doc: jsPDF, y: number, text: string): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND_DARK);
  doc.text(text, 15, y);
  return y + 4;
}

function subtotalBar(doc: jsPDF, y: number, label: string, amount: number): number {
  // Draw on top of the table bottom border intentionally — same line color so it seals cleanly
  doc.setFillColor(...GRAY_LIGHT);
  doc.setDrawColor(...GRAY_MID);
  doc.setLineWidth(0.3);
  doc.rect(15, y, 180, 9, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND_DARK);
  doc.text(label, 20, y + 6.3);
  doc.text(formatCLP(amount), 192, y + 6.3, { align: "right" });
  return y + 13;
}

// ── Main cotización PDF ────────────────────────────────────────────────────────

export function generateCombinedPDF(args: GenerateCombinedPDFArgs) {
  const doc = new jsPDF();
  const dateStr = new Date().toLocaleDateString("es-CL");

  // ── Header ──────────────────────────────────────────────────────────────────
  // Left column — company identity
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...BRAND_DARK);
  doc.text("DiagnoPRO Temuco", 15, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY_TEXT);
  doc.text("Las Heras 453 esq. Av. Caupolican, Temuco", 15, 25);
  doc.text("(045) 2887405 · 2887400 · contacto@diagnopro.cl", 15, 30.5);

  // Right column — quote meta (right-aligned pairs)
  const infoRows: [string, string][] = [
    ["Fecha:",     dateStr],
    ["Paciente:",  args.patientName  || "No especificado"],
    ["RUT:",       args.patientRut   || "—"],
    ["Previsión:", args.previsionLabel],
  ];
  if (args.convenioLabel !== "Particular / Sin Convenio") {
    infoRows.push(["Convenio:", args.convenioLabel]);
  }

  // "COTIZACIÓN" heading top-right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BRAND);
  doc.text("COTIZACIÓN", 195, 18, { align: "right" });

  let ry = 24.5;
  for (const [lbl, val] of infoRows) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY_TEXT);
    doc.text(lbl, 155, ry);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BLACK);
    doc.text(val, 195, ry, { align: "right" });
    ry += 5;
  }

  // Separator line — drawn after last info row, not at a fixed y
  const lineY = ry + 2;
  hline(doc, lineY, BRAND, 0.5);
  let y = lineY + 5;

  // ── Imagenología table ───────────────────────────────────────────────────────
  if (args.imagingItems.length > 0) {
    y = sectionLabel(doc, y, "EXÁMENES DE IMAGENOLOGÍA");

    const hasDiscount = args.imagingItems.some((it) => it.discountPct > 0);

    const head = hasDiscount
      ? [["Cat.", "Examen", "Cant.", "Precio", "Desc.", "Total"]]
      : [["Cat.", "Examen", "Cant.", "Precio unitario", "Total"]];

    const body = args.imagingItems.map((it) => {
      const catLabel = categoryMeta[it.category]?.short ?? it.category.toUpperCase();
      const baseRow: string[] = [
        catLabel,
        it.exam.name,
        String(it.qty),
        formatCLP(it.baseUnit),
      ];
      if (hasDiscount) baseRow.push(it.discountPct > 0 ? `−${it.discountPct}%` : "");
      baseRow.push(formatCLP(it.lineTotal));
      return baseRow;
    });

    autoTable(doc, {
      startY: y,
      head,
      body,
      theme: "grid",
      headStyles: { fillColor: BRAND, textColor: [255,255,255], fontStyle: "bold", fontSize: 8.5, cellPadding: 3 },
      bodyStyles: { fontSize: 8.5, cellPadding: 3, textColor: BLACK },
      alternateRowStyles: { fillColor: GRAY_LIGHT },
      columnStyles: hasDiscount ? {
        0: { cellWidth: 18, fontStyle: "bold", textColor: BRAND_DARK, fontSize: 7.5 },
        2: { halign: "center", cellWidth: 14 },
        3: { halign: "right", cellWidth: 28 },
        4: { halign: "center", cellWidth: 18 },
        5: { halign: "right", cellWidth: 28, fontStyle: "bold" },
      } : {
        0: { cellWidth: 18, fontStyle: "bold", textColor: BRAND_DARK, fontSize: 7.5 },
        2: { halign: "center", cellWidth: 14 },
        3: { halign: "right", cellWidth: 34 },
        4: { halign: "right", cellWidth: 28, fontStyle: "bold" },
      },
      styles: { lineColor: GRAY_MID, lineWidth: 0.25 },
      margin: { left: 15, right: 15 },
    });

    // @ts-expect-error lastAutoTable injected by plugin
    y = doc.lastAutoTable.finalY;

    if (args.imagingDiscount > 0) {
      // Savings notice inline before subtotal
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(21, 128, 61);
      doc.text(`Ahorro por convenio ${args.convenioLabel}: −${formatCLP(args.imagingDiscount)}`, 192, y + 4, { align: "right" });
      y += 6;
    }

    y = subtotalBar(doc, y, "Subtotal Imagenología", args.imagingTotal);
  }

  // ── Laboratorio table ────────────────────────────────────────────────────────
  if (args.labItems.length > 0) {
    y = checkPage(doc, y, 24, "Laboratorio");
    y = sectionLabel(doc, y, "EXÁMENES DE LABORATORIO");

    autoTable(doc, {
      startY: y,
      head: [["Código", "Nombre del examen", "Cant.", `Precio ${args.previsionLabel}`]],
      body: args.labItems.map(({ exam: e, qty }) => {
        const unitPrice =
          args.previsionKey === "fa"   ? (e.fonasa_a   ?? e.particular) :
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
      headStyles: { fillColor: BRAND, textColor: [255,255,255], fontStyle: "bold", fontSize: 8.5, cellPadding: 3 },
      bodyStyles: { fontSize: 8.5, cellPadding: 3, textColor: BLACK },
      alternateRowStyles: { fillColor: GRAY_LIGHT },
      columnStyles: {
        0: { cellWidth: 26, fontStyle: "bold", textColor: BRAND_DARK, fontSize: 7.5 },
        2: { halign: "center", cellWidth: 14 },
        3: { halign: "right", cellWidth: 36, fontStyle: "bold" },
      },
      styles: { lineColor: GRAY_MID, lineWidth: 0.25 },
      margin: { left: 15, right: 15 },
    });

    // @ts-expect-error lastAutoTable injected by plugin
    y = doc.lastAutoTable.finalY;

    y = subtotalBar(doc, y, `Subtotal Laboratorio (${args.previsionLabel})`, args.labTotal);
  }

  // ── Grand total — full width ─────────────────────────────────────────────────
  y = checkPage(doc, y, 20, "Total");
  doc.setFillColor(...BRAND_DARK);
  doc.setDrawColor(...BRAND_DARK);
  doc.rect(15, y, 180, 16, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`TOTAL A PAGAR  (${args.previsionLabel})`, 20, y + 7);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(formatCLP(args.grandTotal), 192, y + 13, { align: "right" });
  y += 22;

  // ── Observations ─────────────────────────────────────────────────────────────
  if (args.observations.trim()) {
    y = checkPage(doc, y, 14, "Observaciones");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY_TEXT);
    doc.text("Observaciones:", 15, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BLACK);
    const obsLines = doc.splitTextToSize(args.observations, 176);
    doc.text(obsLines, 15, y);
    y += obsLines.length * 5 + 5;
  }

  // ── Preparation ──────────────────────────────────────────────────────────────
  const prepRows    = buildImagingPrepRows(args.imagingItems);
  const labPrepRows = buildLabPrepRows(args.labItems);
  const hasContrast = args.imagingItems.some((it) => hasContrastPostProtocol(it.category));
  const hasAnyPrep  = prepRows.length > 0 || labPrepRows.length > 0 || hasContrast;

  y = checkPage(doc, y, 20, "Indicaciones");
  hline(doc, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND_DARK);
  doc.text("INDICACIONES PARA EL PACIENTE", 15, y);
  y += 6;

  if (hasAnyPrep) {
    // Combined prep table (imaging + lab)
    const allPrepRows: [string, string, string][] = [
      ...prepRows.map(([name, note]): [string,string,string] => ["Imagenología", name, note]),
      ...labPrepRows.map(([name, note]): [string,string,string] => ["Laboratorio", name, note]),
    ];

    if (allPrepRows.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["Tipo", "Examen", "Preparación requerida"]],
        body: allPrepRows,
        theme: "grid",
        headStyles: { fillColor: [230,237,248], textColor: BRAND_DARK, fontStyle: "bold", fontSize: 8, cellPadding: 2.5 },
        bodyStyles: { fontSize: 7.5, cellPadding: 2.5, textColor: GRAY_TEXT },
        alternateRowStyles: { fillColor: [250,251,254] },
        columnStyles: {
          0: { cellWidth: 22, fontStyle: "bold", textColor: BRAND_DARK, fontSize: 7 },
          1: { cellWidth: 58, fontStyle: "bold", textColor: BLACK },
          2: {},
        },
        styles: { lineColor: [215,220,230], lineWidth: 0.2 },
        margin: { left: 15, right: 15 },
      });
      // @ts-expect-error lastAutoTable injected by plugin
      y = doc.lastAutoTable.finalY + 4;
    }

    // Post-contrast note as a single block
    if (hasContrast) {
      y = checkPage(doc, y, 12, "Indicaciones");
      const postLines = doc.splitTextToSize(
        "Post-contraste: Hidratarse con al menos 2 litros de agua al día durante 2–3 días. Si usa Metformina, consulte a su médico sobre la suspensión del medicamento. Ante cualquier reacción (dificultad respiratoria, hinchazón facial, urticaria), consulte de inmediato.",
        176
      );
      doc.setFillColor(255, 252, 235);
      doc.setDrawColor(217, 165, 30);
      doc.setLineWidth(0.3);
      doc.roundedRect(15, y, 180, postLines.length * 4.8 + 8, 1.5, 1.5, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(120, 70, 0);
      doc.text(postLines, 19, y + 6);
      y += postLines.length * 4.8 + 13;
    }
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY_TEXT);
    doc.text("No se requiere preparación especial para los exámenes solicitados.", 15, y);
    y += 7;
  }

  // Universal notes — always shown
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 130);
  const universalLines: string[] = [
    "Para todos los exámenes: traer cédula de identidad vigente y orden médica · Llegar 15 min antes de su hora.",
  ];
  if (args.labItems.length > 0) {
    universalLines.push("Laboratorio · Toma de muestras: Lunes a Viernes 08:00–12:00 · Sábados 09:00–12:00");
  }
  for (const line of universalLines) {
    y = checkPage(doc, y, 6, "Indicaciones");
    doc.text(line, 15, y);
    y += 5;
  }

  // ── Footer on every page ──────────────────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages() as number;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    hline(doc, 284, [185, 190, 200]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(170, 170, 170);
    doc.text(
      "Cotización referencial sujeta a confirmación · Valores pueden variar según indicación médica · DiagnoPRO Temuco",
      105, 289, { align: "center" }
    );
    if (pageCount > 1) {
      doc.text(`Pág. ${i} / ${pageCount}`, 195, 289, { align: "right" });
    }
  }

  doc.save("Cotizacion_DiagnoPRO.pdf");
}

// ── Prep row builders ──────────────────────────────────────────────────────────

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

function buildLabPrepRows(items: Array<{ exam: LabExam; qty: number }>): [string, string][] {
  const prepLabels: Record<string, string> = {
    orina_manana: "Primera orina de la mañana (segundo chorro). Entregar al laboratorio en máximo 2 horas.",
    orina_24h:    "Recolección de orina de 24 horas. Desechar la primera micción; guardar el resto en el envase provisto hasta la misma hora del día siguiente.",
    psa:          "Abstinencia sexual de 48 horas previas al examen.",
  };
  const rows: [string, string][] = [];
  for (const { exam } of items) {
    const notes: string[] = [];
    if (exam.fasting) notes.push("Ayuno mínimo 8 horas, máximo 12 horas (sólidos y líquidos).");
    if (exam.prep && prepLabels[exam.prep]) notes.push(prepLabels[exam.prep]);
    if (notes.length > 0) {
      const name = exam.name.replace(/\*PARTICULAR\*/gi, "").replace(/\s{2,}/g, " ").trim();
      rows.push([name, notes.join(" ")]);
    }
  }
  return rows;
}

// ── Indicaciones de Laboratorio PDF ───────────────────────────────────────────

export function generateLabIndicacionesPDF() {
  const doc = new jsPDF();
  const now = new Date();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...BRAND_DARK);
  doc.text("DiagnoPRO Temuco", 15, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY_TEXT);
  doc.text("Laboratorio Clínico · Indicaciones para Pacientes", 15, 25);

  doc.setFontSize(8);
  doc.text(now.toLocaleDateString("es-CL"), 195, 18, { align: "right" });
  doc.text("Las Heras 453, esq. Av. Caupolican · Temuco", 195, 24, { align: "right" });
  doc.text("(045) 2887405 · 2887400", 195, 30, { align: "right" });

  hline(doc, 33, BRAND, 0.5);
  let y = 41;

  // Horario
  y = sectionLabel(doc, y, "HORARIO DE TOMA DE MUESTRAS");
  autoTable(doc, {
    startY: y,
    head: [["Día", "Horario"]],
    body: [
      ["Lunes a Viernes", "08:00 – 10:30 hrs"],
      ["Sábados",         "09:00 – 10:30 hrs"],
    ],
    theme: "grid",
    headStyles: { fillColor: BRAND, textColor: [255,255,255], fontStyle: "bold", fontSize: 9, cellPadding: 3 },
    bodyStyles: { fontSize: 10, cellPadding: 4, textColor: BLACK },
    columnStyles: { 0: { cellWidth: 80 }, 1: { fontStyle: "bold" } },
    styles: { lineColor: GRAY_MID, lineWidth: 0.25 },
    tableWidth: 110,
  });
  // @ts-expect-error lastAutoTable injected by plugin
  y = doc.lastAutoTable.finalY + 9;

  // Ayuno
  y = sectionLabel(doc, y, "AYUNO REQUERIDO");
  autoTable(doc, {
    startY: y,
    body: [
      ["Mínimo",                          "8 horas"],
      ["Máximo",                          "12 horas (no exceder)"],
      ["Última colación recomendada",     "23:00 hrs del día anterior"],
    ],
    theme: "grid",
    bodyStyles: { fontSize: 9.5, cellPadding: 3.5, textColor: BLACK },
    columnStyles: { 0: { cellWidth: 80, fontStyle: "bold", textColor: BRAND_DARK } },
    styles: { lineColor: GRAY_MID, lineWidth: 0.25 },
    tableWidth: 130,
  });
  // @ts-expect-error lastAutoTable injected by plugin
  y = doc.lastAutoTable.finalY + 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY_TEXT);
  const warnLines = doc.splitTextToSize(
    "No exceder las 12 horas de ayuno. Si esto ocurre, los resultados pueden verse alterados y podría ser necesario repetir el examen.",
    175
  );
  doc.text(warnLines, 15, y);
  y += warnLines.length * 5 + 9;

  // Indicaciones específicas
  y = sectionLabel(doc, y, "INDICACIONES ESPECÍFICAS");
  autoTable(doc, {
    startY: y,
    head: [["Examen", "Indicación"]],
    body: [
      ["Examen de Orina",         "Recolectar la primera orina de la mañana (segundo chorro). Ingresar al laboratorio en máximo 2 horas."],
      ["Antígeno Prostático (PSA)", "Abstinencia sexual de 48 horas previas al examen."],
    ],
    theme: "grid",
    headStyles: { fillColor: BRAND, textColor: [255,255,255], fontStyle: "bold", fontSize: 9, cellPadding: 3 },
    bodyStyles: { fontSize: 9, cellPadding: 3.5, textColor: BLACK },
    columnStyles: { 0: { cellWidth: 70, fontStyle: "bold" } },
    styles: { lineColor: GRAY_MID, lineWidth: 0.25 },
  });
  // @ts-expect-error lastAutoTable injected by plugin
  y = doc.lastAutoTable.finalY + 9;

  // Documentos
  y = sectionLabel(doc, y, "DOCUMENTOS REQUERIDOS");
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

  hline(doc, y, [185, 190, 200]);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(160, 160, 160);
  doc.text(
    "DiagnoPRO Temuco · www.diagnopro.cl · Las Heras 453, esq. Av. Caupolican · (045) 2887405 – 2887400",
    105, y, { align: "center" }
  );

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
    args.prevision.includes("B")  ? "fbcd" : "particular";
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
