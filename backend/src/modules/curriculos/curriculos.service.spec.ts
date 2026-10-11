import {
  BadRequestException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { env } from '../../config/env';
import type { AuditoriaService } from '../../infra/auditoria.service';
import type { PrismaService } from '../../infra/prisma.service';
import type { ArquivoCurriculoAntigoValidado, AudioValidado } from './curriculo-entrada';
import { GerarCurriculoDto } from './curriculos.dto';
import { CurriculosService, MENSAGENS_CURRICULO } from './curriculos.service';

// Sem depender do .env local: só as variáveis usadas pelo módulo
jest.mock('../../config/env', () => ({
  env: { N8N_CURRICULO_TIMEOUT_MS: 1000 },
  isProducao: false,
}));

const URL_N8N = 'http://n8n.teste/webhook/curriculo';
const CHAVE_N8N = 'c'.repeat(32);
const ID = '0b6f7c1e-3a1d-4c39-9a52-5d1f0f7e2a10';
const USUARIO_ID = '7d0a3c55-1b2e-4f6a-8c9d-0e1f2a3b4c5d';

function criarPrisma() {
  const registro = (data: Record<string, unknown>) => ({
    id: ID,
    titulo: data.titulo ?? null,
    refinadoPorIa: data.refinadoPorIa ?? false,
    geradoEm: new Date('2026-10-01T12:00:00Z'),
    atualizadoEm: new Date('2026-10-01T12:00:00Z'),
    conteudo: data.conteudo,
  });
  return {
    usuario: {
      findUnique: jest.fn().mockResolvedValue({
        nomeCompleto: 'Maria Teste',
        email: 'maria@exemplo.com',
        telefone: '5561999990000',
        perfil: { cidade: 'Brasília', uf: 'DF', linkLinkedin: null },
      }),
    },
    curriculoGerado: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(registro(data)),
      ),
      update: jest.fn(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(registro({ refinadoPorIa: true, ...data })),
      ),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
}

function dto(parcial: Partial<GerarCurriculoDto> = {}): GerarCurriculoDto {
  return Object.assign(new GerarCurriculoDto(), parcial);
}

const audio: AudioValidado = {
  buffer: Buffer.from('OggS-conteudo-de-teste'),
  mimeType: 'audio/ogg',
  nomeArquivo: 'historia.ogg',
};

const curriculoAntigo: ArquivoCurriculoAntigoValidado = {
  buffer: Buffer.from('%PDF-1.7 conteudo de teste'),
  mimeType: 'application/pdf',
  nomeArquivo: 'curriculo-antigo.pdf',
};

/** Corpo multipart enviado ao n8n: o JSON de `dados` e os arquivos. */
function corpoEnviado(init: RequestInit | undefined) {
  const form = init?.body as FormData;
  return {
    dados: JSON.parse(String(form.get('dados'))) as Record<string, unknown> & {
      formulario: Record<string, unknown> & { experiencias?: Array<{ empresa: string }> };
    },
    audio: form.get('audio') as File | null,
    curriculoAntigo: form.get('curriculoAntigo') as File | null,
  };
}

const respostaIa = {
  conteudo: {
    cargoDesejado: 'Jovem Aprendiz Administrativo',
    perfilProfissional: 'Jovem organizada e comunicativa.',
    experiencias: [],
    formacao: [],
    habilidades: ['Excel', 'Comunicação'],
    idiomas: [],
    premiacoes: [],
  },
  transcricao: 'Oi, meu nome é Maria e eu gosto de organizar as coisas.',
  observacoes: ['Inclua o nome da sua escola na formação.'],
};

describe('CurriculosService', () => {
  let prisma: ReturnType<typeof criarPrisma>;
  let auditoria: { registrar: jest.Mock };
  let service: CurriculosService;
  let fetchMock: jest.SpyInstance<Promise<Response>, Parameters<typeof fetch>>;
  let logs: jest.SpyInstance[];

  /** Tudo que o service escreveu no log durante o teste. */
  const textoDosLogs = () =>
    logs.flatMap((l) => l.mock.calls.map((c: unknown[]) => c.join(' '))).join('\n');

  beforeEach(() => {
    logs = (['log', 'warn', 'error', 'debug'] as const).map((nivel) =>
      jest.spyOn(Logger.prototype, nivel).mockImplementation(() => undefined),
    );
    prisma = criarPrisma();
    auditoria = { registrar: jest.fn().mockResolvedValue(undefined) };
    service = new CurriculosService(
      prisma as unknown as PrismaService,
      auditoria as unknown as AuditoriaService,
    );
    env.N8N_CURRICULO_WEBHOOK_URL = URL_N8N;
    env.N8N_API_KEY = CHAVE_N8N;
    env.N8N_CURRICULO_TIMEOUT_MS = 1000;
    fetchMock = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => jest.restoreAllMocks());

  describe('gerar', () => {
    it('com a IA respondendo: salva refinado, devolve transcrição e dicas', async () => {
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify([{ output: respostaIa }]), { status: 200 }),
      );

      const r = await service.gerar(
        USUARIO_ID,
        dto({ habilidades: ['excel'] }),
        { audio },
        {
          ip: '10.0.0.1',
        },
      );

      expect(r.refinadoPorIa).toBe(true);
      expect(r.transcricao).toBe(respostaIa.transcricao);
      expect(r.avisos).toEqual(['Inclua o nome da sua escola na formação.']);
      expect(r.titulo).toBe('Jovem Aprendiz Administrativo');
      expect(r.conteudo).toMatchObject({
        nomeCompleto: 'Maria Teste',
        telefone: '(61) 99999-0000',
        cidade: 'Brasília',
        uf: 'DF',
        habilidades: ['Excel', 'Comunicação'],
      });

      // Chamada ao n8n: chave no header, multipart da seção 6.1 com o áudio como arquivo
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(URL_N8N);
      expect(new Headers(init?.headers).get('x-api-key')).toBe(CHAVE_N8N);
      const corpo = corpoEnviado(init);
      expect(corpo.dados).toMatchObject({
        versao: 3,
        formulario: { habilidades: ['excel'], cidade: 'Brasília', uf: 'DF' },
        temAudio: true,
        temCurriculoAntigo: false,
      });
      expect(corpo.dados.formulario).not.toHaveProperty('usarIa');
      // Sem dados de contato: a identidade do currículo vem da conta
      expect(JSON.stringify(corpo.dados)).not.toContain('maria@exemplo.com');
      expect(corpo.audio?.name).toBe('historia.ogg');
      expect(corpo.audio?.type).toBe('audio/ogg');
      expect(Buffer.from(await corpo.audio!.arrayBuffer()).equals(audio.buffer)).toBe(true);
      expect(corpo.curriculoAntigo).toBeNull();

      expect(prisma.curriculoGerado.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ usuarioId: USUARIO_ID, refinadoPorIa: true }),
        }),
      );
      expect(auditoria.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          acao: 'CURRICULO_GERADO',
          detalhes: {
            refinadoPorIa: true,
            usouIa: true,
            comAudio: true,
            comCurriculoAntigo: false,
          },
        }),
      );
    });

    it('experiências fora da ordem cronológica: a IA renomeia e cada período fica no lugar certo', async () => {
      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({
            conteudo: {
              experiencias: [
                { empresa: 'Lanchonete Sabor Bom', cargo: 'Atendente', atividades: ['Balcão'] },
                {
                  empresa: 'Mercadinho do Bairro',
                  cargo: 'Operador de Caixa',
                  atividades: ['Caixa'],
                },
              ],
            },
          }),
          { status: 200 },
        ),
      );

      const r = await service.gerar(
        USUARIO_ID,
        dto({
          experiencias: [
            { empresa: 'lanch sb', cargo: 'atendente', inicio: '2023-01', fim: '2023-06' },
            { empresa: 'merc bairo', cargo: 'caixa', inicio: '2024-12', atual: true },
          ],
        }),
      );

      // O n8n recebe o formulário na ordem digitada...
      const { dados } = corpoEnviado(fetchMock.mock.calls[0][1]);
      expect(dados.formulario.experiencias?.map((e) => e.empresa)).toEqual([
        'lanch sb',
        'merc bairo',
      ]);
      // ...e o currículo sai ordenado, com os períodos certos
      expect(r.conteudo.experiencias.map((e) => `${e.empresa} | ${e.periodo}`)).toEqual([
        'Mercadinho do Bairro | dez/2024 – atual',
        'Lanchonete Sabor Bom | jan/2023 – jun/2023',
      ]);
    });

    it('tempo esgotado: salva só o formulário e avisa', async () => {
      env.N8N_CURRICULO_TIMEOUT_MS = 20;
      fetchMock.mockImplementation(
        (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () =>
              reject(new DOMException('abortado', 'AbortError')),
            );
          }),
      );

      const r = await service.gerar(USUARIO_ID, dto({ perfilProfissional: 'Gosto de aprender' }));

      expect(r.refinadoPorIa).toBe(false);
      expect(r.avisos).toEqual([MENSAGENS_CURRICULO.iaIndisponivel]);
      expect(r.conteudo.perfilProfissional).toBe('Gosto de aprender');
      expect(prisma.curriculoGerado.create).toHaveBeenCalled();
    });

    it.each([
      ['status 500', () => new Response('erro', { status: 500 })],
      ['resposta vazia', () => new Response('', { status: 200 })],
      ['JSON inválido', () => new Response('{"conteudo":', { status: 200 })],
      ['sem conteúdo útil', () => new Response(JSON.stringify({ ok: true }), { status: 200 })],
    ])('%s: fallback com aviso (texto + áudio)', async (_caso, resposta) => {
      fetchMock.mockImplementation(() => Promise.resolve(resposta()));

      const r = await service.gerar(USUARIO_ID, dto({ habilidades: ['Excel'] }), { audio });

      expect(r.refinadoPorIa).toBe(false);
      expect(r.transcricao).toBeUndefined();
      expect(r.avisos).toEqual([MENSAGENS_CURRICULO.iaIndisponivelComAudio]);
    });

    it('falha de rede com só áudio: 503 e nada é salvo', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));

      await expect(service.gerar(USUARIO_ID, dto(), { audio })).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(prisma.curriculoGerado.create).not.toHaveBeenCalled();
    });

    it('só áudio sem n8n configurado: 503 sem chamar a rede', async () => {
      env.N8N_CURRICULO_WEBHOOK_URL = undefined;

      await expect(service.gerar(USUARIO_ID, dto(), { audio })).rejects.toThrow(
        MENSAGENS_CURRICULO.audioIndisponivel,
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('n8n não configurado com formulário: salva e avisa', async () => {
      env.N8N_CURRICULO_WEBHOOK_URL = undefined;

      const r = await service.gerar(USUARIO_ID, dto({ habilidades: ['Excel'] }));

      expect(fetchMock).not.toHaveBeenCalled();
      expect(r.avisos).toEqual([MENSAGENS_CURRICULO.iaIndisponivel]);
    });

    it('usarIa=false: não chama o n8n e ignora o áudio com aviso', async () => {
      const r = await service.gerar(USUARIO_ID, dto({ habilidades: ['Excel'], usarIa: false }), {
        audio,
      });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(r.refinadoPorIa).toBe(false);
      expect(r.avisos).toEqual([MENSAGENS_CURRICULO.audioIgnorado]);
    });

    it('usarIa=false com só áudio: 400', async () => {
      await expect(service.gerar(USUARIO_ID, dto({ usarIa: false }), { audio })).rejects.toThrow(
        MENSAGENS_CURRICULO.audioSemIa,
      );
    });

    it('sem formulário e sem áudio: 400', async () => {
      const gerando = service.gerar(USUARIO_ID, dto({ titulo: 'Só o título' }));
      await expect(gerando).rejects.toBeInstanceOf(BadRequestException);
      await expect(gerando).rejects.toThrow(MENSAGENS_CURRICULO.semConteudo);
      expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
    });

    it('só cargo desejado, sem áudio e sem IA: salva e avisa (não é "só áudio")', async () => {
      env.N8N_CURRICULO_WEBHOOK_URL = undefined;

      const r = await service.gerar(USUARIO_ID, dto({ cargoDesejado: 'Jovem Aprendiz' }));

      expect(r.avisos).toEqual([MENSAGENS_CURRICULO.iaIndisponivel]);
      expect(r.titulo).toBe('Jovem Aprendiz');
    });

    it('só cargo desejado + áudio com a IA fora: 503 (o texto não basta para o currículo)', async () => {
      fetchMock.mockResolvedValue(new Response('erro', { status: 502 }));

      await expect(
        service.gerar(USUARIO_ID, dto({ cargoDesejado: 'Jovem Aprendiz' }), { audio }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(prisma.curriculoGerado.create).not.toHaveBeenCalled();
    });

    it('resposta grande demais sem content-length: para de ler no limite e cai no fallback', async () => {
      const pedaco = new Uint8Array(256 * 1024).fill(0x20);
      let enviados = 0;
      const corpo = new ReadableStream<Uint8Array>({
        pull(controle) {
          enviados += 1;
          if (enviados > 50) controle.close();
          else controle.enqueue(pedaco);
        },
      });
      fetchMock.mockResolvedValue(new Response(corpo, { status: 200 }));

      const r = await service.gerar(USUARIO_ID, dto({ habilidades: ['Excel'] }));

      expect(r.refinadoPorIa).toBe(false);
      expect(r.avisos).toEqual([MENSAGENS_CURRICULO.iaIndisponivel]);
      expect(enviados).toBeLessThan(10);
      expect(textoDosLogs()).toContain('resposta grande demais');
    });

    it('sem chave de API configurada: não envia o header', async () => {
      env.N8N_API_KEY = undefined;
      fetchMock.mockResolvedValue(new Response(JSON.stringify(respostaIa), { status: 200 }));

      await service.gerar(USUARIO_ID, dto({ habilidades: ['Excel'] }));

      expect(new Headers(fetchMock.mock.calls[0][1]?.headers).has('x-api-key')).toBe(false);
    });

    it('logs sem dados pessoais nem o áudio (sucesso e falha)', async () => {
      fetchMock
        .mockResolvedValueOnce(new Response(JSON.stringify(respostaIa), { status: 200 }))
        .mockResolvedValueOnce(new Response('Erro com Maria Teste', { status: 502 }));

      await service.gerar(USUARIO_ID, dto({ perfilProfissional: 'Sou a Maria' }), { audio });
      await service.gerar(USUARIO_ID, dto({ perfilProfissional: 'Sou a Maria' }), { audio });

      const texto = textoDosLogs();
      expect(texto).toContain('status 502');
      for (const proibido of [
        'Maria',
        'maria@exemplo.com',
        '99999',
        audio.buffer.toString('base64'),
        CHAVE_N8N,
      ]) {
        expect(texto).not.toContain(proibido);
      }
    });

    it('currículo antigo: vai como arquivo para o n8n e pode ser o único conteúdo', async () => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify(respostaIa), { status: 200 }));

      const r = await service.gerar(USUARIO_ID, dto(), { curriculoAntigo });

      expect(r.refinadoPorIa).toBe(true);
      expect(r.transcricao).toBeUndefined();
      const corpo = corpoEnviado(fetchMock.mock.calls[0][1]);
      expect(corpo.dados).toMatchObject({ temAudio: false, temCurriculoAntigo: true });
      expect(corpo.curriculoAntigo?.name).toBe('curriculo-antigo.pdf');
      expect(corpo.curriculoAntigo?.type).toBe('application/pdf');
      expect(corpo.audio).toBeNull();
      expect(auditoria.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          detalhes: {
            refinadoPorIa: true,
            usouIa: true,
            comAudio: false,
            comCurriculoAntigo: true,
          },
        }),
      );
    });

    it('só currículo antigo e a IA fora do ar: 503 (não há o que salvar)', async () => {
      fetchMock.mockResolvedValue(new Response('erro', { status: 502 }));
      await expect(service.gerar(USUARIO_ID, dto(), { curriculoAntigo })).rejects.toThrow(
        MENSAGENS_CURRICULO.audioIndisponivel,
      );
    });

    it('só currículo antigo com a IA desligada: 400', async () => {
      await expect(
        service.gerar(USUARIO_ID, dto({ usarIa: false }), { curriculoAntigo }),
      ).rejects.toThrow(MENSAGENS_CURRICULO.audioSemIa);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('IA ok mas sem transcrição do áudio enviado: avisa', async () => {
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify({ ...respostaIa, transcricao: '', observacoes: [] }), {
          status: 200,
        }),
      );

      const r = await service.gerar(USUARIO_ID, dto({ habilidades: ['Excel'] }), { audio });

      expect(r.refinadoPorIa).toBe(true);
      expect(r.avisos).toEqual([MENSAGENS_CURRICULO.audioNaoEntendido]);
    });
  });

  describe('listar / obter / atualizar / excluir', () => {
    it('lista só do usuário, mais recentes primeiro, paginado', async () => {
      prisma.curriculoGerado.findMany.mockResolvedValue([
        {
          id: ID,
          titulo: null,
          refinadoPorIa: false,
          geradoEm: new Date(),
          atualizadoEm: new Date(),
          conteudo: { versao: 2, cargoDesejado: 'Aprendiz' },
        },
      ]);
      prisma.curriculoGerado.count.mockResolvedValue(13);

      const r = await service.listar(USUARIO_ID, { pagina: 2, limite: 12 });

      expect(prisma.curriculoGerado.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { usuarioId: USUARIO_ID },
          orderBy: [{ geradoEm: 'desc' }, { id: 'desc' }],
          skip: 12,
          take: 12,
        }),
      );
      expect(r.meta).toEqual({ total: 13, pagina: 2, limite: 12, totalPaginas: 2 });
      expect(r.dados[0]).toMatchObject({ id: ID, cargoDesejado: 'Aprendiz' });
      expect(r.dados[0]).not.toHaveProperty('conteudo');
    });

    it('obter filtra pelo dono (sem IDOR) e normaliza registros antigos', async () => {
      prisma.curriculoGerado.findFirst.mockResolvedValue({
        id: ID,
        titulo: null,
        refinadoPorIa: false,
        geradoEm: new Date(),
        atualizadoEm: new Date(),
        conteudo: { resumoProfissional: 'Antigo', habilidades: ['A'], experiencias: [] },
      });

      const r = await service.obter(USUARIO_ID, ID);

      expect(prisma.curriculoGerado.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: ID, usuarioId: USUARIO_ID } }),
      );
      expect(r.conteudo).toMatchObject({
        versao: 2,
        perfilProfissional: 'Antigo',
        habilidades: ['A'],
        // v1 não guardava a identificação: vem da conta (seção 4.1)
        nomeCompleto: 'Maria Teste',
        email: 'maria@exemplo.com',
        telefone: '(61) 99999-0000',
      });
    });

    it('obter usa sempre a identificação atual da conta, não a gravada no JSON', async () => {
      prisma.curriculoGerado.findFirst.mockResolvedValue({
        id: ID,
        titulo: null,
        refinadoPorIa: true,
        geradoEm: new Date(),
        atualizadoEm: new Date(),
        conteudo: {
          versao: 2,
          nomeCompleto: 'Nome Antigo',
          email: 'antigo@exemplo.com',
          telefone: '(61) 90000-0000',
        },
      });

      const r = await service.obter(USUARIO_ID, ID);

      expect(r.conteudo).toMatchObject({
        nomeCompleto: 'Maria Teste',
        email: 'maria@exemplo.com',
        telefone: '(61) 99999-0000',
      });
    });

    it('obter de outro usuário → 404', async () => {
      prisma.curriculoGerado.findFirst.mockResolvedValue(null);
      await expect(service.obter(USUARIO_ID, ID)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('atualizar monta de novo com a identidade da conta e mantém refinadoPorIa', async () => {
      prisma.curriculoGerado.findFirst.mockResolvedValue({ id: ID, titulo: 'Versão 1' });

      const r = await service.atualizar(USUARIO_ID, ID, dto({ habilidades: ['Excel'] }));

      const chamada = prisma.curriculoGerado.update.mock.calls[0][0] as {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      };
      expect(chamada.where).toEqual({ id: ID, usuarioId: USUARIO_ID });
      expect(chamada.data).not.toHaveProperty('refinadoPorIa');
      expect(chamada.data.titulo).toBe('Versão 1');
      // Na edição o perfil não completa cidade/UF (o usuário pode ter apagado)
      expect(r.conteudo).toMatchObject({ nomeCompleto: 'Maria Teste', habilidades: ['Excel'] });
      expect(r.conteudo.cidade).toBeUndefined();
      expect(auditoria.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ acao: 'CURRICULO_ATUALIZADO' }),
      );
    });

    it('atualizar de outro usuário → 404 sem gravar', async () => {
      prisma.curriculoGerado.findFirst.mockResolvedValue(null);
      await expect(service.atualizar(USUARIO_ID, ID, dto())).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.curriculoGerado.update).not.toHaveBeenCalled();
    });

    it('excluir apaga só do dono; inexistente → 404', async () => {
      prisma.curriculoGerado.deleteMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });

      await service.excluir(USUARIO_ID, ID);
      expect(prisma.curriculoGerado.deleteMany).toHaveBeenCalledWith({
        where: { id: ID, usuarioId: USUARIO_ID },
      });
      expect(auditoria.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ acao: 'CURRICULO_EXCLUIDO' }),
      );

      await expect(service.excluir(USUARIO_ID, ID)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
