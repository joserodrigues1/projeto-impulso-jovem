import { AntesDepois } from "@/components/landing/anatomia/antes-depois";
import { ConstrutorPrompt } from "@/components/landing/anatomia/construtor-prompt";
import { TituloSecao } from "@/components/landing/titulo-secao";
import { Revelar } from "@/components/movimento";

/** Guia, parte 2: os ingredientes de um bom prompt, com construtor interativo e comparação antes × depois. */
export function SecaoAnatomiaPrompt() {
  return (
    <section id="anatomia" aria-labelledby="anatomia-titulo" className="relative isolate overflow-hidden py-24 md:py-32">
      {/* Grade sutil, mais visível no centro */}
      <div
        aria-hidden="true"
        className="fundo-grade pointer-events-none absolute inset-0 -z-10 text-foreground [mask-image:radial-gradient(ellipse_80%_55%_at_50%_35%,black_15%,transparent_75%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-40 left-1/2 -z-10 h-[32rem] w-[min(64rem,100%)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--marca)_14%,transparent),transparent)] blur-2xl"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <TituloSecao
          id="anatomia-titulo"
          sobretitulo="Anatomia do prompt"
          titulo={
            <>
              Monte um prompt <span className="texto-gradiente-claro dark:texto-gradiente">que funciona</span>
            </>
          }
          descricao="Um bom pedido para a IA tem até 5 ingredientes. Ligue e desligue cada um e veja, na hora, o prompt ficar mais claro e completo."
        />
        <Revelar className="mt-14 lg:mt-16" quanto={0.1}>
          <ConstrutorPrompt />
        </Revelar>
        <AntesDepois />
      </div>
    </section>
  );
}
