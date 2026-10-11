import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  PayloadTooLargeException,
  Post,
  ServiceUnavailableException,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UsuarioAtual } from '../../common/decorators/auth.decorators';
import type { UsuarioAutenticado } from '../../common/decorators/auth.decorators';
import { PrismaService } from '../../infra/prisma.service';
import { StorageService } from '../../infra/storage.service';
import { TipoArquivo, validarTipoArquivo } from './tipos-arquivo';

const MB = 1024 * 1024;
const LIMITE_CURRICULO = 5 * MB;
const LIMITE_AVATAR = 2 * MB;

/**
 * Limites do multipart além do tamanho do arquivo: sem eles, o busboy aceita campos de texto
 * sem limite (até 1 MB cada) e o multer guarda tudo na memória. Excesso → 400.
 */
const limitesMultipart = (fileSize: number) => ({
  fileSize,
  files: 1,
  fields: 2,
  fieldSize: 1024,
  parts: 3,
});

const CORPO_ARQUIVO = {
  schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
};

@ApiTags('Uploads')
@ApiCookieAuth()
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('uploads')
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  /** Confere presença, tamanho e tipo real (magic bytes) do arquivo. */
  private validar(
    file: Express.Multer.File | undefined,
    limite: number,
    aceitos: ReadonlyArray<TipoArquivo['mime']>,
    descricaoTipos: string,
  ): { tipo: TipoArquivo; conteudo: Buffer } {
    if (!file?.buffer?.length) throw new BadRequestException('Selecione um arquivo para enviar.');
    if (file.size > limite) {
      throw new PayloadTooLargeException(
        `O arquivo pode ter no máximo ${Math.round(limite / MB)} MB.`,
      );
    }
    const tipo = validarTipoArquivo(file.buffer, file.mimetype, aceitos);
    if (!tipo)
      throw new UnsupportedMediaTypeException(`Formato não aceito. Envie ${descricaoTipos}.`);
    return { tipo, conteudo: file.buffer };
  }

  /** O storage (MinIO/S3) pode estar desligado no servidor: vira 503 amigável, não 500. */
  private async enviarAoStorage(chave: string, conteudo: Buffer, tipo: TipoArquivo): Promise<void> {
    try {
      await this.storage.enviar(chave, conteudo, tipo.mime);
    } catch (e) {
      this.logger.warn(`Falha no envio ao storage: ${(e as Error).message}`);
      throw new ServiceUnavailableException(
        'Envio de arquivos indisponível no momento. Tente novamente mais tarde.',
      );
    }
  }

  @Post('curriculo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Envia um currículo em PDF (até 5 MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody(CORPO_ARQUIVO)
  // O limite no multer impede que um arquivo enorme seja todo carregado na memória
  @UseInterceptors(FileInterceptor('file', { limits: limitesMultipart(LIMITE_CURRICULO) }))
  async uploadCurriculo(
    @UploadedFile() file: Express.Multer.File | undefined,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    const { tipo, conteudo } = this.validar(
      file,
      LIMITE_CURRICULO,
      ['application/pdf'],
      'um arquivo PDF',
    );
    const chave = `private/usuarios/${usuario.id}/curriculo-${Date.now()}.${tipo.extensao}`;
    await this.enviarAoStorage(chave, conteudo, tipo);
    // Arquivo privado: devolve só a chave (o acesso é por URL assinada)
    return { key: chave };
  }

  @Post('avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Envia a foto de perfil (JPEG ou PNG, até 2 MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody(CORPO_ARQUIVO)
  @UseInterceptors(FileInterceptor('file', { limits: limitesMultipart(LIMITE_AVATAR) }))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File | undefined,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    const { tipo, conteudo } = this.validar(
      file,
      LIMITE_AVATAR,
      ['image/png', 'image/jpeg'],
      'uma imagem JPG ou PNG',
    );
    const chave = `public/usuarios/${usuario.id}/avatar-${Date.now()}.${tipo.extensao}`;
    await this.enviarAoStorage(chave, conteudo, tipo);
    const url = this.storage.urlPublica(chave);

    const anterior = await this.prisma.usuario.findUnique({
      where: { id: usuario.id },
      select: { fotoUrl: true },
    });
    await this.prisma.usuario.update({ where: { id: usuario.id }, data: { fotoUrl: url } });

    // Remove a foto antiga — só se for mesmo um arquivo desta conta
    const chaveAnterior = this.storage.chaveDaUrl(anterior?.fotoUrl);
    if (
      chaveAnterior &&
      chaveAnterior !== chave &&
      chaveAnterior.startsWith(`public/usuarios/${usuario.id}/`)
    ) {
      void this.storage.remover(chaveAnterior);
    }
    return { url, key: chave };
  }
}
