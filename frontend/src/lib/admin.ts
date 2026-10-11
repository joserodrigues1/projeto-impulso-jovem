/**
 * Painel do administrador: tipos das rotas `/admin/*` (espelham a especificação do módulo admin da API)
 * e funções de apoio das telas (períodos, filtros na URL, rótulos).
 * Se mudar algo aqui, confira o backend (src/modules/admin).
 */

import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Classificacao, CurriculoDetalhe, CurriculoResumo, RelatorioEntrevista, StatusConta } from "./tipos";

// ───────────────────────────── GET /admin/resumo ─────────────────────────────

export interface SemanaUso {
  /** Segunda-feira da semana (AAAA-MM-DD, fuso de Brasília). */
  semana: string;
  cadastros: number;
  curriculos: number;
  simulacoes: number;
  relatorios: number;
}

export interface ResumoAdmin {
  periodo: { de: string; ate: string };
  participantes: {
    total: number;
    novosNoPeriodo: number;
    ativos7d: number;
    ativos30d: number;
    bloqueados: number;
  };
  curriculos: {
    geradosNoPeriodo: number;
    comIa: number;
    refinadosPorIa: number;
    comAudio: number;
    comCurriculoAntigo: number;
    /** Pediu IA e o currículo saiu sem IA. */
    falhasIa: number;
    participantesComCurriculo: number;
  };
  simulacoes: {
    iniciadasNoPeriodo: number;
    emAndamento: number;
    finalizadas: number;
    analisadas: number;
    canceladas: number;
    /** null quando não há relatórios no período. */
    notaMedia: number | null;
    participantesQueTreinaram: number;
  };
  /** Relatórios do período por classificação. */
  classificacoes: Record<Classificacao, number>;
  /** Coorte: quem se cadastrou no período e até onde chegou. */
  funil: { cadastrados: number; comCurriculo: number; comSimulacao: number; comRelatorio: number };
  /** Uma entrada por semana do período, sem buracos. */
  semanas: SemanaUso[];
}

// ───────────────────────────── Participantes ─────────────────────────────

export type OrdenacaoParticipantes = "cadastro" | "ultimoAcesso" | "nome" | "ultimaNota";
export type Direcao = "asc" | "desc";

/** Item de GET /admin/participantes (Paginado). */
export interface ParticipanteResumo {
  id: string;
  nome: string;
  email: string;
  /** Ex.: "(61) 9••••-9999". */
  telefoneMascarado: string;
  cidade: string | null;
  uf: string | null;
  statusConta: StatusConta;
  criadoEm: string;
  ultimoAcessoEm: string | null;
  curriculos: number;
  simulacoes: number;
  relatorios: number;
  ultimaNota: number | null;
}

export type StatusSessao = "EM_ANDAMENTO" | "FINALIZADA" | "ANALISADA" | "CANCELADA";

export interface SimulacaoParticipante {
  sessaoId: string;
  status: StatusSessao;
  cargoAlvo: string | null;
  iniciadaEm: string;
  finalizadaEm: string | null;
  /** Quantidade de mensagens trocadas. */
  mensagens: number;
  entrevistaId: string | null;
  notaGeral: number | null;
  classificacao: Classificacao | null;
}

export interface AtividadeParticipante {
  acao: string;
  rotulo: string;
  criadoEm: string;
  /** Sem conteúdo nem IP (a API já filtra). */
  detalhes: Record<string, unknown> | null;
}

/** GET /admin/participantes/:id */
export interface ParticipanteDetalhe {
  id: string;
  nome: string;
  email: string;
  /** Completo, já formatado. */
  telefone: string;
  cidade: string | null;
  uf: string | null;
  escolaridade: string | null;
  statusConta: StatusConta;
  criadoEm: string;
  ultimoAcessoEm: string | null;
  consentimento: { versaoTermo: string; aceitoEm: string } | null;
  curriculos: CurriculoResumo[];
  simulacoes: SimulacaoParticipante[];
  /**
   * Relatórios antigos, de antes das conversas pelo WhatsApp (sem sessão): entram nos números e
   * na lista, mas não têm conversa para abrir.
   */
  relatoriosSemConversa: number;
  /** Últimas 30 ações da auditoria da pessoa. */
  atividade: AtividadeParticipante[];
}

/** GET /admin/participantes/:id/curriculos/:curriculoId — o mesmo formato que o dono vê. */
export type CurriculoParticipante = CurriculoDetalhe;

export interface MensagemConversa {
  autor: "CANDIDATO" | "RECRUTADORA";
  tipo: "TEXTO" | "AUDIO";
  /** Texto (ou a transcrição, quando foi áudio). */
  conteudo: string;
  criadoEm: string;
}

