"use client";

import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface FaixaRolanteProps {
  itens: React.ReactNode[];
  /** Duração de uma volta completa, em segundos. */
  duracao?: number;
  className?: string;
  /** Rótulo para leitores de tela (a faixa visual é escondida deles). */
  rotulo: string;
}

/**
 * Faixa que rola sem parar (marquee). Pausa ao passar o mouse, ao focar e pelo botão de pausa
 * (movimento contínuo precisa poder ser parado também por teclado e toque — WCAG 2.2.2).
 * Leitores de tela recebem a lista uma única vez; com "reduzir movimento" a faixa fica parada.
 */
export function FaixaRolante({ itens, duracao = 45, className, rotulo }: FaixaRolanteProps) {
  const [pausada, setPausada] = useState(false);

  return (
    <div className={cn("group relative overflow-hidden", className)}>
      <ul className="sr-only" aria-label={rotulo}>
        {itens.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
      <div
        aria-hidden="true"
        className={cn(
          "flex w-max animate-faixa gap-3 group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]",
          pausada && "[animation-play-state:paused]",
        )}
        style={{ "--duracao-faixa": `${duracao}s` } as React.CSSProperties}
      >
        {[...itens, ...itens].map((item, i) => (
          <div key={i} className="shrink-0">
            {item}
          </div>
        ))}
      </div>
      {/* Esmaece as bordas */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" />
      <button
        type="button"
        onClick={() => setPausada((p) => !p)}
        aria-pressed={pausada}
        aria-label={pausada ? "Retomar a faixa de exemplos" : "Pausar a faixa de exemplos"}
        className={cn(
          "absolute top-1/2 right-1 z-10 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/85 text-muted-foreground shadow-sm backdrop-blur",
          "transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          "opacity-70 motion-reduce:hidden",
        )}
      >
        {pausada ? <Play aria-hidden="true" className="size-3.5" /> : <Pause aria-hidden="true" className="size-3.5" />}
      </button>
    </div>
  );
}
