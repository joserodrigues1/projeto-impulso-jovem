import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { TipoUsuario } from '@prisma/client';
import {
  IS_PUBLIC_KEY,
  RequisicaoAutenticada,
  ROLES_KEY,
} from '../decorators/auth.decorators';

export const ACCESS_COOKIE = 'ij_access';
export const REFRESH_COOKIE = 'ij_refresh';

export interface JwtPayload {
  sub: string;
  tipo: TipoUsuario;
  nome: string;
  email: string;
}

function extrairToken(req: RequisicaoAutenticada): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  const cookies = req.cookies as Record<string, string> | undefined;
  return cookies?.[ACCESS_COOKIE];
}

/** Guard global: valida o JWT de acesso (cookie HttpOnly ou header Bearer). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<RequisicaoAutenticada>();
    const publico = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    const token = extrairToken(req);
    if (token) {
      try {
        const p = await this.jwt.verifyAsync<JwtPayload>(token);
        req.user = { id: p.sub, tipo: p.tipo, nome: p.nome, email: p.email };
      } catch {
        if (!publico) throw new UnauthorizedException('Sessão expirada ou inválida');
      }
    }

    if (!publico && !req.user) throw new UnauthorizedException('Autenticação necessária');
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
    if (!user) throw new UnauthorizedException('Autenticação necessária');
    if (!tipos.includes(user.tipo)) {
      throw new ForbiddenException('Você não tem permissão para acessar este recurso');
    }
    return true;
  }
}
