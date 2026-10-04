import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { env } from '../config/env';

/**
 * Cliente Redis com helpers de cache. Falhas de cache são toleradas (degradação graciosa):
 * se o Redis estiver indisponível, a aplicação continua consultando o banco.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor() {
    this.client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: false });
    this.client.on('error', (e) => this.logger.warn(`Redis: ${e.message}`));
  }

  async obterJson<T>(chave: string): Promise<T | null> {
    try {
      const v = await this.client.get(chave);
      return v ? (JSON.parse(v) as T) : null;
    } catch {
      return null;
    }
  }

  async salvarJson(chave: string, valor: unknown, ttlSegundos: number): Promise<void> {
    try {
      await this.client.set(chave, JSON.stringify(valor), 'EX', ttlSegundos);
    } catch {
      /* cache opcional */
    }
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
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
