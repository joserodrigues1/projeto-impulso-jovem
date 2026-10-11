import { Revelar } from "@/components/movimento";
import { cn } from "@/lib/utils";

interface TituloSecaoProps {
  /** id do <h2> — use em aria-labelledby da <section>. */
  id: string;
  /** Rótulo curto acima do título (ex.: "Guia de IA"). */
  sobretitulo: string;
  titulo: React.ReactNode;
  descricao?: React.ReactNode;
  alinhamento?: "centro" | "esquerda";
  /** Seções sobre fundo "tinta" (sempre escuro), independentemente do tema. */
  sobreEscuro?: boolean;
  className?: string;
}

/** Cabeçalho padrão das seções da landing: sobretítulo + título grande + descrição. */
export function TituloSecao({
  id,
  sobretitulo,
  titulo,
  descricao,
  alinhamento = "centro",
  sobreEscuro = false,
  className,
}: TituloSecaoProps) {
  const centro = alinhamento === "centro";
  return (
    <Revelar className={cn("max-w-3xl", centro && "mx-auto text-center", className)}>
      <p
        className={cn(
          "mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.14em] uppercase",
          sobreEscuro
            ? "border-white/15 bg-white/5 text-marca-clara"
            : "border-marca/20 bg-marca/8 text-marca-forte dark:text-marca-clara",
        )}
      >
        <span aria-hidden="true" className="size-1.5 rounded-full bg-lima" />
        {sobretitulo}
      </p>
      <h2
        id={id}
        className={cn(
          "font-display text-4xl leading-[1.05] font-bold tracking-tight md:text-5xl",
          sobreEscuro && "text-white",
        )}
      >
        {titulo}
      </h2>
      {descricao && (
        <p className={cn("mt-5 text-lg leading-relaxed", sobreEscuro ? "text-white/70" : "text-muted-foreground")}>
          {descricao}
        </p>
      )}
    </Revelar>
  );
}
