"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ArrowUp, Check, MessageCircleQuestion, RotateCcw, Sparkles, X } from "lucide-react";
import { CURVA_IMPULSO } from "@/components/movimento";
import { cn } from "@/lib/utils";

interface Questao {
  materia: string;
  enunciado: string;
  alternativas: readonly string[];
  /** Índice da alternativa certa. */
  correta: number;
  explicacao: string;
}

/** Exemplo do que a IA devolve quando você pede "me teste" (conteúdo conferido). */
const QUESTOES: readonly Questao[] = [
  {
    materia: "Matemática",
    enunciado: "Uma camiseta de R$ 50 está com 20% de desconto. Quanto ela custa agora?",
    alternativas: ["R$ 30", "R$ 40", "R$ 45", "R$ 48"],
    correta: 1,
    explicacao: "20% de 50 é 10 (50 × 0,2). Tirando o desconto: 50 − 10 = R$ 40.",
  },
  {
    materia: "Português",
    enunciado: "Qual frase segue a norma-padrão?",
    alternativas: [
      "Fazem dois anos que estudo inglês.",
      "Faz dois anos que estudo inglês.",
      "Houveram muitas dúvidas na prova.",
      "Haviam três vagas abertas.",
    ],
    correta: 1,
    explicacao:
      "Indicando tempo, “fazer” fica no singular: faz dois anos. E “haver” no sentido de existir também: houve, havia.",
  },
  {
    materia: "Raciocínio lógico",
    enunciado: "Qual número continua a sequência 2, 6, 12, 20, 30, …?",
    alternativas: ["36", "40", "42", "44"],
    correta: 2,
    explicacao: "Os saltos crescem de 2 em 2: +4, +6, +8, +10. O próximo é +12, então 30 + 12 = 42.",
  },
];

const LETRAS = ["A", "B", "C", "D"] as const;

/** Próximos pedidos que fazem o treino render mais. */
const PEDIDOS_SEGUINTES = ["Mais difíceis, por favor", "Só do assunto que eu errei", "Agora 5 de raciocínio lógico"];

/**
 * Mini demonstração interativa da técnica "Me teste": uma conversa com a IA em que o quiz
 * pode ser respondido de verdade, com correção explicada.
 */
