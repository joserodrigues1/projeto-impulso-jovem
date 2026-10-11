"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface BotaoCopiarProps {
  texto: string;
  /** Rótulo acessível (ex.: "Copiar prompt de currículo"). */
  rotulo?: string;
  className?: string;
  /** "icone" só mostra o ícone; "completo" mostra ícone + texto. */
  variante?: "icone" | "completo";
}

/** Copia um texto para a área de transferência, com confirmação visual e para leitores de tela. */
export function BotaoCopiar({ texto, rotulo = "Copiar", className, variante = "completo" }: BotaoCopiarProps) {
  const [estado, setEstado] = useState<"parado" | "copiado" | "erro">("parado");

  useEffect(() => {
    if (estado === "parado") return;
    const t = setTimeout(() => setEstado("parado"), 2000);
    return () => clearTimeout(t);
  }, [estado]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setEstado("copiado");
    } catch {
      setEstado("erro");
    }
  }

  const copiado = estado === "copiado";
  return (
    <button
      type="button"
      onClick={copiar}
      aria-label={variante === "icone" ? rotulo : undefined}
      className={cn(
        "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border text-sm font-medium transition-colors",
        "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        variante === "icone" ? "w-9" : "px-3.5",
        copiado
          ? "border-transparent bg-lima text-tinta"
          : "border-border bg-background/60 text-foreground hover:border-marca/50 hover:bg-marca/10",
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={copiado ? "ok" : "copiar"}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="inline-flex"
        >
          {copiado ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
        </motion.span>
      </AnimatePresence>
      {variante === "completo" && <span>{copiado ? "Copiado!" : estado === "erro" ? "Não deu" : rotulo}</span>}
      <span role="status" aria-live="polite" className="sr-only">
        {copiado ? "Copiado para a área de transferência" : estado === "erro" ? "Não foi possível copiar" : ""}
      </span>
    </button>
  );
}
