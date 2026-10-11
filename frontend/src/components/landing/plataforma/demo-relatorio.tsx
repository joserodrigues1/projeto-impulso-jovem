"use client";

import { useEffect, useId, useRef } from "react";
import { animate, motion, useMotionValue, useTransform, type Variants } from "motion/react";
import { Check, ClipboardCheck, ListChecks, ThumbsUp, TrendingUp } from "lucide-react";
import { CURVA_IMPULSO } from "@/components/movimento";
import { cn } from "@/lib/utils";
import { Palco } from "./palco";
import { useSequencia } from "./use-sequencia";

/** Marcos (ms): nota → competências → pontos → plano de ação → passo marcado. */
const MARCOS = [250, 1100, 2300, 3300, 4300] as const;

// Exemplo ilustrativo (a nota geral é a média das competências, como no relatório de verdade)
const COMPETENCIAS = [
  { nome: "Comunicação", nota: 8.5 },
  { nome: "Interesse pela vaga", nota: 9 },
  { nome: "Clareza e objetividade", nota: 7 },
  { nome: "Exemplos práticos (STAR)", nota: 6.5 },
];
const NOTA = Math.round((COMPETENCIAS.reduce((soma, c) => soma + c.nota, 0) / COMPETENCIAS.length) * 10) / 10;

const PONTOS_FORTES = ["Mostrou interesse real pela vaga", "Respostas educadas e bem organizadas"];
const PONTOS_MELHORIA = ["Contar exemplos com começo, meio e fim", "Falar mais do resultado do que você fez"];

const formatar = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const lista: Variants = { oculto: {}, visivel: { transition: { staggerChildren: 0.12 } } };
const item: Variants = {
  oculto: { opacity: 0, x: -8 },
  visivel: { opacity: 1, x: 0, transition: { duration: 0.45, ease: CURVA_IMPULSO } },
};

function AnelNota({ ativo }: { ativo: boolean }) {
  const id = useId();
  const valor = useMotionValue(0);
  const texto = useTransform(valor, formatar);

  useEffect(() => {
    if (!ativo) {
      valor.set(0);
      return;
    }
    const controle = animate(valor, NOTA, { duration: 1.6, ease: CURVA_IMPULSO });
    return () => controle.stop();
  }, [ativo, valor]);

  const raio = 46;
  return (
    <div className="relative size-[128px] shrink-0 sm:size-[140px]">
      <svg viewBox="0 0 110 110" className="size-full -rotate-90">
        <defs>
          <linearGradient id={`${id}-anel`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: "var(--marca)" }} />
            <stop offset="1" style={{ stopColor: "var(--ciano)" }} />
          </linearGradient>
        </defs>
        <circle cx="55" cy="55" r={raio} fill="none" strokeWidth="10" className="stroke-muted" />
        <motion.circle
          cx="55"
          cy="55"
          r={raio}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          stroke={`url(#${id}-anel)`}
          initial={false}
          animate={{ pathLength: ativo ? NOTA / 10 : 0 }}
          transition={{ duration: ativo ? 1.6 : 0, ease: CURVA_IMPULSO }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span className="font-display text-4xl leading-none font-bold tracking-tight text-foreground tabular-nums">
          {texto}
        </motion.span>
        <span className="mt-1 text-xs text-muted-foreground">de 10</span>
      </div>
    </div>
  );
}

function ListaNumerada({
  titulo,
  icone: Icone,
  itens,
  cor,
}: {
  titulo: string;
  icone: typeof ThumbsUp;
  itens: string[];
  cor: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-3.5">
      <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
        <span className={cn("flex size-6 items-center justify-center rounded-lg", cor)}>
          <Icone className="size-3.5" />
        </span>
        {titulo}
      </p>
      <motion.ol variants={lista} className="mt-2.5 space-y-2">
        {itens.map((texto, i) => (
          <motion.li key={texto} variants={item} className="flex gap-2 text-[12.5px] leading-snug text-muted-foreground">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[10px] font-semibold text-foreground">
              {i + 1}
            </span>
            {texto}
          </motion.li>
        ))}
      </motion.ol>
    </div>
  );
}

