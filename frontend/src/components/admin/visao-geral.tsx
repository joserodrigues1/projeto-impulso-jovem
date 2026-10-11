"use client";

import { useState, type ReactNode } from "react";
import { Bot, FileText, Gauge, TriangleAlert, Users, type LucideIcon } from "lucide-react";
import { EstadoErro } from "@/components/entrevistas/estado-erro";
import { ESTILO_CARD } from "@/components/entrevistas/utils";
import { RevelarGrupo, RevelarItem } from "@/components/movimento";
import { apiAdmin, diasNoPeriodo, formatarDiaIso, type ResumoAdmin } from "@/lib/admin";
import { cn, formatarNota } from "@/lib/utils";
import { DistribuicaoClassificacoes, FunilCoorte } from "./barras-uso";
import { BotaoExportarCsv } from "./botao-exportar-csv";
import { EsqueletoVisaoGeral } from "./esqueletos";
import { GraficoSemanal } from "./grafico-semanal";
import { periodoDosUltimosDias, SeletorPeriodo, type Periodo } from "./seletor-periodo";
import { CabecalhoAdmin, SecaoAdmin } from "./ui-admin";
import { useRecursoAdmin } from "./use-recurso-admin";

function numero(valor: number | null | undefined): string {
  return (valor ?? 0).toLocaleString("pt-BR");
}

/** "1 participante" / "3 participantes". */
function plural(valor: number | null | undefined, singular: string, pluralTexto: string): string {
  const n = valor ?? 0;
  return `${numero(n)} ${n === 1 ? singular : pluralTexto}`;
}

function CartaoIndicador({
  rotulo,
  valor,
  complemento,
  icone: Icone,
  children,
}: {
  rotulo: string;
  valor: string;
  complemento?: string;
  icone: LucideIcon;
  children?: ReactNode;
}) {
  return (
    <RevelarItem className={cn(ESTILO_CARD, "relative flex flex-col overflow-hidden p-5 sm:p-6")}>
      <span
        aria-hidden="true"
        className="absolute top-5 right-5 flex size-9 items-center justify-center rounded-xl bg-marca/10 text-marca-forte ring-1 ring-marca/15 ring-inset dark:bg-marca/15 dark:text-marca-clara"
      >
        <Icone className="size-4" />
      </span>
      <dt className="pr-12 text-sm font-medium text-muted-foreground">{rotulo}</dt>
      <dd className="mt-3">
        <span className="font-display text-4xl leading-none font-bold tracking-tight text-foreground">{valor}</span>
        {complemento && <span className="ml-1.5 text-sm text-muted-foreground">{complemento}</span>}
      </dd>
      {children && (
        <dd className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm leading-snug text-muted-foreground">{children}</dd>
      )}
    </RevelarItem>
  );
}

/** Linha de detalhe do cartão; `destaque` deixa o número em evidência. */
function Detalhe({ children, atencao = false }: { children: ReactNode; atencao?: boolean }) {
  return (
    <p className={cn("flex items-start gap-1.5", atencao && "font-medium text-foreground")}>
      {atencao && (
        <TriangleAlert
          aria-hidden="true"
          className="mt-0.5 size-3.5 shrink-0 text-[color:color-mix(in_oklch,var(--chart-4),black_35%)] dark:text-chart-4"
        />
      )}
      <span>{children}</span>
    </p>
  );
}

function Indicadores({ resumo }: { resumo: ResumoAdmin }) {
  const { participantes: p, curriculos: c, simulacoes: s } = resumo;
  return (
    <RevelarGrupo como="div">
      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoIndicador rotulo="Participantes" valor={numero(p.total)} complemento="no total" icone={Users}>
          <Detalhe>
            <strong className="font-semibold text-foreground">+{numero(p.novosNoPeriodo)}</strong> cadastrados no período
          </Detalhe>
          <Detalhe>
            {plural(p.ativos7d, "ativo", "ativos")} nos últimos 7 dias · {numero(p.ativos30d)} em 30 dias
          </Detalhe>
          {p.bloqueados > 0 && <Detalhe atencao>{plural(p.bloqueados, "conta bloqueada", "contas bloqueadas")}</Detalhe>}
        </CartaoIndicador>

        <CartaoIndicador
          rotulo="Currículos gerados"
          valor={numero(c.geradosNoPeriodo)}
          complemento="no período"
          icone={FileText}
        >
          <Detalhe>
            {numero(c.comIa)} com IA ({numero(c.refinadosPorIa)} {c.refinadosPorIa === 1 ? "refinado" : "refinados"})
          </Detalhe>
          <Detalhe>
            {numero(c.comAudio)} com áudio · {numero(c.comCurriculoAntigo)} a partir de currículo antigo
          </Detalhe>
          {c.falhasIa > 0 && (
            <Detalhe atencao>
              {c.falhasIa === 1 ? "1 pediu IA e saiu sem IA" : `${numero(c.falhasIa)} pediram IA e saíram sem IA`}
            </Detalhe>
          )}
          <Detalhe>{plural(c.participantesComCurriculo, "participante tem", "participantes têm")} currículo</Detalhe>
        </CartaoIndicador>

        <CartaoIndicador
          rotulo="Simulações iniciadas"
          valor={numero(s.iniciadasNoPeriodo)}
          complemento="no período"
          icone={Bot}
        >
          <Detalhe>
            {numero(s.analisadas)} com relatório · {numero(s.emAndamento)} em andamento
          </Detalhe>
          <Detalhe>
            {numero(s.finalizadas)} aguardando relatório · {plural(s.canceladas, "cancelada", "canceladas")}
          </Detalhe>
          <Detalhe>{plural(s.participantesQueTreinaram, "participante treinou", "participantes treinaram")}</Detalhe>
        </CartaoIndicador>

        <CartaoIndicador
          rotulo="Nota média"
          valor={s.notaMedia !== null ? formatarNota(s.notaMedia) : "—"}
          complemento={s.notaMedia !== null ? "de 10" : undefined}
          icone={Gauge}
        >
          <Detalhe>
            {s.notaMedia !== null
              ? "Média da nota geral dos relatórios de entrevista do período."
              : "Sem relatórios de entrevista no período."}
          </Detalhe>
        </CartaoIndicador>
      </dl>
    </RevelarGrupo>
  );
}

