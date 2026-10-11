"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Filter, RefreshCw, ScrollText, Search, SearchX, UserRound, X } from "lucide-react";
import { classeCampo } from "@/components/curriculo/campos";
import { EstadoErro } from "@/components/entrevistas/estado-erro";
import { ESTILO_CARD, estiloBotao, tempoRelativo } from "@/components/entrevistas/utils";
import {
  apiAdmin,
  erroDoFiltroDeDatas,
  formatarDataHora,
  formatarDiaIso,
  hojeEmBrasilia,
  lerFiltrosAuditoria,
  parametrosAuditoria,
  participanteDoRegistro,
  resumirDetalhes,
  rotasAdmin,
  rotuloEntidade,
  type AcaoAuditoria,
  type RegistroAuditoria,
} from "@/lib/admin";
import { useAuth } from "@/lib/auth";
import type { Paginado } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { EsqueletoTabela } from "./esqueletos";
import { CabecalhoAdmin, EstadoVazio, Paginacao, Selo, type TomSelo } from "./ui-admin";
import { useFiltrosNaUrl } from "./use-filtros-url";
import { useRecursoAdmin } from "./use-recurso-admin";

/** Espera depois da última mudança nas datas antes de buscar (o campo de data muda a cada parte digitada). */
const ESPERA_DATAS_MS = 600;

/** Cor do selo de cada ação: falhas e alertas em vermelho, acessos da administração em âmbar. */
function tomDaAcao(acao: string): TomSelo {
  if (acao === "LOGIN_FALHA" || acao === "CONTA_EXCLUIDA" || acao.includes("REUSO")) return "perigo";
  if (acao.startsWith("ADMIN_")) return "ambar";
  if (acao.startsWith("CURRICULO_")) return "marca";
  if (acao.startsWith("SESSAO_") || acao.startsWith("ENTREVISTA_")) return "ciano";
  if (acao === "LOGIN_SUCESSO" || acao === "CADASTRO_USUARIO") return "lima";
  return "neutro";
}

/** Data e hora do registro, com o tempo relativo ("há 2 horas") embaixo. */
function Quando({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} className="block">
      <span className="block whitespace-nowrap text-foreground tabular-nums">{formatarDataHora(iso, "dd/MM/yyyy HH:mm")}</span>
      <span className="block text-xs text-muted-foreground">{tempoRelativo(iso)}</span>
    </time>
  );
}

interface AcoesDaPessoa {
  /** Id da conta logada (a administração): não tem ficha de participante. */
  meuId: string | null;
  /** Pessoa já filtrada (não mostra de novo o botão de filtrar por ela). */
  usuarioFiltrado: string;
  aoFiltrarPessoa: (usuarioId: string) => void;
}

/** Quem fez a ação: nome (link para a ficha, se for participante), e-mail e o atalho para filtrar por ela. */
function Pessoa({ registro, meuId, usuarioFiltrado, aoFiltrarPessoa }: { registro: RegistroAuditoria } & AcoesDaPessoa) {
  const u = registro.usuario;
  if (!u) {
    return (
      <span className="text-muted-foreground">
        Sem conta identificada
        <span className="block text-xs">Conta excluída ou e-mail desconhecido</span>
      </span>
    );
  }
  const ehAdministracao = u.id === meuId;
  return (
    <div className="flex min-w-0 items-start gap-2">
      <div className="min-w-0 flex-1">
        {ehAdministracao ? (
          <p className="truncate font-semibold text-foreground">
            {u.nome} <span className="font-normal text-muted-foreground">(você)</span>
          </p>
        ) : (
          <Link
            href={rotasAdmin.ficha(u.id)}
            className="block truncate font-semibold text-foreground underline-offset-4 outline-none hover:underline focus-visible:underline"
          >
            {u.nome}
          </Link>
        )}
        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
      </div>
      {usuarioFiltrado !== u.id && (
        <button
          type="button"
          onClick={() => aoFiltrarPessoa(u.id)}
          title="Ver só as ações desta pessoa"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 dark:hover:bg-white/[0.08]"
        >
          <Filter aria-hidden="true" className="size-4" />
          <span className="sr-only">Ver só as ações de {u.nome}</span>
        </button>
      )}
    </div>
  );
}

