"use client";

import Link from "next/link";
import { useCallback, useId, useRef, useState, type PointerEvent } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { CURVA_IMPULSO } from "@/components/movimento";
import { cn } from "@/lib/utils";
import { CORES_FAIXA, ROTULO_CLASSIFICACAO, classificacaoDaNota, formatarNota, limitarNota } from "./faixas";
import { formatarData } from "./utils";

export interface PontoEvolucao {
  id: string;
  /** ISO 8601 */
  data: string;
  nota: number;
}

interface GraficoEvolucaoProps {
  /** Da mais antiga para a mais recente (como vem de GET /entrevistas/resumo). */
  pontos: PontoEvolucao[];
  altura?: number;
  /** Link de cada ponto. Padrão: o relatório da entrevista. `null` desativa os links. */
  hrefDoPonto?: ((id: string) => string) | null;
  className?: string;
}

const MARGEM = { topo: 26, direita: 16, base: 28, esquerda: 30 };
/** Folga para os pontos das pontas não encostarem nos eixos. */
const RECUO_X = 18;
const MARCAS_Y = [0, 2, 4, 6, 8, 10];
/** Espaço mínimo entre rótulos de data no eixo X. */
const ESPACO_ROTULO_X = 48;

const hrefPadrao = (id: string) => `/dashboard/entrevistas/${id}`;

function descreverGrafico(pontos: PontoEvolucao[]): string {
  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];
  if (pontos.length === 1) {
    return `Gráfico de evolução: 1 entrevista, com nota ${formatarNota(ultimo.nota)} em ${formatarData(ultimo.data)}.`;
  }
  const maior = Math.max(...pontos.map((p) => limitarNota(p.nota)));
  return (
    `Gráfico de evolução das notas nas suas últimas ${pontos.length} entrevistas. ` +
    `A primeira teve nota ${formatarNota(primeiro.nota)}, em ${formatarData(primeiro.data)}, ` +
    `e a mais recente teve ${formatarNota(ultimo.nota)}, em ${formatarData(ultimo.data)}. ` +
    `Maior nota: ${formatarNota(maior)}.`
  );
}

/**
 * Gráfico de linha (SVG) com a evolução das notas, tooltip no mouse/teclado e tabela alternativa.
 * Cores do tema: linha em chart-1 (violeta da marca) sobre uma área em degradê chart-1 → ciano (chart-2).
 * Ao entrar na tela a linha se desenha e os pontos aparecem em sequência.
 */
