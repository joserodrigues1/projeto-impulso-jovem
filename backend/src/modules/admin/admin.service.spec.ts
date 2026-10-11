import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AuditoriaService } from '../../infra/auditoria.service';
import type { PrismaService } from '../../infra/prisma.service';
import { CurriculosService, MENSAGENS_CURRICULO } from '../curriculos/curriculos.service';
import { ACENTOS, padraoBusca, SEM_ACENTOS } from './admin-utils';
import type { ListarParticipantesDto } from './admin.dto';
import { AdminService, MENSAGENS_ADMIN } from './admin.service';

// Sem depender do .env local: só as variáveis usadas pelos módulos importados
jest.mock('../../config/env', () => ({
  env: { N8N_CURRICULO_TIMEOUT_MS: 1000 },
  isProducao: false,
}));

const ADMIN_ID = '9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d';
const PARTICIPANTE_ID = '7d0a3c55-1b2e-4f6a-8c9d-0e1f2a3b4c5d';
const CURRICULO_ID = '0b6f7c1e-3a1d-4c39-9a52-5d1f0f7e2a10';
const SESSAO_ID = '3f2b8c1e-5d4a-4f6b-9c7d-1e2f3a4b5c6d';
const ENTREVISTA_ID = '5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b';
const META = { ip: '177.37.10.20', userAgent: 'jest' };
const SO_PARTICIPANTES = "u.tipo_usuario <> 'ADMIN'";
const BOM = String.fromCharCode(0xfeff);

const data = (iso: string) => new Date(iso);

function criarPrismaMock() {
  return {
    $queryRaw: jest.fn(),
    usuario: { findFirst: jest.fn(), findUnique: jest.fn() },
    curriculoGerado: { findFirst: jest.fn() },
    sessaoEntrevista: { findFirst: jest.fn() },
    logAuditoria: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
    },
  };
}

function montar() {
  const prisma = criarPrismaMock();
  const auditoria = {
    registrar: jest.fn().mockResolvedValue(undefined),
    registrarOuFalhar: jest.fn().mockResolvedValue(undefined),
  };
  // O currículo é aberto pelo mesmo caminho do dono (CurriculosService.obter), sobre o mesmo mock
  const curriculos = new CurriculosService(
    prisma as unknown as PrismaService,
    auditoria as unknown as AuditoriaService,
  );
  const admin = new AdminService(
    prisma as unknown as PrismaService,
    auditoria as unknown as AuditoriaService,
    curriculos,
  );
  return { prisma, auditoria, admin };
}

/** Consultas `$queryRaw` feitas (texto com $1, $2... e os valores, que vão como parâmetros). */
const consultas = (prisma: ReturnType<typeof criarPrismaMock>) =>
  prisma.$queryRaw.mock.calls.map(([sql]: [Prisma.Sql]) => ({
    texto: sql.text,
    valores: sql.values,
  }));

const lista = (parcial: Partial<ListarParticipantesDto> = {}): ListarParticipantesDto => ({
  pagina: 1,
  limite: 12,
  ...parcial,
});

// ───────────────────────────── Visão geral ─────────────────────────────

