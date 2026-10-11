"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp, Pause, Play, Sparkles } from "lucide-react";
import { CURVA_IMPULSO, TextoDigitado } from "@/components/movimento";
import { cn } from "@/lib/utils";
import { CENARIOS } from "./cenarios";

type Fase = "digitando" | "pensando" | "respondendo";

/** Quanto tempo a IA "pensa" antes de responder (ms). */
const ESPERA_PENSANDO = 900;
/** Intervalo entre os itens da resposta (s). */
const INTERVALO_ITENS = 0.45;
/** Tempo para ler a resposta completa antes de trocar de exemplo (ms). */
const TEMPO_LEITURA = 6500;

/**
 * Onde cada chip flutua em volta do cartão (desktop), sempre sobre áreas livres: o meio do cabeçalho,
 * a margem à esquerda do pedido e a caixa de texto. No celular, ficam em linha acima do cartão.
 */
const POSICAO_CHIP = ["lg:-top-5 lg:left-[42%]", "lg:top-[24%] lg:-left-16", "lg:-bottom-5 lg:left-[14%]"];
const ATRASO_FLUTUAR = ["lg:[animation-delay:0s]", "lg:[animation-delay:-2.4s]", "lg:[animation-delay:-4.8s]"];

const assinarNada = () => () => {};

/**
 * Demonstração da abertura: o pedido do jovem é digitado e a IA responde em itens, em sequência.
 * Os exemplos trocam sozinhos (com botão de pausa) ou pelos chips. Com "reduzir movimento",
 * o exemplo aparece completo e só troca pelos chips. É ilustrativo: leitores de tela recebem a
 * conversa como texto na legenda.
 */
