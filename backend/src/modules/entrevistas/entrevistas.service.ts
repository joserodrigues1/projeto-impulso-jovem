import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AutorMensagem, StatusConta, StatusSessaoEntrevista } from '@prisma/client';
import { paginar, PaginacaoDto, skipTake } from '../../common/dto/paginacao.dto';
import { env } from '../../config/env';
import { AuditoriaService } from '../../infra/auditoria.service';
import { PrismaService } from '../../infra/prisma.service';
import { conferirComConversa, resumoDoResultado } from './dialogo';
import { RegistrarEntrevistaDto } from './entrevistas.dto';
import { primeiroNome, telefoneDoWhatsapp } from './normalizacao';
import {
  arredondarNota,
  derivarClassificacao,
  normalizarNota,
  normalizarRelatorio,
  relatorioParaExibicao,
  textosLegados,
} from './relatorio-entrevista';
import {
  HISTORICO_CONTEXTO,
  OPCOES_TRANSACAO,
  SessoesEntrevistaService,
  travarUsuario,
} from './sessoes.service';

/** Cargo usado quando nem o n8n nem a sessão informam um. */
const CARGO_PADRAO = 'Entrevista simulada';
/** Pontos do gráfico de evolução no painel. */
const PONTOS_EVOLUCAO = 10;

/** Link absoluto para uma página do frontend (sem barra duplicada). */
function linkFrontend(caminho: string): string {
  return `${env.FRONTEND_URL.replace(/\/+$/, '')}${caminho}`;
}

const arredondar1 = (n: number) => Math.round(n * 10) / 10;

/** Folga para relógios levemente adiantados no n8n. */
const TOLERANCIA_FUTURO_MS = 5 * 60_000;

/**
 * Data da simulação informada pelo n8n, desde que não esteja no futuro (fuso ou campo
 * errado deixariam a entrevista "fixada" como a mais recente no painel).
 */
function dataInformadaValida(data: Date | undefined): Date | undefined {
  return data && data.getTime() <= Date.now() + TOLERANCIA_FUTURO_MS ? data : undefined;
}

