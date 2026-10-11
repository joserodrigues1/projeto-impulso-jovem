import * as React from "react"
import { cn } from "cn"

/**
 * Bloco de "carregando" com um brilho que atravessa (shimmer). Com "reduzir movimento"
 * o brilho não roda e fica só o bloco parado.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        "relative isolate overflow-hidden rounded-xl bg-muted",
        "after:absolute after:inset-y-0 after:left-0 after:w-1/2 after:animate-brilho after:bg-gradient-to-r after:from-transparent after:via-white/60 after:to-transparent dark:after:via-white/[0.06]",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
