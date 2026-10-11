import { Fragment } from "react";
import { cn } from "@/lib/utils";

/** Trechos entre [colchetes] (sem quebrar linha): é o que o jovem troca pela realidade dele. */
const PADRAO_CAMPO = /(\[[^\]\n]+\])/;

/**
 * Mostra o texto de um prompt realçando os trechos entre [colchetes].
 * Os colchetes continuam visíveis (mais apagados), porque fazem parte do texto copiado.
 * Sem estado: serve tanto para Server Components quanto para ilhas "use client".
 */
export function TextoPrompt({ texto, className }: { texto: string; className?: string }) {
  // Com grupo de captura, o split devolve os trechos realçados nas posições ímpares
  const partes = texto.split(PADRAO_CAMPO);
  return (
    <span className={className}>
      {partes.map((parte, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className={cn(
              "rounded-[0.35rem] bg-marca/12 px-0.5 font-medium text-marca-forte [box-decoration-break:clone]",
              "dark:bg-marca/25 dark:text-marca-clara",
            )}
          >
            <span className="opacity-70">[</span>
            {parte.slice(1, -1)}
            <span className="opacity-70">]</span>
          </mark>
        ) : (
          <Fragment key={i}>{parte}</Fragment>
        ),
      )}
    </span>
  );
}
