import * as React from "react"
import { cn } from "cn"

/** Rótulo de campo — sempre ligue ao campo com `htmlFor` (= id do input). */
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label data-slot="label" className={cn("text-sm font-semibold text-foreground", className)} {...props} />
}

export { Label }
