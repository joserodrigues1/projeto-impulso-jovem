import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AutorMensagem, TipoMensagem } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { TELEFONE_NORMALIZADO_REGEX } from '../../common/validators/telefone';
import { sanitizarTexto, telefoneDoWhatsapp, textoLimpo } from './normalizacao';
import { MOTIVOS_FINALIZACAO, MotivoFinalizacao } from './regras-sessao';
import { desembrulharRelatorio, normalizarRelatorio } from './relatorio-entrevista';

type ValorTransform = { value: unknown };

// O n8n costuma mandar "" (ou null) quando uma expressão não tem valor: tratamos como ausente.
const vazioParaUndefined = ({ value }: ValorTransform) => {
  if (value === null) return undefined;
  if (typeof value !== 'string') return value;
  const v = value.trim();
  return v === '' ? undefined : v;
};

/** Aceita qualquer formato de telefone (inclusive o JID do WhatsApp) e normaliza. */
const telefoneNormalizado = ({ value }: ValorTransform) => {
  if (value === null) return undefined;
  const texto = typeof value === 'number' ? String(value) : value;
  if (typeof texto !== 'string') return texto;
  const v = texto.trim();
  if (v === '') return undefined;
  // Inválido segue como veio (cortado) para o @Matches recusar
  return telefoneDoWhatsapp(v) ?? v.slice(0, 60);
};

const maiusculas = ({ value }: ValorTransform) => {
  if (value === null) return undefined;
  if (typeof value !== 'string') return value;
  const v = value.trim().toUpperCase();
  return v === '' ? undefined : v;
};

/** Data opcional: vazio vira ausente; texto inválido vira data inválida (o @IsDate recusa). */
const dataOpcional = ({ value }: ValorTransform) => {
  if (value === null) return undefined;
  if (typeof value === 'number') return new Date(value);
  if (typeof value !== 'string') return value;
  const v = value.trim();
  return v === '' ? undefined : new Date(v);
};

/** O relatório pode chegar como objeto, string JSON, `[{...}]` ou `{ output }`. */
const relatorioDesembrulhado = ({ value }: ValorTransform) => {
  if (value === null) return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return desembrulharRelatorio(value) ?? value;
};

/**
 * Texto curto opcional vindo da IA: limpa e corta no limite em vez de recusar
 * (recusar faria o n8n perder a mensagem/relatório inteiro por causa de um detalhe).
 */
const textoCurtoOpcional =
  (max: number, min = 1) =>
  ({ value }: ValorTransform) => {
    if (value === null) return undefined;
    if (typeof value !== 'string') return value;
    const v = textoLimpo(value, max);
    return v.length >= min ? v : undefined;
  };

/**
 * A IA pode devolver texto corrido ou uma lista de itens.
 * Listas viram uma linha por item (o frontend exibe cada linha como um tópico).
 */
const listaOuTexto = ({ value }: ValorTransform) => {
  if (value === null) return undefined;
  if (Array.isArray(value)) {
    const texto = value
      .filter((i): i is string => typeof i === 'string')
      .map((i) => sanitizarTexto(i, false))
      .filter(Boolean)
      .join('\n');
    return texto || undefined;
  }
  return typeof value === 'string' ? sanitizarTexto(value) || undefined : value;
};

const numero = ({ value }: ValorTransform) => {
  if (value === null) return undefined;
  if (typeof value !== 'string') return value;
  const v = value.trim().replace(',', '.');
  if (v === '') return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? value : n;
};

export const TEXTO_FEEDBACK_MAX = 5000;
export const CONTEUDO_MENSAGEM_MAX = 8000;
const CARGO_MAX = 150;

const LISTA_OU_TEXTO = {
  description: 'Texto ou lista de itens. Obrigatório quando não há `relatorio` válido.',
  oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
};

/** Os textos legados só são exigidos quando o relatório estruturado não é aproveitável. */
function semRelatorioValido(o: RegistrarEntrevistaDto): boolean {
  return normalizarRelatorio(o.relatorio, { notaGeral: o.notaGeral }) === null;
}

