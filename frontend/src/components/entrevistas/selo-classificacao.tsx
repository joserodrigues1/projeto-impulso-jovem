import { cn } from "@/lib/utils";
import type { Classificacao } from "@/lib/tipos";
import { CORES_FAIXA, ROTULO_CLASSIFICACAO, classificacaoEfetiva } from "./faixas";

interface SeloClassificacaoProps {
  classificacao: Classificacao | null;
  /** Usada para derivar a classificação quando ela não vier da API. */
  nota?: number | null;
  className?: string;
}

/** Selo da classificação ("Preparado", "Destaque"…). Sem nota nem classificação → "Formato antigo". */
export function SeloClassificacao({ classificacao, nota, className }: SeloClassificacaoProps) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap";
  const efetiva = classificacaoEfetiva(classificacao, nota);

  if (!efetiva) {
    return (
      <span className={cn(base, "bg-muted text-muted-foreground ring-border", className)}>Formato antigo</span>
    );
  }

  return (
    <span className={cn(base, CORES_FAIXA[efetiva].selo, className)}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current opacity-80" />
      {ROTULO_CLASSIFICACAO[efetiva]}
    </span>
  );
}
