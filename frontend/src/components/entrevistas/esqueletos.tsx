import { cn } from "@/lib/utils";
import { ESTILO_CARD } from "./utils";

/** Bloco de carregamento com um brilho que passa (o brilho para com "reduzir movimento"). */
function Bloco({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-muted dark:bg-white/[0.06]", className)}>
      <span className="absolute inset-y-0 left-0 w-1/2 animate-brilho bg-gradient-to-r from-transparent via-foreground/[0.05] to-transparent motion-reduce:hidden" />
    </div>
  );
}

/** Placeholder dos indicadores e do gráfico de evolução. */
export function EsqueletoResumo() {
  return (
    <div aria-hidden="true" className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cn(ESTILO_CARD, "space-y-3 p-5")}>
            <Bloco className="h-4 w-32" />
            <Bloco className="h-9 w-20" />
          </div>
        ))}
      </div>
      <div className={cn(ESTILO_CARD, "space-y-4 p-5 sm:p-6")}>
        <Bloco className="h-5 w-40" />
        <Bloco className="h-52 w-full" />
      </div>
    </div>
  );
}

/** Placeholder da lista de entrevistas. */
export function EsqueletoLista({ quantidade = 4 }: { quantidade?: number }) {
  return (
    <div aria-hidden="true" className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: quantidade }, (_, i) => (
        <div key={i} className={cn(ESTILO_CARD, "space-y-4 p-5")}>
          <div className="flex gap-4">
            <Bloco className="size-16 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Bloco className="h-4 w-24 rounded-full" />
              <Bloco className="h-5 w-3/4" />
              <Bloco className="h-3 w-1/2" />
            </div>
          </div>
          <Bloco className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}

/** Placeholder do relatório completo. */
export function EsqueletoRelatorio() {
  return (
    <div aria-hidden="true" className="space-y-6">
      <div className={cn(ESTILO_CARD, "flex flex-col gap-8 p-6 sm:p-8 md:flex-row md:items-center")}>
        <Bloco className="mx-auto size-38 shrink-0 rounded-full md:mx-0" />
        <div className="flex-1 space-y-3">
          <Bloco className="h-5 w-36 rounded-full" />
          <Bloco className="h-9 w-2/3" />
          <Bloco className="h-4 w-1/3" />
          <Bloco className="h-16 w-full" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className={cn(ESTILO_CARD, "space-y-4 p-6")}>
            <Bloco className="h-5 w-40" />
            <Bloco className="h-4 w-full" />
            <Bloco className="h-4 w-5/6" />
            <Bloco className="h-4 w-4/6" />
          </div>
        ))}
      </div>
    </div>
  );
}
