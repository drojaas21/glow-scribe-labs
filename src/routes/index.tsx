import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Scan, FlaskConical, Wallet } from "lucide-react";
import logo from "@/assets/logo-diagnopro.svg";
import { ExamQuoter, type CartItem } from "@/components/ExamQuoter";
import { LabQuoter } from "@/components/LabQuoter";
import { CashRegister } from "@/components/CashRegister";
import type { LabExam } from "@/data/catalog";

export const Route = createFileRoute("/")({
  component: Index,
});

type Tab = "examenes" | "laboratorio" | "caja";

const tabs: { id: Tab; label: string; icon: typeof Scan }[] = [
  { id: "examenes", label: "Imagenología", icon: Scan },
  { id: "laboratorio", label: "Laboratorio", icon: FlaskConical },
  { id: "caja", label: "Caja", icon: Wallet },
];

function Index() {
  const [tab, setTab] = useState<Tab>("examenes");
  const [imagingCart, setImagingCart] = useState<CartItem[]>([]);
  const [labCart, setLabCart] = useState<LabExam[]>([]);

  const imagingCount = imagingCart.reduce((s, i) => s + i.qty, 0);
  const labCount = labCart.length;

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

        <div className="mb-6 inline-flex rounded-2xl border border-border bg-card p-1 shadow-[var(--shadow-card)]">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            const badge =
              t.id === "examenes" ? imagingCount : t.id === "laboratorio" ? labCount : 0;
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
                  <span
                    className={`min-w-[18px] rounded-full px-1 text-center text-[10px] font-bold leading-[18px] ${
                      active
                        ? "bg-white/30 text-white"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className={tab === "examenes" ? "" : "hidden"}>
          <ExamQuoter cart={imagingCart} setCart={setImagingCart} />
        </div>
        <div className={tab === "laboratorio" ? "" : "hidden"}>
          <LabQuoter cart={labCart} setCart={setLabCart} />
        </div>
        <div className={tab === "caja" ? "" : "hidden"}>
          <CashRegister />
        </div>
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-muted-foreground sm:px-6">
        DiagnoPRO Temuco · Cotización referencial sujeta a confirmación.
      </footer>
    </div>
  );
}
