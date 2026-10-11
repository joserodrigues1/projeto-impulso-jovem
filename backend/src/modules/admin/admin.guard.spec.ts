import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { UsuarioAutenticado } from '../../common/decorators/auth.decorators';
import { MENSAGEM_SEM_PERMISSAO } from '../../common/guards/auth.guards';
import type { PrismaService } from '../../infra/prisma.service';
import { AdminAtivoGuard } from './admin.guard';

const ADMIN_ID = '9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d';
/** O token diz ADMIN: o guard confere no banco se ainda é verdade. */
const doToken: UsuarioAutenticado = {
  id: ADMIN_ID,
  tipo: 'ADMIN',
  nome: 'Dono',
  email: 'dono@exemplo.com',
};

function contexto(user?: UsuarioAutenticado): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function montar(conta: { tipoUsuario: string; statusConta: string } | null) {
  const prisma = { usuario: { findUnique: jest.fn().mockResolvedValue(conta) } };
  const guard = new AdminAtivoGuard(prisma as unknown as PrismaService);
  return { prisma, guard };
}

describe('AdminAtivoGuard', () => {
  it('ADMIN ativo no banco passa (consulta a conta do token a cada requisição)', async () => {
    const { prisma, guard } = montar({ tipoUsuario: 'ADMIN', statusConta: 'ATIVO' });

    await expect(guard.canActivate(contexto(doToken))).resolves.toBe(true);
    await expect(guard.canActivate(contexto(doToken))).resolves.toBe(true);

    expect(prisma.usuario.findUnique).toHaveBeenCalledTimes(2);
    expect(prisma.usuario.findUnique).toHaveBeenCalledWith({
      where: { id: ADMIN_ID },
      select: { tipoUsuario: true, statusConta: true },
    });
  });

  it.each([
    [
      'rebaixado para USUARIO (token ainda diz ADMIN)',
      { tipoUsuario: 'USUARIO', statusConta: 'ATIVO' },
    ],
    ['ADMIN bloqueado', { tipoUsuario: 'ADMIN', statusConta: 'BLOQUEADO' }],
    ['ADMIN pendente', { tipoUsuario: 'ADMIN', statusConta: 'PENDENTE' }],
    ['conta inexistente (excluída)', null],
  ])('%s → 403 com a mesma mensagem do RolesGuard', async (_caso, conta) => {
    const { guard } = montar(conta);
    const resultado = guard.canActivate(contexto(doToken));
    await expect(resultado).rejects.toBeInstanceOf(ForbiddenException);
    await expect(resultado).rejects.toThrow(MENSAGEM_SEM_PERMISSAO);
  });

  it('sem usuário na requisição → 401, sem consultar o banco', async () => {
    const { prisma, guard } = montar({ tipoUsuario: 'ADMIN', statusConta: 'ATIVO' });
    await expect(guard.canActivate(contexto())).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
  });
});
