import { useMemo, useState } from "react";
import {
  Brain,
  ScanLine,
  Waves,
  Bone,
  HeartPulse,
  Droplets,
  Activity,
  Search,
  X,
  FileDown,
  Check,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import {
  examDatabase,
  discountMatrix,
  categoryMeta,
  categoryOrder,
  convenioMeta,
  type Exam,
  type ExamCategory,
  type Convenio,
} from "@/data/catalog";
import { formatCLP, sanitizeNumber, normalize } from "@/lib/format";
import { generateExamPDF } from "@/lib/pdf";

const icons: Record<string, LucideIcon> = {
  Brain, ScanLine, Waves, Bone, HeartPulse, Droplets, Activity,
};

type Selected = { category: ExamCategory; index: number } | null;

export function ExamQuoter() {
  const [activeCat, setActiveCat] = useState<ExamCategory | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Selected>(null);
  const [convenio, setConvenio] = useState<Convenio>("particular");
  const [copago, setCopago] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientRut, setPatientRut] = useState("");
  const [recommendations, setRecommendations] = useState("");

  const searchResults = useMemo(() => {
    if (query.trim().length < 2) return null;
    const q = normalize(query);
    const out: { category: ExamCategory; index: number; exam: Exam }[] = [];
    (Object.keys(examDatabase) as ExamCategory[]).forEach((cat) => {
      examDatabase[cat].forEach((exam, index) => {
        if (normalize(exam.name).includes(q) || normalize(exam.desc).includes(q))
          out.push({ category: cat, index, exam });
      });
    });
    return out;
  }, [query]);

  const list = useMemo(() => {
    if (searchResults) return searchResults;
    if (!activeCat) return [];
    return examDatabase[activeCat].map((exam, index) => ({ category: activeCat, index, exam }));
  }, [searchResults, activeCat]);

  const selectedExam: Exam | null =
    selected ? examDatabase[selected.category][selected.index] : null;

  const calc = useMemo(() => {
    if (!selected || !selectedExam) return null;
    const base = parseInt(sanitizeNumber(copago)) || 0;
    const pct = selectedExam.particular ? 0 : discountMatrix[selected.category]?.[convenio] ?? 0;
    const descuento = Math.round(base * (pct / 100));
    const copagoFinal = Math.round(base - descuento);
    const totalBoleta = Math.round(selectedExam.part - descuento);
    return { base, pct, descuento, copagoFinal, totalBoleta };
  }, [selected, selectedExam, copago, convenio]);

  const canPDF = !!(selected && calc && calc.base > 0);

  const handlePDF = () => {
    if (!canPDF || !selectedExam || !selected || !calc) return;
    generateExamPDF({
      exam: selectedExam,
      category: selected.category,
      convenio,
      copagoBase: calc.base,
      copagoFinal: calc.copagoFinal,
      descuento: calc.descuento,
      porcentaje: calc.pct,
      totalBoleta: calc.totalBoleta,
      patientName,
      patientRut,
      recommendations,
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
      {/* LEFT: catalog */}
      <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]">
        <SectionTitle>Categoría de examen</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {categoryOrder.map((cat) => {
            const meta = categoryMeta[cat];
            const Icon = icons[meta.icon];
            const active = activeCat === cat && !searchResults;
            return (
              <button
                key={cat}
                onClick={() => { setActiveCat(cat); setQuery(""); }}
                className={`group flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-center transition-all ${
                  active
                    ? "border-transparent bg-[var(--gradient-brand)] text-primary-foreground shadow-[var(--shadow-lift)]"
                    : "border-border bg-secondary/40 text-secondary-foreground hover:border-primary/40 hover:bg-secondary"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[11px] font-semibold leading-tight">{meta.short}</span>
              </button>
            );
          })}
        </div>

        <div className="relative mt-5">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar examen por nombre o descripción…"
            className="w-full rounded-xl border border-input bg-background py-3 pl-10 pr-10 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-4 max-h-[460px] space-y-2 overflow-y-auto pr-1">
          {list.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-muted-foreground">
              <Stethoscope className="h-8 w-8 opacity-40" />
              {searchResults ? "Sin resultados para tu búsqueda." : "Selecciona una categoría o busca un examen."}
            </div>
          )}
          {searchResults && (
            <p className="px-1 pb-1 text-xs font-medium text-muted-foreground">
              {searchResults.length} resultado(s)
            </p>
          )}
          {list.map(({ category, index, exam }) => {
            const isSel = selected?.category === category && selected.index === index;
            const meta = categoryMeta[category];
            return (
              <button
                key={category + index}
                onClick={() => { setSelected({ category, index }); }}
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                  isSel
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border bg-background hover:border-primary/40 hover:bg-secondary/40"
                }`}
              >
                <span
                  className="mt-0.5 inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground"
                  style={{ backgroundColor: meta.tint }}
                >
                  {meta.short}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-snug text-foreground">{exam.name}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-2">{exam.desc}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-bold text-foreground">{formatCLP(exam.part)}</span>
                  <span className="text-[10px] text-muted-foreground">particular</span>
                </span>
                {isSel && <Check className="mt-1 h-4 w-4 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT: convenio + cálculo */}
      <div className="space-y-5">
        <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]">
          <SectionTitle>Convenio y copago</SectionTitle>

          <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Examen seleccionado</p>
            <p className={`mt-1 text-sm font-semibold ${selectedExam ? "text-foreground" : "text-muted-foreground"}`}>
              {selectedExam ? selectedExam.name : "Ninguno"}
            </p>
            {selectedExam && (
              <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                <span>Particular <b className="text-foreground">{formatCLP(selectedExam.part)}</b></span>
                <span>FONASA A <b className="text-foreground">{formatCLP(selectedExam.fa)}</b></span>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-foreground">Convenio</span>
              <select
                value={convenio}
                onChange={(e) => setConvenio(e.target.value as Convenio)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
              >
                {(Object.keys(convenioMeta) as Convenio[]).map((c) => (
                  <option key={c} value={c}>{convenioMeta[c]}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-foreground">Copago base</span>
              <input
                inputMode="numeric"
                value={copago}
                onChange={(e) => setCopago(e.target.value)}
                placeholder="$0"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
            </label>
          </div>

          {/* results */}
          <div className="mt-4 space-y-2">
            <ResultRow label="Descuento convenio" value={calc ? `${calc.pct}%` : "0%"} />
            <ResultRow label="Monto descontado" value={formatCLP(calc?.descuento ?? 0)} />
            <ResultRow label="Copago final" value={formatCLP(calc?.copagoFinal ?? 0)} />
          </div>

          <div className="mt-3 rounded-xl bg-[var(--gradient-brand)] px-4 py-3.5 text-primary-foreground shadow-[var(--shadow-lift)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium opacity-90">Valor total a pagar</span>
              <span className="text-2xl font-bold tracking-tight">{formatCLP(calc?.totalBoleta ?? 0)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]">
          <SectionTitle>Datos y recomendaciones</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Nombre del paciente"
              className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30" />
            <input value={patientRut} onChange={(e) => setPatientRut(e.target.value)} placeholder="RUT"
              className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30" />
          </div>
          <textarea value={recommendations} onChange={(e) => setRecommendations(e.target.value)} rows={3}
            placeholder="Ej: 8 horas de ayuno, si es con contraste y mayor de 60 años, creatinina para RM…"
            className="mt-3 w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30" />

          <button
            onClick={handlePDF}
            disabled={!canPDF}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FileDown className="h-4 w-4" /> Generar cotización PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-foreground">{children}</h3>;
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-border pb-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}
