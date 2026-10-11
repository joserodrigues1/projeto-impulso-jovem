"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  Clock,
  FileText,
  Mail,
  MapPin,
  MessagesSquare,
  Phone,
  ScrollText,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UserRound,
  UserX,
} from "lucide-react";
import { classeSeloIa } from "@/components/curriculo/campos";
import { EstadoErro } from "@/components/entrevistas/estado-erro";
import { formatarNota } from "@/components/entrevistas/faixas";
import { SeloClassificacao } from "@/components/entrevistas/selo-classificacao";
import { estiloBotao, tempoRelativo } from "@/components/entrevistas/utils";
import { RevelarGrupo, RevelarItem } from "@/components/movimento";
import {
  apiAdmin,
  formatarDataHora,
  hrefVoltarParticipantes,
  resumirDetalhes,
  rotasAdmin,
  type ParticipanteDetalhe,
} from "@/lib/admin";
import type { CurriculoResumo } from "@/lib/tipos";
import { cn, formatarData, iniciais } from "@/lib/utils";
import { EsqueletoFicha } from "./esqueletos";
import { AvisoAcessoRegistrado, CabecalhoAdmin, EstadoVazio, SecaoAdmin, SeloStatusConta, SeloStatusSessao } from "./ui-admin";
import { useRecursoAdmin } from "./use-recurso-admin";

function tituloCurriculo(c: CurriculoResumo): string {
  return c.titulo?.trim() || (c.cargoDesejado?.trim() ? `Currículo – ${c.cargoDesejado.trim()}` : "Currículo sem título");
}

/** Par rótulo/valor dos dados da conta. */
function Dado({ rotulo, icone: Icone, children }: { rotulo: string; icone: typeof Mail; children: ReactNode }) {
  return (
    <div className="flex min-w-0 gap-3">
      <span
        aria-hidden="true"
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"
      >
        <Icone className="size-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-medium text-muted-foreground">{rotulo}</dt>
        <dd className="mt-0.5 break-words text-foreground">{children}</dd>
      </div>
    </div>
  );
}

