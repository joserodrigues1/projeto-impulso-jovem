import { Injectable, NotFoundException } from '@nestjs/common';
import { StatusConta } from '@prisma/client';
import { paginar, PaginacaoDto, skipTake } from '../../common/dto/paginacao.dto';
import { normalizarTelefone, variantesTelefone } from '../../common/validators/telefone';
import { env } from '../../config/env';
import { AuditoriaService } from '../../infra/auditoria.service';
import { PrismaService } from '../../infra/prisma.service';
import { RegistrarEntrevistaDto } from './entrevistas.dto';

/** Quantas simulações anteriores são enviadas como contexto para a IA. */
const HISTORICO_CONTEXTO = 3;

const SELECT_ENTREVISTA = {
  id: true,
  cargoAlvo: true,
  empresaAlvo: true,
  pontosFortes: true,
  pontosMelhoria: true,
  dicasComunicacao: true,
  dataRealizacao: true,
} as const;

@Injectable()
export class EntrevistasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  private buscarUsuarioPorTelefone(telefoneNormalizado: string) {
    return this.prisma.usuario.findFirst({
      where: { telefone: { in: variantesTelefone(telefoneNormalizado) } },
      select: { id: true, nomeCompleto: true, statusConta: true },
    });
  }

  /**
   * Contexto do usuário para a IA recrutadora (consumido pelo n8n).
   * Retorna apenas o necessário para a conversa — sem e-mail, senha ou dados de contato.
   */
  async contextoParaBot(telefoneBruto: string) {
    const linkCadastro = `${env.FRONTEND_URL}/registro`;
    const telefone = normalizarTelefone(telefoneBruto);
    if (!telefone) return { encontrado: false as const, motivo: 'TELEFONE_INVALIDO', linkCadastro };

    const encontrado = await this.buscarUsuarioPorTelefone(telefone);
    if (!encontrado) return { encontrado: false as const, motivo: 'NAO_CADASTRADO', linkCadastro };
    if (encontrado.statusConta === StatusConta.BLOQUEADO) {
      return { encontrado: false as const, motivo: 'CONTA_BLOQUEADA', linkCadastro };
    }

    const [perfil, ultimasEntrevistas] = await Promise.all([
      this.prisma.perfil.findUnique({
        where: { usuarioId: encontrado.id },
        select: {
          resumoProfissional: true,
          nivelEscolaridade: true,
          habilidades: true,
          cidade: true,
          uf: true,
          experiencias: {
            orderBy: { dataInicio: 'desc' },
            select: { cargo: true, empresa: true, descricao: true, dataInicio: true, dataFim: true, atual: true },
          },
        },
      }),
      this.prisma.entrevistaBot.findMany({
        where: { usuarioId: encontrado.id },
        orderBy: { dataRealizacao: 'desc' },
        take: HISTORICO_CONTEXTO,
        select: { cargoAlvo: true, empresaAlvo: true, pontosMelhoria: true, dataRealizacao: true },
      }),
    ]);

    return {
      encontrado: true as const,
      usuario: {
        id: encontrado.id,
        primeiroNome: encontrado.nomeCompleto.split(' ')[0],
        nomeCompleto: encontrado.nomeCompleto,
        perfil,
        ultimasEntrevistas,
      },
    };
  }

  /** Salva o feedback gerado pela IA ao final da simulação (chamado pelo n8n). */
  async registrar(dto: RegistrarEntrevistaDto) {
    const usuario = await this.buscarUsuarioPorTelefone(dto.telefone);
    if (!usuario) throw new NotFoundException('Nenhum usuário cadastrado com este WhatsApp');

    const entrevista = await this.prisma.entrevistaBot.create({
      data: {
        usuarioId: usuario.id,
        cargoAlvo: dto.cargoAlvo,
        empresaAlvo: dto.empresaAlvo,
        pontosFortes: dto.pontosFortes,
        pontosMelhoria: dto.pontosMelhoria,
        dicasComunicacao: dto.dicasComunicacao,
        dataRealizacao: dto.dataRealizacao,
      },
      select: { id: true, dataRealizacao: true },
    });

    await this.auditoria.registrar({
      usuarioId: usuario.id,
      acao: 'ENTREVISTA_SIMULADA_REGISTRADA',
      entidade: 'EntrevistaBot',
      entidadeId: entrevista.id,
    });

    return {
      id: entrevista.id,
      dataRealizacao: entrevista.dataRealizacao,
      /** Link para o n8n enviar ao usuário no WhatsApp. */
      linkRelatorio: `${env.FRONTEND_URL}/dashboard/entrevistas`,
    };
  }

  async listar(usuarioId: string, p: PaginacaoDto) {
    const where = { usuarioId };
    const [dados, total] = await Promise.all([
      this.prisma.entrevistaBot.findMany({
        where,
        orderBy: { dataRealizacao: 'desc' },
        select: SELECT_ENTREVISTA,
        ...skipTake(p),
      }),
      this.prisma.entrevistaBot.count({ where }),
    ]);
    return paginar(dados, total, p);
  }

  async obter(usuarioId: string, id: string) {
    const entrevista = await this.prisma.entrevistaBot.findFirst({
      where: { id, usuarioId },
      select: SELECT_ENTREVISTA,
    });
    if (!entrevista) throw new NotFoundException('Entrevista não encontrada');
    return entrevista;
  }
}
