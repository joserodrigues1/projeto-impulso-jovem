"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ShieldCheck, type LucideIcon } from "lucide-react";
import { LinkVoltar } from "@/components/curriculo/cabecalho-pagina";
import { ESTILO_CARD, ESTILO_SOBRETITULO, estiloBotao } from "@/components/entrevistas/utils";
import { Revelar } from "@/components/movimento";
import { ROTULO_STATUS_CONTA, ROTULO_STATUS_SESSAO, type StatusSessao } from "@/lib/admin";
import type { Paginado, StatusConta } from "@/lib/tipos";
import { cn } from "@/lib/utils";

// ───────────────────────────── Cabeçalho ─────────────────────────────

interface CabecalhoAdminProps {
  titulo: ReactNode;
  descricao?: ReactNode;
  sobretitulo?: string;
  voltar?: { href: string; rotulo: string };
  /** Conteúdo à direita do título (ações). */
  acoes?: ReactNode;
}

/** Cabeçalho das telas da administração: voltar (opcional) + sobretítulo em pílula + título + descrição. */
export function CabecalhoAdmin({ titulo, descricao, sobretitulo = "Administração", voltar, acoes }: CabecalhoAdminProps) {
  return (
    <Revelar y={12} transition={{ duration: 0.45 }} className="space-y-4">
      {voltar && <LinkVoltar href={voltar.href}>{voltar.rotulo}</LinkVoltar>}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className={ESTILO_SOBRETITULO}>
            <span aria-hidden="true" className="size-1.5 rounded-full bg-lima" />
            {sobretitulo}
          </p>
          <h1 className="mt-3 font-display text-3xl leading-[1.08] font-bold tracking-tight break-words text-foreground sm:text-4xl">
            {titulo}
          </h1>
          {descricao && <div className="mt-2 max-w-3xl leading-relaxed text-muted-foreground">{descricao}</div>}
        </div>
        {acoes && <div className="flex shrink-0 flex-wrap gap-2">{acoes}</div>}
      </header>
    </Revelar>
  );
}

// ───────────────────────────── Aviso de acesso registrado ─────────────────────────────

/** Aviso fixo no topo das telas que mostram o conteúdo de um participante. */
export function AvisoAcessoRegistrado({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-marca/20 bg-marca/[0.06] p-3.5 text-sm leading-relaxed text-foreground dark:border-marca/30 dark:bg-marca/10 print:hidden",
        className,
      )}
    >
      <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-marca-forte dark:text-marca-clara" />
      <p>
        <strong className="font-semibold">Acesso registrado:</strong> abrir o conteúdo de um participante fica no
        histórico de auditoria (LGPD).
      </p>
    </div>
  );
}

// ───────────────────────────── Selos ─────────────────────────────

const BASE_SELO =
  "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset";

/** Tons dos selos (no claro, o texto usa o tom escurecido para manter o contraste ≥ 4,5:1). */
const TONS = {
  lima: "bg-chart-3/15 text-[color:color-mix(in_oklch,var(--chart-3),black_52%)] ring-chart-3/40 dark:bg-chart-3/10 dark:text-chart-3 dark:ring-chart-3/25",
  ambar:
    "bg-chart-4/15 text-[color:color-mix(in_oklch,var(--chart-4),black_45%)] ring-chart-4/40 dark:bg-chart-4/10 dark:text-chart-4 dark:ring-chart-4/25",
  ciano:
    "bg-chart-2/15 text-[color:color-mix(in_oklch,var(--chart-2),black_42%)] ring-chart-2/40 dark:bg-chart-2/10 dark:text-chart-2 dark:ring-chart-2/25",
  perigo: "bg-destructive/10 text-red-700 ring-destructive/25 dark:bg-destructive/15 dark:text-red-300 dark:ring-destructive/30",
  neutro: "bg-muted text-muted-foreground ring-border",
  marca: "bg-marca/10 text-marca-forte ring-marca/25 dark:bg-marca/15 dark:text-marca-clara dark:ring-marca/30",
} as const;

export type TomSelo = keyof typeof TONS;

export function Selo({ tom, children, className }: { tom: TomSelo; children: ReactNode; className?: string }) {
  return (
    <span className={cn(BASE_SELO, TONS[tom], className)}>
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current opacity-80" />
      {children}
    </span>
  );
}

const TOM_STATUS_CONTA: Record<StatusConta, TomSelo> = { ATIVO: "lima", PENDENTE: "ambar", BLOQUEADO: "perigo" };

