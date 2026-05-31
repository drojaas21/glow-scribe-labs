export type LabProfile = {
  name: string;
  code: string | null;
  tint: string;
  fonasa_a: number | null;
  particular: number | null;
  items: string[];
};

/** Perfiles de laboratorio destacados. Los que tienen código FONASA se cobran
 *  como un único examen; el resto son combinaciones referenciales. */
export const labProfiles: LabProfile[] = [
  {
    name: "Perfil Bioquímico",
    code: "0302075",
    tint: "var(--chart-1)",
    fonasa_a: 11650,
    particular: 13398,
    items: [
      "Glicemia", "Nitrógeno ureico", "Uremia", "Ácido úrico",
      "Colesterol total", "Proteínas totales", "Albúmina", "Transaminasa GOT",
      "Bilirrubina total", "Fosfatasa alcalina", "LDH", "Calcio", "Fósforo",
    ],
  },
  {
    name: "Perfil Hepático",
    code: "0302076",
    tint: "var(--chart-4)",
    fonasa_a: 13640,
    particular: 15686,
    items: [
      "Transaminasa GOT", "Transaminasa GPT", "Bilirrubina total",
      "Bilirrubina directa", "Bilirrubina indirecta", "Fosfatasa alcalina",
      "Gamma GT", "Tiempo de protrombina", "% de actividad", "INR",
    ],
  },
  {
    name: "Perfil Lipídico",
    code: "0302034",
    tint: "var(--chart-5)",
    fonasa_a: 8290,
    particular: 9534,
    items: [
      "Colesterol total", "Triglicéridos", "Colesterol HDL", "Colesterol LDL",
      "Relación LDL/HDL", "Colesterol total/HDL",
    ],
  },
  {
    name: "Perfil Renal",
    code: null,
    tint: "var(--chart-2)",
    fonasa_a: null,
    particular: null,
    items: [
      "Microalbuminuria", "Electrolitos (Na-K-Cl)", "Nitrógeno ureico",
      "Creatinina en suero",
    ],
  },
  {
    name: "Perfil Tiroideo",
    code: null,
    tint: "var(--chart-3)",
    fonasa_a: null,
    particular: null,
    items: ["TSH", "T4 libre", "T4", "T3"],
  },
  {
    name: "Perfil de Coagulación",
    code: null,
    tint: "var(--chart-1)",
    fonasa_a: null,
    particular: null,
    items: ["Tiempo de protrombina (TP/INR)", "Tromboplastina (TTPA)"],
  },
];
