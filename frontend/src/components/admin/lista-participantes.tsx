"use client";

import { useEffect, useId, useRef, type FormEvent } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, Search, UserX, Users, X } from "lucide-react";
import { classeCampo } from "@/components/curriculo/campos";
import { EstadoErro } from "@/components/entrevistas/estado-erro";
import { coresDaNota } from "@/components/entrevistas/faixas";
import { ESTILO_CARD, estiloBotao, tempoRelativo } from "@/components/entrevistas/utils";
import {
  apiAdmin,
  comoQuery,
  direcaoPadrao,
  formatarDataHora,
  lembrarBuscaParticipantes,
  lerFiltrosParticipantes,
  parametrosParticipantes,
  rotasAdmin,
  UFS_BRASIL,
  type Direcao,
  type OrdenacaoParticipantes,
  type ParticipanteResumo,
} from "@/lib/admin";
import type { Paginado, StatusConta } from "@/lib/tipos";
import { cn, formatarData, formatarNota, iniciais } from "@/lib/utils";
import { BotaoExportarCsv } from "./botao-exportar-csv";
import { EsqueletoListaParticipantes } from "./esqueletos";
import { CabecalhoAdmin, EstadoVazio, Paginacao, SeloStatusConta } from "./ui-admin";
import { useFiltrosNaUrl } from "./use-filtros-url";
import { useRecursoAdmin } from "./use-recurso-admin";

const ORDENACOES: Array<{ ordenar: OrdenacaoParticipantes; direcao: Direcao; rotulo: string }> = [
  { ordenar: "cadastro", direcao: "desc", rotulo: "Cadastro mais recente" },
  { ordenar: "cadastro", direcao: "asc", rotulo: "Cadastro mais antigo" },
  { ordenar: "ultimoAcesso", direcao: "desc", rotulo: "Acesso mais recente" },
  { ordenar: "ultimoAcesso", direcao: "asc", rotulo: "Acesso mais antigo" },
  { ordenar: "nome", direcao: "asc", rotulo: "Nome (A a Z)" },
  { ordenar: "nome", direcao: "desc", rotulo: "Nome (Z a A)" },
  { ordenar: "ultimaNota", direcao: "desc", rotulo: "Maior última nota" },
  { ordenar: "ultimaNota", direcao: "asc", rotulo: "Menor última nota" },
];

const STATUS: Array<{ valor: "" | StatusConta; rotulo: string }> = [
  { valor: "", rotulo: "Todos os status" },
  { valor: "ATIVO", rotulo: "Ativas" },
  { valor: "PENDENTE", rotulo: "Pendentes" },
  { valor: "BLOQUEADO", rotulo: "Bloqueadas" },
];

function rotuloOrdenacao(ordenar: OrdenacaoParticipantes, direcao: Direcao): string {
  return ORDENACOES.find((o) => o.ordenar === ordenar && o.direcao === direcao)?.rotulo ?? "";
}

function local(p: Pick<ParticipanteResumo, "cidade" | "uf">): string {
  return [p.cidade?.trim(), p.uf?.trim()].filter(Boolean).join(" - ");
}

/** Último acesso relativo ("há 3 dias"), com a data completa no title; "Nunca" sem acesso. */
function UltimoAcesso({ iso }: { iso: string | null }) {
  if (!iso) return <span className="text-muted-foreground">Nunca</span>;
  return (
    <time dateTime={iso} title={formatarDataHora(iso)}>
      {tempoRelativo(iso)}
    </time>
  );
}

function Nota({ nota }: { nota: number | null }) {
  if (nota === null || nota === undefined) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("font-display font-bold tabular-nums", coresDaNota(nota).texto)}>{formatarNota(nota)}</span>
  );
}

