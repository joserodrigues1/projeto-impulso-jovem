"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Sparkles } from "lucide-react";
import { CURVA_IMPULSO } from "@/components/movimento";

interface Props {
  comAudio: boolean;
  comCurriculoAntigo?: boolean;
  comIa: boolean;
}

const INTERVALO_MS = 8000;
const DEMORA_MS = 45_000;

/** Etapas animadas enquanto a API (e o n8n) montam o currículo — pode levar até ~2 minutos com áudio. */
export function ProgressoGeracao({ comAudio, comCurriculoAntigo = false, comIa }: Props) {
  const etapas = comIa
    ? [
        ...(comAudio ? ["Ouvindo seu áudio…"] : []),
        ...(comCurriculoAntigo ? ["Lendo seu currículo antigo…"] : []),
        "Organizando suas experiências…",
        "Caprichando no texto…",
        "Montando o modelo do currículo…",
      ]
    : ["Organizando suas informações…", "Montando o modelo do currículo…"];
  const total = etapas.length;
  const [atual, setAtual] = useState(0);
  const [demorando, setDemorando] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setAtual((i) => Math.min(i + 1, total - 1)), INTERVALO_MS);
    return () => window.clearInterval(timer);
  }, [total]);

  // Passou do tempo normal: avisa que continua funcionando (sem isso, parece travado)
  useEffect(() => {
    const espera = window.setTimeout(() => setDemorando(true), DEMORA_MS);
    return () => window.clearTimeout(espera);
  }, []);

  return (
    <div className="relative mx-auto max-w-md py-8 text-center sm:py-10" aria-busy="true">
      {/* Orbe: anel em degradê girando em volta do ícone */}
      <div className="relative mx-auto mb-7 size-24" aria-hidden="true">
        <div className="absolute -inset-6 rounded-full bg-marca/25 blur-2xl motion-safe:animate-pulso-suave" />
        <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,var(--marca),var(--ciano),var(--lima),var(--marca))] motion-safe:animate-[spin_4s_linear_infinite]" />
        <div className="absolute inset-[3px] flex items-center justify-center rounded-full bg-tinta text-white">
          <Sparkles className="size-10 text-lima motion-safe:animate-pulso-suave" />
        </div>
      </div>

      <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {comIa ? "A IA está montando seu currículo" : "Montando seu currículo"}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {comIa
          ? `Isso pode levar até ${comAudio || comCurriculoAntigo ? "2 minutos" : "1 minuto"}. Não feche esta página.`
          : "É rapidinho. Não feche esta página."}
      </p>

      <ol className="mt-8 space-y-2.5 text-left">
        {etapas.map((texto, i) => {
          const feita = i < atual;
          const emAndamento = i === atual;
          return (
            <motion.li
              key={texto}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: CURVA_IMPULSO, delay: 0.15 + i * 0.08 }}
              className={`relative flex items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3 text-sm transition-colors duration-500 ${
                emAndamento
                  ? "border-marca/35 bg-marca/[0.07] font-semibold text-foreground dark:bg-marca/15"
                  : feita
                    ? "border-border bg-card text-foreground"
                    : "border-dashed border-border text-muted-foreground"
              }`}
            >
              {/* Brilho que atravessa a etapa em andamento */}
              {emAndamento && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-marca/15 to-transparent motion-safe:animate-brilho motion-reduce:hidden"
                />
              )}
              <span className="relative flex size-6 shrink-0 items-center justify-center" aria-hidden="true">
                <AnimatePresence initial={false} mode="wait">
                  {feita ? (
                    <motion.span
                      key="feita"
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 420, damping: 22 }}
                      className="flex size-6 items-center justify-center rounded-full bg-lima text-tinta"
                    >
                      <Check className="size-3.5" strokeWidth={3} />
                    </motion.span>
                  ) : emAndamento ? (
                    <motion.span
                      key="andamento"
                      exit={{ scale: 0.6, opacity: 0 }}
                      className="size-5 rounded-full border-2 border-marca/25 border-t-marca motion-safe:animate-spin"
                    />
                  ) : (
                    <span className="size-5 rounded-full border-2 border-current opacity-35" />
                  )}
                </AnimatePresence>
              </span>
              <span className="relative">
                {texto}
                <span className="sr-only">{feita ? " (concluído)" : emAndamento ? " (em andamento)" : ""}</span>
              </span>
            </motion.li>
          );
        })}
      </ol>

      <AnimatePresence>
        {demorando && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: CURVA_IMPULSO }}
            className="mt-6 rounded-2xl border border-border bg-muted/60 p-3 text-sm leading-relaxed text-muted-foreground dark:bg-white/[0.03]"
          >
            Está levando um pouco mais que o normal{comAudio ? " (áudios longos demoram mais)" : ""}, mas continua
            funcionando. Fique nesta página.
          </motion.p>
        )}
      </AnimatePresence>

      {/* Só a etapa atual (e o aviso de demora) é anunciada para leitores de tela */}
      <p className="sr-only" aria-live="polite" role="status">
        {demorando ? "Ainda trabalhando no seu currículo. Fique nesta página." : etapas[atual]}
      </p>
    </div>
  );
}
