import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { StatusConta, TipoUsuario } from '@prisma/client';
import type { RequisicaoAutenticada } from '../../common/decorators/auth.decorators';
import { MENSAGEM_SEM_PERMISSAO } from '../../common/guards/auth.guards';
import { PrismaService } from '../../infra/prisma.service';

/**
 * Segunda trava do painel do administrador (a primeira é o `@Roles(ADMIN)`, que confia no token):
 * a cada requisição confere no banco se a conta ainda é ADMIN e está ATIVA. Rebaixar ou bloquear
 * alguém no banco corta o acesso na hora, sem esperar o token de acesso expirar.
 */
@Injectable()
export class AdminAtivoGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const { user } = ctx.switchToHttp().getRequest<RequisicaoAutenticada>();
    if (!user) throw new UnauthorizedException('Faça login para continuar.');

    const conta = await this.prisma.usuario.findUnique({
      where: { id: user.id },
      select: { tipoUsuario: true, statusConta: true },
    });
    if (conta?.tipoUsuario !== TipoUsuario.ADMIN || conta.statusConta !== StatusConta.ATIVO) {
      throw new ForbiddenException(MENSAGEM_SEM_PERMISSAO);
    }
    return true;
  }
}
