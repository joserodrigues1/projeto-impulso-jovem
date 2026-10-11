import { HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import type Redis from 'ioredis';
import type { AuditoriaService } from '../../infra/auditoria.service';
import type { MailService } from '../../infra/mail.service';
import type { PrismaService } from '../../infra/prisma.service';
import { RedisService } from '../../infra/redis.service';
import { hashSenha } from '../../common/crypto/senha';
import { AuthService } from './auth.service';
import { BloqueioLoginService } from './bloqueio-login.service';

jest.mock('../../config/env', () => ({
  env: {
    LOGIN_MAX_TENTATIVAS: 3,
    LOGIN_BLOQUEIO_MIN: 15,
    DATA_ENCRYPTION_KEY: '0'.repeat(64),
    DATA_HASH_KEY: 'x'.repeat(32),
    JWT_ACCESS_TTL_MIN: 15,
    JWT_REFRESH_TTL_DAYS: 7,
    REDIS_URL: 'redis://localhost:6379',
  },
  isProducao: false,
}));

/** Redis em memória com só o que o bloqueio usa (GET, TTL, SET NX EX, INCR, EXPIRE, DEL). */
class RedisFalso {
  valores = new Map<string, number>();
  expiracoes = new Map<string, number>();

  async get(k: string) {
    return this.valores.has(k) ? String(this.valores.get(k)) : null;
  }
  async ttl(k: string) {
    if (!this.valores.has(k)) return -2;
    return this.expiracoes.get(k) ?? -1;
  }
  async expire(k: string, s: number) {
    this.expiracoes.set(k, s);
    return 1;
  }
  async del(...ks: string[]) {
    let removidas = 0;
    for (const k of ks) {
      this.expiracoes.delete(k);
      if (this.valores.delete(k)) removidas++;
    }
    return removidas;
  }
  multi() {
    const comandos: Array<() => unknown> = [];
    const transacao = {
      set: (k: string, v: string, _ex: 'EX', s: number, _nx: 'NX') => {
        comandos.push(() => {
          if (this.valores.has(k)) return null;
          this.valores.set(k, Number(v));
          this.expiracoes.set(k, s);
          return 'OK';
        });
        return transacao;
      },
      incr: (k: string) => {
        comandos.push(() => {
          const n = (this.valores.get(k) ?? 0) + 1;
          this.valores.set(k, n);
          return n;
        });
        return transacao;
      },
      exec: async () => comandos.map((c) => [null, c()] as [null, unknown]),
    };
    return transacao;
  }
}

/** RedisService de verdade (com a lógica de tolerância), mas sem abrir conexão. */
function redisService(cliente: unknown): RedisService {
  const servico = Object.create(RedisService.prototype) as RedisService;
  Object.assign(servico, { client: cliente as Redis });
  return servico;
}

describe('BloqueioLoginService', () => {
  const email = 'Pessoa@Exemplo.com';
  const ipA = '203.0.113.10';
  const ipB = '198.51.100.20';

  it('bloqueia o par e-mail + IP ao atingir o limite e mantém o bloqueio pelo período inteiro', async () => {
    const redis = new RedisFalso();
    const bloqueio = new BloqueioLoginService(redisService(redis));

    expect(await bloqueio.registrarFalha(email, ipA)).toBe(false);
    expect(await bloqueio.registrarFalha(email, ipA)).toBe(false);
    expect(await bloqueio.segundosBloqueado(email, ipA)).toBe(0);
    expect(await bloqueio.registrarFalha(email, ipA)).toBe(true);
    expect(await bloqueio.segundosBloqueado(email, ipA)).toBe(15 * 60);

    // Mesma chave independente de maiúsculas/espaços, e sem e-mail nem IP em claro
    expect(await bloqueio.segundosBloqueado('  pessoa@exemplo.com ', ipA)).toBe(15 * 60);
    const chaves = [...redis.valores.keys()].join();
    expect(chaves).not.toContain('exemplo');
    expect(chaves).not.toContain('203.0.113');
  });

  it('quem erra a senha de outra pessoa não tranca o dono, que entra de outro IP', async () => {
    const redis = new RedisFalso();
    const bloqueio = new BloqueioLoginService(redisService(redis));
    for (let i = 0; i < 3; i++) await bloqueio.registrarFalha(email, ipA);

    expect(await bloqueio.segundosBloqueado(email, ipA)).toBe(15 * 60);
    expect(await bloqueio.segundosBloqueado(email, ipB)).toBe(0);
  });

  it('teto por e-mail (3× o limite) bloqueia de qualquer IP contra ataque distribuído', async () => {
    const redis = new RedisFalso();
    const bloqueio = new BloqueioLoginService(redisService(redis));
    expect(BloqueioLoginService.tetoPorEmail).toBe(9);

    // 2 falhas por IP (abaixo do limite de cada par), de IPs diferentes
    const resultados: boolean[] = [];
    for (let i = 0; i < 9; i++)
      resultados.push(await bloqueio.registrarFalha(email, `10.0.0.${Math.floor(i / 2)}`));
    expect(resultados.slice(0, 8).every((r) => !r)).toBe(true);
    expect(resultados[8]).toBe(true);
    expect(await bloqueio.segundosBloqueado(email, '192.0.2.99')).toBe(15 * 60);
  });

  it('limparIp() libera só o IP; limpar() (senha redefinida) libera o e-mail também', async () => {
    const redis = new RedisFalso();
    const bloqueio = new BloqueioLoginService(redisService(redis));
    for (let i = 0; i < 3; i++) await bloqueio.registrarFalha(email, ipA);
    for (let i = 0; i < 6; i++) await bloqueio.registrarFalha(email, `10.0.1.${i}`);
    expect(await bloqueio.segundosBloqueado(email, ipB)).toBe(15 * 60);

    await bloqueio.limparIp(email, ipA);
    // O teto do e-mail continua valendo
    expect(await bloqueio.segundosBloqueado(email, ipA)).toBe(15 * 60);

    await bloqueio.limpar(email, ipB);
    expect(await bloqueio.segundosBloqueado(email, ipA)).toBe(0);
    expect(await bloqueio.segundosBloqueado(email, ipB)).toBe(0);
  });

  it('IPv6 do mesmo /64 conta como a mesma origem', async () => {
    const redis = new RedisFalso();
    const bloqueio = new BloqueioLoginService(redisService(redis));
    for (let i = 1; i <= 3; i++) await bloqueio.registrarFalha(email, `2001:db8:1:2::${i}`);
    expect(await bloqueio.segundosBloqueado(email, '2001:db8:1:2::ffff')).toBe(15 * 60);
    expect(await bloqueio.segundosBloqueado(email, '2001:db8:9:9::1')).toBe(0);
  });

  it('com o Redis fora do ar ninguém é bloqueado', async () => {
    const quebrado = {
      get: () => Promise.reject(new Error('ECONNREFUSED')),
      ttl: () => Promise.reject(new Error('ECONNREFUSED')),
      multi: () => {
        throw new Error('ECONNREFUSED');
      },
      del: () => Promise.reject(new Error('ECONNREFUSED')),
    };
    const bloqueio = new BloqueioLoginService(redisService(quebrado));
    await expect(bloqueio.registrarFalha(email, ipA)).resolves.toBe(false);
    await expect(bloqueio.segundosBloqueado(email, ipA)).resolves.toBe(0);
    await expect(bloqueio.limpar(email, ipA)).resolves.toBeUndefined();
    await expect(bloqueio.limparIp(email, ipA)).resolves.toBeUndefined();
  });

  it('com o Redis travado, responde em até ~1 s sem bloquear', async () => {
    const travado = {
      get: () => new Promise(() => undefined),
      ttl: () => new Promise(() => undefined),
    };
    const bloqueio = new BloqueioLoginService(redisService(travado));
    const inicio = Date.now();
    await expect(bloqueio.segundosBloqueado(email, ipA)).resolves.toBe(0);
    expect(Date.now() - inicio).toBeLessThan(3000);
  });

  it('com o Redis sabidamente desconectado, desiste na hora (sem esperar o tempo máximo)', async () => {
    const travado = {
      status: 'reconnecting',
      get: () => new Promise(() => undefined),
      ttl: () => new Promise(() => undefined),
    };
    const bloqueio = new BloqueioLoginService(redisService(travado));
    const inicio = Date.now();
    await expect(bloqueio.segundosBloqueado(email, ipA)).resolves.toBe(0);
    await expect(bloqueio.registrarFalha(email, ipA)).resolves.toBe(false);
    expect(Date.now() - inicio).toBeLessThan(200);
  });

  it('mensagem amigável com os minutos restantes', () => {
    expect(BloqueioLoginService.mensagem(14 * 60 + 5)).toMatch(/aguarde 15 minutos/);
    expect(BloqueioLoginService.mensagem(30)).toMatch(/aguarde 1 minuto /);
  });
});

describe('AuthService.login com bloqueio', () => {
  function criar(redis: RedisFalso) {
    const prisma = {
      usuario: { findUnique: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const auditoria = { registrar: jest.fn() } as unknown as AuditoriaService;
    const auth = new AuthService(
      prisma,
      {} as JwtService,
      {} as MailService,
      auditoria,
      new BloqueioLoginService(redisService(redis)),
    );
    return { auth, prisma };
  }

  const tentar = (auth: AuthService) =>
    auth.login({ email: 'ninguem@exemplo.com', senha: 'Errada123' }, {}).catch((e: unknown) => e);

  it('erra a senha → 401; ao atingir o limite → 429; bloqueado não consulta o banco', async () => {
    const redis = new RedisFalso();
    const { auth, prisma } = criar(redis);

    expect(await tentar(auth)).toBeInstanceOf(UnauthorizedException);
    expect(await tentar(auth)).toBeInstanceOf(UnauthorizedException);

    const terceira = await tentar(auth);
    expect(terceira).toBeInstanceOf(HttpException);
    expect((terceira as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);

    const chamadas = (prisma.usuario.findUnique as jest.Mock).mock.calls.length;
    const quarta = await tentar(auth);
    expect((quarta as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect((prisma.usuario.findUnique as jest.Mock).mock.calls.length).toBe(chamadas);
  }, 20_000);

  it('login correto zera as falhas e regrava o hash legado do argon2 nativo', async () => {
    // Fixture real do argon2@0.45 (senha "Fixture123")
    const hashLegado =
      '$argon2id$v=19$m=65536,p=4,t=3$PSIrXD+oBqPCqy8WBrKOZQ$7n4GClVJ+aCQbtodFpJav9vhCJzDoTW3tTPmWABD0Ik';
    const usuario = {
      id: 'u1',
      nomeCompleto: 'Pessoa Teste',
      email: 'pessoa@exemplo.com',
      senhaHash: hashLegado,
      tipoUsuario: 'USUARIO',
      statusConta: 'ATIVO',
      fotoUrl: null,
    };
    const update = jest
      .fn()
      .mockImplementation(({ data }: { data: object }) => ({ ...usuario, ...data }));
    const prisma = {
      usuario: { findUnique: jest.fn().mockResolvedValue(usuario), update },
      refreshToken: { deleteMany: jest.fn(), create: jest.fn() },
    } as unknown as PrismaService;
    const redis = new RedisFalso();
    const bloqueio = new BloqueioLoginService(redisService(redis));
    const jwt = { signAsync: jest.fn().mockResolvedValue('token') } as unknown as JwtService;
    const auth = new AuthService(
      prisma,
      jwt,
      {} as MailService,
      { registrar: jest.fn() } as unknown as AuditoriaService,
      bloqueio,
    );

    await bloqueio.registrarFalha(usuario.email, '203.0.113.5');
    const sessao = await auth.login(
      { email: usuario.email, senha: 'Fixture123' },
      { ip: '203.0.113.5' },
    );

    expect(sessao.usuario.email).toBe(usuario.email);
    // Zera o par e-mail + IP; o contador do e-mail (teto) segue até expirar
    expect(redis.valores.size).toBe(1);
    expect(await bloqueio.segundosBloqueado(usuario.email, '203.0.113.5')).toBe(0);
    const { senhaHash } = (update.mock.calls[0][0] as { data: { senhaHash?: string } }).data;
    expect(senhaHash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(JSON.stringify(sessao)).not.toContain('argon2');
  }, 20_000);

  describe('senha correta durante o bloqueio', () => {
    let hashCorreta: string;
    beforeAll(async () => {
      hashCorreta = await hashSenha('Correta123');
    }, 20_000);

    function criarComUsuario(redis: RedisFalso) {
      const usuario = {
        id: 'u2',
        nomeCompleto: 'Dona da Conta',
        email: 'dona@exemplo.com',
        senhaHash: hashCorreta,
        tipoUsuario: 'USUARIO',
        statusConta: 'ATIVO',
        fotoUrl: null,
      };
      const prisma = {
        usuario: {
          findUnique: jest.fn().mockResolvedValue(usuario),
          update: jest.fn().mockResolvedValue(usuario),
        },
        refreshToken: { deleteMany: jest.fn(), create: jest.fn() },
      } as unknown as PrismaService;
      const jwt = { signAsync: jest.fn().mockResolvedValue('token') } as unknown as JwtService;
      const auth = new AuthService(
        prisma,
        jwt,
        {} as MailService,
        { registrar: jest.fn() } as unknown as AuditoriaService,
        new BloqueioLoginService(redisService(redis)),
      );
      const login = (senha: string, ip: string) =>
        auth.login({ email: usuario.email, senha }, { ip }).catch((e: unknown) => e);
      return { login };
    }

    const status = (r: unknown) => (r instanceof HttpException ? r.getStatus() : 200);

    it('colega bloqueia o próprio IP, mas a dona entra de outro IP com a senha certa', async () => {
      const { login } = criarComUsuario(new RedisFalso());
      const ipColega = '203.0.113.50';
      expect(status(await login('Errada123', ipColega))).toBe(401);
      expect(status(await login('Errada123', ipColega))).toBe(401);
      expect(status(await login('Errada123', ipColega))).toBe(429);
      // No IP bloqueado, nem a senha certa passa (senão o bloqueio revelaria a senha)
      expect(status(await login('Correta123', ipColega))).toBe(429);
      expect(status(await login('Correta123', '198.51.100.7'))).toBe(200);
    }, 20_000);

    it('ataque distribuído: no teto do e-mail, nem a senha certa entra até a janela expirar', async () => {
      const { login } = criarComUsuario(new RedisFalso());
      for (let i = 0; i < 9; i++) await login('Errada123', `10.1.0.${i}`);
      const r = await login('Correta123', '198.51.100.7');
      expect(status(r)).toBe(429);
      expect((r as HttpException).message).toMatch(/aguarde 15 minutos/);
    }, 20_000);
  });
});