/** Visão geral de uso: indicadores, gráfico semanal, funil da coorte e classificações do período. */
export function VisaoGeralAdmin() {
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoDosUltimosDias(30));
  const { dados, erro, carregando, recarregar } = useRecursoAdmin<ResumoAdmin>(apiAdmin.resumo(periodo.de, periodo.ate), {
    manterAnteriores: true,
    mensagemPadrao: "Não foi possível carregar os números de uso agora.",
  });

  // O período que a API realmente usou (ela normaliza as datas); enquanto carrega, o escolhido
  const exibido = dados && !carregando ? dados.periodo : periodo;
  const dias = diasNoPeriodo(exibido.de, exibido.ate);

  return (
    <div className="space-y-6">
      <CabecalhoAdmin
        titulo="Visão geral de uso"
        descricao="Como os participantes estão usando a plataforma no período escolhido. Contas de administração não entram nos números."
      />

      {/* Filtro do período: vale para tudo o que vem abaixo (e para a planilha) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <SeletorPeriodo valor={periodo} aoMudar={setPeriodo} />
          <p className="text-sm text-muted-foreground" aria-live="polite">
            De <strong className="font-semibold text-foreground">{formatarDiaIso(exibido.de)}</strong> a{" "}
            <strong className="font-semibold text-foreground">{formatarDiaIso(exibido.ate)}</strong>
            {dias > 0 && ` (${dias} ${dias === 1 ? "dia" : "dias"})`}
            {carregando && dados && <span className="ml-1.5">· atualizando…</span>}
          </p>
        </div>
        <BotaoExportarCsv
          endpoint={apiAdmin.csvUso(periodo.de, periodo.ate)}
          nomePadrao={`uso-impulso-jovem-${periodo.de}-a-${periodo.ate}.csv`}
          rotulo="Exportar CSV (por semana)"
        />
      </div>

      {erro && !dados ? (
        <EstadoErro titulo="Não foi possível carregar os números" mensagem={erro.mensagem} status={erro.status} onTentarDeNovo={recarregar} />
      ) : !dados ? (
        <EsqueletoVisaoGeral />
      ) : (
        <div
          aria-busy={carregando}
          className={cn("space-y-6 transition-opacity duration-300", carregando && "pointer-events-none opacity-60")}
        >
          {erro && (
            <EstadoErro
              titulo="Não foi possível atualizar os números"
              mensagem={erro.mensagem}
              status={erro.status}
              onTentarDeNovo={recarregar}
            />
          )}

          <section aria-labelledby="titulo-indicadores">
            <h2 id="titulo-indicadores" className="sr-only">
              Indicadores do período
            </h2>
            <Indicadores resumo={dados} />
          </section>

          <SecaoAdmin
            id="titulo-semanas"
            titulo="Uso por semana"
            descricao="Cada ponto é uma semana (de segunda a domingo). Passe o mouse, toque ou use as setas do teclado para ver os números."
          >
            <GraficoSemanal semanas={dados.semanas ?? []} />
          </SecaoAdmin>

          <div className="grid gap-6 lg:grid-cols-2">
            <SecaoAdmin
              id="titulo-funil"
              titulo="Funil dos novos cadastros"
              descricao="Das pessoas que se cadastraram no período, quantas já deram cada passo."
            >
              <FunilCoorte funil={dados.funil} />
            </SecaoAdmin>
            <SecaoAdmin
              id="titulo-classificacoes"
              titulo="Classificação dos relatórios"
              descricao="Como foram as simulações de entrevista analisadas no período."
            >
              <DistribuicaoClassificacoes classificacoes={dados.classificacoes} />
            </SecaoAdmin>
          </div>
        </div>
      )}
    </div>
  );
}
