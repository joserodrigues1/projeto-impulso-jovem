import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env';

export const N8N_API_KEY_HEADER = 'x-api-key';

/** Comparação em tempo constante (evita timing attacks), independente do tamanho. */
export function iguaisSeguro(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** `true` quando a requisição traz a chave do n8n correta (e a integração está configurada). */
export function temChaveN8nValida(req: Pick<Request, 'headers'>): boolean {
  const esperado = env.N8N_API_KEY;
  const recebido = req.headers[N8N_API_KEY_HEADER];
  return !!esperado && typeof recebido === 'string' && iguaisSeguro(recebido, esperado);
}

/**
 * Protege os webhooks consumidos pelo n8n (servidor → servidor).
 * Use junto com `@Public()`, pois não há sessão de usuário nessas chamadas.
 */
@Injectable()
export class N8nApiKeyGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    if (!env.N8N_API_KEY) {
      throw new ServiceUnavailableException('Integração com o n8n não configurada (N8N_API_KEY)');
    }
    if (!temChaveN8nValida(ctx.switchToHttp().getRequest<Request>())) {
      throw new UnauthorizedException('Chave de API inválida');
    }
    return true;
  }
}