export function GraficoEvolucao({ pontos, altura = 220, hrefDoPonto = hrefPadrao, className }: GraficoEvolucaoProps) {
  const [largura, setLargura] = useState(0);
  const [ativo, setAtivo] = useState<number | null>(null);
  const figuraRef = useRef<HTMLElement>(null);
  const visivel = useInView(figuraRef, { once: true, amount: 0.3 });
  const reduzir = useReducedMotion();
  const idArea = useId();
  const idLinha = useId();
  const animar = !reduzir;

  // Desenha em pixels reais (e não com viewBox esticado) para os textos não distorcerem no celular.
  const medirConteiner = useCallback((elemento: HTMLDivElement | null) => {
    if (!elemento) return;
    if (typeof ResizeObserver === "undefined") {
      setLargura(Math.floor(elemento.getBoundingClientRect().width));
      return;
    }
    const observador = new ResizeObserver(([entrada]) => setLargura(Math.floor(entrada.contentRect.width)));
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  if (pontos.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground",
          className,
        )}
        style={{ minHeight: altura }}
      >
        Seu gráfico de evolução aparece aqui depois da primeira entrevista com nota.
      </div>
    );
  }

  const n = pontos.length;
  const larguraPlot = Math.max(0, largura - MARGEM.esquerda - MARGEM.direita);
  const alturaPlot = altura - MARGEM.topo - MARGEM.base;
  const inicioX = MARGEM.esquerda + RECUO_X;
  const faixaX = Math.max(0, larguraPlot - RECUO_X * 2);
  const xDe = (i: number) => (n === 1 ? MARGEM.esquerda + larguraPlot / 2 : inicioX + (i / (n - 1)) * faixaX);
  const yDe = (nota: number) => MARGEM.topo + alturaPlot * (1 - limitarNota(nota) / 10);
  const baseY = yDe(0);

  const linha = pontos.map((p, i) => `${i === 0 ? "M" : "L"}${xDe(i)},${yDe(p.nota)}`).join(" ");
  const area = `${linha} L${xDe(n - 1)},${baseY} L${xDe(0)},${baseY} Z`;

  // Rótulos de data a partir do mais recente, pulando os que não cabem.
  const passoRotulo = n > 1 ? Math.max(1, Math.ceil(ESPACO_ROTULO_X / (faixaX / (n - 1) || 1))) : 1;
  const mostrarRotuloX = (i: number) => (n - 1 - i) % passoRotulo === 0;

  const ultimo = pontos[n - 1];
  const pontoAtivo = ativo !== null ? (pontos[ativo] ?? null) : null;
  const tooltipAbaixo = pontoAtivo !== null && yDe(pontoAtivo.nota) < MARGEM.topo + alturaPlot * 0.4;
  const classeAtiva = pontoAtivo ? classificacaoDaNota(limitarNota(pontoAtivo.nota)) : null;
  // Antes de entrar na tela a linha fica "não desenhada"; com menos movimento, já aparece pronta
  const desenhar = visivel || !animar;

  function aoMoverPonteiro(evento: PointerEvent<HTMLDivElement>) {
    const caixa = evento.currentTarget.getBoundingClientRect();
    const px = evento.clientX - caixa.left;
    let maisProximo = 0;
    for (let i = 1; i < n; i++) {
      if (Math.abs(xDe(i) - px) < Math.abs(xDe(maisProximo) - px)) maisProximo = i;
    }
    setAtivo(maisProximo);
  }

  return (
    <figure ref={figuraRef} className={cn("m-0", className)}>
      <div
        ref={medirConteiner}
        className="relative w-full select-none"
        style={{ height: altura }}
        onPointerMove={largura > 0 ? aoMoverPonteiro : undefined}
        onPointerLeave={() => setAtivo(null)}
      >
        {largura > 0 && (
          <>
            <svg
              width={largura}
              height={altura}
              role="img"
              aria-label={descreverGrafico(pontos)}
              className="block overflow-visible"
            >
              <defs>
                <linearGradient id={idArea} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" style={{ stopColor: "var(--chart-1)", stopOpacity: 0.28 }} />
                  <stop offset="100%" style={{ stopColor: "var(--chart-2)", stopOpacity: 0 }} />
                </linearGradient>
                <linearGradient id={idLinha} x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" style={{ stopColor: "var(--chart-1)" }} />
                  <stop offset="100%" style={{ stopColor: "color-mix(in oklch, var(--chart-1) 55%, var(--chart-2))" }} />
                </linearGradient>
              </defs>

              {MARCAS_Y.map((marca) => (
                <g key={marca}>
                  <line
                    x1={MARGEM.esquerda}
                    x2={MARGEM.esquerda + larguraPlot}
                    y1={yDe(marca)}
                    y2={yDe(marca)}
                    strokeWidth={1}
                    strokeDasharray={marca === 0 ? undefined : "3 5"}
                    className={marca === 0 ? "stroke-border" : "stroke-border dark:stroke-white/[0.08]"}
                  />
                  <text
                    x={MARGEM.esquerda - 8}
                    y={yDe(marca)}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontSize={11}
                    className="fill-muted-foreground tabular-nums"
                  >
                    {marca}
                  </text>
                </g>
              ))}

              {pontos.map(
                (p, i) =>
                  mostrarRotuloX(i) && (
                    <text
                      key={p.id}
                      x={xDe(i)}
                      y={altura - 8}
                      textAnchor="middle"
                      fontSize={11}
                      className="fill-muted-foreground tabular-nums"
                    >
                      {formatarData(p.data, "dd/MM")}
                    </text>
                  ),
              )}

              {pontoAtivo && ativo !== null && (
                <line
                  x1={xDe(ativo)}
                  x2={xDe(ativo)}
                  y1={MARGEM.topo}
                  y2={baseY}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  className="stroke-foreground/30"
                />
              )}

              {n > 1 && (
                <>
                  <motion.path
                    d={area}
                    fill={`url(#${idArea})`}
                    initial={animar ? { opacity: 0 } : false}
                    animate={{ opacity: desenhar ? 1 : 0 }}
                    transition={{ duration: 0.8, delay: animar ? 0.5 : 0, ease: "easeOut" }}
                  />
                  <motion.path
                    d={linha}
                    fill="none"
                    stroke={`url(#${idLinha})`}
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    initial={animar ? { pathLength: 0 } : false}
                    animate={{ pathLength: desenhar ? 1 : 0 }}
                    transition={{ duration: 1.1, ease: CURVA_IMPULSO }}
                  />
                </>
              )}

              {/* Halo do ponto mais recente */}
              <circle
                cx={xDe(n - 1)}
                cy={yDe(ultimo.nota)}
                r={12}
                className="fill-chart-1/15 motion-safe:animate-pulso-suave"
              />

              {pontos.map((p, i) => (
                <motion.circle
                  key={p.id}
                  cx={xDe(i)}
                  cy={yDe(p.nota)}
                  r={ativo === i ? 7 : 5}
                  strokeWidth={2.5}
                  className="fill-chart-1 stroke-card"
                  initial={animar ? { opacity: 0 } : false}
                  animate={{ opacity: desenhar ? 1 : 0 }}
                  transition={{ duration: 0.3, delay: animar ? 0.25 + (i / Math.max(1, n - 1)) * 0.8 : 0 }}
                />
              ))}

              {/* Rótulo direto só no ponto mais recente */}
              <text
                x={xDe(n - 1)}
                y={yDe(ultimo.nota) - 18}
                textAnchor="middle"
                fontSize={13}
                fontWeight={700}
                className="fill-foreground font-display tabular-nums"
              >
                {formatarNota(ultimo.nota)}
              </text>
            </svg>

            {hrefDoPonto &&
              pontos.map((p, i) => (
                <Link
                  key={p.id}
                  href={hrefDoPonto(p.id)}
                  aria-label={`Ver relatório da entrevista de ${formatarData(p.data)}: nota ${formatarNota(p.nota)}`}
                  onFocus={() => setAtivo(i)}
                  onBlur={() => setAtivo(null)}
                  className="absolute size-9 -translate-x-1/2 -translate-y-1/2 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
                  style={{ left: xDe(i), top: yDe(p.nota) }}
                />
              ))}

            {pontoAtivo && ativo !== null && classeAtiva && (
              <div
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute z-10 w-max max-w-52 -translate-x-1/2 rounded-xl border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-xl shadow-tinta/10",
                  // Pontos no alto do gráfico: tooltip abaixo, para não sair do card.
                  tooltipAbaixo ? "translate-y-0" : "-translate-y-full",
                )}
                style={{
                  left: Math.min(Math.max(xDe(ativo), 80), Math.max(80, largura - 80)),
                  top: tooltipAbaixo ? yDe(pontoAtivo.nota) + 16 : yDe(pontoAtivo.nota) - 16,
                }}
              >
                <p className="font-display text-lg leading-tight font-bold text-foreground">
                  {formatarNota(pontoAtivo.nota)}
                  <span className="font-sans text-xs font-normal text-muted-foreground"> /10</span>
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-muted-foreground">
                  <span className={cn("size-2 shrink-0 rounded-full", CORES_FAIXA[classeAtiva].brilho)} />
                  {ROTULO_CLASSIFICACAO[classeAtiva]} · {formatarData(pontoAtivo.data, "d 'de' MMM 'de' yyyy")}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {n === 1 && (
        <figcaption className="mt-2 text-sm text-muted-foreground">
          Faça mais uma simulação para começar a ver sua evolução.
        </figcaption>
      )}

      <details className="group/tabela mt-4 text-sm print:hidden">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-full px-1 font-semibold text-marca-forte outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 dark:text-marca-clara [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="inline-block transition-transform duration-200 group-open/tabela:rotate-90">
            ›
          </span>
          Ver as notas em tabela
        </summary>
        <div className="mt-2 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-muted-foreground">
                <th scope="col" className="px-3 py-2 font-medium">
                  Data
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Nota
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Classificação
                </th>
              </tr>
            </thead>
            <tbody>
              {pontos.map((p) => (
                <tr key={p.id} className="border-b border-border text-foreground last:border-0">
                  <td className="px-3 py-2">{formatarData(p.data, "dd/MM/yyyy")}</td>
                  <td className="px-3 py-2 tabular-nums">{formatarNota(p.nota)}</td>
                  <td className="px-3 py-2">{ROTULO_CLASSIFICACAO[classificacaoDaNota(limitarNota(p.nota))]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
