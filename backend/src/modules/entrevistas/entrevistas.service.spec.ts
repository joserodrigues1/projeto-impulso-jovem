import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { env } from '../../config/env';
import { AuditoriaService } from '../../infra/auditoria.service';
import { PrismaService } from '../../infra/prisma.service';
import { RedisService } from '../../infra/redis.service';
import { RegistrarEntrevistaDto, RegistrarMensagemDto } from './entrevistas.dto';
import { EntrevistasService } from './entrevistas.service';
import { SessoesEntrevistaService } from './sessoes.service';

// Ambiente fixo para o teste (sem ler o .env); o objeto é mutável para ligar o webhook
jest.mock('../../config/env', () => ({
  env: {
    FRONTEND_URL: 'https://app.exemplo/',
    SESSAO_INATIVIDADE_MIN: 120,
    SESSAO_MIN_MENSAGENS_CANDIDATO: 3,
    N8N_RELATORIO_WEBHOOK_URL: undefined,
    N8N_API_KEY: 'chave-de-teste-com-mais-de-32-caracteres',
    N8N_TIMEOUT_MS: 1000,
  },
}));

const USUARIO = {
  id: 'u-1',
  nomeCompleto: 'Maria Souza',
  telefone: '5561999999999',
  statusConta: 'ATIVO',
};
const SESSAO_ID = '3f2b8c1e-5d4a-4f6b-9c7d-1e2f3a4b5c6d';

function criarPrismaMock() {
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    $transaction: jest.fn(),
    usuario: { findFirst: jest.fn() },
    sessaoEntrevista: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    mensagemEntrevista: {
      create: jest.fn(),
      count: jest.fn(),
      // Falas do candidato (conferência do relatório): o bastante para não limitar a nota
      findMany: jest
        .fn()
        .mockResolvedValue(
          Array.from({ length: 5 }, (_, i) => ({ conteudo: `Resposta número ${i + 1}` })),
        ),
    },
    entrevistaBot: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    curriculoGerado: { findFirst: jest.fn().mockResolvedValue(null) },
    perfil: { findUnique: jest.fn().mockResolvedValue(null) },
  };
  // A transação usa o próprio mock como cliente
  prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));
  return prisma;
}

function montar() {
  const prisma = criarPrismaMock();
  const auditoria = { registrar: jest.fn().mockResolvedValue(undefined) };
  // Tentativas do relatório no Redis (vazio = nenhuma tentativa anterior)
  const redis = {
    obterJson: jest.fn().mockResolvedValue(null),
    salvarJson: jest.fn().mockResolvedValue(undefined),
  };
  const sessoes = new SessoesEntrevistaService(
    prisma as unknown as PrismaService,
    auditoria as unknown as AuditoriaService,
    redis as unknown as RedisService,
  );
  const entrevistas = new EntrevistasService(
    prisma as unknown as PrismaService,
    auditoria as unknown as AuditoriaService,
    sessoes,
  );
  return { prisma, auditoria, redis, sessoes, entrevistas };
}

const minutosAtras = (min: number) => new Date(Date.now() - min * 60_000);

