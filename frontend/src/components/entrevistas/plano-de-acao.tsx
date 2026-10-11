"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PartyPopper } from "lucide-react";
import { CURVA_IMPULSO } from "@/components/movimento";
import type { RelatorioEntrevista } from "@/lib/tipos";
import { cn } from "@/lib/utils";

interface PlanoDeAcaoProps {
  /** Usado para guardar o progresso de cada relatório separadamente neste navegador. */
  entrevistaId: string;
  passos: RelatorioEntrevista["planoDeAcao"];
}

const chaveProgresso = (id: string) => `ij:plano-acao:${id}`;

/** Índices dos passos marcados como feitos. Qualquer falha (modo privado, JSON inválido) → nenhum. */
function lerConcluidos(id: string, total: number): Set<number> {
  try {
    const bruto = window.localStorage.getItem(chaveProgresso(id));
    const lista: unknown = bruto ? JSON.parse(bruto) : [];
    if (!Array.isArray(lista)) return new Set();
    return new Set(lista.filter((i): i is number => Number.isInteger(i) && i >= 0 && i < total));
  } catch {
    return new Set();
  }
}

function salvarConcluidos(id: string, concluidos: Set<number>) {
  try {
    window.localStorage.setItem(chaveProgresso(id), JSON.stringify([...concluidos]));
  } catch {
    // Sem armazenamento disponível: o progresso vale só enquanto a página estiver aberta.
  }
}

/** Faíscas que saem do ícone de festa quando o plano é concluído (decorativas). */
const FAISCAS = [
  { x: -34, y: -18, cor: "bg-lima" },
  { x: -22, y: 20, cor: "bg-ciano" },
  { x: 4, y: -30, cor: "bg-marca" },
  { x: 28, y: -16, cor: "bg-lima" },
  { x: 30, y: 18, cor: "bg-chart-4" },
  { x: -4, y: 28, cor: "bg-marca" },
] as const;

/** Plano de ação numerado, com checklist salvo no navegador e marcação animada. */
export function PlanoDeAcao({ entrevistaId, passos }: PlanoDeAcaoProps) {
  // Só é renderizado no navegador (depois de buscar o relatório), então dá para ler o localStorage aqui.
  const [concluidos, setConcluidos] = useState(() => lerConcluidos(entrevistaId, passos.length));
  const idGradiente = useId();
  const total = passos.length;
  const feitos = concluidos.size;
  const tudoFeito = total > 0 && feitos === total;
  const fracao = total > 0 ? feitos / total : 0;

  function alternar(indice: number) {
    const proximo = new Set(concluidos);
    if (proximo.has(indice)) proximo.delete(indice);
    else proximo.add(indice);
    setConcluidos(proximo);
    salvarConcluidos(entrevistaId, proximo);
  }

  return (
    <div>
      <div className="flex items-center gap-3 print:hidden">
        {/* w-0 + flex-1: sem largura própria o SVG assume os 300 px padrão e estoura a tela do celular */}
        <svg className="h-2 w-0 min-w-0 flex-1" aria-hidden="true">
          <defs>
            <linearGradient id={idGradiente} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" style={{ stopColor: "var(--marca)" }} />
              <stop offset="100%" style={{ stopColor: "var(--ciano)" }} />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="100%" height="8" rx="4" className="fill-border dark:fill-white/10" />
          <rect
            x="0"
            y="0"
            width="100%"
            height="8"
            rx="4"
            fill={`url(#${idGradiente})`}
            className="origin-left transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] [transform-box:fill-box]"
            style={{ transform: `scaleX(${fracao})` }}
          />
        </svg>
        <p className="shrink-0 text-sm font-medium text-muted-foreground tabular-nums">
          <motion.span
            key={feitos}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: CURVA_IMPULSO }}
            className="inline-block font-semibold text-foreground"
          >
            {feitos}
          </motion.span>{" "}
          de {total} {total === 1 ? "concluído" : "concluídos"}
        </p>
      </div>

      <ol className="mt-4 space-y-2.5">
        {passos.map((item, i) => {
          const feito = concluidos.has(i);
          const id = `plano-${entrevistaId}-${i}`;
          return (
            <li key={i} className="break-inside-avoid">
              <label
                htmlFor={id}
                className={cn(
                  "group flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition-[background-color,border-color] duration-300",
                  "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                  feito
                    ? "border-chart-3/50 bg-chart-3/10 dark:border-chart-3/25 dark:bg-chart-3/[0.07]"
                    : "border-border bg-background/60 hover:border-marca/35 hover:bg-muted/60 dark:bg-white/[0.02]",
                )}
              >
                {/* Caixa nativa (acessível), desenhada por cima com o visto animado */}
                <input id={id} type="checkbox" checked={feito} onChange={() => alternar(i)} className="peer sr-only" />
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg border-2 transition-[background-color,border-color,scale] duration-300 group-active:scale-90",
                    feito ? "border-transparent bg-lima" : "border-input bg-card group-hover:border-marca/60",
                  )}
                >
                  <svg viewBox="0 0 24 24" className="size-4 text-tinta">
                    <motion.path
                      d="M5 12.5l4.5 4.5L19 7.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={false}
                      animate={{ pathLength: feito ? 1 : 0, opacity: feito ? 1 : 0 }}
                      transition={{ duration: 0.35, ease: CURVA_IMPULSO }}
                    />
                  </svg>
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold transition-colors duration-300",
                    feito ? "bg-muted text-muted-foreground" : "bg-marca text-white",
                  )}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block leading-relaxed transition-colors duration-300",
                      feito ? "text-muted-foreground" : "text-foreground",
                    )}
                  >
                    <span className="sr-only">Passo {i + 1}: </span>
                    {/* Risco que "passa" pelo texto ao marcar (também quebra linha junto com o texto) */}
                    <span
                      className={cn(
                        "bg-[linear-gradient(currentColor,currentColor)] bg-[position:0_58%] bg-no-repeat transition-[background-size] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                        feito ? "bg-[length:100%_1.5px]" : "bg-[length:0%_1.5px]",
                      )}
                    >
                      {item.passo}
                    </span>
                  </span>
                  {item.prazo && (
                    <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-ciano" />
                      Prazo: {item.prazo}
                    </span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ol>

      {/* A região de status existe sempre, para o leitor de tela anunciar quando o plano for concluído. */}
      <div role="status" className="print:hidden">
        <AnimatePresence initial={false}>
          {tudoFeito && (
            <motion.p
              key="plano-concluido"
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.45, ease: CURVA_IMPULSO }}
              className="mt-4 flex items-start gap-3 rounded-2xl border border-chart-3/40 bg-chart-3/12 p-3.5 text-sm font-medium text-foreground dark:border-chart-3/25 dark:bg-chart-3/10"
            >
              <span aria-hidden="true" className="relative flex size-8 shrink-0 items-center justify-center rounded-xl bg-lima text-tinta">
                <PartyPopper className="size-4" />
                {FAISCAS.map((f, i) => (
                  <motion.span
                    key={i}
                    className={cn("absolute size-1.5 rounded-full", f.cor)}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{ x: f.x, y: f.y, opacity: 0, scale: 0.4 }}
                    transition={{ duration: 0.8, ease: CURVA_IMPULSO, delay: 0.1 }}
                  />
                ))}
              </span>
              <span className="pt-1.5">
                Mandou bem! Você concluiu todo o plano. Que tal uma nova simulação para ver o quanto evoluiu?
              </span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
