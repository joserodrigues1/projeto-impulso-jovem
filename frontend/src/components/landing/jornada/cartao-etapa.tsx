import { ArrowDown, ArrowRight, Check, MessageCircle, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { BlocoPrompt } from "./bloco-prompt";
import type { Etapa } from "./etapas";

interface CartaoEtapaProps {
  etapa: Etapa;
  indice: number;
  total: number;
  /** Etapa aberta: os blocos entram em sequência. */
  ativa: boolean;
  /** Título da próxima etapa (ausente na última). */
  proxima?: string;
  aoAvancar: () => void;
}

/** Cada bloco do cartão entra um pouco depois do anterior quando a etapa abre. */
const ENTRADA = "transition-[opacity,translate] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]";
const ATRASOS = ["motion-safe:delay-0", "motion-safe:delay-75", "motion-safe:delay-150", "motion-safe:delay-200"];

/**
 * Conteúdo de uma etapa: o que a IA faz, um prompt pronto para copiar e um cuidado.
 * No celular fica sob o cabeçalho da etapa (linha do tempo); no desktop vira o cartão à direita da lista.
 */
export function CartaoEtapa({ etapa, indice, total, ativa, proxima, aoAvancar }: CartaoEtapaProps) {
  const Icone = etapa.icone;
  const entrada = (passo: number) =>
    cn(ENTRADA, ATRASOS[passo], ativa ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0");

  return (
    <article className="pt-1 pr-1 pb-8 pl-12 lg:flex lg:h-full lg:flex-col lg:rounded-3xl lg:border lg:bg-card lg:p-8 lg:shadow-xl lg:shadow-marca/5 xl:p-9">
      {/* Cabeçalho visual do desktop (no celular, o título já está no botão da etapa) */}
      <div aria-hidden="true" className={cn("hidden items-center gap-4 lg:flex", entrada(0))}>
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--marca),color-mix(in_oklch,var(--marca)_45%,var(--ciano)))] text-white shadow-lg shadow-marca/30">
          <Icone className="size-6" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Etapa {indice + 1} de {total}
          </p>
          <p className="mt-0.5 font-display text-2xl leading-tight font-semibold tracking-tight xl:text-[1.75rem]">
            {etapa.titulo}
          </p>
        </div>
      </div>

      <p className={cn("leading-relaxed text-muted-foreground lg:mt-4 lg:text-lg", entrada(0))}>{etapa.resumo}</p>

      <div className="mt-5 grid gap-5 lg:mt-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] xl:gap-x-7">
        <div className={cn("xl:col-start-1 xl:row-start-1", entrada(1))}>
          <h4 className="text-sm font-semibold">Como a IA ajuda</h4>
          <ul className="mt-3 space-y-2.5">
            {etapa.ajudas.map((ajuda) => (
              <li key={ajuda} className="flex gap-3 text-[15px] leading-relaxed">
                <span
                  aria-hidden="true"
                  className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-marca/12 text-marca-forte dark:bg-marca/25 dark:text-marca-clara"
                >
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                <span>{ajuda}</span>
              </li>
            ))}
          </ul>
        </div>

        <BlocoPrompt
          texto={etapa.prompt}
          className={cn("xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:self-start", entrada(2))}
        />

        <div
          className={cn(
            "flex gap-3 self-end rounded-2xl border border-chart-4/40 bg-chart-4/10 p-4 xl:col-start-1 xl:row-start-2 dark:border-chart-4/25",
            entrada(3),
          )}
        >
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-[color-mix(in_oklch,var(--chart-4)_65%,var(--foreground))] dark:text-chart-4"
          />
          <p className="text-[15px] leading-relaxed">
            <strong className="font-semibold">Cuidado: </strong>
            {etapa.cuidado}
          </p>
        </div>
      </div>

      {/* Rodapé: convite para a plataforma (na etapa da entrevista) e o caminho para a próxima etapa */}
      <div className="mt-6 flex flex-col gap-4 lg:mt-auto lg:pt-6 xl:flex-row xl:items-center">
        {etapa.comPlataforma && (
          <div className={cn("borda-gradiente flex items-center gap-3 rounded-2xl py-2.5 pr-2 pl-3 xl:flex-1", entrada(3))}>
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-lima text-tinta shadow-md shadow-lima/20"
            >
              <MessageCircle className="size-[18px]" />
            </span>
            <p className="min-w-0 flex-1 text-sm leading-snug text-muted-foreground">
              <strong className="block font-semibold text-foreground">Treine de verdade, pelo WhatsApp</strong>
              A Helena, nossa recrutadora virtual, entrevista você e manda um relatório.
            </p>
            <a
              href="#plataforma"
              aria-label="Conhecer a simulação de entrevista"
              className="group grid size-11 shrink-0 place-items-center rounded-full text-marca-forte transition-colors hover:bg-marca/10 dark:text-marca-clara"
            >
              <ArrowRight aria-hidden="true" className="size-5 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        )}

        {/* Seguir para a próxima etapa (ou, na última, para o construtor de prompt) */}
        {proxima ? (
          <button
            type="button"
            onClick={aoAvancar}
            className="group inline-flex min-h-11 max-w-full items-center gap-2 self-start rounded-full border bg-background px-4 text-left text-sm font-semibold transition-colors hover:border-marca/50 hover:bg-marca/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:self-end xl:ml-auto xl:self-auto"
          >
            <span className="text-muted-foreground">Próxima:</span>
            <span className="truncate">{proxima}</span>
            <ArrowRight
              aria-hidden="true"
              className="size-4 shrink-0 text-marca-forte transition-transform group-hover:translate-x-0.5 dark:text-marca-clara"
            />
          </button>
        ) : (
          <a
            href="#anatomia"
            className="group inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-marca px-5 text-sm font-semibold text-white shadow-lg shadow-marca/25 transition-colors hover:bg-marca-forte lg:self-end xl:ml-auto xl:self-auto"
          >
            Agora, monte o seu prompt
            <ArrowDown aria-hidden="true" className="size-4 transition-transform group-hover:translate-y-0.5" />
          </a>
        )}
      </div>
    </article>
  );
}
