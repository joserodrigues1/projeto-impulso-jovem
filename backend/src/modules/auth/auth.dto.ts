import { Transform } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { SENHA_MENSAGEM, SENHA_REGEX } from '../../common/validators/documentos';
import { normalizarTelefone, TELEFONE_NORMALIZADO_REGEX } from '../../common/validators/telefone';

const normalizarEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
const aparar = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CadastroUsuarioDto {
  @Transform(aparar)
  @IsString()
  @Length(3, 150, { message: 'O nome deve ter entre 3 e 150 caracteres' })
  nomeCompleto: string;

  @Transform(normalizarEmail)
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(100)
  email: string;

  @IsString()
  @Matches(SENHA_REGEX, { message: SENHA_MENSAGEM })
  senha: string;

  /** WhatsApp com DDD — aceita qualquer máscara; é salvo como 55 + DDD + número. */
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? (normalizarTelefone(value) ?? value) : value,
  )
  @IsString({ message: 'O WhatsApp é obrigatório para falar com a IA' })
  @Matches(TELEFONE_NORMALIZADO_REGEX, { message: 'Informe um WhatsApp válido com DDD' })
  telefone: string;

  /** Consentimento explícito LGPD — obrigatório. */
  @IsBoolean()
  @Equals(true, { message: 'É necessário aceitar os termos de uso e a política de privacidade' })
  aceiteTermos: boolean;
}

export class LoginDto {
  @Transform(normalizarEmail)
  @IsEmail({}, { message: 'E-mail inválido' })
  email: string;

  @IsString()
  @Length(1, 200)
  senha: string;
}

export class RecuperarSenhaDto {
  @Transform(normalizarEmail)
  @IsEmail({}, { message: 'E-mail inválido' })
  email: string;
}

export class RedefinirSenhaDto {
  @IsString()
  @Length(20, 200)
  token: string;

  @IsString()
  @Matches(SENHA_REGEX, { message: SENHA_MENSAGEM })
  novaSenha: string;
}
