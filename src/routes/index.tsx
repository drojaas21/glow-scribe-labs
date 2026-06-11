import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  Scan, FlaskConical, Wallet, FileDown, User, GraduationCap,
  ShoppingCart, Trash2, Plus, Minus, FlaskConical as LabIcon,
  Landmark, Building2, ShieldCheck, Users, BookOpen,
  type LucideIcon,
} from "lucide-react";
import logo from "@/assets/logo-diagnopro.svg";
import { ExamQuoter, type CartItem } from "@/components/ExamQuoter";
import { LabQuoter, type LabCartItem } from "@/components/LabQuoter";
import { CashRegister } from "@/components/CashRegister";
import { StudyMode } from "@/components/StudyMode";
import { FonasaLookup } from "@/components/FonasaLookup";
import { discountMatrix, convenioMeta, categoryMeta, examDatabase, type Convenio, type LabExam } from "@/data/catalog";
import { formatCLP } from "@/lib/format";
import { generateCombinedPDF, type ExamCartPDFItem } from "@/lib/pdf";
import { usePriceOverrides } from "@/hooks/usePriceOverrides";
import { PriceEditor } from "@/components/PriceEditor";
import { ThemePicker } from "@/components/ThemePicker";

export const Route = createFileRoute("/")({
  component: Index,
});

type Tab = "examenes" | "laboratorio" | "caja" | "estudio" | "fonasa";
type Prevision = "particular" | "fa" | "fbcd";

const tabs: { id: Tab; label: string; icon: typeof Scan }[] = [
  { id: "examenes", label: "Imagenología", icon: Scan },
  { id: "laboratorio", label: "Laboratorio", icon: FlaskConical },
  { id: "caja", label: "Caja", icon: Wallet },
  { id: "estudio", label: "Estudio", icon: GraduationCap },
  { id: "fonasa", label: "Códigos FONASA", icon: BookOpen },
];

const previsionOpts: { key: Prevision; label: string }[] = [
  { key: "particular", label: "Particular" },
  { key: "fa", label: "FONASA A" },
  { key: "fbcd", label: "FONASA B/C/D" },
];

const convenioIcons: Record<Convenio, LucideIcon> = {
  particular: ShieldCheck,
  banco: Landmark,
  caja: Building2,
  araucana: Users,
};

