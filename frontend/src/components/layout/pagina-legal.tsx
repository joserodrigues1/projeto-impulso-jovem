import Link from "next/link";
import { ArrowRight, CalendarClock, FileText } from "lucide-react";
import { CabecalhoPublico } from "@/components/layout/cabecalho-publico";
import { RodapePublico } from "@/components/layout/rodape-publico";
import { ProvedorMovimento, Revelar } from "@/components/movimento";
import { Alert } from "@/components/ui/alert";
import { SumarioSecoes } from "@/components/ui/sumario-secoes";

export interface SecaoLegal {
  id: string;
  titulo: string;
  conteudo: React.ReactNode;
}

interface PaginaLegalProps {
  titulo: string;
  resumo: React.ReactNode;
  atualizadoEm: string;
  secoes: SecaoLegal[];
  /** Link para o outro documento (termos ↔ privacidade). */
  relacionado: { href: string; rotulo: string };
}

/** Estilo do texto corrido das seções (parágrafos, listas, links e destaques vindos de cada documento). */
const classeTextoSecao = [
  "space-y-4 text-base leading-relaxed text-muted-foreground",
  "[&_strong]:font-semibold [&_strong]:text-foreground",
  "[&_a]:font-semibold [&_a]:text-marca-forte [&_a]:underline [&_a]:decoration-marca/30 [&_a]:underline-offset-4 [&_a:hover]:decoration-current dark:[&_a]:text-marca-clara dark:[&_a]:decoration-marca-clara/40",
  "[&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_li]:pl-1 [&_li]:marker:text-marca dark:[&_li]:marker:text-marca-clara",
].join(" ");

/**
 * Moldura dos documentos legais (termos de uso e política de privacidade): abertura com título em display,
 * índice da página (fixo ao lado no computador, com a seção atual destacada) e o texto em largura de leitura.
 */
export function PaginaLegal({ titulo, resumo, atualizadoEm, secoes, relacionado }: PaginaLegalProps) {
  return (
    <ProvedorMovimento>
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        <CabecalhoPublico />

        <main className="relative isolate flex-1 px-4 pt-28 pb-20 sm:px-6 sm:pt-32 md:pb-28">
          {/* Luz da marca e grade sutil no topo (decorativas) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(55%_70%_at_20%_0%,color-mix(in_oklch,var(--marca)_12%,transparent),transparent_70%),radial-gradient(40%_50%_at_90%_10%,color-mix(in_oklch,var(--ciano)_10%,transparent),transparent_70%)]"
          />
          <div
            aria-hidden="true"
            className="fundo-grade pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem] text-foreground [mask-image:radial-gradient(60%_80%_at_30%_0%,black,transparent)]"
          />

          <div className="mx-auto max-w-6xl">
            <Revelar y={12} transition={{ duration: 0.5 }} className="max-w-3xl">
              {/* Primeira coisa da página: o texto ainda depende da revisão jurídica */}
              <Alert
                variant="warning"
                role="note"
                title="Texto em revisão — esta ainda não é a versão final"
                className="mb-10 rounded-3xl border-2 border-amber-300 p-5 text-base dark:border-amber-400/40"
              >
                Este documento descreve como a plataforma funciona hoje, mas ainda está em revisão jurídica e pode mudar.
                Os trechos destacados entre colchetes, como{" "}
                <MarcadorPendente>[contato do encarregado a definir]</MarcadorPendente>, dependem dessa revisão e serão
                preenchidos na versão final.
              </Alert>

              <header className="space-y-5">
                <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-marca-forte uppercase shadow-xs backdrop-blur dark:text-marca-clara">
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-lima ring-2 ring-lima/30" />
                  Documentos do Impulso Jovem
                </p>
                <h1 className="font-display text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl lg:text-6xl">
                  {titulo}
                </h1>
                <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">{resumo}</p>
                <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarClock aria-hidden="true" className="size-4 text-marca-forte dark:text-marca-clara" />
                  Última atualização: {atualizadoEm} (em revisão)
                </p>
              </header>
            </Revelar>

            <div className="mt-12 grid gap-10 lg:mt-16 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-16">
              <nav
                aria-labelledby="titulo-sumario"
                className="min-w-0 rounded-3xl border border-border bg-card p-4 shadow-[0_1px_2px_rgb(20_16_40/0.04),0_12px_32px_-20px_rgb(20_16_40/0.2)] sm:p-5 lg:sticky lg:top-28 lg:max-h-[calc(100dvh-8.5rem)] lg:self-start lg:overflow-y-auto dark:shadow-none"
              >
                <h2
                  id="titulo-sumario"
                  className="mb-2 px-3 font-sans text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase"
                >
                  Nesta página
                </h2>
                <SumarioSecoes
                  itens={secoes.map(({ id, titulo: tituloSecao }) => ({ id, titulo: tituloSecao }))}
                  className="sm:grid sm:grid-cols-2 sm:gap-x-2 lg:block"
                />
              </nav>

              <div className="max-w-3xl min-w-0">
                <div className="space-y-14">
                  {secoes.map((secao, indice) => (
                    <section key={secao.id} id={secao.id} aria-labelledby={`${secao.id}-titulo`} className="scroll-mt-28">
                      <h2
                        id={`${secao.id}-titulo`}
                        className="mb-5 flex items-baseline gap-3 font-display text-2xl leading-tight font-semibold tracking-tight sm:text-[1.75rem]"
                      >
                        <span
                          aria-hidden="true"
                          className="font-mono text-sm font-medium text-marca-forte tabular-nums dark:text-marca-clara"
                        >
                          {String(indice + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0">
                          <span className="sr-only">{indice + 1}. </span>
                          {secao.titulo}
                        </span>
                      </h2>
                      <div className={classeTextoSecao}>{secao.conteudo}</div>
                    </section>
                  ))}
                </div>

                <Link
                  href={relacionado.href}
                  className="group mt-16 flex items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-xs transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-marca/30 hover:shadow-[0_18px_40px_-24px_var(--marca)] sm:p-6 dark:hover:border-marca-clara/30"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-marca-suave text-marca-forte transition-transform duration-300 group-hover:-rotate-6 dark:bg-marca/15 dark:text-marca-clara"
                  >
                    <FileText className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-muted-foreground">Veja também</span>
                    <span className="block font-display text-lg font-semibold tracking-tight">{relacionado.rotulo}</span>
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-5 shrink-0 text-marca-forte transition-transform duration-200 group-hover:translate-x-1 dark:text-marca-clara"
                  />
                </Link>
              </div>
            </div>
          </div>
        </main>

        <RodapePublico />
      </div>
    </ProvedorMovimento>
  );
}

/** Trecho que ainda depende de definição (dados da empresa, contatos) — fica bem visível. */
export function MarcadorPendente({ children }: { children: React.ReactNode }) {
  return (
    <mark className="rounded-md bg-amber-100 px-1 font-medium text-amber-950 [box-decoration-break:clone] dark:bg-amber-400/20 dark:text-amber-100">
      {children}
    </mark>
  );
}
