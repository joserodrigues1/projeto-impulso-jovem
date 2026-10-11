import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  MaxLength,
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  ANO_REGEX,
  chave,
  DadosCurriculo,
  LIMITES,
  MES_REGEX,
  NIVEIS_IDIOMA,
  prefixarProtocolo,
  SITUACOES_FORMACAO,
  SituacaoFormacao,
  UFS,
} from './curriculo-conteudo';

const aparar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const vazioParaUndefined = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const v = value.trim();
  return v === '' ? undefined : v;
};
/** Ano pode chegar como número (2023) — vira texto para validar o formato. */
const anoComoTexto = ({ value }: { value: unknown }) =>
  typeof value === 'number' ? String(value) : vazioParaUndefined({ value });
/** `null` em uma lista vira lista vazia. */
const nuloParaLista = ({ value }: { value: unknown }) => value ?? [];
/** Apara os textos, descarta vazios e remove repetidos (sem diferenciar maiúsculas/acentos). */
const listaDeTextos = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) return value;
  const vistos = new Set<string>();
  return value
    .map((v: unknown) => (typeof v === 'string' ? v.trim() : v))
    .filter((v: unknown) => {
      if (typeof v !== 'string') return true; // o validador recusa com mensagem clara
      if (v === '' || vistos.has(chave(v))) return false;
      vistos.add(chave(v));
      return true;
    });
};

/**
 * O fim não pode vir antes do início (AAAA-MM e AAAA comparam bem como texto).
 * Com "trabalho atual" marcado o fim é descartado, então não é conferido.
 */
@ValidatorConstraint({ name: 'fimDepoisDoInicio' })
class FimDepoisDoInicio implements ValidatorConstraintInterface {
  validate(fim: unknown, args: ValidationArguments) {
    const { inicio, atual } = args.object as { inicio?: unknown; atual?: unknown };
    return atual === true || typeof fim !== 'string' || typeof inicio !== 'string' || fim >= inicio;
  }

  defaultMessage() {
    return 'A data de término não pode ser antes da data de início';
  }
}

const MES_MENSAGEM = 'Use o formato AAAA-MM nas datas da experiência';
const ANO_MENSAGEM = 'Use o ano com 4 dígitos (AAAA) na formação';

export class ExperienciaCurriculoDto {
  @ApiProperty({ example: 'Supermercado Bom Preço' })
  @Transform(aparar)
  @IsString({ message: 'Informe o nome da empresa' })
  @Length(1, LIMITES.empresa, { message: 'Informe o nome da empresa (até 150 caracteres)' })
  empresa: string;

  @ApiProperty({ example: 'Operador de caixa' })
  @Transform(aparar)
  @IsString({ message: 'Informe o cargo' })
  @Length(1, LIMITES.cargo, { message: 'Informe o cargo (até 150 caracteres)' })
  cargo: string;

  @ApiPropertyOptional({ example: '2023-06', description: 'AAAA-MM' })
  @IsOptional()
  @Transform(vazioParaUndefined)
  @IsString({ message: MES_MENSAGEM })
  @Matches(MES_REGEX, { message: MES_MENSAGEM })
  inicio?: string;

  @ApiPropertyOptional({
    example: '2023-12',
    description: 'AAAA-MM. Vazio + atual=true → emprego atual',
  })
  @IsOptional()
  @Transform(vazioParaUndefined)
  @IsString({ message: MES_MENSAGEM })
  @Matches(MES_REGEX, { message: MES_MENSAGEM })
  @Validate(FimDepoisDoInicio)
  fim?: string;

  @ApiPropertyOptional({ description: 'Trabalha lá atualmente' })
  @IsOptional()
  @IsBoolean({ message: 'O campo "trabalho atual" deve ser verdadeiro ou falso' })
  atual?: boolean;

  @ApiPropertyOptional({ example: 'jun/2023 – dez/2023', description: 'Usado quando não há datas' })
  @IsOptional()
  @Transform(vazioParaUndefined)
  @IsString({ message: 'O período deve ser um texto' })
  @MaxLength(LIMITES.periodo, { message: 'O período deve ter até 60 caracteres' })
  periodo?: string;

  @ApiPropertyOptional({ type: [String], example: ['Atendimento ao cliente no caixa'] })
  @IsOptional()
  @Transform(listaDeTextos)
  @IsArray({ message: 'As atividades devem ser uma lista' })
  @ArrayMaxSize(LIMITES.atividades, { message: 'Informe no máximo 8 atividades por experiência' })
  @IsString({ each: true, message: 'Cada atividade deve ser um texto' })
  @MaxLength(LIMITES.atividade, {
    each: true,
    message: 'Cada atividade deve ter até 300 caracteres',
  })
  atividades?: string[];

