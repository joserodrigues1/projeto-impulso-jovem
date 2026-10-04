import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { StatusConta, TipoUsuario, Usuario } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { MetaRequisicao } from '../../common/decorators/auth.decorators';
import { sha256, tokenAleatorio } from '../../common/crypto/crypto.util';
import { JwtPayload } from '../../common/guards/auth.guards';
import { env } from '../../config/env';
import { AuditoriaService } from '../../infra/auditoria.service';
import { MailService } from '../../infra/mail.service';
import { PrismaService } from '../../infra/prisma.service';
import { CadastroUsuarioDto, LoginDto, RedefinirSenhaDto } from './auth.dto';

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

const TOLERANCIA_REUSO_MS = 15_000;
const ARGON_OPCOES = { type: argon2.argon2id } as const;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private hashFicticio?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly auditoria: AuditoriaService,
  ) {}

  hashSenha(senha: string) {
    return argon2.hash(senha, ARGON_OPCOES);
  }

  verificarSenha(hash: string, senha: string) {
    return argon2.verify(hash, senha).catch(() => false);
  }

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
    if (existe) throw new ConflictException('Este e-mail já está cadastrado');
  }

  async cadastrar(dto: CadastroUsuarioDto, meta: MetaRequisicao): Promise<Sessao> {
    await this.garantirEmailLivre(dto.email);

    const usuario = await this.prisma.usuario.create({
      data: {
        nomeCompleto: dto.nomeCompleto,
        email: dto.email,
        senhaHash: await this.hashSenha(dto.senha),
        tipoUsuario: TipoUsuario.USUARIO,
        statusConta: StatusConta.ATIVO,
        telefone: dto.telefone,
        perfil: { create: {} },
        consentimentos: {
          create: { versaoTermo: env.LGPD_TERMO_VERSAO, ip: meta.ip, userAgent: meta.userAgent },
        },
      },
    });

    await this.auditoria.registrar({ usuarioId: usuario.id, acao: 'CADASTRO_USUARIO', ip: meta.ip });
    void this.mail.boasVindas(usuario.email, usuario.nomeCompleto, false);
    return this.emitirSessao(usuario, meta);
  }

  async login(dto: LoginDto, meta: MetaRequisicao): Promise<Sessao> {
    const usuario = await this.prisma.usuario.findUnique({ where: { email: dto.email } });

    if (!usuario) {
      this.hashFicticio ??= await this.hashSenha('senha-ficticia-123');
      await this.verificarSenha(this.hashFicticio, dto.senha);
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }

    if (!(await this.verificarSenha(usuario.senhaHash, dto.senha))) {
      await this.auditoria.registrar({ usuarioId: usuario.id, acao: 'LOGIN_FALHA', ip: meta.ip });
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }

    if (usuario.statusConta === StatusConta.BLOQUEADO) {
      throw new ForbiddenException('Sua conta está bloqueada. Entre em contato com o suporte.');
    }

    const atualizado = await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoLoginEm: new Date() },
    });
    return this.emitirSessao(atualizado, meta);
  }

  async emitirSessao(usuario: Usuario, meta: MetaRequisicao, familia?: string): Promise<Sessao> {
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

  async renovar(refreshToken: string | undefined, meta: MetaRequisicao): Promise<Sessao> {
    if (!refreshToken) throw new UnauthorizedException('Sessão expirada');

    const atual = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
      include: { usuario: true },
    });
    if (!atual) throw new UnauthorizedException('Sessão inválida');

    if (atual.revogadoEm) {
      const recente = Date.now() - atual.revogadoEm.getTime() < TOLERANCIA_REUSO_MS;
      if (!(recente && atual.substituidoPor)) {
        await this.revogarFamilia(atual.familia);
        await this.auditoria.registrar({
          usuarioId: atual.usuarioId,
          acao: 'REFRESH_TOKEN_REUSO_DETECTADO',
          ip: meta.ip,
        });
        this.logger.warn(`Reuso de refresh token detectado (usuário ${atual.usuarioId})`);
        throw new UnauthorizedException('Sessão inválida');
      }
    }

    if (atual.expiraEm < new Date()) throw new UnauthorizedException('Sessão expirada');
    if (atual.usuario.statusConta === StatusConta.BLOQUEADO) {
      await this.revogarFamilia(atual.familia);
      throw new ForbiddenException('Sua conta está bloqueada');
    }

    const sessao = await this.emitirSessao(atual.usuario, meta, atual.familia);
    if (!atual.revogadoEm) {
      const novo = await this.prisma.refreshToken.findUnique({
        where: { tokenHash: sha256(sessao.refreshToken) },
        select: { id: true },
      });
      await this.prisma.refreshToken.update({
        where: { id: atual.id },
        data: { revogadoEm: new Date(), substituidoPor: novo?.id },
      });
    }
    return sessao;
  }

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    const atual = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
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

  async solicitarRecuperacao(email: string, meta: MetaRequisicao) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });
    if (!usuario || usuario.statusConta === StatusConta.BLOQUEADO) return;

    await this.prisma.tokenRecuperacaoSenha.updateMany({
      where: { usuarioId: usuario.id, usadoEm: null },
      data: { usadoEm: new Date() },
    });
    const token = tokenAleatorio(32);
    await this.prisma.tokenRecuperacaoSenha.create({
      data: {
        usuarioId: usuario.id,
        tokenHash: sha256(token),
        expiraEm: new Date(Date.now() + 30 * 60_000),
      },
    });
    await this.auditoria.registrar({ usuarioId: usuario.id, acao: 'RECUPERACAO_SENHA_SOLICITADA', ip: meta.ip });
    void this.mail.recuperacaoSenha(usuario.email, usuario.nomeCompleto, token);
  }

  async redefinirSenha(dto: RedefinirSenhaDto, meta: MetaRequisicao) {
    const registro = await this.prisma.tokenRecuperacaoSenha.findUnique({
      where: { tokenHash: sha256(dto.token) },
    });
    if (!registro || registro.usadoEm || registro.expiraEm < new Date()) {
      throw new UnauthorizedException('Link de redefinição inválido ou expirado');
    }

    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: registro.usuarioId },
        data: { senhaHash: await this.hashSenha(dto.novaSenha) },
      }),
      this.prisma.tokenRecuperacaoSenha.update({
        where: { id: registro.id },
        data: { usadoEm: new Date() },
      }),
    ]);
    await this.revogarTodas(registro.usuarioId);
    await this.auditoria.registrar({ usuarioId: registro.usuarioId, acao: 'SENHA_REDEFINIDA', ip: meta.ip });
  }

  async me(usuarioId: string) {
    const u = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: {
        perfil: true,
      },
    });
    if (!u) throw new UnauthorizedException('Usuário não encontrado');
    return {
      ...AuthService.paraSessao(u),
      telefone: u.telefone,
      criadoEm: u.criadoEm,
      perfil: u.perfil,
    };
  }
}
