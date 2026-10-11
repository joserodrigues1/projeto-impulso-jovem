import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Meta, MetaRequisicao, Public } from '../../common/decorators/auth.decorators';
import { rastreadorAuthPublica, rastreadorRefresh } from '../../common/throttler/throttler.config';
import { CadastroUsuarioDto, LoginDto, RecuperarSenhaDto, RedefinirSenhaDto } from './auth.dto';
import { AuthService, UsuarioSessao } from './auth.service';
import { aplicarCookiesSessao, lerRefreshToken, limparCookiesSessao } from './cookies';

const POR_MINUTO = 60_000;

/**
 * Limite por IP nas rotas públicas de autenticação — mesmo que a requisição traga um token
 * válido (senão cada conta nova viraria um balde novo de tentativas).
 */
const porIp = (limit: number) => ({
  default: { limit, ttl: POR_MINUTO, getTracker: rastreadorAuthPublica },
});

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle(porIp(5))
  @Post('cadastro')
  @ApiOperation({ summary: 'Cadastra um novo usuário (retorna cookies HttpOnly)' })
  @ApiResponse({ status: 201, description: 'Conta criada e sessão iniciada' })
  async cadastrar(
    @Body() dto: CadastroUsuarioDto,
    @Meta() meta: MetaRequisicao,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UsuarioSessao> {
    const sessao = await this.auth.cadastrar(dto, meta);
    aplicarCookiesSessao(res, sessao);
    return sessao.usuario;
  }

  @Public()
  @Throttle(porIp(10))
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autentica o usuário (retorna cookies HttpOnly)' })
  @ApiResponse({ status: 200, description: 'Autenticado' })
  @ApiResponse({ status: 429, description: 'Muitas tentativas erradas para este e-mail' })
  async login(
    @Body() dto: LoginDto,
    @Meta() meta: MetaRequisicao,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UsuarioSessao> {
    const sessao = await this.auth.login(dto, meta);
    aplicarCookiesSessao(res, sessao);
    return sessao.usuario;
  }

  @Public()
  // Por sessão (hash do refresh token), não por IP: quem divide a rede não derruba os outros
  @Throttle({ default: { limit: 30, ttl: POR_MINUTO, getTracker: rastreadorRefresh } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renova a sessão usando o refresh token do cookie' })
  async refresh(
    @Req() req: Request,
    @Meta() meta: MetaRequisicao,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UsuarioSessao> {
    try {
      const sessao = await this.auth.renovar(lerRefreshToken(req), meta);
      aplicarCookiesSessao(res, sessao);
      return sessao.usuario;
    } catch (e) {
      limparCookiesSessao(res);
      throw e;
    }
  }

  /** Público de propósito: com o access token vencido, o logout ainda precisa limpar a sessão. */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Encerra a sessão atual e revoga o refresh token' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(lerRefreshToken(req));
    limparCookiesSessao(res);
  }

  @Public()
  @Throttle(porIp(3))
  @Post('recuperar-senha')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Envia e-mail com link para redefinir a senha' })
  recuperarSenha(@Body() dto: RecuperarSenhaDto, @Meta() meta: MetaRequisicao) {
    this.auth.solicitarRecuperacao(dto.email, meta);
    return {
      mensagem:
        'Se este e-mail estiver cadastrado, você vai receber um link para criar uma nova senha em instantes.',
    };
  }

  @Public()
  @Throttle(porIp(5))
  @Post('redefinir-senha')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redefine a senha usando o token recebido por e-mail' })
  async redefinirSenha(@Body() dto: RedefinirSenhaDto, @Meta() meta: MetaRequisicao) {
    await this.auth.redefinirSenha(dto, meta);
    return { mensagem: 'Senha redefinida com sucesso! Agora é só entrar com a nova senha.' };
  }
}
