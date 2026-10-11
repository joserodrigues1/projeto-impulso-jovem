import { Transform } from 'class-transformer';
import { Equals, IsBoolean, IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator';
import { SENHA_MENSAGEM, SENHA_REGEX } from '../../common/validators/documentos';
import { normalizarTelefone, TELEFONE_NORMALIZADO_REGEX } from '../../common/validators/telefone';

export const normalizarEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/** Tira espaços das pontas e junta espaços repetidos ("  Ana   Souza " → "Ana Souza"). */
export const normalizarNome = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

/** Aceita qualquer máscara; vira 55 + DDD + número. Inválido segue como veio para o @Matches recusar. */
export const transformarTelefone = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? (normalizarTelefone(value) ?? value) : value;

export class CadastroUsuarioDto {
  @Transform(normalizarNome)
  @IsString({ message: 'Informe seu nome completo' })
  @Length(3, 150, { message: 'O nome deve ter entre 3 e 150 caracteres' })
  nomeCompleto: string;

  @Transform(normalizarEmail)
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(100, { message: 'O e-mail deve ter no máximo 100 caracteres' })
  email: string;

  @IsString({ message: 'Informe uma senha' })
  @Matches(SENHA_REGEX, { message: SENHA_MENSAGEM })
  senha: string;

  /** WhatsApp com DDD — aceita qualquer máscara; é salvo como 55 + DDD + número. */
  @Transform(transformarTelefone)
  @IsString({ message: 'O WhatsApp é obrigatório para falar com a IA' })
  @Matches(TELEFONE_NORMALIZADO_REGEX, { message: 'Informe um WhatsApp válido com DDD' })
  telefone: string;

  /** Consentimento explícito LGPD — obrigatório. */
  @IsBoolean({ message: 'É necessário aceitar os termos de uso e a política de privacidade' })
  @Equals(true, { message: 'É necessário aceitar os termos de uso e a política de privacidade' })
  aceiteTermos: boolean;
}

export class LoginDto {
  @Transform(normalizarEmail)
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(254, { message: 'E-mail inválido' })
  email: string;

  @IsString({ message: 'Informe sua senha' })
  @Length(1, 200, { message: 'Informe sua senha' })
  senha: string;
}

export class RecuperarSenhaDto {
  @Transform(normalizarEmail)
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(254, { message: 'E-mail inválido' })
  email: string;
}

export class RedefinirSenhaDto {
  @IsString({ message: 'Link de redefinição inválido' })
  @Length(20, 200, { message: 'Link de redefinição inválido' })
  token: string;

  @IsString({ message: 'Informe a nova senha' })
  @Matches(SENHA_REGEX, { message: SENHA_MENSAGEM })
  novaSenha: string;
}
