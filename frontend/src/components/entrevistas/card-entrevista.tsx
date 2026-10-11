import Link from "next/link";
import { ArrowRight, Building2, CalendarDays, FileText } from "lucide-react";
import { CartaoHolofote } from "@/components/movimento";
import type { EntrevistaResumo } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { AnelNota } from "./anel-nota";
import { SeloClassificacao } from "./selo-classificacao";
import { ESTILO_CARD, formatarData } from "./utils";

/** Cartão de uma entrevista na lista. O cartão inteiro leva ao relatório. */
export function CardEntrevista({ entrevista, className }: { entrevista: EntrevistaResumo; className?: string }) {
  const data = formatarData(entrevista.dataRealizacao);

  return (
    <CartaoHolofote
      className={cn(
        ESTILO_CARD,
        "group h-full transition-[border-color,box-shadow,translate] duration-300 ease-out",
        "hover:-translate-y-0.5 hover:border-marca/30 hover:shadow-lg hover:shadow-marca/[0.07]",
        "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
        className,
      )}
    >
      <article className="flex h-full flex-col p-5 sm:p-6">
        <div className="flex items-start gap-4">
          {entrevista.notaGeral !== null ? (
            <AnelNota nota={entrevista.notaGeral} tamanho={68} />
          ) : (
            <span
              aria-hidden="true"
              className="flex size-[68px] shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-border"
            >
              <FileText className="size-6" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <SeloClassificacao classificacao={entrevista.classificacao} nota={entrevista.notaGeral} />
            <h3 className="mt-2 line-clamp-2 font-display text-lg leading-snug font-bold tracking-tight text-foreground">
              {entrevista.cargoAlvo}
            </h3>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
              {entrevista.empresaAlvo && (
                <p className="flex min-w-0 items-center gap-1.5">
                  <Building2 aria-hidden="true" className="size-3.5 shrink-0" />
                  <span className="truncate">{entrevista.empresaAlvo}</span>
                </p>
              )}
              {data && (
                <p className="flex items-center gap-1.5">
                  <CalendarDays aria-hidden="true" className="size-3.5 shrink-0" />
                  <time dateTime={entrevista.dataRealizacao}>{data}</time>
                </p>
              )}
            </div>
          </div>
        </div>

        {entrevista.resumo && (
          <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{entrevista.resumo}</p>
        )}

        <Link
          href={`/dashboard/entrevistas/${entrevista.id}`}
          className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-marca-forte outline-none after:absolute after:inset-0 after:rounded-3xl dark:text-marca-clara"
        >
          Ver relatório
          <span className="sr-only">
            {" "}
            da entrevista para {entrevista.cargoAlvo}
            {data ? `, de ${data}` : ""}
          </span>
          <ArrowRight
            aria-hidden="true"
            className="size-4 transition-transform duration-300 ease-out group-hover:translate-x-1"
          />
        </Link>
      </article>
    </CartaoHolofote>
  );
}