/** Demonstração animada do relatório: nota, competências, pontos numerados e plano de ação. */
export function DemoRelatorio() {
  const ref = useRef<HTMLDivElement>(null);
  const { passo, podeRepetir, repetir } = useSequencia(ref, MARCOS);

  return (
    <Palco
      nome="relatório da simulação"
      brilho="bg-marca/25 dark:bg-marca/20"
      podeRepetir={podeRepetir}
      aoRepetir={repetir}
      descricao={`Exemplo ilustrativo de relatório: nota geral ${formatar(NOTA)} de 10, classificação Preparado, notas por competência (${COMPETENCIAS.map((c) => `${c.nome} ${formatar(c.nota)}`).join(", ")}), dois pontos fortes e dois pontos de melhoria numerados e um passo do plano de ação.`}
    >
      <div ref={ref} className="mx-auto w-full max-w-[540px]">
        <div className="rounded-3xl border border-border bg-card p-4 shadow-[0_30px_70px_-35px_rgb(15_23_42/0.5)] sm:p-6">
          {/* Cabeçalho do relatório */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-marca-suave text-marca-forte dark:bg-marca/15 dark:text-marca-clara">
                <ClipboardCheck className="size-5" />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-foreground">Relatório da simulação</p>
                <p className="text-xs text-muted-foreground">Jovem aprendiz administrativo</p>
              </div>
            </div>
            <span className="rounded-full border border-dashed border-border px-2.5 py-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Exemplo
            </span>
          </div>

          {/* Nota + competências */}
          <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
            <div className="flex flex-col items-center gap-2">
              <AnelNota ativo={passo >= 1} />
              <motion.span
                initial={false}
                animate={passo >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
                transition={{ duration: 0.4, delay: passo >= 1 ? 1 : 0 }}
                className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/30"
              >
                Preparado
              </motion.span>
            </div>
            <ul className="w-full flex-1 space-y-3">
              {COMPETENCIAS.map((c, i) => (
                <li key={c.nome}>
                  <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                    <span className="font-medium text-foreground">{c.nome}</span>
                    <motion.span
                      initial={false}
                      animate={{ opacity: passo >= 2 ? 1 : 0 }}
                      transition={{ duration: 0.3, delay: passo >= 2 ? 0.3 + i * 0.12 : 0 }}
                      className="font-mono text-muted-foreground tabular-nums"
                    >
                      {formatar(c.nota)}
                    </motion.span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      initial={false}
                      animate={{ scaleX: passo >= 2 ? c.nota / 10 : 0 }}
                      transition={{ duration: passo >= 2 ? 0.9 : 0, ease: CURVA_IMPULSO, delay: passo >= 2 ? i * 0.12 : 0 }}
                      className="h-full origin-left rounded-full bg-gradient-to-r from-marca to-ciano"
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Pontos fortes e de melhoria, numerados */}
          <motion.div
            initial={false}
            animate={passo >= 3 ? "visivel" : "oculto"}
            variants={{ oculto: {}, visivel: { transition: { staggerChildren: 0.15 } } }}
            className="mt-5 grid gap-3 sm:grid-cols-2"
          >
            <ListaNumerada
              titulo="Pontos fortes"
              icone={ThumbsUp}
              itens={PONTOS_FORTES}
              cor="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
            />
            <ListaNumerada
              titulo="O que melhorar"
              icone={TrendingUp}
              itens={PONTOS_MELHORIA}
              cor="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
            />
          </motion.div>

          {/* Um passo do plano de ação */}
          <motion.div
            initial={false}
            animate={passo >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.5, ease: CURVA_IMPULSO }}
            className="mt-3 flex items-center gap-3 rounded-2xl border border-marca/20 bg-marca/[0.06] p-3.5 dark:border-marca-clara/20 dark:bg-marca/10"
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors duration-300",
                passo >= 5 ? "border-transparent bg-lima text-tinta" : "border-marca/40 bg-card",
              )}
            >
              <motion.span
                initial={false}
                animate={passo >= 5 ? { scale: 1, opacity: 1 } : { scale: 0.4, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                className="inline-flex"
              >
                <Check className="size-4" strokeWidth={3} />
              </motion.span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-marca-forte uppercase dark:text-marca-clara">
                <ListChecks className="size-3.5" /> Plano de ação · passo 1
              </p>
              <p
                className={cn(
                  "mt-0.5 text-[13px] leading-snug text-foreground transition-colors duration-500",
                  passo >= 5 && "text-muted-foreground line-through decoration-foreground/30",
                )}
              >
                Treinar 3 respostas usando o método STAR
              </p>
            </div>
            <span className="hidden shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground sm:inline">
              esta semana
            </span>
          </motion.div>
        </div>
      </div>
    </Palco>
  );
}
