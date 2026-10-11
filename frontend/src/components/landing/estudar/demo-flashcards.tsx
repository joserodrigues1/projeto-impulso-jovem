"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, RotateCw } from "lucide-react";
import { CURVA_IMPULSO } from "@/components/movimento";
import { cn } from "@/lib/utils";

interface Flashcard {
  materia: string;
  frente: string;
  verso: string;
}

/** Exemplos de cartões que a IA cria a partir das suas anotações (conteúdo conferido). */
const CARTOES: readonly Flashcard[] = [
  {
    materia: "Português",
    frente: "Usa crase antes de palavra masculina?",
    verso: "Em regra, não. “Fui à escola” (feminina), mas “Fui a pé” e “Vou a um evento”.",
  },
  {
    materia: "Matemática",
    frente: "Quanto é 15% de 200?",
    verso: "30. Atalho: 10% de 200 é 20; 5% é a metade disso, 10. Somando: 30.",
  },
  {
    materia: "Inglês",
    frente: "Como dizer “Posso começar imediatamente”?",
    verso: "“I can start right away.” Também vale: “I'm available to start immediately.”",
  },
];

/** Baralho de flashcards: toque (ou Enter) para virar, depois passe para o próximo. */
export function DemoFlashcards() {
  const [indice, setIndice] = useState(0);
  const [virado, setVirado] = useState(false);
  const cartao = CARTOES[indice];

  function proximo() {
    setVirado(false);
    setIndice((i) => (i + 1) % CARTOES.length);
  }

  return (
    <div>
      <div className="relative [perspective:1200px]">
        {/* Cartões de trás: dão a ideia de baralho */}
        <div
          aria-hidden="true"
          className="absolute inset-x-4 -bottom-2 h-full rotate-[1.5deg] rounded-2xl border bg-card/70 shadow-sm"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-2 -bottom-1 h-full -rotate-1 rounded-2xl border bg-card/80 shadow-sm"
        />
        <motion.button
          key={indice}
          type="button"
          onClick={() => setVirado((v) => !v)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, rotateY: virado ? 180 : 0 }}
          transition={{ duration: 0.6, ease: CURVA_IMPULSO }}
          style={{ transformStyle: "preserve-3d" }}
          className="relative block h-44 w-full rounded-2xl text-left focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
        >
          {/* Frente */}
          <span
            aria-hidden={virado}
            className="absolute inset-0 flex flex-col rounded-2xl border bg-card p-4 shadow-md [backface-visibility:hidden] sm:p-5"
          >
            <span className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Pergunta · {cartao.materia}
            </span>
            <span className="my-auto font-display text-lg leading-snug font-semibold tracking-tight sm:text-xl">
              {cartao.frente}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <RotateCw aria-hidden="true" className="size-3.5" />
              Toque para ver a resposta
            </span>
          </span>
          {/* Verso */}
          <span
            aria-hidden={!virado}
            className="absolute inset-0 flex flex-col rounded-2xl bg-marca p-4 text-white shadow-md shadow-marca/20 [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-5"
          >
            <span className="text-[11px] font-semibold tracking-[0.14em] text-white/90 uppercase">Resposta</span>
            <span className="my-auto text-[15px] leading-relaxed font-medium">{cartao.verso}</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-white/90">
              <RotateCw aria-hidden="true" className="size-3.5" />
              Toque para voltar
            </span>
          </span>
        </motion.button>
      </div>

      <p role="status" className="sr-only">
        {virado ? `Resposta: ${cartao.verso}` : ""}
      </p>

      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5" aria-label={`Cartão ${indice + 1} de ${CARTOES.length}`} role="img">
          {CARTOES.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                i === indice ? "w-6 bg-marca" : "w-1.5 bg-muted-foreground/30",
              )}
            />
          ))}
        </span>
        <button
          type="button"
          onClick={proximo}
          className="inline-flex h-11 items-center gap-1.5 rounded-full border bg-background px-4 text-sm font-semibold transition-colors hover:border-marca/40 hover:bg-marca/5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          Próximo cartão
          <ArrowRight aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  );
}
