"use client";

import { useId, useState } from "react";
import { motion } from "motion/react";
import { ChevronDown, Sparkles } from "lucide-react";
import { BotaoCopiar } from "@/components/landing/botao-copiar";
import { CURVA_IMPULSO } from "@/components/movimento";
import { cn } from "@/lib/utils";
import { TextoPrompt } from "./texto-prompt";

/** Altura do prompt recolhido (px) — cerca de 12 linhas. */
const ALTURA_RECOLHIDO = 264;
/** Prompts curtos aparecem inteiros, sem o botão de expandir. */
const LIMITE_CARACTERES = 520;

interface BlocoPromptProps {
  texto: string;
  rotulo?: string;
  className?: string;
}

/**
 * Bloco de prompt pronto: cabeçalho com "copiar" e o texto com as lacunas realçadas.
 * Prompts longos começam recolhidos (o texto continua inteiro na página e o "copiar" copia tudo).
 */
export function BlocoPrompt({ texto, rotulo = "Prompt pronto", className }: BlocoPromptProps) {
  const idTexto = useId();
  const longo = texto.length > LIMITE_CARACTERES;
  const [aberto, setAberto] = useState(false);
  const recolhido = longo && !aberto;

  return (
    <div className={cn("overflow-hidden rounded-2xl border bg-muted/60 dark:bg-tinta/70", className)}>
      <div className="flex items-center justify-between gap-3 border-b py-2 pr-2 pl-4">
        <p className="flex items-center gap-2 text-sm font-semibold whitespace-nowrap">
          <Sparkles aria-hidden="true" className="size-4 text-marca dark:text-marca-clara" />
          {rotulo}
        </p>
        <BotaoCopiar texto={texto} rotulo="Copiar prompt" />
      </div>

      <motion.div
        id={idTexto}
        initial={false}
        animate={{ height: recolhido ? ALTURA_RECOLHIDO : "auto" }}
        transition={{ duration: 0.5, ease: CURVA_IMPULSO }}
        className="relative overflow-hidden"
      >
        <p className="px-4 py-4 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap sm:text-[13px]">
          <TextoPrompt texto={texto} />
        </p>
        {/* Esmaece o fim do texto recolhido */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-[color-mix(in_oklch,var(--muted)_60%,var(--card))] to-transparent transition-opacity duration-300 dark:from-[color-mix(in_oklch,var(--tinta)_70%,var(--card))]",
            recolhido ? "opacity-100" : "opacity-0",
          )}
        />
      </motion.div>

      {longo && (
        <button
          type="button"
          aria-expanded={aberto}
          aria-controls={idTexto}
          onClick={() => setAberto((a) => !a)}
          className="flex h-11 w-full items-center justify-center gap-1.5 border-t text-sm font-semibold text-marca-forte transition-colors hover:bg-marca/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring dark:text-marca-clara"
        >
          {aberto ? "Recolher prompt" : "Ver prompt completo"}
          <ChevronDown
            aria-hidden="true"
            className={cn("size-4 transition-transform duration-300", aberto && "rotate-180")}
          />
        </button>
      )}
    </div>
  );
}
