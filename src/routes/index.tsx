import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Scan, FlaskConical, Wallet } from "lucide-react";
import logo from "@/assets/logo-diagnopro.svg";
import { ExamQuoter } from "@/components/ExamQuoter";
import { LabQuoter } from "@/components/LabQuoter";
import { CashRegister } from "@/components/CashRegister";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DiagnoPRO Temuco · Cotizador de Exámenes y Laboratorio" },
      { name: "description", content: "Cotizador profesional de exámenes de imagenología, laboratorio y caja para DiagnoPRO Temuco. Calcula convenios, copagos y vuelto." },
      { property: "og:title", content: "DiagnoPRO Temuco · Cotizador" },
      { property: "og:description", content: "Cotiza exámenes de imagenología y laboratorio con convenios y genera PDF." },
    ],
  }),
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

  return (
    <div className="min-h-screen bg-[var(--gradient-soft)]">
      {/* Header */}
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
        {/* Hero */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Cotizador de exámenes y laboratorio
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecciona exámenes, aplica convenios y genera cotizaciones en PDF al instante.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 inline-flex rounded-2xl border border-border bg-card p-1 shadow-[var(--shadow-card)]">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                  active
                    ? "bg-[var(--gradient-brand)] text-primary-foreground shadow-[var(--shadow-lift)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>

        {tab === "examenes" && <ExamQuoter />}
        {tab === "laboratorio" && <LabQuoter />}
        {tab === "caja" && <CashRegister />}
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-muted-foreground sm:px-6">
        DiagnoPRO Temuco · Cotización referencial sujeta a confirmación.
      </footer>
    </div>
  );
}