  @ApiPropertyOptional({ description: 'Texto livre — cada linha (ou "•", ";") vira uma atividade' })
  @IsOptional()
  @Transform(vazioParaUndefined)
  @IsString({ message: 'A descrição da experiência deve ser um texto' })
  @MaxLength(LIMITES.descricao, {
    message: 'A descrição da experiência deve ter até 2400 caracteres',
  })
  descricao?: string;
}

export class FormacaoCurriculoDto {
  @ApiProperty({ example: 'Escola Estadual Machado de Assis' })
  @Transform(aparar)
  @IsString({ message: 'Informe a instituição de ensino' })
  @Length(1, LIMITES.instituicao, { message: 'Informe a instituição (até 150 caracteres)' })
  instituicao: string;

  @ApiProperty({ example: 'Ensino Médio' })
  @Transform(aparar)
  @IsString({ message: 'Informe o curso' })
  @Length(1, LIMITES.curso, { message: 'Informe o curso (até 150 caracteres)' })
  curso: string;

  @ApiPropertyOptional({ example: '2021 – 2023', description: 'Usado quando não há anos' })
  @IsOptional()
  @Transform(vazioParaUndefined)
  @IsString({ message: 'O período deve ser um texto' })
  @MaxLength(LIMITES.periodo, { message: 'O período deve ter até 60 caracteres' })
  periodo?: string;

  @ApiPropertyOptional({ example: '2021', description: 'AAAA' })
  @IsOptional()
  @Transform(anoComoTexto)
  @IsString({ message: ANO_MENSAGEM })
  @Matches(ANO_REGEX, { message: ANO_MENSAGEM })
  inicio?: string;

  @ApiPropertyOptional({ example: '2023', description: 'AAAA (conclusão ou previsão)' })
  @IsOptional()
  @Transform(anoComoTexto)
  @IsString({ message: ANO_MENSAGEM })
  @Matches(ANO_REGEX, { message: ANO_MENSAGEM })
  @Validate(FimDepoisDoInicio)
  fim?: string;

  @ApiPropertyOptional({ enum: SITUACOES_FORMACAO })
  @IsOptional()
  @Transform(vazioParaUndefined)
  @IsIn(SITUACOES_FORMACAO, {
    message: 'Situação da formação inválida (concluído, cursando ou trancado)',
  })
  situacao?: SituacaoFormacao;
}

export class IdiomaCurriculoDto {
  @ApiProperty({ example: 'Inglês' })
  @Transform(aparar)
  @IsString({ message: 'Informe o idioma' })
  @Length(1, LIMITES.idioma, { message: 'Informe o idioma (até 60 caracteres)' })
  idioma: string;

  @ApiProperty({ example: 'Básico', description: `Sugestões: ${NIVEIS_IDIOMA.join(', ')}` })
  @Transform(aparar)
  @IsString({ message: 'Informe o nível do idioma' })
  @Length(1, LIMITES.nivel, { message: 'Informe o nível do idioma (até 30 caracteres)' })
  nivel: string;
}

/**
 * Campo `dados` de POST /curriculos/gerar (seção 5.4). As listas são opcionais no envio
 * (ausentes = vazias); nome, e-mail e telefone vêm da conta, nunca do formulário.
 */
export class GerarCurriculoDto implements DadosCurriculo {
  @ApiPropertyOptional({ example: 'Currículo — Administrativo', description: 'Nome desta versão' })
  @IsOptional()
  @Transform(vazioParaUndefined)
  @IsString({ message: 'O título deve ser um texto' })
  @MaxLength(LIMITES.titulo, { message: 'O título deve ter até 120 caracteres' })
  titulo?: string;

  @ApiPropertyOptional({ example: 'Jovem Aprendiz Administrativo' })
  @IsOptional()
  @Transform(vazioParaUndefined)
  @IsString({ message: 'O cargo desejado deve ser um texto' })
  @MaxLength(LIMITES.cargoDesejado, { message: 'O cargo desejado deve ter até 120 caracteres' })
  cargoDesejado?: string;

  @ApiPropertyOptional({ example: 'Brasília' })
  @IsOptional()
  @Transform(vazioParaUndefined)
  @IsString({ message: 'A cidade deve ser um texto' })
  @MaxLength(LIMITES.cidade, { message: 'A cidade deve ter até 100 caracteres' })
  cidade?: string;

