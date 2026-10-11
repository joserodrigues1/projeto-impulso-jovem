import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/**
 * Botões do Impulso Jovem (docs/DESIGN.md §5): pílula, primário na cor da marca, foco visível com o anel
 * da marca e um leve "afundar" ao clicar. Tamanhos: "lg" (48 px) para as ações principais das telas,
 * "default" (40 px) para o resto. Ícones com `data-icon="seta"` andam um pouco para o lado no hover.
 */
const buttonVariants = cva(
  [
    "group/button relative inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding font-semibold whitespace-nowrap outline-none select-none",
    "transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-200 ease-out",
    "focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "active:not-aria-[haspopup]:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
    "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    "[&_svg[data-icon=seta]]:transition-transform [&_svg[data-icon=seta]]:duration-200 hover:[&_svg[data-icon=seta]]:translate-x-0.5",
  ],
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_10px_24px_-12px_var(--marca)] hover:bg-marca-forte hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_14px_30px_-12px_var(--marca)] dark:hover:bg-[color-mix(in_oklch,var(--primary),white_12%)]",
        outline:
          "border-border bg-card text-foreground shadow-xs hover:border-marca/35 hover:bg-muted aria-expanded:bg-muted dark:border-white/12 dark:bg-white/[0.04] dark:hover:border-marca-clara/40 dark:hover:bg-white/[0.08]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent",
        ghost: "text-foreground hover:bg-muted aria-expanded:bg-muted dark:hover:bg-white/[0.07]",
        destructive:
          "bg-destructive/10 text-red-700 hover:bg-destructive/15 focus-visible:ring-destructive/40 dark:bg-destructive/15 dark:text-red-300 dark:hover:bg-destructive/25",
        /** Confirmação de ação sem volta (ex.: excluir a conta): vermelho sólido. */
        perigo:
          "bg-red-700 text-white shadow-[0_10px_24px_-12px_rgb(185_28_28/0.8)] hover:bg-red-800 focus-visible:ring-red-500/50",
        link: "rounded-md text-marca-forte underline-offset-4 hover:underline dark:text-marca-clara",
      },
      size: {
        default: "h-10 gap-2 px-4 text-sm has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5",
        xs: "h-7 gap-1 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-9 gap-1.5 px-3.5 text-sm [&_svg:not([class*='size-'])]:size-4",
        lg: "h-12 gap-2 px-6 text-base [&_svg:not([class*='size-'])]:size-5",
        icon: "size-10",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-9",
        "icon-lg": "size-12 [&_svg:not([class*='size-'])]:size-5",
      },
    },
    compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
