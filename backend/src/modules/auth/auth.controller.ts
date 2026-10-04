import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Meta, MetaRequisicao, Public, RequisicaoAutenticada } from '../../common/decorators/auth.decorators';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '../../common/guards/auth.guards';
import { env, isProducao } from '../../config/env';
import { CadastroUsuarioDto, LoginDto, RecuperarSenhaDto, RedefinirSenhaDto } from './auth.dto';
import { AuthService, Sessao } from './auth.service';

const OPCOES_COOKIE_ACCESS = {
  httpOnly: true,
  secure: env.COOKIE_SECURE ?? isProducao,
  sameSite: 'lax' as const,
  maxAge: env.JWT_ACCESS_TTL_MIN * 60_000,
};

const OPCOES_COOKIE_REFRESH = {
  httpOnly: true,
  secure: env.COOKIE_SECURE ?? isProducao,
  sameSite: 'lax' as const,
  maxAge: env.JWT_REFRESH_TTL_DAYS * 86_400_000,
  path: '/api/v1/auth/refresh',
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private aplicarCookies(res: Response, sessao: Sessao) {
    res.cookie(ACCESS_COOKIE, sessao.accessToken, OPCOES_COOKIE_ACCESS);
    res.cookie(REFRESH_COOKIE, sessao.refreshToken, OPCOES_COOKIE_REFRESH);
  }

  private limparCookies(res: Response) {
    res.clearCookie(ACCESS_COOKIE, OPCOES_COOKIE_ACCESS);
    res.clearCookie(REFRESH_COOKIE, OPCOES_COOKIE_REFRESH);
  }

  @Public()
  @Post('cadastro')
  @ApiOperation({ summary: 'Cadastra um novo usuário' })
  @ApiResponse({ status: 201, description: 'Sessão iniciada' })
  async cadastrar(
    @Body() dto: CadastroUsuarioDto,
    @Meta() meta: MetaRequisicao,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sessao = await this.auth.cadastrar(dto, meta);
    this.aplicarCookies(res, sessao);
    return sessao.usuario;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autentica o usuário (retorna cookies HttpOnly)' })
  @ApiResponse({ status: 200, description: 'Autenticado' })
  async login(
    @Body() dto: LoginDto,
    @Meta() meta: MetaRequisicao,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sessao = await this.auth.login(dto, meta);
    this.aplicarCookies(res, sessao);
    return sessao.usuario;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renova o access token usando o refresh token do cookie' })
  async refresh(@Req() req: RequisicaoAutenticada, @Meta() meta: MetaRequisicao, @Res({ passthrough: true }) res: Response) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const token = cookies?.[REFRESH_COOKIE];
    try {
      const sessao = await this.auth.renovar(token, meta);
      this.aplicarCookies(res, sessao);
      return sessao.usuario;
    } catch (e) {
      this.limparCookies(res);
      throw e;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Encerra a sessão atual e revoga o refresh token' })
  async logout(@Req() req: RequisicaoAutenticada, @Res({ passthrough: true }) res: Response) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const token = cookies?.[REFRESH_COOKIE];
    await this.auth.logout(token);
    this.limparCookies(res);
  }

  @Public()
  @Post('recuperar-senha')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Envia e-mail com token para redefinir senha' })
  async recuperarSenha(@Body() dto: RecuperarSenhaDto, @Meta() meta: MetaRequisicao) {
    await this.auth.solicitarRecuperacao(dto.email, meta);
    return { mensagem: 'Se o e-mail existir, você receberá as instruções em instantes' };
  }

  @Public()
  @Post('redefinir-senha')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redefine a senha usando o token recebido por e-mail' })
  async redefinirSenha(@Body() dto: RedefinirSenhaDto, @Meta() meta: MetaRequisicao) {
    await this.auth.redefinirSenha(dto, meta);
    return { mensagem: 'Senha redefinida com sucesso' };
  }
}
