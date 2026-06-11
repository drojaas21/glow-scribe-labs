import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCLP } from "./format";
import { getImagingPrepNote, hasContrastPostProtocol } from "@/data/imagingPrep";
import type { Exam, ExamCategory, Convenio, LabExam } from "@/data/catalog";
import { categoryMeta, convenioMeta } from "@/data/catalog";

const BRAND: [number, number, number] = [25, 96, 165];
const BRAND_DARK: [number, number, number] = [20, 54, 93];
const GRAY_TEXT: [number, number, number] = [60, 60, 60];
const LIGHT_BG: [number, number, number] = [245, 249, 254];

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
  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(200, 215, 235);
  doc.roundedRect(15, y, 180, 20, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND_DARK);
  doc.text("PACIENTE", 20, y + 6);
  doc.text("RUT", 120, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(name || "No especificado", 20, y + 15);
  doc.text(rut || "—", 120, y + 15);
  return y + 26;
}

function infoRow(doc: jsPDF, y: number, prevision: string, convenio: string): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Previsión: `, 20, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND_DARK);
  doc.text(prevision, 43, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Convenio: `, 120, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND_DARK);
  doc.text(convenio, 143, y);
  return y + 10;
}

function observationsBox(doc: jsPDF, y: number, text: string): number {
  if (!text.trim()) return y;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND_DARK);
  doc.text("OBSERVACIÓN", 15, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY_TEXT);
  doc.setFontSize(9);
  const lines = doc.splitTextToSize(text, 176);
  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(200, 215, 235);
  doc.roundedRect(15, y, 180, lines.length * 5.5 + 8, 2, 2, "FD");
  doc.text(lines, 19, y + 6);
  return y + lines.length * 5.5 + 14;
}

function footer(doc: jsPDF) {
  doc.setFontSize(7.5);
  doc.setTextColor(160, 160, 160);
  doc.text(
    "Cotización referencial sujeta a confirmación. Los valores pueden variar según indicación médica.",
    105, 289, { align: "center" }
  );
}

