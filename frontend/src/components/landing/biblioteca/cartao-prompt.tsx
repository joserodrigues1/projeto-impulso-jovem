"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion } from "motion/react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { BotaoCopiar } from "@/components/landing/botao-copiar";
import { CartaoHolofote, CURVA_IMPULSO } from "@/components/movimento";
import { cn } from "@/lib/utils";
import type { PromptBiblioteca } from "./prompts";
import { TextoPrompt } from "./texto-prompt";

/** Altura do prompt recolhido (≈ 7 linhas e meia): deixa os cartões da grade do mesmo tamanho. */
const ALTURA_RECOLHIDA = 168;

interface CartaoPromptProps {
  prompt: PromptBiblioteca;
  nomeCategoria: string;
  Icone: LucideIcon;
}

/**
 * Cartão da biblioteca: categoria, título, quando usar, o prompt (recolhível) e o botão de copiar.
 * O texto inteiro sempre está no HTML (leitores de tela leem tudo); recolher é só visual.
 */
export function CartaoPrompt({ prompt, nomeCategoria, Icone }: CartaoPromptProps) {
  const idTitulo = useId();
  const idTexto = useId();
  const conteudoRef = useRef<HTMLDivElement>(null);
  const [aberto, setAberto] = useState(false);
  // Prompts curtos (ou telas largas) cabem inteiros: aí não há o que expandir
  const [cabeInteiro, setCabeInteiro] = useState(false);
  // Só anima a altura depois que a pessoa clica (a medição inicial não deve "pular")
  const [interagiu, setInteragiu] = useState(false);

  useEffect(() => {
    const el = conteudoRef.current;
    if (!el) return;
    const observador = new ResizeObserver(() => setCabeInteiro(el.offsetHeight <= ALTURA_RECOLHIDA + 6));
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  const recolhido = !aberto && !cabeInteiro;

  return (
    <CartaoHolofote
      role="article"
      aria-labelledby={idTitulo}
      className={cn(
        "group/cartao flex h-full flex-col rounded-3xl border bg-card p-5 shadow-sm sm:p-6",
        "transition-[border-color,box-shadow,translate] duration-300",
        "hover:-translate-y-0.5 hover:border-marca/30 hover:shadow-xl hover:shadow-marca/5",
      )}
    >
      <p className="inline-flex items-center gap-1.5 self-start rounded-full bg-marca/10 px-2.5 py-1 text-xs font-semibold text-marca-forte dark:bg-marca/20 dark:text-marca-clara">
        <Icone aria-hidden="true" className="size-3.5" />
        {nomeCategoria}
      </p>

      <h3 id={idTitulo} className="mt-4 font-display text-xl leading-tight font-semibold tracking-tight">
        {prompt.titulo}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">Quando usar: </span>
        {prompt.quandoUsar}
      </p>

      <div className="mt-4 rounded-2xl border border-border/70 bg-muted p-4">
        <motion.div
          id={idTexto}
          initial={false}
          animate={{ height: recolhido ? ALTURA_RECOLHIDA : "auto" }}
          transition={{ duration: interagiu ? 0.45 : 0, ease: CURVA_IMPULSO }}
          className="relative overflow-hidden"
        >
          <div ref={conteudoRef} className="font-mono text-[13px] leading-[1.65] whitespace-pre-line text-foreground/90">
            <TextoPrompt texto={prompt.texto} />
          </div>
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-muted to-transparent transition-opacity duration-300",
              recolhido ? "opacity-100" : "opacity-0",
            )}
          />
        </motion.div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        {cabeInteiro ? (
          <span />
        ) : (
          <button
            type="button"
            aria-expanded={aberto}
            aria-controls={idTexto}
            onClick={() => {
              setInteragiu(true);
              setAberto((valor) => !valor);
            }}
            className={cn(
              "-ml-2 inline-flex h-11 items-center gap-1 rounded-full px-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors",
              "hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            )}
          >
            {aberto ? (
              "Mostrar menos"
            ) : (
              <>
                <span className="sm:hidden">Ler tudo</span>
                <span className="hidden sm:inline">Ler o prompt inteiro</span>
              </>
            )}
            <ChevronDown
              aria-hidden="true"
              className={cn("size-4 transition-transform duration-300", aberto && "rotate-180")}
            />
          </button>
        )}
        <BotaoCopiar texto={prompt.texto} rotulo="Copiar prompt" className="h-11 px-4" />
      </div>
    </CartaoHolofote>
  );
}
