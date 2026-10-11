import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MetaRequisicao } from '../../common/decorators/auth.decorators';
import { descreverErro } from '../../common/logger/descrever-erro';
import { formatarTelefone } from '../../common/validators/telefone';
import { AuditoriaService } from '../../infra/auditoria.service';
import { PrismaService } from '../../infra/prisma.service';
import { StorageService } from '../../infra/storage.service';
import { AuthService } from '../auth/auth.service';
import { AtualizarContaDto } from './usuarios.dto';

/** Campos da conta devolvidos em GET/PATCH /me (nunca o hash da senha). */
const SELECAO_CONTA = {
  id: true,
  nomeCompleto: true,
  email: true,
  tipoUsuario: true,
  statusConta: true,
  fotoUrl: true,
  telefone: true,
  criadoEm: true,
  perfil: {
    select: {
      resumoProfissional: true,
      nivelEscolaridade: true,
      linkLinkedin: true,
      linkGithub: true,
      habilidades: true,
      cidade: true,
      uf: true,
    },
  },
} satisfies Prisma.UsuarioSelect;

type Conta = Prisma.UsuarioGetPayload<{ select: typeof SELECAO_CONTA }>;

@Injectable()
export class UsuariosService {
  private readonly logger = new Logger(UsuariosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly auditoria: AuditoriaService,
    private readonly storage: StorageService,
  ) {}

  private paraResposta(conta: Conta) {
    return { ...conta, telefoneFormatado: formatarTelefone(conta.telefone) };
  }

  async obter(id: string) {
    const conta = await this.prisma.usuario.findUnique({ where: { id }, select: SELECAO_CONTA });
    // Conta apagada com o access token ainda válido
    if (!conta) throw new UnauthorizedException('Faça login para continuar.');
    return this.paraResposta(conta);
  }

  async atualizar(id: string, dto: AtualizarContaDto, meta: MetaRequisicao) {
    const atual = await this.prisma.usuario.findUnique({
      where: { id },
      select: { telefone: true },
    });
    if (!atual) throw new UnauthorizedException('Faça login para continuar.');

    const trocouTelefone = dto.telefone !== undefined && dto.telefone !== atual.telefone;
    if (trocouTelefone && dto.telefone) await this.auth.garantirTelefoneLivre(dto.telefone, id);

    const conta = await this.prisma.usuario.update({
      where: { id },
      data: {
        ...(dto.nomeCompleto !== undefined ? { nomeCompleto: dto.nomeCompleto } : {}),
        ...(trocouTelefone ? { telefone: dto.telefone } : {}),
      },
      select: SELECAO_CONTA,
    });
    if (trocouTelefone) {
      await this.auditoria.registrar({ usuarioId: id, acao: 'TELEFONE_ALTERADO', ip: meta.ip });
    }
    return this.paraResposta(conta);
  }

  /**
   * Portabilidade (LGPD): tudo o que guardamos sobre a pessoa, sem hash de senha nem tokens.
   * Sessões de login entram só com data, IP e navegador (nada do token, da família ou ids).
   */
  async exportarDados(id: string) {
    const dados = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nomeCompleto: true,
        email: true,
        telefone: true,
        tipoUsuario: true,
        statusConta: true,
        fotoUrl: true,
        ultimoLoginEm: true,
        criadoEm: true,
        atualizadoEm: true,
        perfil: {
          select: {
            resumoProfissional: true,
            nivelEscolaridade: true,
            linkLinkedin: true,
            linkGithub: true,
            habilidades: true,
            cidade: true,
            uf: true,
            experiencias: {
              select: {
                cargo: true,
                empresa: true,
                descricao: true,
                dataInicio: true,
                dataFim: true,
                atual: true,
              },
              orderBy: { dataInicio: 'desc' },
            },
          },
        },
        consentimentos: {
          select: { versaoTermo: true, aceitoEm: true, ip: true, userAgent: true },
          orderBy: { aceitoEm: 'asc' },
        },
        curriculosGerados: {
          select: {
            id: true,
            titulo: true,
            conteudo: true,
            refinadoPorIa: true,
            geradoEm: true,
            atualizadoEm: true,
          },
          orderBy: { geradoEm: 'desc' },
        },
        entrevistas: {
          select: {
            id: true,
            sessaoId: true,
            cargoAlvo: true,
            empresaAlvo: true,
            notaGeral: true,
            pontosFortes: true,
            pontosMelhoria: true,
            dicasComunicacao: true,
            relatorio: true,
            dataRealizacao: true,
          },
          orderBy: { dataRealizacao: 'desc' },
        },
        sessoesEntrevista: {
          select: {
            id: true,
            status: true,
            cargoAlvo: true,
            empresaAlvo: true,
            motivoFinalizacao: true,
            iniciadaEm: true,
            ultimaMensagemEm: true,
            finalizadaEm: true,
            mensagens: {
              select: { autor: true, tipo: true, conteudo: true, criadoEm: true },
              orderBy: { criadoEm: 'asc' },
            },
          },
          orderBy: { iniciadaEm: 'desc' },
        },
        refreshTokens: {
          select: { criadoEm: true, expiraEm: true, revogadoEm: true, ip: true, userAgent: true },
          orderBy: { criadoEm: 'desc' },
        },
        logsAuditoria: {
          select: { acao: true, ip: true, criadoEm: true },
          orderBy: { criadoEm: 'desc' },
          take: 500,
        },
      },
    });
    if (!dados) throw new NotFoundException('Usuário não encontrado');
    return { exportadoEm: new Date().toISOString(), dados };
  }

  /**
   * Exclusão definitiva (LGPD): confere a senha, registra a auditoria antes (o log fica,
   * sem vínculo com a pessoa), apaga tudo em cascata e limpa os arquivos no storage.
   */
  async excluirConta(id: string, senha: string, meta: MetaRequisicao): Promise<void> {
    await this.auth.confirmarSenha(id, senha);
    await this.auditoria.registrar({
      usuarioId: id,
      acao: 'CONTA_EXCLUIDA',
      entidade: 'Usuario',
      entidadeId: id,
      ip: meta.ip,
    });
    await this.prisma.usuario.delete({ where: { id } });

    // Em segundo plano: o storage pode nem existir no servidor (MinIO desligado)
    void Promise.all([
      this.storage.removerPrefixo(`public/usuarios/${id}/`),
      this.storage.removerPrefixo(`private/usuarios/${id}/`),
    ]).catch((e: unknown) =>
      this.logger.warn(`Falha ao limpar arquivos da conta excluída: ${descreverErro(e)}`),
    );
  }
}
