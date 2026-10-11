import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { StatusConta } from '@prisma/client';
import { PaginacaoDto } from '../../common/dto/paginacao.dto';
import { UFS } from '../curriculos/curriculo-conteudo';

/** Parâmetro vazio na URL (`?uf=&busca=`) conta como não informado. */
const vazioParaUndefined = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const v = value.trim();
  return v === '' ? undefined : v;
};
const maiusculas = ({ value }: { value: unknown }) => {
  const v = vazioParaUndefined({ value });
  return typeof v === 'string' ? v.toUpperCase() : v;
};

const DIA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DIA_MENSAGEM = 'Use datas no formato AAAA-MM-DD';

export const ORDENACOES_PARTICIPANTES = ['cadastro', 'ultimoAcesso', 'nome', 'ultimaNota'] as const;
export type OrdenacaoParticipantes = (typeof ORDENACOES_PARTICIPANTES)[number];
export const DIRECOES = ['asc', 'desc'] as const;
export type Direcao = (typeof DIRECOES)[number];

export class PeriodoQueryDto {
  @ApiPropertyOptional({
    example: '2026-09-11',
    description: 'Primeiro dia (AAAA-MM-DD, fuso de São Paulo). Padrão: 29 dias antes de `ate`',
  })
  @IsOptional()
  @Transform(vazioParaUndefined)
  @IsString({ message: DIA_MENSAGEM })
  @Matches(DIA_REGEX, { message: DIA_MENSAGEM })
  de?: string;

  @ApiPropertyOptional({
    example: '2026-10-10',
    description: 'Último dia (AAAA-MM-DD, fuso de São Paulo). Padrão: hoje',
  })
  @IsOptional()
  @Transform(vazioParaUndefined)
  @IsString({ message: DIA_MENSAGEM })
  @Matches(DIA_REGEX, { message: DIA_MENSAGEM })
  ate?: string;
}

/** Filtros da lista de participantes (também usados no CSV, que ignora a paginação). */
export class ListarParticipantesDto extends PaginacaoDto {
  @ApiPropertyOptional({ description: 'Nome, e-mail ou dígitos do WhatsApp' })
  @IsOptional()
  @Transform(vazioParaUndefined)
  @IsString({ message: 'A busca deve ser um texto' })
  @MaxLength(100, { message: 'A busca deve ter até 100 caracteres' })
  busca?: string;

  @ApiPropertyOptional({ enum: UFS })
  @IsOptional()
  @Transform(maiusculas)
  @IsIn(UFS, { message: 'UF inválida' })
  uf?: string;

  @ApiPropertyOptional({ enum: StatusConta })
  @IsOptional()
  @Transform(maiusculas)
  @IsEnum(StatusConta, { message: 'Status inválido' })
  status?: StatusConta;

  @ApiPropertyOptional({ enum: ORDENACOES_PARTICIPANTES, default: 'cadastro' })
  @IsOptional()
  @Transform(vazioParaUndefined)
  @IsIn(ORDENACOES_PARTICIPANTES, {
    message: `ordenar deve ser um destes: ${ORDENACOES_PARTICIPANTES.join(', ')}`,
  })
  ordenar?: OrdenacaoParticipantes;

  @ApiPropertyOptional({
    enum: DIRECOES,
    description: 'Padrão: crescente para nome, decrescente para o resto',
  })
  @IsOptional()
  @Transform(vazioParaUndefined)
  @IsIn(DIRECOES, { message: 'direcao deve ser asc ou desc' })
  direcao?: Direcao;
}

export class ListarAuditoriaDto extends PaginacaoDto {
  @ApiPropertyOptional({ example: 'LOGIN_SUCESSO' })
  @IsOptional()
  @Transform(maiusculas)
  @IsString({ message: 'Ação inválida' })
  @Matches(/^[A-Z0-9_]{1,100}$/, { message: 'Ação inválida' })
  acao?: string;

  @ApiPropertyOptional({ description: 'Id da pessoa que fez a ação' })
  @IsOptional()
  @Transform(vazioParaUndefined)
  @IsUUID('all', { message: 'Pessoa inválida' })
  usuarioId?: string;

  @ApiPropertyOptional({ description: 'Nome ou e-mail da pessoa' })
  @IsOptional()
  @Transform(vazioParaUndefined)
  @IsString({ message: 'A busca deve ser um texto' })
  @MaxLength(100, { message: 'A busca deve ter até 100 caracteres' })
  busca?: string;

  @ApiPropertyOptional({ example: '2026-10-01', description: 'AAAA-MM-DD (fuso de São Paulo)' })
  @IsOptional()
  @Transform(vazioParaUndefined)
  @IsString({ message: DIA_MENSAGEM })
  @Matches(DIA_REGEX, { message: DIA_MENSAGEM })
  de?: string;

  @ApiPropertyOptional({ example: '2026-10-10', description: 'AAAA-MM-DD (fuso de São Paulo)' })
  @IsOptional()
  @Transform(vazioParaUndefined)
  @IsString({ message: DIA_MENSAGEM })
  @Matches(DIA_REGEX, { message: DIA_MENSAGEM })
  ate?: string;
}
