"use client";

import { useCallback, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { CURVA_IMPULSO } from "@/components/movimento";
import { formatarDiaIso, somarDias, type SemanaUso } from "@/lib/admin";
import { cn } from "@/lib/utils";

type ChaveSerie = Exclude<keyof SemanaUso, "semana">;

interface Serie {
  chave: ChaveSerie;
  rotulo: string;
  /** Singular e plural para as frases lidas pelo leitor de tela. */
  unidade: [string, string];
  traco: string;
  preenchimento: string;
  fundo: string;
}

/**
 * Cores das séries a partir das cores de gráfico do tema (violeta, ciano, âmbar e lima), escurecidas com
 * `color-mix(… black X%)` só o necessário para: contraste ≥ 3:1 com o cartão, lightness parecida entre as
 * quatro e separação suficiente para daltonismo (protan/deutan/tritan) entre todos os pares — conferido com o
 * validador de paletas (claro: #7960fb #00889f #c7821b #4c6b16; escuro: #8175eb #0e9ab0 #bb852e #58771e).
 * As classes ficam escritas por extenso para o Tailwind encontrá-las.
 */
const SERIES: Serie[] = [
  {
    chave: "cadastros",
    rotulo: "Cadastros",
    unidade: ["cadastro", "cadastros"],
    traco: "stroke-chart-1 dark:stroke-[color:color-mix(in_oklch,var(--chart-1),black_10%)]",
    preenchimento: "fill-chart-1 dark:fill-[color:color-mix(in_oklch,var(--chart-1),black_10%)]",
    fundo: "bg-chart-1 dark:bg-[color:color-mix(in_oklch,var(--chart-1),black_10%)]",
  },
  {
    chave: "curriculos",
    rotulo: "Currículos",
    unidade: ["currículo", "currículos"],
    traco: "stroke-[color:color-mix(in_oklch,var(--chart-2),black_20%)]",
    preenchimento: "fill-[color:color-mix(in_oklch,var(--chart-2),black_20%)]",
    fundo: "bg-[color:color-mix(in_oklch,var(--chart-2),black_20%)]",
  },
  {
    chave: "simulacoes",
    rotulo: "Simulações",
    unidade: ["simulação", "simulações"],
    traco:
      "stroke-[color:color-mix(in_oklch,var(--chart-4),black_15%)] dark:stroke-[color:color-mix(in_oklch,var(--chart-4),black_20%)]",
    preenchimento:
      "fill-[color:color-mix(in_oklch,var(--chart-4),black_15%)] dark:fill-[color:color-mix(in_oklch,var(--chart-4),black_20%)]",
    fundo:
      "bg-[color:color-mix(in_oklch,var(--chart-4),black_15%)] dark:bg-[color:color-mix(in_oklch,var(--chart-4),black_20%)]",
  },
  {
    chave: "relatorios",
    rotulo: "Relatórios",
    unidade: ["relatório", "relatórios"],
    traco: "stroke-[color:color-mix(in_oklch,var(--chart-3),black_40%)]",
    preenchimento: "fill-[color:color-mix(in_oklch,var(--chart-3),black_40%)]",
    fundo: "bg-[color:color-mix(in_oklch,var(--chart-3),black_40%)]",
  },
];

const MARGEM = { topo: 16, direita: 16, base: 30, esquerda: 36 };
const RECUO_X = 14;
const ESPACO_ROTULO_X = 56;
/** Com poucas semanas, todos os pontos aparecem; com muitas, só os da semana destacada. */
const MAX_SEMANAS_COM_PONTOS = 12;

function quantidade(valor: number, [singular, plural]: [string, string]): string {
  return `${valor.toLocaleString("pt-BR")} ${valor === 1 ? singular : plural}`;
}

/** Escala "redonda" do eixo Y (inteiros): 0, 2, 4, 6… ou 0, 5, 10… com no máximo 5 marcas. */
function escalaY(maximo: number): { topo: number; marcas: number[] } {
  if (maximo <= 0) return { topo: 4, marcas: [0, 1, 2, 3, 4] };
  const bruto = maximo / 4;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const passo = Math.max(1, [1, 2, 5, 10].map((m) => m * potencia).find((p) => p >= bruto) ?? 10 * potencia);
  const topo = Math.ceil(maximo / passo) * passo;
  const marcas: number[] = [];
  for (let v = 0; v <= topo; v += passo) marcas.push(v);
  return { topo, marcas };
}

function rotuloSemana(semana: string): string {
  return `${formatarDiaIso(semana, "dd/MM")} a ${formatarDiaIso(somarDias(semana, 6), "dd/MM/yyyy")}`;
}

function fraseSemana(semana: SemanaUso, series: Serie[]): string {
  const valores = series.map((s) => quantidade(semana[s.chave], s.unidade)).join(", ");
  return `Semana de ${rotuloSemana(semana.semana)}: ${valores}.`;
}

interface GraficoSemanalProps {
  semanas: SemanaUso[];
  altura?: number;
  className?: string;
}

/**
 * Gráfico de linhas (SVG à mão) com o uso por semana: cadastros, currículos, simulações e relatórios.
 * Legenda com totais (cada série pode ser escondida), linha-guia com a semana mais próxima do ponteiro,
 * navegação pelas setas do teclado com anúncio para leitor de tela e tabela com os mesmos números.
 */
export function GraficoSemanal({ semanas, altura = 260, className }: GraficoSemanalProps) {
  const [largura, setLargura] = useState(0);
  const [ativo, setAtivo] = useState<number | null>(null);
  const [ocultas, setOcultas] = useState<ReadonlySet<ChaveSerie>>(() => new Set());
  const figuraRef = useRef<HTMLElement>(null);
  const visivel = useInView(figuraRef, { once: true, amount: 0.3 });
  const reduzir = useReducedMotion();
  const idInstrucoes = useId();
  const animar = !reduzir;

  // Desenha em pixels reais (sem viewBox esticado) para os textos não distorcerem no celular
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

  const totais = Object.fromEntries(
    SERIES.map((s) => [s.chave, semanas.reduce((soma, semana) => soma + (semana[s.chave] ?? 0), 0)]),
  ) as Record<ChaveSerie, number>;
  const visiveis = SERIES.filter((s) => !ocultas.has(s.chave));
  const semAtividade = semanas.every((semana) => SERIES.every((s) => !semana[s.chave]));

  function alternarSerie(chave: ChaveSerie) {
    setOcultas((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(chave)) proximo.delete(chave);
      // Pelo menos uma série continua visível
      else if (SERIES.length - proximo.size > 1) proximo.add(chave);
      return proximo;
    });
  }

  if (semanas.length === 0 || semAtividade) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground",
          className,
        )}
        style={{ minHeight: altura }}
      >
        Nenhuma atividade no período: sem cadastros, currículos, simulações nem relatórios.
      </div>
    );
  }

  const n = semanas.length;
  const larguraPlot = Math.max(0, largura - MARGEM.esquerda - MARGEM.direita);
  const alturaPlot = altura - MARGEM.topo - MARGEM.base;
  const inicioX = MARGEM.esquerda + RECUO_X;
  const faixaX = Math.max(0, larguraPlot - RECUO_X * 2);
  const xDe = (i: number) => (n === 1 ? MARGEM.esquerda + larguraPlot / 2 : inicioX + (i / (n - 1)) * faixaX);
  const maximo = Math.max(0, ...semanas.flatMap((semana) => visiveis.map((s) => semana[s.chave] ?? 0)));
  const { topo, marcas } = escalaY(maximo);
  const yDe = (valor: number) => MARGEM.topo + alturaPlot * (1 - Math.max(0, valor) / topo);
  const baseY = yDe(0);

  const caminho = (chave: ChaveSerie) =>
    semanas.map((semana, i) => `${i === 0 ? "M" : "L"}${xDe(i)},${yDe(semana[chave] ?? 0)}`).join(" ");

  // Rótulos de data a partir da semana mais recente, pulando os que não cabem
  const passoRotulo = n > 1 ? Math.max(1, Math.ceil(ESPACO_ROTULO_X / (faixaX / (n - 1) || 1))) : 1;
  const mostrarRotuloX = (i: number) => (n - 1 - i) % passoRotulo === 0;
  const comTodosOsPontos = n <= MAX_SEMANAS_COM_PONTOS;
  const desenhar = visivel || !animar;

  const semanaAtiva = ativo !== null ? (semanas[ativo] ?? null) : null;
  const tooltipADireita = ativo !== null && xDe(ativo) < largura / 2;

  const pico = SERIES.map((s) => {
    let indice = 0;
    semanas.forEach((semana, i) => {
      if ((semana[s.chave] ?? 0) > (semanas[indice][s.chave] ?? 0)) indice = i;
    });
    return { serie: s, indice };
  });
  const descricao =
    `Gráfico de linhas com o uso por semana, de ${formatarDiaIso(semanas[0].semana)} ` +
    `a ${formatarDiaIso(somarDias(semanas[n - 1].semana, 6))}, em ${n} ${n === 1 ? "semana" : "semanas"}. ` +
    `Totais: ${SERIES.map((s) => quantidade(totais[s.chave], s.unidade)).join(", ")}. ` +
    pico
      .filter(({ serie }) => totais[serie.chave] > 0)
      .map(({ serie, indice }) => `Mais ${serie.unidade[1]} na semana de ${formatarDiaIso(semanas[indice].semana, "dd/MM")}`)
      .join("; ") +
    ".";

  function aoMoverPonteiro(evento: PointerEvent<HTMLDivElement>) {
    const caixa = evento.currentTarget.getBoundingClientRect();
    const px = evento.clientX - caixa.left;
    let maisProximo = 0;
    for (let i = 1; i < n; i++) {
      if (Math.abs(xDe(i) - px) < Math.abs(xDe(maisProximo) - px)) maisProximo = i;
    }
    setAtivo(maisProximo);
  }

  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    const atual = ativo ?? n - 1;
    const proximo =
      evento.key === "ArrowLeft"
        ? Math.max(0, atual - 1)
        : evento.key === "ArrowRight"
          ? Math.min(n - 1, atual + 1)
          : evento.key === "Home"
            ? 0
            : evento.key === "End"
              ? n - 1
              : evento.key === "Escape"
                ? null
                : undefined;
    if (proximo === undefined) return;
    evento.preventDefault();
    setAtivo(proximo);
  }

  return (
    <figure ref={figuraRef} className={cn("m-0 min-w-0", className)}>
      {/* Legenda: identifica as linhas (traço da cor), mostra o total do período e esconde/mostra cada série */}
      <ul aria-label="Séries do gráfico" className="mb-4 flex flex-wrap gap-2">
        {SERIES.map((s) => {
          const oculta = ocultas.has(s.chave);
          return (
            <li key={s.chave}>
              <button
                type="button"
                aria-pressed={!oculta}
                onClick={() => alternarSerie(s.chave)}
                className={cn(
                  "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-sm outline-none transition-[background-color,border-color,opacity] duration-200 focus-visible:ring-3 focus-visible:ring-ring/50",
                  oculta
                    ? "border-dashed border-border text-muted-foreground opacity-70 hover:opacity-100"
                    : "border-border bg-background/60 text-foreground hover:border-marca/35 dark:bg-white/[0.03]",
                )}
              >
                <span aria-hidden="true" className={cn("h-0.5 w-4 rounded-full", oculta ? "bg-muted-foreground/50" : s.fundo)} />
                <span className="font-medium">{s.rotulo}</span>
                <span className="font-semibold tabular-nums">{totais[s.chave].toLocaleString("pt-BR")}</span>
                <span className="sr-only">no período{oculta ? " (escondida no gráfico)" : ""}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div
        ref={medirConteiner}
        role="group"
        tabIndex={0}
        aria-label="Uso por semana"
        aria-describedby={idInstrucoes}
        className="relative w-full rounded-xl outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50"
        style={{ height: altura }}
        onPointerMove={largura > 0 ? aoMoverPonteiro : undefined}
        onPointerLeave={() => setAtivo(null)}
        onKeyDown={aoTeclar}
        onFocus={() => setAtivo((atual) => atual ?? n - 1)}
        onBlur={() => setAtivo(null)}
      >
        <span id={idInstrucoes} className="sr-only">
          {descricao} Use as setas para a esquerda e para a direita para ouvir os números de cada semana.
        </span>
        {largura > 0 && (
          <>
            <svg width={largura} height={altura} aria-hidden="true" className="block overflow-visible">
              {marcas.map((marca) => (
                <g key={marca}>
                  <line
                    x1={MARGEM.esquerda}
                    x2={MARGEM.esquerda + larguraPlot}
                    y1={yDe(marca)}
                    y2={yDe(marca)}
                    strokeWidth={1}
                    className={marca === 0 ? "stroke-border" : "stroke-border/70 dark:stroke-white/[0.06]"}
                  />
                  <text
                    x={MARGEM.esquerda - 8}
                    y={yDe(marca)}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontSize={11}
                    className="fill-muted-foreground tabular-nums"
                  >
                    {marca.toLocaleString("pt-BR")}
                  </text>
                </g>
              ))}

              {semanas.map(
                (semana, i) =>
                  mostrarRotuloX(i) && (
                    <text
                      key={semana.semana}
                      x={xDe(i)}
                      y={altura - 8}
                      textAnchor="middle"
                      fontSize={11}
                      className="fill-muted-foreground tabular-nums"
                    >
                      {formatarDiaIso(semana.semana, "dd/MM")}
                    </text>
                  ),
              )}

              {ativo !== null && (
                <line
                  x1={xDe(ativo)}
                  x2={xDe(ativo)}
                  y1={MARGEM.topo}
                  y2={baseY}
                  strokeWidth={1}
                  className="stroke-foreground/35"
                />
              )}

              {n > 1 &&
                visiveis.map((s, indiceSerie) => (
                  <motion.path
                    key={s.chave}
                    d={caminho(s.chave)}
                    fill="none"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    className={s.traco}
                    initial={animar ? { pathLength: 0 } : false}
                    animate={{ pathLength: desenhar ? 1 : 0 }}
                    transition={{ duration: 1, ease: CURVA_IMPULSO, delay: animar ? indiceSerie * 0.08 : 0 }}
                  />
                ))}

              {/* Pontos: todos (poucas semanas) ou só os da semana destacada — anel na cor do cartão */}
              {visiveis.map((s) =>
                semanas.map((semana, i) =>
                  comTodosOsPontos || ativo === i || n === 1 ? (
                    <circle
                      key={`${s.chave}-${semana.semana}`}
                      cx={xDe(i)}
                      cy={yDe(semana[s.chave] ?? 0)}
                      r={ativo === i ? 5 : 4}
                      strokeWidth={2}
                      className={cn(s.preenchimento, "stroke-card transition-[r] duration-150")}
                    />
                  ) : null,
                ),
              )}
            </svg>

            {semanaAtiva && ativo !== null && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute z-10 w-max min-w-40 rounded-xl border border-border bg-popover px-3 py-2.5 text-xs text-popover-foreground shadow-xl shadow-tinta/10"
                // À direita da linha-guia na primeira metade do gráfico; à esquerda na segunda (não sai do cartão)
                style={{
                  left: xDe(ativo),
                  top: MARGEM.topo,
                  transform: tooltipADireita ? "translateX(12px)" : "translateX(calc(-100% - 12px))",
                }}
              >
                <p className="font-semibold text-foreground">Semana de {rotuloSemana(semanaAtiva.semana)}</p>
                <ul className="mt-1.5 space-y-1">
                  {visiveis.map((s) => (
                    <li key={s.chave} className="flex items-center gap-2">
                      <span className={cn("h-0.5 w-3 shrink-0 rounded-full", s.fundo)} />
                      <span className="font-display text-sm font-bold text-foreground tabular-nums">
                        {(semanaAtiva[s.chave] ?? 0).toLocaleString("pt-BR")}
                      </span>
                      <span className="text-muted-foreground">{s.rotulo}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {/* O que a linha-guia mostra, lido pelo leitor de tela ao navegar pelas setas */}
      <p className="sr-only" aria-live="polite">
        {semanaAtiva ? fraseSemana(semanaAtiva, visiveis) : ""}
      </p>

      <details className="group/tabela mt-4 text-sm print:hidden">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-full px-1 font-semibold text-marca-forte outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 dark:text-marca-clara [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="inline-block transition-transform duration-200 group-open/tabela:rotate-90">
            ›
          </span>
          Ver os números em tabela
        </summary>
        <div className="mt-2 max-h-96 overflow-auto rounded-2xl border border-border">
          <table className="w-full text-left">
            <caption className="sr-only">Uso por semana no período</caption>
            <thead className="sticky top-0 bg-muted text-muted-foreground">
              <tr className="border-b border-border">
                <th scope="col" className="px-3 py-2 font-medium">
                  Semana
                </th>
                {SERIES.map((s) => (
                  <th key={s.chave} scope="col" className="px-3 py-2 text-right font-medium">
                    {s.rotulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {semanas.map((semana) => (
                <tr key={semana.semana} className="border-b border-border text-foreground last:border-0">
                  <th scope="row" className="px-3 py-2 font-normal whitespace-nowrap">
                    {rotuloSemana(semana.semana)}
                  </th>
                  {SERIES.map((s) => (
                    <td key={s.chave} className="px-3 py-2 text-right tabular-nums">
                      {(semana[s.chave] ?? 0).toLocaleString("pt-BR")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/50 font-semibold text-foreground">
                <th scope="row" className="px-3 py-2">
                  Total
                </th>
                {SERIES.map((s) => (
                  <td key={s.chave} className="px-3 py-2 text-right tabular-nums">
                    {totais[s.chave].toLocaleString("pt-BR")}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </details>
    </figure>
  );
}
