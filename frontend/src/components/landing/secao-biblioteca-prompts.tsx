import { BibliotecaInterativa } from "@/components/landing/biblioteca/biblioteca-interativa";
import { PROMPTS } from "@/components/landing/biblioteca/prompts";
import { TituloSecao } from "@/components/landing/titulo-secao";

/** Seção 4 da landing: biblioteca de prompts por categoria, com filtro, busca e copiar. */
export function SecaoBibliotecaPrompts() {
  return (
    <section id="prompts" aria-labelledby="titulo-prompts" className="relative isolate overflow-x-clip py-24 md:py-32">
      {/* Luz suave atrás do título */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] bg-[radial-gradient(60%_60%_at_50%_0%,color-mix(in_oklch,var(--marca)_12%,transparent),transparent)]"
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <TituloSecao
          id="titulo-prompts"
          sobretitulo="Prompts prontos"
          titulo={
            <>
              Biblioteca de prompts para o seu{" "}
              <span className="texto-gradiente-claro dark:texto-gradiente">processo seletivo</span>
            </>
          }
          descricao={`São ${PROMPTS.length} pedidos prontos para cada momento: currículo, entrevista, estudos, mensagens, carreira e inglês. Escolha um, ajuste para a sua realidade e use na IA que preferir.`}
        />
        <BibliotecaInterativa />
      </div>
    </section>
  );
}
