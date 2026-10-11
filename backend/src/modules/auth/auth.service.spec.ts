import { ForbiddenException, Logger, UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { hashSenha } from '../../common/crypto/senha';
import type { AuditoriaService } from '../../infra/auditoria.service';
import type { MailService } from '../../infra/mail.service';
import type { PrismaService } from '../../infra/prisma.service';
import { AuthService } from './auth.service';
import type { BloqueioLoginService } from './bloqueio-login.service';

jest.mock('../../config/env', () => ({
  env: {
    LOGIN_MAX_TENTATIVAS: 10,
    LOGIN_BLOQUEIO_MIN: 15,
    DATA_ENCRYPTION_KEY: '0'.repeat(64),
    DATA_HASH_KEY: 'x'.repeat(32),
    JWT_ACCESS_TTL_MIN: 15,
    JWT_REFRESH_TTL_DAYS: 7,
    REDIS_URL: 'redis://localhost:6379',
  },
  isProducao: false,
}));

interface RegistroToken {
  id: string;
  usuarioId: string;
  familia: string;
  tokenHash: string;
  expiraEm: Date;
  revogadoEm: Date | null;
  substituidoPor: string | null;
}

const USUARIO = {
  id: 'u-1',
  nomeCompleto: 'Pessoa Teste',
  email: 'pessoa@exemplo.com',
  tipoUsuario: 'USUARIO',
  statusConta: 'ATIVO',
  fotoUrl: null,
  senhaHash: 'x',
};

type Filtro = Partial<Record<keyof RegistroToken, unknown>> & { expiraEm?: { gt: Date } };

/** Tabela refresh_tokens em memória com só o que a rotação usa. */
class TokensFalsos {
  linhas: RegistroToken[] = [];

  private casa(t: RegistroToken, where: Filtro): boolean {
    return Object.entries(where).every(([campo, valor]) => {
      if (campo === 'expiraEm') return t.expiraEm > (valor as { gt: Date }).gt;
      return t[campo as keyof RegistroToken] === valor;
    });
  }

  readonly delegate = {
    create: jest.fn(({ data }: { data: Partial<RegistroToken> }) => {
      const linha: RegistroToken = {
        id: data.id ?? randomUUID(),
        usuarioId: data.usuarioId!,
        familia: data.familia!,
        tokenHash: data.tokenHash!,
        expiraEm: data.expiraEm!,
        revogadoEm: null,
        substituidoPor: null,
      };
      this.linhas.push(linha);
      return Promise.resolve(linha);
    }),
    findUnique: jest.fn(({ where }: { where: Filtro }) => {
      const linha = this.linhas.find((t) => this.casa(t, where));
      return Promise.resolve(linha ? { ...linha, usuario: USUARIO } : null);
    }),
    updateMany: jest.fn(({ where, data }: { where: Filtro; data: Partial<RegistroToken> }) => {
      const alvo = this.linhas.filter((t) => this.casa(t, where));
      alvo.forEach((t) => Object.assign(t, data));
      return Promise.resolve({ count: alvo.length });
    }),
    count: jest.fn(({ where }: { where: Filtro }) =>
      Promise.resolve(this.linhas.filter((t) => this.casa(t, where)).length),
    ),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
  };
}

function montar() {
  const tokens = new TokensFalsos();
  const prisma = { refreshToken: tokens.delegate } as unknown as PrismaService;
  const jwt = { signAsync: jest.fn().mockResolvedValue('jwt') } as unknown as JwtService;
  const auditoria = { registrar: jest.fn().mockResolvedValue(undefined) };
  const auth = new AuthService(
    prisma,
    jwt,
    {} as MailService,
    auditoria as unknown as AuditoriaService,
    {} as BloqueioLoginService,
  );
  return { auth, auditoria };
}

/** Cadeia T1 → T2 → T3 de um atacante que renova a cada poucos segundos. */
async function cadeia(auth: AuthService) {
  const t1 = (await auth.emitirSessao(USUARIO as never, {})).refreshToken;
  const t2 = (await auth.renovar(t1, {})).refreshToken;
  const t3 = (await auth.renovar(t2, {})).refreshToken;
  return { t1, t2, t3 };
}

describe('AuthService.renovar — tolerância de 15 s', () => {
  beforeAll(() => jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined));
  afterAll(() => jest.restoreAllMocks());

  it('corrida entre abas: o token recém-rotacionado ainda renova enquanto a sessão está viva', async () => {
    const { auth } = montar();
    const t1 = (await auth.emitirSessao(USUARIO as never, {})).refreshToken;
    await auth.renovar(t1, {});

    const outraAba = await auth.renovar(t1, {});
    expect(outraAba.usuario.id).toBe(USUARIO.id);
  });

  it('troca de senha (revogarTodas): nem o token de duas rotações atrás (T1) reabre a sessão', async () => {
    const { auth, auditoria } = montar();
    const { t1, t2, t3 } = await cadeia(auth);

    await auth.revogarTodas(USUARIO.id);

    await expect(auth.renovar(t3, {})).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(auth.renovar(t1, {})).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(auth.renovar(t2, {})).rejects.toBeInstanceOf(UnauthorizedException);
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ acao: 'REFRESH_TOKEN_REUSO_DETECTADO' }),
    );
  });

  it('logout (revogarFamilia): o avô T1 também é recusado', async () => {
    const { auth } = montar();
    const { t1, t3 } = await cadeia(auth);

    await auth.logout(t3);

    await expect(auth.renovar(t3, {})).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(auth.renovar(t1, {})).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('a sessão nova aberta na troca de senha não ressuscita a família antiga', async () => {
    const { auth } = montar();
    const { t1 } = await cadeia(auth);

    // alterarSenha: revoga tudo e abre uma sessão nova (outra família)
    await auth.revogarTodas(USUARIO.id);
    const nova = await auth.emitirSessao(USUARIO as never, {});

    await expect(auth.renovar(t1, {})).rejects.toBeInstanceOf(UnauthorizedException);
    // A sessão nova segue funcionando
    await expect(auth.renovar(nova.refreshToken, {})).resolves.toMatchObject({
      usuario: { id: USUARIO.id },
    });
  });
});

