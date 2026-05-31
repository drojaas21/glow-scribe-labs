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
  doc.text(now.toLocaleDateString("es-CL") + " " + now.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }), 195, 14, { align: "right" });
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
    105,
    288,
    { align: "center" }
  );
}

export function generateExamPDF(args: {
  exam: Exam;
  category: ExamCategory;
  convenio: Convenio;
  prevision: string;
  copagoBase: number;
  copagoFinal: number;
  descuento: number;
  porcentaje: number;
  totalBoleta: number;
  patientName: string;
  patientRut: string;
  recommendations: string;
}) {
  const doc = new jsPDF();
  header(doc, "Cotización de Examen de Imagenología");
  let y = patientBox(doc, 38, args.patientName, args.patientRut);

  autoTable(doc, {
    startY: y,
    head: [["Detalle de la cotización", ""]],
    body: [
      ["Tipo de examen", categoryMeta[args.category].label],
      ["Examen", args.exam.name],
      ["Previsión", args.prevision],
      ["Convenio comercial", convenioMeta[args.convenio]],
      ["Copago según previsión", formatCLP(args.copagoBase)],
      ["Descuento por convenio", args.porcentaje > 0 ? `${args.porcentaje}%  (-${formatCLP(args.descuento)})` : "Sin descuento"],
    ],
    theme: "striped",
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 70, textColor: BRAND_DARK } },
    styles: { fontSize: 10, cellPadding: 3.5 },
  });

  // total box
  // @ts-expect-error lastAutoTable injected by plugin
  y = doc.lastAutoTable.finalY + 8;
  doc.setFillColor(...BRAND_DARK);
  doc.roundedRect(15, y, 180, 18, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("VALOR TOTAL A PAGAR", 22, y + 11);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(formatCLP(args.totalBoleta), 188, y + 12, { align: "right" });
  y += 28;

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
  doc.save(`Cotizacion_${args.exam.name.slice(0, 24).replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
}

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
      2: { cellWidth: 22, fontSize: 7.5, textColor: [160, 100, 20] },
      3: { halign: "right", cellWidth: 26 },
      4: { halign: "right", cellWidth: 26 },
      5: { halign: "right", cellWidth: 26 },
    },
    styles: { fontSize: 8, cellPadding: 2.5 },
  });

  // @ts-expect-error lastAutoTable injected by plugin
  let yy = doc.lastAutoTable.finalY + 8;

  doc.setFillColor(241, 247, 252);
  doc.setDrawColor(...BRAND);
  doc.roundedRect(110, yy, 85, 30, 2, 2, "FD");
  doc.setTextColor(...BRAND_DARK);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text("Total FONASA A", 115, yy + 8);
  doc.text("Total FONASA B/C/D", 115, yy + 16);
  doc.text("Total Particular", 115, yy + 24);
  doc.setFont("helvetica", "bold");
  doc.text(formatCLP(totalFonasaA), 190, yy + 8, { align: "right" });
  doc.text(formatCLP(totalFonasaBcd), 190, yy + 16, { align: "right" });
  doc.text(formatCLP(totalPart), 190, yy + 24, { align: "right" });
  yy += 38;

  // Blood sample note
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(15, yy, 180, 10, 2, 2, "FD");
  doc.setTextColor(120, 75, 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const noteLines = doc.splitTextToSize(bloodSampleNote, 174);
  doc.text(noteLines, 18, yy + 6);
  yy += 16;

  // Preparation section
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
  doc.text(`• ${scheduleInfo.weekdays}`, 15, yy + 10);
  doc.text(`• ${scheduleInfo.saturday}`, 15, yy + 15);
  yy += 20;

  for (const note of preparationNotes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    doc.text(`${note.title}:`, 15, yy);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(`• ${note.text}`, 180);
    doc.text(lines, 15, yy + 5);
    yy += 5 + lines.length * 4.5;
    if (yy > 265) break;
  }

  footer(doc);
  doc.save("Cotizacion_Laboratorio.pdf");
}
