export const somenteDigitos = (valor: string | null | undefined): string =>
  (valor ?? '').replace(/\D/g, '');

/** Senha forte: de 8 a 72 caracteres, com letras e números. */
export const SENHA_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;
export const SENHA_MENSAGEM = 'A senha deve ter entre 8 e 72 caracteres, com letras e números';
