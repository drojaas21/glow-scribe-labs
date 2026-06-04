import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  Search, X, Plus, Minus, FlaskConical, Check,
  Layers, AlertCircle, ChevronDown, Hash, FileText,
} from "lucide-react";
import { labDatabase, type LabExam } from "@/data/catalog";
import { labProfiles, type LabProfile } from "@/data/profiles";
import { soloParticularCodes } from "@/data/soloParticular";
import { formatCLP, normalize } from "@/lib/format";
import { generateLabIndicacionesPDF } from "@/lib/pdf";

export type LabCartItem = { exam: LabExam; qty: number };

const blockedCodes = new Set(["0301095", "0306118", "0306123"]);

function cleanName(name: string): string {
  return name.replace(/\*PARTICULAR\*/gi, "").replace(/\s{2,}/g, " ").trim();
}

function isBlocked(e: LabExam): boolean {
  return blockedCodes.has(e.code) || e.obs.toUpperCase().includes("NO SE REALIZA");
}

export function LabQuoter({
  cart,
  setCart,
  prevision,
}: {
  cart: LabCartItem[];
  setCart: Dispatch<SetStateAction<LabCartItem[]>>;
  prevision: "particular" | "fa" | "fbcd";
}) {
  const [nameQuery, setNameQuery] = useState("");
  const [codeQuery, setCodeQuery] = useState("");
  const [profilesOpen, setProfilesOpen] = useState(false);

  const isSearching = nameQuery.trim().length >= 2 || codeQuery.trim().length >= 1;

  const { mainResults, soloResults } = useMemo(() => {
    const nq = normalize(nameQuery);
    const cq = codeQuery.trim().toLowerCase();

    const seen = new Set<string>();
    const unique = labDatabase.filter((e) => {
      if (seen.has(e.code)) return false;
      seen.add(e.code);
      return true;
    });

    const filtered = !isSearching
      ? unique
      : unique.filter((e) => {
          const nameMatch = nq.length >= 2
            ? normalize(cleanName(e.name)).includes(nq)
            : true;
          const codeMatch = cq.length >= 1
            ? e.code.toLowerCase().includes(cq)
            : true;
          return nameMatch && codeMatch;
        });

    const main: LabExam[] = [];
    const solo: LabExam[] = [];
    for (const e of filtered) {
      if (soloParticularCodes.has(e.code)) solo.push(e);
      else main.push(e);
    }
    return { mainResults: main.slice(0, 100), soloResults: solo.slice(0, 30) };
  }, [nameQuery, codeQuery, isSearching]);

  const add = (e: LabExam) => {
    setCart((p) => {
      const existing = p.find((i) => i.exam.code === e.code);
      if (existing) return p.map((i) => i.exam.code === e.code ? { ...i, qty: i.qty + 1 } : i);
      return [...p, { exam: e, qty: 1 }];
    });
  };

  const changeQty = (code: string, delta: number) => {
    setCart((p) =>
      p.map((i) => i.exam.code === code ? { ...i, qty: Math.max(1, i.qty + delta) } : i)
    );
  };

  const addProfile = (p: LabProfile) => {
    const dbEntry = p.code ? labDatabase.find((e) => e.code === p.code) : undefined;
    const item: LabExam = dbEntry || {
      code: `PERFIL-${p.name}`,
      name: p.name,
      fonasa_bcd: p.fonasa_bcd ?? null,
      fonasa_a: p.fonasa_a,
      particular: p.particular ?? 0,
      obs: "",
    };
    add(item);
  };

  const clearSearch = () => { setNameQuery(""); setCodeQuery(""); };

  void prevision;

  const totalResults = mainResults.length + soloResults.length;

  return (
    <div className="min-w-0 space-y-5">
      {/* Profiles */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
        <button
          onClick={() => setProfilesOpen((v) => !v)}
          className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-secondary/40"
        >
          <Layers className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <span className="text-sm font-bold uppercase tracking-wide text-foreground">
              Perfiles destacados
            </span>
            <span className="ml-2 text-xs text-muted-foreground">
              ({labProfiles.length} agrupaciones)
            </span>
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${profilesOpen ? "rotate-180" : ""}`}
          />
        </button>

        {profilesOpen && (
          <div className="border-t border-border px-5 pb-5 pt-4">
            <p className="mb-3 text-xs text-muted-foreground">
              Haz clic en "Agregar" para incluir el perfil en la cotización.
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {labProfiles.map((p) => <ProfileCard key={p.name} p={p} cart={cart} onAdd={addProfile} />)}
            </div>
          </div>
        )}
      </div>

      {/* Indicaciones download */}
      <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <FileText className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Indicaciones para el paciente</p>
              <p className="text-xs text-muted-foreground">Ayuno, horarios, orina y documentos requeridos</p>
            </div>
          </div>
          <button
            onClick={() => generateLabIndicacionesPDF()}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/15 active:scale-95"
          >
            <FileText className="h-3.5 w-3.5" />
            Descargar PDF
          </button>
        </div>
      </div>

      {/* Catalog */}
      <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-foreground">Catálogo de laboratorio</h3>

        {/* Dual search */}
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder="Buscar por nombre del examen…"
              className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-9 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
            {nameQuery && (
              <button onClick={() => setNameQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="relative">
            <Hash className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={codeQuery}
              onChange={(e) => setCodeQuery(e.target.value)}
              placeholder="Buscar por código FONASA: 0301026…"
              className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-9 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
            {codeQuery && (
              <button onClick={() => setCodeQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <p className="mt-2 px-1 text-xs text-muted-foreground">
          {isSearching
            ? <>{totalResults} resultado(s) · <button onClick={clearSearch} className="font-medium text-primary hover:underline">Limpiar</button></>
            : <>{labDatabase.length} exámenes en catálogo</>
          }
        </p>

        <div className="mt-2 max-h-[520px] space-y-2 overflow-y-auto pr-1">
          <ExamList items={mainResults} cart={cart} onAdd={add} onChangeQty={changeQty} />

          {soloResults.length > 0 && (
            <>
              <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 dark:border-orange-700 dark:bg-orange-950/40">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-orange-500 dark:text-orange-400" />
                <p className="text-[11px] font-semibold text-orange-700 dark:text-orange-400">
                  Solo Particulares — Exámenes externos ({soloResults.length})
                </p>
              </div>
              <ExamList items={soloResults} cart={cart} onAdd={add} onChangeQty={changeQty} isSolo />
            </>
          )}

          {totalResults === 0 && isSearching && (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
              <FlaskConical className="h-8 w-8 opacity-30" />
              Sin resultados. Intenta con otro nombre o código.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileCard({ p, cart, onAdd }: { p: LabProfile; cart: LabCartItem[]; onAdd: (p: LabProfile) => void }) {
  const cartKey = p.code ?? `PERFIL-${p.name}`;
  const inCart = cart.some((c) => c.exam.code === cartKey);
  const fg = p.textDark ? "text-gray-900" : "text-white";
  const fgSub = p.textDark ? "text-gray-800/70" : "text-white/80";
  const btnBg = p.textDark ? "bg-black/15 hover:bg-black/25" : "bg-white/25 hover:bg-white/40";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-2.5" style={{ backgroundColor: p.tint }}>
        <div className="min-w-0 flex-1">
          <span className={`block truncate text-xs font-bold drop-shadow-sm ${fg}`}>{p.name}</span>
          {p.code && /^\d/.test(p.code) && (
            <span className={`font-mono text-[10px] ${fgSub}`}>{p.code}</span>
          )}
        </div>
        {p.particular != null && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${btnBg} ${fg}`}>
            {formatCLP(p.particular)}
          </span>
        )}
        <button
          onClick={() => onAdd(p)}
          disabled={inCart}
          className={`shrink-0 flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold backdrop-blur transition disabled:opacity-50 ${btnBg} ${fg}`}
        >
          {inCart ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {inCart ? "Agregado" : "Agregar"}
        </button>
      </div>

      <div className="px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {p.items.map((it) => (
            <span
              key={it.name + (it.code ?? "")}
              className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground"
            >
              <span className="max-w-[120px] truncate">{it.name}</span>
              {it.code && <span className="shrink-0 font-mono text-[9px] opacity-55">{it.code}</span>}
            </span>
          ))}
        </div>
        {p.note && (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] italic text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            {p.note}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
          {p.fonasa_a != null && <span>FONASA A <b className="text-foreground">{formatCLP(p.fonasa_a)}</b></span>}
          {p.fonasa_bcd != null && <span>FONASA B/C/D <b className="text-foreground">{formatCLP(p.fonasa_bcd)}</b></span>}
          {p.particular == null && <span className="font-semibold text-primary">Valor a confirmar</span>}
        </div>
      </div>
    </div>
  );
}

