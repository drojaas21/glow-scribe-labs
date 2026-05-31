import { useMemo, useState } from "react";
import { Search, X, Plus, Trash2, FileDown, FlaskConical } from "lucide-react";
import { labDatabase, type LabExam } from "@/data/catalog";
import { formatCLP, normalize } from "@/lib/format";
import { generateLabPDF } from "@/lib/pdf";

export function LabQuoter() {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<LabExam[]>([]);
  const [patientName, setPatientName] = useState("");
  const [patientRut, setPatientRut] = useState("");

  const results = useMemo(() => {
    if (query.trim().length < 2) return labDatabase.slice(0, 40);
    const q = normalize(query);
    return labDatabase.filter(
      (e) => normalize(e.name).includes(q) || e.code.includes(query.trim())
    ).slice(0, 60);
  }, [query]);

  const add = (e: LabExam) => {
    if (cart.some((c) => c.code === e.code)) return;
    setCart((p) => [...p, e]);
  };
  const remove = (code: string) => setCart((p) => p.filter((c) => c.code !== code));

  const totalFonasa = cart.reduce((s, e) => s + (e.fonasa_a ?? e.particular), 0);
  const totalPart = cart.reduce((s, e) => s + e.particular, 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
      <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-foreground">Catálogo de laboratorio</h3>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por código FONASA o nombre del examen…"
            className="w-full rounded-xl border border-input bg-background py-3 pl-10 pr-10 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <p className="mt-3 px-1 text-xs text-muted-foreground">
          {query.trim().length < 2 ? "Mostrando primeros 40 exámenes" : `${results.length} resultado(s)`}
        </p>

        <div className="mt-2 max-h-[480px] space-y-2 overflow-y-auto pr-1">
          {results.map((e) => {
            const inCart = cart.some((c) => c.code === e.code);
            return (
              <div key={e.code} className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
                <span className="mt-0.5 shrink-0 rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-bold text-secondary-foreground">
                  {e.code}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug text-foreground">{e.name}</p>
                  <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                    <span>FONASA A <b className="text-foreground">{e.fonasa_a != null ? formatCLP(e.fonasa_a) : "—"}</b></span>
                    <span>Particular <b className="text-foreground">{formatCLP(e.particular)}</b></span>
                    {e.obs && <span className="rounded bg-accent/20 px-1.5 text-accent-foreground">{e.obs}</span>}
                  </div>
                </div>
                <button
                  onClick={() => add(e)}
                  disabled={inCart}
                  className="shrink-0 rounded-lg bg-primary p-2 text-primary-foreground transition hover:opacity-90 disabled:opacity-30"
                  title="Agregar"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">Cotización ({cart.length})</h3>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-xs font-medium text-destructive hover:underline">Vaciar</button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
              <FlaskConical className="h-8 w-8 opacity-40" />
              Agrega exámenes desde el catálogo.
            </div>
          ) : (
            <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
              {cart.map((e) => (
                <div key={e.code} className="flex items-center gap-2 rounded-lg border border-border bg-background p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">{e.name}</p>
                    <p className="text-[10px] text-muted-foreground">{e.code} · {formatCLP(e.particular)}</p>
                  </div>
                  <button onClick={() => remove(e.code)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between border-b border-dashed border-border pb-2 text-sm">
              <span className="text-muted-foreground">Total FONASA</span>
              <span className="font-semibold text-foreground">{formatCLP(totalFonasa)}</span>
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-gradient-brand px-4 py-3.5 text-primary-foreground shadow-[var(--shadow-lift)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium opacity-90">Total particular</span>
              <span className="text-2xl font-bold tracking-tight">{formatCLP(totalPart)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="grid grid-cols-2 gap-3">
            <input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Nombre del paciente"
              className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30" />
            <input value={patientRut} onChange={(e) => setPatientRut(e.target.value)} placeholder="RUT"
              className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30" />
          </div>
          <button
            onClick={() => cart.length && generateLabPDF({ items: cart, patientName, patientRut })}
            disabled={cart.length === 0}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FileDown className="h-4 w-4" /> Generar cotización PDF
          </button>
        </div>
      </div>
    </div>
  );
}
