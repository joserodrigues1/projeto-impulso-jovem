"use client";

import { Fragment, useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, ChevronDown, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { CartaoEtapa } from "./cartao-etapa";
import { ETAPAS } from "./etapas";

/** Mesmo ponto de quebra do `lg:` do Tailwind. */
const CONSULTA_DESKTOP = "(min-width: 64rem)";

function assinarDesktop(avisar: () => void) {
  const consulta = window.matchMedia(CONSULTA_DESKTOP);
  consulta.addEventListener("change", avisar);
  return () => consulta.removeEventListener("change", avisar);
}
const ehDesktop = () => window.matchMedia(CONSULTA_DESKTOP).matches;
/** No servidor (e na hidratação) vale o layout do celular; o visual não depende disso, só os atributos. */
const ehDesktopNoServidor = () => false;

const TOTAL = ETAPAS.length;
const CURVA = "ease-[cubic-bezier(0.16,1,0.3,1)]";

/**
 * Etapas do processo seletivo, com uma etapa aberta por vez.
 * Desktop: lista à esquerda (com trilho de progresso) e o cartão da etapa à direita.
 * Celular: linha do tempo vertical, cada etapa abre logo abaixo do próprio título.
 * Todo o conteúdo está no HTML; as etapas fechadas ficam inertes (fora do foco e dos leitores de tela).
 */
export function JornadaInterativa() {
  const desktop = useSyncExternalStore(assinarDesktop, ehDesktop, ehDesktopNoServidor);
  const reduzir = useReducedMotion();
  const [ativa, setAtiva] = useState(0);
  // Só no celular: a etapa ativa pode ser recolhida tocando de novo no título
  const [recolhida, setRecolhida] = useState(false);
  const cabecalhosRef = useRef<Array<HTMLButtonElement | null>>([]);
  const paineisRef = useRef<Array<HTMLDivElement | null>>([]);
  // A tela só é rolada depois de uma ação da pessoa (nunca sozinha)
  const rolarRef = useRef(false);

  // Link direto para uma etapa (ex.: /#etapa-entrevista) abre essa etapa
  useEffect(() => {
    const abrirDoEndereco = () => {
      const i = ETAPAS.findIndex((etapa) => `#${etapa.id}` === window.location.hash);
      if (i < 0) return;
      setAtiva(i);
      setRecolhida(false);
      // Depois de a etapa abrir, mostra o começo dela (no celular, o título; no desktop, o cartão)
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const alvo = ehDesktop() ? paineisRef.current[i] : cabecalhosRef.current[i];
          alvo?.scrollIntoView({ block: "start" });
        }),
      );
    };
    abrirDoEndereco();
    window.addEventListener("hashchange", abrirDoEndereco);
    return () => window.removeEventListener("hashchange", abrirDoEndereco);
  }, []);

  // Se a etapa aberta ficou acima da tela (a anterior, mais alta, fechou), traz o começo dela de volta
  useEffect(() => {
    if (!rolarRef.current) return;
    rolarRef.current = false;
    const alvo = desktop ? paineisRef.current[ativa] : cabecalhosRef.current[ativa];
    if (alvo && alvo.getBoundingClientRect().top < 72) {
      alvo.scrollIntoView({ block: "start", behavior: reduzir ? "auto" : "smooth" });
    }
  }, [ativa, recolhida, desktop, reduzir]);

  function escolher(i: number) {
    rolarRef.current = true;
    if (i === ativa && !ehDesktop()) {
      setRecolhida((r) => !r);
      return;
    }
    setAtiva(i);
    setRecolhida(false);
  }

  function avancar(i: number) {
    const proxima = Math.min(i + 1, TOTAL - 1);
    // O botão clicado fica inerte com a troca: o foco vai para o título da próxima etapa
    cabecalhosRef.current[proxima]?.focus({ preventScroll: true });
    rolarRef.current = true;
    setAtiva(proxima);
    setRecolhida(false);
  }

  function aoTeclar(evento: KeyboardEvent<HTMLButtonElement>, i: number) {
    const destinos: Record<string, number> = {
      ArrowDown: (i + 1) % TOTAL,
      ArrowUp: (i - 1 + TOTAL) % TOTAL,
      Home: 0,
      End: TOTAL - 1,
    };
    const destino = destinos[evento.key];
    if (destino === undefined) return;
    evento.preventDefault();
    cabecalhosRef.current[destino]?.focus();
  }

  return (
    <div className="mt-10 lg:mt-14 lg:grid lg:grid-cols-[minmax(0,17.5rem)_minmax(0,1fr)] lg:grid-rows-[repeat(6,auto)_1fr] lg:gap-x-10 lg:gap-y-1 xl:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] xl:gap-x-12">
      {/* Trilho de progresso da lista (desktop): vai da etapa 1 até a etapa aberta */}
      <div aria-hidden="true" className="pointer-events-none relative hidden lg:col-start-1 lg:row-span-6 lg:row-start-1 lg:block">
        <span className="absolute top-8 bottom-8 left-8 w-0.5 -translate-x-1/2 rounded-full bg-border" />
        <span
          style={{ transform: `scaleY(${ativa / (TOTAL - 1)})` }}
          className={cn(
            "absolute top-8 bottom-8 left-8 w-0.5 origin-top -translate-x-1/2 rounded-full bg-linear-to-b from-marca via-ciano to-lima transition-transform duration-700",
            CURVA,
          )}
        />
      </div>

      {ETAPAS.map((etapa, i) => {
        const selecionada = i === ativa;
        // No desktop a etapa escolhida está sempre aberta (recolher é só no celular)
        const aberta = selecionada && (desktop || !recolhida);
        const feita = i < ativa;
        const idCabecalho = `${etapa.id}-botao`;

        return (
          <Fragment key={etapa.id}>
            <h3 className="relative lg:col-start-1" style={{ gridRowStart: i + 1 }}>
              {/* Trilho do celular: metade de cima e metade de baixo da bolinha */}
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-0 left-4 h-1/2 w-0.5 -translate-x-1/2 transition-colors duration-500 lg:hidden",
                    i <= ativa ? "bg-marca" : "bg-border",
                  )}
                />
              )}
              {i < TOTAL - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-1/2 bottom-0 left-4 w-0.5 -translate-x-1/2 transition-colors duration-500 lg:hidden",
                    feita ? "bg-marca" : "bg-border",
                  )}
                />
              )}

              <button
                ref={(el) => {
                  cabecalhosRef.current[i] = el;
                }}
                id={idCabecalho}
                type="button"
                aria-expanded={aberta}
                aria-controls={etapa.id}
                onClick={() => escolher(i)}
                onKeyDown={(e) => aoTeclar(e, i)}
                className={cn(
                  "group relative isolate flex min-h-16 w-full scroll-mt-24 items-center gap-4 rounded-2xl py-2 pr-2 text-left lg:h-16 lg:py-0 lg:pr-4 lg:pl-3",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                )}
              >
                {selecionada && (
                  <motion.span
                    layoutId="jornada-etapa-atual"
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 hidden rounded-2xl border bg-card shadow-sm lg:block"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
                <span
                  aria-hidden="true"
                  className={cn(
                    "relative grid size-8 shrink-0 place-items-center rounded-full border text-sm font-semibold transition-[background-color,border-color,color,box-shadow] duration-300 lg:size-10",
                    feita && "border-transparent bg-marca text-white",
                    selecionada && "border-marca bg-background text-marca-forte ring-4 ring-marca/15 dark:text-marca-clara",
                    !feita && !selecionada && "border-border bg-background text-muted-foreground",
                  )}
                >
                  {feita ? <Check className="size-4" strokeWidth={3} /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase lg:hidden">
                    Etapa {i + 1}
                  </span>
                  <span
                    className={cn(
                      "block font-display text-lg leading-snug font-semibold tracking-tight lg:font-sans lg:text-base lg:font-medium lg:tracking-normal lg:transition-colors",
                      selecionada ? "lg:text-foreground" : "lg:text-muted-foreground lg:group-hover:text-foreground",
                    )}
                  >
                    <span className="lg:hidden">{etapa.titulo}</span>
                    <span className="hidden lg:inline">{etapa.tituloCurto}</span>
                  </span>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    "size-5 shrink-0 text-muted-foreground transition-transform duration-300 lg:hidden",
                    aberta && "rotate-180",
                  )}
                />
              </button>
            </h3>

            <div
              ref={(el) => {
                paineisRef.current[i] = el;
              }}
              id={etapa.id}
              role="region"
              aria-labelledby={idCabecalho}
              inert={!aberta}
              className={cn(
                // Desktop: os cartões ocupam o mesmo lugar (o mais alto define a altura) e se alternam com um esmaecer.
                // Celular: abre deslizando e fecha na hora, para a página não "andar" sozinha.
                // O estado fechado não depende do ponto de quebra, para não piscar ao redimensionar a janela.
                "relative grid scroll-mt-24 duration-500 lg:col-start-2 lg:row-span-7 lg:row-start-1 lg:grid-rows-[1fr]",
                CURVA,
                aberta
                  ? "visible grid-rows-[1fr] translate-y-0 opacity-100 transition-[grid-template-rows,opacity,translate,visibility]"
                  : "invisible grid-rows-[0fr] translate-y-3 opacity-0 transition-[opacity,translate,visibility]",
              )}
            >
              {i < TOTAL - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-y-0 left-4 w-0.5 -translate-x-1/2 transition-colors duration-500 lg:hidden",
                    feita ? "bg-marca" : "bg-border",
                  )}
                />
              )}
              <div className="min-h-0 overflow-hidden lg:overflow-visible">
                <CartaoEtapa
                  etapa={etapa}
                  indice={i}
                  total={TOTAL}
                  ativa={aberta}
                  proxima={ETAPAS[i + 1]?.tituloCurto}
                  aoAvancar={() => avancar(i)}
                />
              </div>
            </div>
          </Fragment>
        );
      })}

      <p className="mt-6 hidden gap-3 self-start rounded-2xl border border-dashed p-4 text-sm leading-relaxed text-muted-foreground lg:col-start-1 lg:row-start-7 lg:flex">
        <Lightbulb aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-marca dark:text-marca-clara" />
        <span>
          Os prompts funcionam em qualquer assistente de IA: copie, cole e troque o que está entre{" "}
          <span className="font-semibold text-foreground">[colchetes]</span> pelos seus dados.
        </span>
      </p>
    </div>
  );
}