/** Relatórios das simulações: contexto para a IA, registro do relatório e painel do usuário. */
@Injectable()
export class EntrevistasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
    private readonly sessoes: SessoesEntrevistaService,
  ) {}

  /**
   * Contexto do usuário para a IA recrutadora (consumido pelo n8n).
   * Retorna apenas o necessário para a conversa — sem e-mail, senha ou documentos.
   */
  async contextoParaBot(telefoneBruto: string) {
    const linkCadastro = linkFrontend('/registro');
    const telefone = telefoneDoWhatsapp(telefoneBruto);
    if (!telefone) {
      return { encontrado: false as const, motivo: 'TELEFONE_INVALIDO' as const, linkCadastro };
    }

    const usuario = await this.sessoes.buscarUsuarioPorTelefone(telefone);
    if (!usuario) {
      return { encontrado: false as const, motivo: 'NAO_CADASTRADO' as const, linkCadastro };
    }
    if (usuario.statusConta === StatusConta.BLOQUEADO) {
      return { encontrado: false as const, motivo: 'CONTA_BLOQUEADA' as const, linkCadastro };
    }

    const [perfil, curriculo, ultimasEntrevistas, sessaoAtiva] = await Promise.all([
      this.prisma.perfil.findUnique({
        where: { usuarioId: usuario.id },
        select: {
          resumoProfissional: true,
          nivelEscolaridade: true,
          habilidades: true,
          cidade: true,
          uf: true,
          experiencias: {
            orderBy: { dataInicio: 'desc' },
            take: 10,
            select: {
              cargo: true,
              empresa: true,
              descricao: true,
              dataInicio: true,
              dataFim: true,
              atual: true,
            },
          },
        },
      }),
      this.sessoes.curriculoResumido(usuario.id),
      this.prisma.entrevistaBot.findMany({
        where: { usuarioId: usuario.id },
        orderBy: { dataRealizacao: 'desc' },
        take: HISTORICO_CONTEXTO,
        select: {
          cargoAlvo: true,
          empresaAlvo: true,
          notaGeral: true,
          pontosMelhoria: true,
          dataRealizacao: true,
        },
      }),
      this.sessoes.sessaoAtiva(usuario.id),
    ]);

    return {
      encontrado: true as const,
      usuario: {
        id: usuario.id,
        primeiroNome: primeiroNome(usuario.nomeCompleto),
        nomeCompleto: usuario.nomeCompleto,
        perfil,
        curriculo,
        ultimasEntrevistas,
      },
      sessaoAtiva,
      linkPainel: linkFrontend('/dashboard'),
    };
  }

  /**
   * Salva o relatório gerado pela IA (chamado pelo n8n).
   * Idempotente por sessão: se ela já tiver relatório, devolve o existente.
   */
  async registrar(dto: RegistrarEntrevistaDto) {
    let relatorio =
      dto.relatorio === undefined
        ? null
        : normalizarRelatorio(dto.relatorio, { notaGeral: dto.notaGeral });
    if (!relatorio && (!dto.pontosFortes || !dto.pontosMelhoria || !dto.dicasComunicacao)) {
      throw new BadRequestException(
        'Envie um relatorio válido ou os textos de pontosFortes, pontosMelhoria e dicasComunicacao',
      );
    }

    const { usuario, sessao } = await this.resolverDono(dto);
    if (relatorio && sessao) {
      // Citações e nota conferidas com o que o candidato realmente disse nesta sessão
      const falas = await this.prisma.mensagemEntrevista.findMany({
        where: { sessaoId: sessao.id, autor: AutorMensagem.CANDIDATO },
        select: { conteudo: true },
      });
      relatorio = conferirComConversa(
        relatorio,
        falas.map((f) => f.conteudo),
      );
    }
    const textos = relatorio ? textosLegados(relatorio) : null;
    const pontosFortes = textos?.pontosFortes || dto.pontosFortes;
    const pontosMelhoria = textos?.pontosMelhoria || dto.pontosMelhoria;
    const dicasComunicacao = textos?.dicasComunicacao || dto.dicasComunicacao;
    const dados = {
      usuarioId: usuario.id,
      sessaoId: sessao?.id,
      cargoAlvo: dto.cargoAlvo ?? sessao?.cargoAlvo ?? CARGO_PADRAO,
      empresaAlvo: dto.empresaAlvo ?? sessao?.empresaAlvo ?? null,
      pontosFortes: pontosFortes ?? '',
      pontosMelhoria: pontosMelhoria ?? '',
      dicasComunicacao: dicasComunicacao ?? '',
      notaGeral: relatorio?.notaGeral ?? normalizarNota(dto.notaGeral),
      relatorio: relatorio ?? undefined,
      dataRealizacao: dataInformadaValida(dto.dataRealizacao) ?? sessao?.iniciadaEm,
    };
    const selecao = { id: true, dataRealizacao: true } as const;

    let resultado: { entrevista: { id: string; dataRealizacao: Date }; jaExistia: boolean };
    if (sessao) {
      resultado = await this.prisma.$transaction(async (tx) => {
        await travarUsuario(tx, usuario.id);
        const existente = await tx.entrevistaBot.findFirst({
          where: { sessaoId: sessao.id },
          orderBy: { criadoEm: 'asc' },
          select: selecao,
        });
        if (existente) return { entrevista: existente, jaExistia: true };

        const entrevista = await tx.entrevistaBot.create({ data: dados, select: selecao });
        const atual = await tx.sessaoEntrevista.findUniqueOrThrow({
          where: { id: sessao.id },
          select: { finalizadaEm: true, motivoFinalizacao: true },
        });
        await tx.sessaoEntrevista.update({
          where: { id: sessao.id },
          data: {
            status: StatusSessaoEntrevista.ANALISADA,
            // Relatório enviado com a sessão ainda aberta: ela termina aqui
            finalizadaEm: atual.finalizadaEm ?? new Date(),
            motivoFinalizacao: atual.motivoFinalizacao ?? 'CONCLUIDA',
          },
        });
        return { entrevista, jaExistia: false };
      }, OPCOES_TRANSACAO);
    } else {
      const entrevista = await this.prisma.entrevistaBot.create({ data: dados, select: selecao });
      resultado = { entrevista, jaExistia: false };
    }

    if (!resultado.jaExistia) {
      await this.auditoria.registrar({
        usuarioId: usuario.id,
        acao: 'ENTREVISTA_SIMULADA_REGISTRADA',
        entidade: 'EntrevistaBot',
        entidadeId: resultado.entrevista.id,
        detalhes: { sessaoId: sessao?.id ?? null, versaoRelatorio: relatorio ? 1 : 0 },
      });
    }

    return {
      id: resultado.entrevista.id,
      dataRealizacao: resultado.entrevista.dataRealizacao,
      /** Link para o n8n enviar ao usuário no WhatsApp. */
      linkRelatorio: linkFrontend(`/dashboard/entrevistas/${resultado.entrevista.id}`),
      telefone: usuario.telefone,
      primeiroNome: primeiroNome(usuario.nomeCompleto),
      cargoAlvo: dados.cargoAlvo,
      jaExistia: resultado.jaExistia,
      // Nota, classificação e destaques já conferidos, para a mensagem de resultado no WhatsApp
      ...(relatorio && !resultado.jaExistia ? { resultado: resumoDoResultado(relatorio) } : {}),
    };
  }

  /** Dono do relatório: pela sessão (preferível) ou pelo telefone (payload antigo). */
  private async resolverDono(dto: RegistrarEntrevistaDto) {
    if (dto.sessaoId) {
      const sessao = await this.prisma.sessaoEntrevista.findUnique({
        where: { id: dto.sessaoId },
        select: {
          id: true,
          usuarioId: true,
          cargoAlvo: true,
          empresaAlvo: true,
          iniciadaEm: true,
          usuario: { select: { id: true, nomeCompleto: true, telefone: true } },
        },
      });
      if (!sessao) throw new NotFoundException('Sessão de entrevista não encontrada');
      // Com os dois, eles precisam apontar para a mesma pessoa
      if (dto.telefone) {
        const doTelefone = await this.usuarioDoTelefone(dto.telefone);
        if (doTelefone.id !== sessao.usuarioId) {
          throw new BadRequestException(
            'O telefone informado não pertence ao usuário desta sessão',
          );
        }
      }
      return { usuario: sessao.usuario, sessao };
    }

    if (!dto.telefone) throw new BadRequestException('Informe o sessaoId ou o telefone');
    return { usuario: await this.usuarioDoTelefone(dto.telefone), sessao: null };
  }

  private async usuarioDoTelefone(telefone: string) {
    const usuario = await this.sessoes.buscarUsuarioPorTelefone(telefone);
    if (!usuario) throw new NotFoundException('Nenhum usuário cadastrado com este WhatsApp');
    return usuario;
  }

  async listar(usuarioId: string, p: PaginacaoDto) {
    const where = { usuarioId };
    const [linhas, total] = await Promise.all([
      this.prisma.entrevistaBot.findMany({
        where,
        orderBy: [{ dataRealizacao: 'desc' }, { criadoEm: 'desc' }],
        select: {
          id: true,
          cargoAlvo: true,
          empresaAlvo: true,
          notaGeral: true,
          relatorio: true,
          dataRealizacao: true,
        },
        ...skipTake(p),
      }),
      this.prisma.entrevistaBot.count({ where }),
    ]);

    const dados = linhas.map((e) => {
      const relatorio = normalizarRelatorio(e.relatorio, { notaGeral: e.notaGeral });
      const notaGeral = normalizarNota(e.notaGeral) ?? relatorio?.notaGeral ?? null;
      return {
        id: e.id,
        cargoAlvo: e.cargoAlvo,
        empresaAlvo: e.empresaAlvo,
        notaGeral,
        classificacao:
          relatorio?.classificacao ?? (notaGeral === null ? null : derivarClassificacao(notaGeral)),
        resumo: relatorio?.resumo || null,
        dataRealizacao: e.dataRealizacao,
      };
    });
    return paginar(dados, total, p);
  }

  /** Números do painel: média, evolução e situação da simulação atual. */
  async resumo(usuarioId: string) {
    // Encerra aqui mesmo uma simulação esquecida, para o painel mostrar a situação real, e
    // cancela a que espera um relatório há mais de 48 h (não fica "sendo preparado" para sempre)
    await this.sessoes.encerrarInativas({ usuarioId, dispararRelatorio: true });
    await this.sessoes.expirarSemRelatorio(usuarioId);

    const comNota = { usuarioId, notaGeral: { not: null } };
    const [total, media, recentes, sessaoAtiva, aguardando] = await Promise.all([
      this.prisma.entrevistaBot.count({ where: { usuarioId } }),
      this.prisma.entrevistaBot.aggregate({ where: comNota, _avg: { notaGeral: true } }),
      this.prisma.entrevistaBot.findMany({
        where: comNota,
        orderBy: [{ dataRealizacao: 'desc' }, { criadoEm: 'desc' }],
        take: PONTOS_EVOLUCAO,
        select: { id: true, dataRealizacao: true, notaGeral: true },
      }),
      this.sessoes.sessaoAtiva(usuarioId),
      this.prisma.sessaoEntrevista.findFirst({
        where: { usuarioId, status: StatusSessaoEntrevista.FINALIZADA, entrevistas: { none: {} } },
        select: { id: true },
      }),
    ]);

    // Da mais antiga para a mais recente (gráfico)
    const evolucao = recentes
      .flatMap((e) =>
        e.notaGeral === null
          ? []
          : [{ id: e.id, data: e.dataRealizacao, nota: arredondarNota(e.notaGeral) }],
      )
      .reverse();
    const mediaNota = media._avg.notaGeral;

    return {
      total,
      mediaNota: mediaNota === null ? null : arredondar1(mediaNota),
      ultimaNota: evolucao.at(-1)?.nota ?? null,
      evolucao,
      sessaoAtiva: sessaoAtiva && {
        id: sessaoAtiva.id,
        iniciadaEm: sessaoAtiva.iniciadaEm,
        ultimaMensagemEm: sessaoAtiva.ultimaMensagemEm,
        totalMensagens: sessaoAtiva.totalMensagens,
      },
      sessaoAguardandoRelatorio: aguardando !== null,
    };
  }

  async obter(usuarioId: string, id: string) {
    const entrevista = await this.prisma.entrevistaBot.findFirst({
      where: { id, usuarioId },
      select: {
        id: true,
        cargoAlvo: true,
        empresaAlvo: true,
        notaGeral: true,
        dataRealizacao: true,
        pontosFortes: true,
        pontosMelhoria: true,
        dicasComunicacao: true,
        relatorio: true,
      },
    });
    if (!entrevista) throw new NotFoundException('Entrevista não encontrada');

    const relatorio = relatorioParaExibicao(entrevista);
    return {
      id: entrevista.id,
      cargoAlvo: entrevista.cargoAlvo,
      empresaAlvo: entrevista.empresaAlvo,
      notaGeral: normalizarNota(entrevista.notaGeral) ?? relatorio.notaGeral,
      dataRealizacao: entrevista.dataRealizacao,
      pontosFortes: entrevista.pontosFortes,
      pontosMelhoria: entrevista.pontosMelhoria,
      dicasComunicacao: entrevista.dicasComunicacao,
      relatorio,
    };
  }
}