describe('SessoesEntrevistaService.registrarMensagem', () => {
  const dto: RegistrarMensagemDto = {
    telefone: USUARIO.telefone,
    autor: 'CANDIDATO',
    conteudo: 'Olá',
    cargoAlvo: 'Jovem Aprendiz',
  };

  it('cria uma sessão nova quando não há sessão em andamento (com trava por usuário)', async () => {
    const { prisma, sessoes } = montar();
    prisma.usuario.findFirst.mockResolvedValue(USUARIO);
    prisma.sessaoEntrevista.findFirst.mockResolvedValue(null);
    prisma.sessaoEntrevista.create.mockResolvedValue({ id: 's-nova' });
    prisma.mensagemEntrevista.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

    const r = await sessoes.registrarMensagem(dto);

    expect(r).toEqual({
      sessaoId: 's-nova',
      novaSessao: true,
      totalMensagens: 1,
      mensagensCandidato: 1,
    });
    expect(prisma.$queryRaw.mock.calls[0]).toContain(`ij:entrevistas:${USUARIO.id}`);
    expect(prisma.sessaoEntrevista.create.mock.calls[0][0].data).toMatchObject({
      usuarioId: USUARIO.id,
      cargoAlvo: 'Jovem Aprendiz',
    });
    expect(prisma.mensagemEntrevista.create.mock.calls[0][0].data).toMatchObject({
      sessaoId: 's-nova',
      autor: 'CANDIDATO',
      tipo: 'TEXTO',
      conteudo: 'Olá',
    });
  });

  it('continua a sessão ativa e atualiza a última mensagem', async () => {
    const { prisma, sessoes } = montar();
    prisma.usuario.findFirst.mockResolvedValue(USUARIO);
    prisma.sessaoEntrevista.findFirst.mockResolvedValue({
      id: 's-1',
      ultimaMensagemEm: minutosAtras(5),
    });
    prisma.mensagemEntrevista.count.mockResolvedValueOnce(6).mockResolvedValueOnce(3);

    const r = await sessoes.registrarMensagem(dto);

    expect(r).toEqual({
      sessaoId: 's-1',
      novaSessao: false,
      totalMensagens: 6,
      mensagensCandidato: 3,
    });
    expect(prisma.sessaoEntrevista.create).not.toHaveBeenCalled();
    expect(prisma.sessaoEntrevista.update.mock.calls[0][0]).toMatchObject({
      where: { id: 's-1' },
      data: { cargoAlvo: 'Jovem Aprendiz' },
    });
  });

  it('encerra a sessão inativa (cancelada se teve poucas respostas) e abre outra', async () => {
    const { prisma, sessoes } = montar();
    const ultima = minutosAtras(121);
    prisma.usuario.findFirst.mockResolvedValue(USUARIO);
    prisma.sessaoEntrevista.findFirst.mockResolvedValue({
      id: 's-velha',
      ultimaMensagemEm: ultima,
    });
    prisma.sessaoEntrevista.create.mockResolvedValue({ id: 's-nova' });
    prisma.mensagemEntrevista.count
      .mockResolvedValueOnce(2) // respostas do candidato na sessão velha
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);

    const r = await sessoes.registrarMensagem(dto);

    expect(r.sessaoId).toBe('s-nova');
    expect(r.novaSessao).toBe(true);
    expect(prisma.sessaoEntrevista.update.mock.calls[0][0]).toEqual({
      where: { id: 's-velha' },
      data: { status: 'CANCELADA', motivoFinalizacao: 'INATIVIDADE', finalizadaEm: ultima },
    });
  });

  it('404 para telefone sem cadastro e 403 para conta bloqueada', async () => {
    const { prisma, sessoes } = montar();
    prisma.usuario.findFirst.mockResolvedValueOnce(null);
    await expect(sessoes.registrarMensagem(dto)).rejects.toBeInstanceOf(NotFoundException);
    prisma.usuario.findFirst.mockResolvedValueOnce({ ...USUARIO, statusConta: 'BLOQUEADO' });
    await expect(sessoes.registrarMensagem(dto)).rejects.toBeInstanceOf(ForbiddenException);
  });

  describe('resposta da IA depois do encerramento (sessão fantasma)', () => {
    const daHelena: RegistrarMensagemDto = {
      telefone: USUARIO.telefone,
      autor: 'RECRUTADORA',
      conteudo: 'E qual foi o seu maior desafio?',
    };

    it('sem sessão em andamento: 409 e nada é gravado', async () => {
      const { prisma, sessoes } = montar();
      prisma.usuario.findFirst.mockResolvedValue(USUARIO);
      prisma.sessaoEntrevista.findFirst.mockResolvedValue(null);

      await expect(sessoes.registrarMensagem(daHelena)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.sessaoEntrevista.create).not.toHaveBeenCalled();
      expect(prisma.mensagemEntrevista.create).not.toHaveBeenCalled();
    });

    it('com a sessão em andamento parada além do limite: 409, sem abrir outra', async () => {
      const { prisma, sessoes } = montar();
      prisma.usuario.findFirst.mockResolvedValue(USUARIO);
      prisma.sessaoEntrevista.findFirst.mockResolvedValue({
        id: 's-velha',
        ultimaMensagemEm: minutosAtras(121),
      });

      await expect(sessoes.registrarMensagem(daHelena)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.sessaoEntrevista.create).not.toHaveBeenCalled();
      expect(prisma.sessaoEntrevista.update).not.toHaveBeenCalled();
    });

    it('com sessaoId de uma sessão já encerrada: 409', async () => {
      const { prisma, sessoes } = montar();
      prisma.usuario.findFirst.mockResolvedValue(USUARIO);
      prisma.sessaoEntrevista.findUnique.mockResolvedValue({
        id: SESSAO_ID,
        usuarioId: USUARIO.id,
        status: 'FINALIZADA',
        ultimaMensagemEm: minutosAtras(1),
      });

      await expect(
        sessoes.registrarMensagem({ ...daHelena, sessaoId: SESSAO_ID }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.mensagemEntrevista.create).not.toHaveBeenCalled();
    });

    it('com sessaoId em andamento: grava nela', async () => {
      const { prisma, sessoes } = montar();
      prisma.usuario.findFirst.mockResolvedValue(USUARIO);
      prisma.sessaoEntrevista.findUnique.mockResolvedValue({
        id: SESSAO_ID,
        usuarioId: USUARIO.id,
        status: 'EM_ANDAMENTO',
        ultimaMensagemEm: minutosAtras(1),
      });
      prisma.mensagemEntrevista.count.mockResolvedValueOnce(4).mockResolvedValueOnce(2);

      const r = await sessoes.registrarMensagem({ ...daHelena, sessaoId: SESSAO_ID });

      expect(r).toEqual({
        sessaoId: SESSAO_ID,
        novaSessao: false,
        totalMensagens: 4,
        mensagensCandidato: 2,
      });
      expect(prisma.sessaoEntrevista.findFirst).not.toHaveBeenCalled();
      expect(prisma.mensagemEntrevista.create.mock.calls[0][0].data).toMatchObject({
        sessaoId: SESSAO_ID,
        autor: 'RECRUTADORA',
      });
    });

    it('com sessaoId de outro usuário: 400; inexistente: 404', async () => {
      const { prisma, sessoes } = montar();
      prisma.usuario.findFirst.mockResolvedValue(USUARIO);
      prisma.sessaoEntrevista.findUnique.mockResolvedValueOnce({
        id: SESSAO_ID,
        usuarioId: 'outra-pessoa',
        status: 'EM_ANDAMENTO',
        ultimaMensagemEm: minutosAtras(1),
      });
      await expect(
        sessoes.registrarMensagem({ ...daHelena, sessaoId: SESSAO_ID }),
      ).rejects.toBeInstanceOf(BadRequestException);
      prisma.sessaoEntrevista.findUnique.mockResolvedValueOnce(null);
      await expect(
        sessoes.registrarMensagem({ ...daHelena, sessaoId: SESSAO_ID }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

describe('SessoesEntrevistaService.finalizar', () => {
  const fetchOriginal = global.fetch;
  afterEach(() => {
    global.fetch = fetchOriginal;
    env.N8N_RELATORIO_WEBHOOK_URL = undefined;
  });

  it('é idempotente: sessão já encerrada não muda', async () => {
    const { prisma, sessoes } = montar();
    prisma.sessaoEntrevista.findFirst.mockResolvedValue({ usuarioId: USUARIO.id });
    prisma.sessaoEntrevista.findUnique.mockResolvedValue({
      status: 'ANALISADA',
      ultimaMensagemEm: new Date(),
    });

    expect(await sessoes.finalizar(SESSAO_ID, 'CONCLUIDA')).toEqual({
      sessaoId: SESSAO_ID,
      status: 'ANALISADA',
      cuidado: false,
    });
    expect(prisma.sessaoEntrevista.update).not.toHaveBeenCalled();
  });

  it('finaliza com o mínimo de respostas e dispara o webhook do relatório', async () => {
    const { prisma, sessoes } = montar();
    env.N8N_RELATORIO_WEBHOOK_URL = 'https://n8n.exemplo/webhook/relatorio-entrevista';
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, body: null });
    global.fetch = fetchMock as unknown as typeof fetch;
    prisma.sessaoEntrevista.findFirst.mockResolvedValue({ usuarioId: USUARIO.id });
    prisma.sessaoEntrevista.findUnique.mockResolvedValue({
      status: 'EM_ANDAMENTO',
      ultimaMensagemEm: new Date(),
    });
    prisma.mensagemEntrevista.count.mockResolvedValue(3);

    const r = await sessoes.finalizar(SESSAO_ID, 'CONCLUIDA');

    expect(r).toEqual({ sessaoId: SESSAO_ID, status: 'FINALIZADA', cuidado: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(env.N8N_RELATORIO_WEBHOOK_URL);
    expect(JSON.parse(String(init.body))).toEqual({ sessaoId: SESSAO_ID });
    expect((init.headers as Record<string, string>)['x-api-key']).toBeDefined();
  });

  it('cancela com poucas respostas e não dispara o relatório', async () => {
    const { prisma, sessoes } = montar();
    env.N8N_RELATORIO_WEBHOOK_URL = 'https://n8n.exemplo/webhook/relatorio-entrevista';
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    prisma.sessaoEntrevista.findFirst.mockResolvedValue({ usuarioId: USUARIO.id });
    prisma.sessaoEntrevista.findUnique.mockResolvedValue({
      status: 'EM_ANDAMENTO',
      ultimaMensagemEm: new Date(),
    });
    prisma.mensagemEntrevista.count.mockResolvedValue(1);

    expect((await sessoes.finalizar(SESSAO_ID, 'SOLICITADA_USUARIO')).status).toBe('CANCELADA');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('404 se a sessão sumir enquanto espera a trava (ex.: conta excluída)', async () => {
    const { prisma, sessoes } = montar();
    prisma.sessaoEntrevista.findFirst.mockResolvedValue({ usuarioId: USUARIO.id });
    prisma.sessaoEntrevista.findUnique.mockResolvedValue(null);
    await expect(sessoes.finalizar(SESSAO_ID, 'CONCLUIDA')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('falha no webhook do relatório não derruba a requisição e o log não traz dados pessoais', async () => {
    const { prisma, sessoes } = montar();
    env.N8N_RELATORIO_WEBHOOK_URL = 'https://n8n.exemplo/webhook/relatorio-entrevista';
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('conexão recusada')) as unknown as typeof fetch;
    const aviso = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    prisma.sessaoEntrevista.findFirst.mockResolvedValue({ usuarioId: USUARIO.id });
    prisma.sessaoEntrevista.findUnique.mockResolvedValue({
      status: 'EM_ANDAMENTO',
      ultimaMensagemEm: new Date(),
    });
    prisma.mensagemEntrevista.count.mockResolvedValue(4);

    expect((await sessoes.finalizar(SESSAO_ID, 'CONCLUIDA')).status).toBe('FINALIZADA');
    await new Promise((r) => setImmediate(r));

    expect(aviso).toHaveBeenCalledTimes(1);
    const mensagem = String(aviso.mock.calls[0][0]);
    expect(mensagem).toContain(SESSAO_ID);
    expect(mensagem).not.toContain(USUARIO.telefone);
    aviso.mockRestore();
  });

  it('pelo painel, encerra a sessão em andamento do próprio usuário', async () => {
    const { prisma, sessoes } = montar();
    prisma.sessaoEntrevista.findFirst
      .mockResolvedValueOnce({ id: SESSAO_ID }) // sessão em andamento
      .mockResolvedValueOnce({ usuarioId: USUARIO.id }); // dono, dentro de finalizar
    prisma.sessaoEntrevista.findUnique.mockResolvedValue({
      status: 'EM_ANDAMENTO',
      ultimaMensagemEm: new Date(),
    });
    prisma.mensagemEntrevista.count.mockResolvedValue(3);

    const r = await sessoes.finalizarAtivaDoUsuario(USUARIO.id);

    expect(r).toEqual({ sessaoId: SESSAO_ID, status: 'FINALIZADA', cuidado: false });
    expect(prisma.sessaoEntrevista.findFirst.mock.calls[1][0].where).toEqual({
      id: SESSAO_ID,
      usuarioId: USUARIO.id,
    });
    expect(prisma.sessaoEntrevista.update.mock.calls[0][0].data.motivoFinalizacao).toBe(
      'SOLICITADA_USUARIO',
    );
  });

  it('pelo painel, só encontra a sessão do próprio usuário', async () => {
    const { prisma, sessoes } = montar();
    prisma.sessaoEntrevista.findFirst.mockResolvedValue(null);
    await expect(sessoes.finalizarAtivaDoUsuario('outro-usuario')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.sessaoEntrevista.findFirst.mock.calls[0][0].where).toMatchObject({
      usuarioId: 'outro-usuario',
      status: 'EM_ANDAMENTO',
    });
  });
});

describe('EntrevistasService.registrar', () => {
  const relatorio = {
    notaGeral: 8.6,
    resumo: 'Boa entrevista.',
    pontosFortes: [{ titulo: 'Clareza', descricao: 'Respostas diretas' }],
    pontosMelhoria: [
      { titulo: 'Exemplos', descricao: 'Use situações reais', comoMelhorar: 'STAR' },
    ],
    dicasComunicacao: ['Respire'],
  };

  it('payload antigo: grava os textos e devolve o link do relatório', async () => {
    const { prisma, entrevistas } = montar();
    prisma.usuario.findFirst.mockResolvedValue(USUARIO);
    prisma.entrevistaBot.create.mockResolvedValue({ id: 'e-1', dataRealizacao: new Date() });

    const dto: RegistrarEntrevistaDto = {
      telefone: USUARIO.telefone,
      cargoAlvo: 'Jovem Aprendiz',
      pontosFortes: 'A',
      pontosMelhoria: 'B',
      dicasComunicacao: 'C',
    };
    const r = await entrevistas.registrar(dto);

    expect(r).toMatchObject({
      id: 'e-1',
      linkRelatorio: 'https://app.exemplo/dashboard/entrevistas/e-1',
      telefone: USUARIO.telefone,
      primeiroNome: 'Maria',
      jaExistia: false,
    });
    expect(prisma.entrevistaBot.create.mock.calls[0][0].data).toMatchObject({
      usuarioId: USUARIO.id,
      cargoAlvo: 'Jovem Aprendiz',
      pontosFortes: 'A',
      notaGeral: null,
      relatorio: undefined,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('com sessão: salva o relatório normalizado, deriva os textos e marca ANALISADA', async () => {
    const { prisma, entrevistas } = montar();
    prisma.sessaoEntrevista.findUnique.mockResolvedValue({
      id: SESSAO_ID,
      usuarioId: USUARIO.id,
      cargoAlvo: 'Atendente',
      empresaAlvo: null,
      iniciadaEm: new Date('2026-10-01T10:00:00Z'),
      usuario: USUARIO,
    });
    prisma.entrevistaBot.findFirst.mockResolvedValue(null);
    prisma.entrevistaBot.create.mockResolvedValue({ id: 'e-2', dataRealizacao: new Date() });
    prisma.sessaoEntrevista.findUniqueOrThrow.mockResolvedValue({
      finalizadaEm: new Date(),
      motivoFinalizacao: 'CONCLUIDA',
    });

    const r = await entrevistas.registrar({ sessaoId: SESSAO_ID, relatorio });

    expect(r.jaExistia).toBe(false);
    const dados = prisma.entrevistaBot.create.mock.calls[0][0].data;
    expect(dados).toMatchObject({
      sessaoId: SESSAO_ID,
      cargoAlvo: 'Atendente',
      notaGeral: 8.6,
      pontosFortes: 'Clareza: Respostas diretas',
      pontosMelhoria: 'Exemplos: Use situações reais',
      dicasComunicacao: 'Respire',
      dataRealizacao: new Date('2026-10-01T10:00:00Z'),
    });
    expect(dados.relatorio).toMatchObject({ versao: 1, classificacao: 'DESTAQUE' });
    expect(prisma.sessaoEntrevista.update.mock.calls[0][0].data.status).toBe('ANALISADA');
    // Conferido com as falas do candidato desta sessão
    expect(prisma.mensagemEntrevista.findMany).toHaveBeenCalledWith({
      where: { sessaoId: SESSAO_ID, autor: 'CANDIDATO' },
      select: { conteudo: true },
    });
  });

  it('com sessão curta: limita a nota e tira citação que o candidato não disse', async () => {
    const { prisma, entrevistas } = montar();
    prisma.sessaoEntrevista.findUnique.mockResolvedValue({
      id: SESSAO_ID,
      usuarioId: USUARIO.id,
      cargoAlvo: 'Atendente',
      empresaAlvo: null,
      iniciadaEm: new Date(),
      usuario: USUARIO,
    });
    prisma.mensagemEntrevista.findMany.mockResolvedValue([
      { conteudo: 'Quero muito trabalhar no atendimento' },
      { conteudo: 'Já ajudei na loja da minha tia' },
    ]);
    prisma.entrevistaBot.findFirst.mockResolvedValue(null);
    prisma.entrevistaBot.create.mockResolvedValue({ id: 'e-3', dataRealizacao: new Date() });
    prisma.sessaoEntrevista.findUniqueOrThrow.mockResolvedValue({
      finalizadaEm: null,
      motivoFinalizacao: null,
    });

    await entrevistas.registrar({
      sessaoId: SESSAO_ID,
      relatorio: {
        ...relatorio,
        pontosFortes: [
          {
            titulo: 'Experiência',
            descricao: 'Citou a loja',
            evidencia: 'ajudei na loja da minha tia',
          },
          { titulo: 'Liderança', descricao: 'Inventado', evidencia: 'Eu lidero equipes grandes' },
        ],
      },
    });

    const salvo = prisma.entrevistaBot.create.mock.calls[0][0].data;
    expect(salvo.notaGeral).toBe(6);
    expect(salvo.relatorio.classificacao).toBe('EM_DESENVOLVIMENTO');
    expect(salvo.relatorio.pontosFortes[0].evidencia).toBe('ajudei na loja da minha tia');
    expect(salvo.relatorio.pontosFortes[1]).not.toHaveProperty('evidencia');
  });

  it('é idempotente por sessão: devolve o relatório existente', async () => {
    const { prisma, entrevistas, auditoria } = montar();
    prisma.sessaoEntrevista.findUnique.mockResolvedValue({
      id: SESSAO_ID,
      usuarioId: USUARIO.id,
      cargoAlvo: null,
      empresaAlvo: null,
      iniciadaEm: new Date(),
      usuario: USUARIO,
    });
    prisma.entrevistaBot.findFirst.mockResolvedValue({
      id: 'e-antiga',
      dataRealizacao: new Date(),
    });

    const r = await entrevistas.registrar({ sessaoId: SESSAO_ID, relatorio });

    expect(r).toMatchObject({ id: 'e-antiga', jaExistia: true });
    expect(prisma.entrevistaBot.create).not.toHaveBeenCalled();
    expect(auditoria.registrar).not.toHaveBeenCalled();
  });

  it('recusa telefone que não é do dono da sessão', async () => {
    const { prisma, entrevistas } = montar();
    prisma.sessaoEntrevista.findUnique.mockResolvedValue({
      id: SESSAO_ID,
      usuarioId: USUARIO.id,
      cargoAlvo: null,
      empresaAlvo: null,
      iniciadaEm: new Date(),
      usuario: USUARIO,
    });
    prisma.usuario.findFirst.mockResolvedValue({ ...USUARIO, id: 'outro' });

    await expect(
      entrevistas.registrar({ sessaoId: SESSAO_ID, telefone: '5561988888888', relatorio }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.entrevistaBot.create).not.toHaveBeenCalled();
  });

  it('404 para sessão inexistente e para telefone sem cadastro', async () => {
    const { prisma, entrevistas } = montar();
    prisma.sessaoEntrevista.findUnique.mockResolvedValue(null);
    await expect(entrevistas.registrar({ sessaoId: SESSAO_ID, relatorio })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    prisma.usuario.findFirst.mockResolvedValue(null);
    await expect(
      entrevistas.registrar({ telefone: '5561988888888', relatorio }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('sem relatório válido e sem textos é recusado antes de gravar', async () => {
    const { prisma, entrevistas } = montar();
    await expect(
      entrevistas.registrar({ sessaoId: SESSAO_ID, relatorio: { resumo: 'incompleto' } }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.sessaoEntrevista.findUnique).not.toHaveBeenCalled();
  });

  it('com sessaoId, telefone sem cadastro dá 404', async () => {
    const { prisma, entrevistas } = montar();
    prisma.sessaoEntrevista.findUnique.mockResolvedValue({
      id: SESSAO_ID,
      usuarioId: USUARIO.id,
      cargoAlvo: null,
      empresaAlvo: null,
      iniciadaEm: new Date(),
      usuario: USUARIO,
    });
    prisma.usuario.findFirst.mockResolvedValue(null);

    await expect(
      entrevistas.registrar({ sessaoId: SESSAO_ID, telefone: '5561988888888', relatorio }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.entrevistaBot.create).not.toHaveBeenCalled();
  });

  it('sem cargo nem sessão usa "Entrevista simulada" e ignora data no futuro', async () => {
    const { prisma, entrevistas } = montar();
    prisma.usuario.findFirst.mockResolvedValue(USUARIO);
    prisma.entrevistaBot.create.mockResolvedValue({ id: 'e-3', dataRealizacao: new Date() });

    await entrevistas.registrar({
      telefone: USUARIO.telefone,
      relatorio,
      dataRealizacao: new Date(Date.now() + 2 * 24 * 60 * 60_000),
    });

    const dados = prisma.entrevistaBot.create.mock.calls[0][0].data;
    expect(dados.cargoAlvo).toBe('Entrevista simulada');
    expect(dados.dataRealizacao).toBeUndefined(); // banco usa now()
  });
});

describe('SessoesEntrevistaService.listarPendentes', () => {
  const fetchOriginal = global.fetch;
  afterEach(() => {
    global.fetch = fetchOriginal;
    env.N8N_RELATORIO_WEBHOOK_URL = undefined;
  });

  it('encerra as inativas antes e devolve as finalizadas sem relatório, mais antigas primeiro', async () => {
    const { prisma, sessoes } = montar();
    env.N8N_RELATORIO_WEBHOOK_URL = 'https://n8n.exemplo/webhook/relatorio-entrevista';
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const ultima = minutosAtras(200);
    prisma.sessaoEntrevista.findMany
      .mockResolvedValueOnce([{ id: 's-inativa', usuarioId: USUARIO.id }])
      .mockResolvedValueOnce([
        {
          id: SESSAO_ID,
          usuario: { telefone: USUARIO.telefone, nomeCompleto: USUARIO.nomeCompleto },
        },
      ]);
    prisma.sessaoEntrevista.findUnique.mockResolvedValue({
      status: 'EM_ANDAMENTO',
      ultimaMensagemEm: ultima,
    });
    prisma.mensagemEntrevista.count.mockResolvedValue(5);

    const r = await sessoes.listarPendentes(500);

    expect(r).toEqual({
      sessoes: [{ sessaoId: SESSAO_ID, telefone: USUARIO.telefone, primeiroNome: 'Maria' }],
    });
    expect(prisma.sessaoEntrevista.update.mock.calls[0][0]).toEqual({
      where: { id: 's-inativa' },
      data: { status: 'FINALIZADA', motivoFinalizacao: 'INATIVIDADE', finalizadaEm: ultima },
    });
    const consulta = prisma.sessaoEntrevista.findMany.mock.calls[1][0];
    expect(consulta.where).toEqual({ status: 'FINALIZADA', entrevistas: { none: {} } });
    expect(consulta.orderBy[0]).toEqual({ finalizadaEm: 'asc' });
    expect(consulta.take).toBe(50);
    // O próprio fluxo de relatório vai processar: não dispara o webhook de novo
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('cancela (SEM_RELATORIO) as finalizadas há mais de 48 h sem relatório antes de listar', async () => {
    const { prisma, sessoes } = montar();
    jest.spyOn(Logger.prototype, 'warn').mockImplementationOnce(() => undefined);
    prisma.sessaoEntrevista.updateMany.mockResolvedValue({ count: 2 });
    prisma.sessaoEntrevista.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const antes = Date.now();

    await sessoes.listarPendentes(10);

    const { where, data } = prisma.sessaoEntrevista.updateMany.mock.calls[0][0];
    expect(data).toEqual({ status: 'CANCELADA', motivoFinalizacao: 'SEM_RELATORIO' });
    expect(where).toMatchObject({ status: 'FINALIZADA', entrevistas: { none: {} } });
    expect(where.usuarioId).toBeUndefined();
    const limite = (where.finalizadaEm as { lt: Date }).lt.getTime();
    expect(antes - limite).toBeGreaterThanOrEqual(48 * 3_600_000 - 1000);
    expect(antes - limite).toBeLessThanOrEqual(48 * 3_600_000 + 1000);
    // Cancela antes de buscar a fila
    expect(prisma.sessaoEntrevista.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.sessaoEntrevista.findMany.mock.invocationCallOrder[1],
    );
  });

  it('não encerra a sessão que recebeu mensagem enquanto esperava a trava', async () => {
    const { prisma, sessoes } = montar();
    prisma.sessaoEntrevista.findMany
      .mockResolvedValueOnce([{ id: 's-1', usuarioId: USUARIO.id }])
      .mockResolvedValueOnce([]);
    prisma.sessaoEntrevista.findUnique.mockResolvedValue({
      status: 'EM_ANDAMENTO',
      ultimaMensagemEm: new Date(),
    });

    await sessoes.listarPendentes(10);

    expect(prisma.sessaoEntrevista.update).not.toHaveBeenCalled();
  });
});

describe('SessoesEntrevistaService — cuidado e tentativas do relatório', () => {
  it('conversa em que a Helena indicou o CVV é cancelada no encerramento, mesmo com respostas', async () => {
    const { prisma, sessoes } = montar();
    prisma.sessaoEntrevista.findFirst.mockResolvedValue({ usuarioId: USUARIO.id });
    prisma.sessaoEntrevista.findUnique.mockResolvedValue({
      status: 'EM_ANDAMENTO',
      ultimaMensagemEm: new Date(),
    });
    prisma.mensagemEntrevista.count.mockResolvedValue(6);
    prisma.mensagemEntrevista.findMany.mockResolvedValueOnce([
      { conteudo: 'Você não está sozinho. O CVV atende pelo 188, 24 horas.' },
    ]);

    const r = await sessoes.finalizar(SESSAO_ID, 'CONCLUIDA');

    expect(r).toEqual({ sessaoId: SESSAO_ID, status: 'CANCELADA', cuidado: true });
    const consulta = prisma.mensagemEntrevista.findMany.mock.calls[0][0];
    expect(consulta.where).toMatchObject({ autor: 'RECRUTADORA' });
  });

  it('pula a sessão que ainda espera a próxima tentativa e anota a tentativa das escolhidas', async () => {
    const { prisma, redis, sessoes } = montar();
    const sessao = (id: string) => ({
      id,
      usuario: { telefone: USUARIO.telefone, nomeCompleto: USUARIO.nomeCompleto },
    });
    prisma.sessaoEntrevista.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([sessao('s-esperando'), sessao('s-nova')]);
    redis.obterJson.mockImplementation((chave: string) =>
      Promise.resolve(
        chave.endsWith('s-esperando') ? { tentativas: 2, ultimaEm: Date.now() - 60_000 } : null,
      ),
    );

    const r = await sessoes.listarPendentes(10);

    expect(r.sessoes.map((s) => s.sessaoId)).toEqual(['s-nova']);
    expect(redis.salvarJson).toHaveBeenCalledTimes(1);
    const [chave, estado] = redis.salvarJson.mock.calls[0];
    expect(chave).toMatch(/s-nova$/);
    expect(estado).toMatchObject({ tentativas: 1 });
  });

  it('desiste da sessão que falhou em todas as tentativas (cancelada sem relatório)', async () => {
    const { prisma, redis, sessoes } = montar();
    jest.spyOn(Logger.prototype, 'warn').mockImplementationOnce(() => undefined);
    prisma.sessaoEntrevista.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 's-falhou', usuario: { telefone: USUARIO.telefone, nomeCompleto: 'Maria' } },
      ]);
    prisma.sessaoEntrevista.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    redis.obterJson.mockResolvedValue({ tentativas: 8, ultimaEm: 0 });

    const r = await sessoes.listarPendentes(10);

    expect(r.sessoes).toEqual([]);
    const { where, data } = prisma.sessaoEntrevista.updateMany.mock.calls[1][0];
    expect(where).toMatchObject({ id: 's-falhou', status: 'FINALIZADA' });
    expect(data).toEqual({ status: 'CANCELADA', motivoFinalizacao: 'SEM_RELATORIO' });
  });
});

describe('SessoesEntrevistaService.transcricao', () => {
  it('404 quando a sessão não existe', async () => {
    const { prisma, sessoes } = montar();
    prisma.sessaoEntrevista.findUnique.mockResolvedValue(null);
    await expect(sessoes.transcricao(SESSAO_ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('devolve as mensagens em ordem cronológica, o currículo e o histórico sem a sessão atual', async () => {
    const { prisma, sessoes } = montar();
    const t1 = new Date('2026-10-01T10:00:00Z');
    const t2 = new Date('2026-10-01T10:01:00Z');
    prisma.sessaoEntrevista.findUnique.mockResolvedValue({
      id: SESSAO_ID,
      usuarioId: USUARIO.id,
      status: 'FINALIZADA',
      cargoAlvo: 'Atendente',
      empresaAlvo: null,
      iniciadaEm: t1,
      finalizadaEm: t2,
      usuario: { nomeCompleto: USUARIO.nomeCompleto, telefone: USUARIO.telefone },
      // Vêm da mais recente para a mais antiga
      mensagens: [
        { autor: 'CANDIDATO', tipo: 'AUDIO', conteudo: 'Sou estudante', criadoEm: t2 },
        { autor: 'RECRUTADORA', tipo: 'TEXTO', conteudo: 'Fale de você', criadoEm: t1 },
      ],
      _count: { mensagens: 2 },
    });
    prisma.curriculoGerado.findFirst.mockResolvedValue({
      conteudo: { versao: 2, cargoDesejado: 'Jovem Aprendiz', email: 'nao@vaza.com' },
    });
    prisma.entrevistaBot.findMany.mockResolvedValue([
      {
        cargoAlvo: 'Repositor',
        notaGeral: null,
        dataRealizacao: t1,
        pontosFortes: '',
        pontosMelhoria: 'Exemplos: use situações reais\nPostura: sente-se direito',
        dicasComunicacao: '',
        relatorio: null,
      },
    ]);

    const r = await sessoes.transcricao(SESSAO_ID);

    expect(r.mensagens.map((m) => m.autor)).toEqual(['RECRUTADORA', 'CANDIDATO']);
    expect(r.candidato).toEqual({
      primeiroNome: 'Maria',
      nomeCompleto: USUARIO.nomeCompleto,
      telefone: USUARIO.telefone,
    });
    expect(r.curriculo?.cargoDesejado).toBe('Jovem Aprendiz');
    expect(JSON.stringify(r.curriculo)).not.toContain('nao@vaza.com');
    expect(r.historico).toEqual([
      {
        cargoAlvo: 'Repositor',
        notaGeral: null,
        dataRealizacao: t1,
        principaisMelhorias: ['Exemplos', 'Postura'],
      },
    ]);
    expect(prisma.entrevistaBot.findMany.mock.calls[0][0].where).toEqual({
      usuarioId: USUARIO.id,
      OR: [{ sessaoId: null }, { sessaoId: { not: SESSAO_ID } }],
    });
    // Prontos para os prompts do n8n
    expect(r).toMatchObject({
      totalMensagens: 2,
      respostasCandidato: 1,
      perguntasHelena: 1,
      minimoRespostas: 3,
      emCuidado: false,
    });
    expect(r.dialogo).toBe(
      '[01] Helena: Fale de você\n[02] Candidato (áudio transcrito): Sou estudante',
    );
    expect(r.dialogoRecente).toBe(r.dialogo);
    expect(r.contextoTexto).toContain('Nome: Maria');
    expect(r.contextoTexto).toContain('Vaga que busca: Jovem Aprendiz');
    expect(r.contextoTexto).toContain('Repositor — precisava melhorar: Exemplos; Postura');
    expect(r.contextoTexto).not.toContain('nao@vaza.com');
  });
});

describe('EntrevistasService.contextoParaBot', () => {
  it('telefone inválido ou ID que não é telefone → TELEFONE_INVALIDO, sem consultar o banco', async () => {
    const { prisma, entrevistas } = montar();
    for (const telefone of ['abc', '5561999999999@lid', '120363025246125486@g.us']) {
      expect(await entrevistas.contextoParaBot(telefone)).toEqual({
        encontrado: false,
        motivo: 'TELEFONE_INVALIDO',
        linkCadastro: 'https://app.exemplo/registro',
      });
    }
    expect(prisma.usuario.findFirst).not.toHaveBeenCalled();
  });

  it('não cadastrado e conta bloqueada', async () => {
    const { prisma, entrevistas } = montar();
    prisma.usuario.findFirst.mockResolvedValueOnce(null);
    expect(await entrevistas.contextoParaBot('5561999999999')).toMatchObject({
      encontrado: false,
      motivo: 'NAO_CADASTRADO',
    });
    prisma.usuario.findFirst.mockResolvedValueOnce({ ...USUARIO, statusConta: 'BLOQUEADO' });
    expect(await entrevistas.contextoParaBot('5561999999999')).toMatchObject({
      encontrado: false,
      motivo: 'CONTA_BLOQUEADA',
    });
  });

  it('cadastrado: contexto com currículo, últimas notas, sessão ativa e link do painel', async () => {
    const { prisma, entrevistas } = montar();
    const iniciadaEm = minutosAtras(10);
    const ultimaMensagemEm = minutosAtras(2);
    prisma.usuario.findFirst.mockResolvedValue(USUARIO);
    prisma.curriculoGerado.findFirst.mockResolvedValue({
      conteudo: { versao: 2, cargoDesejado: 'Jovem Aprendiz', habilidades: ['Excel'] },
    });
    prisma.entrevistaBot.findMany.mockResolvedValue([
      {
        cargoAlvo: 'Atendente',
        empresaAlvo: null,
        notaGeral: 7,
        pontosMelhoria: 'Exemplos',
        dataRealizacao: iniciadaEm,
      },
    ]);
    prisma.sessaoEntrevista.findFirst.mockResolvedValue({
      id: SESSAO_ID,
      iniciadaEm,
      ultimaMensagemEm,
      cargoAlvo: 'Atendente',
      _count: { mensagens: 4 },
    });

    const r = await entrevistas.contextoParaBot('5561999999999@s.whatsapp.net');

    expect(r).toEqual({
      encontrado: true,
      usuario: {
        id: USUARIO.id,
        primeiroNome: 'Maria',
        nomeCompleto: USUARIO.nomeCompleto,
        perfil: null,
        curriculo: expect.objectContaining({
          cargoDesejado: 'Jovem Aprendiz',
          habilidades: ['Excel'],
        }),
        ultimasEntrevistas: [expect.objectContaining({ notaGeral: 7 })],
      },
      sessaoAtiva: {
        id: SESSAO_ID,
        iniciadaEm,
        ultimaMensagemEm,
        totalMensagens: 4,
        cargoAlvo: 'Atendente',
      },
      linkPainel: 'https://app.exemplo/dashboard',
    });
  });

  it('sessão parada há mais que o limite não aparece como ativa', async () => {
    const { prisma, entrevistas } = montar();
    prisma.usuario.findFirst.mockResolvedValue(USUARIO);
    prisma.sessaoEntrevista.findFirst.mockResolvedValue({
      id: SESSAO_ID,
      iniciadaEm: minutosAtras(300),
      ultimaMensagemEm: minutosAtras(121),
      cargoAlvo: null,
      _count: { mensagens: 2 },
    });

    const r = await entrevistas.contextoParaBot('5561999999999');
    expect(r.encontrado && r.sessaoAtiva).toBeNull();
  });
});

describe('EntrevistasService (painel do usuário)', () => {
  const relatorioV1 = {
    versao: 1,
    notaGeral: 8.6,
    resumo: 'Boa entrevista.',
    pontosFortes: [{ titulo: 'Clareza', descricao: 'Respostas diretas' }],
    pontosMelhoria: [],
  };

  it('listar filtra pelo usuário; nota, classificação e resumo vêm do relatório (null em legados)', async () => {
    const { prisma, entrevistas } = montar();
    const data = new Date('2026-10-01T10:00:00Z');
    prisma.entrevistaBot.findMany.mockResolvedValue([
      {
        id: 'e-1',
        cargoAlvo: 'Atendente',
        empresaAlvo: 'Loja',
        notaGeral: 8.6,
        relatorio: relatorioV1,
        dataRealizacao: data,
      },
      {
        id: 'e-0',
        cargoAlvo: 'Repositor',
        empresaAlvo: null,
        notaGeral: null,
        relatorio: null,
        dataRealizacao: data,
      },
    ]);
    prisma.entrevistaBot.count.mockResolvedValue(2);

    const r = await entrevistas.listar(USUARIO.id, { pagina: 1, limite: 12 });

    expect(prisma.entrevistaBot.findMany.mock.calls[0][0]).toMatchObject({
      where: { usuarioId: USUARIO.id },
      skip: 0,
      take: 12,
    });
    expect(r.dados).toEqual([
      {
        id: 'e-1',
        cargoAlvo: 'Atendente',
        empresaAlvo: 'Loja',
        notaGeral: 8.6,
        classificacao: 'DESTAQUE',
        resumo: 'Boa entrevista.',
        dataRealizacao: data,
      },
      {
        id: 'e-0',
        cargoAlvo: 'Repositor',
        empresaAlvo: null,
        notaGeral: null,
        classificacao: null,
        resumo: null,
        dataRealizacao: data,
      },
    ]);
    expect(r.meta).toEqual({ total: 2, pagina: 1, limite: 12, totalPaginas: 1 });
  });

  it('obter só acha a entrevista do próprio usuário e monta o relatório legado (versao 0)', async () => {
    const { prisma, entrevistas } = montar();
    prisma.entrevistaBot.findFirst.mockResolvedValueOnce(null);
    await expect(entrevistas.obter('outro-usuario', 'e-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.entrevistaBot.findFirst.mock.calls[0][0].where).toEqual({
      id: 'e-1',
      usuarioId: 'outro-usuario',
    });

    prisma.entrevistaBot.findFirst.mockResolvedValueOnce({
      id: 'e-0',
      cargoAlvo: 'Repositor',
      empresaAlvo: null,
      notaGeral: null,
      dataRealizacao: new Date(),
      pontosFortes: 'Comunicação: falou com clareza',
      pontosMelhoria: 'Dar exemplos',
      dicasComunicacao: 'Respire',
      relatorio: null,
    });
    const r = await entrevistas.obter(USUARIO.id, 'e-0');
    expect(r.notaGeral).toBeNull();
    expect(r.pontosFortes).toBe('Comunicação: falou com clareza');
    expect(r.relatorio).toMatchObject({
      versao: 0,
      notaGeral: null,
      classificacao: null,
      pontosFortes: [{ titulo: 'Comunicação', descricao: 'falou com clareza' }],
      dicasComunicacao: ['Respire'],
    });
  });

  it('resumo: evolução da mais antiga para a mais recente, média com 1 casa e relatório pendente', async () => {
    const { prisma, entrevistas } = montar();
    const d1 = new Date('2026-09-01T10:00:00Z');
    const d2 = new Date('2026-09-10T10:00:00Z');
    const d3 = new Date('2026-09-20T10:00:00Z');
    prisma.entrevistaBot.count.mockResolvedValue(4);
    prisma.entrevistaBot.aggregate.mockResolvedValue({ _avg: { notaGeral: 7.1333333 } });
    // Do banco vêm da mais recente para a mais antiga
    prisma.entrevistaBot.findMany.mockResolvedValue([
      { id: 'e-3', dataRealizacao: d3, notaGeral: 8 },
      { id: 'e-2', dataRealizacao: d2, notaGeral: 6.4 },
      { id: 'e-1', dataRealizacao: d1, notaGeral: 7 },
    ]);
    prisma.sessaoEntrevista.findFirst.mockImplementation(
      ({ where }: { where: { status: string } }) =>
        Promise.resolve(where.status === 'FINALIZADA' ? { id: SESSAO_ID } : null),
    );

    const r = await entrevistas.resumo(USUARIO.id);

    expect(r).toEqual({
      total: 4,
      mediaNota: 7.1,
      ultimaNota: 8,
      evolucao: [
        { id: 'e-1', data: d1, nota: 7 },
        { id: 'e-2', data: d2, nota: 6.4 },
        { id: 'e-3', data: d3, nota: 8 },
      ],
      sessaoAtiva: null,
      sessaoAguardandoRelatorio: true,
    });
    expect(prisma.entrevistaBot.findMany.mock.calls[0][0]).toMatchObject({
      where: { usuarioId: USUARIO.id, notaGeral: { not: null } },
      take: 10,
    });
    // Antes, encerra as simulações esquecidas do próprio usuário
    expect(prisma.sessaoEntrevista.findMany.mock.calls[0][0].where).toMatchObject({
      usuarioId: USUARIO.id,
      status: 'EM_ANDAMENTO',
    });
    // ...e cancela só as dele que esperam relatório há mais de 48 h
    expect(prisma.sessaoEntrevista.updateMany.mock.calls[0][0].where).toMatchObject({
      usuarioId: USUARIO.id,
      status: 'FINALIZADA',
    });
  });

  it('resumo sem entrevistas', async () => {
    const { prisma, entrevistas } = montar();
    prisma.entrevistaBot.count.mockResolvedValue(0);
    prisma.entrevistaBot.aggregate.mockResolvedValue({ _avg: { notaGeral: null } });
    prisma.sessaoEntrevista.findFirst.mockResolvedValue(null);

    expect(await entrevistas.resumo(USUARIO.id)).toEqual({
      total: 0,
      mediaNota: null,
      ultimaNota: null,
      evolucao: [],
      sessaoAtiva: null,
      sessaoAguardandoRelatorio: false,
    });
  });
});
