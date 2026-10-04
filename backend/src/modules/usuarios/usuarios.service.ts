import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma.service';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async exportarDados(id: string) {
    const dados = await this.prisma.usuario.findUnique({
      where: { id },
      include: {
        perfil: { include: { experiencias: true } },
        consentimentos: true,
      },
    });
    if (!dados) throw new NotFoundException('Usuário não encontrado');
    return dados;
  }

  async excluirDefinitivamente(id: string) {
    // Apaga usuário em cascata
    await this.prisma.usuario.delete({ where: { id } });
  }
}
