import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

export interface RegistroAuditoria {
  usuarioId?: string | null;
  acao: string;
  entidade?: string;
  entidadeId?: string;
  detalhes?: Prisma.InputJsonValue;
  ip?: string;
}

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async registrar(r: RegistroAuditoria): Promise<void> {
    try {
      await this.prisma.logAuditoria.create({ data: { ...r, usuarioId: r.usuarioId ?? null } });
    } catch (e) {
      this.logger.warn(`Falha ao registrar auditoria (${r.acao}): ${(e as Error).message}`);
    }
  }
}
