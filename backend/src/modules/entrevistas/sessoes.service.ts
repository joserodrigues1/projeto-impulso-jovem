import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AutorMensagem,
  Prisma,
  StatusConta,
  StatusSessaoEntrevista,
  TipoMensagem,
} from '@prisma/client';
import { N8N_API_KEY_HEADER } from '../../common/guards/n8n-api-key.guard';
import { variantesTelefone } from '../../common/validators/telefone';
import { env } from '../../config/env';
import { AuditoriaService } from '../../infra/auditoria.service';
import { PrismaService } from '../../infra/prisma.service';
import { RedisService } from '../../infra/redis.service';
import { contarParticipacao, dialogoRecente, formatarDialogo, textoContexto } from './dialogo';
import { RegistrarMensagemDto } from './entrevistas.dto';
import { primeiroNome } from './normalizacao';
import {
  decidirTentativaRelatorio,
  limiteInatividade,
  mensagemDeCuidado,
  momentoEncerramento,
  MotivoFinalizacao,
  sessaoInativa,
  StatusEncerramento,
  statusAoEncerrar,
  TentativasRelatorio,
} from './regras-sessao';
import { relatorioParaExibicao } from './relatorio-entrevista';
import { resumirCurriculo } from './resumo-curriculo';

/**
 * Transações com trava por usuário: até 5 s esperando conexão livre no pool e até 15 s no
 * total (a espera pela trava conta aqui — na prática, milissegundos).
 */
export const OPCOES_TRANSACAO = { maxWait: 5_000, timeout: 15_000 };
/** Mensagens mais recentes enviadas na transcrição (limita o tamanho do contexto da IA). */
const MAX_MENSAGENS_TRANSCRICAO = 300;
/** Sessões inativas encerradas por varredura. */
const LOTE_ENCERRAMENTO = 100;
/** Quantas simulações anteriores vão como contexto para a IA. */
export const HISTORICO_CONTEXTO = 3;
/**
 * Horas que uma sessão FINALIZADA espera o relatório. Depois disso (o n8n não conseguiu
 * avaliar: conteúdo bloqueado, resposta inválida, mínimo de respostas diferente...) ela é
 * cancelada para não voltar para sempre em `sessoes/pendentes` nem travar a fila.
 */
export const PRAZO_RELATORIO_HORAS = 48;
/** `motivoFinalizacao` das sessões canceladas por falta de relatório. */
export const MOTIVO_SEM_RELATORIO = 'SEM_RELATORIO';

/** Sessões pendentes avaliadas por chamada de `sessoes/pendentes` antes de escolher o lote. */
const CANDIDATAS_PENDENTES = 50;
/** Tentativas de relatório por sessão ficam no Redis (a API não guarda isso no banco). */
const CHAVE_TENTATIVAS = 'ij:relatorio:tentativas:';
const TTL_TENTATIVAS_S = 3 * 24 * 3_600;

const MENSAGEM_SESSAO_ENCERRADA =
  'A simulação já foi encerrada: a mensagem não foi registrada (não envie esta resposta ao jovem).';

type SessaoEncerrada = {
  sessaoId: string;
  status: StatusEncerramento;
  motivo: MotivoFinalizacao;
  /** A Helena acolheu um relato de sofrimento/risco: a conversa não vira relatório. */
  cuidado: boolean;
};

/**
 * Trava de transação (advisory lock do PostgreSQL) por usuário. Serializa a criação e o
 * encerramento de sessões e o registro de relatórios do mesmo usuário — duas mensagens
 * simultâneas não criam duas sessões. É liberada sozinha ao fim da transação.
 */
