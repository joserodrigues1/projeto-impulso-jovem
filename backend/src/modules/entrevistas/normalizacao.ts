/**
 * Utilitários para tratar dados não confiáveis (respostas da IA, mensagens do WhatsApp)
 * antes de gravar no banco.
 */
import { normalizarTelefone } from '../../common/validators/telefone';

export type Objeto = Record<string, unknown>;

/** Domínios de JID do WhatsApp que carregam o número de telefone. */
const DOMINIOS_TELEFONE = new Set(['s.whatsapp.net', 'c.us']);

/**
 * Telefone normalizado a partir do que o n8n envia: número em qualquer formato ou JID do
 * WhatsApp ("5561999999999@s.whatsapp.net", com ou sem ":dispositivo").
 * IDs que não são telefone (grupos `@g.us`, `@lid`) dão `null`: os dígitos deles poderiam
 * coincidir com o número de outra pessoa.
 */
export function telefoneDoWhatsapp(valor: string): string | null {
  const bruto = valor.trim().slice(0, 60);
  const arroba = bruto.indexOf('@');
  if (arroba < 0) return normalizarTelefone(bruto);
  if (!DOMINIOS_TELEFONE.has(bruto.slice(arroba + 1).toLowerCase())) return null;
  return normalizarTelefone(bruto.slice(0, arroba).split(':')[0]);
}

export const ehObjeto = (v: unknown): v is Objeto =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

// Caracteres de controle (menos \t, \n e \r): o PostgreSQL recusa \u0000 em texto e JSONB
// eslint-disable-next-line no-control-regex
const CONTROLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
// Metade de um emoji (surrogate sem par): o JSONB recusa
const SURROGATE_SOLTO = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

/**
 * Remove caracteres que o banco recusa e normaliza espaços.
 * `multilinha = false` junta tudo em uma linha só.
 */
export function sanitizarTexto(texto: string, multilinha = true): string {
  const limpo = texto.replace(CONTROLE, '').replace(SURROGATE_SOLTO, '');
  if (!multilinha) return limpo.replace(/\s+/g, ' ').trim();
  return limpo
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Corta no limite sem deixar metade de um emoji no final. */
export function cortar(texto: string, max: number): string {
  if (texto.length <= max) return texto;
  return texto
    .slice(0, max)
    .replace(/[\uD800-\uDBFF]$/, '')
    .trimEnd();
}

/** Texto sanitizado e cortado; '' quando o valor não é string. */
export function textoLimpo(valor: unknown, max: number, multilinha = false): string {
  if (typeof valor !== 'string') return '';
  return cortar(sanitizarTexto(valor, multilinha), max);
}

/**
 * Converte os itens de uma lista, descartando os inválidos, até `max` itens válidos.
 * Só olha os primeiros itens da lista para limitar o trabalho com entradas enormes.
 */
export function itensValidos<T>(
  valor: unknown,
  max: number,
  converter: (item: unknown) => T | null,
): T[] {
  if (!Array.isArray(valor)) return [];
  const saida: T[] = [];
  for (const item of valor.slice(0, Math.max(max * 4, 20))) {
    const convertido = converter(item);
    if (convertido !== null) saida.push(convertido);
    if (saida.length >= max) break;
  }
  return saida;
}

export function primeiroNome(nomeCompleto: string): string {
  return nomeCompleto.trim().split(/\s+/)[0] ?? '';
}
