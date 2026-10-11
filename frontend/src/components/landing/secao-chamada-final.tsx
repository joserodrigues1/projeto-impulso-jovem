import Link from "next/link";
import { ArrowRight, ArrowUp } from "lucide-react";
import { FundoAurora, Revelar } from "@/components/movimento";
import { cn } from "@/lib/utils";

const FOCO_ESCURO =
  "focus-visible:ring-3 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-tinta focus-visible:outline-none";

const PASSOS = ["Estude com o guia", "Monte o currículo", "Treine com a Helena", "Siga o seu plano"];

/** Faixa final, sempre escura: chamada para criar a conta ou voltar ao guia. */
export function SecaoChamadaFinal() {
  return (
    <section
      aria-labelledby="chamada-final-titulo"
      className="relative isolate overflow-hidden bg-tinta py-24 text-white md:py-36"
    >
      <FundoAurora intensidade="suave" />
      {/* Grade que some nas bordas */}
      <div
        aria-hidden="true"
        className="fundo-grade pointer-events-none absolute inset-0 -z-10 text-white/60 [mask-image:radial-gradient(ellipse_60%_55%_at_50%_45%,black,transparent)]"
      />
      {/* Linha de luz no topo da faixa */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
      />

      <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
        <Revelar>
          <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-marca-clara uppercase">
            <span aria-hidden="true" className="size-1.5 animate-pulso-suave rounded-full bg-lima" />
            Bora começar
          </p>
        </Revelar>

        <Revelar atraso={0.08}>
          <h2
            id="chamada-final-titulo"
            className="mx-auto mt-6 max-w-4xl font-display text-[2.6rem] leading-[1.02] font-extrabold tracking-[-0.03em] sm:text-6xl md:text-7xl"
          >
            Seu primeiro emprego começa com <span className="texto-gradiente">um bom treino.</span>
          </h2>
        </Revelar>

        <Revelar atraso={0.16}>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/75 md:text-xl">
            O guia fica aberto para você voltar quando quiser. Quando se sentir pronto, crie sua conta para montar o
            currículo com IA e treinar a entrevista no WhatsApp.
          </p>
        </Revelar>

        <Revelar atraso={0.24} className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/registro"
            className={cn(
              "group relative inline-flex h-13 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-7 text-base font-semibold text-tinta sm:w-auto",
              "shadow-[0_18px_50px_-15px_color-mix(in_oklch,var(--marca)_80%,transparent)] transition-transform duration-300 hover:-translate-y-0.5",
              FOCO_ESCURO,
            )}
          >
            {/* Reflexo que passa pelo botão */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-brilho bg-gradient-to-r from-transparent via-marca/15 to-transparent"
            />
            Criar minha conta
            <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          <Link
            href="#jornada"
            className={cn(
              "group inline-flex h-13 w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 text-base font-semibold text-white backdrop-blur transition-colors hover:border-white/35 hover:bg-white/10 sm:w-auto",
              FOCO_ESCURO,
            )}
          >
            <ArrowUp aria-hidden="true" className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
            Voltar ao guia
          </Link>
        </Revelar>

        <Revelar atraso={0.32}>
          <ol
            aria-label="O caminho na plataforma"
            className="mx-auto mt-14 flex max-w-4xl flex-wrap items-center justify-center gap-x-2 gap-y-3 text-sm text-white/70"
          >
            {PASSOS.map((passo, i) => (
              <li key={passo} className="flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1.5 pr-3.5 pl-1.5">
                  <span
                    aria-hidden="true"
                    className="flex size-6 items-center justify-center rounded-full bg-white/10 font-mono text-[0.7rem] text-white"
                  >
                    {i + 1}
                  </span>
                  {passo}
                </span>
                {i < PASSOS.length - 1 && (
                  <span aria-hidden="true" className="hidden h-px w-5 bg-gradient-to-r from-white/30 to-white/0 sm:block" />
                )}
              </li>
            ))}
          </ol>
        </Revelar>
      </div>
    </section>
  );
}
