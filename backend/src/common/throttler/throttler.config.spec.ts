/**
 * Rate limit das rotas de autenticação com o ThrottlerGuard de verdade (armazenamento em memória):
 * rotas públicas sempre por IP (um token válido não dá balde novo) e refresh por sessão.
 */
import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AuthController } from '../../modules/auth/auth.controller';
import { AuthService } from '../../modules/auth/auth.service';
import { criarRastreador, rastreadorPorIp, rastreadorRefresh } from './throttler.config';

const SEGREDO = 's'.repeat(40);

jest.mock('../../config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 's'.repeat(40),
    JWT_ACCESS_TTL_MIN: 15,
    JWT_REFRESH_TTL_DAYS: 7,
    COOKIE_SECURE: false,
    COOKIE_REFRESH_PATH: '/api-proxy/auth',
    REDIS_URL: 'redis://localhost:6379',
    LOGIN_MAX_TENTATIVAS: 10,
    LOGIN_BLOQUEIO_MIN: 15,
    DATA_ENCRYPTION_KEY: '0'.repeat(64),
    DATA_HASH_KEY: 'x'.repeat(32),
  },
  isProducao: false,
}));

describe('rastreadores', () => {
  const jwt = new JwtService({ secret: SEGREDO });

  it('padrão: usuário logado pelo id; visitante pelo IP', () => {
    const token = jwt.sign({ sub: 'u-1', tipo: 'USUARIO', nome: 'A', email: 'a@exemplo.com' });
    const rastrear = criarRastreador(jwt);
    expect(
      rastrear({ ip: '203.0.113.9', headers: { authorization: `Bearer ${token}` }, cookies: {} }),
    ).toBe('usuario:u-1');
    expect(rastrear({ ip: '203.0.113.9', headers: {}, cookies: {} })).toBe('ip:203.0.113.9');
  });

  it('refresh: pelo hash do cookie (sem o token em claro); sem cookie, pelo IP', () => {
    const token = 'r'.repeat(64);
    const chave = rastreadorRefresh({
      ip: '203.0.113.9',
      headers: {},
      cookies: { ij_refresh: token },
    });
    expect(chave).toMatch(/^refresh:[0-9a-f]{64}$/);
    expect(chave).not.toContain(token);
    expect(rastreadorRefresh({ ip: '203.0.113.9', headers: {}, cookies: {} })).toBe(
      'ip:203.0.113.9',
    );
    expect(rastreadorPorIp({ headers: {} })).toBe('ip:desconhecido');
  });
});

describe('AuthController + ThrottlerGuard', () => {
  let app: INestApplication;
  const jwt = new JwtService({ secret: SEGREDO });
  const sessao = {
    accessToken: 'a',
    refreshToken: 'b',
    accessExpiraEm: new Date(),
    refreshExpiraEm: new Date(),
    usuario: { id: 'u-1' },
  };
  const auth = {
    cadastrar: jest.fn().mockResolvedValue(sessao),
    login: jest.fn().mockResolvedValue(sessao),
    renovar: jest.fn().mockResolvedValue(sessao),
    logout: jest.fn(),
    solicitarRecuperacao: jest.fn(),
    redefinirSenha: jest.fn(),
  };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60_000, limit: 100 }],
          getTracker: criarRastreador(jwt),
        }),
      ],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile();
    app = modulo.createNestApplication({ logger: false });
    app.use(cookieParser());
    await app.init();
  });

  afterAll(() => app.close());

  const tokenDe = (id: string) =>
    jwt.sign({ sub: id, tipo: 'USUARIO', nome: 'X', email: 'x@exemplo.com' });

  it('recuperar-senha: 3/min por IP mesmo trocando de token a cada requisição', async () => {
    const status: number[] = [];
    for (let i = 0; i < 4; i++) {
      const r = await request(app.getHttpServer())
        .post('/auth/recuperar-senha')
        .set('Authorization', `Bearer ${tokenDe(`conta-${i}`)}`)
        .send({ email: 'alvo@exemplo.com' });
      status.push(r.status);
    }
    expect(status).toEqual([202, 202, 202, 429]);
  });

  it('refresh: cada sessão tem a sua cota — 40 pessoas na mesma rede não se derrubam', async () => {
    for (let i = 0; i < 40; i++) {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', `ij_refresh=${String(i).padStart(64, 'k')}`)
        .expect(200);
    }
  });

  it('refresh com o mesmo token acima de 30/min → 429', async () => {
    const cookie = `ij_refresh=${'z'.repeat(64)}`;
    let ultimo = 0;
    for (let i = 0; i < 31; i++) {
      ultimo = (await request(app.getHttpServer()).post('/auth/refresh').set('Cookie', cookie))
        .status;
    }
    expect(ultimo).toBe(429);
  });
});
