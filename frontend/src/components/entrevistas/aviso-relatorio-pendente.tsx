"use client";

import { Hourglass, LoaderCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { estiloBotao } from "./utils";

interface AvisoRelatorioPendenteProps {
  onAtualizar: () => void;
  atualizando?: boolean;
  className?: string;
}

/** Mostrado enquanto a IA analisa a última simulação. */
export function AvisoRelatorioPendente({ onAtualizar, atualizando = false, className }: AvisoRelatorioPendenteProps) {
  return (
    <section
      aria-label="Relatório em preparação"
      className={cn(
        "relative isolate flex flex-col gap-4 overflow-hidden rounded-3xl border border-chart-4/40 bg-chart-4/10 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-chart-4/25 dark:bg-chart-4/[0.07] print:hidden",
        className,
      )}
    >
      {/* Faixa de luz que passa devagar: "está trabalhando" (decorativa; parada com menos movimento) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-1/3 animate-brilho bg-gradient-to-r from-transparent via-chart-4/15 to-transparent motion-reduce:hidden"
      />
      <div className="flex gap-3.5">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-chart-4 text-tinta shadow-sm"
        >
          <Hourglass className="size-5 motion-safe:animate-pulso-suave" />
        </span>
        <div>
          <p className="font-semibold text-foreground">Seu relatório está sendo preparado…</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            A IA está analisando suas respostas. Costuma levar poucos minutos — você também recebe o link no WhatsApp
            quando ficar pronto.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onAtualizar}
        disabled={atualizando}
        className={estiloBotao("secundario", "sm", "shrink-0")}
      >
        {atualizando ? (
          <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" />
        ) : (
          <RefreshCw aria-hidden="true" />
        )}
        {atualizando ? "Atualizando…" : "Atualizar"}
      </button>
    </section>
  );
}
