"use client";

import { motion } from "motion/react";
import { CURVA_IMPULSO } from "@/components/movimento";
import { cn } from "@/lib/utils";

/** Exemplo de semana para provas de seleção (português, matemática, lógica e atualidades). */
const SEMANA: ReadonlyArray<{ dia: string; tema: string; folga?: boolean }> = [
  { dia: "Seg", tema: "Português" },
  { dia: "Ter", tema: "Matemática" },
  { dia: "Qua", tema: "Raciocínio lógico" },
  { dia: "Qui", tema: "Atualidades" },
  { dia: "Sex", tema: "Redação ou inglês" },
  { dia: "Sáb", tema: "Revisão + simulado" },
  { dia: "Dom", tema: "Descanso", folga: true },
];

/** Uma sessão de estudo de 25 minutos, em quatro partes. */
const SESSAO: ReadonlyArray<{ minutos: number; titulo: string; descricao: string; cor: string }> = [
  { minutos: 5, titulo: "Revisar", descricao: "Flashcards do que você viu ontem", cor: "bg-marca" },
  { minutos: 10, titulo: "Aprender", descricao: "Um assunto novo, explicado com exemplos", cor: "bg-ciano" },
  { minutos: 7, titulo: "Praticar", descricao: "Quiz de 5 questões com correção", cor: "bg-lima" },
  { minutos: 3, titulo: "Anotar", descricao: "Dúvidas e erros para revisar amanhã", cor: "bg-marca-clara" },
];

const TOTAL = SESSAO.reduce((soma, etapa) => soma + etapa.minutos, 0);

/** Cada etapa com a faixa de minutos ("0–5 min", "5–15 min"…). */
const ETAPAS = SESSAO.map((etapa, i) => {
  const inicio = SESSAO.slice(0, i).reduce((soma, anterior) => soma + anterior.minutos, 0);
  return { ...etapa, faixa: `${inicio}–${inicio + etapa.minutos} min` };
});

/** Semana de estudos + rotina sugerida de 25 minutos (a barra se preenche ao aparecer na tela). */
export function PlanoRotina() {
  return (
    <div className="space-y-4">
      <ol aria-label="Exemplo de semana de estudos" className="grid grid-cols-2 gap-2 sm:grid-cols-7">
        {SEMANA.map((item, i) => (
          <motion.li
            key={item.dia}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.5, ease: CURVA_IMPULSO, delay: i * 0.05 }}
            className={cn(
              "flex flex-col rounded-xl border px-3 py-2.5",
              item.folga ? "col-span-2 border-dashed bg-transparent sm:col-span-1" : "bg-background/70",
            )}
          >
            <span className="font-mono text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {item.dia}
            </span>
            <span className={cn("mt-0.5 text-[13px] leading-snug font-semibold", item.folga && "text-muted-foreground")}>
              {item.tema}
            </span>
          </motion.li>
        ))}
      </ol>

      <div className="rounded-2xl border bg-background/70 p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="font-semibold">Rotina sugerida: {TOTAL} minutos por dia</p>
          <p className="text-xs text-muted-foreground">Cabe antes da aula ou no caminho</p>
        </div>

        <div aria-hidden="true" className="mt-4 flex h-2.5 gap-1">
          {ETAPAS.map((etapa, i) => (
            <motion.span
              key={etapa.titulo}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: 1 }}
              transition={{ duration: 0.7, ease: CURVA_IMPULSO, delay: 0.15 + i * 0.18 }}
              style={{ flexGrow: etapa.minutos, originX: 0 }}
              className={cn("basis-0 rounded-full", etapa.cor)}
            />
          ))}
        </div>

        <ol className="mt-4 grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          {ETAPAS.map((etapa) => (
            <li key={etapa.titulo} className="flex gap-2.5">
              <span aria-hidden="true" className={cn("mt-1.5 size-2 shrink-0 rounded-full", etapa.cor)} />
              <span>
                <span className="block font-mono text-[11px] text-muted-foreground">{etapa.faixa}</span>
                <span className="block text-sm font-semibold">{etapa.titulo}</span>
                <span className="block text-[13px] leading-snug text-muted-foreground">{etapa.descricao}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
