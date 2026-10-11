import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Params } from 'nestjs-pino';
import type { TransportSingleOptions } from 'pino';
import { mascararUrl } from './mascarar-url';

/** O healthcheck é chamado o tempo todo — não polui o log. */
function ehRotaSaude(req: IncomingMessage & { originalUrl?: string }): boolean {
  return (req.originalUrl ?? req.url ?? '').split('?')[0].endsWith('/saude');
}

/** Cabeçalhos com credenciais — nunca vão para o log (LGPD/segurança). */
const CAMPOS_SENSIVEIS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'res.headers["set-cookie"]',
];

/** Saída legível no terminal em desenvolvimento, se o pino-pretty estiver instalado. */
function transporteDesenvolvimento(producao: boolean): TransportSingleOptions | undefined {
  if (producao) return undefined;
  try {
    require.resolve('pino-pretty');
  } catch {
    return undefined;
  }
  return {
    target: 'pino-pretty',
    options: { singleLine: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
  };
}

/**
 * Configuração do nestjs-pino. Registra método, rota (sem query string e com números
 * longos mascarados), status e tempo de resposta — sem corpo, IP ou cabeçalhos.
 */
export function configuracaoLogger(producao: boolean): Params {
  return {
    pinoHttp: {
      level: producao ? 'info' : 'debug',
      transport: transporteDesenvolvimento(producao),
      redact: { paths: CAMPOS_SENSIVEIS, censor: '[oculto]' },
      autoLogging: { ignore: ehRotaSaude },
      customLogLevel: (_req: IncomingMessage, res: ServerResponse, erro?: Error) => {
        if (erro || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      serializers: {
        req: (req: { id?: unknown; method?: string; url?: string }) => ({
          id: req.id,
          method: req.method,
          url: mascararUrl(req.url),
        }),
        res: (res: { statusCode?: number }) => ({ statusCode: res.statusCode }),
      },
    },
  };
}