export function SeloStatusConta({ status, className }: { status: StatusConta; className?: string }) {
  return (
    <Selo tom={TOM_STATUS_CONTA[status] ?? "neutro"} className={className}>
      {ROTULO_STATUS_CONTA[status] ?? status}
    </Selo>
  );
}

const TOM_STATUS_SESSAO: Record<StatusSessao, TomSelo> = {
  EM_ANDAMENTO: "ciano",
  FINALIZADA: "ambar",
  ANALISADA: "lima",
  CANCELADA: "neutro",
};

export function SeloStatusSessao({ status, className }: { status: StatusSessao; className?: string }) {
  return (
    <Selo tom={TOM_STATUS_SESSAO[status] ?? "neutro"} className={className}>
      {ROTULO_STATUS_SESSAO[status] ?? status}
    </Selo>
  );
}

// ───────────────────────────── Paginação ─────────────────────────────

interface PaginacaoProps {
  meta: Paginado<unknown>["meta"];
  /** Nome da lista para leitores de tela ("Páginas dos participantes"). */
  rotulo: string;
  desabilitada?: boolean;
  aoMudar: (pagina: number) => void;
}

export function Paginacao({ meta, rotulo, desabilitada, aoMudar }: PaginacaoProps) {
  if (meta.totalPaginas <= 1) return null;
  return (
    <nav aria-label={rotulo} className="flex items-center justify-between gap-3 pt-2">
      <button
        type="button"
        onClick={() => aoMudar(Math.max(1, meta.pagina - 1))}
        disabled={meta.pagina <= 1 || desabilitada}
        className={estiloBotao("secundario", "sm")}
      >
        <ChevronLeft aria-hidden="true" />
        Anterior
      </button>
      <p className="text-sm text-muted-foreground tabular-nums">
        Página {meta.pagina} de {meta.totalPaginas}
      </p>
      <button
        type="button"
        onClick={() => aoMudar(Math.min(meta.totalPaginas, meta.pagina + 1))}
        disabled={meta.pagina >= meta.totalPaginas || desabilitada}
        className={estiloBotao("secundario", "sm")}
      >
        Próxima
        <ChevronRight aria-hidden="true" />
      </button>
    </nav>
  );
}

// ───────────────────────────── Estados ─────────────────────────────

interface EstadoVazioProps {
  icone: LucideIcon;
  titulo: string;
  children?: ReactNode;
  acao?: ReactNode;
  className?: string;
  /** Nível do título (h2 dentro das seções; h1 quando ocupa a página inteira). */
  nivel?: "h1" | "h2" | "h3";
}

/** Caixa tracejada de "nada por aqui" (lista vazia, item não encontrado). */
export function EstadoVazio({ icone: Icone, titulo, children, acao, className, nivel = "h2" }: EstadoVazioProps) {
  const Titulo = nivel;
  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-3xl border border-dashed border-border bg-card px-6 py-12 text-center",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 fundo-grade text-foreground [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
      />
      <span
        aria-hidden="true"
        className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground ring-1 ring-border"
      >
        <Icone className="size-7" />
      </span>
      <Titulo className="mt-5 font-display text-xl font-bold tracking-tight text-foreground">{titulo}</Titulo>
      {children && <div className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{children}</div>}
      {acao && <div className="mt-6 flex flex-wrap justify-center gap-2">{acao}</div>}
    </div>
  );
}

/** Cartão de seção da ficha e das telas de conteúdo: título + descrição + conteúdo. */
export function SecaoAdmin({
  id,
  titulo,
  descricao,
  icone: Icone,
  acao,
  className,
  children,
}: {
  id: string;
  titulo: string;
  descricao?: ReactNode;
  icone?: LucideIcon;
  acao?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={cn(ESTILO_CARD, "min-w-0 p-5 sm:p-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {Icone && (
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-marca/10 text-marca-forte ring-1 ring-marca/20 ring-inset dark:bg-marca/15 dark:text-marca-clara dark:ring-marca/30"
            >
              <Icone className="size-5" />
            </span>
          )}
          <div className="min-w-0">
            <h2 id={id} className="font-display text-lg font-bold tracking-tight text-foreground sm:text-xl">
              {titulo}
            </h2>
            {descricao && <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{descricao}</p>}
          </div>
        </div>
        {acao}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Link-botão secundário pequeno (ações dentro das listas). */
export function LinkAcao({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={estiloBotao("secundario", "sm", cn("group", className))}>
      {children}
    </Link>
  );
}
