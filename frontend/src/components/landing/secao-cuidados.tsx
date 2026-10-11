import { Check, CircleCheck, X } from "lucide-react";
import { TextoPrompt } from "@/components/landing/biblioteca/texto-prompt";
import { CHECKLIST, COMBINADOS } from "@/components/landing/cuidados/combinados";
import { TituloSecao } from "@/components/landing/titulo-secao";
import { Revelar } from "@/components/movimento";

/** Seção 6 da landing: usar a IA com responsabilidade — combinados no formato "Faça" × "Evite". */
export function SecaoCuidados() {
  return (
    <section id="cuidados" aria-labelledby="titulo-cuidados" className="relative isolate overflow-x-clip py-24 md:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:gap-16">
        {/* Coluna fixa no desktop: título + regra de ouro */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <TituloSecao
              id="titulo-cuidados"
              alinhamento="esquerda"
              sobretitulo="Cuidados"
              titulo={
                <>
                  Use com <span className="texto-gradiente-claro dark:texto-gradiente">responsabilidade</span>
                </>
              }
              descricao="A IA é uma parceira e tanto, mas quem assina o currículo e senta na entrevista é você. Alguns combinados para usar bem — e sem dor de cabeça."
            />

            <Revelar atraso={0.1} className="relative mt-10">
              <div
                aria-hidden="true"
                className="absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-to-br from-marca/25 via-ciano/15 to-lima/15 opacity-70 blur-2xl dark:opacity-50"
              />
              <div
                className="borda-gradiente rounded-3xl p-6 shadow-xl shadow-marca/5 sm:p-7"
                style={{ "--angulo": "210deg" } as React.CSSProperties}
              >
                <p className="text-xs font-semibold tracking-[0.14em] text-marca-forte uppercase dark:text-marca-clara">
                  Regra de ouro
                </p>
                <p className="mt-3 font-display text-2xl leading-snug font-semibold tracking-tight">
                  A IA ajuda você a contar melhor a sua história. Quem escreve a história é você.
                </p>
                <div aria-hidden="true" className="my-6 h-px bg-border" />
                <p className="text-sm font-semibold">Antes de usar um texto da IA, confira:</p>
                <ul className="mt-3 space-y-2.5">
                  {CHECKLIST.map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-[15px]">
                      <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-marca-forte dark:text-marca-clara" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Revelar>
          </div>
        </div>

        {/* Combinados */}
        <ol className="space-y-4 lg:col-span-7 lg:space-y-5">
          {COMBINADOS.map((combinado, i) => {
            const Icone = combinado.icone;
            return (
              <Revelar key={combinado.titulo} como="li" atraso={0.04} quanto={0.25}>
                <article className="rounded-3xl border bg-card p-5 shadow-sm transition-colors duration-300 hover:border-marca/25 sm:p-7">
                  {/* No celular a descrição ocupa a largura toda; a partir do sm, alinha com o título */}
                  <div className="flex items-center gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-marca/10 text-marca-forte ring-1 ring-marca/15 dark:bg-marca/20 dark:text-marca-clara">
                      <Icone aria-hidden="true" className="size-5" />
                    </span>
                    <h3 className="min-w-0 flex-1 font-display text-xl leading-tight font-semibold tracking-tight">
                      {combinado.titulo}
                    </h3>
                    <span aria-hidden="true" className="hidden self-start font-mono text-sm text-muted-foreground/70 sm:block">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground sm:-mt-1 sm:pl-15">
                    {combinado.descricao}
                  </p>

                  <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-lima/70 bg-lima/15 p-4 dark:border-lima/30 dark:bg-lima/[0.09]">
                      <dt className="flex items-center gap-2 text-sm font-semibold">
                        <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-lima text-tinta">
                          <Check className="size-3.5" strokeWidth={3} />
                        </span>
                        Faça
                      </dt>
                      <dd className="mt-2 text-[15px] leading-relaxed">
                        <TextoPrompt texto={combinado.faca} />
                      </dd>
                    </div>
                    <div className="rounded-2xl border border-destructive/20 bg-destructive/[0.05] p-4 dark:border-destructive/25 dark:bg-destructive/[0.08]">
                      <dt className="flex items-center gap-2 text-sm font-semibold">
                        <span
                          aria-hidden="true"
                          className="grid size-6 place-items-center rounded-full bg-destructive/15 text-destructive"
                        >
                          <X className="size-3.5" strokeWidth={3} />
                        </span>
                        Evite
                      </dt>
                      <dd className="mt-2 text-[15px] leading-relaxed">{combinado.evite}</dd>
                    </div>
                  </dl>
                </article>
              </Revelar>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
