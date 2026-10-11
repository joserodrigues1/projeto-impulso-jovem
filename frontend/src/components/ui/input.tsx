import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

/** Campo de texto: borda suave, realce da marca no hover/foco e estado de erro (aria-invalid) em vermelho. */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-xl border border-input bg-card px-3.5 py-1 text-base text-foreground shadow-xs outline-none",
        "transition-[border-color,box-shadow,background-color] duration-200",
        "placeholder:text-muted-foreground/90 hover:border-marca/40",
        "focus-visible:border-marca focus-visible:ring-4 focus-visible:ring-marca/15",
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "read-only:bg-muted read-only:hover:border-input read-only:focus-visible:border-input read-only:focus-visible:ring-ring/20",
        "aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/12",
        "md:text-sm dark:bg-white/[0.03] dark:hover:border-marca-clara/40 dark:focus-visible:border-marca-clara dark:focus-visible:ring-marca-clara/20 dark:read-only:bg-white/[0.02] dark:aria-invalid:border-destructive/70 dark:aria-invalid:ring-destructive/25",
        className
      )}
      {...props}
    />
  )
}

export { Input }
