"use client"

import * as React from "react"
import { Check, Eye, EyeOff } from "lucide-react"
import { cn } from "cn"
import { Input } from "@/components/ui/input"
import { REGRAS_SENHA } from "@/lib/utils"

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type">

/** Campo de senha com botão de mostrar/ocultar. */
function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visivel, setVisivel] = React.useState(false)

  return (
    <div className="relative">
      {/* O Edge desenha o próprio "olho" (::-ms-reveal) dentro do campo: ficavam dois, lado a lado */}
      <Input
        type={visivel ? "text" : "password"}
        className={cn("pr-12 [&::-ms-reveal]:hidden", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visivel}
        aria-controls={props.id}
        className="absolute top-1/2 right-1.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
      >
        {visivel ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
      </button>
    </div>
  )
}

/** Checklist das regras de senha, atualizado enquanto a pessoa digita (com barra de progresso). */
function PasswordRules({ senha, id, className }: { senha: string; id?: string; className?: string }) {
  const atendidas = REGRAS_SENHA.filter((regra) => regra.atende(senha)).length
  const progresso = atendidas / REGRAS_SENHA.length

  return (
    <div className={cn("space-y-2.5", className)}>
      <div aria-hidden="true" className="flex gap-1.5">
        {REGRAS_SENHA.map((regra, i) => (
          <span key={regra.id} className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <span
              className={cn(
                "block h-full origin-left rounded-full transition-[transform,background-color] duration-300 ease-out",
                progresso === 1 ? "bg-emerald-500" : "bg-marca dark:bg-marca-clara",
                i < atendidas ? "scale-x-100" : "scale-x-0"
              )}
            />
          </span>
        ))}
      </div>
      <ul id={id} className="flex flex-wrap gap-1.5 text-xs" aria-label="Regras da senha">
        {REGRAS_SENHA.map((regra) => {
          const ok = regra.atende(senha)
          return (
            <li
              key={regra.id}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium transition-colors duration-200",
                ok
                  ? "border-emerald-600/25 bg-emerald-50 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200"
                  : "border-border bg-transparent text-muted-foreground"
              )}
            >
              {ok ? (
                <Check aria-hidden="true" className="size-3.5" />
              ) : (
                <span aria-hidden="true" className="size-1.5 rounded-full bg-current opacity-60" />
              )}
              <span>
                {regra.texto}
                <span className="sr-only">{ok ? " (ok)" : " (pendente)"}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export { PasswordInput, PasswordRules }
