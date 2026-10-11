/**
 * Regras do ciclo de vida de uma simulação no WhatsApp (funções puras, sem banco).
 * EM_ANDAMENTO → FINALIZADA → ANALISADA, ou EM_ANDAMENTO → CANCELADA.
 */
import { StatusSessaoEntrevista } from '@prisma/client';

/**
 * CUIDADO: a Helena pausou a simulação porque o jovem relatou sofrimento ou risco — a conversa não vira
 * relatório com nota (a sessão é cancelada, qualquer que seja o número de respostas).
 */
export const MOTIVOS_FINALIZACAO = [
  'CONCLUIDA',
  'SOLICITADA_USUARIO',
  'INATIVIDADE',
  'CUIDADO',
] as const;
export type MotivoFinalizacao = (typeof MOTIVOS_FINALIZACAO)[number];

export type StatusEncerramento =
  typeof StatusSessaoEntrevista.FINALIZADA | typeof StatusSessaoEntrevista.CANCELADA;

const MINUTO_MS = 60_000;

/** Última mensagem aceita antes de a sessão ser considerada inativa. */
export function limiteInatividade(agora: Date, minutosInatividade: number): Date {
  return new Date(agora.getTime() - minutosInatividade * MINUTO_MS);
}

/** A sessão está parada há mais de `minutosInatividade`? */
export function sessaoInativa(
  ultimaMensagemEm: Date,
  agora: Date,
  minutosInatividade: number,
): boolean {
  return ultimaMensagemEm.getTime() < limiteInatividade(agora, minutosInatividade).getTime();
}

/**
 * Quando o jovem relata sofrimento ou risco, a Helena acolhe, pausa a simulação e SEMPRE indica o CVV
 * (o fluxo do n8n garante a menção). Essa menção marca a conversa: ela não vira relatório com nota.
 */
export const MENCAO_CUIDADO = /\bcvv\b/i;

export function mensagemDeCuidado(texto: string): boolean {
  return MENCAO_CUIDADO.test(texto);
}

/**
 * Status de uma sessão ao ser encerrada: só segue para o relatório se o candidato
 * respondeu ao menos `minimoRespostas` vezes e a conversa não teve um momento de cuidado
 * (motivo CUIDADO ou mensagem de acolhimento da Helena); senão, é cancelada.
 */
export function statusAoEncerrar(
  mensagensCandidato: number,
  minimoRespostas: number,
  motivo?: MotivoFinalizacao,
  houveCuidado = false,
): StatusEncerramento {
  if (motivo === 'CUIDADO' || houveCuidado) return StatusSessaoEntrevista.CANCELADA;
  return mensagensCandidato >= minimoRespostas
    ? StatusSessaoEntrevista.FINALIZADA
    : StatusSessaoEntrevista.CANCELADA;
}

/**
 * Quando a sessão é encerrada por inatividade, a conversa terminou na última mensagem;
 * nos demais casos, no momento do encerramento.
 */
export function momentoEncerramento(
  motivo: MotivoFinalizacao,
  ultimaMensagemEm: Date,
  agora: Date,
): Date {
  return motivo === 'INATIVIDADE' ? ultimaMensagemEm : agora;
}

// ───────────────────────────── Tentativas do relatório ─────────────────────────────

/** Tentativas do agendamento do n8n por sessão antes de desistir do relatório. */
export const MAX_TENTATIVAS_RELATORIO = 8;
/** Espera máxima entre duas tentativas (6 h). */
const ESPERA_MAXIMA_MIN = 360;

export interface TentativasRelatorio {
  tentativas: number;
  /** Momento da última tentativa (ms). */
  ultimaEm: number;
}

/**
 * Espera antes da próxima tentativa de uma sessão que continua sem relatório: 10 min, 20, 40...
 * até 6 h (com 1 min de folga para o atraso natural do agendamento). Assim uma sessão problemática
 * não gasta IA a cada ciclo nem ocupa a vez das sessões novas.
 */
export function esperaEntreTentativasMs(tentativas: number): number {
  if (tentativas <= 0) return 0;
  return (Math.min(10 * 2 ** (tentativas - 1), ESPERA_MAXIMA_MIN) - 1) * MINUTO_MS;
}

/** O agendamento deve tentar esta sessão agora, esperar mais um pouco ou desistir dela? */
export function decidirTentativaRelatorio(
  estado: TentativasRelatorio | null,
  agora: Date,
  maximo = MAX_TENTATIVAS_RELATORIO,
): 'TENTAR' | 'ESPERAR' | 'DESISTIR' {
  const tentativas = Number(estado?.tentativas) || 0;
  if (tentativas <= 0) return 'TENTAR';
  if (tentativas >= maximo) return 'DESISTIR';
  const ultimaEm = Number(estado?.ultimaEm) || 0;
  return agora.getTime() - ultimaEm >= esperaEntreTentativasMs(tentativas) ? 'TENTAR' : 'ESPERAR';
}
