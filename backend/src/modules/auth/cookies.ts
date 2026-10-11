import type { CookieOptions, Request, Response } from 'express';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '../../common/guards/auth.guards';
import { env } from '../../config/env';

/** Path antigo do cookie de refresh (antes do proxy do Next) — só para limpeza. */
const PATH_REFRESH_LEGADO = '/api/v1/auth/refresh';

const BASE: CookieOptions = {
  httpOnly: true,
  // Sem COOKIE_SECURE definida o valor é false: o servidor pode estar sem HTTPS e, com
  // `secure: true`, o navegador descartaria os cookies e ninguém conseguiria logar.
  // Com HTTPS, defina COOKIE_SECURE=true no .env.
  secure: env.COOKIE_SECURE,
  sameSite: 'lax',
};

const OPCOES_ACCESS: CookieOptions = { ...BASE, path: '/' };

/**
 * O navegador fala com a API pelo proxy do Next (`/api-proxy/*`), então o cookie de
 * refresh precisa valer para `/api-proxy/auth` (refresh e logout) — ver COOKIE_REFRESH_PATH.
 */
const OPCOES_REFRESH: CookieOptions = { ...BASE, path: env.COOKIE_REFRESH_PATH };

export interface TokensSessao {
  accessToken: string;
  refreshToken: string;
}

export function aplicarCookiesSessao(res: Response, sessao: TokensSessao): void {
  res.cookie(ACCESS_COOKIE, sessao.accessToken, {
    ...OPCOES_ACCESS,
    maxAge: env.JWT_ACCESS_TTL_MIN * 60_000,
  });
  res.cookie(REFRESH_COOKIE, sessao.refreshToken, {
    ...OPCOES_REFRESH,
    maxAge: env.JWT_REFRESH_TTL_DAYS * 86_400_000,
  });
}

export function limparCookiesSessao(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, OPCOES_ACCESS);
  res.clearCookie(REFRESH_COOKIE, OPCOES_REFRESH);
  if (env.COOKIE_REFRESH_PATH !== PATH_REFRESH_LEGADO) {
    res.clearCookie(REFRESH_COOKIE, { ...OPCOES_REFRESH, path: PATH_REFRESH_LEGADO });
  }
}

export function lerRefreshToken(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const token = cookies?.[REFRESH_COOKIE];
  return typeof token === 'string' && token ? token : undefined;
}
