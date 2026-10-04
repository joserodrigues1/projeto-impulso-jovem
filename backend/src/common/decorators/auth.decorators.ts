import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { TipoUsuario } from '@prisma/client';
import type { Request } from 'express';

export interface UsuarioAutenticado {
  id: string;
  tipo: TipoUsuario;
  nome: string;
  email: string;
}

export type RequisicaoAutenticada = Request & { user?: UsuarioAutenticado };

export const IS_PUBLIC_KEY = 'isPublic';
/** Rota acessível sem autenticação (o usuário é populado se houver token válido). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
/** Restringe a rota aos tipos de usuário informados (RBAC). */
export const Roles = (...tipos: TipoUsuario[]) => SetMetadata(ROLES_KEY, tipos);

/** Injeta o usuário autenticado no handler. */
export const UsuarioAtual = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): UsuarioAutenticado | undefined =>
    ctx.switchToHttp().getRequest<RequisicaoAutenticada>().user,
);

export interface MetaRequisicao {
  ip?: string;
  userAgent?: string;
}

/** Extrai IP e User-Agent para auditoria/consentimento. */
export const Meta = createParamDecorator((_: unknown, ctx: ExecutionContext): MetaRequisicao => {
  const req = ctx.switchToHttp().getRequest<Request>();
  return {
    ip: req.ip?.slice(0, 64),
    userAgent: (req.headers['user-agent'] ?? '').slice(0, 255) || undefined,
  };
});
