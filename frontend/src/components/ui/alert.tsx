import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react"
import { cn } from "cn"

/**
 * "info" usa a cor da marca; sucesso, atenção e erro mantêm as cores de estado (verde, âmbar, vermelho),
 * sempre com ícone e texto — a cor nunca é a única pista.
 */
const alertVariants = cva(
  "flex w-full min-w-0 gap-3 rounded-2xl border p-4 text-sm leading-relaxed [&>svg]:mt-0.5 [&>svg]:size-5 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        info: "border-marca/20 bg-marca-suave text-foreground [&>svg]:text-marca-forte dark:border-marca-clara/25 dark:bg-marca/12 dark:[&>svg]:text-marca-clara",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-50 [&>svg]:text-emerald-700 dark:[&>svg]:text-emerald-300",
        warning:
          "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-50 [&>svg]:text-amber-700 dark:[&>svg]:text-amber-300",
        error:
          "border-red-200 bg-red-50 text-red-950 dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-50 [&>svg]:text-red-700 dark:[&>svg]:text-red-300",
      },
    },
    defaultVariants: { variant: "info" },
  }
)

const ICONES = { info: Info, success: CircleCheck, warning: TriangleAlert, error: CircleAlert } as const

type AlertProps = Omit<React.ComponentProps<"div">, "title"> &
  VariantProps<typeof alertVariants> & {
    title?: React.ReactNode
    /** Esconde o ícone padrão da variante. */
    hideIcon?: boolean
  }

/**
 * Aviso em destaque. Erros usam role="alert" (lidos na hora pelo leitor de tela);
 * sucesso usa role="status". Passe `role` para mudar.
 */
function Alert({ className, variant, title, hideIcon, children, role, ...props }: AlertProps) {
  const chave = variant ?? "info"
  const Icone = ICONES[chave]
  const papel = role ?? (chave === "error" ? "alert" : chave === "success" ? "status" : undefined)

  return (
    <div
      data-slot="alert"
      role={papel}
      className={cn(alertVariants({ variant }), "animate-in fade-in slide-in-from-top-1 duration-300", className)}
      {...props}
    >
      {!hideIcon && <Icone aria-hidden="true" />}
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && (
          <div className="[&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:decoration-2">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}

/** Lista de mensagens (ex.: todas as validações devolvidas pela API). */
function AlertList({ itens }: { itens: string[] }) {
  if (itens.length <= 1) return <>{itens[0]}</>
  return (
    <ul className="list-disc space-y-1 pl-5">
      {itens.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

export { Alert, AlertList, alertVariants }
