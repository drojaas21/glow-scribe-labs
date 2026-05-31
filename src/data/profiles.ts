export type LabProfileItem = {
  name: string;
  code?: string;
};

export type LabProfile = {
  name: string;
  code: string | null;
  tint: string;
  fonasa_a: number | null;
  particular: number | null;
  items: LabProfileItem[];
};

export const labProfiles: LabProfile[] = [
  {
    name: "Perfil Bioquímico",
    code: "0302075",
    tint: "var(--chart-1)",
    fonasa_a: 11650,
    particular: 13397,
    items: [
      { name: "Glicemia", code: "0302047" },
      { name: "Nitrógeno ureico", code: "0302057" },
      { name: "Uremia", code: "0302057" },
      { name: "Ácido úrico", code: "0302005" },
      { name: "Colesterol total", code: "0302067" },
      { name: "Proteínas totales", code: "0302100" },
      { name: "Albúmina", code: "0302101" },
      { name: "Transaminasa GOT", code: "0302063" },
      { name: "Bilirrubina total", code: "0302012" },
      { name: "Fosfatasa alcalina", code: "0302040" },
      { name: "LDH", code: "0302030" },
      { name: "Calcio", code: "0302015" },
      { name: "Fósforo", code: "0302042" },
    ],
  },
  {
    name: "Perfil Hepático",
    code: "0302076",
    tint: "var(--chart-4)",
    fonasa_a: 13640,
    particular: 15686,
    items: [
      { name: "Transaminasa GOT", code: "0302063" },
      { name: "Transaminasa GPT", code: "0302063" },
      { name: "Bilirrubina total", code: "0302012" },
      { name: "Bilirrubina directa", code: "0302012" },
      { name: "Bilirrubina indirecta", code: "0302013" },
      { name: "Fosfatasa alcalina", code: "0302040" },
      { name: "Gamma GT", code: "0302045" },
      { name: "Tiempo de protrombina", code: "0301059" },
      { name: "% Actividad / INR" },
    ],
  },
  {
    name: "Perfil Lipídico",
    code: "0302034",
    tint: "var(--chart-5)",
    fonasa_a: 8290,
    particular: 9534,
    items: [
      { name: "Colesterol total", code: "0302067" },
      { name: "Triglicéridos", code: "0302064" },
      { name: "Colesterol HDL", code: "0302068" },
      { name: "Colesterol LDL" },
      { name: "Relación LDL/HDL" },
      { name: "Colesterol total/HDL" },
    ],
  },
  {
    name: "Perfil Renal",
    code: "PERFIL RENAL",
    tint: "var(--chart-2)",
    fonasa_a: 12480,
    particular: 14352,
    items: [
      { name: "Microalbuminuria", code: "0309013" },
      { name: "Electrolitos (Na, K, Cl) ×3", code: "0302032" },
      { name: "Nitrógeno ureico", code: "0302057" },
      { name: "Creatinina en suero", code: "0302023" },
    ],
  },
  {
    name: "Perfil Tiroideo",
    code: "PERFIL TIROIDE",
    tint: "var(--chart-3)",
    fonasa_a: 25270,
    particular: 29061,
    items: [
      { name: "TSH", code: "0303024" },
      { name: "T4 libre", code: "0303026" },
      { name: "T4", code: "0303027" },
      { name: "T3", code: "0303028" },
    ],
  },
  {
    name: "Perfil de Coagulación",
    code: null,
    tint: "var(--chart-1)",
    fonasa_a: null,
    particular: null,
    items: [
      { name: "Tiempo de protrombina (TP/INR)", code: "0301059" },
      { name: "Tromboplastina (TTPA)", code: "0301085" },
    ],
  },
  {
    name: "HOMA",
    code: "HOMA",
    tint: "var(--chart-2)",
    fonasa_a: 8490,
    particular: 9763,
    items: [
      { name: "Glucosa en sangre", code: "0302047" },
      { name: "Insulina basal", code: "0303017" },
    ],
  },
  {
    name: "RAC (Microalbuminuria / Creatinuria)",
    code: "RAC",
    tint: "var(--chart-5)",
    fonasa_a: 5850,
    particular: 6727,
    items: [
      { name: "Microalbuminuria", code: "0309013" },
      { name: "Creatinina en orina", code: "0309010" },
    ],
  },
  {
    name: "GAME (Inmunoglobulinas)",
    code: "GAME",
    tint: "var(--chart-3)",
    fonasa_a: 27740,
    particular: 31901,
    items: [
      { name: "IgA, IgG, IgM (×3)", code: "0305027" },
      { name: "IgE total", code: "0305028" },
    ],
  },
  {
    name: "Perfil ENA",
    code: "0305138",
    tint: "var(--chart-4)",
    fonasa_a: 139320,
    particular: 160218,
    items: [
      { name: "SM, RNP, SS-A/RO, SS-B/LA, SCL-70, JO-1 (×6)", code: "0305138" },
    ],
  },
];
