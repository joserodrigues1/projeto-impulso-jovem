/**
 * Funções puras do painel do administrador: datas no fuso de São Paulo, máscaras (LGPD),
 * rótulos da auditoria e planilha CSV. Sem acesso ao banco — testadas em admin-utils.spec.ts.
 */
import { BadRequestException } from '@nestjs/common';
import { normalizarTelefone } from '../../common/validators/telefone';
import {
  CLASSIFICACOES,
  Classificacao,
  derivarClassificacao,
} from '../entrevistas/relatorio-entrevista';

export const FUSO_HORARIO = 'America/Sao_Paulo';
/** Período padrão do resumo: os últimos 30 dias, contando hoje. */
export const DIAS_PERIODO_PADRAO = 30;
export const MAX_DIAS_PERIODO = 366;

const DIA_MS = 86_400_000;
const DIA_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const MASCARA = '•';

export const MENSAGENS_PERIODO = {
  dataInvalida: 'Data inválida: use o formato AAAA-MM-DD',
  invertido: 'A data inicial não pode ser depois da data final',
  longoDemais: `O período pode ter no máximo ${MAX_DIAS_PERIODO} dias`,
} as const;

// ───────────────────────────── Datas (fuso de São Paulo) ─────────────────────────────

const formatoDia = new Intl.DateTimeFormat('en-US', {
  timeZone: FUSO_HORARIO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/** Partes da data/hora no relógio de São Paulo. */
function partesSP(data: Date) {
  const partes: Record<string, number> = {};
  for (const p of formatoDia.formatToParts(data)) {
    if (p.type !== 'literal') partes[p.type] = Number(p.value);
  }
  return partes as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>;
}

const doisDigitos = (n: number) => String(n).padStart(2, '0');

/** Dia de calendário ("AAAA-MM-DD") de um instante, no relógio de São Paulo. */
export function diaEmSaoPaulo(data: Date): string {
  const p = partesSP(data);
  return `${p.year}-${doisDigitos(p.month)}-${doisDigitos(p.day)}`;
}

/** Lê "AAAA-MM-DD" (data de calendário real); `null` se o texto não for uma data válida. */
export function lerDia(texto: unknown): string | null {
  if (typeof texto !== 'string') return null;
  const m = DIA_REGEX.exec(texto.trim());
  if (!m) return null;
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  // 2026-02-30 "rola" para março: não é uma data real
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia)
    return null;
  return m[0];
}

/** Meia-noite UTC do dia de calendário (só para contas de calendário, sem fuso). */
const utcDoDia = (dia: string) => Date.parse(`${dia}T00:00:00Z`);

export function somarDias(dia: string, dias: number): string {
  return new Date(utcDoDia(dia) + dias * DIA_MS).toISOString().slice(0, 10);
}

/** Quantos dias do primeiro ao último, contando os dois ("2026-10-01" a "2026-10-01" = 1). */
export function diasNoIntervalo(de: string, ate: string): number {
  return Math.round((utcDoDia(ate) - utcDoDia(de)) / DIA_MS) + 1;
}

/**
 * Instante em que o dia começa em São Paulo (ex.: "2026-10-10" → 2026-10-10T03:00:00Z).
 * O deslocamento é lido ao meio-dia do próprio dia: o Brasil não tem horário de verão
 * desde 2019, mas assim datas antigas também caem no dia certo.
 */
export function inicioDoDiaSP(dia: string): Date {
  const meiaNoiteUtc = utcDoDia(dia);
  const meioDia = new Date(meiaNoiteUtc + DIA_MS / 2);
  const p = partesSP(meioDia);
  const relogioLocal = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const deslocamento = relogioLocal - meioDia.getTime();
  return new Date(meiaNoiteUtc - deslocamento);
}

/** Segunda-feira ("AAAA-MM-DD") da semana do instante ou do dia informado, em São Paulo. */
export function inicioDaSemana(data: Date | string): string {
  const dia = typeof data === 'string' ? data : diaEmSaoPaulo(data);
  const diaDaSemana = new Date(utcDoDia(dia)).getUTCDay(); // 0 = domingo
  return somarDias(dia, -((diaDaSemana + 6) % 7));
}

/** Segundas-feiras de todas as semanas do intervalo, sem buracos (vazio se `de` > `ate`). */
export function semanasEntre(de: Date | string, ate: Date | string): string[] {
  const ultima = inicioDaSemana(ate);
  const semanas: string[] = [];
  for (let s = inicioDaSemana(de); s <= ultima; s = somarDias(s, 7)) semanas.push(s);
  return semanas;
}

export interface IntervaloDatas {
  /** Início (inclusivo): meia-noite do primeiro dia em São Paulo. */
  inicio?: Date;
  /** Fim (exclusivo): meia-noite do dia seguinte ao último. */
  fim?: Date;
}

/** Filtro opcional de datas (auditoria): só confere o formato e a ordem. */
export function intervaloDeDatas(de?: string, ate?: string): IntervaloDatas {
  const diaDe = de === undefined ? undefined : lerDia(de);
  const diaAte = ate === undefined ? undefined : lerDia(ate);
  if (diaDe === null || diaAte === null) {
    throw new BadRequestException(MENSAGENS_PERIODO.dataInvalida);
  }
  if (diaDe && diaAte && diaDe > diaAte) throw new BadRequestException(MENSAGENS_PERIODO.invertido);
  return {
    ...(diaDe ? { inicio: inicioDoDiaSP(diaDe) } : {}),
    ...(diaAte ? { fim: inicioDoDiaSP(somarDias(diaAte, 1)) } : {}),
  };
}

export interface Periodo {
  de: string;
  ate: string;
  inicio: Date;
  fim: Date;
}

/**
 * Período do resumo e do CSV de uso. Sem datas: os últimos 30 dias (até hoje, em São Paulo).
 * Só `de`: até hoje. Só `ate`: os 30 dias que terminam nele. 400 para data inválida,
 * `de` depois de `ate` ou mais de 366 dias.
 */
export function validarPeriodo(de?: string, ate?: string, agora = new Date()): Periodo {
  const diaAte = ate === undefined ? diaEmSaoPaulo(agora) : lerDia(ate);
  const diaDe =
    de === undefined && diaAte ? somarDias(diaAte, -(DIAS_PERIODO_PADRAO - 1)) : lerDia(de);
  if (!diaDe || !diaAte) throw new BadRequestException(MENSAGENS_PERIODO.dataInvalida);
  if (diaDe > diaAte) throw new BadRequestException(MENSAGENS_PERIODO.invertido);
  if (diasNoIntervalo(diaDe, diaAte) > MAX_DIAS_PERIODO) {
    throw new BadRequestException(MENSAGENS_PERIODO.longoDemais);
  }
  return {
    de: diaDe,
    ate: diaAte,
    inicio: inicioDoDiaSP(diaDe),
    fim: inicioDoDiaSP(somarDias(diaAte, 1)),
  };
}

/** "10/10/2026" a partir de "2026-10-10". */
export function formatarDia(dia: string): string {
  const [ano, mes, d] = dia.split('-');
  return `${d}/${mes}/${ano}`;
}

/** "10/10/2026 14:05" no relógio de São Paulo; vazio sem data. */
export function formatarDataHora(data: Date | null | undefined): string {
  if (!data) return '';
  const p = partesSP(data);
  return `${doisDigitos(p.day)}/${doisDigitos(p.month)}/${p.year} ${doisDigitos(p.hour)}:${doisDigitos(p.minute)}`;
}

/** A mais recente das datas informadas (ignora vazias). */
export function maisRecente(...datas: Array<Date | null | undefined>): Date | null {
  let resultado: Date | null = null;
  for (const d of datas) {
    if (d && (!resultado || d.getTime() > resultado.getTime())) resultado = d;
  }
  return resultado;
}

// ───────────────────────────── Máscaras (LGPD) ─────────────────────────────

/**
 * "5561999999999" → "(61) 9••••-9999"; fixo "556133334444" → "(61) 3•••-4444".
 * Número fora do padrão (cadastro antigo): só os 4 últimos dígitos aparecem.
 */
export function mascararTelefone(telefone: string | null | undefined): string {
  if (!telefone) return '';
  const normalizado = normalizarTelefone(telefone);
  if (!normalizado) {
    const digitos = telefone.replace(/\D/g, '');
    return digitos.length > 4 ? `${MASCARA.repeat(4)}-${digitos.slice(-4)}` : MASCARA.repeat(4);
  }
  const ddd = normalizado.slice(2, 4);
  const numero = normalizado.slice(4);
  const meio = MASCARA.repeat(numero.length - 5);
  return `(${ddd}) ${numero[0]}${meio}-${numero.slice(-4)}`;
}

/** Expande um IPv6 ("2804:14c::1") para os 8 grupos; `null` se não for um IPv6. */
function gruposIpv6(ip: string): string[] | null {
  if (!/^[0-9a-f:]+$/i.test(ip) || (ip.match(/::/g) ?? []).length > 1) return null;
  const [esquerda, direita] = ip.includes('::') ? ip.split('::') : [ip, undefined];
  const inicio = esquerda ? esquerda.split(':') : [];
  const fim = direita ? direita.split(':') : [];
  const faltam = 8 - inicio.length - fim.length;
  if (direita === undefined ? faltam !== 0 : faltam < 1) return null;
  const grupos = [
    ...inicio,
    ...Array<string>(direita === undefined ? 0 : faltam).fill('0'),
    ...fim,
  ];
  if (grupos.some((g) => !/^[0-9a-f]{1,4}$/i.test(g))) return null;
  return grupos.map((g) => g.toLowerCase().replace(/^0+(?=.)/, ''));
}

/**
 * IPv4 "177.37.10.20" → "177.37.•••.•••" (também na forma "::ffff:177.37.10.20").
 * IPv6: só os 3 primeiros grupos (o prefixo /48 do provedor) — "2804:14c:5b:•••".
 * Vazio → `null`; formato desconhecido → "•••".
 */
export function mascararIp(ip: string | null | undefined): string | null {
  const valor = ip?.trim();
  if (!valor) return null;
  const v4 = /^(?:::ffff:)?(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/i.exec(valor);
  if (v4) return `${v4[1]}.${v4[2]}.${MASCARA.repeat(3)}.${MASCARA.repeat(3)}`;
  const grupos = gruposIpv6(valor.replace(/%.*$/, ''));
  if (grupos) return `${grupos.slice(0, 3).join(':')}:${MASCARA.repeat(3)}`;
  return MASCARA.repeat(3);
}

// ───────────────────────────── Auditoria ─────────────────────────────

/** Rótulos em português das ações registradas na auditoria. */
export const ROTULOS_ACAO: Readonly<Record<string, string>> = {
  CADASTRO_USUARIO: 'Cadastro',
  LOGIN_SUCESSO: 'Login',
  LOGIN_FALHA: 'Login com senha errada',
  REFRESH_TOKEN_REUSO_DETECTADO: 'Sessão encerrada por suspeita de uso indevido',
  RECUPERACAO_SENHA_SOLICITADA: 'Pediu para recuperar a senha',
  SENHA_REDEFINIDA: 'Senha redefinida pelo link do e-mail',
  SENHA_ALTERADA: 'Senha alterada',
  TELEFONE_ALTERADO: 'WhatsApp alterado',
  CONTA_EXCLUIDA: 'Conta excluída',
  CURRICULO_GERADO: 'Currículo gerado',
  CURRICULO_ATUALIZADO: 'Currículo editado',
  CURRICULO_EXCLUIDO: 'Currículo excluído',
  SESSAO_ENTREVISTA_INICIADA: 'Simulação iniciada',
  SESSAO_ENTREVISTA_ENCERRADA: 'Simulação encerrada',
  ENTREVISTA_SIMULADA_REGISTRADA: 'Relatório da simulação gerado',
  ADMIN_VISUALIZOU: 'Administrador abriu dados de um participante',
  ADMIN_EXPORTOU: 'Administrador exportou planilha',
};

/** Rótulo da ação; ação desconhecida aparece como veio. */
export function rotuloAcao(acao: string): string {
  return Object.hasOwn(ROTULOS_ACAO, acao) ? ROTULOS_ACAO[acao] : acao;
}

/**
 * Chaves que podem guardar conteúdo, dado pessoal ou segredo — nunca aparecem no painel.
 * Os blocos de conteúdo ("relatorio", "curriculo"...) saem pelo nome exato, para não levar
 * junto contadores como "versaoRelatorio" ou "comCurriculoAntigo". O IP é tratado à parte,
 * palavra por palavra ("ip", "ipOrigem", "enderecoIp", "IP_ORIGEM", "clientIP"...), sem pegar
 * "participanteId" nem "tipo".
 */
const CHAVE_SENSIVEL =
  /(conteudo|texto|mensage|transcri|dialogo|observac|e-?mail|telefone|whatsapp|celular|senha|password|token|segredo|secret|cpf|documento|endereco|addr|forwarded|user_?agent|busca|nome)/i;
const CHAVE_CONTEUDO = /^(relatorio|curriculo|resposta|dados|corpo|payload|arquivo)$/i;
const PALAVRA_IP = /^ip(v[46])?$/;
/** Textos que passam: ids, códigos e datas ("CONCLUIDA", "ficha", uuid, "2026-10-10"). */
const TEXTO_CODIGO = /^[\w.:-]{1,64}$/;
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
/** Só dígitos e pontuação de telefone/CPF ("5561999999999", "123.456.789-09"). */
const SO_DIGITOS_E_PONTUACAO = /^[\d().+-]+$/;
const MIN_DIGITOS_PESSOAIS = 8;
const PROFUNDIDADE_MAXIMA = 3;
const MAX_ITENS_LISTA = 20;

/** Palavras de uma chave: "enderecoIp" → ["endereco", "ip"]; "IP_ORIGEM" → ["ip", "origem"]. */
function palavrasDaChave(chave: string): string[] {
  return chave
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[\s_.-]+/)
    .filter(Boolean)
    .map((p) => p.toLowerCase());
}

function chaveSensivel(chave: string): boolean {
  return (
    chave === '__proto__' ||
    CHAVE_SENSIVEL.test(chave) ||
    CHAVE_CONTEUDO.test(chave) ||
    palavrasDaChave(chave).some((p) => PALAVRA_IP.test(p))
  );
}

/**
 * Texto com cara de dado pessoal mesmo debaixo de uma chave inocente: endereço IP ou
 * sequência longa de dígitos (telefone, CPF). Datas "AAAA-MM-DD" passam.
 */
function pareceDadoPessoal(texto: string): boolean {
  if (DATA_ISO.test(texto)) return false;
  if (SO_DIGITOS_E_PONTUACAO.test(texto) && texto.replace(/\D/g, '').length >= MIN_DIGITOS_PESSOAIS)
    return true;
  return /^(?:::ffff:)?\d{1,3}(?:\.\d{1,3}){3}$/i.test(texto) || gruposIpv6(texto) !== null;
}

function sanitizarValor(valor: unknown, profundidade: number): unknown {
  if (valor === null || typeof valor === 'boolean') return valor;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : undefined;
  if (typeof valor === 'string')
    return TEXTO_CODIGO.test(valor) && !pareceDadoPessoal(valor) ? valor : undefined;
  if (profundidade >= PROFUNDIDADE_MAXIMA) return undefined;
  if (Array.isArray(valor)) {
    return valor
      .slice(0, MAX_ITENS_LISTA)
      .map((v) => sanitizarValor(v, profundidade + 1))
      .filter((v) => v !== undefined);
  }
  if (typeof valor === 'object')
    return sanitizarObjeto(valor as Record<string, unknown>, profundidade + 1);
  return undefined;
}

function sanitizarObjeto(obj: Record<string, unknown>, profundidade: number) {
  const limpo: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(obj)) {
    if (chaveSensivel(chave)) continue;
    const v = sanitizarValor(valor, profundidade);
    if (v !== undefined) limpo[chave] = v;
  }
  return limpo;
}

