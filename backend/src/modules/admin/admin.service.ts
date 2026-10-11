import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AutorMensagem,
  Prisma,
  StatusConta,
  StatusSessaoEntrevista,
  TipoMensagem,
  TipoUsuario,
} from '@prisma/client';
import type { MetaRequisicao } from '../../common/decorators/auth.decorators';
import { Paginado, paginar, skipTake } from '../../common/dto/paginacao.dto';
import { semUndefined } from '../../common/utils';
import { formatarTelefone } from '../../common/validators/telefone';
import { AuditoriaService } from '../../infra/auditoria.service';
import { PrismaService } from '../../infra/prisma.service';
import { cargoDesejadoDe } from '../curriculos/curriculo-conteudo';
import {
  CurriculoDetalhe,
  CurriculoResumo,
  CurriculosService,
} from '../curriculos/curriculos.service';
import { ehObjeto } from '../entrevistas/normalizacao';
import {
  arredondarNota,
  Classificacao,
  CLASSIFICACOES,
  normalizarNota,
  RelatorioEntrevista,
  RelatorioLegado,
  relatorioParaExibicao,
} from '../entrevistas/relatorio-entrevista';
import {
  ACENTOS,
  classificacaoDe,
  diaEmSaoPaulo,
  formatarDataHora,
  formatarDia,
  FUSO_HORARIO,
  intervaloDeDatas,
  mascararIp,
  mascararTelefone,
  maisRecente,
  padraoBusca,
  paraCsv,
  Periodo,
  rotuloAcao,
  sanitizarDetalhes,
  SEM_ACENTOS,
  semanasEntre,
  validarPeriodo,
} from './admin-utils';
import {
  ListarAuditoriaDto,
  ListarParticipantesDto,
  OrdenacaoParticipantes,
  PeriodoQueryDto,
} from './admin.dto';

// ───────────────────────────── Respostas ─────────────────────────────

export interface SemanaUso {
  /** Segunda-feira da semana (AAAA-MM-DD, fuso de São Paulo). */
  semana: string;
  cadastros: number;
  curriculos: number;
  simulacoes: number;
  relatorios: number;
}

export interface ResumoUso {
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
    falhasIa: number;
    participantesComCurriculo: number;
  };
  simulacoes: {
    iniciadasNoPeriodo: number;
    emAndamento: number;
    finalizadas: number;
    analisadas: number;
    canceladas: number;
    notaMedia: number | null;
    participantesQueTreinaram: number;
  };
  classificacoes: Record<Classificacao, number>;
  funil: { cadastrados: number; comCurriculo: number; comSimulacao: number; comRelatorio: number };
  semanas: SemanaUso[];
}

export interface ParticipanteResumo {
  id: string;
  nome: string;
  email: string;
  telefoneMascarado: string;
  cidade: string | null;
  uf: string | null;
  statusConta: StatusConta;
  criadoEm: Date;
  ultimoAcessoEm: Date | null;
  curriculos: number;
  simulacoes: number;
  relatorios: number;
  ultimaNota: number | null;
}

export interface AtividadeParticipante {
  acao: string;
  rotulo: string;
  criadoEm: Date;
  detalhes: Record<string, unknown> | null;
}

export interface SimulacaoResumo {
  sessaoId: string;
  status: StatusSessaoEntrevista;
  cargoAlvo: string | null;
  iniciadaEm: Date;
  finalizadaEm: Date | null;
  mensagens: number;
  entrevistaId: string | null;
  notaGeral: number | null;
  classificacao: Classificacao | null;
}

export interface ParticipanteDetalhe {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cidade: string | null;
  uf: string | null;
  escolaridade: string | null;
  statusConta: StatusConta;
  criadoEm: Date;
  ultimoAcessoEm: Date | null;
  consentimento: { versaoTermo: string; aceitoEm: Date } | null;
  curriculos: CurriculoResumo[];
  simulacoes: SimulacaoResumo[];
  /**
   * Relatórios antigos, de antes das conversas pelo WhatsApp (sem sessão): entram nos números e
   * na lista, mas não têm conversa para abrir.
   */
  relatoriosSemConversa: number;
  atividade: AtividadeParticipante[];
}

export interface ConversaSimulacao {
  sessaoId: string;
  status: StatusSessaoEntrevista;
  cargoAlvo: string | null;
  empresaAlvo: string | null;
  iniciadaEm: Date;
  finalizadaEm: Date | null;
  motivoFinalizacao: string | null;
  mensagens: Array<{ autor: AutorMensagem; tipo: TipoMensagem; conteudo: string; criadoEm: Date }>;
  entrevista: {
    id: string;
    notaGeral: number | null;
    dataRealizacao: Date;
    relatorio: RelatorioEntrevista | RelatorioLegado;
  } | null;
}

export interface RegistroAuditoriaAdmin {
  id: string;
  criadoEm: Date;
  acao: string;
  rotulo: string;
  usuario: { id: string; nome: string; email: string } | null;
  entidade: string | null;
  entidadeId: string | null;
  ipMascarado: string | null;
  detalhes: Record<string, unknown> | null;
}

