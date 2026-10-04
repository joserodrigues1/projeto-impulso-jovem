import { Controller, Delete, Get, Patch, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequisicaoAutenticada, UsuarioAtual } from '../../common/decorators/auth.decorators';
import { AuthService, UsuarioSessao } from '../auth/auth.service';
import { UsuariosService } from './usuarios.service';

@ApiTags('Usuarios')
@ApiCookieAuth()
@Controller('me')
export class UsuariosController {
  constructor(
    private readonly usuarios: UsuariosService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Retorna o perfil completo do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Dados do usuário' })
  async getMe(@UsuarioAtual() usuario: UsuarioSessao) {
    return this.auth.me(usuario.id);
  }

  @Get('exportar-dados')
  @ApiOperation({ summary: 'Exporta os dados pessoais (LGPD)' })
  async exportarDados(@UsuarioAtual() usuario: UsuarioSessao) {
    return this.usuarios.exportarDados(usuario.id);
  }

  @Delete()
  @ApiOperation({ summary: 'Exclui a conta e todos os dados associados definitivamente (LGPD)' })
  @ApiResponse({ status: 204, description: 'Conta excluída' })
  async excluirConta(@UsuarioAtual() usuario: UsuarioSessao) {
    await this.usuarios.excluirDefinitivamente(usuario.id);
  }
}
