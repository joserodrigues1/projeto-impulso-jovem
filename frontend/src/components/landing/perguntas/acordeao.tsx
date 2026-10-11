"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { CURVA_IMPULSO } from "@/components/movimento";
import { cn } from "@/lib/utils";

export interface ItemAcordeao {
  id: string;
  pergunta: string;
  resposta: React.ReactNode;
}

/**
 * Acordeão acessível (padrão WAI-ARIA): cada pergunta é um botão com aria-expanded/aria-controls;
 * setas ↑/↓, Home e End passam de uma pergunta para outra. A resposta fechada fica inerte (fora do foco
 * e dos leitores de tela) e a altura anima ao abrir e fechar.
 */
export function Acordeao({ itens, prefixo = "pergunta" }: { itens: ItemAcordeao[]; prefixo?: string }) {
  const [abertos, setAbertos] = useState<ReadonlySet<string>>(() => new Set());
  const botoes = useRef<Array<HTMLButtonElement | null>>([]);

  function alternar(id: string) {
    setAbertos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  function aoTeclar(evento: KeyboardEvent<HTMLButtonElement>, indice: number) {
    const total = itens.length;
    const destino =
      evento.key === "ArrowDown"
        ? (indice + 1) % total
        : evento.key === "ArrowUp"
          ? (indice - 1 + total) % total
          : evento.key === "Home"
            ? 0
            : evento.key === "End"
              ? total - 1
              : null;
    if (destino === null) return;
    evento.preventDefault();
    botoes.current[destino]?.focus();
  }

  return (
    <ul className="space-y-3">
      {itens.map((item, indice) => {
        const aberto = abertos.has(item.id);
        const idBotao = `${prefixo}-${item.id}-botao`;
        const idPainel = `${prefixo}-${item.id}-resposta`;
        return (
          <li
            key={item.id}
            className={cn(
              "group/item rounded-3xl border bg-card transition-[border-color,box-shadow,background-color] duration-300",
              aberto
                ? "border-marca/30 shadow-[0_20px_50px_-30px_color-mix(in_oklch,var(--marca)_60%,transparent)] dark:border-marca-clara/25"
                : "border-border hover:border-marca/25 dark:hover:border-white/15",
            )}
          >
            <h3 className="font-sans">
              <button
                ref={(el) => {
                  botoes.current[indice] = el;
                }}
                id={idBotao}
                type="button"
                aria-expanded={aberto}
                aria-controls={idPainel}
                onClick={() => alternar(item.id)}
                onKeyDown={(evento) => aoTeclar(evento, indice)}
                className="flex w-full items-center gap-3 rounded-3xl px-5 py-5 text-left text-base font-semibold text-foreground focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none sm:gap-4 sm:px-6 sm:text-lg"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "w-6 shrink-0 font-mono text-xs font-medium tabular-nums transition-colors duration-300",
                    aberto ? "text-marca-forte dark:text-marca-clara" : "text-muted-foreground",
                  )}
                >
                  {String(indice + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 text-pretty">{item.pergunta}</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
                    aberto
                      ? "border-transparent bg-marca text-white"
                      : "border-border bg-background text-muted-foreground group-hover/item:text-foreground",
                  )}
                >
                  <motion.span
                    className="inline-flex"
                    animate={{ rotate: aberto ? 45 : 0 }}
                    transition={{ duration: 0.35, ease: CURVA_IMPULSO }}
                  >
                    <Plus className="size-4" />
                  </motion.span>
                </span>
              </button>
            </h3>
            <motion.div
              id={idPainel}
              aria-labelledby={idBotao}
              inert={!aberto}
              initial={false}
              animate={aberto ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
              transition={{
                height: { duration: 0.45, ease: CURVA_IMPULSO },
                opacity: { duration: aberto ? 0.35 : 0.2, delay: aberto ? 0.08 : 0 },
              }}
              className="overflow-hidden"
            >
              {/* Recuo igual ao do número, para a resposta alinhar com o texto da pergunta */}
              <div className="pr-5 pb-6 pl-14 text-base leading-relaxed text-muted-foreground sm:pr-16 sm:pl-16">
                {item.resposta}
              </div>
            </motion.div>
          </li>
        );
      })}
    </ul>
  );
}
