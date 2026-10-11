"use client"

import * as React from "react"
import { motion } from "motion/react"
import { cn } from "cn"
import { CURVA_IMPULSO } from "@/components/movimento"

interface ItemSumario {
  id: string
  titulo: string
}

interface SumarioSecoesProps extends Omit<React.ComponentProps<"ol">, "children"> {
  itens: ItemSumario[]
}

/**
 * Índice "Nesta página": lista numerada de links para as seções, com a seção que está sendo lida
 * destacada (o destaque desliza de um item para o outro). Sem JavaScript, continua uma lista de links comum.
 */
function SumarioSecoes({ itens, className, ...props }: SumarioSecoesProps) {
  const [ativo, setAtivo] = React.useState<string | null>(null)
  // Os ids viram texto para o efeito não reiniciar a cada renderização (a lista em si é sempre nova)
  const chave = itens.map((item) => item.id).join("|")

  React.useEffect(() => {
    const ids = chave.split("|")
    const alvos = ids.map((id) => document.getElementById(id)).filter((alvo): alvo is HTMLElement => alvo !== null)
    if (!alvos.length) return

    const visiveis = new Set<string>()
    // A "faixa de leitura" fica no terço de cima da tela: a seção que passa por ela é a atual
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) visiveis.add(entrada.target.id)
          else visiveis.delete(entrada.target.id)
        }
        const atual = ids.find((id) => visiveis.has(id))
        if (atual) setAtivo(atual)
      },
      { rootMargin: "-18% 0px -62% 0px" }
    )
    alvos.forEach((alvo) => observador.observe(alvo))
    return () => observador.disconnect()
  }, [chave])

  return (
    <ol className={cn("space-y-0.5", className)} {...props}>
      {itens.map((item, indice) => {
        const atual = item.id === ativo
        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={atual ? "location" : undefined}
              className={cn(
                "relative isolate flex min-h-10 items-start gap-3 rounded-xl px-3 py-2 text-sm leading-snug transition-colors duration-200",
                atual ? "font-medium text-foreground" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              {atual && (
                <motion.span
                  layoutId="sumario-secao-atual"
                  aria-hidden="true"
                  transition={{ duration: 0.4, ease: CURVA_IMPULSO }}
                  className="absolute inset-0 -z-10 rounded-xl bg-marca-suave dark:bg-marca/15"
                />
              )}
              <span
                aria-hidden="true"
                className={cn(
                  "mt-px w-5 shrink-0 font-mono text-xs tabular-nums transition-colors duration-200",
                  atual ? "text-marca-forte dark:text-marca-clara" : "text-muted-foreground/80"
                )}
              >
                {String(indice + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0">{item.titulo}</span>
            </a>
          </li>
        )
      })}
    </ol>
  )
}

export { SumarioSecoes }
export type { ItemSumario }
