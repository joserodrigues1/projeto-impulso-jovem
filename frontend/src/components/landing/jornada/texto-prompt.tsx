import { Fragment } from "react";
import { cn } from "@/lib/utils";

interface TextoPromptProps {
  texto: string;
  /**
   * "forte": lacuna em destaque (blocos de prompt soltos).
   * "lacuna": lacuna discreta, para quando o trecho já está colorido (construtor de prompt).
   */
  estilo?: "forte" | "lacuna";
  className?: string;
}

const LACUNA = /(\[[^\]]+\])/g;

/**
 * Mostra um prompt realçando os trechos entre [colchetes] — é o que o jovem troca pelos dados dele.
 * Não muda o texto: o que aparece é exatamente o que vai para a área de transferência.
 */
export function TextoPrompt({ texto, estilo = "forte", className }: TextoPromptProps) {
  const partes = texto.split(LACUNA);
  return (
    <span className={className}>
      {partes.map((parte, i) =>
        parte.startsWith("[") && parte.endsWith("]") ? (
          <span
            key={i}
            className={cn(
              "rounded-md px-1 py-px font-semibold box-decoration-clone",
              estilo === "forte"
                ? "bg-marca/10 text-marca-forte dark:bg-marca/25 dark:text-marca-clara"
                : "bg-background/80 text-foreground ring-1 ring-foreground/10",
            )}
          >
            {parte}
          </span>
        ) : (
          <Fragment key={i}>{parte}</Fragment>
        ),
      )}
    </span>
  );
}
