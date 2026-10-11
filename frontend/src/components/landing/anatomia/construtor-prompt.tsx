"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { Eraser, Lightbulb, WandSparkles } from "lucide-react";
import { BotaoCopiar } from "@/components/landing/botao-copiar";
import { CURVA_IMPULSO } from "@/components/movimento";
import { cn } from "@/lib/utils";
import {
  COR_INGREDIENTE,
  INGREDIENTES,
  MODELOS,
  ORDEM_INGREDIENTES,
  montarPrompt,
  type IdIngrediente,
  type IdModelo,
} from "./ingredientes";
import { TrechoPrompt } from "./trecho-prompt";

/** Nome do nível de qualidade, de 0 a 5 ingredientes. */
const NIVEIS = ["Vazio", "Vago", "Fraco", "Razoável", "Bom", "Excelente"] as const;

/** Cor de cada segmento do medidor (degradê da marca, do violeta ao lima). */
const COR_SEGMENTO = [
  "bg-marca",
  "bg-[color-mix(in_oklch,var(--marca),var(--ciano))]",
  "bg-ciano",
  "bg-[color-mix(in_oklch,var(--ciano),var(--lima))]",
  "bg-lima",
];

/** Próximo ingrediente sugerido, em ordem de impacto na resposta. */
const ORDEM_DICAS: readonly IdIngrediente[] = ["tarefa", "contexto", "papel", "formato", "tom"];
const DICAS: Record<IdIngrediente, string> = {
  tarefa: "Comece pela Tarefa: sem um pedido claro, a IA tenta adivinhar o que você precisa.",
  contexto: "Agora o Contexto: contando quem você é, a resposta deixa de ser genérica.",
  papel: "Que tal o Papel? Com ele, a IA responde com o olhar de quem entende do assunto.",
  formato: "Falta o Formato: diga como quer a resposta (lista, passo a passo, tamanho).",
  tom: "Por último, Tom e limites: evita texto engessado e informação inventada.",
};
const DICA_COMPLETO = "Prompt completo! Troque o que está entre [colchetes] pelos seus dados e cole na IA que você usa.";

/** Ingredientes que a demonstração liga sozinha, um a um, quando o construtor aparece na tela. */
const DEMONSTRACAO: readonly IdIngrediente[] = ["papel", "contexto", "formato", "tom"];

/**
 * Construtor de prompt: escolha um modelo, ligue e desligue os 5 ingredientes e veja o prompt
 * se montar, com cada trecho na cor do ingrediente e um medidor de qualidade.
 */
