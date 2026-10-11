import { TextoPrompt } from "@/components/landing/jornada/texto-prompt";
import { cn } from "@/lib/utils";
import { COR_INGREDIENTE, type IdIngrediente } from "./ingredientes";

/** Um trecho do prompt realçado (fundo + sublinhado) na cor do ingrediente a que pertence. */
export function TrechoPrompt({ ingrediente, texto }: { ingrediente: IdIngrediente; texto: string }) {
  return (
    <span
      className={cn(
        "rounded-md px-1 py-0.5 underline decoration-2 underline-offset-[5px] box-decoration-clone",
        COR_INGREDIENTE[ingrediente].trecho,
      )}
    >
      <TextoPrompt texto={texto} estilo="lacuna" />
    </span>
  );
}