export function DemoQuiz() {
  const [indice, setIndice] = useState(0);
  const [acertos, setAcertos] = useState(0);
  const [fim, setFim] = useState(false);
  // Só move o foco depois que a pessoa interage (nunca ao carregar a página)
  const [interagiu, setInteragiu] = useState(false);

  function responder(certa: boolean) {
    setInteragiu(true);
    if (certa) setAcertos((n) => n + 1);
  }

  function avancar() {
    if (indice + 1 >= QUESTOES.length) setFim(true);
    else setIndice((i) => i + 1);
  }

  function recomecar() {
    setIndice(0);
    setAcertos(0);
    setFim(false);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border bg-background/80 shadow-sm dark:bg-tinta/60">
      {/* Barra da "janela" de conversa */}
      <div className="flex items-center gap-3 border-b px-4 py-2.5">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-muted-foreground/25" />
          <span className="size-2.5 rounded-full bg-muted-foreground/25" />
          <span className="size-2.5 rounded-full bg-muted-foreground/25" />
        </span>
        <span className="text-xs font-medium text-muted-foreground">Exemplo — responda você mesmo</span>
        <span className="ml-auto flex items-center gap-1.5" aria-hidden="true">
          {QUESTOES.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                fim || i < indice ? "w-4 bg-marca" : i === indice ? "w-6 bg-marca/60" : "w-4 bg-muted-foreground/20",
              )}
            />
          ))}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <p className="ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-marca px-4 py-2.5 text-sm leading-relaxed text-white shadow-sm">
          Me faça 3 questões no estilo de prova de seleção, uma por vez, e corrija explicando.
        </p>

        <div className="flex gap-2.5">
          <span
            aria-hidden="true"
            className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-marca to-ciano text-white"
          >
            <Sparkles className="size-3.5" />
          </span>
          <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border bg-card p-4">
            <p className="mb-3 border-b border-dashed pb-3 text-sm leading-relaxed text-muted-foreground">
              Combinado! Uma por vez — e eu explico cada resposta, certa ou errada.
            </p>
            <AnimatePresence mode="wait" initial={false}>
              {fim ? (
                <Resultado key="fim" acertos={acertos} onRecomecar={recomecar} />
              ) : (
                <PainelQuestao
                  key={indice}
                  questao={QUESTOES[indice]}
                  numero={indice + 1}
                  focarAoMontar={interagiu}
                  ultima={indice + 1 === QUESTOES.length}
                  onResponder={responder}
                  onAvancar={avancar}
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-auto pt-2">
          <p className="text-xs text-muted-foreground">Depois, você pode pedir:</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {PEDIDOS_SEGUINTES.map((pedido) => (
              <li key={pedido} className="rounded-full border bg-card px-3 py-1 text-xs font-medium">
                “{pedido}”
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Campo de mensagem (só ilustração) */}
      <div aria-hidden="true" className="flex items-center gap-2 border-t px-4 py-3">
        <span className="flex-1 truncate rounded-full border bg-card px-4 py-2 text-sm text-muted-foreground">
          {fim ? "Peça mais questões do que você errou…" : "Toque em uma alternativa…"}
        </span>
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-marca text-white">
          <ArrowUp className="size-4" />
        </span>
      </div>
    </div>
  );
}

const transicaoTroca = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: { duration: 0.35, ease: CURVA_IMPULSO },
} as const;

interface PainelQuestaoProps {
  questao: Questao;
  numero: number;
  focarAoMontar: boolean;
  ultima: boolean;
  onResponder: (certa: boolean) => void;
  onAvancar: () => void;
}

function PainelQuestao({ questao, numero, focarAoMontar, ultima, onResponder, onAvancar }: PainelQuestaoProps) {
  const idEnunciado = useId();
  const tituloRef = useRef<HTMLParagraphElement>(null);
  const [escolha, setEscolha] = useState<number | null>(null);
  const respondida = escolha !== null;
  const acertou = escolha === questao.correta;

  useEffect(() => {
    if (focarAoMontar) tituloRef.current?.focus({ preventScroll: true });
  }, [focarAoMontar]);

  function escolher(i: number) {
    if (respondida) return;
    setEscolha(i);
    onResponder(i === questao.correta);
  }

  return (
    <motion.div {...transicaoTroca}>
      <p className="text-xs font-semibold tracking-wide text-marca-forte uppercase dark:text-marca-clara">
        Questão {numero} de {QUESTOES.length} · {questao.materia}
      </p>
      <p
        ref={tituloRef}
        id={idEnunciado}
        tabIndex={-1}
        className="mt-1.5 rounded font-medium leading-snug outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {questao.enunciado}
      </p>

      <div role="group" aria-labelledby={idEnunciado} className="mt-3 grid gap-2 sm:grid-cols-2">
        {questao.alternativas.map((alternativa, i) => {
          const certa = i === questao.correta;
          const escolhida = i === escolha;
          const estado = !respondida ? "livre" : certa ? "certa" : escolhida ? "errada" : "apagada";
          return (
            <button
              key={alternativa}
              type="button"
              onClick={() => escolher(i)}
              aria-disabled={respondida}
              aria-pressed={escolhida}
              className={cn(
                "flex min-h-11 items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition-all duration-300",
                "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                estado === "livre" && "bg-background hover:-translate-y-px hover:border-marca/50 hover:bg-marca/5",
                estado === "certa" && "border-transparent bg-lima font-medium text-tinta",
                estado === "errada" && "border-destructive/40 bg-destructive/10",
                estado === "apagada" && "cursor-default opacity-55",
                respondida && "cursor-default",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-md border font-mono text-xs",
                  estado === "certa" && "border-tinta/20 bg-tinta/10",
                  estado === "errada" && "border-destructive/40 text-destructive",
                )}
              >
                {estado === "certa" ? (
                  <Check className="size-3.5" strokeWidth={3} />
                ) : estado === "errada" ? (
                  <X className="size-3.5" strokeWidth={3} />
                ) : (
                  LETRAS[i]
                )}
              </span>
              <span className="sr-only">Alternativa {LETRAS[i]}: </span>
              {alternativa}
            </button>
          );
        })}
      </div>

      <p role="status" className="sr-only">
        {respondida
          ? `${acertou ? "Resposta certa!" : `Resposta errada. A certa é a ${LETRAS[questao.correta]}.`} ${questao.explicacao}`
          : ""}
      </p>

      {/* Antes da resposta, o espaço da correção mostra o que vai acontecer; depois, vira a correção */}
      <AnimatePresence mode="wait" initial={false}>
        {respondida ? (
          <motion.div
            key="correcao"
            aria-hidden="true"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.4, ease: CURVA_IMPULSO }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                "mt-3 rounded-xl border-l-4 px-3.5 py-3 text-sm leading-relaxed",
                acertou ? "border-lima bg-lima/15 dark:bg-lima/10" : "border-destructive/60 bg-muted/70",
              )}
            >
              <span className="font-semibold">
                {acertou ? "Isso aí! " : `Quase! A certa é a ${LETRAS[questao.correta]}. `}
              </span>
              {questao.explicacao}
            </div>
          </motion.div>
        ) : (
          <motion.p
            key="dica"
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 flex items-center gap-2.5 overflow-hidden rounded-xl border border-dashed px-3.5 py-3 text-[13px] leading-snug text-muted-foreground"
          >
            <MessageCircleQuestion aria-hidden="true" className="size-4 shrink-0 text-marca-forte dark:text-marca-clara" />
            Escolha uma alternativa: a correção aparece aqui, com o porquê de cada resposta.
          </motion.p>
        )}
      </AnimatePresence>

      {respondida && (
        <button
          type="button"
          onClick={onAvancar}
          className="mt-3 inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {ultima ? "Ver resultado" : "Próxima questão"}
          <ArrowRight aria-hidden="true" className="size-4" />
        </button>
      )}
    </motion.div>
  );
}

function Resultado({ acertos, onRecomecar }: { acertos: number; onRecomecar: () => void }) {
  const tituloRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    tituloRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <motion.div {...transicaoTroca}>
      <p
        ref={tituloRef}
        tabIndex={-1}
        className="rounded font-display text-2xl font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {acertos === QUESTOES.length ? "Gabaritou! " : ""}Você acertou {acertos} de {QUESTOES.length}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        É assim que a IA treina você: questões no estilo da prova, correção na hora e explicação de cada resposta.
        Peça mais questões dos assuntos em que você errou.
      </p>
      <button
        type="button"
        onClick={onRecomecar}
        className="mt-4 inline-flex h-11 items-center gap-2 rounded-full border bg-background px-5 text-sm font-semibold transition-colors hover:border-marca/40 hover:bg-marca/5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <RotateCcw aria-hidden="true" className="size-4" />
        Refazer o quiz
      </button>
    </motion.div>
  );
}