/** GET /admin/participantes/:id/simulacoes/:sessaoId */
export interface ConversaParticipante {
  sessaoId: string;
  status: StatusSessao;
  cargoAlvo: string | null;
  empresaAlvo: string | null;
  iniciadaEm: string;
  finalizadaEm: string | null;
  motivoFinalizacao: string | null;
  mensagens: MensagemConversa[];
  entrevista: {
    id: string;
    notaGeral: number | null;
    dataRealizacao: string;
    relatorio: RelatorioEntrevista;
  } | null;
}

// ───────────────────────────── Auditoria ─────────────────────────────

/** Item de GET /admin/auditoria (Paginado). */
export interface RegistroAuditoria {
  id: string;
  criadoEm: string;
  acao: string;
  rotulo: string;
  usuario: { id: string; nome: string; email: string } | null;
  entidade: string | null;
  entidadeId: string | null;
  /** Ex.: "177.37.•••.•••" (ou IPv6 truncado). */
  ipMascarado: string | null;
  detalhes: Record<string, unknown> | null;
}

/** Item de GET /admin/auditoria/acoes. */
export interface AcaoAuditoria {
  acao: string;
  rotulo: string;
  total: number;
}

// ───────────────────────────── Rótulos ─────────────────────────────

export const ROTULO_STATUS_CONTA: Record<StatusConta, string> = {
  ATIVO: "Ativa",
  PENDENTE: "Pendente",
  BLOQUEADO: "Bloqueada",
};

export const ROTULO_STATUS_SESSAO: Record<StatusSessao, string> = {
  EM_ANDAMENTO: "Em andamento",
  FINALIZADA: "Aguardando relatório",
  ANALISADA: "Com relatório",
  CANCELADA: "Cancelada",
};

/** Valores de `motivoFinalizacao` gravados pela API (entrevistas/regras-sessao.ts e sessoes.service.ts). */
const ROTULO_MOTIVO_FINALIZACAO: Record<string, string> = {
  CONCLUIDA: "Concluída pela recrutadora",
  SOLICITADA_USUARIO: "Encerrada pelo participante",
  INATIVIDADE: "Encerrada por inatividade",
  CUIDADO: "Pausada pela Helena por cuidado",
  SEM_RELATORIO: "Cancelada sem relatório",
};

/**
 * Motivo gravado quando a Helena pausa a simulação porque o participante relatou sofrimento ou risco:
 * a conversa não vira relatório com nota (a sessão é cancelada).
 */
export const MOTIVO_CUIDADO = "CUIDADO";

/** Motivo de encerramento da simulação em português (valor desconhecido aparece como veio). */
export function rotuloMotivoFinalizacao(motivo: string | null | undefined): string | null {
  if (!motivo) return null;
  return ROTULO_MOTIVO_FINALIZACAO[motivo] ?? motivo;
}

export const UFS_BRASIL = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

/** Nomes amigáveis das chaves de `detalhes` que aparecem na auditoria e na atividade. */
const ROTULO_DETALHE: Record<string, string> = {
  usouIa: "Pediu IA",
  refinadoPorIa: "Refinado pela IA",
  comAudio: "Com áudio",
  comCurriculoAntigo: "Com currículo antigo",
  recurso: "Recurso",
  tipo: "Tipo",
  status: "Status",
  motivo: "Motivo",
  motivoFinalizacao: "Motivo",
  mensagens: "Mensagens",
  totalMensagens: "Mensagens",
  notaGeral: "Nota",
  cargoAlvo: "Cargo",
  versaoTermo: "Versão do termo",
  versaoRelatorio: "Versão do relatório",
  linhas: "Linhas",
  origem: "Origem",
  canal: "Canal",
};

const ROTULO_VALOR_DETALHE: Record<string, string> = {
  ficha: "ficha",
  curriculo: "currículo",
  conversa: "conversa",
  participantes: "participantes",
  uso: "uso",
  ...ROTULO_MOTIVO_FINALIZACAO,
  // "status" da simulação encerrada (FINALIZADA / CANCELADA)
  ...ROTULO_STATUS_SESSAO,
};

/** Identificadores (uuid) não ajudam a ler o histórico: ficam de fora do resumo. */
const PARECE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resumo legível dos `detalhes` de um registro: só valores simples (sim/não, números, textos curtos).
 * Chaves de ids e objetos aninhados (ex.: filtros da exportação) ficam de fora.
 */
