import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Scan, FlaskConical, Wallet, FileDown, User } from "lucide-react";
import logo from "@/assets/logo-diagnopro.svg";
import { ExamQuoter, type CartItem } from "@/components/ExamQuoter";
import { LabQuoter } from "@/components/LabQuoter";
import { CashRegister } from "@/components/CashRegister";
import { discountMatrix, convenioMeta, type Convenio, type LabExam } from "@/data/catalog";
import { formatCLP } from "@/lib/format";
import { generateCombinedPDF, type ExamCartPDFItem } from "@/lib/pdf";

export const Route = createFileRoute("/")({
  component: Index,
});

type Tab = "examenes" | "laboratorio" | "caja";
type Prevision = "particular" | "fa" | "fbcd";

const tabs: { id: Tab; label: string; icon: typeof Scan }[] = [
  { id: "examenes", label: "Imagenología", icon: Scan },
  { id: "laboratorio", label: "Laboratorio", icon: FlaskConical },
  { id: "caja", label: "Caja", icon: Wallet },
];

const previsionOpts: { key: Prevision; label: string }[] = [
  { key: "particular", label: "Particular" },
  { key: "fa", label: "FONASA A" },
  { key: "fbcd", label: "FONASA B/C/D" },
];

function Index() {
  const [tab, setTab] = useState<Tab>("examenes");
  const [imagingCart, setImagingCart] = useState<CartItem[]>([]);
  const [labCart, setLabCart] = useState<LabExam[]>([]);
  const [prevision, setPrevision] = useState<Prevision>("particular");
  const [convenio, setConvenio] = useState<Convenio>("particular");
  const [patientName, setPatientName] = useState("");
  const [patientRut, setPatientRut] = useState("");
  const [observations, setObservations] = useState("");

  const imagingCount = imagingCart.reduce((s, i) => s + i.qty, 0);
  const labCount = labCart.length;
  const hasAnything = imagingCount > 0 || labCount > 0;

  const previsionLabel =
    prevision === "particular" ? "Particular" : prevision === "fa" ? "FONASA A" : "FONASA B/C/D";

  const getImagingBase = (exam: CartItem["exam"]) =>
    prevision === "particular" ? exam.part : prevision === "fa" ? exam.fa : exam.fbcd;

  const imagingGrandTotal = imagingCart.reduce((s, item) => {
    const base = getImagingBase(item.exam);
    const pct = discountMatrix[item.category]?.[convenio] ?? 0;
    return s + (base - Math.round(base * (pct / 100))) * item.qty;
  }, 0);

  const imagingRawTotal = imagingCart.reduce((s, item) => s + getImagingBase(item.exam) * item.qty, 0);
  const imagingDiscount = imagingRawTotal - imagingGrandTotal;

  const labSelectedTotal = labCart.reduce((s, e) => {
    const price =
      prevision === "fa" ? (e.fonasa_a ?? e.particular) :
      prevision === "fbcd" ? (e.fonasa_bcd ?? e.particular) :
      e.particular;
    return s + price;
  }, 0);

  const combinedTotal = imagingGrandTotal + labSelectedTotal;

  const handleGeneratePDF = () => {
    const imagingItems: ExamCartPDFItem[] = imagingCart.map((item) => {
      const base = getImagingBase(item.exam);
      const pct = discountMatrix[item.category]?.[convenio] ?? 0;
      const discountAmt = Math.round(base * (pct / 100));
      const discountedUnit = base - discountAmt;
      return {
        exam: item.exam,
        category: item.category,
        qty: item.qty,
        convenio,
        prevision,
        baseUnit: base,
        discountPct: pct,
        discountAmt: discountAmt * item.qty,
        discountedUnit,
        lineTotal: discountedUnit * item.qty,
      };
    });
    generateCombinedPDF({
      imagingItems,
      labItems: labCart,
      patientName,
      patientRut,
      previsionLabel,
      previsionKey: prevision,
      convenioLabel: convenioMeta[convenio],
      imagingTotal: imagingGrandTotal,
      imagingDiscount,
      labTotal: labSelectedTotal,
      grandTotal: combinedTotal,
      observations,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <header className="border-b border-border/70 bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="DiagnoPRO Temuco" className="h-9 w-auto" />
            <div className="hidden border-l border-border pl-3 sm:block">
              <p className="text-sm font-bold leading-tight text-foreground">Cotizador Clínico</p>
              <p className="text-xs text-muted-foreground">Imagenología · Laboratorio · Caja</p>
            </div>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-secondary-foreground">
            Temuco
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Cotizador de exámenes y laboratorio
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecciona exámenes, aplica convenios y genera cotizaciones en PDF al instante.
          </p>
        </div>

        {/* ── Paciente y previsión (shared) ── */}
        <div className="mb-5 rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground">
            <User className="h-4 w-4 text-primary" />
            Datos del paciente y previsión
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Nombre del paciente"
              className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
            <input
              value={patientRut}
              onChange={(e) => setPatientRut(e.target.value)}
              placeholder="RUT"
              className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {previsionOpts.map((p) => {
              const isSel = prevision === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => setPrevision(p.key)}
                  className={`rounded-xl border px-2 py-2.5 text-center text-[11px] font-semibold transition-all ${
                    isSel
                      ? "border-transparent bg-gradient-brand text-primary-foreground shadow-[var(--shadow-lift)]"
                      : "border-border bg-background text-foreground hover:border-primary/40"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="mb-6 inline-flex rounded-2xl border border-border bg-card p-1 shadow-[var(--shadow-card)]">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            const badge =
              t.id === "examenes" ? imagingCount :
              t.id === "laboratorio" ? labCount : 0;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                  active
                    ? "bg-gradient-brand text-primary-foreground shadow-[var(--shadow-lift)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.label}</span>
                {badge > 0 && (
                  <span className={`min-w-[18px] rounded-full px-1 text-center text-[10px] font-bold leading-[18px] ${
                    active ? "bg-white/30 text-white" : "bg-primary text-primary-foreground"
                  }`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className={tab === "examenes" ? "" : "hidden"}>
          <ExamQuoter
            cart={imagingCart}
            setCart={setImagingCart}
            prevision={prevision}
            convenio={convenio}
            setConvenio={setConvenio}
          />
        </div>
        <div className={tab === "laboratorio" ? "" : "hidden"}>
          <LabQuoter cart={labCart} setCart={setLabCart} prevision={prevision} />
        </div>
        <div className={tab === "caja" ? "" : "hidden"}>
          <CashRegister />
        </div>

        {/* ── Resumen y cotización ── */}
        {hasAnything && (
          <div className="mt-6 rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground">
              <FileDown className="h-4 w-4 text-primary" />
              Resumen y cotización
            </h3>

            <div className={`grid gap-3 ${imagingCount > 0 && labCount > 0 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
              {imagingCount > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-4 py-3">
                  <div>
                    <p className="text-xs font-bold text-foreground">Imagenología</p>
                    <p className="text-[10px] text-muted-foreground">
                      {imagingCount} unidad(es) · {convenioMeta[convenio]}
                    </p>
                    {imagingDiscount > 0 && (
                      <p className="text-[10px] font-semibold text-green-600 dark:text-green-400">
                        Ahorro: {formatCLP(imagingDiscount)}
                      </p>
                    )}
                  </div>
                  <span className="text-xl font-bold text-foreground">{formatCLP(imagingGrandTotal)}</span>
                </div>
              )}
              {labCount > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-4 py-3">
                  <div>
                    <p className="text-xs font-bold text-foreground">Laboratorio</p>
                    <p className="text-[10px] text-muted-foreground">
                      {labCount} examen(es) · {previsionLabel}
                    </p>
                  </div>
                  <span className="text-xl font-bold text-foreground">{formatCLP(labSelectedTotal)}</span>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-xl bg-gradient-brand px-4 py-4 text-primary-foreground shadow-[var(--shadow-lift)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-medium opacity-90">Total a pagar</span>
                  <p className="text-[10px] opacity-70">
                    {previsionLabel}{convenio !== "particular" ? ` · ${convenioMeta[convenio]}` : ""}
                  </p>
                </div>
                <span className="text-3xl font-bold tracking-tight">{formatCLP(combinedTotal)}</span>
              </div>
            </div>

            <div className="mt-4">
              <span className="mb-1 block text-xs font-semibold text-foreground">Observación (opcional)</span>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={2}
                placeholder="Observación para incluir en la cotización…"
                className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
            </div>

            <button
              onClick={handleGeneratePDF}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              <FileDown className="h-4 w-4" />
              Generar cotización PDF completa
            </button>
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-muted-foreground sm:px-6">
        DiagnoPRO Temuco · Cotización referencial sujeta a confirmación.
      </footer>
    </div>
  );
}