describe('AuthService.login — auditoria', () => {
  const SENHA = 'Senha-de-teste-123';
  const META = { ip: '177.37.10.20', userAgent: 'jest' };
  let senhaHash: string;
  beforeAll(async () => {
    senhaHash = await hashSenha(SENHA);
  });

  function montarLogin(conta: Partial<typeof USUARIO> | null = {}) {
    const tokens = new TokensFalsos();
    const usuario = conta ? { ...USUARIO, senhaHash, ...conta } : null;
    const prisma = {
      refreshToken: tokens.delegate,
      usuario: {
        findUnique: jest.fn().mockResolvedValue(usuario),
        update: jest.fn().mockResolvedValue(usuario),
      },
    };
    const auditoria = { registrar: jest.fn().mockResolvedValue(undefined) };
    const bloqueio = {
      segundosBloqueado: jest.fn().mockResolvedValue(0),
      registrarFalha: jest.fn().mockResolvedValue(false),
      limparIp: jest.fn().mockResolvedValue(undefined),
    };
    const auth = new AuthService(
      prisma as unknown as PrismaService,
      { signAsync: jest.fn().mockResolvedValue('jwt') } as unknown as JwtService,
      {} as MailService,
      auditoria as unknown as AuditoriaService,
      bloqueio as unknown as BloqueioLoginService,
    );
    return { auth, auditoria, prisma, tokens };
  }

  const acoes = (auditoria: { registrar: jest.Mock }) =>
    auditoria.registrar.mock.calls.map(([r]: [{ acao: string }]) => r.acao);

  it('login certo registra LOGIN_SUCESSO com o IP, depois de abrir a sessão', async () => {
    const { auth, auditoria, tokens } = montarLogin();

    const sessao = await auth.login({ email: USUARIO.email, senha: SENHA }, META);

    expect(sessao.usuario.id).toBe(USUARIO.id);
    expect(auditoria.registrar).toHaveBeenCalledTimes(1);
    expect(auditoria.registrar).toHaveBeenCalledWith({
      usuarioId: USUARIO.id,
      acao: 'LOGIN_SUCESSO',
      ip: META.ip,
    });
    // Só registra quando a sessão foi de fato criada
    expect(tokens.delegate.create.mock.invocationCallOrder[0]).toBeLessThan(
      auditoria.registrar.mock.invocationCallOrder[0],
    );
  });

  it('senha errada registra só LOGIN_FALHA', async () => {
    const { auth, auditoria } = montarLogin();

    await expect(
      auth.login({ email: USUARIO.email, senha: 'outra-senha' }, META),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(acoes(auditoria)).toEqual(['LOGIN_FALHA']);
  });

  it('conta bloqueada (mesmo com a senha certa) ou e-mail inexistente não registram LOGIN_SUCESSO', async () => {
    const bloqueada = montarLogin({ statusConta: 'BLOQUEADO' });
    await expect(
      bloqueada.auth.login({ email: USUARIO.email, senha: SENHA }, META),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(acoes(bloqueada.auditoria)).not.toContain('LOGIN_SUCESSO');

    const inexistente = montarLogin(null);
    await expect(
      inexistente.auth.login({ email: 'ninguem@exemplo.com', senha: SENHA }, META),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(inexistente.auditoria.registrar).not.toHaveBeenCalled();
  });

  it('falha ao abrir a sessão: nada de LOGIN_SUCESSO', async () => {
    const { auth, auditoria, tokens } = montarLogin();
    tokens.delegate.create.mockRejectedValueOnce(new Error('banco fora do ar'));

    await expect(auth.login({ email: USUARIO.email, senha: SENHA }, META)).rejects.toThrow(
      'banco fora do ar',
    );
    expect(acoes(auditoria)).not.toContain('LOGIN_SUCESSO');
  });
});
