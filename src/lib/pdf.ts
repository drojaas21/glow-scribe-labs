import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCLP } from "./format";
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
  header(doc, "Cotización de Exámenes de Imagenología");
  let y = patientBox(doc, 38, args.patientName, args.patientRut);

  autoTable(doc, {
    startY: y,
    head: [["Detalle", "Información"]],
    body: [
      ["Categoría", categoryMeta[args.category].label],
      ["Examen", args.exam.name],
      ["Convenio", convenioMeta[args.convenio]],
      ["Copago base", formatCLP(args.copagoBase)],
      ["Descuento convenio", `${args.porcentaje}%  (-${formatCLP(args.descuento)})`],
      ["Copago final", formatCLP(args.copagoFinal)],
    ],
    theme: "striped",
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 60, textColor: BRAND_DARK } },
    styles: { fontSize: 10, cellPadding: 3 },
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

  const totalFonasa = args.items.reduce((s, e) => s + (e.fonasa_a ?? e.particular), 0);
  const totalPart = args.items.reduce((s, e) => s + e.particular, 0);

  autoTable(doc, {
    startY: y,
    head: [["Código", "Examen", "Valor FONASA", "Particular"]],
    body: args.items.map((e) => [
      e.code,
      e.name,
      e.fonasa_a != null ? formatCLP(e.fonasa_a) : "—",
      formatCLP(e.particular),
    ]),
    theme: "striped",
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: "bold", textColor: BRAND_DARK },
      2: { halign: "right", cellWidth: 30 },
      3: { halign: "right", cellWidth: 28 },
    },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
  });

  // @ts-expect-error lastAutoTable injected by plugin
  let yy = doc.lastAutoTable.finalY + 8;
  doc.setFillColor(241, 247, 252);
  doc.setDrawColor(...BRAND);
  doc.roundedRect(110, yy, 85, 22, 2, 2, "FD");
  doc.setTextColor(...BRAND_DARK);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Total FONASA", 115, yy + 8);
  doc.text("Total Particular", 115, yy + 17);
  doc.setFont("helvetica", "bold");
  doc.text(formatCLP(totalFonasa), 190, yy + 8, { align: "right" });
  doc.text(formatCLP(totalPart), 190, yy + 17, { align: "right" });
  yy += 30;

  doc.setTextColor(...BRAND_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("Indicaciones generales", 15, yy);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(8.5);
  doc.text(
    [
      "• Atención: lunes a sábado.",
      "• Toma de muestras: lunes a viernes de 8:00 a 12:00 hrs / sábado de 9:00 a 12:00 hrs.",
      "• Ayuno requerido: 8 horas (máximo 12 horas) según el examen.",
    ],
    15,
    yy + 6
  );

  footer(doc);
  doc.save("Cotizacion_Laboratorio.pdf");
}