/** Cabeçalho de coluna que ordena a lista (clicar de novo inverte a direção). */
function CabecalhoOrdenavel({
  coluna,
  rotulo,
  ordenar,
  direcao,
  aoOrdenar,
  alinhamento = "esquerda",
}: {
  coluna: OrdenacaoParticipantes;
  rotulo: string;
  ordenar: OrdenacaoParticipantes;
  direcao: Direcao;
  aoOrdenar: (ordenar: OrdenacaoParticipantes, direcao: Direcao) => void;
  alinhamento?: "esquerda" | "direita";
}) {
  const ativa = ordenar === coluna;
  const Icone = !ativa ? ArrowUpDown : direcao === "asc" ? ArrowUp : ArrowDown;
  const proxima: Direcao = ativa ? (direcao === "asc" ? "desc" : "asc") : direcaoPadrao(coluna);
  return (
    <th
      scope="col"
      aria-sort={ativa ? (direcao === "asc" ? "ascending" : "descending") : undefined}
      className={cn("px-3 py-2.5 font-medium", alinhamento === "direita" && "text-right")}
    >
      <button
        type="button"
        onClick={() => aoOrdenar(coluna, proxima)}
        className={cn(
          "-mx-1.5 inline-flex min-h-8 items-center gap-1 rounded-lg px-1.5 outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
          ativa && "text-foreground",
        )}
      >
        {rotulo}
        <Icone aria-hidden="true" className={cn("size-3.5", !ativa && "opacity-50")} />
        <span className="sr-only">{`: ordenar por ${rotuloOrdenacao(coluna, proxima).toLowerCase()}`}</span>
      </button>
    </th>
  );
}

/**
 * Lista de participantes: filtros e ordenação na URL (a busca por texto não, porque pode ter dados pessoais),
 * tabela no computador e cartões no celular.
 */
