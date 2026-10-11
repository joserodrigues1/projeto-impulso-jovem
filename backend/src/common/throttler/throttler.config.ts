import { Logger, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { normalizeIp } from '@nestjs/throttler';
import type { ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import type { Request } from 'express';
import { env } from '../../config/env';
import { redisSemConexao } from '../../infra/redis.service';
import { sha256 } from '../crypto/crypto.util';
import { extrairToken, JwtPayload, REFRESH_COOKIE, usuarioDoPayload } from '../guards/auth.guards';
import { temChaveN8nValida } from '../guards/n8n-api-key.guard';

type ThrottlerStorageRecord = Awaited<ReturnType<ThrottlerStorage['increment']>>;

const TEMPO_MAXIMO_REDIS_MS = 1500;

/**
 * Armazenamento do rate limit no Redis que "falha aberto": se o Redis cair ou demorar,
 * a requisição passa sem contagem em vez de virar erro 500 para todo mundo.
 */
export class ArmazenamentoThrottlerTolerante implements ThrottlerStorage, OnModuleDestroy {
  private readonly logger = new Logger('RateLimit');
  private ultimoAviso = 0;

  constructor(private readonly redis: ThrottlerStorageRedisService) {
    // Sem ouvinte de 'error', o ioredis imprime "Unhandled error event" a cada reconexão.
    // O aviso (com limite de frequência) já sai em `increment`.
    redis.redis.on('error', () => undefined);
  }

  private liberar(ttl: number, motivo: string): ThrottlerStorageRecord {
    // Evita inundar o log enquanto o Redis estiver fora
    if (Date.now() - this.ultimoAviso > 60_000) {
      this.ultimoAviso = Date.now();
      this.logger.warn(`Rate limit sem Redis (requisições liberadas): ${motivo}`);
    }
    return {
      totalHits: 0,
      timeToExpire: Math.ceil(ttl / 1000),
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    // Sem conexão: libera na hora, sem esperar o tempo máximo em cada requisição
    if (redisSemConexao(this.redis.redis)) return this.liberar(ttl, 'sem conexão');
    let timer: NodeJS.Timeout | undefined;
    try {
      const limite = new Promise<never>((_, rejeitar) => {
        timer = setTimeout(() => rejeitar(new Error('tempo esgotado')), TEMPO_MAXIMO_REDIS_MS);
      });
      return await Promise.race([
        this.redis.increment(key, ttl, limit, blockDuration, throttlerName),
        limite,
      ]);
    } catch (e) {
      return this.liberar(ttl, (e as Error).message);
    } finally {
      clearTimeout(timer);
    }
  }

  onModuleDestroy() {
    this.redis.onModuleDestroy();
  }
}

type RequisicaoRastreada = Record<string, unknown>;

/** Chave por IP (`req.ip`, que respeita o `trust proxy`). IPv6 é agrupado por sub-rede (/64). */
export function rastreadorPorIp(req: RequisicaoRastreada): string {
  const ip = (req as unknown as Request).ip;
  return `ip:${ip ? normalizeIp(ip) : 'desconhecido'}`;
}

/**
 * Rotas públicas de autenticação (cadastro, login, recuperar/redefinir senha): sempre por IP.
 * Um token válido NÃO troca a chave — senão cada conta criada daria um balde novo.
 */
export const rastreadorAuthPublica = (req: RequisicaoRastreada): string => rastreadorPorIp(req);

/**
 * Renovação de sessão: chave pelo refresh token (hash), não pelo IP. O token é aleatório
 * (48 bytes) e cada sessão tem a sua cota — várias pessoas atrás da mesma rede (escola,
 * proxy do Next) não se derrubam. Sem cookie, cai no IP.
 */
export function rastreadorRefresh(req: RequisicaoRastreada): string {
  const cookies = (req as unknown as Request).cookies as Record<string, unknown> | undefined;
  const token = cookies?.[REFRESH_COOKIE];
  if (typeof token === 'string' && token.length >= 32 && token.length <= 512) {
    return `refresh:${sha256(token)}`;
  }
  return rastreadorPorIp(req);
}

/**
 * Chave padrão do rate limit: usuário logado → o próprio usuário (cada um tem sua cota, mesmo
 * que todos cheguem pelo mesmo IP do proxy do Next); visitante → IP. As rotas públicas de
 * autenticação usam `rastreadorAuthPublica`/`rastreadorRefresh` (via `@Throttle`).
 */
export function criarRastreador(jwt: JwtService) {
  return (req: RequisicaoRastreada): string => {
    const requisicao = req as unknown as Request;
    const token = extrairToken(requisicao);
    if (token) {
      try {
        const usuario = usuarioDoPayload(jwt.verify<JwtPayload>(token));
        if (usuario) return `usuario:${usuario.id}`;
      } catch {
        /* token inválido/expirado → cai no IP */
      }
    }
    return rastreadorPorIp(req);
  };
}

export function configuracaoThrottler(): ThrottlerModuleOptions {
  const jwt = new JwtService({
    secret: env.JWT_ACCESS_SECRET,
    verifyOptions: { algorithms: ['HS256'] },
  });
  return {
    // Limite geral: 100 requisições por minuto (rotas sensíveis têm @Throttle próprio)
    throttlers: [{ ttl: 60_000, limit: 100 }],
    storage: new ArmazenamentoThrottlerTolerante(
      new ThrottlerStorageRedisService(env.REDIS_URL, { maxRetriesPerRequest: 1 }),
    ),
    errorMessage: 'Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo.',
    getTracker: criarRastreador(jwt),
    // Chamadas do n8n (servidor → servidor, com chave secreta) não entram no rate limit:
    // todas as conversas do WhatsApp chegam do mesmo IP.
    skipIf: (ctx) => temChaveN8nValida(ctx.switchToHttp().getRequest<Request>()),
  };
}