export function resumirDetalhes(detalhes: Record<string, unknown> | null | undefined): string[] {
  if (!detalhes || typeof detalhes !== "object") return [];
  const itens: string[] = [];
  for (const [chave, valor] of Object.entries(detalhes)) {
    if (/id$/i.test(chave) || chave === "id") continue;
    const rotulo = ROTULO_DETALHE[chave] ?? chave;
    if (typeof valor === "boolean") {
      // Booleanos conhecidos viram etiquetas ("Com áudio"); falsos só aparecem quando explicam algo
      if (valor) itens.push(rotulo);
      else if (chave === "refinadoPorIa") itens.push("Sem refino da IA");
      continue;
    }
    if (typeof valor === "number" && Number.isFinite(valor)) {
      itens.push(`${rotulo}: ${valor.toLocaleString("pt-BR")}`);
      continue;
    }
    if (typeof valor === "string" && valor.trim() && valor.length <= 60 && !PARECE_ID.test(valor)) {
      itens.push(`${rotulo}: ${ROTULO_VALOR_DETALHE[valor] ?? valor}`);
    }
  }
  return itens.slice(0, 6);
}

/** Tipos de registro (`entidade`) gravados pela API, em português. */
const ROTULO_ENTIDADE: Record<string, string> = {
  Usuario: "Conta",
  CurriculoGerado: "Currículo",
  SessaoEntrevista: "Simulação",
  EntrevistaBot: "Relatório",
};

/** Sobre o que é o registro ("Currículo", "Simulação"…); valor desconhecido aparece como veio. */
export function rotuloEntidade(entidade: string | null | undefined): string | null {
  if (!entidade) return null;
  return ROTULO_ENTIDADE[entidade] ?? entidade;
}

/** Participante de quem a administração abriu dados (`detalhes.participanteId` do ADMIN_VISUALIZOU). */
export function participanteDoRegistro(detalhes: Record<string, unknown> | null | undefined): string | null {
  const id = detalhes?.participanteId;
  return typeof id === "string" && PARECE_ID.test(id) ? id : null;
}

// ───────────────────────────── Datas ─────────────────────────────

