import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { env } from '../config/env';

const TEMPO_MAXIMO_PADRAO_MS = 1000;

/** Estados do ioredis em que não há conexão (comandos ficariam na fila até o tempo máximo). */
const ESTADOS_SEM_CONEXAO = new Set(['connecting', 'reconnecting', 'close', 'end']);

/**
 * `true` quando o cliente sabidamente está sem conexão. Serve para desistir na hora em vez de
 * esperar o tempo máximo a cada requisição enquanto o Redis estiver fora do ar.
 */
export function redisSemConexao(cliente: { status?: string } | undefined): boolean {
  return ESTADOS_SEM_CONEXAO.has(cliente?.status ?? '');
}

/**
 * Cliente Redis com helpers de cache. Falhas de cache são toleradas (degradação graciosa):
 * se o Redis estiver indisponível, a aplicação continua consultando o banco.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private ultimoAviso = 0;
  readonly client: Redis;

  constructor() {
    this.client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: false });
    this.client.on('error', (e) => {
      // Sem Redis, o ioredis tenta reconectar sem parar — um aviso por minuto basta
      if (Date.now() - this.ultimoAviso > 60_000) {
        this.ultimoAviso = Date.now();
        this.logger.warn(`Redis indisponível: ${e.message}`);
      }
    });
  }

  /**
   * Executa uma operação tolerando falhas: Redis fora do ar ou lento → devolve `padrao`
   * em vez de travar ou derrubar a requisição.
   */
  async tentar<T>(
    operacao: (c: Redis) => Promise<T>,
    padrao: T,
    tempoMaximoMs = TEMPO_MAXIMO_PADRAO_MS,
  ): Promise<T> {
    // Sem conexão: devolve o padrão na hora (sem somar 1 s de espera a cada chamada)
    if (redisSemConexao(this.client)) return padrao;
    let timer: NodeJS.Timeout | undefined;
    try {
      const limite = new Promise<T>((resolver) => {
        timer = setTimeout(() => resolver(padrao), tempoMaximoMs);
      });
      return await Promise.race([operacao(this.client), limite]);
    } catch {
      return padrao;
    } finally {
      clearTimeout(timer);
    }
  }

  async obterJson<T>(chave: string): Promise<T | null> {
    const v = await this.tentar((c) => c.get(chave), null);
    if (!v) return null;
    try {
      return JSON.parse(v) as T;
    } catch {
      return null;
    }
  }

  async salvarJson(chave: string, valor: unknown, ttlSegundos: number): Promise<void> {
    await this.tentar((c) => c.set(chave, JSON.stringify(valor), 'EX', ttlSegundos), null);
  }

  /** Retorna do cache ou executa a função e armazena o resultado. */
  async lembrar<T>(chave: string, ttlSegundos: number, fn: () => Promise<T>): Promise<T> {
    const emCache = await this.obterJson<T>(chave);
    if (emCache !== null) return emCache;
    const valor = await fn();
    await this.salvarJson(chave, valor, ttlSegundos);
    return valor;
  }

  async invalidarPrefixo(prefixo: string): Promise<void> {
    try {
      const stream = this.client.scanStream({ match: `${prefixo}*`, count: 200 });
      for await (const chaves of stream as AsyncIterable<string[]>) {
        if (chaves.length) await this.client.del(...chaves);
      }
    } catch {
      /* cache opcional */
    }
  }

  async ping(): Promise<boolean> {
    return this.tentar(async (c) => (await c.ping()) === 'PONG', false);
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