/**
 * `detalhes` da auditoria prontos para o painel: tira chaves que possam ter conteúdo,
 * dado pessoal, segredo ou IP e textos livres; mantém booleanos, números, ids e códigos.
 * `null` quando não sobra nada (ou quando não é um objeto).
 */
export function sanitizarDetalhes(detalhes: unknown): Record<string, unknown> | null {
  if (!detalhes || typeof detalhes !== 'object' || Array.isArray(detalhes)) return null;
  const limpo = sanitizarObjeto(detalhes as Record<string, unknown>, 0);
  return Object.keys(limpo).length ? limpo : null;
}

// ───────────────────────────── Relatórios ─────────────────────────────

/**
 * Classificação de um relatório: a gravada (o relatório já é salvo normalizado) ou, em
 * registros antigos, a derivada da nota. `null` sem nenhuma das duas.
 */
export function classificacaoDe(classificacao: unknown, nota: number | null): Classificacao | null {
  if (
    typeof classificacao === 'string' &&
    (CLASSIFICACOES as readonly string[]).includes(classificacao)
  )
    return classificacao as Classificacao;
  return nota === null ? null : derivarClassificacao(nota);
}

// ───────────────────────────── Busca ─────────────────────────────

/** Letras acentuadas e os equivalentes sem acento (mesma ordem) — usado também no SQL (`translate`). */
export const ACENTOS = 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ';
export const SEM_ACENTOS = 'AAAAAEEEEIIIIOOOOOUUUUCNaaaaaeeeeiiiiooooouuuucn';

