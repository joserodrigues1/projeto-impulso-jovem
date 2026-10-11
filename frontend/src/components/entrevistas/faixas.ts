import type { Classificacao } from "@/lib/tipos";

/** Rótulos exibidos para cada classificação do relatório. */
export const ROTULO_CLASSIFICACAO: Record<Classificacao, string> = {
  INICIANTE: "Iniciante",
  EM_DESENVOLVIMENTO: "Em desenvolvimento",
  PREPARADO: "Preparado",
  DESTAQUE: "Destaque",
};

/** Frase de incentivo exibida junto da nota. */
export const MENSAGEM_CLASSIFICACAO: Record<Classificacao, string> = {
  INICIANTE: "Todo mundo começa em algum lugar. Siga o plano abaixo, treine de novo e você vai sentir a diferença!",
  EM_DESENVOLVIMENTO: "Você está no caminho certo! Com alguns ajustes, a próxima entrevista vai ser ainda melhor.",
  PREPARADO: "Mandou bem! Você já tem uma boa base para entrevistas reais. Agora é lapidar os detalhes.",
  DESTAQUE: "Que entrevista! Você se saiu muito bem. Continue treinando para manter o ritmo.",
};

/** Mesmas faixas da API (docs/ARQUITETURA.md, seção 4.2): <4, <6,5, <8,5, ≥8,5. */
export function classificacaoDaNota(nota: number): Classificacao {
  if (nota < 4) return "INICIANTE";
  if (nota < 6.5) return "EM_DESENVOLVIMENTO";
  if (nota < 8.5) return "PREPARADO";
  return "DESTAQUE";
}

/**
 * Classificação a exibir: a da API, se for um valor conhecido; senão, derivada da nota.
 * Sem nenhuma das duas (relatório antigo) → null.
 */
export function classificacaoEfetiva(
  classificacao: Classificacao | null | undefined,
  nota: number | null | undefined,
): Classificacao | null {
  if (classificacao && Object.prototype.hasOwnProperty.call(ROTULO_CLASSIFICACAO, classificacao)) {
    return classificacao;
  }
  return typeof nota === "number" && Number.isFinite(nota) ? classificacaoDaNota(nota) : null;
}

/** Garante uma nota entre 0 e 10 (a API já normaliza; isto só protege os gráficos). */
export function limitarNota(nota: number): number {
  if (!Number.isFinite(nota)) return 0;
  return Math.min(10, Math.max(0, nota));
}

/** "7,5" — sempre com uma casa decimal, no formato brasileiro. */
export function formatarNota(nota: number): string {
  return limitarNota(nota).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/**
 * Cores por faixa, a partir das cores de gráfico do tema (globals.css):
 * Iniciante → coral (chart-5), Em desenvolvimento → âmbar (chart-4), Preparado → ciano (chart-2),
 * Destaque → lima (chart-3).
 *
 * No escuro, os tons do tema já contrastam bem com o card (≥ 6:1). No claro, eles são escurecidos com
 * `color-mix(… black X%)` só o necessário: traços/barras ≥ 3:1 com o branco e textos ≥ 4,5:1
 * (conferido com a fórmula de contraste da WCAG). As classes ficam escritas por extenso para o Tailwind
 * encontrá-las.
 */
export const CORES_FAIXA: Record<
  Classificacao,
  {
    traco: string;
    preenchimento: string;
    texto: string;
    selo: string;
    fundoSuave: string;
    /** Brilho difuso atrás do anel da nota (decorativo). */
    brilho: string;
  }
> = {
  INICIANTE: {
    traco: "stroke-[color:color-mix(in_oklch,var(--chart-5),black_15%)] dark:stroke-chart-5",
    preenchimento: "fill-[color:color-mix(in_oklch,var(--chart-5),black_15%)] dark:fill-chart-5",
    texto: "text-[color:color-mix(in_oklch,var(--chart-5),black_25%)] dark:text-chart-5",
    selo: "bg-chart-5/12 text-[color:color-mix(in_oklch,var(--chart-5),black_30%)] ring-chart-5/35 dark:bg-chart-5/15 dark:text-chart-5 dark:ring-chart-5/30",
    fundoSuave: "bg-chart-5/8 dark:bg-chart-5/10",
    brilho: "bg-chart-5",
  },
  EM_DESENVOLVIMENTO: {
    traco: "stroke-[color:color-mix(in_oklch,var(--chart-4),black_25%)] dark:stroke-chart-4",
    preenchimento: "fill-[color:color-mix(in_oklch,var(--chart-4),black_25%)] dark:fill-chart-4",
    texto: "text-[color:color-mix(in_oklch,var(--chart-4),black_38%)] dark:text-chart-4",
    selo: "bg-chart-4/15 text-[color:color-mix(in_oklch,var(--chart-4),black_42%)] ring-chart-4/40 dark:bg-chart-4/15 dark:text-chart-4 dark:ring-chart-4/30",
    fundoSuave: "bg-chart-4/10 dark:bg-chart-4/10",
    brilho: "bg-chart-4",
  },
  PREPARADO: {
    traco: "stroke-[color:color-mix(in_oklch,var(--chart-2),black_20%)] dark:stroke-chart-2",
    preenchimento: "fill-[color:color-mix(in_oklch,var(--chart-2),black_20%)] dark:fill-chart-2",
    texto: "text-[color:color-mix(in_oklch,var(--chart-2),black_32%)] dark:text-chart-2",
    selo: "bg-chart-2/15 text-[color:color-mix(in_oklch,var(--chart-2),black_38%)] ring-chart-2/40 dark:bg-chart-2/15 dark:text-chart-2 dark:ring-chart-2/30",
    fundoSuave: "bg-chart-2/10 dark:bg-chart-2/10",
    brilho: "bg-chart-2",
  },
  DESTAQUE: {
    traco: "stroke-[color:color-mix(in_oklch,var(--chart-3),black_30%)] dark:stroke-chart-3",
    preenchimento: "fill-[color:color-mix(in_oklch,var(--chart-3),black_30%)] dark:fill-chart-3",
    texto: "text-[color:color-mix(in_oklch,var(--chart-3),black_42%)] dark:text-chart-3",
    selo: "bg-lima text-tinta ring-tinta/10 dark:bg-chart-3/15 dark:text-chart-3 dark:ring-chart-3/30",
    fundoSuave: "bg-chart-3/12 dark:bg-chart-3/10",
    brilho: "bg-chart-3",
  },
};

/** Cores da faixa em que a nota cai. */
export function coresDaNota(nota: number) {
  return CORES_FAIXA[classificacaoDaNota(limitarNota(nota))];
}