function Index() {
  const [tab, setTab] = useState<Tab>("examenes");
  const [imagingCart, setImagingCart] = useState<CartItem[]>([]);
  const [labCart, setLabCart] = useState<LabCartItem[]>([]);
  const { overrides, setImagingOverride, setLabOverride, clearAll } = usePriceOverrides();
  const [prevision, setPrevision] = useState<Prevision>("particular");
  const [convenio, setConvenio] = useState<Convenio>("particular");
  const [patientName, setPatientName] = useState("");
  const [patientRut, setPatientRut] = useState("");
  const [observations, setObservations] = useState("");

  // ── Auto-contraste TAC ────────────────────────────────────────────────────
  const tacKeys = useMemo(
    () => imagingCart.filter(i => i.category === "tac").map(i => i.key).sort().join(","),
    [imagingCart]
  );
  useEffect(() => {
    setImagingCart(prev => {
      const tacItems = prev.filter(i => i.category === "tac");
      const nonContrast = prev.filter(i => i.category !== "contraste");
      if (tacItems.length === 0) return nonContrast;
      const hasAngio = tacItems.some(i => i.exam.name.includes("Angio"));
      const hasBody = tacItems.some(i => /Tórax|Abdomen|Pelvis|Cuello|Uro|Pielograf/i.test(i.exam.name));
      const contrastIdx = hasAngio ? 2 : hasBody ? 1 : 0;
      const contrastKey = `contraste::${contrastIdx}`;
      const existing = prev.find(i => i.category === "contraste");
      if (existing?.key === contrastKey) return prev;
      const contrastItem: CartItem = {
        key: contrastKey,
        category: "contraste",
        index: contrastIdx,
        exam: examDatabase.contraste[contrastIdx],
        qty: 1,
      };
      return [...nonContrast, contrastItem];
    });
  }, [tacKeys]);

  const imagingCount = imagingCart.reduce((s, i) => s + i.qty, 0);
  const labCount = labCart.reduce((s, i) => s + i.qty, 0);
  const totalCartCount = imagingCount + labCount;
  const hasAnything = totalCartCount > 0;

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

  const getLabPrice = (e: LabExam) => {
    const ov = overrides.lab[e.code];
    const particular = ov?.particular ?? e.particular;
    const fonasa_a = ov?.fonasa_a !== undefined ? ov.fonasa_a : e.fonasa_a;
    const fonasa_bcd = ov?.fonasa_bcd !== undefined ? ov.fonasa_bcd : e.fonasa_bcd;
    return prevision === "fa" ? (fonasa_a ?? particular) :
      prevision === "fbcd" ? (fonasa_bcd ?? particular) :
      particular;
  };

  const labSelectedTotal = labCart.reduce((s, i) => s + getLabPrice(i.exam) * i.qty, 0);
  const combinedTotal = imagingGrandTotal + labSelectedTotal;

  const changeImagingQty = (key: string, delta: number) => {
    setImagingCart((prev) =>
      prev
        .map((c) => c.key === key ? { ...c, qty: Math.max(1, c.qty + delta) } : c)
    );
  };
  const removeImaging = (key: string) => setImagingCart((prev) => prev.filter((c) => c.key !== key));
  const removeLab = (code: string) => setLabCart((prev) => prev.filter((i) => i.exam.code !== code));
  const changeLabQty = (code: string, delta: number) =>
    setLabCart((prev) =>
      prev.map((i) => i.exam.code === code ? { ...i, qty: Math.max(1, i.qty + delta) } : i)
    );

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

  const showSidebar = tab !== "estudio" && tab !== "caja";

  return (
    <div className="min-h-screen bg-gradient-soft">
      <header className="border-b border-border/70 bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="DiagnoPRO Temuco" className="h-9 w-auto" />
            <div className="hidden border-l border-border pl-3 sm:block">
              <p className="text-sm font-bold leading-tight text-foreground">Cotizador Clínico</p>
              <p className="text-xs text-muted-foreground">Imagenología · Laboratorio · Caja</p>
            </div>
          </div>
          <ThemePicker />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Cotizador de exámenes y laboratorio
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecciona exámenes, aplica convenios y genera cotizaciones en PDF al instante.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-5 inline-flex rounded-2xl border border-border bg-card p-1 shadow-[var(--shadow-card)]">
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

        {/* Main grid: catalog left, cart right */}
        {showSidebar ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
            {/* Left: catalog */}
            <div>
              <div className={tab === "examenes" ? "" : "hidden"}>
                <ExamQuoter
                  cart={imagingCart}
                  setCart={setImagingCart}
                  prevision={prevision}
                  convenio={convenio}
                  imagingOverrides={overrides.imaging}
                />
              </div>
              <div className={tab === "laboratorio" ? "" : "hidden"}>
                <LabQuoter cart={labCart} setCart={setLabCart} prevision={prevision} />
              </div>
              <div className={tab === "fonasa" ? "" : "hidden"}>
                <FonasaLookup labCart={labCart} setLabCart={setLabCart} />
              </div>
            </div>

            {/* Right: unified cart panel */}
            <div className="space-y-4">

              {/* Previsión */}
              <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
                <h3 className="mb-2.5 text-sm font-bold uppercase tracking-wide text-foreground">Previsión</h3>
                <div className="grid grid-cols-3 gap-2">
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

              {/* Convenio (only relevant for imaging) */}
              <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
                <h3 className="mb-2.5 text-sm font-bold uppercase tracking-wide text-foreground">Convenio comercial</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(convenioMeta) as Convenio[]).map((c) => {
                    const Icon = convenioIcons[c];
                    const isSel = convenio === c;
                    const anyPct = imagingCart.length > 0
                      ? (discountMatrix[imagingCart[0].category]?.[c] ?? 0)
                      : 0;
                    return (
                      <button
                        key={c}
                        onClick={() => setConvenio(c)}
                        className={`relative flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all ${
                          isSel ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-background hover:border-primary/40"
                        }`}
                      >
                        {c !== "particular" && (
                          <span className={`absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${anyPct > 0 ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                            {anyPct > 0 ? `-${anyPct}%` : "0%"}
                          </span>
                        )}
                        <Icon className={`h-4 w-4 shrink-0 ${isSel ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-[11px] font-semibold leading-tight text-foreground">{convenioMeta[c]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Unified cart */}
              <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    Carrito ({totalCartCount})
                  </h3>
                  {hasAnything && (
                    <button
                      onClick={() => { setImagingCart([]); setLabCart([]); }}
                      className="text-xs font-medium text-destructive hover:underline"
                    >
                      Vaciar todo
                    </button>
                  )}
                </div>

                {!hasAnything ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                    <ShoppingCart className="h-7 w-7 opacity-30" />
                    Agrega exámenes desde el catálogo.
                  </div>
                ) : (
                  <div className="max-h-[380px] space-y-1.5 overflow-y-auto pr-1">
                    {/* Imaging items */}
                    {imagingCart.length > 0 && (
                      <>
                        {imagingCart.length > 0 && labCart.length > 0 && (
                          <p className="flex items-center gap-1.5 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                            <Scan className="h-3 w-3" /> Imagenología
                          </p>
                        )}
                        {imagingCart.map((item) => {
                          const base = getImagingBase(item.exam);
                          const pct = discountMatrix[item.category]?.[convenio] ?? 0;
                          const discountedUnit = base - Math.round(base * (pct / 100));
                          const lineTotal = discountedUnit * item.qty;
                          const meta = categoryMeta[item.category];
                          return (
                            <div key={item.key} className="rounded-xl border border-border bg-background p-3">
                              <div className="flex items-start gap-2">
                                <span
                                  className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground"
                                  style={{ backgroundColor: meta.tint }}
                                >
                                  {meta.short}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-semibold text-foreground">{item.exam.name}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {formatCLP(base)} c/u
                                    {pct > 0 && <span className="ml-1 text-green-600">−{pct}% → {formatCLP(discountedUnit)}</span>}
                                  </p>
                                </div>
                                <button onClick={() => removeImaging(item.key)} className="shrink-0 text-muted-foreground hover:text-destructive">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <div className="mt-2 flex items-center justify-between">
                                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-1.5 py-1">
                                  <button
                                    onClick={() => changeImagingQty(item.key, -1)}
                                    className="flex h-5 w-5 items-center justify-center rounded text-foreground hover:bg-muted"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="w-5 text-center text-xs font-bold text-foreground">{item.qty}</span>
                                  <button
                                    onClick={() => changeImagingQty(item.key, 1)}
                                    className="flex h-5 w-5 items-center justify-center rounded bg-primary text-primary-foreground hover:opacity-90"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                                <span className="text-sm font-bold text-foreground">{formatCLP(lineTotal)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}

                    {/* Lab items */}
                    {labCart.length > 0 && (
                      <>
                        {imagingCart.length > 0 && labCart.length > 0 && (
                          <p className="flex items-center gap-1.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                            <LabIcon className="h-3 w-3" /> Laboratorio
                          </p>
                        )}
                        {labCart.map((item) => {
                          const unitPrice = getLabPrice(item.exam);
                          const lineTotal = unitPrice * item.qty;
                          const name = item.exam.name.replace(/\*PARTICULAR\*/gi, "").replace(/\s{2,}/g, " ").trim();
                          return (
                            <div key={item.exam.code} className="flex items-center gap-2 rounded-xl border border-border bg-background p-3">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold text-foreground">{name}</p>
                                <p className="text-[10px] text-muted-foreground">{item.exam.code} · {previsionLabel}</p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-secondary/40 px-1 py-0.5">
                                <button onClick={() => changeLabQty(item.exam.code, -1)} className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground">
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-4 text-center text-xs font-bold text-foreground">{item.qty}</span>
                                <button onClick={() => changeLabQty(item.exam.code, 1)} className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground">
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                              <span className="shrink-0 text-sm font-bold text-foreground">{lineTotal > 0 ? formatCLP(lineTotal) : "Consultar"}</span>
                              <button onClick={() => removeLab(item.exam.code)} className="shrink-0 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}

                {/* Totals */}
                {hasAnything && (
                  <div className="mt-4 space-y-2">
                    {imagingCart.length > 0 && labCart.length > 0 && (
                      <div className="space-y-1 text-xs">
                        {imagingCart.length > 0 && (
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>Imagenología</span>
                            <span className="font-semibold text-foreground">{formatCLP(imagingGrandTotal)}</span>
                          </div>
                        )}
                        {imagingDiscount > 0 && (
                          <div className="flex items-center justify-between text-green-600">
                            <span>Ahorro {convenioMeta[convenio]}</span>
                            <span className="font-semibold">−{formatCLP(imagingDiscount)}</span>
                          </div>
                        )}
                        {labCart.length > 0 && (
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>Laboratorio</span>
                            <span className="font-semibold text-foreground">{formatCLP(labSelectedTotal)}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {imagingCart.length > 0 && labCart.length === 0 && imagingDiscount > 0 && (
                      <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm">
                        <span className="font-semibold text-green-700">Ahorro {convenioMeta[convenio]}</span>
                        <span className="font-bold text-green-700">−{formatCLP(imagingDiscount)}</span>
                      </div>
                    )}
                    <div className="rounded-xl bg-gradient-brand px-4 py-4 text-primary-foreground shadow-[var(--shadow-lift)]">
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
                  </div>
                )}
              </div>

              {/* Patient data — below the cart */}
              <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground">
                  <User className="h-4 w-4 text-primary" />
                  Datos del paciente
                </h3>
                <div className="space-y-2.5">
                  <input
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Nombre del paciente"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                  />
                  <input
                    value={patientRut}
                    onChange={(e) => setPatientRut(e.target.value)}
                    placeholder="RUT"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                  />
                  <textarea
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    rows={2}
                    placeholder="Observación para incluir en la cotización… (opcional)"
                    className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                  />
                </div>

                <button
                  onClick={handleGeneratePDF}
                  disabled={!hasAnything}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FileDown className="h-4 w-4" />
                  {hasAnything ? "Generar cotización PDF" : "Agrega exámenes para cotizar"}
                </button>

                <a
                  href="/Encuesta_Consentimiento_RM.pdf"
                  download="Encuesta_Consentimiento_RM.pdf"
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary"
                >
                  <FileDown className="h-4 w-4 text-muted-foreground" />
                  Encuesta y Consentimiento RM
                </a>
              </div>

            </div>
          </div>
        ) : (
          /* Full-width for Caja, Estudio y FONASA */
          <div>
            <div className={tab === "caja" ? "" : "hidden"}>
              <CashRegister />
            </div>
            <div className={tab === "estudio" ? "" : "hidden"}>
              <StudyMode />
            </div>
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-7xl px-4 py-8 text-center text-xs text-muted-foreground sm:px-6">
        DiagnoPRO Temuco · Cotización referencial sujeta a confirmación.
      </footer>

      <PriceEditor
        overrides={overrides}
        setImagingOverride={setImagingOverride}
        setLabOverride={setLabOverride}
        clearAll={clearAll}
      />
    </div>
  );
}