export function ListaParticipantes() {
  const { filtros, atualizar, textoBusca, setTextoBusca, buscarAgora } = useFiltrosNaUrl(
    lerFiltrosParticipantes,
    parametrosParticipantes,
  );
  const { dados, erro, carregando, recarregar } = useRecursoAdmin<Paginado<ParticipanteResumo>>(
    apiAdmin.participantes(filtros),
    { manterAnteriores: true, mensagemPadrao: "Não foi possível carregar os participantes agora." },
  );
  const idBusca = useId();
  const idUf = useId();
  const idStatus = useId();
  const idOrdem = useId();
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const query = comoQuery(parametrosParticipantes(filtros));

  // O "voltar" da ficha leva de volta a esta mesma página da lista
  useEffect(() => {
    lembrarBuscaParticipantes(query);
  }, [query]);

  // Página que deixou de existir (a lista mudou): vai para a última
  const meta = dados?.meta;
  useEffect(() => {
    if (!meta || carregando) return;
    if (meta.total > 0 && filtros.pagina > meta.totalPaginas) atualizar({ pagina: meta.totalPaginas });
  }, [meta, carregando, filtros.pagina, atualizar]);

  const temFiltros = Boolean(filtros.busca || filtros.uf || filtros.status);
  const itens = dados?.dados ?? [];

  function aoBuscar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    buscarAgora();
  }

  function ordenar(ordenarPor: OrdenacaoParticipantes, direcao: Direcao) {
    atualizar({ ordenar: ordenarPor, direcao });
  }

  function irParaPagina(pagina: number) {
    atualizar({ pagina });
    tituloRef.current?.focus();
  }

  function limparFiltros() {
    setTextoBusca("");
    atualizar({ busca: "", uf: "", status: "" });
  }

  return (
    <div className="space-y-6">
      <CabecalhoAdmin
        titulo="Participantes"
        descricao="Jovens cadastrados na plataforma (contas de administração não aparecem). Abrir a ficha de alguém fica registrado na auditoria."
        acoes={
          <BotaoExportarCsv
            endpoint={apiAdmin.csvParticipantes(filtros)}
            nomePadrao="participantes-impulso-jovem.csv"
          />
        }
      />

      {/* Filtros: valem para a lista e para a planilha */}
      <div className={cn(ESTILO_CARD, "p-4 sm:p-5")}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)]">
          <form role="search" onSubmit={aoBuscar} className="md:col-span-2 xl:col-span-1">
            <label htmlFor={idBusca} className="mb-1.5 block text-sm font-semibold text-foreground">
              Buscar
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
                placeholder="Nome, e-mail ou telefone"
                maxLength={100}
                autoComplete="off"
                spellCheck={false}
                className={cn(classeCampo, "pl-10")}
              />
            </div>
          </form>
          <div>
            <label htmlFor={idUf} className="mb-1.5 block text-sm font-semibold text-foreground">
              Estado
            </label>
            <select
              id={idUf}
              value={filtros.uf}
              onChange={(e) => atualizar({ uf: e.target.value })}
              className={classeCampo}
            >
              <option value="">Todos os estados</option>
              {UFS_BRASIL.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={idStatus} className="mb-1.5 block text-sm font-semibold text-foreground">
              Status da conta
            </label>
            <select
              id={idStatus}
              value={filtros.status}
              onChange={(e) => atualizar({ status: e.target.value as "" | StatusConta })}
              className={classeCampo}
            >
              {STATUS.map((s) => (
                <option key={s.valor} value={s.valor}>
                  {s.rotulo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={idOrdem} className="mb-1.5 block text-sm font-semibold text-foreground">
              Ordenar por
            </label>
            <select
              id={idOrdem}
              value={`${filtros.ordenar}:${filtros.direcao}`}
              onChange={(e) => {
                const [ordenarPor, direcao] = e.target.value.split(":") as [OrdenacaoParticipantes, Direcao];
                ordenar(ordenarPor, direcao);
              }}
              className={classeCampo}
            >
              {ORDENACOES.map((o) => (
                <option key={`${o.ordenar}:${o.direcao}`} value={`${o.ordenar}:${o.direcao}`}>
                  {o.rotulo}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <section aria-labelledby="titulo-resultados" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="titulo-resultados"
            ref={tituloRef}
            tabIndex={-1}
            className="scroll-mt-24 rounded-lg font-display text-xl font-bold tracking-tight text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {temFiltros ? "Resultado da busca" : "Todos os participantes"}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {dados && (
              <p className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground tabular-nums" aria-live="polite">
                {carregando
                  ? "Atualizando…"
                  : `${dados.meta.total.toLocaleString("pt-BR")} ${dados.meta.total === 1 ? "participante" : "participantes"}`}
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
            titulo="Não foi possível carregar os participantes"
            mensagem={erro.mensagem}
            status={erro.status}
            onTentarDeNovo={recarregar}
          />
        ) : !dados ? (
          <EsqueletoListaParticipantes />
        ) : itens.length === 0 ? (
          temFiltros ? (
            <EstadoVazio
              icone={UserX}
              titulo="Ninguém encontrado com esses filtros"
              acao={
                <button type="button" onClick={limparFiltros} className={estiloBotao("secundario", "sm")}>
                  Limpar filtros
                </button>
              }
            >
              Confira a grafia ou busque só por uma parte do nome, do e-mail ou do telefone.
            </EstadoVazio>
          ) : (
            <EstadoVazio icone={Users} titulo="Ainda não há participantes">
              Quando os jovens se cadastrarem, eles aparecem aqui.
            </EstadoVazio>
          )
        ) : (
          <div
            aria-busy={carregando}
            className={cn("space-y-4 transition-opacity duration-300", carregando && "pointer-events-none opacity-60")}
          >
            {erro && (
              <EstadoErro
                titulo="Não foi possível atualizar a lista"
                mensagem={erro.mensagem}
                status={erro.status}
                onTentarDeNovo={recarregar}
              />
            )}

            {/* Computador: tabela */}
            <div className={cn(ESTILO_CARD, "hidden overflow-x-auto lg:block")}>
              <table className="w-full min-w-[56rem] text-left text-sm">
                <caption className="sr-only">
                  {`Participantes, ordenados por ${rotuloOrdenacao(filtros.ordenar, filtros.direcao).toLowerCase()}. ` +
                    `Página ${dados.meta.pagina} de ${Math.max(1, dados.meta.totalPaginas)}.`}
                </caption>
                <thead className="border-b border-border bg-muted/50 text-muted-foreground">
                  <tr>
                    <CabecalhoOrdenavel
                      coluna="nome"
                      rotulo="Participante"
                      ordenar={filtros.ordenar}
                      direcao={filtros.direcao}
                      aoOrdenar={ordenar}
                    />
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Local
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Status
                    </th>
                    <CabecalhoOrdenavel
                      coluna="cadastro"
                      rotulo="Cadastro"
                      ordenar={filtros.ordenar}
                      direcao={filtros.direcao}
                      aoOrdenar={ordenar}
                    />
                    <CabecalhoOrdenavel
                      coluna="ultimoAcesso"
                      rotulo="Último acesso"
                      ordenar={filtros.ordenar}
                      direcao={filtros.direcao}
                      aoOrdenar={ordenar}
                    />
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">
                      Currículos
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">
                      Simulações
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">
                      Relatórios
                    </th>
                    <CabecalhoOrdenavel
                      coluna="ultimaNota"
                      rotulo="Última nota"
                      ordenar={filtros.ordenar}
                      direcao={filtros.direcao}
                      aoOrdenar={ordenar}
                      alinhamento="direita"
                    />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {itens.map((p) => (
                    <tr key={p.id} className="group transition-colors hover:bg-muted/40 dark:hover:bg-white/[0.02]">
                      <th scope="row" className="max-w-72 px-3 py-3 text-left font-normal">
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-marca/10 text-xs font-bold text-marca-forte dark:bg-marca/20 dark:text-marca-clara"
                          >
                            {iniciais(p.nome)}
                          </span>
                          <div className="min-w-0">
                            <Link
                              href={rotasAdmin.ficha(p.id)}
                              className="block truncate font-semibold text-foreground underline-offset-4 outline-none hover:underline focus-visible:underline"
                            >
                              {p.nome}
                            </Link>
                            <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                            <p className="text-xs text-muted-foreground tabular-nums">{p.telefoneMascarado}</p>
                          </div>
                        </div>
                      </th>
                      <td className="px-3 py-3 text-muted-foreground">{local(p) || "—"}</td>
                      <td className="px-3 py-3">
                        <SeloStatusConta status={p.statusConta} />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap tabular-nums">
                        <time dateTime={p.criadoEm}>{formatarData(p.criadoEm)}</time>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <UltimoAcesso iso={p.ultimoAcessoEm} />
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{p.curriculos}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{p.simulacoes}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{p.relatorios}</td>
                      <td className="px-3 py-3 text-right">
                        <Nota nota={p.ultimaNota} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Celular e tablet: cartões */}
            <ul className="grid gap-3 sm:grid-cols-2 lg:hidden">
              {itens.map((p) => (
                <li
                  key={p.id}
                  className={cn(
                    ESTILO_CARD,
                    "group relative p-4 transition-[border-color,box-shadow] duration-200 has-focus-visible:ring-3 has-focus-visible:ring-ring/50 hover:border-marca/30",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-marca/10 text-xs font-bold text-marca-forte dark:bg-marca/20 dark:text-marca-clara"
                    >
                      {iniciais(p.nome)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={rotasAdmin.ficha(p.id)}
                        className="block truncate font-semibold text-foreground outline-none after:absolute after:inset-0 after:rounded-3xl"
                      >
                        {p.nome}
                      </Link>
                      <p className="truncate text-sm text-muted-foreground">{p.email}</p>
                      <p className="text-sm text-muted-foreground tabular-nums">{p.telefoneMascarado}</p>
                    </div>
                    <ChevronRight
                      aria-hidden="true"
                      className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5"
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <SeloStatusConta status={p.statusConta} />
                    {local(p) && <span>{local(p)}</span>}
                  </div>
                  <dl className="mt-3 grid grid-cols-4 gap-2 rounded-2xl bg-muted/50 p-2.5 text-center dark:bg-white/[0.03]">
                    <div>
                      <dt className="text-[0.6875rem] text-muted-foreground">Currículos</dt>
                      <dd className="font-semibold tabular-nums">{p.curriculos}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.6875rem] text-muted-foreground">Simulações</dt>
                      <dd className="font-semibold tabular-nums">{p.simulacoes}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.6875rem] text-muted-foreground">Relatórios</dt>
                      <dd className="font-semibold tabular-nums">{p.relatorios}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.6875rem] text-muted-foreground">Última nota</dt>
                      <dd>
                        <Nota nota={p.ultimaNota} />
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Cadastro em <time dateTime={p.criadoEm}>{formatarData(p.criadoEm)}</time> · Último acesso:{" "}
                    <UltimoAcesso iso={p.ultimoAcessoEm} />
                  </p>
                </li>
              ))}
            </ul>

            <Paginacao meta={dados.meta} rotulo="Páginas dos participantes" desabilitada={carregando} aoMudar={irParaPagina} />
          </div>
        )}
      </section>
    </div>
  );
}
