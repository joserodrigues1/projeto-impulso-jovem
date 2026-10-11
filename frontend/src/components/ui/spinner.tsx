import * as React from "react"
import { LoaderCircle } from "lucide-react"
import { cn } from "cn"

type SpinnerProps = React.ComponentProps<"svg"> & {
  /** Texto lido pelo leitor de tela. Sem ele o ícone é só decorativo. */
  label?: string
}

function Spinner({ className, label, ...props }: SpinnerProps) {
  const icone = (
    <LoaderCircle
      aria-hidden="true"
      className={cn("size-5 animate-spin text-marca dark:text-marca-clara", className)}
      {...props}
    />
  )
  if (!label) return icone
  return (
    <span role="status" className="inline-flex items-center">
      {icone}
      <span className="sr-only">{label}</span>
    </span>
  )
}

/** Tela inteira de carregamento (centralizada): anel girando na cor da marca + mensagem. */
function LoadingScreen({ label = "Carregando…", className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn("flex min-h-[60vh] flex-col items-center justify-center gap-4", className)}>
      <span aria-hidden="true" className="relative flex size-12 items-center justify-center">
        <span className="absolute inset-0 rounded-full border-2 border-marca/15 dark:border-marca-clara/15" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-marca dark:border-t-marca-clara" />
        <span className="size-2 animate-pulso-suave rounded-full bg-lima" />
      </span>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  )
}

export { Spinner, LoadingScreen }