function sectionBar(doc: jsPDF, y: number, label: string): number {
  doc.setFillColor(...BRAND_DARK);
  doc.rect(15, y, 180, 9, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(label, 105, y + 6.3, { align: "center" });
  return y + 11;
}

// ── Page helper ────────────────────────────────────────────────────────────────

function checkPage(doc: jsPDF, y: number, needed: number, pageTitle: string): number {
  if (y + needed > 276) {
    doc.addPage();
    doc.setFillColor(...BRAND_DARK);
    doc.rect(0, 0, 210, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("DiagnoPRO Temuco · " + pageTitle, 15, 8.5);
    return 18;
  }
  return y;
}

// ── Exam PDF types ─────────────────────────────────────────────────────────────

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

// ── Preparation section — Imagenología ────────────────────────────────────────

function prepSectionImaging(doc: jsPDF, y: number, items: ExamCartPDFItem[]): number {
  const seen = new Set<string>();
  const rows: [string, string][] = [];
  let needsContrast = false;

  for (const item of items) {
    const key = `${item.category}::${item.exam.name}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (hasContrastPostProtocol(item.category)) needsContrast = true;

    const note = getImagingPrepNote(item.exam.name, item.category);
    if (note) {
      rows.push([item.exam.name, note]);
    }
  }

  if (rows.length === 0 && !needsContrast) return y;

  y = checkPage(doc, y, 20, "Indicaciones para el Paciente");
  y = sectionBar(doc, y, "INDICACIONES PARA EL PACIENTE — IMAGENOLOGÍA");

  if (rows.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Examen", "Preparación requerida"]],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: BRAND, textColor: 255, fontStyle: "bold", fontSize: 8.5 },
      columnStyles: {
        0: { cellWidth: 68, fontStyle: "bold", textColor: BRAND_DARK, fontSize: 8 },
        1: { fontSize: 8.5, textColor: GRAY_TEXT },
      },
      styles: { cellPadding: 3.5, lineColor: [210, 220, 235], lineWidth: 0.3 },
      alternateRowStyles: { fillColor: [250, 252, 255] },
    });
    // @ts-expect-error lastAutoTable injected by plugin
    y = doc.lastAutoTable.finalY + 3;
  }

  // Universal note
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text("Para todos los exámenes: traer cédula de identidad y orden médica. Llegar 15 minutos antes de su hora.", 15, y);
  y += 6;

  // Post-contrast note (single, once)
  if (needsContrast) {
    y = checkPage(doc, y, 14, "Indicaciones para el Paciente");
    const msg = "Post-contraste: hidratarse con al menos 2 litros de agua por día durante 2–3 días. Si usa Metformina, consulte a su médico sobre suspensión. Ante dificultad respiratoria, hinchazón facial o urticaria, consulte de inmediato.";
    const msgLines = doc.splitTextToSize(msg, 167);
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(220, 160, 0);
    doc.roundedRect(15, y, 180, msgLines.length * 5 + 9, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(110, 70, 0);
    doc.text("Cuidados post-contraste:", 19, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 55, 0);
    doc.text(msgLines, 19, y + 11);
    y += msgLines.length * 5 + 14;
  }

  return y + 2;
}

// ── Preparation section — Laboratorio ─────────────────────────────────────────

function labPrepSection(doc: jsPDF, y: number, labItems: Array<{ exam: LabExam; qty: number }>): number {
  const prepLabels: Record<string, string> = {
    orina_manana: "Recolectar primera orina de la mañana (segundo chorro). Ingresar muestra dentro de 2 horas.",
    orina_24h: "Recolección de orina de 24 horas. Desechar la primera micción del día; guardar todo el resto en el envase provisto hasta la misma hora del día siguiente.",
    psa: "Abstinencia sexual de 48 horas antes del examen.",
  };

  const rows: [string, string][] = [];

  for (const { exam } of labItems) {
    const notes: string[] = [];
    if (exam.fasting) notes.push("Ayuno mínimo 8 horas, máximo 12 horas (sólidos y líquidos).");
    if (exam.prep && prepLabels[exam.prep]) notes.push(prepLabels[exam.prep]);
    if (notes.length > 0) {
      const cleanName = exam.name.replace(/\*PARTICULAR\*/gi, "").replace(/\s{2,}/g, " ").trim();
      rows.push([cleanName, notes.join(" ")]);
    }
  }

  if (rows.length === 0) {
    y = checkPage(doc, y, 20, "Indicaciones de Laboratorio");
    y = sectionBar(doc, y, "INDICACIONES PARA EL PACIENTE — LABORATORIO");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY_TEXT);
    doc.text("No se requiere preparación especial para los exámenes solicitados.", 20, y);
    y += 6;
  } else {
    y = checkPage(doc, y, 20, "Indicaciones de Laboratorio");
    y = sectionBar(doc, y, "INDICACIONES PARA EL PACIENTE — LABORATORIO");

    autoTable(doc, {
      startY: y,
      head: [["Examen", "Indicaciones"]],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: BRAND, textColor: 255, fontStyle: "bold", fontSize: 8.5 },
      columnStyles: {
        0: { cellWidth: 68, fontStyle: "bold", textColor: BRAND_DARK, fontSize: 8 },
        1: { fontSize: 8.5, textColor: GRAY_TEXT },
      },
      styles: { cellPadding: 3.5, lineColor: [210, 220, 235], lineWidth: 0.3 },
      alternateRowStyles: { fillColor: [250, 252, 255] },
    });
    // @ts-expect-error lastAutoTable injected by plugin
    y = doc.lastAutoTable.finalY + 3;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text("Toma de muestras: Lunes a Viernes 08:00–12:00 · Sábados 09:00–12:00 · Traer cédula de identidad y orden médica.", 15, y);
  y += 7;

  return y;
}

// ── Cotización Integral (Imagenología + Laboratorio) ──────────────────────────

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

export function generateCombinedPDF(args: GenerateCombinedPDFArgs) {
  const doc = new jsPDF();
  header(doc, "Cotización de Exámenes");
  let y = patientBox(doc, 42, args.patientName, args.patientRut);
  y = infoRow(doc, y, args.previsionLabel, args.convenioLabel);
  y += 4;

  // ── Imagenología ────────────────────────────────────────────────────────────
  if (args.imagingItems.length > 0) {
    y = sectionBar(doc, y, "EXÁMENES DE IMAGENOLOGÍA");

    autoTable(doc, {
      startY: y,
      head: [["Examen", "Cant.", "Precio base", "Descuento", "Total"]],
      body: args.imagingItems.map((item) => [
        item.exam.name,
        String(item.qty),
        formatCLP(item.baseUnit),
        item.discountPct > 0 ? `−${item.discountPct}%` : "—",
        formatCLP(item.lineTotal),
      ]),
      theme: "striped",
      headStyles: { fillColor: BRAND, textColor: 255, fontStyle: "bold", fontSize: 9 },
      columnStyles: {
        1: { halign: "center", cellWidth: 16 },
        2: { halign: "right", cellWidth: 32 },
        3: { halign: "center", cellWidth: 22, textColor: [22, 163, 74] as [number,number,number] },
        4: { halign: "right", cellWidth: 30, fontStyle: "bold" },
      },
      styles: { fontSize: 9, cellPadding: 3.5 },
    });

    // @ts-expect-error lastAutoTable injected by plugin
    y = doc.lastAutoTable.finalY + 4;

    if (args.imagingDiscount > 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(21, 128, 61);
      doc.text(`Ahorro por convenio ${args.convenioLabel}: −${formatCLP(args.imagingDiscount)}`, 192, y, { align: "right" });
      y += 6;
    }

    doc.setFillColor(...LIGHT_BG);
    doc.setDrawColor(200, 215, 235);
    doc.roundedRect(15, y, 180, 11, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BRAND_DARK);
    doc.text("Subtotal Imagenología", 20, y + 7.5);
    doc.text(formatCLP(args.imagingTotal), 192, y + 7.5, { align: "right" });
    y += 17;
  }

  // ── Laboratorio ─────────────────────────────────────────────────────────────
  if (args.labItems.length > 0) {
    y = checkPage(doc, y, 24, "Laboratorio");
    y = sectionBar(doc, y, "EXÁMENES DE LABORATORIO");

    autoTable(doc, {
      startY: y,
      head: [["Código", "Nombre del examen", "Cant.", `Precio ${args.previsionLabel.toUpperCase()}`]],
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
      theme: "striped",
      headStyles: { fillColor: BRAND, textColor: 255, fontStyle: "bold", fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 26, fontStyle: "bold", textColor: BRAND_DARK as [number,number,number], fontSize: 8 },
        2: { halign: "center", cellWidth: 16 },
        3: { halign: "right", cellWidth: 38, fontStyle: "bold" },
      },
      styles: { fontSize: 9, cellPadding: 3.5 },
    });

    // @ts-expect-error lastAutoTable injected by plugin
    y = doc.lastAutoTable.finalY + 4;

    doc.setFillColor(...LIGHT_BG);
    doc.setDrawColor(200, 215, 235);
    doc.roundedRect(15, y, 180, 11, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BRAND_DARK);
    doc.text(`Subtotal Laboratorio (${args.previsionLabel})`, 20, y + 7.5);
    doc.text(formatCLP(args.labTotal), 192, y + 7.5, { align: "right" });
    y += 17;
  }

  // ── Total general ────────────────────────────────────────────────────────────
  y = checkPage(doc, y, 34, "Total General");
  doc.setFillColor(...BRAND_DARK);
  doc.roundedRect(15, y, 180, 26, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`TOTAL A PAGAR  (${args.previsionLabel})`, 22, y + 9);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(formatCLP(args.grandTotal), 190, y + 21, { align: "right" });
  y += 34;

  y = observationsBox(doc, y, args.observations);
  if (args.imagingItems.length > 0) y = prepSectionImaging(doc, y, args.imagingItems);
  if (args.labItems.length > 0) y = labPrepSection(doc, y, args.labItems);

  footer(doc);
  doc.save("Cotizacion_DiagnoPRO.pdf");
}

// ── Indicaciones de Laboratorio PDF ───────────────────────────────────────────

export function generateLabIndicacionesPDF() {
  const doc = new jsPDF();

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

  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(200, 215, 235);
  doc.roundedRect(15, y, 180, 20, 3, 3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...BRAND_DARK);
  doc.text("Estimado/a Paciente", 105, y + 8, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GRAY_TEXT);
  doc.text("Los exámenes de sangre se toman por orden de llegada.", 105, y + 15, { align: "center" });
  y += 28;

  y = sectionBar(doc, y, "HORARIO DE ATENCIÓN");
  y += 2;

  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(200, 215, 235);
  doc.roundedRect(15, y, 85, 22, 2, 2, "FD");
  doc.roundedRect(110, y, 85, 22, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND_DARK);
  doc.text("Lunes a Viernes", 57.5, y + 7, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(30, 30, 30);
  doc.text("08:00 – 10:30 hrs", 57.5, y + 16, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND_DARK);
  doc.text("Sábados", 152.5, y + 7, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(30, 30, 30);
  doc.text("09:00 – 10:30 hrs", 152.5, y + 16, { align: "center" });
  y += 30;

  y = sectionBar(doc, y, "AYUNO REQUERIDO");
  y += 2;

  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(200, 215, 235);
  doc.roundedRect(15, y, 180, 20, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND_DARK);
  doc.text("Mínimo 8 horas · Máximo 12 horas", 105, y + 8, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY_TEXT);
  doc.text("No coma ni beba nada en ese período (excepto agua en pequeñas cantidades si se lo indicó su médico).", 105, y + 15, { align: "center" });
  y += 26;

  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(220, 160, 0);
  doc.roundedRect(15, y, 180, 22, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(110, 70, 0);
  doc.text("Importante:", 20, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const warnText = "No exceder las 12 horas de ayuno. Si esto ocurre, los resultados pueden verse alterados y podría ser necesario repetir el examen.";
  const warnLines = doc.splitTextToSize(warnText, 168);
  doc.text(warnLines, 20, y + 13);
  y += 28;

  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(34, 197, 94);
  doc.roundedRect(15, y, 180, 12, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(21, 128, 61);
  doc.text("Recomendación:", 20, y + 5);
  doc.setFont("helvetica", "normal");
  doc.text("Para no exceder el ayuno, realice su última colación a las 23:00 hrs del día anterior.", 20, y + 10);
  y += 18;

  y = sectionBar(doc, y, "INDICACIONES ESPECÍFICAS");
  y += 2;

  const specifics = [
    {
      title: "Examen de Orina",
      body: "Recolectar la primera orina de la mañana (segundo chorro). Una vez recolectada, la muestra debe ingresarse al laboratorio en un plazo máximo de 2 horas.",
    },
    {
      title: "Antígeno Prostático (PSA)",
      body: "Abstinencia sexual de 48 horas previas al examen.",
    },
  ];

  for (const s of specifics) {
    doc.setFillColor(...LIGHT_BG);
    doc.setDrawColor(200, 215, 235);
    const bodyLines = doc.splitTextToSize(s.body, 158);
    const boxH = 13 + bodyLines.length * 5;
    doc.roundedRect(15, y, 180, boxH, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...BRAND_DARK);
    doc.text(s.title, 20, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY_TEXT);
    doc.text(bodyLines, 22, y + 13);
    y += boxH + 5;
  }

  y = sectionBar(doc, y, "DOCUMENTOS REQUERIDOS");
  y += 2;

  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(200, 215, 235);
  doc.roundedRect(15, y, 180, 16, 2, 2, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 30, 30);
  doc.text("• Cédula de identidad vigente", 22, y + 6);
  doc.text("• Orden médica del examen solicitado", 22, y + 13);
  y += 24;

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

// ── Keep legacy exports for backwards compatibility ────────────────────────────

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
