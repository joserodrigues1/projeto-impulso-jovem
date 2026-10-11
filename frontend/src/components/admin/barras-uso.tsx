"use client";

import { useRef } from "react";
import { useInView } from "motion/react";
import { CORES_FAIXA, ROTULO_CLASSIFICACAO } from "@/components/entrevistas/faixas";
import type { ResumoAdmin } from "@/lib/admin";
import type { Classificacao } from "@/lib/tipos";
import { cn } from "@/lib/utils";

function percentual(parte: number, todo: number): number {
  return todo > 0 ? Math.round((parte / todo) * 100) : 0;
}

interface LinhaBarraProps {
  rotulo: string;
  valor: number;
  /** 0 a 1 — largura da barra. */
  fracao: number;
  detalhe?: string;
  /** Classe de preenchimento (fill-*) da barra. */
  cor: string;
  atraso?: number;
  visivel: boolean;
}

/**
 * Uma linha: rótulo e valor em cima, barra horizontal embaixo (SVG, para sair também na impressão).
 * A barra cresce da esquerda ao entrar na tela; o texto já traz o número, então a barra é decorativa.
 */
function LinhaBarra({ rotulo, valor, fracao, detalhe, cor, atraso = 0, visivel }: LinhaBarraProps) {
  const largura = `${Math.max(0, Math.min(1, fracao)) * 100}%`;
  return (
    <li className="break-inside-avoid">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">{rotulo}</span>
        <span className="shrink-0 text-muted-foreground">
          <span className="font-display text-base font-bold text-foreground tabular-nums">
            {valor.toLocaleString("pt-BR")}
          </span>
          {detalhe && <span className="ml-1.5 tabular-nums">{detalhe}</span>}
        </span>
      </div>
      <svg className="mt-2 block h-3 w-full overflow-visible" aria-hidden="true">
        <rect x="0" y="0" width="100%" height="12" rx="4" className="fill-border/70 dark:fill-white/[0.07]" />
        {valor > 0 && (
          <rect
            x="0"
            y="0"
            width={largura}
            height="12"
            rx="4"
            className={cn(
              cor,
              "origin-left transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] [transform-box:fill-box]",
              visivel ? "scale-x-100" : "scale-x-0",
              "print:scale-x-100!",
            )}
            style={{ transitionDelay: visivel ? `${atraso}s` : undefined }}
          />
        )}
      </svg>
    </li>
  );
}

/** Funil da coorte: das pessoas que se cadastraram no período, quantas chegaram a cada etapa. */
export function FunilCoorte({ funil }: { funil: ResumoAdmin["funil"] }) {
  const ref = useRef<HTMLDivElement>(null);
  const visivel = useInView(ref, { once: true, amount: 0.4 });

  if (funil.cadastrados === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-muted/40 p-5 text-center text-sm text-muted-foreground">
        Ninguém se cadastrou neste período, então ainda não há funil para mostrar.
      </p>
    );
  }

  const etapas = [
    { rotulo: "Cadastraram-se", valor: funil.cadastrados },
    { rotulo: "Criaram currículo", valor: funil.comCurriculo },
    { rotulo: "Fizeram simulação", valor: funil.comSimulacao },
    { rotulo: "Receberam relatório", valor: funil.comRelatorio },
  ];

  return (
    <div ref={ref}>
      <ol className="space-y-4">
        {etapas.map((etapa, i) => (
          <LinhaBarra
            key={etapa.rotulo}
            rotulo={etapa.rotulo}
            valor={etapa.valor}
            fracao={etapa.valor / funil.cadastrados}
            detalhe={i === 0 ? "100%" : `${percentual(etapa.valor, funil.cadastrados)}%`}
            cor="fill-marca dark:fill-marca-clara"
            atraso={i * 0.1}
            visivel={visivel}
          />
        ))}
      </ol>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Percentuais em relação a quem se cadastrou no período (a mesma pessoa conta uma vez em cada etapa).
      </p>
    </div>
  );
}

const ORDEM_CLASSIFICACOES: Classificacao[] = ["INICIANTE", "EM_DESENVOLVIMENTO", "PREPARADO", "DESTAQUE"];

/** Quantos relatórios do período caíram em cada classificação (mesmas cores das telas de entrevista). */
export function DistribuicaoClassificacoes({ classificacoes }: { classificacoes: ResumoAdmin["classificacoes"] }) {
  const ref = useRef<HTMLDivElement>(null);
  const visivel = useInView(ref, { once: true, amount: 0.4 });
  const total = ORDEM_CLASSIFICACOES.reduce((soma, c) => soma + (classificacoes?.[c] ?? 0), 0);

  if (total === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-muted/40 p-5 text-center text-sm text-muted-foreground">
        Nenhum relatório de entrevista foi gerado neste período.
      </p>
    );
  }

  const maior = Math.max(...ORDEM_CLASSIFICACOES.map((c) => classificacoes?.[c] ?? 0));

  return (
    <div ref={ref}>
      <ul className="space-y-4">
        {ORDEM_CLASSIFICACOES.map((classificacao, i) => {
          const valor = classificacoes?.[classificacao] ?? 0;
          return (
            <LinhaBarra
              key={classificacao}
              rotulo={ROTULO_CLASSIFICACAO[classificacao]}
              valor={valor}
              // Escala pela maior faixa: as diferenças entre faixas ficam visíveis mesmo com poucos relatórios
              fracao={maior > 0 ? valor / maior : 0}
              detalhe={`${percentual(valor, total)}%`}
              cor={CORES_FAIXA[classificacao].preenchimento}
              atraso={i * 0.1}
              visivel={visivel}
            />
          );
        })}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        {total.toLocaleString("pt-BR")} {total === 1 ? "relatório" : "relatórios"} no período. Faixas pela nota geral:
        abaixo de 4, de 4 a 6,4, de 6,5 a 8,4 e a partir de 8,5.
      </p>
    </div>
  );
}
