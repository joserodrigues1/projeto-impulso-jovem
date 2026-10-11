"use client";

import { useRef } from "react";
import { useInView } from "motion/react";
import { cn } from "@/lib/utils";
import { coresDaNota, formatarNota, limitarNota } from "./faixas";

interface BarraCompetenciaProps {
  nome: string;
  nota: number;
  comentario?: string;
  /** Atraso (s) da animação de preenchimento — para as barras encherem em sequência. */
  atraso?: number;
  className?: string;
}

/**
 * Uma competência avaliada: nome, nota e barra horizontal (0–10) com o comentário da recrutadora.
 * A barra é SVG para sair também na impressão (fundos CSS costumam ser omitidos ao imprimir).
 * Ela enche da esquerda para a direita ao entrar na tela; na impressão aparece sempre completa.
 */
export function BarraCompetencia({ nome, nota, comentario, atraso = 0, className }: BarraCompetenciaProps) {
  const valor = limitarNota(nota);
  const percentual = `${(valor / 10) * 100}%`;
  const ref = useRef<HTMLDivElement>(null);
  const visivel = useInView(ref, { once: true, amount: 0.6 });

  return (
    <div ref={ref} className={cn("break-inside-avoid", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold text-foreground">{nome}</span>
        <span className="sr-only">: nota {formatarNota(valor)} de 10</span>
        <span aria-hidden="true" className="shrink-0 font-display text-base font-bold tabular-nums text-foreground">
          {formatarNota(valor)}
          <span className="font-sans text-xs font-medium text-muted-foreground">/10</span>
        </span>
      </div>
      <svg className="mt-2.5 block h-2 w-full overflow-visible" aria-hidden="true">
        <rect x="0" y="0" width="100%" height="8" rx="4" className="fill-border dark:fill-white/10" />
        {valor > 0 && (
          <rect
            x="0"
            y="0"
            width={percentual}
            height="8"
            rx="4"
            className={cn(
              coresDaNota(valor).preenchimento,
              "origin-left transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] [transform-box:fill-box]",
              visivel ? "scale-x-100" : "scale-x-0",
              "print:scale-x-100!",
            )}
            style={{ transitionDelay: visivel ? `${atraso}s` : undefined }}
          />
        )}
      </svg>
      {comentario && <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{comentario}</p>}
    </div>
  );
}
