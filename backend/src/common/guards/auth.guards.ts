import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { TipoUsuario } from '@prisma/client';
import type { Request } from 'express';
import {
  IS_PUBLIC_KEY,
  RequisicaoAutenticada,
  ROLES_KEY,
  UsuarioAutenticado,
} from '../decorators/auth.decorators';

export const ACCESS_COOKIE = 'ij_access';
export const REFRESH_COOKIE = 'ij_refresh';

export interface JwtPayload {
  sub: string;
  tipo: TipoUsuario;
  nome: string;
  email: string;
}

/** Token de acesso: header `Authorization: Bearer` ou cookie HttpOnly. */
export function extrairToken(req: Pick<Request, 'headers' | 'cookies'>): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim() || undefined;
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const cookie = cookies?.[ACCESS_COOKIE];
  return typeof cookie === 'string' && cookie ? cookie : undefined;
}

/** Valida o formato do payload — um token assinado com dados incompletos não vira sessão. */
export function usuarioDoPayload(
  p: Partial<JwtPayload> | null | undefined,
): UsuarioAutenticado | null {
  if (!p || typeof p.sub !== 'string' || !p.sub) return null;
  if (p.tipo !== TipoUsuario.USUARIO && p.tipo !== TipoUsuario.ADMIN) return null;
  return { id: p.sub, tipo: p.tipo, nome: String(p.nome ?? ''), email: String(p.email ?? '') };
}

/** Guard global: valida o JWT de acesso (cookie HttpOnly ou header Bearer). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (ctx.getType() !== 'http') return true;
    const req = ctx.switchToHttp().getRequest<RequisicaoAutenticada>();
    const publico = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    const token = extrairToken(req);
    if (token) {
      try {
        const usuario = usuarioDoPayload(await this.jwt.verifyAsync<JwtPayload>(token));
        if (usuario) req.user = usuario;
        else if (!publico)
          throw new UnauthorizedException('Sessão inválida. Faça login novamente.');
      } catch (e) {
        if (e instanceof UnauthorizedException) throw e;
        if (!publico) throw new UnauthorizedException('Sua sessão expirou. Faça login novamente.');
      }
    }

    if (!publico && !req.user) throw new UnauthorizedException('Faça login para continuar.');
    return true;
  }
}

/** Guard global: controle de acesso baseado em papéis (RBAC). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const tipos = this.reflector.getAllAndOverride<TipoUsuario[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!tipos?.length) return true;
    const { user } = ctx.switchToHttp().getRequest<RequisicaoAutenticada>();
    if (!user) throw new UnauthorizedException('Faça login para continuar.');
    if (!tipos.includes(user.tipo)) {
      throw new ForbiddenException('Você não tem permissão para acessar este recurso.');
    }
    return true;
  }
}
