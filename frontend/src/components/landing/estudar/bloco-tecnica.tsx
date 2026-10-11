import type { LucideIcon } from "lucide-react";
import { BotaoCopiar } from "@/components/landing/botao-copiar";
import { TextoPrompt } from "@/components/landing/biblioteca/texto-prompt";
import { CartaoHolofote } from "@/components/movimento";
import { cn } from "@/lib/utils";

interface MiniPromptProps {
  texto: string;
  /** Nome da técnica — entra no rótulo acessível do botão de copiar. */
  tecnica: string;
  className?: string;
}

/** Prompt curto de uma técnica, com [colchetes] realçados e botão de copiar. */
export function MiniPrompt({ texto, tecnica, className }: MiniPromptProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-dashed border-marca/25 bg-muted/70 py-3.5 pr-14 pl-4 dark:border-marca/30 dark:bg-muted/60",
        className,
      )}
    >
      <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Peça assim</p>
      <p className="mt-1.5 font-mono text-[13px] leading-relaxed text-foreground/90">
        <TextoPrompt texto={texto} />
      </p>
      <BotaoCopiar
        variante="icone"
        texto={texto}
        rotulo={`Copiar prompt: ${tecnica}`}
        className="absolute top-2 right-2 h-11 w-11"
      />
    </div>
  );
}

interface BlocoTecnicaProps {
  icone: LucideIcon;
  titulo: string;
  /** Por que a técnica funciona (1–2 frases). */
  porque: string;
  prompt: string;
  /** Demonstração ou ilustração entre a explicação e o prompt. */
  children?: React.ReactNode;
  /** Destaque: borda e luz da marca (bloco maior da grade). */
  destaque?: boolean;
  /** A demonstração ocupa a sobra de altura do bloco (quando a linha da grade é mais alta). */
  crescer?: boolean;
  className?: string;
}

/** Bloco da grade "bento" de técnicas de estudo com IA. */
export function BlocoTecnica({
  icone: Icone,
  titulo,
  porque,
  prompt,
  children,
  destaque,
  crescer,
  className,
}: BlocoTecnicaProps) {
  return (
    <CartaoHolofote
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-3xl border bg-card p-6 shadow-sm transition-colors duration-300 hover:border-marca/30 sm:p-7",
        destaque && "border-marca/25 shadow-lg shadow-marca/5 dark:border-marca/30",
        className,
      )}
    >
      {destaque && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 -z-10 size-72 rounded-full bg-[radial-gradient(circle,color-mix(in_oklch,var(--marca)_18%,transparent),transparent_70%)]"
        />
      )}
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-marca/10 text-marca-forte ring-1 ring-marca/15 dark:bg-marca/20 dark:text-marca-clara">
          <Icone aria-hidden="true" className="size-5" />
        </span>
        <h3 className="font-display text-xl leading-tight font-semibold tracking-tight sm:text-2xl">{titulo}</h3>
      </div>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{porque}</p>
      {children && <div className={cn("mt-5", crescer && "flex flex-1 flex-col")}>{children}</div>}
      <div className="mt-auto pt-5">
        <MiniPrompt texto={prompt} tecnica={titulo} />
      </div>
    </CartaoHolofote>
  );
}