export interface AcaoAuditoria {
  acao: string;
  rotulo: string;
  total: number;
}

export interface ArquivoCsv {
  nomeArquivo: string;
  conteudo: string;
}

export const MENSAGENS_ADMIN = {
  participanteNaoEncontrado: 'Participante não encontrado',
  simulacaoNaoEncontrada: 'Simulação não encontrada',
  origemExterna:
    'Por segurança, o painel do administrador só abre pelo próprio site (links vindos de outros sites são recusados).',
  buscaAmpla: 'A busca encontrou pessoas demais. Digite mais letras do nome ou do e-mail.',
} as const;

/** Itens de cada lista da ficha (os mais recentes). */
const LIMITE_LISTAS_FICHA = 100;
/** Últimos registros da auditoria do participante mostrados na ficha. */
const LIMITE_ATIVIDADE = 30;
/** Mensagens exibidas de uma simulação, em ordem cronológica. */
const LIMITE_MENSAGENS = 1000;
/** Dígitos mínimos na busca para procurar também no WhatsApp (evita casar com todo mundo). */
const MIN_DIGITOS_BUSCA = 4;
/** Busca com cara de telefone: só dígitos, espaços e `( ) + . -` (um e-mail ou nome com números não é). */
const PARECE_TELEFONE = /^[\d\s()+.-]+$/;
/** Pessoas que uma busca da auditoria pode encontrar (os ids vão como parâmetros da consulta). */
const MAX_PESSOAS_BUSCA = 5000;
const DIA_MS = 86_400_000;

const ROTULOS_STATUS: Record<StatusConta, string> = {
  ATIVO: 'Ativo',
  PENDENTE: 'Pendente',
  BLOQUEADO: 'Bloqueado',
};

const CABECALHO_PARTICIPANTES = [
  'Nome',
  'E-mail',
  'Telefone (mascarado)',
  'Cidade',
  'UF',
  'Status',
  'Cadastro',
  'Último acesso',
  'Currículos',
  'Simulações',
  'Relatórios',
  'Última nota',
];
const CABECALHO_USO = [
  'Semana (segunda-feira)',
  'Cadastros',
  'Currículos',
  'Simulações',
  'Relatórios',
];

// ───────────────────────────── SQL ─────────────────────────────
// Agregações em $queryRaw com template do Prisma: todo valor vira parâmetro ($1, $2...);
// só trechos fixos deste arquivo entram como texto do SQL.

/** Só participantes: contas ADMIN ficam fora das métricas e das listas. */
const SO_PARTICIPANTES = Prisma.sql`u.tipo_usuario <> 'ADMIN'`;

/** Instante do JS como `timestamp` sem fuso em UTC — o formato das colunas gravadas pelo Prisma. */
const instante = (d: Date) => Prisma.sql`(${d}::timestamptz AT TIME ZONE 'UTC')`;

/** `coluna` dentro do período [início, fim). */
const noPeriodo = (coluna: Prisma.Sql, p: Periodo) =>
  Prisma.sql`(${coluna} >= ${instante(p.inicio)} AND ${coluna} < ${instante(p.fim)})`;

/** Segunda-feira (AAAA-MM-DD) da semana de `coluna` no relógio de São Paulo. */
const semanaSP = (coluna: Prisma.Sql) =>
  Prisma.sql`to_char(date_trunc('week', ${coluna} AT TIME ZONE 'UTC' AT TIME ZONE ${FUSO_HORARIO}), 'YYYY-MM-DD')`;

const TEM_CURRICULO = Prisma.sql`EXISTS (SELECT 1 FROM curriculos_gerados c WHERE c.usuario_id = u.id)`;
const TEM_RELATORIO = Prisma.sql`EXISTS (SELECT 1 FROM entrevistas_bot e WHERE e.usuario_id = u.id)`;
/** Treinou: abriu uma simulação no WhatsApp ou tem relatório (registros antigos não têm sessão). */
const TEM_SIMULACAO = Prisma.sql`(EXISTS (SELECT 1 FROM sessoes_entrevista se WHERE se.usuario_id = u.id) OR ${TEM_RELATORIO})`;

/**
 * Nome ou e-mail (de `usuarios u`) contém a busca, sem diferenciar maiúsculas nem acentos
 * ("joao" encontra "João"). A mesma regra na lista de participantes e na auditoria.
 */
const nomeOuEmailContem = (busca: string) => {
  const padrao = padraoBusca(busca);
  return Prisma.sql`(lower(translate(u.nome_completo, ${ACENTOS}, ${SEM_ACENTOS})) LIKE ${padrao}
    OR lower(u.email) LIKE ${padrao})`;
};

const COLUNA_ORDENACAO: Record<OrdenacaoParticipantes, Prisma.Sql> = {
  cadastro: Prisma.sql`u.criado_em`,
  ultimoAcesso: Prisma.sql`GREATEST(u.ultimo_login_em, s.ultima)`,
  nome: Prisma.sql`lower(u.nome_completo)`,
  ultimaNota: Prisma.sql`e.ultima_nota`,
};

