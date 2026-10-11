/**
 * Teste HTTP leve: só este controller, com o mesmo ValidationPipe global e o filtro de erros da aplicação,
 * para conferir o multipart (campo `dados` + `audio`) passando pelo pipe global de verdade.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NextFunction, Response } from 'express';
import request from 'supertest';
import type {
  RequisicaoAutenticada,
  UsuarioAutenticado,
} from '../../common/decorators/auth.decorators';
import { PaginacaoDto } from '../../common/dto/paginacao.dto';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { AUDIO_MAX_BYTES, MENSAGENS_ENTRADA } from './curriculo-entrada';
import { CurriculosController } from './curriculos.controller';
import { AtualizarCurriculoDto, GerarCurriculoDto } from './curriculos.dto';
import { CurriculosService } from './curriculos.service';

jest.mock('../../config/env', () => ({
  env: { N8N_CURRICULO_TIMEOUT_MS: 1000 },
  isProducao: false,
}));

const ID = '0b6f7c1e-3a1d-4c39-9a52-5d1f0f7e2a10';
const usuario: UsuarioAutenticado = {
  id: '7d0a3c55-1b2e-4f6a-8c9d-0e1f2a3b4c5d',
  tipo: 'USUARIO',
  nome: 'Maria Teste',
  email: 'maria@exemplo.com',
};

function audioWebm(tamanho = 4096) {
  const buffer = Buffer.alloc(tamanho, 0x11);
  Buffer.from([0x1a, 0x45, 0xdf, 0xa3]).copy(buffer);
  return buffer;
}

const dadosValidos = {
  cargoDesejado: 'Jovem Aprendiz',
  uf: 'df',
  experiencias: [],
  formacao: [{ instituicao: 'Escola', curso: 'Ensino Médio', situacao: 'CURSANDO' }],
  habilidades: ['Excel'],
  idiomas: [],
  premiacoes: [],
};

describe('CurriculosController (HTTP)', () => {
  let app: INestApplication;
  const service = {
    gerar: jest.fn(),
    listar: jest.fn(),
    obter: jest.fn(),
    atualizar: jest.fn(),
    excluir: jest.fn(),
  };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [CurriculosController],
      providers: [{ provide: CurriculosService, useValue: service }],
    }).compile();

    app = modulo.createNestApplication({ logger: false });
    // Substitui o JwtAuthGuard global: a requisição já chega autenticada
    app.use((req: RequisicaoAutenticada, _res: Response, next: NextFunction) => {
      req.user = usuario;
      next();
    });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(() => app.close());

  beforeEach(() => {
    jest.resetAllMocks();
    service.gerar.mockResolvedValue({ id: ID, avisos: [] });
    service.atualizar.mockResolvedValue({ id: ID });
    service.listar.mockResolvedValue({ dados: [], meta: {} });
    service.excluir.mockResolvedValue(undefined);
  });

  describe('POST /curriculos/gerar', () => {
    it('multipart com dados + áudio: valida e repassa ao service', async () => {
      await request(app.getHttpServer())
        .post('/curriculos/gerar')
        .field('dados', JSON.stringify(dadosValidos))
        .attach('audio', audioWebm(), {
          filename: 'minha-historia.webm',
          contentType: 'audio/webm;codecs=opus',
        })
        .expect(201)
        .expect({ id: ID, avisos: [] });

      const [usuarioId, dto, arquivos] = service.gerar.mock.calls[0] as [
        string,
        GerarCurriculoDto,
        { audio?: unknown; curriculoAntigo?: unknown },
      ];
      expect(usuarioId).toBe(usuario.id);
      expect(dto).toBeInstanceOf(GerarCurriculoDto);
      expect(dto.uf).toBe('DF');
      expect(arquivos.audio).toMatchObject({
        mimeType: 'audio/webm',
        nomeArquivo: 'historia.webm',
      });
      expect(arquivos.curriculoAntigo).toBeUndefined();
    });

    it('multipart com áudio + currículo antigo em PDF: os dois chegam validados', async () => {
      const pdf = Buffer.alloc(4096, 0x20);
      Buffer.from('%PDF-1.7').copy(pdf);
      await request(app.getHttpServer())
        .post('/curriculos/gerar')
        .attach('audio', audioWebm(), { filename: 'a.webm', contentType: 'audio/webm' })
        .attach('curriculoAntigo', pdf, {
          filename: 'Maria Silva - CV.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);

      const arquivos = service.gerar.mock.calls[0][2] as {
        audio?: unknown;
        curriculoAntigo?: unknown;
      };
      expect(arquivos.audio).toMatchObject({ mimeType: 'audio/webm' });
      // O nome original (com o nome da pessoa) não segue adiante
      expect(arquivos.curriculoAntigo).toMatchObject({
        mimeType: 'application/pdf',
        nomeArquivo: 'curriculo-antigo.pdf',
      });
    });

    it('currículo antigo em Word → 400 pedindo PDF', async () => {
      const docx = Buffer.alloc(4096, 0);
      Buffer.from('PK\x03\x04', 'latin1').copy(docx);
      const r = await request(app.getHttpServer())
        .post('/curriculos/gerar')
        .field('dados', JSON.stringify(dadosValidos))
        .attach('curriculoAntigo', docx, {
          filename: 'cv.docx',
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        })
        .expect(400);
      expect(r.body.mensagem).toBe(MENSAGENS_ENTRADA.curriculoAntigoTipo);
      expect(service.gerar).not.toHaveBeenCalled();
    });

    it('multipart só com áudio (sem campo dados) chega com listas vazias', async () => {
      await request(app.getHttpServer())
        .post('/curriculos/gerar')
        .attach('audio', audioWebm(), { filename: 'a.webm', contentType: 'audio/webm' })
        .expect(201);

      const dto = service.gerar.mock.calls[0][1] as GerarCurriculoDto;
      expect(dto).toMatchObject({
        experiencias: [],
        formacao: [],
        habilidades: [],
        idiomas: [],
        premiacoes: [],
      });
    });

    it('application/json sem arquivo: o corpo inteiro é o DTO', async () => {
      await request(app.getHttpServer()).post('/curriculos/gerar').send(dadosValidos).expect(201);

      const [, dto, arquivos] = service.gerar.mock.calls[0] as [string, GerarCurriculoDto, unknown];
      expect(dto).toBeInstanceOf(GerarCurriculoDto);
      expect(dto.habilidades).toEqual(['Excel']);
      expect(arquivos).toEqual({});
    });

    it('campo dados com JSON inválido → 400', async () => {
      const r = await request(app.getHttpServer())
        .post('/curriculos/gerar')
        .field('dados', '{"habilidades": [')
        .expect(400);
      expect(r.body.mensagem).toEqual([MENSAGENS_ENTRADA.dadosJson]);
      expect(service.gerar).not.toHaveBeenCalled();
    });

    it('campo desconhecido dentro de dados → 400 em português', async () => {
      const r = await request(app.getHttpServer())
        .post('/curriculos/gerar')
        .field('dados', JSON.stringify({ ...dadosValidos, email: 'outro@exemplo.com' }))
        .expect(400);
      expect(r.body.mensagem).toEqual(['O campo "email" não é permitido']);
    });

    it('arquivo que não é áudio de verdade → 400', async () => {
      const png = Buffer.alloc(4096, 0);
      Buffer.from([0x89, 0x50, 0x4e, 0x47]).copy(png);
      const r = await request(app.getHttpServer())
        .post('/curriculos/gerar')
        .field('dados', JSON.stringify(dadosValidos))
        .attach('audio', png, { filename: 'foto.webm', contentType: 'audio/webm' })
        .expect(400);
      expect(r.body.mensagem).toBe(MENSAGENS_ENTRADA.audioInvalido);
      expect(service.gerar).not.toHaveBeenCalled();
    });

    it('áudio acima de 8 MB → 413 com mensagem amigável', async () => {
      const r = await request(app.getHttpServer())
        .post('/curriculos/gerar')
        .field('dados', JSON.stringify(dadosValidos))
        .attach('audio', audioWebm(AUDIO_MAX_BYTES + 1024), {
          filename: 'a.webm',
          contentType: 'audio/webm',
        })
        .expect(413);
      expect(r.body.mensagem).toBe(MENSAGENS_ENTRADA.arquivoGrande);
    });

    it('arquivo em outro campo → 400 amigável', async () => {
      const r = await request(app.getHttpServer())
        .post('/curriculos/gerar')
        .attach('arquivo', audioWebm(), { filename: 'a.webm', contentType: 'audio/webm' })
        .expect(400);
      expect(r.body.mensagem).toBe(MENSAGENS_ENTRADA.envioInvalido);
    });
  });

  describe('demais rotas', () => {
    it('GET /curriculos converte a paginação pelo pipe global', async () => {
      await request(app.getHttpServer()).get('/curriculos?pagina=2&limite=5').expect(200);
      const [usuarioId, paginacao] = service.listar.mock.calls[0] as [string, PaginacaoDto];
      expect(usuarioId).toBe(usuario.id);
      expect(paginacao).toMatchObject({ pagina: 2, limite: 5 });

      await request(app.getHttpServer()).get('/curriculos?limite=500').expect(400);
    });

    it('id inválido → 404 sem chamar o service', async () => {
      const r = await request(app.getHttpServer()).get('/curriculos/nao-e-uuid').expect(404);
      expect(r.body.mensagem).toBe('Currículo não encontrado');
      expect(service.obter).not.toHaveBeenCalled();
    });

    it('PUT valida o corpo e repassa o DTO', async () => {
      await request(app.getHttpServer())
        .put(`/curriculos/${ID}`)
        .send({ ...dadosValidos, usarIa: false })
        .expect(200);
      const [usuarioId, id, dto] = service.atualizar.mock.calls[0] as [
        string,
        string,
        AtualizarCurriculoDto,
      ];
      expect([usuarioId, id]).toEqual([usuario.id, ID]);
      expect(dto).toBeInstanceOf(AtualizarCurriculoDto);
    });

    it('PUT com erro de validação → 400 indicando o item', async () => {
      const r = await request(app.getHttpServer())
        .put(`/curriculos/${ID}`)
        .send({ ...dadosValidos, experiencias: [{ empresa: 'Loja', cargo: '' }] })
        .expect(400);
      expect(r.body.mensagem).toEqual(['Experiência 1: Informe o cargo (até 150 caracteres)']);
    });

    it('PUT sem corpo → 400', async () => {
      await request(app.getHttpServer()).put(`/curriculos/${ID}`).expect(400);
      expect(service.atualizar).not.toHaveBeenCalled();
    });

    it('DELETE → 204', async () => {
      await request(app.getHttpServer()).delete(`/curriculos/${ID}`).expect(204);
      expect(service.excluir).toHaveBeenCalledWith(usuario.id, ID, expect.any(Object));
    });
  });
});
