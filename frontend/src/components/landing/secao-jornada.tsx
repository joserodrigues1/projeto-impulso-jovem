import { TituloSecao } from "@/components/landing/titulo-secao";
import { JornadaInterativa } from "@/components/landing/jornada/jornada-interativa";

/** Guia, parte 1: como a IA ajuda em cada etapa do processo seletivo, com prompts prontos. */
export function SecaoJornada() {
  return (
    <section id="jornada" aria-labelledby="jornada-titulo" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <TituloSecao
          id="jornada-titulo"
          sobretitulo="Etapa por etapa"
          alinhamento="esquerda"
          titulo={
            <>
              Como a IA ajuda em{" "}
              <span className="texto-gradiente-claro dark:texto-gradiente">cada etapa</span> do processo seletivo
            </>
          }
          descricao={
            <>
              Do anúncio da vaga ao agradecimento depois da entrevista: veja o que pedir para a IA em cada momento,
              copie o prompt pronto e troque o que está entre <span className="font-semibold text-foreground">[colchetes]</span>{" "}
              pelos seus dados.
            </>
          }
        />
        <JornadaInterativa />
      </div>
    </section>
  );
}
