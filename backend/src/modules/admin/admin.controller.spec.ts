/**
 * Teste HTTP leve do painel: o AdminModule de verdade (middleware sem cache, @Roles + AdminAtivoGuard,
 * pipes de UUID e DTOs) com o serviço e o banco falsos. O JwtAuthGuard global é trocado por um
 * middleware que coloca o usuário do "token" na requisição; o RolesGuard global é o real.
 */
import { Global, INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { NextFunction, Response } from 'express';
import request from 'supertest';
import type {
  RequisicaoAutenticada,
  UsuarioAutenticado,
} from '../../common/decorators/auth.decorators';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { MENSAGEM_SEM_PERMISSAO, RolesGuard } from '../../common/guards/auth.guards';
import { AuditoriaService } from '../../infra/auditoria.service';
import { PrismaService } from '../../infra/prisma.service';
import { MENSAGENS_CURRICULO } from '../curriculos/curriculos.service';
import { AdminModule } from './admin.module';
import { AdminService, MENSAGENS_ADMIN } from './admin.service';

jest.mock('../../config/env', () => ({
  env: { N8N_CURRICULO_TIMEOUT_MS: 1000 },
  isProducao: false,
}));

const ADMIN: UsuarioAutenticado = {
  id: '9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d',
  tipo: 'ADMIN',
  nome: 'Dono',
  email: 'dono@exemplo.com',
};
const JOVEM: UsuarioAutenticado = {
  id: '7d0a3c55-1b2e-4f6a-8c9d-0e1f2a3b4c5d',
  tipo: 'USUARIO',
  nome: 'Maria',
  email: 'maria@exemplo.com',
};
const PARTICIPANTE_ID = JOVEM.id;
const CSV = `${String.fromCharCode(0xfeff)}"Nome"\r\n"Maria"\r\n`;

const prisma = { usuario: { findUnique: jest.fn() } };
const auditoria = { registrar: jest.fn(), registrarOuFalhar: jest.fn() };

/** No lugar do InfraModule (global): banco e auditoria falsos. */
@Global()
@Module({
  providers: [
    { provide: PrismaService, useValue: prisma },
    { provide: AuditoriaService, useValue: auditoria },
  ],
  exports: [PrismaService, AuditoriaService],
})
class InfraFalsa {}

/** Corpo bruto (para conferir o BOM byte a byte). */
function bruto(res: request.Response, cb: (err: Error | null, body: Buffer) => void) {
  const partes: Buffer[] = [];
  res.on('data', (p: Buffer) => partes.push(p));
  res.on('end', () => cb(null, Buffer.concat(partes)));
}

describe('AdminController (HTTP)', () => {
  let app: INestApplication;
  let usuarioDoToken: UsuarioAutenticado | undefined;
  const service = {
    resumo: jest.fn(),
    listarParticipantes: jest.fn(),
    obterParticipante: jest.fn(),
    obterCurriculo: jest.fn(),
    obterSimulacao: jest.fn(),
    listarAuditoria: jest.fn(),
    acoesAuditoria: jest.fn(),
    exportarParticipantes: jest.fn(),
    exportarUso: jest.fn(),
  };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [InfraFalsa, AdminModule] })
      .overrideProvider(AdminService)
      .useValue(service)
      .compile();

    app = modulo.createNestApplication({ logger: false });
    app.use((req: RequisicaoAutenticada, _res: Response, next: NextFunction) => {
      if (usuarioDoToken) req.user = usuarioDoToken;
      next();
    });
    app.useGlobalGuards(new RolesGuard(app.get(Reflector)));
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(() => app.close());

  beforeEach(() => {
    jest.clearAllMocks();
    usuarioDoToken = ADMIN;
    prisma.usuario.findUnique.mockResolvedValue({ tipoUsuario: 'ADMIN', statusConta: 'ATIVO' });
  });

  const get = (caminho: string) => request(app.getHttpServer()).get(`/api/v1/admin${caminho}`);

  describe('proteção', () => {
    it('admin ativo: 200, sem cache, e o período chega ao serviço', async () => {
      service.resumo.mockResolvedValue({ periodo: { de: '2026-09-11', ate: '2026-10-10' } });

      const res = await get('/resumo?de=2026-09-11&ate=2026-10-10').expect(200);

      expect(res.headers['cache-control']).toBe('no-store');
      expect(service.resumo).toHaveBeenCalledWith({ de: '2026-09-11', ate: '2026-10-10' });
      expect(prisma.usuario.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: ADMIN.id } }),
      );
    });

    it('token de USUARIO → 403 do RolesGuard, sem banco nem serviço (e sem cache)', async () => {
      usuarioDoToken = JOVEM;

      const res = await get('/participantes').expect(403);

      expect(res.body.mensagem).toBe(MENSAGEM_SEM_PERMISSAO);
      expect(res.headers['cache-control']).toBe('no-store');
      expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
      expect(service.listarParticipantes).not.toHaveBeenCalled();
    });

    it.each([
      ['rebaixado no banco', { tipoUsuario: 'USUARIO', statusConta: 'ATIVO' }],
      ['bloqueado no banco', { tipoUsuario: 'ADMIN', statusConta: 'BLOQUEADO' }],
      ['excluído', null],
    ])('token ADMIN, mas %s → 403 na hora', async (_caso, conta) => {
      prisma.usuario.findUnique.mockResolvedValue(conta);

      const res = await get('/exportar/participantes.csv').expect(403);

      expect(res.body.mensagem).toBe(MENSAGEM_SEM_PERMISSAO);
      expect(res.headers['cache-control']).toBe('no-store');
      expect(service.exportarParticipantes).not.toHaveBeenCalled();
    });

    it('sem login → 401 (também sem cache)', async () => {
      usuarioDoToken = undefined;
      const res = await get('/auditoria').expect(401);
      expect(res.headers['cache-control']).toBe('no-store');
    });

    it.each([
      ['/exportar/participantes.csv', 'cross-site'],
      [`/participantes/${PARTICIPANTE_ID}`, 'cross-site'],
      [`/participantes/${PARTICIPANTE_ID}/simulacoes/${PARTICIPANTE_ID}`, 'same-site'],
      ['/resumo', 'Cross-Site'],
    ])(
      'link vindo de outro site (%s, Sec-Fetch-Site %s) → 403 com a sessão do admin, sem dados nem registro',
      async (caminho, origem) => {
        const res = await get(caminho).set('Sec-Fetch-Site', origem).expect(403);

        expect(res.body.mensagem).toBe(MENSAGENS_ADMIN.origemExterna);
        expect(res.headers['cache-control']).toBe('no-store');
        expect(res.headers['content-disposition']).toBeUndefined();
        // Recusado antes dos guards e do serviço: nada é lido nem registrado
        expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
        for (const metodo of Object.values(service)) expect(metodo).not.toHaveBeenCalled();
        expect(auditoria.registrarOuFalhar).not.toHaveBeenCalled();
      },
    );

    it.each(['same-origin', 'none'])(
      'pelo próprio site ou endereço digitado (Sec-Fetch-Site %s) → passa',
      async (origem) => {
        service.exportarParticipantes.mockResolvedValue({
          nomeArquivo: 'participantes-2026-10-11.csv',
          conteudo: CSV,
        });

        await get('/exportar/participantes.csv').set('Sec-Fetch-Site', origem).expect(200);

        expect(service.exportarParticipantes).toHaveBeenCalledTimes(1);
      },
    );

    it('outro site sem login → 403 (a origem é conferida antes da sessão)', async () => {
      usuarioDoToken = undefined;
      const res = await get('/auditoria').set('Sec-Fetch-Site', 'cross-site').expect(403);
      expect(res.body.mensagem).toBe(MENSAGENS_ADMIN.origemExterna);
    });
  });

  describe('participantes e conteúdo', () => {
    it('filtros vazios contam como não informados; UF em minúsculas é aceita', async () => {
      service.listarParticipantes.mockResolvedValue({ dados: [], meta: {} });

      await get('/participantes?busca=&uf=df&status=&ordenar=nome&pagina=2&limite=100').expect(200);

      const [filtros] = service.listarParticipantes.mock.calls[0];
      expect(filtros).toMatchObject({ uf: 'DF', ordenar: 'nome', pagina: 2, limite: 100 });
      expect(filtros.busca).toBeUndefined();
      expect(filtros.status).toBeUndefined();
    });

    it.each([
      'limite=101',
      'ordenar=idade',
      'direcao=cima',
      'uf=ZZ',
      'status=SUSPENSO',
      'busca=' + 'x'.repeat(101),
      'campoQueNaoExiste=1',
    ])('parâmetro inválido (%s) → 400', async (consulta) => {
      await get(`/participantes?${consulta}`).expect(400);
      expect(service.listarParticipantes).not.toHaveBeenCalled();
    });

    it('ficha: passa o admin, o participante e o IP para o serviço (que registra o acesso)', async () => {
      service.obterParticipante.mockResolvedValue({ id: PARTICIPANTE_ID });

      await get(`/participantes/${PARTICIPANTE_ID}`).expect(200);

      const [adminId, id, meta] = service.obterParticipante.mock.calls[0];
      expect(adminId).toBe(ADMIN.id);
      expect(id).toBe(PARTICIPANTE_ID);
      expect(meta).toHaveProperty('ip');
    });

    it('ids que não são UUID → 404, sem chegar ao serviço', async () => {
      const ficha = await get('/participantes/123').expect(404);
      expect(ficha.body.mensagem).toBe(MENSAGENS_ADMIN.participanteNaoEncontrado);

      const curriculo = await get(`/participantes/${PARTICIPANTE_ID}/curriculos/abc`).expect(404);
      expect(curriculo.body.mensagem).toBe(MENSAGENS_CURRICULO.naoEncontrado);

      const conversa = await get(`/participantes/${PARTICIPANTE_ID}/simulacoes/abc`).expect(404);
      expect(conversa.body.mensagem).toBe(MENSAGENS_ADMIN.simulacaoNaoEncontrada);

      expect(service.obterParticipante).not.toHaveBeenCalled();
      expect(service.obterCurriculo).not.toHaveBeenCalled();
      expect(service.obterSimulacao).not.toHaveBeenCalled();
    });
  });

  describe('auditoria e planilhas', () => {
    it('auditoria: ação em minúsculas é aceita; data fora do formato → 400', async () => {
      service.listarAuditoria.mockResolvedValue({ dados: [], meta: {} });

      await get('/auditoria?acao=login_sucesso&de=2026-10-01').expect(200);
      expect(service.listarAuditoria.mock.calls[0][0]).toMatchObject({
        acao: 'LOGIN_SUCESSO',
        de: '2026-10-01',
      });

      await get('/auditoria?de=01/10/2026').expect(400);
      await get('/auditoria?usuarioId=nao-e-uuid').expect(400);
    });

    it('CSV de participantes: text/csv UTF-8 com BOM, para baixar, e sem cache', async () => {
      service.exportarParticipantes.mockResolvedValue({
        nomeArquivo: 'participantes-2026-10-11.csv',
        conteudo: CSV,
      });

      const res = await get('/exportar/participantes.csv?uf=df&busca=maria')
        .buffer(true)
        .parse(bruto)
        .expect(200);

      expect(res.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(res.headers['content-disposition']).toBe(
        'attachment; filename="participantes-2026-10-11.csv"',
      );
      expect(res.headers['cache-control']).toBe('no-store');
      const corpo = res.body as Buffer;
      expect([...corpo.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
      expect(corpo.toString('utf8')).toBe(CSV);
      const [adminId, filtros] = service.exportarParticipantes.mock.calls[0];
      expect(adminId).toBe(ADMIN.id);
      expect(filtros).toMatchObject({ uf: 'DF', busca: 'maria' });
    });

    it('CSV de uso: repassa o período e devolve o arquivo com o nome montado pela API', async () => {
      service.exportarUso.mockResolvedValue({
        nomeArquivo: 'uso-2026-09-11-a-2026-10-10.csv',
        conteudo: CSV,
      });

      const res = await get('/exportar/uso.csv?de=2026-09-11&ate=2026-10-10')
        .buffer(true)
        .parse(bruto)
        .expect(200);

      expect(res.headers['content-disposition']).toBe(
        'attachment; filename="uso-2026-09-11-a-2026-10-10.csv"',
      );
      expect(service.exportarUso.mock.calls[0][1]).toEqual({ de: '2026-09-11', ate: '2026-10-10' });
    });
  });
});
