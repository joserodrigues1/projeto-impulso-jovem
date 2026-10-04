import { Controller, Post, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, HttpCode, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiCookieAuth } from '@nestjs/swagger';
import { StorageService } from '../../infra/storage.service';
import { UsuarioAtual, Meta, MetaRequisicao } from '../../common/decorators/auth.decorators';

@ApiTags('Uploads')
@ApiCookieAuth()
@Controller('uploads')
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @Post('curriculo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fazer upload de currículo (PDF)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadCurriculo(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @UsuarioAtual() usuario: any,
  ) {
    const key = `private/usuarios/${usuario.id}/curriculo-${Date.now()}.pdf`;
    await this.storage.enviar(key, file.buffer, file.mimetype);
    // Para currículos, a URL não é pública, geramos um identificador ou chave
    return { key };
  }

  @Post('avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fazer upload de foto de perfil (JPEG/PNG)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }), // 2MB
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @UsuarioAtual() usuario: any,
  ) {
    const key = `public/usuarios/${usuario.id}/avatar-${Date.now()}.${file.mimetype.split('/')[1]}`;
    await this.storage.enviar(key, file.buffer, file.mimetype);
    const url = this.storage.urlPublica(key);
    return { url, key };
  }
}
