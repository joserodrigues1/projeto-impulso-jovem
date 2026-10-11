import { argon2id, argon2Verify } from 'hash-wasm';
import { randomBytes } from 'node:crypto';

/**
 * Hash de senha com argon2id em WebAssembly (sem binário nativo).
 *
 * Parâmetros novos seguem a recomendação mínima da OWASP (19 MiB, 2 iterações).
 * A verificação lê os parâmetros do próprio hash, então continua aceitando os hashes
 * antigos gravados pelo pacote nativo `argon2` (`$argon2id$v=19$m=65536,p=4,t=3$...`).
 */
const PARAMETROS = {
  iterations: 2,
  memorySize: 19456,
  parallelism: 1,
  hashLength: 32,
} as const;

/** Início dos hashes gerados com os parâmetros atuais. */
const PREFIXO_ATUAL = `$argon2id$v=19$m=${PARAMETROS.memorySize},t=${PARAMETROS.iterations},p=${PARAMETROS.parallelism}$`;

export function hashSenha(senha: string): Promise<string> {
  return argon2id({ ...PARAMETROS, password: senha, salt: randomBytes(16), outputType: 'encoded' });
}

/**
 * `true` para hashes com outros parâmetros (ex.: os legados do argon2 nativo, m=65536,p=4,t=3).
 * No login bem-sucedido o hash é regravado: todos passam a levar o mesmo tempo para conferir
 * (sem pista de quais contas são antigas) e usam menos memória no servidor.
 */
export function precisaAtualizarHash(hash: string): boolean {
  return !hash.startsWith(PREFIXO_ATUAL);
}

/** Nunca lança: hash corrompido ou em formato desconhecido conta como senha errada. */
export async function verificarSenha(hash: string, senha: string): Promise<boolean> {
  try {
    return await argon2Verify({ password: senha, hash });
  } catch {
    return false;
  }
}