/** Payload enviado pelo n8n ao final de uma simulação de entrevista (registra o relatório). */
export class RegistrarEntrevistaDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Sessão de origem (recomendado). Com ele, o telefone é opcional.',
  })
  @IsOptional()
  @Transform(vazioParaUndefined)
  @IsUUID('all', { message: 'sessaoId deve ser um UUID válido' })
  sessaoId?: string;

  @ApiPropertyOptional({
    example: '5561999999999',
    description: 'WhatsApp do usuário (qualquer formato). Obrigatório quando não há sessaoId.',
  })
  @ValidateIf((o: RegistrarEntrevistaDto) => !o.sessaoId || o.telefone !== undefined)
  @Transform(telefoneNormalizado)
  @IsString({ message: 'Informe o telefone quando não houver sessaoId' })
  @Matches(TELEFONE_NORMALIZADO_REGEX, { message: 'WhatsApp inválido' })
  telefone?: string;

  @ApiPropertyOptional({
    example: 'Jovem Aprendiz Administrativo',
    description: 'Se ausente, usa o cargo da sessão ou "Entrevista simulada".',
  })
  @IsOptional()
  @Transform(textoCurtoOpcional(CARGO_MAX, 2))
  @IsString({ message: 'cargoAlvo deve ser um texto' })
  cargoAlvo?: string;

  @ApiPropertyOptional({ example: 'Banco do Brasil' })
  @IsOptional()
  @Transform(textoCurtoOpcional(CARGO_MAX))
  @IsString({ message: 'empresaAlvo deve ser um texto' })
  empresaAlvo?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 10, example: 7.5 })
  @IsOptional()
  @Transform(numero)
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'notaGeral deve ser um número de 0 a 10' },
  )
  @Min(0, { message: 'notaGeral deve ser um número de 0 a 10' })
  @Max(10, { message: 'notaGeral deve ser um número de 0 a 10' })
  notaGeral?: number;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'RelatorioEntrevista v1 (docs/ARQUITETURA.md, seção 4.2). Normalizado pela API.',
  })
  @IsOptional()
  @Transform(relatorioDesembrulhado)
  @IsObject({ message: 'relatorio deve ser um objeto' })
  relatorio?: Record<string, unknown>;

  @ApiPropertyOptional(LISTA_OU_TEXTO)
  @ValidateIf((o: RegistrarEntrevistaDto) => o.pontosFortes !== undefined || semRelatorioValido(o))
  @Transform(listaOuTexto)
  @IsString({ message: 'Informe pontosFortes (texto ou lista) ou um relatorio válido' })
  @Length(1, TEXTO_FEEDBACK_MAX, {
    message: `pontosFortes deve ter até ${TEXTO_FEEDBACK_MAX} caracteres`,
  })
  pontosFortes?: string;

  @ApiPropertyOptional(LISTA_OU_TEXTO)
  @ValidateIf(
    (o: RegistrarEntrevistaDto) => o.pontosMelhoria !== undefined || semRelatorioValido(o),
  )
  @Transform(listaOuTexto)
  @IsString({ message: 'Informe pontosMelhoria (texto ou lista) ou um relatorio válido' })
  @Length(1, TEXTO_FEEDBACK_MAX, {
    message: `pontosMelhoria deve ter até ${TEXTO_FEEDBACK_MAX} caracteres`,
  })
  pontosMelhoria?: string;

  @ApiPropertyOptional(LISTA_OU_TEXTO)
  @ValidateIf(
    (o: RegistrarEntrevistaDto) => o.dicasComunicacao !== undefined || semRelatorioValido(o),
  )
  @Transform(listaOuTexto)
  @IsString({ message: 'Informe dicasComunicacao (texto ou lista) ou um relatorio válido' })
  @Length(1, TEXTO_FEEDBACK_MAX, {
    message: `dicasComunicacao deve ter até ${TEXTO_FEEDBACK_MAX} caracteres`,
  })
  dicasComunicacao?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Data/hora da simulação (ISO 8601). Padrão: início da sessão ou agora.',
  })
  @IsOptional()
  @Transform(dataOpcional)
  @IsDate({ message: 'dataRealizacao deve ser uma data ISO 8601 válida' })
  dataRealizacao?: Date;
}

/** Mensagem da simulação (do candidato ou da IA) registrada pelo n8n. */
export class RegistrarMensagemDto {
  @ApiProperty({ example: '5561999999999', description: 'WhatsApp do usuário (qualquer formato)' })
  @Transform(telefoneNormalizado)
  @IsString({ message: 'Informe o telefone' })
  @Matches(TELEFONE_NORMALIZADO_REGEX, { message: 'WhatsApp inválido' })
  telefone: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Sessão em que a mensagem deve entrar (recomendado na resposta da IA). Se ela já tiver sido ' +
      'encerrada, responde 409 e nada é gravado.',
  })
  @IsOptional()
  @Transform(vazioParaUndefined)
  @IsUUID('all', { message: 'sessaoId deve ser um UUID válido' })
  sessaoId?: string;

  @ApiProperty({ enum: AutorMensagem })
  @Transform(maiusculas)
  @IsEnum(AutorMensagem, { message: 'autor deve ser CANDIDATO ou RECRUTADORA' })
  autor: AutorMensagem;

  @ApiProperty({
    maxLength: CONTEUDO_MENSAGEM_MAX,
    description: `Texto da mensagem (ou transcrição do áudio). Acima de ${CONTEUDO_MENSAGEM_MAX} caracteres é cortado.`,
  })
  @Transform(({ value }: ValorTransform) =>
    typeof value === 'string' ? textoLimpo(value, CONTEUDO_MENSAGEM_MAX, true) : value,
  )
  @IsString({ message: 'conteudo deve ser um texto' })
  @IsNotEmpty({ message: 'conteudo não pode ser vazio' })
  conteudo: string;

  @ApiPropertyOptional({ enum: TipoMensagem, default: TipoMensagem.TEXTO })
  @IsOptional()
  @Transform(maiusculas)
  @IsEnum(TipoMensagem, { message: 'tipo deve ser TEXTO ou AUDIO' })
  tipo?: TipoMensagem;

  @ApiPropertyOptional({ example: 'Jovem Aprendiz Administrativo' })
  @IsOptional()
  @Transform(textoCurtoOpcional(CARGO_MAX, 2))
  @IsString({ message: 'cargoAlvo deve ser um texto' })
  cargoAlvo?: string;

  @ApiPropertyOptional({ example: 'Banco do Brasil' })
  @IsOptional()
  @Transform(textoCurtoOpcional(CARGO_MAX))
  @IsString({ message: 'empresaAlvo deve ser um texto' })
  empresaAlvo?: string;
}

export class FinalizarSessaoDto {
  @ApiPropertyOptional({ enum: [...MOTIVOS_FINALIZACAO], default: 'CONCLUIDA' })
  @IsOptional()
  @Transform(maiusculas)
  @IsIn([...MOTIVOS_FINALIZACAO], {
    message: `motivo deve ser um destes: ${MOTIVOS_FINALIZACAO.join(', ')}`,
  })
  motivo?: MotivoFinalizacao;
}

export class SessoesPendentesQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limite deve ser um número inteiro' })
  @Min(1, { message: 'limite deve ser de 1 a 50' })
  @Max(50, { message: 'limite deve ser de 1 a 50' })
  limite: number = 10;
}