describe('AdminService.resumo', () => {
  const contas = {
    total: 120,
    bloqueados: 1,
    ativos7d: 20,
    ativos30d: 51,
    comCurriculo: 60,
    treinaram: 19,
    cadastrados: 34,
    cadastradosComCurriculo: 20,
    cadastradosComSimulacao: 12,
    cadastradosComRelatorio: 9,
  };
  const curriculos = {
    gerados: 40,
    comIa: 35,
    refinadosPorIa: 33,
    comAudio: 12,
    comCurriculoAntigo: 9,
    falhasIa: 2,
  };
  const simulacoes = {
    iniciadas: 25,
    emAndamento: 2,
    finalizadas: 3,
    analisadas: 18,
    canceladas: 2,
  };

  /** Responde cada consulta pelo que ela calcula. */
  function responder(
    prisma: ReturnType<typeof criarPrismaMock>,
    relatorios: Array<{ notaGeral: number | null; classificacao: string | null }>,
    semanas: Array<{ semana: string; tipo: string; total: number }> = [],
  ) {
    prisma.$queryRaw.mockImplementation(({ text }: Prisma.Sql) => {
      if (text.includes('"ativos7d"')) return Promise.resolve([contas]);
      if (text.includes('"comIa"')) return Promise.resolve([curriculos]);
      if (text.includes('"emAndamento"')) return Promise.resolve([simulacoes]);
      if (text.includes('UNION ALL')) return Promise.resolve(semanas);
      if (text.includes('"notaGeral"')) return Promise.resolve(relatorios);
      return Promise.reject(new Error(`consulta inesperada: ${text}`));
    });
  }

  it('monta os números do período: média das notas, classificações e semanas sem buracos', async () => {
    const { prisma, admin } = montar();
    responder(
      prisma,
      [
        { notaGeral: 8.6, classificacao: 'DESTAQUE' },
        { notaGeral: 7, classificacao: 'PREPARADO' },
        { notaGeral: 5, classificacao: null }, // registro antigo: deriva da nota
        { notaGeral: null, classificacao: 'INICIANTE' }, // sem nota: fora da média
        { notaGeral: null, classificacao: 'invalida' },
      ],
      [
        { semana: '2026-09-14', tipo: 'cadastros', total: 5 },
        { semana: '2026-09-14', tipo: 'curriculos', total: 2 },
        { semana: '2026-10-05', tipo: 'relatorios', total: 3 },
        { semana: '2026-08-31', tipo: 'cadastros', total: 99 }, // fora do período
        { semana: '2026-09-21', tipo: 'outra_coisa', total: 7 },
      ],
    );

    const r = await admin.resumo({ de: '2026-09-11', ate: '2026-10-10' });

    expect(r).toEqual({
      periodo: { de: '2026-09-11', ate: '2026-10-10' },
      participantes: { total: 120, novosNoPeriodo: 34, ativos7d: 20, ativos30d: 51, bloqueados: 1 },
      curriculos: {
        geradosNoPeriodo: 40,
        comIa: 35,
        refinadosPorIa: 33,
        comAudio: 12,
        comCurriculoAntigo: 9,
        falhasIa: 2,
        participantesComCurriculo: 60,
      },
      simulacoes: {
        iniciadasNoPeriodo: 25,
        emAndamento: 2,
        finalizadas: 3,
        analisadas: 18,
        canceladas: 2,
        notaMedia: 6.9, // (8,6 + 7 + 5) / 3
        participantesQueTreinaram: 19,
      },
      classificacoes: { INICIANTE: 1, EM_DESENVOLVIMENTO: 1, PREPARADO: 1, DESTAQUE: 1 },
      funil: { cadastrados: 34, comCurriculo: 20, comSimulacao: 12, comRelatorio: 9 },
      semanas: [
        { semana: '2026-09-07', cadastros: 0, curriculos: 0, simulacoes: 0, relatorios: 0 },
        { semana: '2026-09-14', cadastros: 5, curriculos: 2, simulacoes: 0, relatorios: 0 },
        { semana: '2026-09-21', cadastros: 0, curriculos: 0, simulacoes: 0, relatorios: 0 },
        { semana: '2026-09-28', cadastros: 0, curriculos: 0, simulacoes: 0, relatorios: 0 },
        { semana: '2026-10-05', cadastros: 0, curriculos: 0, simulacoes: 0, relatorios: 3 },
      ],
    });
  });

  it('sem relatórios no período: nota média null e classificações zeradas', async () => {
    const { prisma, admin } = montar();
    responder(prisma, []);

    const r = await admin.resumo({ de: '2026-10-01', ate: '2026-10-10' });

    expect(r.simulacoes.notaMedia).toBeNull();
    expect(r.classificacoes).toEqual({
      INICIANTE: 0,
      EM_DESENVOLVIMENTO: 0,
      PREPARADO: 0,
      DESTAQUE: 0,
    });
    expect(r.semanas.map((s) => s.semana)).toEqual(['2026-09-28', '2026-10-05']);
  });

  it('todas as consultas deixam as contas ADMIN de fora', async () => {
    const { prisma, admin } = montar();
    responder(prisma, []);

    await admin.resumo({});

    const feitas = consultas(prisma);
    expect(feitas).toHaveLength(5);
    for (const { texto } of feitas) expect(texto).toContain(SO_PARTICIPANTES);
    // Gráfico semanal: cada uma das 4 séries filtra os participantes
    const semanal = feitas.find((c) => c.texto.includes('UNION ALL'));
    expect(semanal?.texto.split(SO_PARTICIPANTES)).toHaveLength(5);
  });

  it('datas e fuso vão como parâmetros (nada interpolado no SQL)', async () => {
    const { prisma, admin } = montar();
    responder(prisma, []);

    await admin.resumo({ de: '2026-09-11', ate: '2026-10-10' });

    for (const { texto } of consultas(prisma)) {
      expect(texto).not.toMatch(/2026|Sao_Paulo/);
    }
    const valores = consultas(prisma).flatMap((c) => c.valores);
    expect(valores).toContainEqual(data('2026-09-11T03:00:00Z')); // início (inclusivo)
    expect(valores).toContainEqual(data('2026-10-11T03:00:00Z')); // fim (exclusivo)
    expect(valores).toContain('America/Sao_Paulo');
  });

  it('currículos e uso da IA saem da mesma base (com IA nunca passa de gerados)', async () => {
    const { prisma, admin } = montar();
    responder(prisma, []);

    await admin.resumo({});

    const consulta = consultas(prisma).find((c) => c.texto.includes('"comIa"'));
    expect(consulta?.texto).toMatch(/FROM curriculos_gerados c/);
    expect(consulta?.texto).toMatch(/LEFT JOIN \([\s\S]*logs_auditoria[\s\S]*\) l ON/);
    expect(consulta?.texto).toContain("acao = 'CURRICULO_GERADO'");
  });

  it('período inválido → 400 sem consultar o banco', async () => {
    const { prisma, admin } = montar();
    await expect(admin.resumo({ de: '2026-10-10', ate: '2026-10-01' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(admin.resumo({ de: '2025-01-01', ate: '2026-10-01' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
});

// ───────────────────────────── Participantes ─────────────────────────────

const linhaParticipante = {
  id: PARTICIPANTE_ID,
  nome: 'Maria Souza',
  email: 'maria@exemplo.com',
  telefone: '5561999999999',
  cidade: 'Brasília',
  uf: 'DF',
  statusConta: 'ATIVO',
  criadoEm: data('2026-10-10T17:05:00Z'),
  ultimoAcessoEm: null,
  curriculos: 2,
  simulacoes: 1,
  relatorios: 1,
  ultimaNota: 7.25,
};

describe('AdminService.listarParticipantes', () => {
  function responder(prisma: ReturnType<typeof criarPrismaMock>, total = 1) {
    prisma.$queryRaw.mockImplementation(({ text }: Prisma.Sql) =>
      Promise.resolve(text.includes('LEFT JOIN LATERAL') ? [linhaParticipante] : [{ total }]),
    );
  }

  it('devolve a página com telefone mascarado, contadores e a última nota normalizada', async () => {
    const { prisma, admin } = montar();
    responder(prisma, 25);

    const r = await admin.listarParticipantes(lista({ pagina: 2, limite: 10 }));

    expect(r).toEqual({
      dados: [
        {
          id: PARTICIPANTE_ID,
          nome: 'Maria Souza',
          email: 'maria@exemplo.com',
          telefoneMascarado: '(61) 9••••-9999',
          cidade: 'Brasília',
          uf: 'DF',
          statusConta: 'ATIVO',
          criadoEm: linhaParticipante.criadoEm,
          ultimoAcessoEm: null,
          curriculos: 2,
          simulacoes: 1,
          relatorios: 1,
          ultimaNota: 7.3,
        },
      ],
      meta: { total: 25, pagina: 2, limite: 10, totalPaginas: 3 },
    });
    expect(JSON.stringify(r)).not.toContain('5561999999999');
    const [pagina] = consultas(prisma);
    expect(pagina.texto).toMatch(/LIMIT \$\d+ OFFSET \$\d+/);
    expect(pagina.valores.slice(-2)).toEqual([10, 10]); // take, skip
  });

  it('lista e total deixam as contas ADMIN de fora', async () => {
    const { prisma, admin } = montar();
    responder(prisma);

    await admin.listarParticipantes(lista({ uf: 'DF', status: 'BLOQUEADO' }));

    const feitas = consultas(prisma);
    expect(feitas).toHaveLength(2);
    for (const { texto, valores } of feitas) {
      expect(texto).toContain(SO_PARTICIPANTES);
      expect(texto).toContain('upper(p.uf) = $');
      expect(texto).toContain('u.status_conta::text = $');
      expect(valores).toEqual(expect.arrayContaining(['DF', 'BLOQUEADO']));
    }
  });

  it('a busca vai como parâmetro (sem acento, curingas escapados) e nunca entra no SQL', async () => {
    const { prisma, admin } = montar();
    responder(prisma);
    const busca = "Jo'ão%_; DROP TABLE usuarios;--";

    await admin.listarParticipantes(lista({ busca }));

    for (const { texto, valores } of consultas(prisma)) {
      expect(texto).not.toMatch(/DROP|Jo'ão/);
      expect(valores).toContain(padraoBusca(busca));
      expect(texto).toContain('lower(u.email) LIKE $');
      // Menos de 4 dígitos: não procura no WhatsApp
      expect(texto).not.toContain('u.telefone LIKE');
    }
  });

  it.each([
    ['(61) 9999', '%619999%'],
    ['+55 61 99999-9999', '%5561999999999%'],
    ['61.9999', '%619999%'],
  ])(
    'busca com cara de telefone (%s) procura também no WhatsApp (só os dígitos)',
    async (busca, esperado) => {
      const { prisma, admin } = montar();
      responder(prisma);

      await admin.listarParticipantes(lista({ busca }));

      for (const { texto, valores } of consultas(prisma)) {
        expect(texto).toContain('u.telefone LIKE $');
        expect(valores).toContain(esperado);
        // Continua procurando no nome e no e-mail
        expect(texto).toContain('lower(u.email) LIKE $');
      }
    },
  );

  it.each(['ana2024@gmail.com', 'Maria 2024', 'joao.silva1990'])(
    'e-mail ou nome com números (%s) não procura no WhatsApp',
    async (busca) => {
      const { prisma, admin } = montar();
      responder(prisma);

      await admin.listarParticipantes(lista({ busca }));

      for (const { texto, valores } of consultas(prisma)) {
        expect(texto).not.toContain('u.telefone LIKE');
        expect(valores).toContain(padraoBusca(busca));
        expect(valores).not.toEqual(expect.arrayContaining([expect.stringMatching(/^%\d+%$/)]));
      }
    },
  );

  it.each([
    [{}, 'u.criado_em DESC NULLS LAST'],
    [{ ordenar: 'nome' as const }, 'lower(u.nome_completo) ASC NULLS LAST'],
    [{ ordenar: 'nome' as const, direcao: 'desc' as const }, 'lower(u.nome_completo) DESC'],
    [{ ordenar: 'ultimoAcesso' as const }, 'GREATEST(u.ultimo_login_em, s.ultima) DESC'],
    [{ ordenar: 'ultimaNota' as const, direcao: 'asc' as const }, 'e.ultima_nota ASC NULLS LAST'],
  ])('ordenação %j → ORDER BY %s', async (filtro, esperado) => {
    const { prisma, admin } = montar();
    responder(prisma);

    await admin.listarParticipantes(lista(filtro));

    expect(consultas(prisma)[0].texto).toContain(`ORDER BY ${esperado}`);
  });
});

describe('AdminService.obterParticipante (ficha)', () => {
  const usuario = {
    id: PARTICIPANTE_ID,
    nomeCompleto: 'Maria Souza',
    email: 'maria@exemplo.com',
    telefone: '5561999999999',
    statusConta: 'ATIVO',
    criadoEm: data('2026-09-01T12:00:00Z'),
    ultimoLoginEm: data('2026-10-01T12:00:00Z'),
    perfil: { cidade: 'Brasília', uf: 'DF', nivelEscolaridade: 'Ensino médio' },
    consentimentos: [{ versaoTermo: '2026.1', aceitoEm: data('2026-09-01T12:00:00Z') }],
    curriculosGerados: [
      {
        id: CURRICULO_ID,
        titulo: 'Meu currículo',
        refinadoPorIa: true,
        geradoEm: data('2026-09-02T12:00:00Z'),
        atualizadoEm: data('2026-09-03T12:00:00Z'),
        conteudo: { versao: 2, cargoDesejado: 'Jovem Aprendiz', email: 'nao@vaza.com' },
      },
    ],
    sessoesEntrevista: [
      {
        id: SESSAO_ID,
        status: 'ANALISADA',
        cargoAlvo: 'Atendente',
        iniciadaEm: data('2026-10-05T11:00:00Z'),
        finalizadaEm: data('2026-10-05T11:30:00Z'),
        ultimaMensagemEm: data('2026-10-05T11:29:00Z'),
        _count: { mensagens: 12 },
        entrevistas: [
          { id: ENTREVISTA_ID, notaGeral: 7.24, relatorio: { classificacao: 'PREPARADO' } },
        ],
      },
      {
        id: 's-legada',
        status: 'ANALISADA',
        cargoAlvo: null,
        iniciadaEm: data('2026-09-20T11:00:00Z'),
        finalizadaEm: null,
        ultimaMensagemEm: data('2026-09-20T11:10:00Z'),
        _count: { mensagens: 6 },
        entrevistas: [{ id: 'e-legada', notaGeral: 3, relatorio: null }],
      },
      {
        id: 's-cancelada',
        status: 'CANCELADA',
        cargoAlvo: null,
        iniciadaEm: data('2026-09-10T11:00:00Z'),
        finalizadaEm: null,
        ultimaMensagemEm: data('2026-09-10T11:01:00Z'),
        _count: { mensagens: 2 },
        entrevistas: [],
      },
    ],
    // Um relatório antigo, de antes das conversas pelo WhatsApp (sem sessão)
    _count: { entrevistas: 1 },
    logsAuditoria: [
      { acao: 'LOGIN_SUCESSO', criadoEm: data('2026-10-01T12:00:00Z'), detalhes: null },
      {
        acao: 'CURRICULO_GERADO',
        criadoEm: data('2026-09-02T12:00:00Z'),
        detalhes: { usouIa: true, refinadoPorIa: true, ip: '177.37.10.20', texto: 'conteúdo' },
      },
      { acao: 'ACAO_NOVA', criadoEm: data('2026-09-01T12:00:00Z'), detalhes: { email: 'x@y.com' } },
    ],
  };

  it('procura só entre os participantes e monta a ficha sem conteúdo nem IP', async () => {
    const { prisma, admin } = montar();
    prisma.usuario.findFirst.mockResolvedValue(usuario);

    const r = await admin.obterParticipante(ADMIN_ID, PARTICIPANTE_ID, META);

    const consulta = prisma.usuario.findFirst.mock.calls[0][0];
    expect(consulta.where).toEqual({ id: PARTICIPANTE_ID, tipoUsuario: { not: 'ADMIN' } });
    expect(consulta.select.logsAuditoria.select).toEqual({
      acao: true,
      criadoEm: true,
      detalhes: true,
    });
    expect(consulta.select._count).toEqual({
      select: { entrevistas: { where: { sessaoId: null } } },
    });
    expect(r).toEqual({
      id: PARTICIPANTE_ID,
      nome: 'Maria Souza',
      email: 'maria@exemplo.com',
      telefone: '(61) 99999-9999',
      cidade: 'Brasília',
      uf: 'DF',
      escolaridade: 'Ensino médio',
      statusConta: 'ATIVO',
      criadoEm: usuario.criadoEm,
      // O mais recente entre o login e as mensagens das simulações
      ultimoAcessoEm: data('2026-10-05T11:29:00Z'),
      consentimento: { versaoTermo: '2026.1', aceitoEm: data('2026-09-01T12:00:00Z') },
      curriculos: [
        {
          id: CURRICULO_ID,
          titulo: 'Meu currículo',
          cargoDesejado: 'Jovem Aprendiz',
          refinadoPorIa: true,
          geradoEm: data('2026-09-02T12:00:00Z'),
          atualizadoEm: data('2026-09-03T12:00:00Z'),
        },
      ],
      simulacoes: [
        {
          sessaoId: SESSAO_ID,
          status: 'ANALISADA',
          cargoAlvo: 'Atendente',
          iniciadaEm: data('2026-10-05T11:00:00Z'),
          finalizadaEm: data('2026-10-05T11:30:00Z'),
          mensagens: 12,
          entrevistaId: ENTREVISTA_ID,
          notaGeral: 7.2,
          classificacao: 'PREPARADO',
        },
        expect.objectContaining({
          sessaoId: 's-legada',
          notaGeral: 3,
          classificacao: 'INICIANTE', // relatório antigo: deriva da nota
        }),
        expect.objectContaining({
          sessaoId: 's-cancelada',
          mensagens: 2,
          entrevistaId: null,
          notaGeral: null,
          classificacao: null,
        }),
      ],
      relatoriosSemConversa: 1,
      atividade: [
        {
          acao: 'LOGIN_SUCESSO',
          rotulo: 'Login',
          criadoEm: data('2026-10-01T12:00:00Z'),
          detalhes: null,
        },
        {
          acao: 'CURRICULO_GERADO',
          rotulo: 'Currículo gerado',
          criadoEm: data('2026-09-02T12:00:00Z'),
          detalhes: { usouIa: true, refinadoPorIa: true },
        },
        {
          acao: 'ACAO_NOVA',
          rotulo: 'ACAO_NOVA',
          criadoEm: data('2026-09-01T12:00:00Z'),
          detalhes: null,
        },
      ],
    });
    const json = JSON.stringify(r);
    for (const vazamento of ['nao@vaza.com', '177.37', 'conteúdo', 'x@y.com']) {
      expect(json).not.toContain(vazamento);
    }
  });

  it('só com relatório antigo (sem sessão): nenhuma simulação, mas o relatório é contado', async () => {
    const { prisma, admin } = montar();
    prisma.usuario.findFirst.mockResolvedValue({
      ...usuario,
      sessoesEntrevista: [],
      _count: { entrevistas: 2 },
    });

    const r = await admin.obterParticipante(ADMIN_ID, PARTICIPANTE_ID, META);

    expect(r.simulacoes).toEqual([]);
    expect(r.relatoriosSemConversa).toBe(2);
    // Sem mensagens à Helena, o último acesso é o login
    expect(r.ultimoAcessoEm).toEqual(usuario.ultimoLoginEm);
  });

  it('registra ADMIN_VISUALIZOU (ficha) com o admin, o participante e o IP', async () => {
    const { prisma, auditoria, admin } = montar();
    prisma.usuario.findFirst.mockResolvedValue(usuario);

    await admin.obterParticipante(ADMIN_ID, PARTICIPANTE_ID, META);

    expect(auditoria.registrarOuFalhar).toHaveBeenCalledTimes(1);
    expect(auditoria.registrarOuFalhar).toHaveBeenCalledWith({
      usuarioId: ADMIN_ID,
      acao: 'ADMIN_VISUALIZOU',
      entidade: 'Usuario',
      entidadeId: PARTICIPANTE_ID,
      detalhes: { participanteId: PARTICIPANTE_ID, recurso: 'ficha' },
      ip: META.ip,
    });
    expect(auditoria.registrar).not.toHaveBeenCalled();
  });

  it('inexistente ou conta ADMIN → 404, sem registro de acesso', async () => {
    const { prisma, auditoria, admin } = montar();
    prisma.usuario.findFirst.mockResolvedValue(null);

    const resultado = admin.obterParticipante(ADMIN_ID, PARTICIPANTE_ID, META);
    await expect(resultado).rejects.toBeInstanceOf(NotFoundException);
    await expect(resultado).rejects.toThrow(MENSAGENS_ADMIN.participanteNaoEncontrado);
    expect(auditoria.registrarOuFalhar).not.toHaveBeenCalled();
  });

  it('se o acesso não puder ser registrado, a ficha não é entregue', async () => {
    const { prisma, auditoria, admin } = montar();
    prisma.usuario.findFirst.mockResolvedValue(usuario);
    auditoria.registrarOuFalhar.mockRejectedValueOnce(new Error('banco fora do ar'));

    await expect(admin.obterParticipante(ADMIN_ID, PARTICIPANTE_ID, META)).rejects.toThrow(
      'banco fora do ar',
    );
  });
});

describe('AdminService.obterCurriculo', () => {
  const registro = {
    id: CURRICULO_ID,
    titulo: 'Meu currículo',
    refinadoPorIa: true,
    geradoEm: data('2026-09-02T12:00:00Z'),
    atualizadoEm: data('2026-09-03T12:00:00Z'),
    // Registro antigo, sem identificação no JSON
    conteudo: { versao: 1, cargoDesejado: 'Jovem Aprendiz', habilidades: ['Excel'] },
  };

  function participanteExiste(prisma: ReturnType<typeof criarPrismaMock>) {
    prisma.usuario.findFirst.mockResolvedValue({ id: PARTICIPANTE_ID });
    prisma.usuario.findUnique.mockResolvedValue({
      nomeCompleto: 'Maria Souza',
      email: 'maria@exemplo.com',
      telefone: '5561999999999',
      perfil: null,
    });
  }

  it('devolve o currículo como o dono vê (identidade atual da conta) e registra o acesso', async () => {
    const { prisma, auditoria, admin } = montar();
    participanteExiste(prisma);
    prisma.curriculoGerado.findFirst.mockResolvedValue(registro);

    const r = await admin.obterCurriculo(ADMIN_ID, PARTICIPANTE_ID, CURRICULO_ID, META);

    expect(r).toMatchObject({
      id: CURRICULO_ID,
      titulo: 'Meu currículo',
      cargoDesejado: 'Jovem Aprendiz',
      refinadoPorIa: true,
      conteudo: {
        nomeCompleto: 'Maria Souza',
        email: 'maria@exemplo.com',
        telefone: '(61) 99999-9999',
        habilidades: ['Excel'],
      },
    });
    expect(auditoria.registrarOuFalhar).toHaveBeenCalledWith({
      usuarioId: ADMIN_ID,
      acao: 'ADMIN_VISUALIZOU',
      entidade: 'CurriculoGerado',
      entidadeId: CURRICULO_ID,
      detalhes: { participanteId: PARTICIPANTE_ID, recurso: 'curriculo' },
      ip: META.ip,
    });
  });

  it('currículo de outro participante → 404, sem registro de acesso', async () => {
    const { prisma, auditoria, admin } = montar();
    participanteExiste(prisma);
    prisma.curriculoGerado.findFirst.mockResolvedValue(null);

    const resultado = admin.obterCurriculo(ADMIN_ID, PARTICIPANTE_ID, CURRICULO_ID, META);
    await expect(resultado).rejects.toBeInstanceOf(NotFoundException);
    await expect(resultado).rejects.toThrow(MENSAGENS_CURRICULO.naoEncontrado);
    // Sempre filtrando pelo participante da URL
    expect(prisma.curriculoGerado.findFirst.mock.calls[0][0].where).toEqual({
      id: CURRICULO_ID,
      usuarioId: PARTICIPANTE_ID,
    });
    expect(auditoria.registrarOuFalhar).not.toHaveBeenCalled();
  });

  it('participante inexistente ou ADMIN → 404 antes de procurar o currículo', async () => {
    const { prisma, auditoria, admin } = montar();
    prisma.usuario.findFirst.mockResolvedValue(null);

    await expect(
      admin.obterCurriculo(ADMIN_ID, PARTICIPANTE_ID, CURRICULO_ID, META),
    ).rejects.toThrow(MENSAGENS_ADMIN.participanteNaoEncontrado);
    expect(prisma.usuario.findFirst.mock.calls[0][0].where).toEqual({
      id: PARTICIPANTE_ID,
      tipoUsuario: { not: 'ADMIN' },
    });
    expect(prisma.curriculoGerado.findFirst).not.toHaveBeenCalled();
    expect(auditoria.registrarOuFalhar).not.toHaveBeenCalled();
  });
});

describe('AdminService.obterSimulacao', () => {
  const mensagens = [
    {
      autor: 'RECRUTADORA',
      tipo: 'TEXTO',
      conteudo: 'Fale de você',
      criadoEm: data('2026-10-05T11:00:00Z'),
    },
    {
      autor: 'CANDIDATO',
      tipo: 'AUDIO',
      conteudo: 'Sou estudante',
      criadoEm: data('2026-10-05T11:01:00Z'),
    },
  ];
  const sessao = (entrevistas: unknown[]) => ({
    id: SESSAO_ID,
    status: 'ANALISADA',
    cargoAlvo: 'Atendente',
    empresaAlvo: null,
    iniciadaEm: data('2026-10-05T11:00:00Z'),
    finalizadaEm: data('2026-10-05T11:30:00Z'),
    motivoFinalizacao: 'CONCLUIDA',
    mensagens,
    entrevistas,
  });

  it('devolve a conversa e o relatório para exibição e registra o acesso', async () => {
    const { prisma, auditoria, admin } = montar();
    prisma.usuario.findFirst.mockResolvedValue({ id: PARTICIPANTE_ID });
    prisma.sessaoEntrevista.findFirst.mockResolvedValue(
      sessao([
        {
          id: ENTREVISTA_ID,
          notaGeral: 8.6,
          dataRealizacao: data('2026-10-05T11:00:00Z'),
          pontosFortes: '',
          pontosMelhoria: '',
          dicasComunicacao: '',
          relatorio: {
            versao: 1,
            notaGeral: 8.6,
            resumo: 'Boa entrevista.',
            pontosFortes: [{ titulo: 'Clareza', descricao: 'Respostas diretas' }],
            pontosMelhoria: [],
          },
        },
      ]),
    );

    const r = await admin.obterSimulacao(ADMIN_ID, PARTICIPANTE_ID, SESSAO_ID, META);

    expect(prisma.sessaoEntrevista.findFirst.mock.calls[0][0].where).toEqual({
      id: SESSAO_ID,
      usuarioId: PARTICIPANTE_ID,
    });
    expect(r).toMatchObject({
      sessaoId: SESSAO_ID,
      status: 'ANALISADA',
      cargoAlvo: 'Atendente',
      empresaAlvo: null,
      motivoFinalizacao: 'CONCLUIDA',
      mensagens,
      entrevista: {
        id: ENTREVISTA_ID,
        notaGeral: 8.6,
        dataRealizacao: data('2026-10-05T11:00:00Z'),
        relatorio: { versao: 1, classificacao: 'DESTAQUE', resumo: 'Boa entrevista.' },
      },
    });
    expect(auditoria.registrarOuFalhar).toHaveBeenCalledWith({
      usuarioId: ADMIN_ID,
      acao: 'ADMIN_VISUALIZOU',
      entidade: 'SessaoEntrevista',
      entidadeId: SESSAO_ID,
      detalhes: { participanteId: PARTICIPANTE_ID, recurso: 'conversa' },
      ip: META.ip,
    });
  });

  it('relatório antigo (só textos) vira o formato legado; sem relatório, entrevista null', async () => {
    const { prisma, admin } = montar();
    prisma.usuario.findFirst.mockResolvedValue({ id: PARTICIPANTE_ID });
    prisma.sessaoEntrevista.findFirst.mockResolvedValueOnce(
      sessao([
        {
          id: 'e-legada',
          notaGeral: null,
          dataRealizacao: data('2026-09-01T11:00:00Z'),
          pontosFortes: 'Comunicação: falou com clareza',
          pontosMelhoria: 'Dar exemplos',
          dicasComunicacao: 'Respire',
          relatorio: null,
        },
      ]),
    );
    const legada = await admin.obterSimulacao(ADMIN_ID, PARTICIPANTE_ID, SESSAO_ID, META);
    expect(legada.entrevista).toMatchObject({
      notaGeral: null,
      relatorio: { versao: 0, classificacao: null, dicasComunicacao: ['Respire'] },
    });

    prisma.sessaoEntrevista.findFirst.mockResolvedValueOnce(sessao([]));
    const semRelatorio = await admin.obterSimulacao(ADMIN_ID, PARTICIPANTE_ID, SESSAO_ID, META);
    expect(semRelatorio.entrevista).toBeNull();
  });

  it('sessão de outro participante → 404, sem registro de acesso', async () => {
    const { prisma, auditoria, admin } = montar();
    prisma.usuario.findFirst.mockResolvedValue({ id: PARTICIPANTE_ID });
    prisma.sessaoEntrevista.findFirst.mockResolvedValue(null);

    const resultado = admin.obterSimulacao(ADMIN_ID, PARTICIPANTE_ID, SESSAO_ID, META);
    await expect(resultado).rejects.toBeInstanceOf(NotFoundException);
    await expect(resultado).rejects.toThrow(MENSAGENS_ADMIN.simulacaoNaoEncontrada);
    expect(auditoria.registrarOuFalhar).not.toHaveBeenCalled();
  });

  it('participante inexistente ou ADMIN → 404 antes de abrir a conversa', async () => {
    const { prisma, auditoria, admin } = montar();
    prisma.usuario.findFirst.mockResolvedValue(null);

    await expect(admin.obterSimulacao(ADMIN_ID, PARTICIPANTE_ID, SESSAO_ID, META)).rejects.toThrow(
      MENSAGENS_ADMIN.participanteNaoEncontrado,
    );
    expect(prisma.sessaoEntrevista.findFirst).not.toHaveBeenCalled();
    expect(auditoria.registrarOuFalhar).not.toHaveBeenCalled();
  });
});

// ───────────────────────────── Auditoria ─────────────────────────────

describe('AdminService.listarAuditoria e acoesAuditoria', () => {
  it('filtra por ação, pessoa, busca e dias de São Paulo; IP mascarado e detalhes limpos', async () => {
    const { prisma, admin } = montar();
    const criadoEm = data('2026-10-05T12:00:00Z');
    prisma.logAuditoria.findMany.mockResolvedValue([
      {
        id: 'l-1',
        criadoEm,
        acao: 'ADMIN_VISUALIZOU',
        entidade: 'Usuario',
        entidadeId: PARTICIPANTE_ID,
        ip: '177.37.10.20',
        detalhes: { participanteId: PARTICIPANTE_ID, recurso: 'ficha' },
        usuario: { id: ADMIN_ID, nomeCompleto: 'Dono', email: 'dono@exemplo.com' },
      },
      {
        id: 'l-2',
        criadoEm,
        acao: 'LOGIN_FALHA',
        entidade: null,
        entidadeId: null,
        ip: '2804:14c:5b:1::1',
        detalhes: { email: 'tentou@exemplo.com' },
        usuario: null,
      },
    ]);
    prisma.logAuditoria.count.mockResolvedValue(7);
    // Pessoas encontradas pela busca
    prisma.$queryRaw.mockResolvedValue([{ id: ADMIN_ID }, { id: PARTICIPANTE_ID }]);

    const r = await admin.listarAuditoria({
      pagina: 2,
      limite: 5,
      acao: 'LOGIN_FALHA',
      usuarioId: ADMIN_ID,
      busca: 'o',
      de: '2026-10-01',
      ate: '2026-10-10',
    });

    const consulta = prisma.logAuditoria.findMany.mock.calls[0][0];
    expect(consulta.where).toEqual({
      acao: 'LOGIN_FALHA',
      usuarioId: ADMIN_ID,
      AND: [{ usuarioId: { in: [ADMIN_ID, PARTICIPANTE_ID] } }],
      criadoEm: { gte: data('2026-10-01T03:00:00Z'), lt: data('2026-10-11T03:00:00Z') },
    });
    expect(consulta).toMatchObject({ skip: 5, take: 5 });
    expect(prisma.logAuditoria.count.mock.calls[0][0].where).toEqual(consulta.where);
    expect(r).toEqual({
      dados: [
        {
          id: 'l-1',
          criadoEm,
          acao: 'ADMIN_VISUALIZOU',
          rotulo: 'Administrador abriu dados de um participante',
          usuario: { id: ADMIN_ID, nome: 'Dono', email: 'dono@exemplo.com' },
          entidade: 'Usuario',
          entidadeId: PARTICIPANTE_ID,
          ipMascarado: '177.37.•••.•••',
          detalhes: { participanteId: PARTICIPANTE_ID, recurso: 'ficha' },
        },
        {
          id: 'l-2',
          criadoEm,
          acao: 'LOGIN_FALHA',
          rotulo: 'Login com senha errada',
          usuario: null,
          entidade: null,
          entidadeId: null,
          ipMascarado: '2804:14c:5b:•••',
          detalhes: null,
        },
      ],
      meta: { total: 7, pagina: 2, limite: 5, totalPaginas: 2 },
    });
  });

  it('sem filtros não restringe; data inválida → 400 sem consultar', async () => {
    const { prisma, admin } = montar();
    await admin.listarAuditoria({ pagina: 1, limite: 12 });
    expect(prisma.logAuditoria.findMany.mock.calls[0][0].where).toEqual({});
    expect(prisma.$queryRaw).not.toHaveBeenCalled();

    await expect(
      admin.listarAuditoria({ pagina: 1, limite: 12, de: '2026-02-30', busca: 'maria' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.logAuditoria.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('busca por pessoa ignora maiúsculas e acentos, como a lista ("joao" encontra "João")', async () => {
    const { prisma, admin } = montar();
    prisma.$queryRaw.mockResolvedValue([{ id: PARTICIPANTE_ID }]);

    await admin.listarAuditoria({ pagina: 1, limite: 12, busca: 'joao' });
    await admin.listarAuditoria({ pagina: 1, limite: 12, busca: 'JOÃO' });

    const [comoDigitado, comAcento] = consultas(prisma);
    // Os dois lados sem acento e em minúsculas: o nome guardado ("João") e a busca
    expect(comoDigitado.texto).toMatch(
      /lower\(translate\(u\.nome_completo, \$\d+, \$\d+\)\) LIKE \$\d+\s+OR lower\(u\.email\) LIKE \$\d+/,
    );
    expect(comoDigitado.valores).toEqual(
      expect.arrayContaining([padraoBusca('joao'), ACENTOS, SEM_ACENTOS]),
    );
    expect(comAcento).toEqual(comoDigitado);
    expect(padraoBusca('JOÃO')).toBe('%joao%');
    // A busca vai como parâmetro e acha também administradores (quem abriu dados de alguém)
    expect(comoDigitado.texto).not.toMatch(/joao/i);
    expect(comoDigitado.texto).not.toContain(SO_PARTICIPANTES);

    for (const [{ where }] of prisma.logAuditoria.findMany.mock.calls) {
      expect(where).toEqual({ AND: [{ usuarioId: { in: [PARTICIPANTE_ID] } }] });
    }
    expect(prisma.logAuditoria.count.mock.calls[0][0].where).toEqual({
      AND: [{ usuarioId: { in: [PARTICIPANTE_ID] } }],
    });
  });

  it('busca que não acha ninguém → nenhum registro (lista vazia de pessoas)', async () => {
    const { prisma, admin } = montar();
    prisma.$queryRaw.mockResolvedValue([]);

    const r = await admin.listarAuditoria({ pagina: 1, limite: 12, busca: 'ninguém' });

    expect(prisma.logAuditoria.findMany.mock.calls[0][0].where).toEqual({
      AND: [{ usuarioId: { in: [] } }],
    });
    expect(r.dados).toEqual([]);
  });

  it('busca ampla demais → 400 pedindo mais letras, sem consultar a auditoria', async () => {
    const { prisma, admin } = montar();
    prisma.$queryRaw.mockResolvedValue(Array.from({ length: 5001 }, (_, i) => ({ id: `id-${i}` })));

    const resultado = admin.listarAuditoria({ pagina: 1, limite: 12, busca: 'a' });
    await expect(resultado).rejects.toBeInstanceOf(BadRequestException);
    await expect(resultado).rejects.toThrow(MENSAGENS_ADMIN.buscaAmpla);
    expect(consultas(prisma)[0].valores).toContain(5001); // LIMIT: só sabe que passou do teto
    expect(prisma.logAuditoria.findMany).not.toHaveBeenCalled();
  });

  it('ações com rótulo e total, em ordem alfabética do rótulo', async () => {
    const { prisma, admin } = montar();
    prisma.logAuditoria.groupBy.mockResolvedValue([
      { acao: 'LOGIN_SUCESSO', _count: { _all: 3 } },
      { acao: 'ZZ_NOVA', _count: { _all: 1 } },
      { acao: 'CADASTRO_USUARIO', _count: { _all: 5 } },
    ]);

    expect(await admin.acoesAuditoria()).toEqual([
      { acao: 'CADASTRO_USUARIO', rotulo: 'Cadastro', total: 5 },
      { acao: 'LOGIN_SUCESSO', rotulo: 'Login', total: 3 },
      { acao: 'ZZ_NOVA', rotulo: 'ZZ_NOVA', total: 1 },
    ]);
  });
});

// ───────────────────────────── Planilhas ─────────────────────────────

describe('AdminService — planilhas CSV', () => {
  it('participantes: todos os que passam no filtro, mascarados, protegidos e com o acesso registrado', async () => {
    const { prisma, auditoria, admin } = montar();
    prisma.$queryRaw.mockResolvedValue([
      {
        ...linhaParticipante,
        nome: '=HYPERLINK("http://mal.exemplo")',
        statusConta: 'BLOQUEADO',
        ultimaNota: 6.75,
      },
    ]);

    const r = await admin.exportarParticipantes(
      ADMIN_ID,
      lista({ busca: 'maria', uf: 'DF', pagina: 3, limite: 5 }),
      META,
    );

    // Sem paginação e sem as contas ADMIN
    const [consulta] = consultas(prisma);
    expect(consulta.texto).not.toContain('LIMIT');
    expect(consulta.texto).toContain(SO_PARTICIPANTES);

    expect(r.nomeArquivo).toMatch(/^participantes-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(r.conteudo.startsWith(BOM)).toBe(true);
    const [cabecalho, linha, fim] = r.conteudo.slice(1).split('\r\n');
    expect(cabecalho).toBe(
      '"Nome";"E-mail";"Telefone (mascarado)";"Cidade";"UF";"Status";"Cadastro";"Último acesso";"Currículos";"Simulações";"Relatórios";"Última nota"',
    );
    expect(linha).toBe(
      '"\'=HYPERLINK(""http://mal.exemplo"")";"maria@exemplo.com";"(61) 9••••-9999";"Brasília";"DF";"Bloqueado";"10/10/2026 14:05";"";"2";"1";"1";"6,8"',
    );
    expect(fim).toBe('');
    expect(r.conteudo).not.toContain('5561999999999');

    expect(auditoria.registrarOuFalhar).toHaveBeenCalledWith({
      usuarioId: ADMIN_ID,
      acao: 'ADMIN_EXPORTOU',
      detalhes: { tipo: 'participantes', filtros: { busca: 'maria', uf: 'DF' }, linhas: 1 },
      ip: META.ip,
    });
  });

  it('se a exportação não puder ser registrada, a planilha não é entregue', async () => {
    const { prisma, auditoria, admin } = montar();
    prisma.$queryRaw.mockResolvedValue([linhaParticipante]);
    auditoria.registrarOuFalhar.mockRejectedValueOnce(new Error('banco fora do ar'));

    await expect(admin.exportarParticipantes(ADMIN_ID, lista(), META)).rejects.toThrow(
      'banco fora do ar',
    );
  });

  it('uso: uma linha por semana do período (sem buracos) e registro com o período', async () => {
    const { prisma, auditoria, admin } = montar();
    prisma.$queryRaw.mockResolvedValue([
      { semana: '2026-09-28', tipo: 'cadastros', total: 5 },
      { semana: '2026-09-28', tipo: 'relatorios', total: 1 },
      { semana: '2026-10-05', tipo: 'curriculos', total: 2 },
    ]);

    const r = await admin.exportarUso(ADMIN_ID, { de: '2026-09-28', ate: '2026-10-10' }, META);

    expect(consultas(prisma)[0].texto).toContain(SO_PARTICIPANTES);
    expect(r.nomeArquivo).toBe('uso-2026-09-28-a-2026-10-10.csv');
    expect(r.conteudo.slice(1).split('\r\n')).toEqual([
      '"Semana (segunda-feira)";"Cadastros";"Currículos";"Simulações";"Relatórios"',
      '"28/09/2026";"5";"0";"0";"1"',
      '"05/10/2026";"0";"2";"0";"0"',
      '',
    ]);
    expect(auditoria.registrarOuFalhar).toHaveBeenCalledWith({
      usuarioId: ADMIN_ID,
      acao: 'ADMIN_EXPORTOU',
      detalhes: { tipo: 'uso', filtros: { de: '2026-09-28', ate: '2026-10-10' } },
      ip: META.ip,
    });
  });

  it('uso com período inválido → 400, sem consulta nem registro', async () => {
    const { prisma, auditoria, admin } = montar();
    await expect(
      admin.exportarUso(ADMIN_ID, { de: '2026-10-10', ate: '2026-09-01' }, META),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(auditoria.registrarOuFalhar).not.toHaveBeenCalled();
  });
});