  @ApiPropertyOptional({ example: 'DF' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() || undefined : value,
  )
  @IsIn(UFS, { message: 'Informe a UF com 2 letras (ex.: SP)' })
  uf?: string;

  @ApiPropertyOptional({ example: 'linkedin.com/in/seu-nome', description: 'Aceita sem https://' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? prefixarProtocolo(value) || undefined : value,
  )
  @IsString({ message: 'O link do LinkedIn deve ser um texto' })
  @MaxLength(LIMITES.linkedin, { message: 'O link do LinkedIn deve ter até 255 caracteres' })
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true, require_tld: true },
    { message: 'Informe um link válido do LinkedIn (ex.: linkedin.com/in/seu-nome)' },
  )
  linkedin?: string;

  @ApiPropertyOptional({
    description: 'Conte sobre você do seu jeito — a IA reescreve (até 1200 caracteres)',
  })
  @IsOptional()
  @Transform(vazioParaUndefined)
  @IsString({ message: 'O campo "sobre você" deve ser um texto' })
  @MaxLength(LIMITES.perfilProfissional, {
    message:
      'O texto sobre você deve ter até 1200 caracteres. Se quiser contar mais, grave um áudio.',
  })
  perfilProfissional?: string;

  @ApiProperty({ type: [ExperienciaCurriculoDto] })
  @Transform(nuloParaLista)
  @IsArray({ message: 'As experiências devem ser uma lista' })
  @ArrayMaxSize(LIMITES.experiencias, { message: 'Informe no máximo 15 experiências' })
  @ValidateNested({ each: true, message: 'Cada experiência precisa ter empresa e cargo' })
  @Type(() => ExperienciaCurriculoDto)
  experiencias: ExperienciaCurriculoDto[] = [];

  @ApiProperty({ type: [FormacaoCurriculoDto] })
  @Transform(nuloParaLista)
  @IsArray({ message: 'A formação deve ser uma lista' })
  @ArrayMaxSize(LIMITES.formacao, { message: 'Informe no máximo 10 formações' })
  @ValidateNested({ each: true, message: 'Cada formação precisa ter instituição e curso' })
  @Type(() => FormacaoCurriculoDto)
  formacao: FormacaoCurriculoDto[] = [];

  @ApiProperty({ type: [String], example: ['Pacote Office', 'Comunicação'] })
  @Transform(listaDeTextos)
  @IsArray({ message: 'As habilidades devem ser uma lista' })
  @ArrayMaxSize(LIMITES.habilidades, { message: 'Informe no máximo 30 habilidades' })
  @IsString({ each: true, message: 'Cada habilidade deve ser um texto' })
  @MaxLength(LIMITES.habilidade, {
    each: true,
    message: 'Cada habilidade deve ter até 60 caracteres',
  })
  habilidades: string[] = [];

  @ApiProperty({ type: [IdiomaCurriculoDto] })
  @Transform(nuloParaLista)
  @IsArray({ message: 'Os idiomas devem ser uma lista' })
  @ArrayMaxSize(LIMITES.idiomas, { message: 'Informe no máximo 10 idiomas' })
  @ValidateNested({ each: true, message: 'Cada idioma precisa ter nome e nível' })
  @Type(() => IdiomaCurriculoDto)
  idiomas: IdiomaCurriculoDto[] = [];

  @ApiProperty({ type: [String], example: ['Certificado de Excel Básico — Fundação Bradesco'] })
  @Transform(listaDeTextos)
  @IsArray({ message: 'As premiações e cursos devem ser uma lista' })
  @ArrayMaxSize(LIMITES.premiacoes, {
    message: 'Informe no máximo 15 premiações, certificados ou cursos',
  })
  @IsString({ each: true, message: 'Cada premiação ou curso deve ser um texto' })
  @MaxLength(LIMITES.premiacao, {
    each: true,
    message: 'Cada premiação ou curso deve ter até 200 caracteres',
  })
  premiacoes: string[] = [];

  @ApiPropertyOptional({ default: true, description: 'false = monta o currículo sem IA' })
  @IsOptional()
  @IsBoolean({ message: 'O campo "usarIa" deve ser verdadeiro ou falso' })
  usarIa?: boolean;
}

/**
 * Corpo de PUT /curriculos/:id (edição manual, sem IA). Mesmos campos do gerar;
 * `usarIa` é aceito (o frontend usa o mesmo formulário) e ignorado.
 */
export class AtualizarCurriculoDto extends GerarCurriculoDto {}
