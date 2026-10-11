import * as React from "react"
import { cn } from "cn"

/** Cartão padrão (docs/DESIGN.md §5): rounded-3xl, borda suave, sombra leve no claro. */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "min-w-0 rounded-3xl border border-border bg-card text-card-foreground shadow-[0_1px_2px_rgb(20_16_40/0.04),0_12px_32px_-18px_rgb(20_16_40/0.18)] dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-header" className={cn("flex flex-col gap-1.5 p-5 sm:p-7", className)} {...props} />
}

function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="card-title"
      className={cn("font-display text-lg leading-tight font-semibold tracking-tight sm:text-xl", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p data-slot="card-description" className={cn("text-sm leading-relaxed text-muted-foreground", className)} {...props} />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-5 pb-5 sm:px-7 sm:pb-7", className)} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex flex-wrap items-center gap-3 border-t border-border px-5 py-4 sm:px-7", className)}
      {...props}
    />
  )
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
