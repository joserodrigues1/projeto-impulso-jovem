import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { normalizarTelefone, TELEFONE_NORMALIZADO_REGEX } from '../../common/validators/telefone';

const aparar = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const vazioParaUndefined = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const v = value.trim();
  return v === '' ? undefined : v;
};

/**
 * A IA pode devolver texto corrido ou uma lista de itens.
 * Listas viram uma linha por item (o frontend exibe cada linha como um tópico).
 */
const listaOuTexto = ({ value }: { value: unknown }) => {
  if (Array.isArray(value)) {
    return value
      .filter((i): i is string => typeof i === 'string' && i.trim() !== '')
      .map((i) => i.trim())
      .join('\n');
  }
  return typeof value === 'string' ? value.trim() : value;
};

const TEXTO_FEEDBACK_MAX = 5000;

/** Payload enviado pelo n8n ao final de uma simulação de entrevista. */
export class RegistrarEntrevistaDto {
  @ApiProperty({ example: '5561999999999', description: 'WhatsApp do usuário (qualquer formato)' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? (normalizarTelefone(value) ?? value) : value,
  )
  @IsString()
  @Matches(TELEFONE_NORMALIZADO_REGEX, { message: 'WhatsApp inválido' })
  telefone: string;

  @ApiProperty({ example: 'Jovem Aprendiz Administrativo' })
  @Transform(aparar)
  @IsString()
  @Length(2, 150)
  cargoAlvo: string;

  @ApiPropertyOptional({ example: 'Banco do Brasil' })
  @IsOptional()
  @Transform(vazioParaUndefined)
  @IsString()
  @MaxLength(150)
  empresaAlvo?: string;

  @ApiProperty({
    description: 'Texto ou lista de itens',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  @Transform(listaOuTexto)
  @IsString()
  @Length(1, TEXTO_FEEDBACK_MAX)
  pontosFortes: string;

  @ApiProperty({
    description: 'Texto ou lista de itens',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  @Transform(listaOuTexto)
  @IsString()
  @Length(1, TEXTO_FEEDBACK_MAX)
  pontosMelhoria: string;

  @ApiProperty({
    description: 'Texto ou lista de itens',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  @Transform(listaOuTexto)
  @IsString()
  @Length(1, TEXTO_FEEDBACK_MAX)
  dicasComunicacao: string;

  @ApiPropertyOptional({ description: 'Data/hora da simulação (ISO 8601). Padrão: agora.' })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'dataRealizacao deve ser uma data ISO 8601 válida' })
  dataRealizacao?: Date;
}
