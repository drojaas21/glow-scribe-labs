import type { ExamCategory } from "./catalog";

export type PrepEntry = {
  steps: string[];
  postProtocol?: string;
};

const ARRIVAL = "Llegar 20 minutos antes de su hora.";
const ID_ORDER = "Traer cédula de identidad y orden médica.";
const NO_SMOKE = "No fumar ni mascar chicle previo al examen.";
const WATER_PELVIS =
  "Beber 1.5 litros de agua paulatinamente desde 1 hora antes y retener la orina hasta el examen.";
const FAST_6H = "Ayuno total de 6 horas (sólidos y líquidos).";
const FAST_4H = "Ayuno total de 4 horas (sólidos y líquidos).";
const POST_CONTRAST =
  "Post-contraste: Beber ≈2 litros de agua diarios durante 2–3 días. Si usa Metformina, suspénderla 48 horas post-examen. Consulte de inmediato ante dificultad respiratoria, hinchazón facial o urticaria.";
const RM_SURVEY =
  "Completar encuesta de seguridad de RM al llegar: informar sobre marcapasos, prótesis metálicas, clips vasculares, stents, DIU, piercings u otros implantes metálicos.";

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function getImagingPrep(examName: string, category: ExamCategory): PrepEntry {
  const n = norm(examName);

  if (category === "resonancia") {
    const withContrast = n.includes("contraste") || n.includes("gadolinio");
    return {
      steps: [
        ARRIVAL,
        ID_ORDER,
        RM_SURVEY,
        ...(withContrast
          ? ["Con contraste (gadolinio): ayuno de 4 a 6 horas previo al examen."]
          : []),
      ],
    };
  }

  if (category === "tac") {
    if (n.includes("abdom") || n.includes("pelv")) {
      return { steps: [ARRIVAL, ID_ORDER, FAST_6H, WATER_PELVIS, NO_SMOKE], postProtocol: POST_CONTRAST };
    }
    return { steps: [ARRIVAL, ID_ORDER, NO_SMOKE], postProtocol: POST_CONTRAST };
  }

  if (category === "contraste") {
    return { steps: [ARRIVAL, ID_ORDER], postProtocol: POST_CONTRAST };
  }

  if (category === "ecografia") {
    if (n.includes("mama") || n.includes("mamaria")) {
      return {
        steps: [
          ARRIVAL,
          ID_ORDER,
          "Pacientes mayores de 40 años: traer mamografía reciente (máximo 6 meses de antigüedad).",
          "Higiene local previa. Sin desodorante en barra, cremas ni talco en la zona.",
        ],
      };
    }
    if (
      (n.includes("renal") || n.includes("rinon")) &&
      (n.includes("vesical") || n.includes("vejiga"))
    ) {
      return { steps: [ARRIVAL, ID_ORDER, FAST_4H, WATER_PELVIS, NO_SMOKE] };
    }
    if (n.includes("renal") || n.includes("rinon")) {
      return { steps: [ARRIVAL, ID_ORDER, FAST_4H, NO_SMOKE] };
    }
    if (n.includes("abdom") && (n.includes("pelv") || n.includes("pelvian"))) {
      return { steps: [ARRIVAL, ID_ORDER, FAST_6H, WATER_PELVIS, NO_SMOKE] };
    }
    if (n.includes("abdom")) {
      return { steps: [ARRIVAL, ID_ORDER, FAST_6H, NO_SMOKE] };
    }
    if (n.includes("pelv")) {
      return { steps: [ARRIVAL, ID_ORDER, WATER_PELVIS, NO_SMOKE] };
    }
    return { steps: [ARRIVAL, ID_ORDER] };
  }

  if (category === "mamografia") {
    return {
      steps: [
        ARRIVAL,
        ID_ORDER,
        "Sin desodorante en barra, cremas ni talco en zona mamaria o axilas.",
        "Traer estudios anteriores si los tiene (para comparación).",
      ],
    };
  }

  return { steps: [ARRIVAL, ID_ORDER] };
}

export function needsCreatinineAlert(category: ExamCategory): boolean {
  return category === "contraste" || category === "tac";
}

export function needsRMSafetyAlert(category: ExamCategory): boolean {
  return category === "resonancia";
}
