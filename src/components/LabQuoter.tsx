import { useMemo, useState } from "react";
import { Search, X, Plus, Trash2, FileDown, FlaskConical, Check, Layers, Clock, Info, AlertCircle } from "lucide-react";
import { labDatabase, type LabExam } from "@/data/catalog";
import { labProfiles, type LabProfile } from "@/data/profiles";
import { preparationNotes, scheduleInfo, bloodSampleNote } from "@/data/preparation";
import { soloParticularCodes } from "@/data/soloParticular";
import { formatCLP, normalize } from "@/lib/format";
import { generateLabPDF } from "@/lib/pdf";

export function LabQuoter() {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<LabExam[]>([]);
  const [patientName, setPatientName] = useState("");
  const [patientRut, setPatientRut] = useState("");

  const { mainResults, soloResults } = useMemo(() => {
    const all = query.trim().length < 2
      ? labDatabase
      : (() => {
          const q = normalize(query);
          return labDatabase.filter(
            (e) => normalize(e.name).includes(q) || e.code.includes(query.trim())
          );
        })();

    const main: LabExam[] = [];
    const solo: LabExam[] = [];
    for (const e of all) {
      if (soloParticularCodes.has(e.code)) solo.push(e);
      else main.push(e);
    }
    return {
      mainResults: main.slice(0, 60),
      soloResults: solo,
    };
  }, [query]);

  const add = (e: LabExam) => {
    if (cart.some((c) => c.code === e.code)) return;
    setCart((p) => [...p, e]);
  };
  const remove = (code: string) => setCart((p) => p.filter((c) => c.code !== code));

  const addProfile = (p: LabProfile) => {
    const dbEntry = p.code ? labDatabase.find((e) => e.code === p.code) : undefined;
    const item: LabExam = dbEntry || {
      code: `PERFIL-${p.name}`,
      name: p.name,
      fonasa_bcd: p.fonasa_bcd ?? null,
      fonasa_a: p.fonasa_a,
      particular: p.particular ?? 0,
      obs: p.code ? "" : "PERFIL · CONSULTAR",
    };
    add(item);
  };

  const totalFonasaA = cart.reduce((s, e) => s + (e.fonasa_a ?? e.particular), 0);
  const totalFonasaBcd = cart.reduce((s, e) => s + (e.fonasa_bcd ?? e.particular), 0);
  const totalPart = cart.reduce((s, e) => s + e.particular, 0);

  const obsStyle = (obs: string, isSolo: boolean) => {
    if (isSolo) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    const o = obs.toUpperCase();
    if (o.includes("NO SE REALIZA")) return "bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400";
    if (o.includes("PARTICULAR")) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    if (o.includes("BOLETA")) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    return "bg-accent/20 text-accent-foreground";
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
      {/* LEFT column — must have min-w-0 so grid tracks don't blow out */}
      <div className="min-w-0 space-y-5">
        {/* Profiles */}
        <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]">
          <h3 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground">
            <Layers className="h-4 w-4 text-primary" /> Perfiles destacados
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Agrupaciones frecuentes. Haz clic para agregar a la cotización.
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {labProfiles.map((p) => {
              const cartKey = p.code ?? `PERFIL-${p.name}`;
              const inCart = cart.some((c) => c.code === cartKey);
              const fg = p.textDark ? "text-gray-900" : "text-white";
              const fgSub = p.textDark ? "text-gray-800/70" : "text-white/80";
              const btnBg = p.textDark ? "bg-black/15 hover:bg-black/25" : "bg-white/25 hover:bg-white/40";
              return (
                <div key={p.name} className="overflow-hidden rounded-xl border border-border bg-background">
                  {/* Header bar */}
                  <div
                    className="flex min-w-0 items-center justify-between gap-2 px-3 py-2"
                    style={{ backgroundColor: p.tint }}
                  >
                    <div className="min-w-0">
                      <span className={`block truncate text-xs font-bold drop-shadow-sm ${fg}`}>{p.name}</span>
                      {p.code && !/^PERFIL/.test(p.code) && !/^[A-Z]/.test(p.code) && (
                        <span className={`font-mono text-[10px] ${fgSub}`}>{p.code}</span>
                      )}
                    </div>
                    <button
                      onClick={() => addProfile(p)}
                      disabled={inCart}
                      className={`shrink-0 flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold backdrop-blur transition disabled:opacity-50 ${btnBg} ${fg}`}
                    >
                      {inCart ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      {inCart ? "Agregado" : "Agregar"}
                    </button>
                  </div>
                  {/* Body */}
                  <div className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {p.items.map((it) => (
                        <span
                          key={it.name + (it.code ?? "")}
                          className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground"
                        >
                          <span className="max-w-[100px] truncate">{it.name}</span>
                          {it.code && (
                            <span className="shrink-0 font-mono text-[9px] opacity-55">{it.code}</span>
                          )}
                        </span>
                      ))}
                    </div>
                    {p.note && (
                      <p className="mt-1.5 text-[10px] italic text-amber-700 dark:text-amber-400">{p.note}</p>
                    )}
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      {p.particular != null
                        ? (
                          <>
                            Particular <b className="text-foreground">{formatCLP(p.particular)}</b>
                            {p.fonasa_a != null && <> · FONASA A <b className="text-foreground">{formatCLP(p.fonasa_a)}</b></>}
                          </>
                        )
                        : <span className="font-semibold text-primary">Valor a confirmar en atención</span>}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Catalog */}
        <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-foreground">Catálogo de laboratorio</h3>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por código FONASA o nombre…"
              className="w-full rounded-xl border border-input bg-background py-3 pl-10 pr-10 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="mt-2 px-1 text-xs text-muted-foreground">
            {query.trim().length < 2
              ? `${labDatabase.length} exámenes en catálogo`
              : `${mainResults.length + soloResults.length} resultado(s)`}
          </p>

          <div className="mt-2 max-h-[520px] space-y-2 overflow-y-auto pr-1">
            <ExamList items={mainResults} cart={cart} onAdd={add} obsStyle={obsStyle} isSolo={false} />

            {soloResults.length > 0 && (
              <>
                <div className="sticky top-0 z-10 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-800 dark:bg-red-950/40">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400" />
                  <p className="text-[11px] font-semibold text-red-700 dark:text-red-400">
                    Solo Particulares — Exámenes no realizados internamente
                  </p>
                </div>
                <ExamList items={soloResults} cart={cart} onAdd={add} obsStyle={obsStyle} isSolo={true} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT column */}
      <div className="min-w-0 space-y-5">
        {/* Cart */}
        <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
              Cotización ({cart.length})
            </h3>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-xs font-medium text-destructive hover:underline">
                Vaciar
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
              <FlaskConical className="h-8 w-8 opacity-40" />
              Agrega exámenes desde el catálogo.
            </div>
          ) : (
            <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
              {cart.map((e) => {
                const isSolo = soloParticularCodes.has(e.code);
                return (
                  <div key={e.code} className={`flex items-center gap-2 rounded-lg border p-2.5 ${isSolo ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20" : "border-border bg-background"}`}>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-xs font-semibold ${isSolo ? "text-red-700 dark:text-red-400" : "text-foreground"}`}>
                        {e.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {e.code} · {e.particular > 0 ? formatCLP(e.particular) : "Consultar"}
                        {e.obs?.trim() && <span className="ml-1 opacity-70">· {e.obs.trim()}</span>}
                      </p>
                    </div>
                    <button onClick={() => remove(e.code)} className="shrink-0 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between border-b border-dashed border-border pb-2 text-sm">
              <span className="text-muted-foreground">Total FONASA A</span>
              <span className="font-semibold text-foreground">{formatCLP(totalFonasaA)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-dashed border-border pb-2 text-sm">
              <span className="text-muted-foreground">Total FONASA B / C / D</span>
              <span className="font-semibold text-foreground">{formatCLP(totalFonasaBcd)}</span>
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-gradient-brand px-4 py-3.5 text-primary-foreground shadow-[var(--shadow-lift)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium opacity-90">Total particular</span>
              <span className="text-2xl font-bold tracking-tight">{formatCLP(totalPart)}</span>
            </div>
          </div>
        </div>

        {/* Patient + PDF + Preparation notes */}
        <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="grid grid-cols-2 gap-3">
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
          <button
            onClick={() => cart.length && generateLabPDF({ items: cart, patientName, patientRut })}
            disabled={cart.length === 0}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FileDown className="h-4 w-4" /> Generar cotización PDF
          </button>

          {/* Preparation instructions */}
          <div className="mt-4 space-y-3 rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 shrink-0 text-primary" />
              <p className="text-[11px] font-semibold text-foreground">Horario de toma de muestras</p>
            </div>
            <div className="space-y-0.5 pl-5">
              <p className="text-[10.5px] text-muted-foreground">{scheduleInfo.weekdays}</p>
              <p className="text-[10.5px] text-muted-foreground">{scheduleInfo.saturday}</p>
            </div>
            {preparationNotes.map((n) => (
              <div key={n.title} className="flex gap-2">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-[10.5px] font-semibold text-foreground">{n.title}</p>
                  <p className="text-[10px] leading-relaxed text-muted-foreground">{n.text}</p>
                </div>
              </div>
            ))}
            <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 dark:border-amber-800 dark:bg-amber-950/30">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-[10px] leading-relaxed text-amber-800 dark:text-amber-300">{bloodSampleNote}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExamList({
  items,
  cart,
  onAdd,
  obsStyle,
  isSolo,
}: {
  items: LabExam[];
  cart: LabExam[];
  onAdd: (e: LabExam) => void;
  obsStyle: (obs: string, isSolo: boolean) => string;
  isSolo: boolean;
}) {
  return (
    <>
      {items.map((e) => {
        const inCart = cart.some((c) => c.code === e.code);
        const isNotAvailable = e.obs.toUpperCase().includes("NO SE REALIZA");
        return (
          <div
            key={e.code}
            className={`flex items-start gap-3 rounded-xl border p-3 ${
              isSolo
                ? "border-red-200 bg-red-50/40 dark:border-red-900/60 dark:bg-red-950/20"
                : "border-border bg-background"
            } ${isNotAvailable ? "opacity-55" : ""}`}
          >
            <span className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold ${isSolo ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" : "bg-secondary text-secondary-foreground"}`}>
              {e.code}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold leading-snug ${isSolo ? "text-red-700 dark:text-red-400" : "text-foreground"}`}>
                {e.name}
              </p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                {!isNotAvailable && (
                  <>
                    {e.fonasa_a != null && <span>FONASA A <b className="text-foreground">{formatCLP(e.fonasa_a)}</b></span>}
                    {e.fonasa_bcd != null && <span>FONASA B/C/D <b className="text-foreground">{formatCLP(e.fonasa_bcd)}</b></span>}
                    {e.particular > 0 && <span>Particular <b className={isSolo ? "text-red-700 dark:text-red-400" : "text-foreground"}>{formatCLP(e.particular)}</b></span>}
                  </>
                )}
                {e.obs?.trim() && (
                  <span className={`rounded px-1.5 font-semibold ${obsStyle(e.obs, isSolo)}`}>{e.obs.trim()}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => onAdd(e)}
              disabled={inCart || isNotAvailable}
              className="shrink-0 rounded-lg bg-primary p-2 text-primary-foreground transition hover:opacity-90 disabled:opacity-30"
              title={isNotAvailable ? "No disponible" : inCart ? "Ya en cotización" : "Agregar"}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </>
  );
}
