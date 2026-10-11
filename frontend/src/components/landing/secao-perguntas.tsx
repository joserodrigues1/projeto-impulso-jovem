import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { Revelar } from "@/components/movimento";
import { TituloSecao } from "@/components/landing/titulo-secao";
import { Acordeao } from "@/components/landing/perguntas/acordeao";
import { PERGUNTAS } from "@/components/landing/perguntas/dados";

/** Dados estruturados (schema.org FAQPage) com as mesmas perguntas e respostas da página. */
const DADOS_ESTRUTURADOS = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: PERGUNTAS.map((item) => ({
    "@type": "Question",
    name: item.pergunta,
    acceptedAnswer: { "@type": "Answer", text: item.respostaTexto },
  })),
};

/** Perguntas frequentes (acordeão acessível) + JSON-LD para buscadores. */
export function SecaoPerguntas() {
  return (
    <section id="duvidas" aria-labelledby="duvidas-titulo" className="relative scroll-mt-24 py-24 md:py-32">
      <script
        type="application/ld+json"
        // Escapa "<" para o conteúdo nunca fechar a tag <script> antes da hora
        dangerouslySetInnerHTML={{ __html: JSON.stringify(DADOS_ESTRUTURADOS).replace(/</g, "\\u003c") }}
      />

      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <TituloSecao
              id="duvidas-titulo"
              alinhamento="esquerda"
              sobretitulo="Dúvidas"
              titulo="Perguntas frequentes"
              descricao="O que a galera mais pergunta sobre usar IA no processo seletivo e sobre a plataforma."
            />

            <Revelar atraso={0.1} className="mt-8 hidden rounded-3xl border border-border bg-card p-6 lg:block">
              <div className="flex items-start gap-4">
                <span
                  aria-hidden="true"
                  className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-marca-suave text-marca-forte dark:bg-marca/15 dark:text-marca-clara"
                >
                  <BookOpen className="size-5" />
                </span>
                <div>
                  <p className="font-semibold text-foreground">Ainda com dúvida?</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    O guia explica, etapa por etapa, como usar a IA do jeito certo — com prompts prontos para copiar.
                  </p>
                  <Link
                    href="#jornada"
                    className="group mt-3 inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-marca-forte focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none dark:text-marca-clara"
                  >
                    Ir para o guia
                    <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </Revelar>
          </div>
        </div>

        <Revelar atraso={0.05} className="lg:col-span-7">
          <Acordeao
            prefixo="duvida"
            itens={PERGUNTAS.map(({ id, pergunta, resposta }) => ({ id, pergunta, resposta }))}
          />
        </Revelar>
      </div>
    </section>
  );
}
