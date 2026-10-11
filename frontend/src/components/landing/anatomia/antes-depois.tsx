import { ArrowDown, ArrowRight, Check, Sparkles, X } from "lucide-react";
import { BotaoCopiar } from "@/components/landing/botao-copiar";
import { CartaoHolofote, Revelar } from "@/components/movimento";
import { cn } from "@/lib/utils";
import {
  ANTES,
  COR_INGREDIENTE,
  DEPOIS,
  INGREDIENTES,
  ORDEM_INGREDIENTES,
  PROBLEMAS_ANTES,
  RESPOSTA_ANTES,
  montarPrompt,
} from "./ingredientes";
import { TrechoPrompt } from "./trecho-prompt";

const PROMPT_DEPOIS = montarPrompt(DEPOIS, new Set(ORDEM_INGREDIENTES));
/** O pedido vago até tem uma tarefa; faltam os outros quatro ingredientes. */
const INGREDIENTES_FALTANDO = ORDEM_INGREDIENTES.filter((id) => id !== "tarefa");

/** Comparação: o mesmo pedido feito de um jeito vago e com os 5 ingredientes. */
export function AntesDepois() {
  return (
    <div className="mt-16 md:mt-20">
      <Revelar className="mx-auto max-w-2xl text-center">
        <h3 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Antes × depois</h3>
        <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
          O mesmo pedido, feito de dois jeitos. O segundo não deixa a IA chutar.
        </p>
      </Revelar>

      <div className="mt-10 grid items-stretch gap-4 lg:grid-cols-[minmax(0,2fr)_auto_minmax(0,3fr)] lg:gap-5">
        <Revelar className="flex flex-col rounded-3xl border bg-card p-5 shadow-sm sm:p-7">
          <Rotulo tipo="antes" />
          <p className="mt-5 rounded-2xl border border-dashed border-foreground/20 bg-muted/60 p-4 font-mono text-sm">
            “{ANTES}”
          </p>

          {/* Resposta de exemplo, com os problemas marcados */}
          <figure className="mt-5">
            <figcaption className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles aria-hidden="true" className="size-4 text-muted-foreground" />
              Resposta típica da IA <span className="font-normal text-muted-foreground">(exemplo)</span>
            </figcaption>
            <blockquote className="mt-3 rounded-2xl rounded-tl-md bg-muted/60 p-4 text-[15px] leading-[1.9] text-muted-foreground">
              {RESPOSTA_ANTES.map((trecho, i) =>
                trecho.problema === undefined ? (
                  <span key={i}>{trecho.texto}</span>
                ) : (
                  <mark
                    key={i}
                    className="bg-transparent text-foreground underline decoration-destructive/55 decoration-wavy decoration-[1.5px] underline-offset-[5px]"
                  >
                    {trecho.texto}
                    <span className="sr-only"> (problema {trecho.problema + 1})</span>
                    <MarcaProblema numero={trecho.problema + 1} className="ml-1 -translate-y-px" />
                  </mark>
                ),
              )}
            </blockquote>
          </figure>

          <ol className="mt-4 space-y-2">
            {PROBLEMAS_ANTES.map((problema, i) => (
              <li key={problema.rotulo} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                <MarcaProblema numero={i + 1} className="mt-[0.15rem]" />
                <span>
                  <strong className="font-semibold text-foreground">{problema.rotulo}:</strong> {problema.texto}
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-auto pt-6">
            <h4 className="text-sm font-semibold">Faltou</h4>
            <ul className="mt-3 flex flex-wrap gap-2">
              {INGREDIENTES_FALTANDO.map((id) => (
                <li
                  key={id}
                  className="inline-flex items-center gap-2 rounded-full border border-dashed border-foreground/25 px-3 py-1 text-sm text-muted-foreground"
                >
                  <span aria-hidden="true" className={cn("size-2 rounded-full opacity-70", COR_INGREDIENTE[id].ponto)} />
                  {INGREDIENTES[id].nome}
                </li>
              ))}
            </ul>
          </div>
        </Revelar>

        <div aria-hidden="true" className="flex items-center justify-center">
          <span className="grid size-11 place-items-center rounded-full border bg-card text-muted-foreground shadow-sm">
            <ArrowDown className="size-5 lg:hidden" />
            <ArrowRight className="hidden size-5 lg:block" />
          </span>
        </div>

        <Revelar atraso={0.12} className="flex">
          <CartaoHolofote className="borda-gradiente flex w-full flex-col rounded-3xl p-5 shadow-xl shadow-marca/10 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Rotulo tipo="depois" />
              <BotaoCopiar texto={PROMPT_DEPOIS} rotulo="Copiar prompt" />
            </div>
            <div className="mt-5 space-y-2.5 rounded-2xl border bg-background/70 p-4 font-mono text-[13px] leading-[1.8] sm:text-sm">
              {ORDEM_INGREDIENTES.map((id) => (
                <p key={id}>
                  <TrechoPrompt ingrediente={id} texto={DEPOIS[id]} />
                </p>
              ))}
            </div>
            <h4 className="mt-6 text-sm font-semibold">Por que funciona</h4>
            <ul className="mt-3 grid gap-x-6 gap-y-2 md:grid-cols-2">
              {ORDEM_INGREDIENTES.map((id) => (
                <li key={id} className="flex gap-2.5 text-sm leading-relaxed">
                  <span
                    aria-hidden="true"
                    className={cn("mt-[0.5em] size-2.5 shrink-0 rounded-full", COR_INGREDIENTE[id].ponto)}
                  />
                  <span>
                    <strong className="font-semibold">{INGREDIENTES[id].nome}:</strong>{" "}
                    <span className="text-muted-foreground">{INGREDIENTES[id].porque}</span>
                  </span>
                </li>
              ))}
            </ul>
          </CartaoHolofote>
        </Revelar>
      </div>
    </div>
  );
}

/** Número que liga o trecho marcado da resposta ao problema explicado na lista (visual; o texto vai em sr-only). */
function MarcaProblema({ numero, className }: { numero: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-grid size-[1.15rem] shrink-0 place-items-center rounded-full bg-destructive/15 align-middle font-sans text-[11px] leading-none font-bold text-foreground",
        className,
      )}
    >
      {numero}
    </span>
  );
}

function Rotulo({ tipo }: { tipo: "antes" | "depois" }) {
  const depois = tipo === "depois";
  return (
    <p
      className={cn(
        "inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-sm font-semibold",
        depois ? "bg-lima text-tinta" : "bg-foreground/8 text-foreground",
      )}
    >
      {depois ? (
        <Check aria-hidden="true" className="size-4" strokeWidth={3} />
      ) : (
        <X aria-hidden="true" className="size-4" strokeWidth={3} />
      )}
      {depois ? "Depois: prompt completo" : "Antes: pedido vago"}
    </p>
  );
}
