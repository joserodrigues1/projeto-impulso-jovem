import type { ReactNode } from "react";
import { Gauge, ListChecks, Minus, Sparkle, TrendingDown, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { RevelarGrupo, RevelarItem } from "@/components/movimento";
import type { ResumoEntrevistas } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { formatarNota } from "./faixas";
import { ESTILO_CARD } from "./utils";

function Indicador({
  rotulo,
  valor,
  icone: Icone,
  children,
}: {
  rotulo: string;
  valor: string;
  icone: LucideIcon;
  children?: ReactNode;
}) {
  return (
    <RevelarItem className={cn(ESTILO_CARD, "relative overflow-hidden p-5 sm:p-6")}>
      <span
        aria-hidden="true"
        className="absolute top-5 right-5 flex size-9 items-center justify-center rounded-xl bg-marca/10 text-marca-forte ring-1 ring-marca/15 ring-inset dark:bg-marca/15 dark:text-marca-clara"
      >
        <Icone className="size-4" />
      </span>
      <dt className="pr-12 text-sm font-medium text-muted-foreground">{rotulo}</dt>
      <dd className="mt-3">
        <span className="font-display text-4xl leading-none font-bold tracking-tight text-foreground tabular-nums">
          {valor}
        </span>
        {children}
      </dd>
    </RevelarItem>
  );
}

/** Variação entre as duas últimas notas da evolução. */
function Variacao({ evolucao }: { evolucao: ResumoEntrevistas["evolucao"] }) {
  if (evolucao.length < 2) return null;
  const diferenca = Math.round((evolucao[evolucao.length - 1].nota - evolucao[evolucao.length - 2].nota) * 10) / 10;

  if (diferenca === 0) {
    return (
      <span className="mt-3 flex w-fit items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        <Minus aria-hidden="true" className="size-3.5" />
        Igual à anterior
      </span>
    );
  }

  const subiu = diferenca > 0;
  const Icone = subiu ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "mt-3 flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        subiu
          ? "bg-chart-3/15 text-[color:color-mix(in_oklch,var(--chart-3),black_50%)] dark:bg-chart-3/10 dark:text-chart-3"
          : "bg-muted text-muted-foreground",
      )}
    >
      <Icone aria-hidden="true" className="size-3.5" />
      {subiu ? "+" : "−"}
      {formatarNota(Math.abs(diferenca))} em relação à anterior
    </span>
  );
}

/** Números gerais das simulações: total, média e última nota. */
export function IndicadoresEntrevistas({ resumo, className }: { resumo: ResumoEntrevistas; className?: string }) {
  return (
    // RevelarGrupo só coordena a entrada em sequência; a grade é o próprio <dl> (cada item é um <div> com dt + dd)
    <RevelarGrupo como="div" className={className}>
      <dl className="grid gap-4 sm:grid-cols-3">
        <Indicador rotulo="Entrevistas analisadas" valor={String(resumo.total)} icone={ListChecks} />
        <Indicador
          rotulo="Média das notas"
          valor={resumo.mediaNota !== null ? formatarNota(resumo.mediaNota) : "—"}
          icone={Gauge}
        >
          {resumo.mediaNota !== null && <span className="ml-1.5 text-sm text-muted-foreground">de 10</span>}
        </Indicador>
        <Indicador
          rotulo="Última nota"
          valor={resumo.ultimaNota !== null ? formatarNota(resumo.ultimaNota) : "—"}
          icone={Sparkle}
        >
          {resumo.ultimaNota !== null && (
            <>
              <span className="ml-1.5 text-sm text-muted-foreground">de 10</span>
              <Variacao evolucao={resumo.evolucao} />
            </>
          )}
        </Indicador>
      </dl>
    </RevelarGrupo>
  );
}
