import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { StatusConta, TipoUsuario, Usuario } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { MetaRequisicao } from '../../common/decorators/auth.decorators';
import { sha256, tokenAleatorio } from '../../common/crypto/crypto.util';
import { hashSenha, precisaAtualizarHash, verificarSenha } from '../../common/crypto/senha';
import { JwtPayload } from '../../common/guards/auth.guards';
import { descreverErro } from '../../common/logger/descrever-erro';
import { variantesTelefone } from '../../common/validators/telefone';
import { env } from '../../config/env';
import { AuditoriaService } from '../../infra/auditoria.service';
import { MailService } from '../../infra/mail.service';
import { PrismaService } from '../../infra/prisma.service';
import { CadastroUsuarioDto, LoginDto, RedefinirSenhaDto } from './auth.dto';
import { BloqueioLoginService } from './bloqueio-login.service';

export interface Sessao {
  accessToken: string;
  refreshToken: string;
  accessExpiraEm: Date;
  refreshExpiraEm: Date;
  usuario: UsuarioSessao;
}

export interface UsuarioSessao {
  id: string;
  nomeCompleto: string;
  email: string;
  tipoUsuario: TipoUsuario;
  statusConta: StatusConta;
  fotoUrl: string | null;
}

/** Janela em que um refresh token recém-rotacionado ainda é aceito (abas/requisições simultâneas). */
const TOLERANCIA_REUSO_MS = 15_000;
const VALIDADE_RECUPERACAO_MS = 30 * 60_000;
/** Intervalo mínimo entre dois e-mails de recuperação para a mesma conta. */
const INTERVALO_RECUPERACAO_MS = 60_000;

