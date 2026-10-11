import { format, formatDistanceToNow, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

// ───────────────────────────── Datas ─────────────────────────────

function paraData(iso: string): Date | null {
  const data = new Date(iso);
  return isValid(data) ? data : null;
}

/** "8 de outubro de 2026" (ou o padrão informado). Datas inválidas viram "". */
export function formatarData(iso: string, padrao = "d 'de' MMMM 'de' yyyy"): string {
  const data = paraData(iso);
  return data ? format(data, padrao, { locale: ptBR }) : "";
}

/** "há 5 minutos". */
export function tempoRelativo(iso: string): string {
  const data = paraData(iso);
  return data ? formatDistanceToNow(data, { locale: ptBR, addSuffix: true }) : "";
}

// ───────────────────────────── WhatsApp ─────────────────────────────

/** Extrai o número de um link do WhatsApp (wa.me/<numero> ou ?phone=<numero>). */
export function numeroDoWhatsapp(link: string | null | undefined): string | null {
  if (!link) return null;
  try {
    const url = new URL(link);
    const digitos = (url.searchParams.get("phone") ?? url.pathname).replace(/\D/g, "");
    return digitos.length >= 10 ? digitos : null;
  } catch {
    return null;
  }
}

/** Link do WhatsApp da IA com uma mensagem pronta. Sem número configurado, devolve null. */
export function linkWhatsappComTexto(link: string | null | undefined, texto: string): string | null {
  const numero = numeroDoWhatsapp(link);
  return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(texto)}` : null;
}

// ───────────────────────────── Estilos ─────────────────────────────

const BASE_BOTAO =
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold whitespace-nowrap select-none " +
  "transition-[background-color,border-color,color,box-shadow,scale] duration-200 ease-out " +
  "outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-background active:scale-[0.98] " +
  "disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 " +
  "aria-disabled:cursor-not-allowed aria-disabled:opacity-60 " +
  "[&_svg]:size-4 [&_svg]:shrink-0";

const VARIANTES_BOTAO = {
  primario:
    "bg-marca text-white shadow-sm shadow-marca/25 hover:bg-marca-forte hover:shadow-md hover:shadow-marca/30 " +
    "disabled:hover:bg-marca disabled:hover:shadow-sm",
  secundario:
    "border border-border bg-card text-foreground hover:border-marca/35 hover:bg-muted " +
    "dark:bg-white/5 dark:hover:bg-white/10",
  /** No escuro o vermelho do tema é claro demais para texto branco: escurece só o necessário (≥ 4,5:1). */
  perigo:
    "bg-destructive text-white hover:bg-[color:color-mix(in_oklch,var(--destructive),black_12%)] " +
    "dark:bg-[color:color-mix(in_oklch,var(--destructive),black_28%)] " +
    "dark:hover:bg-[color:color-mix(in_oklch,var(--destructive),black_36%)]",
  fantasma: "text-marca-forte hover:bg-marca/8 dark:text-marca-clara dark:hover:bg-marca/15",
  /** Sobre faixas sempre escuras (bg-tinta), em qualquer tema. */
  clara: "bg-white text-tinta shadow-lg shadow-black/25 hover:bg-white/90 focus-visible:ring-offset-tinta",
} as const;

const TAMANHOS_BOTAO = {
  md: "min-h-12 px-6",
  sm: "min-h-11 px-4",
} as const;

export type VarianteBotao = keyof typeof VARIANTES_BOTAO;

/** Classes de botão/link-botão (pílulas) usadas nas telas de entrevista. Altura mínima de 44 px para toque. */
export function estiloBotao(
  variante: VarianteBotao = "primario",
  tamanho: keyof typeof TAMANHOS_BOTAO = "md",
  extra?: string,
): string {
  return cn(BASE_BOTAO, VARIANTES_BOTAO[variante], TAMANHOS_BOTAO[tamanho], extra);
}

/** Cartão padrão das telas de entrevista (tokens do tema; ver docs/DESIGN.md, seção 5). */
export const ESTILO_CARD =
  "rounded-3xl border border-border bg-card text-card-foreground shadow-sm shadow-tinta/[0.04] dark:shadow-none";

/** Sobretítulo em pílula com ponto lima (mesmo desenho do cabeçalho de seção da landing). */
export const ESTILO_SOBRETITULO =
  "inline-flex items-center gap-2 rounded-full border border-marca/20 bg-marca/8 px-3 py-1 text-xs font-semibold " +
  "tracking-[0.14em] text-marca-forte uppercase dark:text-marca-clara";

/** Ícone em "azulejo" no topo dos cartões do relatório. */
export const ESTILO_ICONE_SECAO =
  "flex size-10 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset [&_svg]:size-5";
