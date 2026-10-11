import { Transform } from 'class-transformer';
import { IsString, Length, Matches, ValidateIf } from 'class-validator';
import { SENHA_MENSAGEM, SENHA_REGEX } from '../../common/validators/documentos';
import { TELEFONE_NORMALIZADO_REGEX } from '../../common/validators/telefone';
import { normalizarNome, transformarTelefone } from '../auth/auth.dto';

/**
 * Campos opcionais do PATCH /me: ausente = não muda; `null` é recusado com 400 (com
 * @IsOptional ele passaria e o banco recusaria a coluna obrigatória com erro 500).
 */
const informado = (campo: keyof AtualizarContaDto) => (o: AtualizarContaDto) =>
  o[campo] !== undefined;

export class AtualizarContaDto {
  @ValidateIf(informado('nomeCompleto'))
  @Transform(normalizarNome)
  @IsString({ message: 'Informe seu nome completo' })
  @Length(3, 150, { message: 'O nome deve ter entre 3 e 150 caracteres' })
  nomeCompleto?: string;

  /** WhatsApp com DDD — aceita qualquer máscara; é salvo como 55 + DDD + número. */
  @ValidateIf(informado('telefone'))
  @Transform(transformarTelefone)
  @IsString({ message: 'Informe um WhatsApp válido com DDD' })
  @Matches(TELEFONE_NORMALIZADO_REGEX, { message: 'Informe um WhatsApp válido com DDD' })
  telefone?: string;
}

export class AlterarSenhaDto {
  @IsString({ message: 'Informe sua senha atual' })
  @Length(1, 200, { message: 'Informe sua senha atual' })
  senhaAtual: string;

  @IsString({ message: 'Informe a nova senha' })
  @Matches(SENHA_REGEX, { message: SENHA_MENSAGEM })
  novaSenha: string;
}

export class ExcluirContaDto {
  @IsString({ message: 'Digite sua senha para confirmar' })
  @Length(1, 200, { message: 'Digite sua senha para confirmar' })
  senha: string;
}
