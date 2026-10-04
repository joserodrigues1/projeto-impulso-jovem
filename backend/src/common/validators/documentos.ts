import { registerDecorator, ValidationOptions } from 'class-validator';

export const somenteDigitos = (valor: string | null | undefined): string =>
  (valor ?? '').replace(/\D/g, '');

export function cpfValido(valor: string): boolean {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (tamanho: number) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(cpf[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
}

export function cnpjValido(valor: string): boolean {
  const cnpj = somenteDigitos(valor);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const digito = (tamanho: number) => {
    const pesos =
      tamanho === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(cnpj[i]) * pesos[i];
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return digito(12) === Number(cnpj[12]) && digito(13) === Number(cnpj[13]);
}

function criarValidador(nome: string, mensagem: string, fn: (v: string) => boolean) {
  return (opcoes?: ValidationOptions) => (alvo: object, propriedade: string) =>
    registerDecorator({
      name: nome,
      target: alvo.constructor,
      propertyName: propriedade,
      options: { message: mensagem, ...opcoes },
      validator: { validate: (v: unknown) => typeof v === 'string' && fn(v) },
    });
}

export const IsCpf = criarValidador('isCpf', 'CPF inválido', cpfValido);
export const IsCnpj = criarValidador('isCnpj', 'CNPJ inválido', cnpjValido);

/** Senha forte: mínimo 8 caracteres, com letras e números. */
export const SENHA_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;
export const SENHA_MENSAGEM = 'A senha deve ter entre 8 e 72 caracteres, com letras e números';
