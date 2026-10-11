import { isIP } from 'node:net';

/** Valor usado quando TRUST_PROXY é inválido: confia só em proxies de rede local/Docker. */
export const TRUST_PROXY_PADRAO = 'loopback, linklocal, uniquelocal';

const NOMES_PRE_DEFINIDOS = new Set(['loopback', 'linklocal', 'uniquelocal']);

/** Aspas que sobram quando o .env é lido por quem não as remove (ex.: `docker run --env-file`). */
const semAspas = (v: string) =>
  v
    .trim()
    .replace(/^(['"])(.*)\1$/, '$2')
    .trim();

function itemValido(item: string): boolean {
  if (NOMES_PRE_DEFINIDOS.has(item)) return true;
  const [ip, prefixo, ...resto] = item.split('/');
  const versao = isIP(ip);
  if (!versao || resto.length) return false;
  if (prefixo === undefined) return true;
  if (/^\d+$/.test(prefixo)) return Number(prefixo) <= (versao === 4 ? 32 : 128);
  return versao === 4 && isIP(prefixo) === 4; // máscara no formato 255.255.255.0
}

/** Lista de IPs/sub-redes inválida: o Express derrubaria a API na subida com esse valor. */
export function trustProxyInvalido(valor: string): boolean {
  const v = semAspas(valor);
  if (v === 'true' || v === 'false' || /^\d+$/.test(v)) return false;
  const itens = v.split(',').map((i) => i.trim());
  return !itens.length || !itens.every(itemValido);
}

/**
 * Converte TRUST_PROXY no valor aceito pelo `app.set('trust proxy', ...)` do Express:
 * 'true'/'false' → booleano, número inteiro → quantidade de saltos, qualquer outro texto
 * → lista de IPs/sub-redes (ex.: 'loopback, linklocal, uniquelocal').
 * Valor inválido vira o padrão seguro em vez de impedir a API de subir.
 */
export function interpretarTrustProxy(valor: string): boolean | number | string {
  const v = semAspas(valor);
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^\d+$/.test(v)) return Number(v);
  return trustProxyInvalido(v) ? TRUST_PROXY_PADRAO : v;
}
