import * as React from "react"
import { CircleAlert } from "lucide-react"
import { cn } from "cn"

/** Visual padrão dos campos dos formulários de conta (maiores, bons para o toque). */
const fieldInputClass = "h-12 rounded-xl px-4 text-base md:text-base"

/** Texto de ajuda abaixo do campo — ligue ao input com aria-describedby. */
function FieldHint({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p data-slot="field-hint" className={cn("text-xs leading-relaxed text-muted-foreground", className)} {...props} />
  )
}

/** Erro de validação do campo — ligue ao input com aria-describedby e marque aria-invalid. */
function FieldError({ className, children, ...props }: React.ComponentProps<"p">) {
  if (!children) return null
  return (
    <p
      data-slot="field-error"
      className={cn(
        "flex items-start gap-1.5 text-xs font-medium text-red-700 animate-in fade-in slide-in-from-top-1 duration-200 dark:text-red-300",
        className
      )}
      {...props}
    >
      <CircleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

export { fieldInputClass, FieldHint, FieldError }
