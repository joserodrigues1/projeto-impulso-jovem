/**
 * Teste HTTP leve dos uploads: confere os limites do multipart (campos de texto extras são
 * recusados antes de irem para a memória) com o filtro de erros da aplicação.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NextFunction, Response } from 'express';
import request from 'supertest';
import type { RequisicaoAutenticada } from '../../common/decorators/auth.decorators';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { PrismaService } from '../../infra/prisma.service';
import { StorageService } from '../../infra/storage.service';
import { UploadsController } from './uploads.controller';

jest.mock('../../config/env', () => ({ env: {}, isProducao: false }));
jest.mock('../../infra/storage.service', () => ({ StorageService: class {} }));
jest.mock('../../infra/prisma.service', () => ({ PrismaService: class {} }));

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64, 0),
]);

describe('UploadsController (HTTP)', () => {
  let app: INestApplication;
  const storage = {
    enviar: jest.fn().mockResolvedValue(undefined),
    urlPublica: jest.fn((chave: string) => `https://cdn.exemplo/${chave}`),
    chaveDaUrl: jest.fn().mockReturnValue(null),
    remover: jest.fn(),
  };
  const prisma = {
    usuario: {
      findUnique: jest.fn().mockResolvedValue({ fotoUrl: null }),
      update: jest.fn().mockResolvedValue({}),
    },
  };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [UploadsController],
      providers: [
        { provide: StorageService, useValue: storage },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    app = modulo.createNestApplication({ logger: false });
    app.use((req: RequisicaoAutenticada, _res: Response, next: NextFunction) => {
      req.user = { id: 'u-1', tipo: 'USUARIO', nome: 'Maria', email: 'maria@exemplo.com' };
      next();
    });
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(() => app.close());

  it('avatar válido é aceito', async () => {
    await request(app.getHttpServer())
      .post('/uploads/avatar')
      .attach('file', PNG, { filename: 'foto.png', contentType: 'image/png' })
      .expect(200);
    expect(storage.enviar).toHaveBeenCalledTimes(1);
  });

  it('muitos campos de texto junto com o arquivo → 400 (não ficam na memória)', async () => {
    const envio = request(app.getHttpServer()).post('/uploads/avatar');
    for (let i = 0; i < 10; i++) envio.field(`campo${i}`, 'x'.repeat(100));
    const r = await envio.attach('file', PNG, { filename: 'foto.png', contentType: 'image/png' });
    expect(r.status).toBe(400);
    expect(r.body.mensagem).toBe('O formulário enviado é inválido.');
  });

  it('campo de texto grande demais → 400', async () => {
    const r = await request(app.getHttpServer())
      .post('/uploads/curriculo')
      .field('extra', 'x'.repeat(64 * 1024))
      .attach('file', Buffer.from('%PDF-1.7\n...'), {
        filename: 'cv.pdf',
        contentType: 'application/pdf',
      });
    expect(r.status).toBe(400);
  });
});
