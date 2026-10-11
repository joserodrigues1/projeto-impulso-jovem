import type { ReactNode } from "react";
import { ClipboardCheck, MessageCircle, Mic } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { RevelarGrupo, RevelarItem } from "@/components/movimento";
import { cn } from "@/lib/utils";
import { ESTILO_CARD } from "./utils";

const PASSOS: Array<{ icone: LucideIcon; titulo: string; texto: ReactNode }> = [
  {
    icone: MessageCircle,
    titulo: "Chame a Helena no WhatsApp",
    texto: "Ela é a nossa recrutadora virtual e vai te entrevistar como numa seleção de verdade.",
  },
  {
    icone: Mic,
    titulo: "Responda como numa entrevista real",
    texto: "Por texto ou por áudio, do seu jeito. Conte exemplos do seu dia a dia, da escola ou de projetos.",
  },
  {
    icone: ClipboardCheck,
    titulo: "Receba seu relatório aqui",
    texto: (
      <>
        Quando quiser parar, digite <strong className="font-semibold text-foreground">encerrar</strong>. Sua nota,
        pontos fortes e o que melhorar aparecem nesta página.
      </>
    ),
  },
];

/** Passo a passo curto da simulação no WhatsApp. */
export function ComoFunciona({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="como-funciona-titulo"
      className={cn(ESTILO_CARD, "relative overflow-hidden p-5 sm:p-7 print:hidden", className)}
    >
      <h2 id="como-funciona-titulo" className="font-display text-xl font-bold tracking-tight text-foreground">
        Como funciona
      </h2>
      <RevelarGrupo como="ol" intervalo={0.1} className="relative mt-6 grid gap-6 md:grid-cols-3 md:gap-5">
        {PASSOS.map(({ icone: Icone, titulo, texto }, i) => (
          <RevelarItem como="li" key={titulo} className="relative flex gap-4 md:flex-col md:gap-0">
            {/* Linha que liga os passos (computador) */}
            {i < PASSOS.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute top-6 left-16 hidden h-px w-[calc(100%-3.5rem)] bg-gradient-to-r from-marca/40 via-ciano/40 to-transparent md:block"
              />
            )}
            <span aria-hidden="true" className="relative flex size-12 shrink-0 items-center justify-center">
              <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-marca to-marca-forte shadow-md shadow-marca/25" />
              <Icone className="relative size-5 text-white" />
              <span className="absolute -right-1.5 -bottom-1.5 flex size-5 items-center justify-center rounded-full bg-lima font-display text-[11px] font-bold text-tinta ring-2 ring-card">
                {i + 1}
              </span>
            </span>
            <div className="md:mt-4">
              <p className="font-semibold text-foreground">
                <span className="sr-only">Passo {i + 1}: </span>
                {titulo}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{texto}</p>
            </div>
          </RevelarItem>
        ))}
      </RevelarGrupo>
    </section>
  );
}