export function ConstrutorPrompt() {
  const [idModelo, setIdModelo] = useState<IdModelo>("curriculo");
  const [ligados, setLigados] = useState<ReadonlySet<IdIngrediente>>(() => new Set<IdIngrediente>(["tarefa"]));
  const [realce, setRealce] = useState<IdIngrediente | null>(null);
  const raizRef = useRef<HTMLDivElement>(null);
  const abasRef = useRef<Array<HTMLButtonElement | null>>([]);
  // A demonstração automática para assim que a pessoa mexe em qualquer coisa
  const mexeuRef = useRef(false);
  // Leitores de tela só ouvem a qualidade depois que a pessoa mexe (não durante a demonstração)
  const [interagiu, setInteragiu] = useState(false);
  const visivel = useInView(raizRef, { once: true, amount: 0.35 });
  const reduzir = useReducedMotion();

  const modelo = MODELOS.find((m) => m.id === idModelo) ?? MODELOS[0];
  const ativos = ORDEM_INGREDIENTES.filter((id) => ligados.has(id));
  // Sem a tarefa, o prompt não pede nada: no máximo "Vago"
  const pontos = ligados.has("tarefa") ? ligados.size : Math.min(ligados.size, 1);
  const nivel = NIVEIS[pontos];
  const proximo = ORDEM_DICAS.find((id) => !ligados.has(id));
  const prompt = montarPrompt(modelo.textos, ligados);

  useEffect(() => {
    if (!visivel || reduzir) return;
    const esperas = DEMONSTRACAO.map((id, i) =>
      setTimeout(
        () => {
          if (!mexeuRef.current) setLigados((atual) => new Set(atual).add(id));
        },
        900 + i * 750,
      ),
    );
    return () => esperas.forEach(clearTimeout);
  }, [visivel, reduzir]);

  function marcarInteracao() {
    mexeuRef.current = true;
    setInteragiu(true);
  }

  function alternar(id: IdIngrediente) {
    marcarInteracao();
    setLigados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function escolherModelo(id: IdModelo) {
    marcarInteracao();
    setIdModelo(id);
  }

  function aoTeclarAba(evento: KeyboardEvent<HTMLButtonElement>, i: number) {
    const n = MODELOS.length;
    const destinos: Record<string, number> = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 };
    const destino = destinos[evento.key];
    if (destino === undefined) return;
    evento.preventDefault();
    escolherModelo(MODELOS[destino].id);
    abasRef.current[destino]?.focus();
  }

  return (
    <div
      ref={raizRef}
      className="overflow-hidden rounded-[2rem] border bg-card/85 shadow-2xl shadow-marca/8 backdrop-blur-sm dark:bg-card/70"
    >
      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Controles */}
        <div className="border-b p-5 sm:p-7 lg:border-r lg:border-b-0">
          <p id="anatomia-modelos-rotulo" className="text-sm font-semibold">
            <span className="text-muted-foreground">1.</span> Escolha um modelo
          </p>
          <div
            role="tablist"
            aria-labelledby="anatomia-modelos-rotulo"
            className="mt-3 grid grid-cols-3 gap-1 rounded-full border bg-muted/70 p-1"
          >
            {MODELOS.map((m, i) => {
              const selecionado = m.id === idModelo;
              const Icone = m.icone;
              return (
                <button
                  key={m.id}
                  ref={(el) => {
                    abasRef.current[i] = el;
                  }}
                  id={`anatomia-aba-${m.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selecionado}
                  aria-controls="anatomia-previa"
                  tabIndex={selecionado ? 0 : -1}
                  onClick={() => escolherModelo(m.id)}
                  onKeyDown={(e) => aoTeclarAba(e, i)}
                  className={cn(
                    "relative isolate inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-semibold transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    selecionado ? "text-white" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {selecionado && (
                    <motion.span
                      layoutId="anatomia-modelo-ativo"
                      aria-hidden="true"
                      className="absolute inset-0 -z-10 rounded-full bg-marca shadow-md shadow-marca/30"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <Icone aria-hidden="true" className="hidden size-4 sm:block" />
                  {m.rotulo}
                </button>
              );
            })}
          </div>

          <p className="mt-7 text-sm font-semibold">
            <span className="text-muted-foreground">2.</span> Ligue os ingredientes
          </p>
          <ul className="mt-3 flex flex-wrap gap-2 lg:flex-col">
            {ORDEM_INGREDIENTES.map((id) => {
              const ligado = ligados.has(id);
              const ingrediente = INGREDIENTES[id];
              return (
                <li key={id}>
                  <button
                    type="button"
                    aria-pressed={ligado}
                    onClick={() => alternar(id)}
                    onPointerEnter={(e) => e.pointerType === "mouse" && setRealce(id)}
                    onPointerLeave={() => setRealce(null)}
                    onFocus={() => setRealce(id)}
                    onBlur={() => setRealce(null)}
                    className={cn(
                      "group flex h-11 items-center gap-2.5 rounded-full border px-4 text-left text-sm font-semibold transition-[background-color,border-color,color] duration-300",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      "lg:h-auto lg:w-full lg:gap-3.5 lg:rounded-2xl lg:py-3",
                      ligado
                        ? cn("text-foreground", COR_INGREDIENTE[id].anel)
                        : "border-dashed border-foreground/20 text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-2.5 shrink-0 rounded-full transition-all duration-300",
                        ligado ? cn(COR_INGREDIENTE[id].ponto, "scale-110") : "border-2 border-current opacity-60",
                      )}
                    />
                    <span className="min-w-0 lg:flex-1">
                      <span className="block">{ingrediente.nome}</span>
                      <span className="mt-0.5 hidden text-[13px] font-normal text-muted-foreground lg:block">
                        {ingrediente.descricao}
                      </span>
                    </span>
                    {/* Interruptor (visual) */}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "relative hidden h-6 w-10 shrink-0 rounded-full transition-colors duration-300 lg:block",
                        ligado ? "bg-foreground" : "bg-foreground/15",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-1 left-1 size-4 rounded-full bg-background shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                          ligado && "translate-x-4",
                        )}
                      />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                marcarInteracao();
                setLigados(new Set(ORDEM_INGREDIENTES));
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-marca-forte transition-colors hover:bg-marca/10 focus-visible:outline-2 focus-visible:outline-ring dark:text-marca-clara"
            >
              <WandSparkles aria-hidden="true" className="size-4" />
              Ligar todos
            </button>
            <button
              type="button"
              onClick={() => {
                marcarInteracao();
                setLigados(new Set());
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Eraser aria-hidden="true" className="size-4" />
              Limpar
            </button>
          </div>
        </div>

        {/* Prévia */}
        <div
          id="anatomia-previa"
          role="tabpanel"
          aria-labelledby={`anatomia-aba-${idModelo}`}
          className="flex flex-col bg-muted/35 p-5 sm:p-7 dark:bg-tinta/40"
        >
          <div className="flex h-9 items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <span aria-hidden="true" className="flex gap-1">
                <span className="size-2.5 rounded-full bg-foreground/15" />
                <span className="size-2.5 rounded-full bg-foreground/15" />
                <span className="size-2.5 rounded-full bg-foreground/15" />
              </span>
              <span className="ml-1.5">Seu prompt</span>
            </p>
            {prompt && <BotaoCopiar texto={prompt} rotulo="Copiar prompt" />}
          </div>

          <div className="relative mt-4 min-h-[20rem] flex-1 rounded-2xl border bg-background/80 p-4 font-mono text-[13px] leading-[1.8] shadow-inner shadow-foreground/[0.03] sm:p-5 sm:text-sm lg:min-h-0">
            <AnimatePresence initial={false} mode="popLayout">
              {ativos.length === 0 ? (
                <motion.p
                  key="vazio"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="font-sans text-muted-foreground"
                >
                  Ligue pelo menos um ingrediente para começar a montar o prompt.
                </motion.p>
              ) : (
                ativos.map((id, i) => (
                  <motion.p
                    key={`${idModelo}-${id}`}
                    layout="position"
                    initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
                    animate={{ opacity: realce && realce !== id ? 0.4 : 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, filter: "blur(6px)", transition: { duration: 0.2 } }}
                    transition={{ duration: 0.5, ease: CURVA_IMPULSO, delay: i * 0.04 }}
                    className="mb-3 last:mb-0"
                  >
                    <TrechoPrompt ingrediente={id} texto={modelo.textos[id]} />
                  </motion.p>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Medidor de qualidade */}
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="flex min-w-36 items-baseline gap-2">
              <span className="text-sm text-muted-foreground">Qualidade:</span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={nivel}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: CURVA_IMPULSO }}
                  className="inline-block font-display text-xl font-bold tracking-tight"
                >
                  {nivel}
                </motion.span>
              </AnimatePresence>
            </p>
            <div
              role="meter"
              aria-label="Qualidade do prompt"
              aria-valuemin={0}
              aria-valuemax={5}
              aria-valuenow={pontos}
              aria-valuetext={`${nivel}: ${pontos} de 5`}
              className="flex min-w-40 flex-1 gap-1.5"
            >
              {COR_SEGMENTO.map((cor, i) => (
                <span key={cor} className="relative h-2 flex-1 overflow-hidden rounded-full bg-foreground/10">
                  <motion.span
                    className={cn("absolute inset-0 origin-left rounded-full", cor)}
                    initial={false}
                    animate={{ scaleX: i < pontos ? 1 : 0 }}
                    transition={{ duration: 0.45, ease: CURVA_IMPULSO, delay: i < pontos ? i * 0.05 : 0 }}
                  />
                </span>
              ))}
            </div>
            <span className="text-sm text-muted-foreground tabular-nums">{pontos}/5</span>
          </div>
          <p role="status" className="sr-only">
            {interagiu ? `Qualidade do prompt: ${nivel}, ${pontos} de 5.` : ""}
          </p>

          <p className="mt-4 flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
            <Lightbulb aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-marca dark:text-marca-clara" />
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={proximo ?? "completo"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {proximo ? DICAS[proximo] : DICA_COMPLETO}
              </motion.span>
            </AnimatePresence>
          </p>
        </div>
      </div>
    </div>
  );
}