interface LinhaContas {
  total: number;
  bloqueados: number;
  ativos7d: number;
  ativos30d: number;
  comCurriculo: number;
  treinaram: number;
  cadastrados: number;
  cadastradosComCurriculo: number;
  cadastradosComSimulacao: number;
  cadastradosComRelatorio: number;
}

interface LinhaCurriculos {
  gerados: number;
  comIa: number;
  refinadosPorIa: number;
  comAudio: number;
  comCurriculoAntigo: number;
  falhasIa: number;
}

interface LinhaSimulacoes {
  iniciadas: number;
  emAndamento: number;
  finalizadas: number;
  analisadas: number;
  canceladas: number;
}

interface LinhaRelatorio {
  notaGeral: number | null;
  classificacao: string | null;
}

type TipoSemana = Exclude<keyof SemanaUso, 'semana'>;
const TIPOS_SEMANA: readonly TipoSemana[] = ['cadastros', 'curriculos', 'simulacoes', 'relatorios'];

interface LinhaSemana {
  semana: string;
  tipo: string;
  total: number;
}

interface LinhaParticipante {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cidade: string | null;
  uf: string | null;
  statusConta: StatusConta;
  criadoEm: Date;
  ultimoAcessoEm: Date | null;
  curriculos: number;
  simulacoes: number;
  relatorios: number;
  ultimaNota: number | null;
}

type RecursoVisualizado = 'ficha' | 'curriculo' | 'conversa';

