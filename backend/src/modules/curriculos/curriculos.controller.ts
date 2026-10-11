import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Meta, UsuarioAtual } from '../../common/decorators/auth.decorators';
import type { MetaRequisicao, UsuarioAutenticado } from '../../common/decorators/auth.decorators';
import { PaginacaoDto } from '../../common/dto/paginacao.dto';
import {
  ArquivosCurriculoInterceptor,
  type ArquivosRecebidos,
  AUDIO_MAX_BYTES,
  CAMPO_AUDIO,
  CAMPO_CURRICULO_ANTIGO,
  CURRICULO_ANTIGO_MAX_BYTES,
  extrairDadosDoCorpo,
  TIPOS_AUDIO,
  validarArquivosCurriculo,
  validarDados,
} from './curriculo-entrada';
import { AtualizarCurriculoDto, GerarCurriculoDto } from './curriculos.dto';
import { CurriculosService } from './curriculos.service';

/** Id inválido responde como inexistente (404), sem detalhes. */
const idCurriculo = () =>
  new ParseUUIDPipe({ exceptionFactory: () => new NotFoundException('Currículo não encontrado') });

@ApiTags('Curriculos')
@ApiCookieAuth()
@ApiExtraModels(GerarCurriculoDto)
@Controller('curriculos')
export class CurriculosController {
  constructor(private readonly curriculos: CurriculosService) {}

  /**
   * `@Body()` sem classe de propósito: o pipe global não valida o campo `dados` (texto JSON no multipart).
   * A validação é feita em `validarDados`, com as mesmas regras.
   */
  @Post('gerar')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseInterceptors(ArquivosCurriculoInterceptor)
  @ApiOperation({
    summary:
      'Gera um currículo a partir do formulário, de um áudio e/ou de um currículo antigo (com IA quando disponível)',
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    description:
      'Multipart: `dados` = JSON de GerarCurriculoDto (texto); `audio` e `curriculoAntigo` opcionais. ' +
      'Também aceita application/json com o GerarCurriculoDto direto no corpo (sem arquivos).',
    schema: {
      type: 'object',
      required: ['dados'],
      properties: {
        dados: {
          type: 'string',
          description: 'JSON de GerarCurriculoDto (veja o schema GerarCurriculoDto)',
          example: JSON.stringify({
            cargoDesejado: 'Jovem Aprendiz Administrativo',
            perfilProfissional: 'Sou organizado e gosto de aprender coisas novas.',
            experiencias: [],
            formacao: [
              { instituicao: 'Escola Estadual', curso: 'Ensino Médio', situacao: 'CURSANDO' },
            ],
            habilidades: ['Pacote Office'],
            idiomas: [],
            premiacoes: [],
          }),
        },
        [CAMPO_AUDIO]: {
          type: 'string',
          format: 'binary',
          description: `Opcional. Até ${AUDIO_MAX_BYTES / 1024 / 1024} MB — ${TIPOS_AUDIO.join(', ')}`,
        },
        [CAMPO_CURRICULO_ANTIGO]: {
          type: 'string',
          format: 'binary',
          description: `Opcional. Currículo antigo em PDF, JPG ou PNG, até ${CURRICULO_ANTIGO_MAX_BYTES / 1024 / 1024} MB`,
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'CurriculoDetalhe & { transcricao?, avisos }' })
  @ApiResponse({ status: 400, description: 'Dados ou arquivos inválidos' })
  @ApiResponse({
    status: 413,
    description: 'Áudio acima de 8 MB ou currículo antigo acima de 5 MB',
  })
  @ApiResponse({ status: 503, description: 'Só arquivos (sem texto) e a IA está indisponível' })
  async gerar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body() corpo: unknown,
    @UploadedFiles() recebidos: ArquivosRecebidos | undefined,
    @Meta() meta: MetaRequisicao,
  ) {
    const dto = await validarDados(GerarCurriculoDto, extrairDadosDoCorpo(corpo));
    const arquivos = validarArquivosCurriculo(recebidos);
    return this.curriculos.gerar(usuario.id, dto, arquivos, meta);
  }

  @Get()
  @ApiOperation({ summary: 'Lista os currículos do usuário (mais recentes primeiro)' })
  listar(@UsuarioAtual() usuario: UsuarioAutenticado, @Query() paginacao: PaginacaoDto) {
    return this.curriculos.listar(usuario.id, paginacao);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um currículo do usuário' })
  obter(@UsuarioAtual() usuario: UsuarioAutenticado, @Param('id', idCurriculo()) id: string) {
    return this.curriculos.obter(usuario.id, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Edita um currículo manualmente (sem IA)' })
  @ApiBody({ type: AtualizarCurriculoDto })
  async atualizar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', idCurriculo()) id: string,
    @Body() corpo: unknown,
    @Meta() meta: MetaRequisicao,
  ) {
    // Mesma validação do gerar, com mensagens por item ("Experiência 2: ...")
    const dto = await validarDados(AtualizarCurriculoDto, corpo);
    return this.curriculos.atualizar(usuario.id, id, dto, meta);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Exclui um currículo do usuário' })
  async excluir(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', idCurriculo()) id: string,
    @Meta() meta: MetaRequisicao,
  ) {
    await this.curriculos.excluir(usuario.id, id, meta);
  }
}