function ExamList({
  items,
  cart,
  onAdd,
  onChangeQty,
  isSolo = false,
}: {
  items: LabExam[];
  cart: LabCartItem[];
  onAdd: (e: LabExam) => void;
  onChangeQty: (code: string, delta: number) => void;
  isSolo?: boolean;
}) {
  return (
    <>
      {items.map((e, idx) => {
        const cartItem = cart.find((c) => c.exam.code === e.code);
        const inCart = !!cartItem;
        const blocked = isBlocked(e);
        const isBoleta = !isSolo && e.obs?.toUpperCase().includes("BOLETA");

        let cardCls = "border-border bg-background";
        if (isSolo) cardCls = "border-orange-200 bg-orange-50/40 dark:border-orange-800/60 dark:bg-orange-950/20";
        else if (isBoleta) cardCls = "border-amber-200 bg-amber-50/40 dark:border-amber-800 dark:bg-amber-950/10";

        const nameCls = isSolo ? "text-orange-700 dark:text-orange-400" : "text-foreground";
        let codeCls = "bg-secondary text-secondary-foreground";
        if (isSolo) codeCls = "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400";
        else if (isBoleta) codeCls = "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";

        return (
          <div key={`${e.code}-${idx}`} className={`flex items-start gap-3 rounded-xl border p-3 ${cardCls} ${blocked ? "opacity-50" : ""}`}>
            <span className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold ${codeCls}`}>
              {e.code}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold leading-snug ${nameCls}`}>
                {cleanName(e.name)}
              </p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                {!blocked ? (
                  <>
                    {e.fonasa_a != null && <span>FONASA A <b className="text-foreground">{formatCLP(e.fonasa_a)}</b></span>}
                    {e.fonasa_bcd != null && <span>FONASA B/C/D <b className="text-foreground">{formatCLP(e.fonasa_bcd)}</b></span>}
                    {e.particular > 0 && (
                      <span>Particular <b className={isSolo ? "text-orange-700 dark:text-orange-400" : "text-foreground"}>{formatCLP(e.particular)}</b></span>
                    )}
                    {isBoleta && (
                      <span className="rounded bg-amber-100 px-1.5 font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">BOLETA</span>
                    )}
                  </>
                ) : (
                  <span className="rounded bg-slate-100 px-1.5 font-semibold text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                    No disponible
                  </span>
                )}
              </div>
            </div>

            {inCart && !blocked ? (
              <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-1.5 py-1">
                <button
                  onClick={() => onChangeQty(e.code, -1)}
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-background text-foreground hover:bg-muted"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-5 text-center text-sm font-bold text-primary">{cartItem.qty}</span>
                <button
                  onClick={() => onChangeQty(e.code, 1)}
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground hover:opacity-90"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onAdd(e)}
                disabled={blocked}
                className="shrink-0 rounded-lg bg-primary p-2 text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
                title={blocked ? "No disponible en este laboratorio" : "Agregar"}
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      })}
    </>
  );
}