const MENSAGEM_CREDENCIAIS = 'E-mail ou senha incorretos';
const MENSAGEM_SESSAO_EXPIRADA = 'Sua sessão expirou. Faça login novamente.';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  /** Hash usado quando o e-mail não existe: o tempo de resposta fica parecido (evita enumeração). */
  private hashFicticio?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly auditoria: AuditoriaService,
    private readonly bloqueio: BloqueioLoginService,
  ) {}

  static paraSessao(u: Usuario): UsuarioSessao {
    return {
      id: u.id,
      nomeCompleto: u.nomeCompleto,
      email: u.email,
      tipoUsuario: u.tipoUsuario,
      statusConta: u.statusConta,
      fotoUrl: u.fotoUrl,
    };
  }

  private async garantirEmailLivre(email: string) {
    const existe = await this.prisma.usuario.findUnique({ where: { email }, select: { id: true } });
    if (existe) throw new ConflictException('Este e-mail já está cadastrado. Que tal fazer login?');
  }

  /** Bloqueia o mesmo WhatsApp em duas contas (inclusive a variante com/sem o 9º dígito). */
  async garantirTelefoneLivre(telefone: string, ignorarUsuarioId?: string) {
    const existe = await this.prisma.usuario.findFirst({
      where: {
        telefone: { in: variantesTelefone(telefone) },
        ...(ignorarUsuarioId ? { id: { not: ignorarUsuarioId } } : {}),
      },
      select: { id: true },
    });
    if (existe) throw new ConflictException('Este WhatsApp já está cadastrado em outra conta');
  }

  async cadastrar(dto: CadastroUsuarioDto, meta: MetaRequisicao): Promise<Sessao> {
    await this.garantirEmailLivre(dto.email);
    await this.garantirTelefoneLivre(dto.telefone);

    const usuario = await this.prisma.usuario.create({
      data: {
        nomeCompleto: dto.nomeCompleto,
        email: dto.email,
        senhaHash: await hashSenha(dto.senha),
        tipoUsuario: TipoUsuario.USUARIO,
        statusConta: StatusConta.ATIVO,
        telefone: dto.telefone,
        perfil: { create: {} },
        consentimentos: {
          create: { versaoTermo: env.LGPD_TERMO_VERSAO, ip: meta.ip, userAgent: meta.userAgent },
        },
      },
    });

    await this.auditoria.registrar({
      usuarioId: usuario.id,
      acao: 'CADASTRO_USUARIO',
      ip: meta.ip,
    });
    void this.mail.boasVindas(usuario.email, usuario.nomeCompleto);
    return this.emitirSessao(usuario, meta);
  }

  private bloqueado(segundos: number): HttpException {
    return new HttpException(BloqueioLoginService.mensagem(segundos), HttpStatus.TOO_MANY_REQUESTS);
  }

  /** Conta uma senha errada; ao atingir o limite já responde com o bloqueio. */
  private async falhaDeLogin(email: string, meta: MetaRequisicao): Promise<never> {
    const atingiuLimite = await this.bloqueio.registrarFalha(email, meta.ip);
    if (atingiuLimite) throw this.bloqueado(env.LOGIN_BLOQUEIO_MIN * 60);
    throw new UnauthorizedException(MENSAGEM_CREDENCIAIS);
  }

  async login(dto: LoginDto, meta: MetaRequisicao): Promise<Sessao> {
    // Bloqueio por e-mail + IP (limite normal) ou só por e-mail (teto, contra ataque distribuído)
    const segundos = await this.bloqueio.segundosBloqueado(dto.email, meta.ip);
    if (segundos > 0) throw this.bloqueado(segundos);

    const usuario = await this.prisma.usuario.findUnique({ where: { email: dto.email } });

    if (!usuario) {
      this.hashFicticio ??= hashSenha(tokenAleatorio(16));
      await verificarSenha(await this.hashFicticio, dto.senha);
      return this.falhaDeLogin(dto.email, meta);
    }

    if (!(await verificarSenha(usuario.senhaHash, dto.senha))) {
      await this.auditoria.registrar({ usuarioId: usuario.id, acao: 'LOGIN_FALHA', ip: meta.ip });
      return this.falhaDeLogin(dto.email, meta);
    }

    // Só revela o bloqueio da conta para quem acertou a senha
    if (usuario.statusConta === StatusConta.BLOQUEADO) {
      throw new ForbiddenException('Sua conta está bloqueada. Entre em contato com o suporte.');
    }

    await this.bloqueio.limparIp(dto.email, meta.ip);
    const atualizado = await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        ultimoLoginEm: new Date(),
        // Hash legado (argon2 nativo) → regrava com os parâmetros atuais
        ...(precisaAtualizarHash(usuario.senhaHash)
          ? { senhaHash: await hashSenha(dto.senha) }
          : {}),
      },
    });
    // Faxina: refresh tokens vencidos deste usuário não servem mais para nada
    await this.prisma.refreshToken.deleteMany({
      where: { usuarioId: usuario.id, expiraEm: { lt: new Date() } },
    });
    return this.emitirSessao(atualizado, meta);
  }

  /**
   * Gera access token (JWT curto) + refresh token opaco (só o hash vai para o banco).
   * `familia` agrupa as rotações de uma mesma sessão; `id` permite reservar o id do novo
   * registro antes de criá-lo (usado na rotação).
   */
  async emitirSessao(
    usuario: Usuario,
    meta: MetaRequisicao,
    familia?: string,
    id?: string,
  ): Promise<Sessao> {
    const payload: JwtPayload = {
      sub: usuario.id,
      tipo: usuario.tipoUsuario,
      nome: usuario.nomeCompleto,
      email: usuario.email,
    };
    const accessToken = await this.jwt.signAsync(payload);
    const refreshToken = tokenAleatorio();
    const refreshExpiraEm = new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 86_400_000);

    await this.prisma.refreshToken.create({
      data: {
        id,
        usuarioId: usuario.id,
        familia: familia ?? randomUUID(),
        tokenHash: sha256(refreshToken),
        expiraEm: refreshExpiraEm,
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });

    return {
      accessToken,
      refreshToken,
      accessExpiraEm: new Date(Date.now() + env.JWT_ACCESS_TTL_MIN * 60_000),
      refreshExpiraEm,
      usuario: AuthService.paraSessao(usuario),
    };
  }

  /**
   * Rotação do refresh token: cada uso gera um token novo e invalida o anterior.
   * Reusar um token já rotacionado (fora da janela de tolerância) indica roubo:
   * a família inteira é revogada e o usuário precisa logar de novo.
   */
  async renovar(refreshToken: string | undefined, meta: MetaRequisicao): Promise<Sessao> {
    if (!refreshToken) throw new UnauthorizedException(MENSAGEM_SESSAO_EXPIRADA);

    const tokenHash = sha256(refreshToken);
    let atual = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { usuario: true },
    });
    if (!atual || atual.expiraEm < new Date())
      throw new UnauthorizedException(MENSAGEM_SESSAO_EXPIRADA);

    if (atual.usuario.statusConta === StatusConta.BLOQUEADO) {
      await this.revogarFamilia(atual.familia);
      throw new ForbiddenException('Sua conta está bloqueada. Entre em contato com o suporte.');
    }

    if (!atual.revogadoEm) {
      // Reserva a rotação de forma atômica: entre requisições simultâneas, só uma "ganha"
      const novoId = randomUUID();
      const { count } = await this.prisma.refreshToken.updateMany({
        where: { id: atual.id, revogadoEm: null },
        data: { revogadoEm: new Date(), substituidoPor: novoId },
      });
      if (count === 1) return this.emitirSessao(atual.usuario, meta, atual.familia, novoId);
      atual = await this.prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: { usuario: true },
      });
      if (!atual) throw new UnauthorizedException(MENSAGEM_SESSAO_EXPIRADA);
    }

    // Token rotacionado há poucos segundos (corrida entre abas) → tolera, desde que a sessão
    // continue viva: o sucessor não foi encerrado sem rotação e a família ainda tem algum
    // token ativo. Logout, troca/redefinição de senha e reuso revogam a família inteira —
    // aí nem um token de duas rotações atrás (T1 → T2 → T3) reabre a sessão.
    const recente =
      !!atual.revogadoEm &&
      !!atual.substituidoPor &&
      Date.now() - atual.revogadoEm.getTime() < TOLERANCIA_REUSO_MS;
    if (recente && atual.substituidoPor) {
      const agora = new Date();
      const [sucessor, ativos] = await Promise.all([
        this.prisma.refreshToken.findUnique({
          where: { id: atual.substituidoPor },
          select: { revogadoEm: true, substituidoPor: true },
        }),
        this.prisma.refreshToken.count({
          where: { familia: atual.familia, revogadoEm: null, expiraEm: { gt: agora } },
        }),
      ]);
      const sucessorEncerrado = !!sucessor?.revogadoEm && !sucessor.substituidoPor;
      if (!sucessorEncerrado && ativos > 0) {
        return this.emitirSessao(atual.usuario, meta, atual.familia);
      }
    }

    await this.revogarFamilia(atual.familia);
    await this.auditoria.registrar({
      usuarioId: atual.usuarioId,
      acao: 'REFRESH_TOKEN_REUSO_DETECTADO',
      ip: meta.ip,
    });
    this.logger.warn(`Reuso de refresh token detectado (usuário ${atual.usuarioId})`);
    throw new UnauthorizedException(MENSAGEM_SESSAO_EXPIRADA);
  }

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    const atual = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
      select: { familia: true },
    });
    if (atual) await this.revogarFamilia(atual.familia);
  }

  revogarFamilia(familia: string) {
    return this.prisma.refreshToken.updateMany({
      where: { familia, revogadoEm: null },
      data: { revogadoEm: new Date() },
    });
  }

  revogarTodas(usuarioId: string) {
    return this.prisma.refreshToken.updateMany({
      where: { usuarioId, revogadoEm: null },
      data: { revogadoEm: new Date() },
    });
  }

  /**
   * Sempre responde do mesmo jeito (e na mesma velocidade) exista ou não o e-mail:
   * o trabalho de verdade roda em segundo plano, sem revelar quem tem cadastro.
   */
  solicitarRecuperacao(email: string, meta: MetaRequisicao): void {
    void this.processarRecuperacao(email, meta).catch((e: unknown) =>
      this.logger.error(`Falha ao processar recuperação de senha: ${descreverErro(e)}`),
    );
  }

  private async processarRecuperacao(email: string, meta: MetaRequisicao) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });
    if (!usuario || usuario.statusConta === StatusConta.BLOQUEADO) return;

    // Evita bombardear a caixa de entrada de alguém com pedidos repetidos
    const recente = await this.prisma.tokenRecuperacaoSenha.findFirst({
      where: {
        usuarioId: usuario.id,
        criadoEm: { gt: new Date(Date.now() - INTERVALO_RECUPERACAO_MS) },
      },
      select: { id: true },
    });
    if (recente) return;

    const token = tokenAleatorio(32);
    await this.prisma.$transaction([
      this.prisma.tokenRecuperacaoSenha.updateMany({
        where: { usuarioId: usuario.id, usadoEm: null },
        data: { usadoEm: new Date() },
      }),
      this.prisma.tokenRecuperacaoSenha.create({
        data: {
          usuarioId: usuario.id,
          tokenHash: sha256(token),
          expiraEm: new Date(Date.now() + VALIDADE_RECUPERACAO_MS),
        },
      }),
    ]);
    await this.auditoria.registrar({
      usuarioId: usuario.id,
      acao: 'RECUPERACAO_SENHA_SOLICITADA',
      ip: meta.ip,
    });
    await this.mail.recuperacaoSenha(usuario.email, usuario.nomeCompleto, token);
  }

  async redefinirSenha(dto: RedefinirSenhaDto, meta: MetaRequisicao) {
    const invalido = new BadRequestException(
      'Este link de redefinição é inválido ou expirou. Peça um novo.',
    );
    const registro = await this.prisma.tokenRecuperacaoSenha.findUnique({
      where: { tokenHash: sha256(dto.token) },
      select: { id: true, usuarioId: true, usadoEm: true, expiraEm: true },
    });
    if (!registro || registro.usadoEm || registro.expiraEm < new Date()) throw invalido;

    const senhaHash = await hashSenha(dto.novaSenha);
    const usuario = await this.prisma.$transaction(async (tx) => {
      // Consome o token de forma atômica: dois envios simultâneos não usam o mesmo link
      const { count } = await tx.tokenRecuperacaoSenha.updateMany({
        where: { id: registro.id, usadoEm: null, expiraEm: { gt: new Date() } },
        data: { usadoEm: new Date() },
      });
      if (count !== 1) throw invalido;
      await tx.tokenRecuperacaoSenha.updateMany({
        where: { usuarioId: registro.usuarioId, usadoEm: null },
        data: { usadoEm: new Date() },
      });
      return tx.usuario.update({ where: { id: registro.usuarioId }, data: { senhaHash } });
    });

    await this.revogarTodas(usuario.id);
    await this.bloqueio.limpar(usuario.email, meta.ip);
    await this.auditoria.registrar({
      usuarioId: usuario.id,
      acao: 'SENHA_REDEFINIDA',
      ip: meta.ip,
    });
    void this.mail.senhaAlterada(usuario.email, usuario.nomeCompleto);
  }

  /** Troca de senha com a sessão aberta: confere a atual, encerra as outras sessões e abre uma nova. */
  async alterarSenha(
    usuarioId: string,
    senhaAtual: string,
    novaSenha: string,
    meta: MetaRequisicao,
  ): Promise<Sessao> {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) throw new UnauthorizedException('Faça login para continuar.');
    if (!(await verificarSenha(usuario.senhaHash, senhaAtual))) {
      throw new BadRequestException('A senha atual está incorreta');
    }
    if (senhaAtual === novaSenha) {
      throw new BadRequestException('A nova senha precisa ser diferente da atual');
    }

    const atualizado = await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { senhaHash: await hashSenha(novaSenha) },
    });
    await this.revogarTodas(usuario.id);
    await this.auditoria.registrar({ usuarioId: usuario.id, acao: 'SENHA_ALTERADA', ip: meta.ip });
    void this.mail.senhaAlterada(usuario.email, usuario.nomeCompleto);
    return this.emitirSessao(atualizado, meta);
  }

  /** Confirmação de senha para ações sensíveis (ex.: excluir a conta). */
  async confirmarSenha(usuarioId: string, senha: string): Promise<Usuario> {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) throw new UnauthorizedException('Faça login para continuar.');
    if (!(await verificarSenha(usuario.senhaHash, senha))) {
      throw new BadRequestException('Senha incorreta');
    }
    return usuario;
  }
}