/**
 * Padrão para `LIKE` (sem diferenciar maiúsculas nem acentos): "João_1" → "%joao\_1%".
 * Os curingas digitados viram texto comum.
 */
export function padraoBusca(texto: string): string {
  const semAcento = [...texto.trim()]
    .map((c) => {
      const i = ACENTOS.indexOf(c);
      return i >= 0 ? SEM_ACENTOS[i] : c;
    })
    .join('')
    .toLowerCase();
  return `%${semAcento.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

// ───────────────────────────── CSV ─────────────────────────────

export type CelulaCsv = string | number | boolean | null | undefined;

/** Marca de UTF-8 no início do arquivo: o Excel abre os acentos certos. */
const BOM_UTF8 = String.fromCharCode(0xfeff);

/**
 * Início que faria o Excel/Sheets interpretar a célula como fórmula (também as versões de
 * largura total, "＝＋－＠", que algumas versões do Excel aceitam).
 */
const INICIO_FORMULA = /^[=+\-@\t\r＝＋－＠]/;

function celulaCsv(valor: CelulaCsv): string {
  let texto: string;
  if (valor === null || valor === undefined) texto = '';
  else if (typeof valor === 'number')
    texto = Number.isFinite(valor) ? String(valor).replace('.', ',') : '';
  else if (typeof valor === 'boolean') texto = valor ? 'Sim' : 'Não';
  else texto = INICIO_FORMULA.test(valor) ? `'${valor}` : valor;
  return `"${texto.replace(/"/g, '""')}"`;
}

/**
 * Planilha CSV para o Excel em português: BOM UTF-8, separador `;`, decimal com vírgula,
 * todas as células entre aspas e proteção contra injeção de fórmula.
 */
export function paraCsv(cabecalho: string[], linhas: CelulaCsv[][]): string {
  const todas = [cabecalho, ...linhas].map((l) => l.map(celulaCsv).join(';'));
  return `${BOM_UTF8}${todas.join('\r\n')}\r\n`;
}
