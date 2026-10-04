import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from 'node:crypto';
import { env } from '../../config/env';

const CHAVE = Buffer.from(env.DATA_ENCRYPTION_KEY, 'hex');
const VERSAO = 'v1';

/** Criptografa um texto com AES-256-GCM. Formato: v1:iv:tag:dados (base64). */
export function criptografar(texto: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', CHAVE, iv);
  const dados = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSAO, iv.toString('base64'), tag.toString('base64'), dados.toString('base64')].join(':');
}

export function descriptografar(payload: string): string {
  const [versao, iv, tag, dados] = payload.split(':');
  if (versao !== VERSAO || !iv || !tag || !dados) {
    throw new Error('Formato de dado criptografado inválido');
  }
  const decipher = createDecipheriv('aes-256-gcm', CHAVE, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dados, 'base64')), decipher.final()]).toString(
    'utf8',
  );
}

/** HMAC-SHA256 determinístico — usado para unicidade/busca de dados sensíveis. */
export function hmac(valor: string): string {
  return createHmac('sha256', env.DATA_HASH_KEY).update(valor).digest('hex');
}

export function sha256(valor: string): string {
  return createHash('sha256').update(valor).digest('hex');
}

export function tokenAleatorio(bytes = 48): string {
  return randomBytes(bytes).toString('base64url');
}

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Código legível para validação pública de certificados. Ex.: IJ-7KQ2-M9XA */
export function gerarCodigoCertificado(): string {
  const bytes = randomBytes(8);
  let s = '';
  for (const b of bytes) s += ALFABETO[b % ALFABETO.length];
  return `IJ-${s.slice(0, 4)}-${s.slice(4)}`;
}

export function mascararCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return '***.***.***-**';
  return `***.${d.slice(3, 6)}.***-${d.slice(9)}`;
}
