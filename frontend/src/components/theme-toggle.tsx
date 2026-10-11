"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const assinarNada = () => () => {};

/** true só no navegador — o tema salvo não é conhecido na renderização do servidor. */
function useMontado() {
  return React.useSyncExternalStore(
    assinarNada,
    () => true,
    () => false,
  );
}

/**
 * Alterna claro/escuro. O ícone troca girando — com motion (e não transição CSS), porque o
 * ThemeProvider desliga as transições CSS no instante da troca de tema.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const montado = useMontado();
  const escuro = montado && resolvedTheme === "dark";
  const rotulo = escuro ? "Usar tema claro" : "Usar tema escuro";
  const Icone = escuro ? Sun : Moon;
  // Vale também fora do ProvedorMovimento (ex.: no cabeçalho público)
  const reduzir = useReducedMotion();

  return (
    <button
      type="button"
      onClick={() => setTheme(escuro ? "light" : "dark")}
      disabled={!montado}
      aria-label={montado ? rotulo : "Alternar tema"}
      title={montado ? rotulo : undefined}
      className={cn(
        "relative inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-muted-foreground transition-[color,background-color,transform] duration-200",
        "hover:bg-muted hover:text-foreground active:scale-95 dark:hover:bg-white/[0.08]",
        "focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none disabled:opacity-50",
        className,
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={escuro ? "sol" : "lua"}
          initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
          transition={reduzir ? { duration: 0 } : { duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex"
        >
          <Icone aria-hidden="true" className="size-5" />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