function Vazio({ children }: { children: ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>;
}

/**
 * Ficha de um participante: dados da conta, consentimento, currículos, simulações e atividade recente.
 * Abrir a ficha fica registrado na auditoria (a API registra a cada consulta).
 */
export function FichaParticipante() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const { dados, erro, carregando, recarregar } = useRecursoAdmin<ParticipanteDetalhe>(
    id ? apiAdmin.participante(id) : null,
    { mensagemPadrao: "Não foi possível carregar a ficha agora." },
  );
  const voltar = { href: hrefVoltarParticipantes(), rotulo: "Voltar para participantes" };

  if (!id || erro?.status === 404 || erro?.status === 400) {
    return (
      <div className="space-y-6">
        <CabecalhoAdmin titulo="Ficha do participante" voltar={voltar} />
        <EstadoVazio icone={UserX} titulo="Participante não encontrado">
          A conta pode ter sido excluída ou o link está incompleto.
        </EstadoVazio>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="space-y-6">
        <CabecalhoAdmin titulo="Ficha do participante" voltar={voltar} />
        <EstadoErro titulo="Não foi possível abrir a ficha" mensagem={erro.mensagem} status={erro.status} onTentarDeNovo={recarregar} />
      </div>
    );
  }

  if (carregando || !dados) return <EsqueletoFicha />;

  const p = dados;
  const localidade = [p.cidade?.trim(), p.uf?.trim()].filter(Boolean).join(" - ");
  const curriculos = p.curriculos ?? [];
  const simulacoes = p.simulacoes ?? [];
  const relatoriosAntigos = p.relatoriosSemConversa ?? 0;
  const atividade = p.atividade ?? [];

  return (
    <div className="space-y-6">
      <CabecalhoAdmin
        sobretitulo="Ficha do participante"
        voltar={voltar}
        titulo={
          <span className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--marca),var(--marca-forte))] text-lg font-bold text-white shadow-[0_10px_24px_-12px_var(--marca)]"
            >
              {iniciais(p.nome)}
            </span>
            <span className="min-w-0">{p.nome}</span>
          </span>
        }
        descricao={
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <SeloStatusConta status={p.statusConta} />
            <span>Cadastro em {formatarData(p.criadoEm)}</span>
            <span aria-hidden="true">·</span>
            <span>
              Último acesso:{" "}
              {p.ultimoAcessoEm ? (
                <time dateTime={p.ultimoAcessoEm} title={formatarDataHora(p.ultimoAcessoEm)}>
                  {tempoRelativo(p.ultimoAcessoEm)}
                </time>
              ) : (
                "nunca"
              )}
            </span>
          </div>
        }
      />

      <AvisoAcessoRegistrado />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <SecaoAdmin id="ficha-conta" titulo="Dados da conta" icone={UserRound}>
          <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <Dado rotulo="E-mail" icone={Mail}>
              {p.email}
            </Dado>
            <Dado rotulo="Telefone (WhatsApp)" icone={Phone}>
              <span className="tabular-nums">{p.telefone || <Vazio>Não informado</Vazio>}</span>
            </Dado>
            <Dado rotulo="Cidade" icone={MapPin}>
              {localidade || <Vazio>Não informada</Vazio>}
            </Dado>
            <Dado rotulo="Escolaridade" icone={FileText}>
              {p.escolaridade?.trim() || <Vazio>Não informada</Vazio>}
            </Dado>
            <Dado rotulo="Cadastro" icone={CalendarDays}>
              <time dateTime={p.criadoEm}>{formatarDataHora(p.criadoEm)}</time>
            </Dado>
            <Dado rotulo="Último acesso" icone={Clock}>
              {p.ultimoAcessoEm ? (
                <time dateTime={p.ultimoAcessoEm}>{formatarDataHora(p.ultimoAcessoEm)}</time>
              ) : (
                <Vazio>Nunca entrou</Vazio>
              )}
            </Dado>
          </dl>
        </SecaoAdmin>

        <SecaoAdmin id="ficha-consentimento" titulo="Consentimento" descricao="Aceite dos termos e da política de privacidade (LGPD)." icone={ShieldCheck}>
          {p.consentimento ? (
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Versão do termo</dt>
                <dd className="mt-0.5 font-semibold text-foreground">{p.consentimento.versaoTermo}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Aceito em</dt>
                <dd className="mt-0.5 text-foreground">
                  <time dateTime={p.consentimento.aceitoEm}>{formatarDataHora(p.consentimento.aceitoEm)}</time>
                </dd>
              </div>
            </dl>
          ) : (
            <p className="flex items-start gap-2 rounded-2xl border border-chart-4/45 bg-chart-4/10 p-3 text-sm leading-relaxed text-foreground dark:border-chart-4/30 dark:bg-chart-4/[0.08]">
              <TriangleAlert
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-[color:color-mix(in_oklch,var(--chart-4),black_35%)] dark:text-chart-4"
              />
              Nenhum aceite registrado para esta conta.
            </p>
          )}
        </SecaoAdmin>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SecaoAdmin
          id="ficha-curriculos"
          titulo="Currículos"
          descricao={
            curriculos.length
              ? `${curriculos.length} ${curriculos.length === 1 ? "currículo salvo" : "currículos salvos"}.`
              : undefined
          }
          icone={FileText}
        >
          {curriculos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não criou nenhum currículo.</p>
          ) : (
            <ul className="space-y-3">
              {curriculos.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between dark:bg-white/[0.02]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{tituloCurriculo(c)}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {c.refinadoPorIa && (
                        <span className={classeSeloIa}>
                          <Sparkles aria-hidden="true" className="size-3" />
                          Refinado pela IA
                        </span>
                      )}
                      <span>Atualizado em {formatarData(c.atualizadoEm || c.geradoEm)}</span>
                    </div>
                  </div>
                  <Link href={rotasAdmin.curriculo(p.id, c.id)} className={estiloBotao("secundario", "sm", "group shrink-0")}>
                    Ver currículo
                    <span className="sr-only">: {tituloCurriculo(c)}</span>
                    <ArrowRight aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SecaoAdmin>

        <SecaoAdmin
          id="ficha-simulacoes"
          titulo="Simulações de entrevista"
          descricao={
            simulacoes.length
              ? `${simulacoes.length} ${simulacoes.length === 1 ? "simulação" : "simulações"} com a Helena.`
              : undefined
          }
          icone={Bot}
        >
          {simulacoes.length === 0 ? (
            relatoriosAntigos === 0 && <p className="text-sm text-muted-foreground">Ainda não fez nenhuma simulação.</p>
          ) : (
            <ul className="space-y-3">
              {simulacoes.map((s) => {
                const cargo = s.cargoAlvo?.trim() || "Simulação de entrevista";
                return (
                  <li
                    key={s.sessaoId}
                    className="flex flex-col gap-3 rounded-2xl border border-border bg-background/60 p-4 dark:bg-white/[0.02]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{cargo}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Iniciada em {formatarDataHora(s.iniciadaEm)} · {s.mensagens}{" "}
                          {s.mensagens === 1 ? "mensagem" : "mensagens"}
                        </p>
                      </div>
                      <SeloStatusSessao status={s.status} />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {/* Quem decide se há relatório é o vínculo com a entrevista: relatórios antigos podem não ter nota */}
                      {!s.entrevistaId ? (
                        <span className="text-sm text-muted-foreground">Sem relatório</span>
                      ) : typeof s.notaGeral === "number" ? (
                        <p className="flex items-center gap-2 text-sm">
                          <span className="font-display text-lg font-bold text-foreground tabular-nums">
                            {formatarNota(s.notaGeral)}
                          </span>
                          <span className="text-muted-foreground">de 10</span>
                          <SeloClassificacao classificacao={s.classificacao} nota={s.notaGeral} />
                        </p>
                      ) : (
                        <span className="text-sm text-muted-foreground">Relatório sem nota</span>
                      )}
                      <Link
                        href={rotasAdmin.conversa(p.id, s.sessaoId)}
                        className={estiloBotao("secundario", "sm", "group shrink-0")}
                      >
                        <MessagesSquare aria-hidden="true" />
                        {s.entrevistaId ? "Ver conversa e relatório" : "Ver conversa"}
                        <span className="sr-only">: {cargo}</span>
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {/* Relatórios antigos (sem sessão) também contam na lista e na visão geral */}
          {relatoriosAntigos > 0 && (
            <p
              className={cn(
                "rounded-2xl border border-dashed border-border bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground",
                simulacoes.length > 0 && "mt-3",
              )}
            >
              {relatoriosAntigos} {relatoriosAntigos === 1 ? "relatório" : "relatórios"} de antes das conversas pelo
              WhatsApp, sem conversa para abrir.
            </p>
          )}
        </SecaoAdmin>
      </div>

      <SecaoAdmin
        id="ficha-atividade"
        titulo="Atividade recente"
        descricao="As últimas ações desta conta registradas na auditoria."
        icone={ScrollText}
        acao={
          <Link href={rotasAdmin.auditoriaDe(p.id)} className={estiloBotao("fantasma", "sm", "group")}>
            Ver tudo na auditoria
            <ArrowRight aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        }
      >
        {atividade.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma ação registrada ainda.</p>
        ) : (
          <RevelarGrupo como="ol" intervalo={0.03} className="relative space-y-1 before:absolute before:top-3 before:bottom-3 before:left-[0.4375rem] before:w-px before:bg-border">
            {atividade.map((item, i) => {
              const detalhes = resumirDetalhes(item.detalhes);
              return (
                <RevelarItem como="li" key={`${item.criadoEm}-${item.acao}-${i}`} className="relative flex gap-4 py-2 pl-0">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "relative z-10 mt-1.5 size-3.5 shrink-0 rounded-full border-2 border-card",
                      item.acao.startsWith("LOGIN_FALHA") || item.acao.includes("REUSO")
                        ? "bg-destructive"
                        : item.acao.startsWith("ADMIN_")
                          ? "bg-chart-4"
                          : "bg-marca dark:bg-marca-clara",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <p className="font-medium text-foreground">{item.rotulo || item.acao}</p>
                      <time dateTime={item.criadoEm} title={formatarDataHora(item.criadoEm)} className="text-xs text-muted-foreground">
                        {formatarDataHora(item.criadoEm)}
                      </time>
                    </div>
                    {detalhes.length > 0 && (
                      <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Detalhes">
                        {detalhes.map((d) => (
                          <li key={d} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {d}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </RevelarItem>
              );
            })}
          </RevelarGrupo>
        )}
      </SecaoAdmin>
    </div>
  );
}
