import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  Brain, ScanLine, Waves, Bone, HeartPulse, Droplets, Activity,
  Search, X, Stethoscope, Plus, Minus, ChevronDown, MapPin,
  type LucideIcon,
} from "lucide-react";
import {
  examDatabase, categoryMeta, categoryOrder,
  type Exam, type ExamCategory, type Convenio,
} from "@/data/catalog";
import { formatCLP, normalize } from "@/lib/format";
import { getExamCovers, examMatchesZone } from "@/data/examCovers";

const icons: Record<string, LucideIcon> = { Brain, ScanLine, Waves, Bone, HeartPulse, Droplets, Activity };

export type CartItem = {
  key: string;
  category: ExamCategory;
  index: number;
  exam: Exam;
  qty: number;
};

export function ExamQuoter({
  cart,
  setCart,
  prevision,
  convenio,
}: {
  cart: CartItem[];
  setCart: Dispatch<SetStateAction<CartItem[]>>;
  prevision: "particular" | "fa" | "fbcd";
  convenio: Convenio;
}) {
  const [activeCat, setActiveCat] = useState<ExamCategory | null>(null);
  const [nameQuery, setNameQuery] = useState("");
  const [zoneQuery, setZoneQuery] = useState("");
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const isSearching = nameQuery.trim().length >= 2 || zoneQuery.trim().length >= 2;

  const searchResults = useMemo(() => {
    if (!isSearching) return null;
    const nq = normalize(nameQuery);
    const zq = normalize(zoneQuery);
    const out: { category: ExamCategory; index: number; exam: Exam }[] = [];
    (Object.keys(examDatabase) as ExamCategory[]).forEach((cat) => {
      examDatabase[cat].forEach((exam, index) => {
        const nameMatch = nq.length >= 2
          ? (normalize(exam.name).includes(nq) || normalize(exam.desc).includes(nq))
          : true;
        const zoneMatch = zq.length >= 2
          ? examMatchesZone(exam.name, zq)
          : true;
        if (nameMatch && zoneMatch) out.push({ category: cat, index, exam });
      });
    });
    return out;
  }, [nameQuery, zoneQuery, isSearching]);

  const list = useMemo(() => {
    if (searchResults) return searchResults;
    if (!activeCat) return [];
    return examDatabase[activeCat].map((exam, index) => ({ category: activeCat, index, exam }));
  }, [searchResults, activeCat]);

  const addToCart = (category: ExamCategory, index: number, exam: Exam) => {
    const key = `${category}::${index}`;
    setCart((prev) => {
      const existing = prev.find((c) => c.key === key);
      if (existing) return prev.map((c) => c.key === key ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { key, category, index, exam, qty: 1 }];
    });
  };

  const changeQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => c.key === key ? { ...c, qty: Math.max(1, c.qty + delta) } : c)
    );
  };

  const toggleExpanded = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getBasePrice = (exam: Exam) =>
    prevision === "particular" ? exam.part : prevision === "fa" ? exam.fa : exam.fbcd;

  const clearSearch = () => { setNameQuery(""); setZoneQuery(""); };

  return (
    <div className="min-w-0 rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-foreground">Categoría de examen</h3>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {categoryOrder.map((cat) => {
          const meta = categoryMeta[cat];
          const Icon = icons[meta.icon];
          const active = activeCat === cat && !isSearching;
          return (
            <button
              key={cat}
              onClick={() => { setActiveCat(cat); clearSearch(); }}
              className={`group flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-center transition-all ${
                active
                  ? "border-transparent bg-gradient-brand text-primary-foreground shadow-[var(--shadow-lift)]"
                  : "border-border bg-secondary/40 text-secondary-foreground hover:border-primary/40 hover:bg-secondary"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[11px] font-semibold leading-tight">{meta.short}</span>
            </button>
          );
        })}
      </div>

      {/* ── Dual search ── */}
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {/* Name search */}
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
        {/* Zone search */}
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={zoneQuery}
            onChange={(e) => setZoneQuery(e.target.value)}
            placeholder="Buscar por zona del cuerpo: mano, rodilla…"
            className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-9 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
          {zoneQuery && (
            <button onClick={() => setZoneQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {isSearching && (
        <p className="mt-1.5 px-1 text-xs text-muted-foreground">
          {(searchResults?.length ?? 0)} resultado(s)
          <button onClick={clearSearch} className="ml-2 font-medium text-primary hover:underline">Limpiar búsqueda</button>
        </p>
      )}

      <div className="mt-4 max-h-[500px] space-y-2 overflow-y-auto pr-1">
        {list.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-muted-foreground">
            <Stethoscope className="h-8 w-8 opacity-40" />
            {isSearching
              ? "Sin resultados. Intenta con otra zona o nombre."
              : "Selecciona una categoría o busca un examen."}
          </div>
        )}

        {list.map(({ category, index, exam }) => {
          const key = `${category}::${index}`;
          const cartItem = cart.find((c) => c.key === key);
          const meta = categoryMeta[category];
          const price = getBasePrice(exam);
          const covers = getExamCovers(exam.name);
          const isExpanded = expandedKeys.has(key);
          const hasCovers = covers.length > 0;

          return (
            <div
              key={key}
              className="rounded-xl border border-border bg-background"
            >
              {/* Main row */}
              <div className="flex w-full items-start gap-3 p-3">
                <span
                  className="mt-0.5 inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground"
                  style={{ backgroundColor: meta.tint }}
                >
                  {meta.short}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-snug text-foreground">{exam.name}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-1">{exam.desc}</span>
                  <span className="mt-1 block text-xs font-semibold text-foreground">{formatCLP(price)}</span>
                </span>
                {cartItem ? (
                  <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-1.5 py-1">
                    <button
                      onClick={() => changeQty(key, -1)}
                      className="flex h-6 w-6 items-center justify-center rounded-md bg-background text-foreground hover:bg-muted"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-5 text-center text-sm font-bold text-primary">{cartItem.qty}</span>
                    <button
                      onClick={() => changeQty(key, 1)}
                      className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground hover:opacity-90"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => addToCart(category, index, exam)}
                    className="shrink-0 rounded-lg bg-primary p-2 text-primary-foreground transition hover:opacity-90"
                    title="Agregar al carrito"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Covers toggle */}
              {hasCovers && (
                <div className="border-t border-border/60">
                  <button
                    onClick={() => toggleExpanded(key)}
                    className="flex w-full items-center gap-1.5 px-3 py-2 text-left transition hover:bg-secondary/30"
                  >
                    <MapPin className="h-3 w-3 shrink-0 text-primary" />
                    <span className="flex-1 text-[11px] font-semibold text-primary">
                      ¿Qué incluye este examen?
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3">
                      <div className="flex flex-wrap gap-1.5">
                        {covers.map((zone) => (
                          <button
                            key={zone}
                            onClick={() => { setZoneQuery(zone.split(" ")[0]); setActiveCat(null); }}
                            title={`Buscar "${zone}"`}
                            className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary transition hover:bg-primary/10"
                          >
                            {zone}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        Toca una zona para buscarla directamente.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
