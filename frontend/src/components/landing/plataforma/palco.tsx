"use client";

import { AnimatePresence, motion } from "motion/react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PalcoProps {
  /** Descrição da demonstração para leitores de tela (a animação em si é decorativa). */
  descricao: string;
  /** Classe de cor do brilho de fundo (ex.: "bg-ciano/30"). */
  brilho: string;
  /** Mostra o botão "repetir" (quando a demonstração terminou). */
  podeRepetir: boolean;
  aoRepetir: () => void;
  /** Nome curto da demonstração, para o rótulo do botão "repetir". */
  nome: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Moldura das demonstrações da plataforma: fundo com grade e brilho colorido, a cena animada (escondida
 * dos leitores de tela, que recebem a `descricao`) e um botão para repetir a animação.
 */
export function Palco({ descricao, brilho, podeRepetir, aoRepetir, nome, className, children }: PalcoProps) {
  return (
    <figure
      className={cn(
        "relative isolate overflow-hidden rounded-[2rem] border border-border p-5 sm:p-8",
        "bg-gradient-to-b from-card to-muted/60 dark:from-tinta-2 dark:to-tinta",
        "shadow-[0_30px_80px_-40px_color-mix(in_oklch,var(--marca)_45%,transparent)]",
        className,
      )}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className={cn("absolute top-1/2 left-1/2 size-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[90px]", brilho)} />
        <div className="fundo-grade absolute inset-0 text-foreground/50 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black,transparent)]" />
      </div>

      <div aria-hidden="true">{children}</div>
      <figcaption className="sr-only">{descricao}</figcaption>

      <AnimatePresence>
        {podeRepetir && (
          <motion.button
            type="button"
            onClick={aoRepetir}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.25 }}
            aria-label={`Repetir a animação: ${nome}`}
            title="Repetir a animação"
            className="absolute top-3 right-3 z-30 inline-flex size-9 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground backdrop-blur transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </figure>
  );
}