/** Painel do administrador: números de uso, participantes (com acesso auditado) e auditoria. */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
    private readonly curriculos: CurriculosService,
  ) {}

  // ───────────────────────────── Visão geral ─────────────────────────────

  /**
   * Números de uso do período (datas no fuso de São Paulo). `participantes.total`,
   * `bloqueados`, os ativos (janelas móveis de 7 e 30 dias até agora) e os participantes com
   * currículo/que treinaram são do momento; o resto conta só o que aconteceu no período.
   * O funil acompanha quem se cadastrou no período.
   */
  async resumo(q: PeriodoQueryDto): Promise<ResumoUso> {
    const periodo = validarPeriodo(q.de, q.ate);
    const agora = Date.now();
    const cadastradoNoPeriodo = noPeriodo(Prisma.sql`u.criado_em`, periodo);
    // Ativo = fez login ou falou com a Helena (última mensagem da simulação) na janela
    const ultimaAtividade = Prisma.sql`GREATEST(u.ultimo_login_em, s.ultima)`;

    const [[contas], [curriculos], [simulacoes], relatorios, semanas] = await Promise.all([
      this.prisma.$queryRaw<LinhaContas[]>(Prisma.sql`
          SELECT
            count(*)::int AS total,
            count(*) FILTER (WHERE u.status_conta = 'BLOQUEADO')::int AS bloqueados,
            count(*) FILTER (WHERE ${ultimaAtividade} >= ${instante(new Date(agora - 7 * DIA_MS))})::int AS "ativos7d",
            count(*) FILTER (WHERE ${ultimaAtividade} >= ${instante(new Date(agora - 30 * DIA_MS))})::int AS "ativos30d",
            count(*) FILTER (WHERE ${TEM_CURRICULO})::int AS "comCurriculo",
            count(*) FILTER (WHERE ${TEM_SIMULACAO})::int AS treinaram,
            count(*) FILTER (WHERE ${cadastradoNoPeriodo})::int AS cadastrados,
            count(*) FILTER (WHERE ${cadastradoNoPeriodo} AND ${TEM_CURRICULO})::int AS "cadastradosComCurriculo",
            count(*) FILTER (WHERE ${cadastradoNoPeriodo} AND ${TEM_SIMULACAO})::int AS "cadastradosComSimulacao",
            count(*) FILTER (WHERE ${cadastradoNoPeriodo} AND ${TEM_RELATORIO})::int AS "cadastradosComRelatorio"
          FROM usuarios u
          LEFT JOIN (
            SELECT usuario_id, max(ultima_mensagem_em) AS ultima
            FROM sessoes_entrevista GROUP BY usuario_id
          ) s ON s.usuario_id = u.id
          WHERE ${SO_PARTICIPANTES}`),
      // Currículos do período e o uso da IA, lido dos `detalhes` da auditoria CURRICULO_GERADO de
      // cada um (campo ausente ou currículo antigo sem registro = false). Todos os contadores
      // saem da mesma base — "com IA" nunca passa de "gerados" (currículo ou conta excluídos
      // saem dos dois). O log é gravado logo depois do currículo: a folga de um dia antes do
      // início só limita a varredura da auditoria.
      this.prisma.$queryRaw<LinhaCurriculos[]>(Prisma.sql`
          SELECT
            count(*)::int AS gerados,
            count(*) FILTER (WHERE l.detalhes->>'usouIa' = 'true')::int AS "comIa",
            count(*) FILTER (WHERE l.detalhes->>'refinadoPorIa' = 'true')::int AS "refinadosPorIa",
            count(*) FILTER (WHERE l.detalhes->>'comAudio' = 'true')::int AS "comAudio",
            count(*) FILTER (WHERE l.detalhes->>'comCurriculoAntigo' = 'true')::int AS "comCurriculoAntigo",
            count(*) FILTER (
              WHERE l.detalhes->>'usouIa' = 'true'
                AND (l.detalhes->>'refinadoPorIa') IS DISTINCT FROM 'true'
            )::int AS "falhasIa"
          FROM curriculos_gerados c
          JOIN usuarios u ON u.id = c.usuario_id
          LEFT JOIN (
            SELECT DISTINCT ON (entidade_id) entidade_id, detalhes
            FROM logs_auditoria
            WHERE acao = 'CURRICULO_GERADO'
              AND criado_em >= ${instante(new Date(periodo.inicio.getTime() - DIA_MS))}
            ORDER BY entidade_id, criado_em
          ) l ON l.entidade_id = c.id::text
          WHERE ${SO_PARTICIPANTES} AND ${noPeriodo(Prisma.sql`c.gerado_em`, periodo)}`),
      // Situação atual das simulações iniciadas no período
      this.prisma.$queryRaw<LinhaSimulacoes[]>(Prisma.sql`
          SELECT
            count(*)::int AS iniciadas,
            count(*) FILTER (WHERE se.status = 'EM_ANDAMENTO')::int AS "emAndamento",
            count(*) FILTER (WHERE se.status = 'FINALIZADA')::int AS finalizadas,
            count(*) FILTER (WHERE se.status = 'ANALISADA')::int AS analisadas,
            count(*) FILTER (WHERE se.status = 'CANCELADA')::int AS canceladas
          FROM sessoes_entrevista se JOIN usuarios u ON u.id = se.usuario_id
          WHERE ${SO_PARTICIPANTES} AND ${noPeriodo(Prisma.sql`se.iniciada_em`, periodo)}`),
      // Relatórios do período: só a nota e a classificação (o relatório já é gravado normalizado)
      this.prisma.$queryRaw<LinhaRelatorio[]>(Prisma.sql`
          SELECT e.nota_geral AS "notaGeral", e.relatorio->>'classificacao' AS classificacao
          FROM entrevistas_bot e JOIN usuarios u ON u.id = e.usuario_id
          WHERE ${SO_PARTICIPANTES} AND ${noPeriodo(Prisma.sql`e.data_realizacao`, periodo)}`),
      this.semanas(periodo),
    ]);

    const classificacoes = Object.fromEntries(CLASSIFICACOES.map((c) => [c, 0])) as Record<
      Classificacao,
      number
    >;
    const notas: number[] = [];
    for (const r of relatorios) {
      const nota = normalizarNota(r.notaGeral);
      if (nota !== null) notas.push(nota);
      const classificacao = classificacaoDe(r.classificacao, nota);
      if (classificacao) classificacoes[classificacao] += 1;
    }

    return {
      periodo: { de: periodo.de, ate: periodo.ate },
      participantes: {
        total: contas.total,
        novosNoPeriodo: contas.cadastrados,
        ativos7d: contas.ativos7d,
        ativos30d: contas.ativos30d,
        bloqueados: contas.bloqueados,
      },
      curriculos: {
        geradosNoPeriodo: curriculos.gerados,
        comIa: curriculos.comIa,
        refinadosPorIa: curriculos.refinadosPorIa,
        comAudio: curriculos.comAudio,
        comCurriculoAntigo: curriculos.comCurriculoAntigo,
        falhasIa: curriculos.falhasIa,
        participantesComCurriculo: contas.comCurriculo,
      },
      simulacoes: {
        iniciadasNoPeriodo: simulacoes.iniciadas,
        emAndamento: simulacoes.emAndamento,
        finalizadas: simulacoes.finalizadas,
        analisadas: simulacoes.analisadas,
        canceladas: simulacoes.canceladas,
        notaMedia: notas.length
          ? arredondarNota(notas.reduce((a, b) => a + b, 0) / notas.length)
          : null,
        participantesQueTreinaram: contas.treinaram,
      },
      classificacoes,
      funil: {
        cadastrados: contas.cadastrados,
        comCurriculo: contas.cadastradosComCurriculo,
        comSimulacao: contas.cadastradosComSimulacao,
        comRelatorio: contas.cadastradosComRelatorio,
      },
      semanas,
    };
  }

  /** Cadastros, currículos, simulações e relatórios por semana do período, sem buracos. */
  private async semanas(periodo: Periodo): Promise<SemanaUso[]> {
    const doTipo = (tipo: TipoSemana, coluna: Prisma.Sql, origem: Prisma.Sql) => Prisma.sql`
      SELECT ${tipo}::text AS tipo, ${semanaSP(coluna)} AS semana
      FROM ${origem}
      WHERE ${SO_PARTICIPANTES} AND ${noPeriodo(coluna, periodo)}`;

    const linhas = await this.prisma.$queryRaw<LinhaSemana[]>(Prisma.sql`
      SELECT t.semana, t.tipo, count(*)::int AS total
      FROM (
        ${doTipo('cadastros', Prisma.sql`u.criado_em`, Prisma.sql`usuarios u`)}
        UNION ALL
        ${doTipo('curriculos', Prisma.sql`c.gerado_em`, Prisma.sql`curriculos_gerados c JOIN usuarios u ON u.id = c.usuario_id`)}
        UNION ALL
        ${doTipo('simulacoes', Prisma.sql`se.iniciada_em`, Prisma.sql`sessoes_entrevista se JOIN usuarios u ON u.id = se.usuario_id`)}
        UNION ALL
        ${doTipo('relatorios', Prisma.sql`e.data_realizacao`, Prisma.sql`entrevistas_bot e JOIN usuarios u ON u.id = e.usuario_id`)}
      ) t
      GROUP BY t.semana, t.tipo`);

    const semanas = new Map<string, SemanaUso>(
      semanasEntre(periodo.de, periodo.ate).map((semana) => [
        semana,
        { semana, cadastros: 0, curriculos: 0, simulacoes: 0, relatorios: 0 },
      ]),
    );
    for (const l of linhas) {
      const semana = semanas.get(l.semana);
      const tipo = TIPOS_SEMANA.find((t) => t === l.tipo);
      if (semana && tipo) semana[tipo] += l.total;
    }
    return [...semanas.values()];
  }

  // ───────────────────────────── Participantes ─────────────────────────────

  async listarParticipantes(q: ListarParticipantesDto): Promise<Paginado<ParticipanteResumo>> {
    const filtro = this.filtroParticipantes(q);
    const [linhas, [{ total }]] = await Promise.all([
      this.consultarParticipantes(q, skipTake(q)),
      this.prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
        SELECT count(*)::int AS total
        FROM usuarios u LEFT JOIN perfis p ON p.usuario_id = u.id
        WHERE ${filtro}`),
    ]);
    return paginar(linhas.map(paraParticipanteResumo), total, q);
  }

  /** Filtros da lista (status, UF e busca por nome, e-mail ou dígitos do WhatsApp). */
  private filtroParticipantes(f: ListarParticipantesDto): Prisma.Sql {
    const condicoes = [SO_PARTICIPANTES];
    if (f.status) condicoes.push(Prisma.sql`u.status_conta::text = ${f.status}`);
    if (f.uf) condicoes.push(Prisma.sql`upper(p.uf) = ${f.uf}`);
    if (f.busca) {
      const porTexto = nomeOuEmailContem(f.busca);
      // WhatsApp só quando a busca tem cara de telefone: "ana2024@gmail.com" não procura "2024"
      const digitos = f.busca.replace(/\D/g, '');
      condicoes.push(
        PARECE_TELEFONE.test(f.busca) && digitos.length >= MIN_DIGITOS_BUSCA
          ? Prisma.sql`(${porTexto} OR u.telefone LIKE ${`%${digitos}%`})`
          : porTexto,
      );
    }
    return Prisma.join(condicoes, ' AND ');
  }

  /** Participantes com os contadores; sem `pagina`, todos os que passam no filtro (CSV). */
  private consultarParticipantes(
    f: ListarParticipantesDto,
    pagina?: { skip: number; take: number },
  ): Promise<LinhaParticipante[]> {
    const ordenar = f.ordenar ?? 'cadastro';
    const crescente = (f.direcao ?? (ordenar === 'nome' ? 'asc' : 'desc')) === 'asc';
    return this.prisma.$queryRaw<LinhaParticipante[]>(Prisma.sql`
      SELECT
        u.id, u.nome_completo AS nome, u.email, u.telefone, p.cidade, p.uf,
        u.status_conta::text AS "statusConta", u.criado_em AS "criadoEm",
        GREATEST(u.ultimo_login_em, s.ultima) AS "ultimoAcessoEm",
        c.total::int AS curriculos, s.total::int AS simulacoes, e.total::int AS relatorios,
        e.ultima_nota AS "ultimaNota"
      FROM usuarios u
      LEFT JOIN perfis p ON p.usuario_id = u.id
      LEFT JOIN LATERAL (
        SELECT count(*) AS total FROM curriculos_gerados WHERE usuario_id = u.id
      ) c ON true
      LEFT JOIN LATERAL (
        SELECT count(*) AS total, max(ultima_mensagem_em) AS ultima
        FROM sessoes_entrevista WHERE usuario_id = u.id
      ) s ON true
      LEFT JOIN LATERAL (
        SELECT count(*) AS total,
          (array_agg(nota_geral ORDER BY data_realizacao DESC, criado_em DESC)
            FILTER (WHERE nota_geral IS NOT NULL))[1] AS ultima_nota
        FROM entrevistas_bot WHERE usuario_id = u.id
      ) e ON true
      WHERE ${this.filtroParticipantes(f)}
      ORDER BY ${COLUNA_ORDENACAO[ordenar]} ${crescente ? Prisma.sql`ASC` : Prisma.sql`DESC`} NULLS LAST, u.id
      ${pagina ? Prisma.sql`LIMIT ${pagina.take} OFFSET ${pagina.skip}` : Prisma.empty}`);
  }

  /** Ficha do participante (registra o acesso na auditoria). 404 se não existir ou for ADMIN. */
  async obterParticipante(
    adminId: string,
    id: string,
    meta: MetaRequisicao = {},
  ): Promise<ParticipanteDetalhe> {
    const u = await this.prisma.usuario.findFirst({
      where: { id, tipoUsuario: { not: TipoUsuario.ADMIN } },
      select: {
        id: true,
        nomeCompleto: true,
        email: true,
        telefone: true,
        statusConta: true,
        criadoEm: true,
        ultimoLoginEm: true,
        perfil: { select: { cidade: true, uf: true, nivelEscolaridade: true } },
        consentimentos: {
          orderBy: { aceitoEm: 'desc' },
          take: 1,
          select: { versaoTermo: true, aceitoEm: true },
        },
        curriculosGerados: {
          orderBy: [{ geradoEm: 'desc' }, { id: 'desc' }],
          take: LIMITE_LISTAS_FICHA,
          select: {
            id: true,
            titulo: true,
            refinadoPorIa: true,
            geradoEm: true,
            atualizadoEm: true,
            conteudo: true,
          },
        },
        sessoesEntrevista: {
          orderBy: { iniciadaEm: 'desc' },
          take: LIMITE_LISTAS_FICHA,
          select: {
            id: true,
            status: true,
            cargoAlvo: true,
            iniciadaEm: true,
            finalizadaEm: true,
            ultimaMensagemEm: true,
            _count: { select: { mensagens: true } },
            entrevistas: {
              orderBy: { criadoEm: 'asc' },
              take: 1,
              select: { id: true, notaGeral: true, relatorio: true },
            },
          },
        },
        // Relatórios antigos, sem sessão (a lista e a visão geral também os contam)
        _count: { select: { entrevistas: { where: { sessaoId: null } } } },
        // Sem IP: a ficha mostra o que a pessoa fez, não de onde
        logsAuditoria: {
          orderBy: { criadoEm: 'desc' },
          take: LIMITE_ATIVIDADE,
          select: { acao: true, criadoEm: true, detalhes: true },
        },
      },
    });
    if (!u) throw new NotFoundException(MENSAGENS_ADMIN.participanteNaoEncontrado);

    const [consentimento] = u.consentimentos;
    const detalhe: ParticipanteDetalhe = {
      id: u.id,
      nome: u.nomeCompleto,
      email: u.email,
      telefone: formatarTelefone(u.telefone),
      cidade: u.perfil?.cidade ?? null,
      uf: u.perfil?.uf?.trim() || null,
      escolaridade: u.perfil?.nivelEscolaridade ?? null,
      statusConta: u.statusConta,
      criadoEm: u.criadoEm,
      ultimoAcessoEm: maisRecente(
        u.ultimoLoginEm,
        ...u.sessoesEntrevista.map((s) => s.ultimaMensagemEm),
      ),
      consentimento: consentimento
        ? { versaoTermo: consentimento.versaoTermo, aceitoEm: consentimento.aceitoEm }
        : null,
      curriculos: u.curriculosGerados.map((c) => ({
        id: c.id,
        titulo: c.titulo,
        cargoDesejado: cargoDesejadoDe(c.conteudo),
        refinadoPorIa: c.refinadoPorIa,
        geradoEm: c.geradoEm,
        atualizadoEm: c.atualizadoEm,
      })),
      simulacoes: u.sessoesEntrevista.map((s) => {
        const [entrevista] = s.entrevistas;
        const nota = entrevista ? normalizarNota(entrevista.notaGeral) : null;
        const relatorio = entrevista?.relatorio;
        return {
          sessaoId: s.id,
          status: s.status,
          cargoAlvo: s.cargoAlvo,
          iniciadaEm: s.iniciadaEm,
          finalizadaEm: s.finalizadaEm,
          mensagens: s._count.mensagens,
          entrevistaId: entrevista?.id ?? null,
          notaGeral: nota,
          classificacao: entrevista
            ? classificacaoDe(ehObjeto(relatorio) ? relatorio.classificacao : undefined, nota)
            : null,
        };
      }),
      relatoriosSemConversa: u._count.entrevistas,
      atividade: u.logsAuditoria.map((l) => ({
        acao: l.acao,
        rotulo: rotuloAcao(l.acao),
        criadoEm: l.criadoEm,
        detalhes: sanitizarDetalhes(l.detalhes),
      })),
    };

    await this.registrarVisualizacao(adminId, meta, 'Usuario', id, id, 'ficha');
    return detalhe;
  }

  /** Currículo do participante, como o dono vê (identidade atual da conta). Acesso auditado. */
  async obterCurriculo(
    adminId: string,
    participanteId: string,
    curriculoId: string,
    meta: MetaRequisicao = {},
  ): Promise<CurriculoDetalhe> {
    await this.garantirParticipante(participanteId);
    // Mesmo caminho do dono: filtra pelo participante (currículo de outra pessoa → 404)
    const curriculo = await this.curriculos.obter(participanteId, curriculoId);
    await this.registrarVisualizacao(
      adminId,
      meta,
      'CurriculoGerado',
      curriculoId,
      participanteId,
      'curriculo',
    );
    return curriculo;
  }

  /** Conversa da simulação com a Helena e o relatório, se houver. Acesso auditado. */
  async obterSimulacao(
    adminId: string,
    participanteId: string,
    sessaoId: string,
    meta: MetaRequisicao = {},
  ): Promise<ConversaSimulacao> {
    await this.garantirParticipante(participanteId);
    const sessao = await this.prisma.sessaoEntrevista.findFirst({
      where: { id: sessaoId, usuarioId: participanteId },
      select: {
        id: true,
        status: true,
        cargoAlvo: true,
        empresaAlvo: true,
        iniciadaEm: true,
        finalizadaEm: true,
        motivoFinalizacao: true,
        mensagens: {
          orderBy: { criadoEm: 'asc' },
          take: LIMITE_MENSAGENS,
          select: { autor: true, tipo: true, conteudo: true, criadoEm: true },
        },
        entrevistas: {
          orderBy: { criadoEm: 'asc' },
          take: 1,
          select: {
            id: true,
            notaGeral: true,
            dataRealizacao: true,
            pontosFortes: true,
            pontosMelhoria: true,
            dicasComunicacao: true,
            relatorio: true,
          },
        },
      },
    });
    if (!sessao) throw new NotFoundException(MENSAGENS_ADMIN.simulacaoNaoEncontrada);

    const [entrevista] = sessao.entrevistas;
    let relatorio: ConversaSimulacao['entrevista'] = null;
    if (entrevista) {
      const exibicao = relatorioParaExibicao(entrevista);
      relatorio = {
        id: entrevista.id,
        notaGeral: normalizarNota(entrevista.notaGeral) ?? exibicao.notaGeral,
        dataRealizacao: entrevista.dataRealizacao,
        relatorio: exibicao,
      };
    }

    await this.registrarVisualizacao(
      adminId,
      meta,
      'SessaoEntrevista',
      sessaoId,
      participanteId,
      'conversa',
    );
    return {
      sessaoId: sessao.id,
      status: sessao.status,
      cargoAlvo: sessao.cargoAlvo,
      empresaAlvo: sessao.empresaAlvo,
      iniciadaEm: sessao.iniciadaEm,
      finalizadaEm: sessao.finalizadaEm,
      motivoFinalizacao: sessao.motivoFinalizacao,
      mensagens: sessao.mensagens,
      entrevista: relatorio,
    };
  }

  // ───────────────────────────── Auditoria ─────────────────────────────

  async listarAuditoria(q: ListarAuditoriaDto): Promise<Paginado<RegistroAuditoriaAdmin>> {
    const { inicio, fim } = intervaloDeDatas(q.de, q.ate);
    // O ILIKE do Prisma não ignora acentos: as pessoas da busca saem do SQL da lista de participantes
    const daBusca = q.busca ? await this.idsDaBusca(q.busca) : undefined;
    const where: Prisma.LogAuditoriaWhereInput = {
      ...(q.acao ? { acao: q.acao } : {}),
      ...(q.usuarioId ? { usuarioId: q.usuarioId } : {}),
      ...(daBusca ? { AND: [{ usuarioId: { in: daBusca } }] } : {}),
      ...(inicio || fim ? { criadoEm: semUndefined({ gte: inicio, lt: fim }) } : {}),
    };

    const [linhas, total] = await Promise.all([
      this.prisma.logAuditoria.findMany({
        where,
        orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          criadoEm: true,
          acao: true,
          entidade: true,
          entidadeId: true,
          ip: true,
          detalhes: true,
          usuario: { select: { id: true, nomeCompleto: true, email: true } },
        },
        ...skipTake(q),
      }),
      this.prisma.logAuditoria.count({ where }),
    ]);

    return paginar(
      linhas.map((l) => ({
        id: l.id,
        criadoEm: l.criadoEm,
        acao: l.acao,
        rotulo: rotuloAcao(l.acao),
        usuario: l.usuario
          ? { id: l.usuario.id, nome: l.usuario.nomeCompleto, email: l.usuario.email }
          : null,
        entidade: l.entidade,
        entidadeId: l.entidadeId,
        ipMascarado: mascararIp(l.ip),
        detalhes: sanitizarDetalhes(l.detalhes),
      })),
      total,
      q,
    );
  }

  /** Ações já registradas, com o total de cada uma (opções do filtro), em ordem alfabética. */
  async acoesAuditoria(): Promise<AcaoAuditoria[]> {
    const grupos = await this.prisma.logAuditoria.groupBy({
      by: ['acao'],
      _count: { _all: true },
    });
    return grupos
      .map((g) => ({ acao: g.acao, rotulo: rotuloAcao(g.acao), total: g._count._all }))
      .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
  }

  // ───────────────────────────── Planilhas ─────────────────────────────

  /** CSV com todos os participantes que passam nos filtros da lista (sem paginação). */
  async exportarParticipantes(
    adminId: string,
    filtros: ListarParticipantesDto,
    meta: MetaRequisicao = {},
  ): Promise<ArquivoCsv> {
    const participantes = (await this.consultarParticipantes(filtros)).map(paraParticipanteResumo);
    const conteudo = paraCsv(
      CABECALHO_PARTICIPANTES,
      participantes.map((p) => [
        p.nome,
        p.email,
        p.telefoneMascarado,
        p.cidade,
        p.uf,
        ROTULOS_STATUS[p.statusConta] ?? p.statusConta,
        formatarDataHora(p.criadoEm),
        formatarDataHora(p.ultimoAcessoEm),
        p.curriculos,
        p.simulacoes,
        p.relatorios,
        p.ultimaNota,
      ]),
    );

    await this.auditoria.registrarOuFalhar({
      usuarioId: adminId,
      acao: 'ADMIN_EXPORTOU',
      detalhes: {
        tipo: 'participantes',
        filtros: semUndefined({
          busca: filtros.busca,
          uf: filtros.uf,
          status: filtros.status,
          ordenar: filtros.ordenar,
          direcao: filtros.direcao,
        }),
        linhas: participantes.length,
      },
      ip: meta.ip,
    });
    return { nomeArquivo: `participantes-${diaEmSaoPaulo(new Date())}.csv`, conteudo };
  }

  /** CSV de uso: uma linha por semana do período (as mesmas colunas do gráfico). */
  async exportarUso(
    adminId: string,
    q: PeriodoQueryDto,
    meta: MetaRequisicao = {},
  ): Promise<ArquivoCsv> {
    const periodo = validarPeriodo(q.de, q.ate);
    const semanas = await this.semanas(periodo);
    const conteudo = paraCsv(
      CABECALHO_USO,
      semanas.map((s) => [
        formatarDia(s.semana),
        s.cadastros,
        s.curriculos,
        s.simulacoes,
        s.relatorios,
      ]),
    );

    await this.auditoria.registrarOuFalhar({
      usuarioId: adminId,
      acao: 'ADMIN_EXPORTOU',
      detalhes: { tipo: 'uso', filtros: { de: periodo.de, ate: periodo.ate } },
      ip: meta.ip,
    });
    return { nomeArquivo: `uso-${periodo.de}-a-${periodo.ate}.csv`, conteudo };
  }

  // ───────────────────────────── internos ─────────────────────────────

  /**
   * Ids das contas (participantes e administradores) cujo nome ou e-mail contém a busca, sem
   * diferenciar maiúsculas nem acentos. Mais de MAX_PESSOAS_BUSCA → 400 (peça mais letras).
   */
  private async idsDaBusca(busca: string): Promise<string[]> {
    const linhas = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT u.id FROM usuarios u
      WHERE ${nomeOuEmailContem(busca)}
      LIMIT ${MAX_PESSOAS_BUSCA + 1}`);
    if (linhas.length > MAX_PESSOAS_BUSCA) {
      throw new BadRequestException(MENSAGENS_ADMIN.buscaAmpla);
    }
    return linhas.map((l) => l.id);
  }

  /** 404 se o participante não existir (ou for uma conta ADMIN). */
  private async garantirParticipante(id: string): Promise<void> {
    const existe = await this.prisma.usuario.findFirst({
      where: { id, tipoUsuario: { not: TipoUsuario.ADMIN } },
      select: { id: true },
    });
    if (!existe) throw new NotFoundException(MENSAGENS_ADMIN.participanteNaoEncontrado);
  }

  /**
   * Quem viu, quando, de quem e o quê (LGPD). Só depois de o conteúdo ter sido encontrado; se o
   * registro falhar, o conteúdo não é entregue (o mesmo vale para as planilhas).
   */
  private registrarVisualizacao(
    adminId: string,
    meta: MetaRequisicao,
    entidade: 'Usuario' | 'CurriculoGerado' | 'SessaoEntrevista',
    entidadeId: string,
    participanteId: string,
    recurso: RecursoVisualizado,
  ): Promise<void> {
    return this.auditoria.registrarOuFalhar({
      usuarioId: adminId,
      acao: 'ADMIN_VISUALIZOU',
      entidade,
      entidadeId,
      detalhes: { participanteId, recurso },
      ip: meta.ip,
    });
  }
}

function paraParticipanteResumo(l: LinhaParticipante): ParticipanteResumo {
  return {
    id: l.id,
    nome: l.nome,
    email: l.email,
    telefoneMascarado: mascararTelefone(l.telefone),
    cidade: l.cidade,
    uf: l.uf?.trim() || null,
    statusConta: l.statusConta,
    criadoEm: l.criadoEm,
    ultimoAcessoEm: l.ultimoAcessoEm,
    curriculos: Number(l.curriculos),
    simulacoes: Number(l.simulacoes),
    relatorios: Number(l.relatorios),
    ultimaNota: l.ultimaNota === null ? null : normalizarNota(l.ultimaNota),
  };
}