export async function travarUsuario(tx: Prisma.TransactionClient, usuarioId: string) {
  const chave = `ij:entrevistas:${usuarioId}`;
  await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${chave}::text))`;
}

/** Simulações de entrevista no WhatsApp: mensagens, encerramento e transcrição. */
@Injectable()
export class SessoesEntrevistaService {
  private readonly logger = new Logger(SessoesEntrevistaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
    private readonly redis: RedisService,
  ) {}

  buscarUsuarioPorTelefone(telefoneNormalizado: string) {
    return this.prisma.usuario.findFirst({
      where: { telefone: { in: variantesTelefone(telefoneNormalizado) } },
      select: { id: true, nomeCompleto: true, telefone: true, statusConta: true },
    });
  }

  /**
   * Registra uma mensagem na sessão em andamento do usuário. Só a mensagem do candidato abre
   * uma sessão nova: a resposta da IA que chega depois do encerramento (corrida com "encerrar"
   * ou com o botão do painel) é recusada com 409 em vez de abrir uma sessão "fantasma".
   * Com `sessaoId`, grava só naquela sessão, se ela ainda estiver em andamento.
   */
  async registrarMensagem(dto: RegistrarMensagemDto) {
    const usuario = await this.buscarUsuarioPorTelefone(dto.telefone);
    if (!usuario) throw new NotFoundException('Nenhum usuário cadastrado com este WhatsApp');
    if (usuario.statusConta === StatusConta.BLOQUEADO) {
      throw new ForbiddenException('Conta bloqueada');
    }

    const r = await this.prisma.$transaction(async (tx) => {
      await travarUsuario(tx, usuario.id);
      // Hora lida depois da trava: mantém a ordem das mensagens e `ultimaMensagemEm` crescente
      const agora = new Date();

      let ativa = dto.sessaoId
        ? await this.sessaoInformada(tx, dto.sessaoId, usuario.id, agora)
        : await tx.sessaoEntrevista.findFirst({
            where: { usuarioId: usuario.id, status: StatusSessaoEntrevista.EM_ANDAMENTO },
            orderBy: { iniciadaEm: 'desc' },
            select: { id: true, ultimaMensagemEm: true },
          });

      // Resposta da IA sem simulação viva: recusa antes de gravar qualquer coisa
      const ativaViva =
        !!ativa && !sessaoInativa(ativa.ultimaMensagemEm, agora, env.SESSAO_INATIVIDADE_MIN);
      if (dto.autor === AutorMensagem.RECRUTADORA && !ativaViva) {
        throw new ConflictException(MENSAGEM_SESSAO_ENCERRADA);
      }

      let encerrada: SessaoEncerrada | null = null;
      if (ativa && sessaoInativa(ativa.ultimaMensagemEm, agora, env.SESSAO_INATIVIDADE_MIN)) {
        encerrada = await this.encerrarNaTransacao(
          tx,
          ativa.id,
          'INATIVIDADE',
          ativa.ultimaMensagemEm,
        );
        ativa = null;
      }

      let sessaoId: string;
      if (ativa) {
        sessaoId = ativa.id;
        // `undefined` não altera o campo no Prisma
        await tx.sessaoEntrevista.update({
          where: { id: sessaoId },
          data: { ultimaMensagemEm: agora, cargoAlvo: dto.cargoAlvo, empresaAlvo: dto.empresaAlvo },
        });
      } else {
        const nova = await tx.sessaoEntrevista.create({
          data: {
            usuarioId: usuario.id,
            cargoAlvo: dto.cargoAlvo,
            empresaAlvo: dto.empresaAlvo,
            iniciadaEm: agora,
            ultimaMensagemEm: agora,
          },
          select: { id: true },
        });
        sessaoId = nova.id;
      }

      await tx.mensagemEntrevista.create({
        data: {
          sessaoId,
          autor: dto.autor,
          tipo: dto.tipo ?? TipoMensagem.TEXTO,
          conteudo: dto.conteudo,
          criadoEm: agora,
        },
      });

      const totalMensagens = await tx.mensagemEntrevista.count({ where: { sessaoId } });
      const mensagensCandidato = await tx.mensagemEntrevista.count({
        where: { sessaoId, autor: AutorMensagem.CANDIDATO },
      });

      return { sessaoId, novaSessao: !ativa, totalMensagens, mensagensCandidato, encerrada };
    }, OPCOES_TRANSACAO);

    if (r.encerrada) await this.aposEncerrar(usuario.id, r.encerrada, true);
    if (r.novaSessao) {
      await this.auditoria.registrar({
        usuarioId: usuario.id,
        acao: 'SESSAO_ENTREVISTA_INICIADA',
        entidade: 'SessaoEntrevista',
        entidadeId: r.sessaoId,
      });
    }

    return {
      sessaoId: r.sessaoId,
      novaSessao: r.novaSessao,
      totalMensagens: r.totalMensagens,
      mensagensCandidato: r.mensagensCandidato,
    };
  }

  /**
   * Sessão indicada pelo n8n: precisa ser do mesmo usuário do telefone (400) e estar em
   * andamento e ativa (409). Lida dentro da transação, já com a trava do usuário.
   */
  private async sessaoInformada(
    tx: Prisma.TransactionClient,
    sessaoId: string,
    usuarioId: string,
    agora: Date,
  ) {
    const sessao = await tx.sessaoEntrevista.findUnique({
      where: { id: sessaoId },
      select: { id: true, usuarioId: true, status: true, ultimaMensagemEm: true },
    });
    if (!sessao) throw new NotFoundException('Sessão de entrevista não encontrada');
    if (sessao.usuarioId !== usuarioId) {
      throw new BadRequestException('O telefone informado não pertence ao usuário desta sessão');
    }
    if (
      sessao.status !== StatusSessaoEntrevista.EM_ANDAMENTO ||
      sessaoInativa(sessao.ultimaMensagemEm, agora, env.SESSAO_INATIVIDADE_MIN)
    ) {
      throw new ConflictException(MENSAGEM_SESSAO_ENCERRADA);
    }
    return { id: sessao.id, ultimaMensagemEm: sessao.ultimaMensagemEm };
  }

  /**
   * Encerra a sessão (idempotente: só muda se estiver EM_ANDAMENTO).
   * Com `usuarioId`, só encontra sessões daquele usuário.
   */
  async finalizar(sessaoId: string, motivo: MotivoFinalizacao, usuarioId?: string) {
    const sessao = await this.prisma.sessaoEntrevista.findFirst({
      where: { id: sessaoId, ...(usuarioId ? { usuarioId } : {}) },
      select: { usuarioId: true },
    });
    if (!sessao) throw new NotFoundException('Sessão de entrevista não encontrada');

    const r = await this.prisma.$transaction(async (tx) => {
      await travarUsuario(tx, sessao.usuarioId);
      const atual = await tx.sessaoEntrevista.findUnique({
        where: { id: sessaoId },
        select: { status: true, ultimaMensagemEm: true },
      });
      // Apagada enquanto esperávamos a trava (ex.: exclusão da conta)
      if (!atual) throw new NotFoundException('Sessão de entrevista não encontrada');
      if (atual.status !== StatusSessaoEntrevista.EM_ANDAMENTO) {
        return { status: atual.status, encerrada: null };
      }
      const momento = momentoEncerramento(motivo, atual.ultimaMensagemEm, new Date());
      const encerrada = await this.encerrarNaTransacao(tx, sessaoId, motivo, momento);
      return { status: encerrada.status, encerrada };
    }, OPCOES_TRANSACAO);

    if (r.encerrada) await this.aposEncerrar(sessao.usuarioId, r.encerrada, true);
    // `cuidado`: o n8n usa para não prometer relatório (e não falar de "simulação curta") ao jovem
    return { sessaoId, status: r.status, cuidado: r.encerrada?.cuidado ?? false };
  }

  /** O usuário pediu para encerrar a simulação pelo painel. */
  async finalizarAtivaDoUsuario(usuarioId: string) {
    const ativa = await this.prisma.sessaoEntrevista.findFirst({
      where: { usuarioId, status: StatusSessaoEntrevista.EM_ANDAMENTO },
      orderBy: { iniciadaEm: 'desc' },
      select: { id: true },
    });
    if (!ativa) {
      throw new NotFoundException('Você não tem nenhuma simulação em andamento no momento.');
    }
    return this.finalizar(ativa.id, 'SOLICITADA_USUARIO', usuarioId);
  }

  /**
   * Encerra (motivo INATIVIDADE) as sessões paradas há mais de SESSAO_INATIVIDADE_MIN.
   * `dispararRelatorio = false` quando quem chama já vai processar as sessões encerradas
   * (o próprio fluxo de relatório, via `sessoes/pendentes`).
   */
  async encerrarInativas(opcoes: { usuarioId?: string; dispararRelatorio: boolean }) {
    const limite = limiteInatividade(new Date(), env.SESSAO_INATIVIDADE_MIN);
    const candidatas = await this.prisma.sessaoEntrevista.findMany({
      where: {
        status: StatusSessaoEntrevista.EM_ANDAMENTO,
        ultimaMensagemEm: { lt: limite },
        ...(opcoes.usuarioId ? { usuarioId: opcoes.usuarioId } : {}),
      },
      orderBy: { ultimaMensagemEm: 'asc' },
      take: LOTE_ENCERRAMENTO,
      select: { id: true, usuarioId: true },
    });

    let total = 0;
    for (const candidata of candidatas) {
      try {
        const encerrada = await this.prisma.$transaction(async (tx) => {
          await travarUsuario(tx, candidata.usuarioId);
          const atual = await tx.sessaoEntrevista.findUnique({
            where: { id: candidata.id },
            select: { status: true, ultimaMensagemEm: true },
          });
          // Pode ter chegado mensagem nova enquanto esperávamos a trava
          const continuaInativa =
            atual?.status === StatusSessaoEntrevista.EM_ANDAMENTO &&
            sessaoInativa(atual.ultimaMensagemEm, new Date(), env.SESSAO_INATIVIDADE_MIN);
          if (!atual || !continuaInativa) return null;
          return this.encerrarNaTransacao(tx, candidata.id, 'INATIVIDADE', atual.ultimaMensagemEm);
        }, OPCOES_TRANSACAO);

        if (encerrada) {
          total++;
          await this.aposEncerrar(candidata.usuarioId, encerrada, opcoes.dispararRelatorio);
        }
      } catch (e) {
        this.logger.warn(
          `Falha ao encerrar a sessão inativa ${candidata.id}: ${(e as Error).message}`,
        );
      }
    }
    return total;
  }

  /**
   * Cancela (motivo SEM_RELATORIO) as sessões FINALIZADA há mais de PRAZO_RELATORIO_HORAS
   * sem relatório. Com `usuarioId`, só as daquele usuário (painel).
   */
  async expirarSemRelatorio(usuarioId?: string): Promise<number> {
    const limite = new Date(Date.now() - PRAZO_RELATORIO_HORAS * 3_600_000);
    const { count } = await this.prisma.sessaoEntrevista.updateMany({
      where: {
        status: StatusSessaoEntrevista.FINALIZADA,
        finalizadaEm: { lt: limite },
        entrevistas: { none: {} },
        ...(usuarioId ? { usuarioId } : {}),
      },
      data: { status: StatusSessaoEntrevista.CANCELADA, motivoFinalizacao: MOTIVO_SEM_RELATORIO },
    });
    if (count > 0) {
      this.logger.warn(
        `${count} simulação(ões) sem relatório há mais de ${PRAZO_RELATORIO_HORAS} h cancelada(s) (SEM_RELATORIO)`,
      );
    }
    return count;
  }

  /** O relatório falhou em todas as tentativas: a sessão sai da fila (motivo SEM_RELATORIO). */
  private async desistirDoRelatorio(sessaoId: string): Promise<void> {
    const { count } = await this.prisma.sessaoEntrevista.updateMany({
      where: { id: sessaoId, status: StatusSessaoEntrevista.FINALIZADA, entrevistas: { none: {} } },
      data: { status: StatusSessaoEntrevista.CANCELADA, motivoFinalizacao: MOTIVO_SEM_RELATORIO },
    });
    if (count > 0) {
      this.logger.warn(`Relatório da sessão ${sessaoId} falhou em todas as tentativas: cancelada`);
    }
  }

  /** Sessões encerradas que ainda aguardam relatório (mais antigas primeiro). */
  async listarPendentes(limite: number) {
    await this.encerrarInativas({ dispararRelatorio: false });
    // Sessões que o n8n nunca conseguiu avaliar saem da fila (não travam as novas)
    await this.expirarSemRelatorio();

    const candidatas = await this.prisma.sessaoEntrevista.findMany({
      where: { status: StatusSessaoEntrevista.FINALIZADA, entrevistas: { none: {} } },
      orderBy: [{ finalizadaEm: 'asc' }, { iniciadaEm: 'asc' }],
      take: CANDIDATAS_PENDENTES,
      select: { id: true, usuario: { select: { telefone: true, nomeCompleto: true } } },
    });

    // Cada chamada conta como uma tentativa do relatório. Uma sessão que continua pendente espera
    // cada vez mais até a próxima (regras-sessao.ts) e, no limite, é cancelada sem relatório — assim
    // ela não gasta IA a cada ciclo nem ocupa a vez das novas. Sem Redis, todas são tentadas.
    const lote = Math.min(Math.max(limite, 1), CANDIDATAS_PENDENTES);
    const agora = new Date();
    const sessoes: typeof candidatas = [];
    for (const s of candidatas) {
      if (sessoes.length >= lote) break;
      const chave = `${CHAVE_TENTATIVAS}${s.id}`;
      const estado = await this.redis.obterJson<TentativasRelatorio>(chave);
      const decisao = decidirTentativaRelatorio(estado, agora);
      if (decisao === 'ESPERAR') continue;
      if (decisao === 'DESISTIR') {
        await this.desistirDoRelatorio(s.id);
        continue;
      }
      const tentativas = (Number(estado?.tentativas) || 0) + 1;
      await this.redis.salvarJson(
        chave,
        { tentativas, ultimaEm: agora.getTime() },
        TTL_TENTATIVAS_S,
      );
      sessoes.push(s);
    }

    return {
      sessoes: sessoes.map((s) => ({
        sessaoId: s.id,
        telefone: s.usuario.telefone,
        primeiroNome: primeiroNome(s.usuario.nomeCompleto),
      })),
    };
  }

  /** Transcrição e contexto da sessão para a IA (conversa e relatório). */
  async transcricao(sessaoId: string) {
    const sessao = await this.prisma.sessaoEntrevista.findUnique({
      where: { id: sessaoId },
      select: {
        id: true,
        usuarioId: true,
        status: true,
        cargoAlvo: true,
        empresaAlvo: true,
        iniciadaEm: true,
        finalizadaEm: true,
        usuario: { select: { nomeCompleto: true, telefone: true } },
        mensagens: {
          orderBy: { criadoEm: 'desc' },
          take: MAX_MENSAGENS_TRANSCRICAO,
          select: { autor: true, tipo: true, conteudo: true, criadoEm: true },
        },
        _count: { select: { mensagens: true } },
      },
    });
    if (!sessao) throw new NotFoundException('Sessão de entrevista não encontrada');

    const [curriculo, historico] = await Promise.all([
      this.curriculoResumido(sessao.usuarioId),
      this.historico(sessao.usuarioId, sessao.id),
    ]);
    // Buscadas da mais recente para a mais antiga (para o limite); usadas em ordem cronológica
    const mensagens = sessao.mensagens.reverse();
    const nome = primeiroNome(sessao.usuario.nomeCompleto);

    return {
      sessaoId: sessao.id,
      status: sessao.status,
      cargoAlvo: sessao.cargoAlvo,
      empresaAlvo: sessao.empresaAlvo,
      iniciadaEm: sessao.iniciadaEm,
      finalizadaEm: sessao.finalizadaEm,
      candidato: {
        primeiroNome: nome,
        nomeCompleto: sessao.usuario.nomeCompleto,
        telefone: sessao.usuario.telefone,
      },
      curriculo,
      historico,
      mensagens,
      // Prontos para os prompts do n8n (sem código no fluxo)
      totalMensagens: sessao._count.mensagens,
      ...contarParticipacao(mensagens),
      /** Respostas mínimas do candidato para a simulação ter relatório (SESSAO_MIN_MENSAGENS_CANDIDATO). */
      minimoRespostas: env.SESSAO_MIN_MENSAGENS_CANDIDATO,
      /** A Helena já acolheu um relato de sofrimento/risco: simulação pausada, sem relatório. */
      emCuidado: mensagens.some(
        (m) => m.autor === AutorMensagem.RECRUTADORA && mensagemDeCuidado(m.conteudo),
      ),
      dialogo: formatarDialogo(mensagens),
      dialogoRecente: dialogoRecente(mensagens),
      contextoTexto: textoContexto({ primeiroNome: nome, curriculo, historico }),
    };
  }

  /** Sessão em andamento (e ainda não expirada por inatividade) do usuário. */
  async sessaoAtiva(usuarioId: string) {
    const sessao = await this.prisma.sessaoEntrevista.findFirst({
      where: { usuarioId, status: StatusSessaoEntrevista.EM_ANDAMENTO },
      orderBy: { iniciadaEm: 'desc' },
      select: {
        id: true,
        iniciadaEm: true,
        ultimaMensagemEm: true,
        cargoAlvo: true,
        _count: { select: { mensagens: true } },
      },
    });
    if (!sessao || sessaoInativa(sessao.ultimaMensagemEm, new Date(), env.SESSAO_INATIVIDADE_MIN)) {
      return null;
    }
    return {
      id: sessao.id,
      iniciadaEm: sessao.iniciadaEm,
      ultimaMensagemEm: sessao.ultimaMensagemEm,
      totalMensagens: sessao._count.mensagens,
      cargoAlvo: sessao.cargoAlvo,
    };
  }

  /** Resumo do currículo mais recente do usuário (ou `null`). */
  async curriculoResumido(usuarioId: string) {
    const curriculo = await this.prisma.curriculoGerado.findFirst({
      where: { usuarioId },
      orderBy: [{ atualizadoEm: 'desc' }, { geradoEm: 'desc' }],
      select: { conteudo: true },
    });
    return curriculo ? resumirCurriculo(curriculo.conteudo) : null;
  }

  /** Simulações anteriores do usuário (sem a sessão atual), com as principais melhorias. */
  private async historico(usuarioId: string, excetoSessaoId: string) {
    const entrevistas = await this.prisma.entrevistaBot.findMany({
      where: {
        usuarioId,
        // `sessaoId <> x` no SQL ignora os nulos (registros antigos) — por isso o OR
        OR: [{ sessaoId: null }, { sessaoId: { not: excetoSessaoId } }],
      },
      orderBy: { dataRealizacao: 'desc' },
      take: HISTORICO_CONTEXTO,
      select: {
        cargoAlvo: true,
        notaGeral: true,
        dataRealizacao: true,
        pontosFortes: true,
        pontosMelhoria: true,
        dicasComunicacao: true,
        relatorio: true,
      },
    });

    return entrevistas.map((e) => ({
      cargoAlvo: e.cargoAlvo,
      notaGeral: e.notaGeral,
      dataRealizacao: e.dataRealizacao,
      principaisMelhorias: relatorioParaExibicao(e)
        .pontosMelhoria.slice(0, 3)
        .map((p) => p.titulo),
    }));
  }

  /** Encerra a sessão dentro da transação (a trava do usuário já deve estar tomada). */
  private async encerrarNaTransacao(
    tx: Prisma.TransactionClient,
    sessaoId: string,
    motivo: MotivoFinalizacao,
    finalizadaEm: Date,
  ): Promise<SessaoEncerrada> {
    const mensagensCandidato = await tx.mensagemEntrevista.count({
      where: { sessaoId, autor: AutorMensagem.CANDIDATO },
    });
    // Mensagem de acolhimento da Helena (sempre cita o CVV): a conversa não vira relatório com nota
    const acolhimentos = await tx.mensagemEntrevista.findMany({
      where: {
        sessaoId,
        autor: AutorMensagem.RECRUTADORA,
        conteudo: { contains: 'cvv', mode: 'insensitive' },
      },
      select: { conteudo: true },
      take: 5,
    });
    const cuidado = motivo === 'CUIDADO' || acolhimentos.some((m) => mensagemDeCuidado(m.conteudo));
    const status = statusAoEncerrar(
      mensagensCandidato,
      env.SESSAO_MIN_MENSAGENS_CANDIDATO,
      motivo,
      cuidado,
    );
    await tx.sessaoEntrevista.update({
      where: { id: sessaoId },
      data: { status, motivoFinalizacao: motivo, finalizadaEm },
    });
    return { sessaoId, status, motivo, cuidado };
  }

  private async aposEncerrar(usuarioId: string, e: SessaoEncerrada, dispararRelatorio: boolean) {
    await this.auditoria.registrar({
      usuarioId,
      acao: 'SESSAO_ENTREVISTA_ENCERRADA',
      entidade: 'SessaoEntrevista',
      entidadeId: e.sessaoId,
      detalhes: { motivo: e.motivo, status: e.status },
    });
    if (dispararRelatorio && e.status === StatusSessaoEntrevista.FINALIZADA) {
      this.dispararRelatorio(e.sessaoId);
    }
  }

  /**
   * Avisa o fluxo de relatório do n8n (se configurado) em segundo plano.
   * Uma falha aqui não afeta a requisição: o agendamento do fluxo busca as sessões pendentes.
   */
  private dispararRelatorio(sessaoId: string): void {
    const url = env.N8N_RELATORIO_WEBHOOK_URL;
    if (!url) return;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (env.N8N_API_KEY) headers[N8N_API_KEY_HEADER] = env.N8N_API_KEY;

    void fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sessaoId }),
      signal: AbortSignal.timeout(env.N8N_TIMEOUT_MS),
    })
      .then(async (res) => {
        await res.body?.cancel().catch(() => undefined);
        if (!res.ok) {
          this.logger.warn(`n8n (relatório) respondeu ${res.status} para a sessão ${sessaoId}`);
        }
      })
      .catch((e: unknown) => {
        this.logger.warn(
          `Falha ao disparar o relatório da sessão ${sessaoId}: ${(e as Error).message}`,
        );
      });
  }
}
