import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

const aparar = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const vazioParaUndefined = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const v = value.trim();
  return v === '' ? undefined : v;
};

/** Mês no formato do `<input type="month">`: YYYY-MM. */
const MES_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const MES_MENSAGEM = 'Use o formato AAAA-MM para as datas';

export class ExperienciaCurriculoDto {
  @ApiProperty({ example: 'Jovem Aprendiz' })
  @Transform(aparar)
  @IsString()
  @Length(1, 150, { message: 'Informe o cargo (até 150 caracteres)' })
  cargo: string;

  @ApiProperty({ example: 'Supermercado Bom Preço' })
  @Transform(aparar)
  @IsString()
  @Length(1, 150, { message: 'Informe a empresa ou instituição (até 150 caracteres)' })
  empresa: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(vazioParaUndefined)
  @IsString()
  @MaxLength(2000)
  descricao?: string;

  @ApiProperty({ example: '2024-03' })
  @IsString()
  @Matches(MES_REGEX, { message: MES_MENSAGEM })
  dataInicio: string;

  @ApiPropertyOptional({ example: '2025-01', description: 'Vazio = trabalho atual' })
  @IsOptional()
  @Transform(vazioParaUndefined)
  @IsString()
  @Matches(MES_REGEX, { message: MES_MENSAGEM })
  dataFim?: string;
}

export class GerarCurriculoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(vazioParaUndefined)
  @IsString()
  @MaxLength(2000)
  resumoProfissional?: string;

  @ApiPropertyOptional({ example: 'Ensino Médio Completo' })
  @IsOptional()
  @Transform(vazioParaUndefined)
  @IsString()
  @MaxLength(50)
  nivelEscolaridade?: string;

  @ApiProperty({ type: [String], example: ['Pacote Office', 'Comunicação'] })
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? [...new Set(value.map((v) => (typeof v === 'string' ? v.trim() : v)).filter((v) => v !== ''))]
      : value,
  )
  @IsArray()
  @ArrayMaxSize(30, { message: 'Informe no máximo 30 habilidades' })
  @IsString({ each: true })
  @Length(1, 60, { each: true, message: 'Cada habilidade deve ter até 60 caracteres' })
  habilidades: string[];

  @ApiProperty({ type: [ExperienciaCurriculoDto] })
  @IsArray()
  @ArrayMaxSize(15, { message: 'Informe no máximo 15 experiências' })
  @ValidateNested({ each: true })
  @Type(() => ExperienciaCurriculoDto)
  experiencias: ExperienciaCurriculoDto[];
}
