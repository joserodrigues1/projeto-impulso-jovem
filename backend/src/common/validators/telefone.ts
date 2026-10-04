/**
 * Utilitários de telefone (WhatsApp) — padrão brasileiro.
 *
 * Formato armazenado: 55 + DDD + número, somente dígitos.
 *   ex.: "(61) 99999-9999" → "5561999999999"
 *
 * O WhatsApp identifica alguns celulares brasileiros antigos SEM o 9º dígito
 * (ex.: 556199999999), por isso a busca usa `variantesTelefone`.
 */

/** Regex do formato normalizado: 55 + DDD (11–99) + 8 ou 9 dígitos. */
export const TELEFONE_NORMALIZADO_REGEX = /^55[1-9][1-9]\d{8,9}$/;

/** Normaliza um telefone brasileiro. Retorna `null` se não for um número válido. */
export function normalizarTelefone(valor: string): string | null {
  let digitos = valor.replace(/\D/g, '').replace(/^0+/, '');
  // Número local (DDD + número) → adiciona o código do país
  if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`;
  return TELEFONE_NORMALIZADO_REGEX.test(digitos) ? digitos : null;
}

/** Variações do mesmo número (com e sem o 9º dígito) para busca/unicidade. */
export function variantesTelefone(normalizado: string): string[] {
  const ddd = normalizado.slice(2, 4);
  const numero = normalizado.slice(4);
  if (numero.length === 9 && numero.startsWith('9')) {
    return [normalizado, `55${ddd}${numero.slice(1)}`];
  }
  // Celulares têm 8 dígitos começando com 6–9 quando o 9º dígito é omitido
  if (numero.length === 8 && /^[6-9]/.test(numero)) {
    return [normalizado, `55${ddd}9${numero}`];
  }
  return [normalizado];
}

/** Formata para exibição: "5561999999999" → "(61) 99999-9999". */
export function formatarTelefone(normalizado: string): string {
  const ddd = normalizado.slice(2, 4);
  const numero = normalizado.slice(4);
  const corte = numero.length - 4;
  return `(${ddd}) ${numero.slice(0, corte)}-${numero.slice(corte)}`;
}