/** Sobre o que é o registro + resumo dos detalhes (sem conteúdo nem dados pessoais — a API já filtra). */
function Detalhes({ registro }: { registro: RegistroAuditoria }) {
  const entidade = rotuloEntidade(registro.entidade);
  const itens = resumirDetalhes(registro.detalhes);
  const participanteId = participanteDoRegistro(registro.detalhes);
  if (!entidade && itens.length === 0 && !participanteId) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="space-y-1.5">
      {(entidade || itens.length > 0) && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Detalhes">
          {entidade && (
            <li className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Sobre: {entidade}</li>
          )}
          {itens.map((item) => (
            <li key={item} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {item}
            </li>
          ))}
        </ul>
      )}
      {participanteId && (
        <Link
          href={rotasAdmin.ficha(participanteId)}
          className="group inline-flex items-center gap-1 rounded-lg text-xs font-semibold text-marca-forte underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 dark:text-marca-clara"
        >
          Ficha do participante
          <ArrowRight aria-hidden="true" className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

function Ip({ ip }: { ip: string | null }) {
  if (!ip) return <span className="text-muted-foreground">—</span>;
  return <span className="font-mono text-xs break-all text-muted-foreground">{ip}</span>;
}

/**
 * Período do filtro: os campos têm estado próprio e só vão para a URL depois de uma pausa e com as datas
 * válidas (o campo de data muda a cada parte digitada; uma data inválida não dispara busca).
 */
function FiltroDatas({ de, ate, aoAplicar }: { de: string; ate: string; aoAplicar: (de: string, ate: string) => void }) {
  const idDe = useId();
  const idAte = useId();
  const idErro = useId();
  const [valorDe, setValorDe] = useState(de);
  const [valorAte, setValorAte] = useState(ate);
  const chaveUrl = `${de}|${ate}`;
  const [daUrl, setDaUrl] = useState(chaveUrl);
  const hoje = hojeEmBrasilia();

  // A URL mudou por fora (voltar do navegador, "limpar filtros"): os campos acompanham
  if (daUrl !== chaveUrl) {
    setDaUrl(chaveUrl);
    setValorDe(de);
    setValorAte(ate);
  }

  const erro = erroDoFiltroDeDatas(valorDe, valorAte);

  useEffect(() => {
    if (erro || (valorDe === de && valorAte === ate)) return;
    const espera = setTimeout(() => aoAplicar(valorDe, valorAte), ESPERA_DATAS_MS);
    return () => clearTimeout(espera);
  }, [valorDe, valorAte, de, ate, erro, aoAplicar]);

  return (
    <fieldset className="min-w-0 md:col-span-2 xl:col-span-1">
      <legend className="mb-1.5 block text-sm font-semibold text-foreground">Período</legend>
      <div className="grid grid-cols-2 gap-2">
        <div className="min-w-0">
          <label htmlFor={idDe} className="sr-only">
            De
          </label>
          <input
            id={idDe}
            type="date"
            value={valorDe}
            max={valorAte || hoje}
            onChange={(e) => setValorDe(e.target.value)}
            aria-invalid={Boolean(erro)}
            aria-describedby={erro ? idErro : undefined}
            title="Data inicial"
            className={cn(classeCampo, "min-w-0 px-2.5")}
          />
        </div>
        <div className="min-w-0">
          <label htmlFor={idAte} className="sr-only">
            Até
          </label>
          <input
            id={idAte}
            type="date"
            value={valorAte}
            min={valorDe || undefined}
            max={hoje}
            onChange={(e) => setValorAte(e.target.value)}
            aria-invalid={Boolean(erro)}
            aria-describedby={erro ? idErro : undefined}
            title="Data final"
            className={cn(classeCampo, "min-w-0 px-2.5")}
          />
        </div>
      </div>
      {erro && (
        <p id={idErro} role="alert" className="mt-1.5 text-sm font-medium text-destructive">
          {erro}
        </p>
      )}
    </fieldset>
  );
}

/** Texto do período escolhido ("de 01/10/2026 a 10/10/2026", "desde…", "até…"). */
function descreverPeriodo(de: string, ate: string): string | null {
  if (de && ate) return de === ate ? `em ${formatarDiaIso(de)}` : `de ${formatarDiaIso(de)} a ${formatarDiaIso(ate)}`;
  if (de) return `desde ${formatarDiaIso(de)}`;
  if (ate) return `até ${formatarDiaIso(ate)}`;
  return null;
}

/**
 * Histórico de auditoria: quem fez o quê e quando (inclusive os acessos da administração ao conteúdo dos
 * participantes). Filtros por ação, período e pessoa ficam na URL; tabela no computador, cartões no celular.
 */
export function HistoricoAuditoria() {
  const { user } = useAuth();
  const { filtros, atualizar, textoBusca, setTextoBusca, buscarAgora } = useFiltrosNaUrl(
    lerFiltrosAuditoria,
    parametrosAuditoria,
  );
  const { dados, erro, carregando, recarregar } = useRecursoAdmin<Paginado<RegistroAuditoria>>(apiAdmin.auditoria(filtros), {
    manterAnteriores: true,
    mensagemPadrao: "Não foi possível carregar o histórico agora.",
  });
  const acoes = useRecursoAdmin<AcaoAuditoria[]>(apiAdmin.acoesAuditoria, {
    mensagemPadrao: "Não foi possível carregar a lista de ações.",
  });
  const idBusca = useId();
  const idAcao = useId();
  const idDicaAcao = useId();
  const tituloRef = useRef<HTMLHeadingElement>(null);

  // Página que deixou de existir (o histórico mudou): vai para a última
  const meta = dados?.meta;
  useEffect(() => {
    if (!meta || carregando) return;
    if (meta.total > 0 && filtros.pagina > meta.totalPaginas) atualizar({ pagina: meta.totalPaginas });
  }, [meta, carregando, filtros.pagina, atualizar]);

  const aplicarDatas = useCallback((de: string, ate: string) => atualizar({ de, ate }), [atualizar]);

  const listaAcoes = acoes.dados ?? [];
  // A ação da URL pode não estar na lista (ainda carregando, ou sem registros): continua selecionável
  const opcoesAcao =
    filtros.acao && !listaAcoes.some((a) => a.acao === filtros.acao)
      ? [...listaAcoes, { acao: filtros.acao, rotulo: filtros.acao, total: 0 }]
      : listaAcoes;

  const itens = dados?.dados ?? [];
  const temFiltros = Boolean(filtros.acao || filtros.usuarioId || filtros.busca || filtros.de || filtros.ate);
  const periodo = descreverPeriodo(filtros.de, filtros.ate);
  const pessoaFiltrada = filtros.usuarioId
    ? (itens.find((r) => r.usuario?.id === filtros.usuarioId)?.usuario ?? null)
    : null;
  const acoesDaPessoa: AcoesDaPessoa = {
    meuId: user?.id ?? null,
    usuarioFiltrado: filtros.usuarioId,
    aoFiltrarPessoa: (usuarioId) => {
      atualizar({ usuarioId });
      tituloRef.current?.focus();
    },
  };

  function aoBuscar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    buscarAgora();
  }

  function irParaPagina(pagina: number) {
    atualizar({ pagina });
    tituloRef.current?.focus();
  }

  function limparFiltros() {
    setTextoBusca("");
    atualizar({ acao: "", usuarioId: "", busca: "", de: "", ate: "" });
  }

  return (
    <div className="space-y-6">
      <CabecalhoAdmin
        titulo="Auditoria"
        descricao="Quem fez o quê e quando: cadastros, logins, currículos, simulações e cada vez que a administração abriu dados de um participante ou exportou uma planilha. Os IPs aparecem mascarados e os detalhes não mostram conteúdo."
      />

      {/* Filtros */}
      <div className={cn(ESTILO_CARD, "p-4 sm:p-5")}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_minmax(0,1.6fr)]">
          <form role="search" onSubmit={aoBuscar} className="min-w-0">
            <label htmlFor={idBusca} className="mb-1.5 block text-sm font-semibold text-foreground">
              Pessoa
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                id={idBusca}
                type="search"
                value={textoBusca}
                onChange={(e) => setTextoBusca(e.target.value)}
                placeholder="Nome ou e-mail"
                maxLength={100}
                autoComplete="off"
                spellCheck={false}
                className={cn(classeCampo, "pl-10")}
              />
            </div>
          </form>
          <div className="min-w-0">
            <label htmlFor={idAcao} className="mb-1.5 block text-sm font-semibold text-foreground">
              Ação
            </label>
            <select
              id={idAcao}
              value={filtros.acao}
              onChange={(e) => atualizar({ acao: e.target.value })}
              aria-describedby={acoes.erro ? idDicaAcao : undefined}
              className={classeCampo}
            >
              <option value="">Todas as ações</option>
              {opcoesAcao.map((a) => (
                <option key={a.acao} value={a.acao}>
                  {a.total > 0 ? `${a.rotulo} (${a.total.toLocaleString("pt-BR")})` : a.rotulo}
                </option>
              ))}
            </select>
            {acoes.erro && (
              <p id={idDicaAcao} className="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                {acoes.erro.mensagem}
                <button
                  type="button"
                  onClick={acoes.recarregar}
                  className="inline-flex items-center gap-1 rounded-lg font-semibold text-marca-forte outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 dark:text-marca-clara"
                >
                  <RefreshCw aria-hidden="true" className="size-3.5" />
                  Tentar de novo
                </button>
              </p>
            )}
          </div>
          <FiltroDatas de={filtros.de} ate={filtros.ate} aoAplicar={aplicarDatas} />
        </div>

        {filtros.usuarioId && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-marca/20 bg-marca/[0.06] p-3 text-sm dark:border-marca/30 dark:bg-marca/10">
            <p className="flex min-w-0 items-center gap-2 text-foreground">
              <UserRound aria-hidden="true" className="size-4 shrink-0 text-marca-forte dark:text-marca-clara" />
              <span className="min-w-0">
                Só as ações de{" "}
                <strong className="font-semibold">{pessoaFiltrada?.nome ?? "uma pessoa específica"}</strong>
                {pessoaFiltrada && <span className="text-muted-foreground"> ({pessoaFiltrada.email})</span>}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {filtros.usuarioId !== user?.id && (
                <Link href={rotasAdmin.ficha(filtros.usuarioId)} className={estiloBotao("fantasma", "sm")}>
                  Abrir ficha
                </Link>
              )}
              <button
                type="button"
                onClick={() => atualizar({ usuarioId: "" })}
                className={estiloBotao("secundario", "sm")}
              >
                <X aria-hidden="true" />
                Ver de todas as pessoas
              </button>
            </div>
          </div>
        )}
      </div>

      <section aria-labelledby="titulo-registros" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="titulo-registros"
            ref={tituloRef}
            tabIndex={-1}
            className="scroll-mt-24 rounded-lg font-display text-xl font-bold tracking-tight text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {temFiltros ? "Registros filtrados" : "Todos os registros"}
            {periodo && <span className="ml-2 text-base font-medium text-muted-foreground">{periodo}</span>}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {dados && (
              <p
                className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground tabular-nums"
                aria-live="polite"
              >
                {carregando
                  ? "Atualizando…"
                  : `${dados.meta.total.toLocaleString("pt-BR")} ${dados.meta.total === 1 ? "registro" : "registros"}`}
              </p>
            )}
            {temFiltros && (
              <button type="button" onClick={limparFiltros} className={estiloBotao("fantasma", "sm")}>
                <X aria-hidden="true" />
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {erro && !dados ? (
          <EstadoErro
            titulo="Não foi possível carregar o histórico"
            mensagem={erro.mensagem}
            status={erro.status}
            onTentarDeNovo={recarregar}
          />
        ) : !dados ? (
          <EsqueletoTabela linhas={8} />
        ) : itens.length === 0 ? (
          temFiltros ? (
            <EstadoVazio
              icone={SearchX}
              titulo="Nenhum registro com esses filtros"
              acao={
                <button type="button" onClick={limparFiltros} className={estiloBotao("secundario", "sm")}>
                  Limpar filtros
                </button>
              }
            >
              Tente outro período, outra ação ou só uma parte do nome ou do e-mail.
            </EstadoVazio>
          ) : (
            <EstadoVazio icone={ScrollText} titulo="Ainda não há registros">
              Cadastros, logins e o uso da plataforma aparecem aqui conforme acontecem.
            </EstadoVazio>
          )
        ) : (
          <div
            aria-busy={carregando}
            className={cn("space-y-4 transition-opacity duration-300", carregando && "pointer-events-none opacity-60")}
          >
            {erro && (
              <EstadoErro
                titulo="Não foi possível atualizar o histórico"
                mensagem={erro.mensagem}
                status={erro.status}
                onTentarDeNovo={recarregar}
              />
            )}

            {/* Computador: tabela */}
            <div className={cn(ESTILO_CARD, "hidden overflow-x-auto lg:block")}>
              <table className="w-full min-w-[60rem] text-left text-sm">
                <caption className="sr-only">
                  {`Registros de auditoria, do mais recente para o mais antigo. ` +
                    `Página ${dados.meta.pagina} de ${Math.max(1, dados.meta.totalPaginas)}.`}
                </caption>
                <thead className="border-b border-border bg-muted/50 text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Quando
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Ação
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Pessoa
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Detalhes
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      IP
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {itens.map((r) => (
                    <tr key={r.id} className="align-top transition-colors hover:bg-muted/40 dark:hover:bg-white/[0.02]">
                      <th scope="row" className="px-3 py-3 text-left font-normal">
                        <Quando iso={r.criadoEm} />
                      </th>
                      <td className="px-3 py-3">
                        <Selo tom={tomDaAcao(r.acao)} className="whitespace-normal">
                          {r.rotulo || r.acao}
                        </Selo>
                      </td>
                      <td className="max-w-64 px-3 py-3">
                        <Pessoa registro={r} {...acoesDaPessoa} />
                      </td>
                      <td className="max-w-80 px-3 py-3">
                        <Detalhes registro={r} />
                      </td>
                      <td className="px-3 py-3">
                        <Ip ip={r.ipMascarado} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Celular e tablet: cartões */}
            <ul className="grid gap-3 md:grid-cols-2 lg:hidden">
              {itens.map((r) => (
                <li key={r.id} className={cn(ESTILO_CARD, "min-w-0 space-y-3 p-4")}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <Selo tom={tomDaAcao(r.acao)} className="whitespace-normal">
                      {r.rotulo || r.acao}
                    </Selo>
                    <time dateTime={r.criadoEm} className="text-right text-xs text-muted-foreground tabular-nums">
                      {formatarDataHora(r.criadoEm, "dd/MM/yyyy HH:mm")}
                      <span className="block">{tempoRelativo(r.criadoEm)}</span>
                    </time>
                  </div>
                  <div className="text-sm">
                    <Pessoa registro={r} {...acoesDaPessoa} />
                  </div>
                  <div className="text-sm">
                    <Detalhes registro={r} />
                  </div>
                  {r.ipMascarado && (
                    <p className="text-xs text-muted-foreground">
                      IP: <Ip ip={r.ipMascarado} />
                    </p>
                  )}
                </li>
              ))}
            </ul>

            <Paginacao meta={dados.meta} rotulo="Páginas do histórico" desabilitada={carregando} aoMudar={irParaPagina} />
          </div>
        )}
      </section>
    </div>
  );
}