export function DemonstracaoIA() {
  const reduzir = useReducedMotion();
  // "Reduzir movimento" só é conhecido no navegador: a digitação entra depois da hidratação,
  // para o HTML do servidor e o primeiro desenho no cliente serem iguais
  const hidratado = useSyncExternalStore(assinarNada, () => true, () => false);
  const [indice, setIndice] = useState(0);
  // Muda a cada novo exemplo — reinicia a digitação mesmo quando o mesmo chip é escolhido de novo
  const [rodada, setRodada] = useState(0);
  const [fase, setFase] = useState<Fase>("digitando");
  const [automatico, setAutomatico] = useState(true);
  const cenario = CENARIOS[indice];
  const trocaAutomatica = automatico && !reduzir;

  // "Pensando…" → resposta
  useEffect(() => {
    if (fase !== "pensando") return;
    const espera = setTimeout(() => setFase("respondendo"), reduzir ? 0 : ESPERA_PENSANDO);
    return () => clearTimeout(espera);
  }, [fase, reduzir]);

  // Resposta lida → próximo exemplo
  useEffect(() => {
    if (fase !== "respondendo" || !trocaAutomatica) return;
    const duracao = (cenario.itens.length + 1) * INTERVALO_ITENS * 1000 + TEMPO_LEITURA;
    const espera = setTimeout(() => {
      setIndice((i) => (i + 1) % CENARIOS.length);
      setRodada((r) => r + 1);
      setFase("digitando");
    }, duracao);
    return () => clearTimeout(espera);
  }, [fase, trocaAutomatica, cenario]);

  function escolher(i: number) {
    setAutomatico(false);
    setIndice(i);
    setRodada((r) => r + 1);
    setFase("digitando");
  }

  return (
    <figure className="relative mx-auto w-full max-w-md lg:max-w-none">
      <figcaption className="sr-only">
        Exemplo de conversa com uma inteligência artificial. Pedido: {cenario.pedido} Resposta: {cenario.abertura}{" "}
        {cenario.itens.join(" ")}
      </figcaption>

      {/* Luz atrás do cartão */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-10 -z-10 bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--marca)_55%,transparent),transparent)] opacity-70 blur-2xl"
      />

      {/* Chips: escolhem o exemplo (flutuam em volta do cartão no desktop) */}
      <div
        role="group"
        aria-label="Escolher exemplo de conversa"
        className="mb-4 flex flex-wrap justify-center gap-2 lg:pointer-events-none lg:absolute lg:inset-0 lg:z-20 lg:mb-0 lg:block"
      >
        {CENARIOS.map((c, i) => {
          const Icone = c.icone;
          const ativo = i === indice;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={ativo}
              onClick={() => escolher(i)}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold shadow-lg backdrop-blur-md transition-[background-color,color,border-color,box-shadow] duration-300",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                "lg:pointer-events-auto lg:absolute lg:animate-flutuar",
                POSICAO_CHIP[i],
                ATRASO_FLUTUAR[i],
                ativo
                  ? "border-transparent bg-lima text-tinta shadow-lima/25"
                  : "border-white/15 bg-tinta-2/80 text-white/85 shadow-black/30 hover:border-white/30 hover:text-white",
              )}
            >
              <Icone aria-hidden="true" className="size-4" />
              {c.rotulo}
            </button>
          );
        })}
      </div>

      {/* Cartão da conversa */}
      <div className="vidro relative overflow-hidden rounded-[1.75rem] border border-white/12 shadow-2xl shadow-black/50">
        <div className="flex items-center gap-3 border-b border-white/10 py-3 pr-3 pl-5">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,var(--marca),var(--ciano))] text-white"
          >
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-sm font-semibold text-white">Assistente de IA</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span aria-hidden="true" className="size-1.5 animate-pulso-suave rounded-full bg-lima" />
              Exemplo de conversa
            </p>
          </div>
          {/* Sem troca automática com "reduzir movimento": o botão some só pelo CSS (o HTML é o mesmo do servidor) */}
          <button
            type="button"
            onClick={() => setAutomatico((a) => !a)}
            aria-label={automatico ? "Pausar a troca automática de exemplos" : "Retomar a troca automática de exemplos"}
            className="grid size-10 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-ring motion-reduce:hidden"
          >
            {automatico ? <Pause aria-hidden="true" className="size-4" /> : <Play aria-hidden="true" className="size-4" />}
          </button>
        </div>

        <div aria-hidden="true" className="flex h-[30rem] flex-col gap-4 overflow-hidden p-4 sm:h-[27.5rem] sm:p-5">
          {/* Pedido do jovem */}
          <div className="ml-auto max-w-[90%] rounded-2xl rounded-br-md bg-marca px-4 py-3 text-[15px] leading-relaxed text-white shadow-lg shadow-marca/25">
            {hidratado ? (
              <TextoDigitado
                key={`${indice}-${rodada}`}
                texto={cenario.pedido}
                velocidade={17}
                atraso={rodada === 0 ? 900 : 400}
                aoTerminar={() => setFase("pensando")}
              />
            ) : (
              <span className="inline-block h-[1.1em] w-[2px] translate-y-[0.15em] animate-cursor bg-current" />
            )}
          </div>

          {/* Resposta da IA */}
          <AnimatePresence mode="wait" initial={false}>
            {fase === "pensando" && (
              <motion.div
                key="pensando"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-3"
              >
                <AvatarIA />
                <span className="flex gap-1 rounded-full border border-white/10 bg-white/5 px-3.5 py-3">
                  {[0, 1, 2].map((p) => (
                    <span
                      key={p}
                      className="size-1.5 animate-pulso-suave rounded-full bg-white/70"
                      style={{ animationDelay: `${p * 0.2}s`, animationDuration: "1s" }}
                    />
                  ))}
                </span>
              </motion.div>
            )}
            {fase === "respondendo" && (
              <motion.div
                key={`resposta-${indice}-${rodada}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.45, ease: CURVA_IMPULSO }}
                className="flex gap-3"
              >
                <AvatarIA />
                <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.04] px-4 py-3 text-[15px] leading-relaxed text-white/90">
                  <p className="font-semibold text-white">{cenario.abertura}</p>
                  <ul className="mt-2 space-y-2">
                    {cenario.itens.map((item, i) => (
                      <motion.li
                        key={item}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: (i + 1) * INTERVALO_ITENS, duration: 0.5, ease: CURVA_IMPULSO }}
                        className="flex gap-2.5"
                      >
                        <span className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-ciano" />
                        <span>{item}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Caixa de texto (decorativa) */}
        <div aria-hidden="true" className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 py-1.5 pr-1.5 pl-4 text-sm text-muted-foreground">
            <span className="flex-1 truncate">Escreva seu pedido…</span>
            <span className="grid size-8 place-items-center rounded-full bg-white text-tinta">
              <ArrowUp className="size-4" />
            </span>
          </div>
        </div>
      </div>
    </figure>
  );
}

function AvatarIA() {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/15 bg-white/5 text-ciano">
      <Sparkles className="size-4" />
    </span>
  );
}
