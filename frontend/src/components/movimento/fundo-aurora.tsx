import { cn } from "@/lib/utils";

/**
 * Fundo "aurora": manchas de luz desfocadas nas cores da marca, se movendo devagar, com granulado.
 * Só CSS (sem JavaScript) e decorativo — fica atrás do conteúdo da seção (que precisa de `relative`).
 */
export function FundoAurora({ className, intensidade = "normal" }: { className?: string; intensidade?: "suave" | "normal" }) {
  const opacidade = intensidade === "suave" ? "opacity-40" : "opacity-70";
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}>
      <div
        className={cn(
          "absolute -top-1/3 left-1/2 size-[60rem] -translate-x-1/2 rounded-full blur-[120px] animate-aurora",
          "bg-[radial-gradient(circle_at_30%_30%,var(--marca)_0%,transparent_55%),radial-gradient(circle_at_70%_60%,var(--ciano)_0%,transparent_50%)]",
          opacidade,
        )}
      />
      <div
        className={cn(
          "absolute -bottom-1/2 -left-1/4 size-[42rem] rounded-full blur-[120px] animate-aurora [animation-delay:-6s] [animation-duration:24s]",
          "bg-[radial-gradient(circle,color-mix(in_oklch,var(--lima)_70%,transparent)_0%,transparent_60%)]",
          intensidade === "suave" ? "opacity-15" : "opacity-25",
        )}
      />
      <div className="granulado absolute inset-0" />
    </div>
  );
}
