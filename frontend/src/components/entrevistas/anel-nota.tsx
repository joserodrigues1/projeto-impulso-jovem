"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { CURVA_IMPULSO } from "@/components/movimento";
import { cn } from "@/lib/utils";
import { CORES_FAIXA, classificacaoDaNota, formatarNota, limitarNota } from "./faixas";

interface AnelNotaProps {
  /** Nota de 0 a 10. */
  nota: number;
  /** Diâmetro em pixels. */
  tamanho?: number;
  className?: string;
  /** Texto para leitores de tela. Padrão: "Nota 7,5 de 10". */
  rotulo?: string;
  /** Anima o anel e o número ao aparecer na tela (padrão: sim). */
  animar?: boolean;
}

const DURACAO_S = 1.3;

/**
 * Nota em anel (0–10), colorido pela faixa da nota. Ao entrar na tela, o anel se desenha e o número
 * "sobe" até a nota. Na impressão (e com "reduzir movimento") aparece direto o valor final.
 */
export function AnelNota({ nota, tamanho = 120, className, rotulo, animar = true }: AnelNotaProps) {
  const valor = limitarNota(nota);
  const cores = CORES_FAIXA[classificacaoDaNota(valor)];
  const espessura = Math.max(4, Math.round(tamanho * 0.085));
  const centro = tamanho / 2;
  const raio = (tamanho - espessura) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const deslocamentoFinal = circunferencia * (1 - valor / 10);
  const mostrarEscala = tamanho >= 96;
  const grande = tamanho >= 120;

  const ref = useRef<HTMLDivElement>(null);
  const visivel = useInView(ref, { once: true, amount: 0.5 });
  const reduzir = useReducedMotion();
  const desenhado = !animar || visivel;

  // Número que conta de 0 até a nota (o texto final também está no HTML, para a impressão)
  const progresso = useMotionValue(animar ? 0 : valor);
  const texto = useTransform(progresso, (v) => formatarNota(v));
  useEffect(() => {
    if (!desenhado) return;
    if (reduzir || !animar) {
      progresso.set(valor);
      return;
    }
    const controle = animate(progresso, valor, { duration: DURACAO_S, ease: CURVA_IMPULSO });
    return () => controle.stop();
  }, [desenhado, reduzir, animar, valor, progresso]);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={rotulo ?? `Nota ${formatarNota(valor)} de 10`}
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: tamanho, height: tamanho }}
    >
      {/* Brilho difuso da cor da faixa (só na tela) */}
      {grande && (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-[18%] rounded-full opacity-25 blur-2xl transition-opacity duration-1000 print:hidden dark:opacity-30",
            cores.brilho,
            !desenhado && "opacity-0 dark:opacity-0",
          )}
        />
      )}
      <svg
        width={tamanho}
        height={tamanho}
        viewBox={`0 0 ${tamanho} ${tamanho}`}
        aria-hidden="true"
        className="relative -rotate-90"
      >
        <circle
          cx={centro}
          cy={centro}
          r={raio}
          fill="none"
          strokeWidth={espessura}
          className="stroke-border dark:stroke-white/10"
        />
        {valor > 0 && (
          <circle
            cx={centro}
            cy={centro}
            r={raio}
            fill="none"
            strokeWidth={espessura}
            strokeLinecap="round"
            strokeDasharray={circunferencia}
            className={cn(
              cores.traco,
              "transition-[stroke-dashoffset] duration-[1300ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
              // Impressão: sempre o anel completo até a nota, mesmo que a animação não tenha rodado
              "print:[stroke-dashoffset:var(--deslocamento-final)]!",
            )}
            style={
              {
                strokeDashoffset: desenhado ? deslocamentoFinal : circunferencia,
                "--deslocamento-final": deslocamentoFinal,
              } as CSSProperties
            }
          />
        )}
      </svg>
      <span aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span
          className="font-display font-bold tracking-tight text-foreground tabular-nums"
          style={{ fontSize: Math.round(tamanho * 0.27) }}
        >
          <motion.span className="print:hidden">{texto}</motion.span>
          <span className="hidden print:inline">{formatarNota(valor)}</span>
        </span>
        {mostrarEscala && <span className="mt-1.5 text-xs font-medium text-muted-foreground">de 10</span>}
      </span>
    </div>
  );
}