/** "AAAA-MM-DD" de hoje no fuso de Brasília (o mesmo que a API usa nos períodos). */
export function hojeEmBrasilia(agora: Date = new Date()): string {
  // en-CA formata como AAAA-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

/** Soma (ou subtrai) dias de uma data "AAAA-MM-DD", sem depender do fuso do navegador. */
export function somarDias(data: string, dias: number): string {
  const base = new Date(`${data}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

/** Dias entre duas datas "AAAA-MM-DD", contando as duas pontas (mesmo dia = 1). */
export function diasNoPeriodo(de: string, ate: string): number {
  const inicio = Date.parse(`${de}T12:00:00Z`);
  const fim = Date.parse(`${ate}T12:00:00Z`);
  if (Number.isNaN(inicio) || Number.isNaN(fim)) return 0;
  return Math.round((fim - inicio) / 86_400_000) + 1;
}

export const MAXIMO_DIAS_PERIODO = 366;

/** Mesmas regras da API: datas válidas, início antes do fim e no máximo 366 dias. null = tudo certo. */
export function erroDoPeriodo(de: string, ate: string): string | null {
  const formato = /^\d{4}-\d{2}-\d{2}$/;
  if (!formato.test(de) || !formato.test(ate) || !isValid(parseISO(de)) || !isValid(parseISO(ate))) {
    return "Escolha as duas datas do período.";
  }
  if (de > ate) return "A data inicial precisa ser antes da data final.";
  if (diasNoPeriodo(de, ate) > MAXIMO_DIAS_PERIODO) return `O período pode ter no máximo ${MAXIMO_DIAS_PERIODO} dias.`;
  return null;
}

/** Data "AAAA-MM-DD" (sem horário) lida no fuso local — `new Date("2026-09-07")` cairia no dia anterior. */
export function formatarDiaIso(data: string, padrao = "dd/MM/yyyy"): string {
  const valor = parseISO(data);
  return isValid(valor) ? format(valor, padrao, { locale: ptBR }) : "";
}

/** Data e hora de um instante ISO ("10/10/2026 às 14:32"). "" para valores inválidos. */
export function formatarDataHora(iso: string | null | undefined, padrao = "dd/MM/yyyy 'às' HH:mm"): string {
  if (!iso) return "";
  const valor = new Date(iso);
  return isValid(valor) ? format(valor, padrao, { locale: ptBR }) : "";
}

// ───────────────────────────── Filtros na URL ─────────────────────────────

export interface FiltrosParticipantes {
  busca: string;
  uf: string;
  status: "" | StatusConta;
  ordenar: OrdenacaoParticipantes;
  direcao: Direcao;
  pagina: number;
}

export const POR_PAGINA_PARTICIPANTES = 20;

const ORDENACOES: readonly OrdenacaoParticipantes[] = ["cadastro", "ultimoAcesso", "nome", "ultimaNota"];
const STATUS_CONTA: readonly StatusConta[] = ["ATIVO", "PENDENTE", "BLOQUEADO"];

/** Direção que faz sentido ao escolher cada ordenação (nome de A a Z; o resto do maior para o menor). */
export function direcaoPadrao(ordenar: OrdenacaoParticipantes): Direcao {
  return ordenar === "nome" ? "asc" : "desc";
}

function paginaValida(valor: string | null): number {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= 1 ? numero : 1;
}

/** Só a leitura dos parâmetros da URL (serve para URLSearchParams e para o useSearchParams do Next). */
type ParametrosUrl = Pick<URLSearchParams, "get">;

/**
 * Lê (e valida) os filtros da lista de participantes a partir da URL. A busca por texto não vem da URL (pode ter
 * nome, e-mail ou telefone e ficaria no histórico do navegador): ela é estado da tela (ver `useFiltrosNaUrl`).
 */
export function lerFiltrosParticipantes(params: ParametrosUrl): FiltrosParticipantes {
  const ordenarBruto = params.get("ordenar") as OrdenacaoParticipantes | null;
  const ordenar = ordenarBruto && ORDENACOES.includes(ordenarBruto) ? ordenarBruto : "cadastro";
  const direcaoBruta = params.get("direcao");
  const statusBruto = (params.get("status") ?? "").toUpperCase() as StatusConta;
  const ufBruta = (params.get("uf") ?? "").toUpperCase();
  return {
    busca: "",
    uf: (UFS_BRASIL as readonly string[]).includes(ufBruta) ? ufBruta : "",
    status: STATUS_CONTA.includes(statusBruto) ? statusBruto : "",
    ordenar,
    direcao: direcaoBruta === "asc" || direcaoBruta === "desc" ? direcaoBruta : direcaoPadrao(ordenar),
    pagina: paginaValida(params.get("pagina")),
  };
}

/** Parâmetros da tela na URL — só os que fogem do padrão, para a URL ficar curta. Sem a busca por texto. */
export function parametrosParticipantes(
  filtros: FiltrosParticipantes,
  { comPaginacao = true }: { comPaginacao?: boolean } = {},
): URLSearchParams {
  const p = new URLSearchParams();
  if (filtros.uf) p.set("uf", filtros.uf);
  if (filtros.status) p.set("status", filtros.status);
  if (filtros.ordenar !== "cadastro") p.set("ordenar", filtros.ordenar);
  if (filtros.direcao !== direcaoPadrao(filtros.ordenar)) p.set("direcao", filtros.direcao);
  if (comPaginacao && filtros.pagina > 1) p.set("pagina", String(filtros.pagina));
  return p;
}

/** Parâmetros da API (lista e CSV): os da tela, sem a página, mais a busca (endereço da API não fica no histórico). */
function parametrosApiParticipantes(filtros: FiltrosParticipantes): URLSearchParams {
  const p = parametrosParticipantes(filtros, { comPaginacao: false });
  if (filtros.busca) p.set("busca", filtros.busca);
  return p;
}

export interface FiltrosAuditoria {
  acao: string;
  usuarioId: string;
  busca: string;
  de: string;
  ate: string;
  pagina: number;
}

export const POR_PAGINA_AUDITORIA = 25;

/** "AAAA-MM-DD" de um dia que existe (só o formato aceitaria 31/02). */
function dataIsoValida(valor: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor) && isValid(parseISO(valor));
}

/**
 * Datas (opcionais) do filtro da auditoria. A API só confere o formato e a ordem — aqui não há limite
 * de dias, ao contrário do período da visão geral. null = tudo certo.
 */
export function erroDoFiltroDeDatas(de: string, ate: string): string | null {
  if ((de && !dataIsoValida(de)) || (ate && !dataIsoValida(ate))) return "Data inválida: confira o dia, o mês e o ano.";
  if (de && ate && de > ate) return "A data inicial precisa ser antes da data final.";
  return null;
}

/** Lê (e valida) os filtros da auditoria a partir da URL, com as mesmas regras da API. A busca não vem da URL. */
export function lerFiltrosAuditoria(params: ParametrosUrl): FiltrosAuditoria {
  const acao = (params.get("acao") ?? "").trim().toUpperCase();
  const usuarioId = (params.get("usuarioId") ?? "").trim();
  let de = params.get("de") ?? "";
  let ate = params.get("ate") ?? "";
  if (!dataIsoValida(de)) de = "";
  if (!dataIsoValida(ate)) ate = "";
  // Link com as datas invertidas: vale o mesmo intervalo (a API recusaria com 400)
  if (de && ate && de > ate) [de, ate] = [ate, de];
  return {
    acao: /^[A-Z0-9_]{1,100}$/.test(acao) ? acao : "",
    usuarioId: PARECE_ID.test(usuarioId) ? usuarioId : "",
    busca: "",
    de,
    ate,
    pagina: paginaValida(params.get("pagina")),
  };
}

/** Parâmetros da tela na URL. Sem a busca por texto (ela vai só no endereço da API). */
export function parametrosAuditoria(filtros: FiltrosAuditoria): URLSearchParams {
  const p = new URLSearchParams();
  if (filtros.acao) p.set("acao", filtros.acao);
  if (filtros.usuarioId) p.set("usuarioId", filtros.usuarioId);
  if (filtros.de) p.set("de", filtros.de);
  if (filtros.ate) p.set("ate", filtros.ate);
  if (filtros.pagina > 1) p.set("pagina", String(filtros.pagina));
  return p;
}

/** Junta "?a=1&b=2" (ou "" quando não há parâmetros). */
export function comoQuery(params: URLSearchParams): string {
  const texto = params.toString();
  return texto ? `?${texto}` : "";
}

// ───────────────────────────── Links das telas ─────────────────────────────

const seg = encodeURIComponent;

export const rotasAdmin = {
  inicio: "/dashboard/admin",
  participantes: "/dashboard/admin/participantes",
  auditoria: "/dashboard/admin/auditoria",
  ficha: (id: string) => `/dashboard/admin/participantes/${seg(id)}`,
  curriculo: (id: string, curriculoId: string) =>
    `/dashboard/admin/participantes/${seg(id)}/curriculos/${seg(curriculoId)}`,
  conversa: (id: string, sessaoId: string) => `/dashboard/admin/participantes/${seg(id)}/simulacoes/${seg(sessaoId)}`,
  auditoriaDe: (usuarioId: string) => `/dashboard/admin/auditoria?usuarioId=${seg(usuarioId)}`,
};

/** Endereços da API (passam pelo fetchApi, que já põe o prefixo do proxy). */
export const apiAdmin = {
  resumo: (de: string, ate: string) => `/admin/resumo${comoQuery(new URLSearchParams({ de, ate }))}`,
  participantes: (filtros: FiltrosParticipantes) => {
    const p = parametrosApiParticipantes(filtros);
    p.set("pagina", String(filtros.pagina));
    p.set("limite", String(POR_PAGINA_PARTICIPANTES));
    return `/admin/participantes?${p.toString()}`;
  },
  participante: (id: string) => `/admin/participantes/${seg(id)}`,
  curriculo: (id: string, curriculoId: string) => `/admin/participantes/${seg(id)}/curriculos/${seg(curriculoId)}`,
  conversa: (id: string, sessaoId: string) => `/admin/participantes/${seg(id)}/simulacoes/${seg(sessaoId)}`,
  auditoria: (filtros: FiltrosAuditoria) => {
    const p = parametrosAuditoria(filtros);
    if (filtros.busca) p.set("busca", filtros.busca);
    p.set("pagina", String(filtros.pagina));
    p.set("limite", String(POR_PAGINA_AUDITORIA));
    return `/admin/auditoria?${p.toString()}`;
  },
  acoesAuditoria: "/admin/auditoria/acoes",
  /** Planilhas: links diretos pelo proxy (o navegador baixa o arquivo). */
  csvUso: (de: string, ate: string) => `/admin/exportar/uso.csv${comoQuery(new URLSearchParams({ de, ate }))}`,
  csvParticipantes: (filtros: FiltrosParticipantes) =>
    `/admin/exportar/participantes.csv${comoQuery(parametrosApiParticipantes(filtros))}`,
};

/**
 * Últimos filtros da lista de participantes (só em memória, nesta aba): o "voltar" da ficha leva de volta à mesma
 * página e aos mesmos filtros. A busca por texto não entra aqui nem na URL (pode ter nome ou telefone): ela volta
 * pela memória do `useFiltrosNaUrl` quando a lista reabre com os mesmos filtros.
 */
let ultimaBuscaParticipantes = "";

export function lembrarBuscaParticipantes(query: string) {
  ultimaBuscaParticipantes = query;
}

export function hrefVoltarParticipantes(): string {
  return `${rotasAdmin.participantes}${ultimaBuscaParticipantes}`;
}
