import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { descreverErro } from '../common/logger/descrever-erro';
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

  /** Registro "de melhor esforço": uma falha só vira aviso no log e não derruba a requisição. */
  async registrar(r: RegistroAuditoria): Promise<void> {
    try {
      await this.registrarOuFalhar(r);
    } catch (e) {
      this.logger.warn(`Falha ao registrar auditoria (${r.acao}): ${descreverErro(e)}`);
    }
  }

  /**
   * Para ações que só podem acontecer registradas (ex.: o administrador abrindo dados de um
   * participante): se o registro falhar, o erro sobe e a resposta não sai.
   */
  async registrarOuFalhar(r: RegistroAuditoria): Promise<void> {
    await this.prisma.logAuditoria.create({ data: { ...r, usuarioId: r.usuarioId ?? null } });
  }
}
