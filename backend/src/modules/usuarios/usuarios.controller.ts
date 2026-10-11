import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Res } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Meta, MetaRequisicao, UsuarioAtual } from '../../common/decorators/auth.decorators';
import type { UsuarioAutenticado } from '../../common/decorators/auth.decorators';
import { AuthService } from '../auth/auth.service';
import { aplicarCookiesSessao, limparCookiesSessao } from '../auth/cookies';
import { AlterarSenhaDto, AtualizarContaDto, ExcluirContaDto } from './usuarios.dto';
import { UsuariosService } from './usuarios.service';

const POR_MINUTO = 60_000;

@ApiTags('Usuarios')
@ApiCookieAuth()
@Controller('me')
export class UsuariosController {
  constructor(
    private readonly usuarios: UsuariosService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Dados da conta do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Dados do usuário' })
  getMe(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.usuarios.obter(usuario.id);
  }

  @Patch()
  @Throttle({ default: { limit: 10, ttl: POR_MINUTO } })
  @ApiOperation({ summary: 'Atualiza nome e/ou WhatsApp' })
  atualizar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body() dto: AtualizarContaDto,
    @Meta() meta: MetaRequisicao,
  ) {
    return this.usuarios.atualizar(usuario.id, dto, meta);
  }

  @Patch('senha')
  @Throttle({ default: { limit: 5, ttl: POR_MINUTO } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Troca a senha, encerra as outras sessões e emite cookies novos' })
  async alterarSenha(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body() dto: AlterarSenhaDto,
    @Meta() meta: MetaRequisicao,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sessao = await this.auth.alterarSenha(usuario.id, dto.senhaAtual, dto.novaSenha, meta);
    aplicarCookiesSessao(res, sessao);
    return {
      mensagem:
        'Senha alterada com sucesso! Por segurança, encerramos suas sessões em outros aparelhos.',
    };
  }

  @Get('exportar-dados')
  @Throttle({ default: { limit: 5, ttl: POR_MINUTO } })
  @ApiOperation({ summary: 'Exporta os dados pessoais (LGPD)' })
  exportarDados(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.usuarios.exportarDados(usuario.id);
  }

  @Post('excluir-conta')
  @Throttle({ default: { limit: 5, ttl: POR_MINUTO } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Exclui a conta e todos os dados associados definitivamente (LGPD)' })
  @ApiResponse({ status: 204, description: 'Conta excluída' })
  async excluirConta(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body() dto: ExcluirContaDto,
    @Meta() meta: MetaRequisicao,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.usuarios.excluirConta(usuario.id, dto.senha, meta);
    limparCookiesSessao(res);
  }
}
