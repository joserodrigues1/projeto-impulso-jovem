/**
 * Relatório estruturado de uma simulação de entrevista (`EntrevistaBot.relatorio`).
 * Contrato: docs/ARQUITETURA.md, seção 4.2.
 *
 * A resposta da IA é tratada como não confiável: só aproveitamos campos com o tipo
 * esperado, com limites de tamanho e de quantidade.
 */
import { cortar, ehObjeto, itensValidos, Objeto, sanitizarTexto, textoLimpo } from './normalizacao';

export const CLASSIFICACOES = ['INICIANTE', 'EM_DESENVOLVIMENTO', 'PREPARADO', 'DESTAQUE'] as const;
export type Classificacao = (typeof CLASSIFICACOES)[number];

// `type` (e não `interface`) para o Prisma aceitar o objeto como JSON
export type Competencia = { nome: string; nota: number; comentario: string };
export type PontoForte = { titulo: string; descricao: string; evidencia?: string };
export type PontoMelhoria = PontoForte & { comoMelhorar: string };
export type PassoPlano = { passo: string; prazo?: string };
export type ExemploResposta = { pergunta: string; resposta: string };

export type RelatorioEntrevista = {
  versao: 1;
  notaGeral: number;
  classificacao: Classificacao;
  resumo: string;
  recomendacao: string;
  competencias: Competencia[];
  pontosFortes: PontoForte[];
  pontosMelhoria: PontoMelhoria[];
  dicasComunicacao: string[];
  planoDeAcao: PassoPlano[];
  perguntasParaPraticar: string[];
  exemploResposta?: ExemploResposta;
};

/** Relatório parcial montado a partir dos campos de texto de registros antigos. */
export type RelatorioLegado = Omit<
  RelatorioEntrevista,
  'versao' | 'notaGeral' | 'classificacao'
> & {
  versao: 0;
  notaGeral: number | null;
  classificacao: Classificacao | null;
};

/** Campos de texto legados de `EntrevistaBot` (uma linha por item). */
export type TextosLegados = {
  pontosFortes: string;
  pontosMelhoria: string;
  dicasComunicacao: string;
};

export const LIMITES_RELATORIO = {
  resumo: 800,
  recomendacao: 300,
  comentario: 400,
  /** Strings de lista: descrição, evidência, dicas, passos, perguntas. */
  texto: 600,
  titulo: 120,
  nomeCompetencia: 80,
  prazo: 60,
  resposta: 1200,
  /** Máximo de itens por lista no relatório v1. */
  itens: 6,
  /** Registros antigos podem ter mais linhas — mostramos um pouco mais. */
  itensLegado: 12,
  descricaoLegado: 1500,
} as const;

const L = LIMITES_RELATORIO;

// ───────────────────────────── Nota e classificação ─────────────────────────────

/** Limita a 0–10 com uma casa decimal. */
export function arredondarNota(n: number): number {
  return Math.round(Math.min(10, Math.max(0, n)) * 10) / 10;
}

/** Lê uma nota (número ou texto como "7,5"); `null` se não for numérica. */
export function normalizarNota(valor: unknown): number | null {
  let n: number;
  if (typeof valor === 'number') n = valor;
  else if (typeof valor === 'string' && valor.trim() !== '') {
    n = Number.parseFloat(valor.trim().replace(',', '.'));
  } else return null;
  return Number.isFinite(n) ? arredondarNota(n) : null;
}

export function derivarClassificacao(nota: number): Classificacao {
  if (nota < 4) return 'INICIANTE';
  if (nota < 6.5) return 'EM_DESENVOLVIMENTO';
  if (nota < 8.5) return 'PREPARADO';
  return 'DESTAQUE';
}

/** Aceita variações como "Em desenvolvimento" ou "em-desenvolvimento". */
function lerClassificacao(valor: unknown): Classificacao | null {
  if (typeof valor !== 'string' || valor.length > 40) return null;
  const chave = valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  return (CLASSIFICACOES as readonly string[]).includes(chave) ? (chave as Classificacao) : null;
}

function media(notas: number[]): number | null {
  if (!notas.length) return null;
  return arredondarNota(notas.reduce((a, b) => a + b, 0) / notas.length);
}

// ───────────────────────────── Títulos e linhas ─────────────────────────────

/** Título curto derivado de um texto: a primeira frase, com até `max` caracteres. */
export function tituloCurto(texto: string, max = 60): string {
  // Só a primeira frase importa: limitar a entrada mantém os regexes baratos
  const linha = sanitizarTexto(cortar(texto, Math.max(max * 10, 600)), false);
  const frase = linha
    .split(/(?<=[.!?;])\s|\s[-–—]\s/)[0]
    .replace(/[.!?;:,]+$/, '')
    .trim();
  if (frase.length <= max) return frase;
  const corte = cortar(frase, max);
  const ultimoEspaco = corte.lastIndexOf(' ');
  const base = ultimoEspaco > max / 2 ? corte.slice(0, ultimoEspaco) : corte;
  return `${base.replace(/[\s.,;:!?-]+$/, '')}…`;
}

/** Marcadores de lista no começo da linha: "-", "•", "*", "1.", "2)". */
const MARCADOR = /^\s*(?:[-*•–—]|\d{1,2}[.)])\s*/;

/** Linha sem marcador de lista nem negrito do markdown. */
function limparLinha(linha: string): string {
  return sanitizarTexto(linha.replace(/\*\*|__/g, '').replace(MARCADOR, ''), false);
}

/**
 * Converte uma linha de texto em item com título e descrição.
 * "Título: descrição" é separado; sem título, ele é derivado da própria linha.
 */
function itemDeLinha(linha: string, maxDescricao: number): PontoForte | null {
  const texto = limparLinha(linha);
  if (!texto) return null;
  const separador = texto.indexOf(': ');
  if (separador >= 2 && separador <= L.titulo) {
    const titulo = texto.slice(0, separador).trim();
    const descricao = texto.slice(separador + 2).trim();
    if (titulo && descricao) return { titulo, descricao: cortar(descricao, maxDescricao) };
  }
  const descricao = cortar(texto, maxDescricao);
  return { titulo: tituloCurto(descricao), descricao };
}

function linhas(texto: string | null | undefined): string[] {
  if (!texto) return [];
  return texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

// ───────────────────────────── Itens do relatório ─────────────────────────────

function pontoForte(item: unknown): PontoForte | null {
  if (typeof item === 'string') return itemDeLinha(item, L.texto);
  if (!ehObjeto(item)) return null;
  const titulo = textoLimpo(item.titulo, L.titulo);
  const descricao = textoLimpo(item.descricao, L.texto, true);
  if (!titulo || !descricao) return null;
  const evidencia = textoLimpo(item.evidencia, L.texto);
  return evidencia ? { titulo, descricao, evidencia } : { titulo, descricao };
}

function pontoMelhoria(item: unknown): PontoMelhoria | null {
  const base = pontoForte(item);
  if (!base) return null;
  const comoMelhorar = ehObjeto(item) ? textoLimpo(item.comoMelhorar, L.texto, true) : '';
  return { ...base, comoMelhorar };
}

function competencia(item: unknown): Competencia | null {
  if (!ehObjeto(item)) return null;
  const nome = textoLimpo(item.nome, L.nomeCompetencia);
  const nota = normalizarNota(item.nota);
  if (!nome || nota === null) return null;
  return { nome, nota, comentario: textoLimpo(item.comentario, L.comentario, true) };
}

function passoPlano(item: unknown): PassoPlano | null {
  if (typeof item === 'string') {
    const passo = textoLimpo(item.replace(MARCADOR, ''), L.texto);
    return passo ? { passo } : null;
  }
  if (!ehObjeto(item)) return null;
  const passo = textoLimpo(item.passo, L.texto);
  if (!passo) return null;
  const prazo = textoLimpo(item.prazo, L.prazo);
  return prazo ? { passo, prazo } : { passo };
}

function frase(item: unknown): string | null {
  return typeof item === 'string' ? textoLimpo(item.replace(MARCADOR, ''), L.texto) || null : null;
}

function exemploResposta(valor: unknown): ExemploResposta | null {
  if (!ehObjeto(valor)) return null;
  const pergunta = textoLimpo(valor.pergunta, L.texto);
  const resposta = textoLimpo(valor.resposta, L.resposta, true);
  return pergunta && resposta ? { pergunta, resposta } : null;
}

// ───────────────────────────── API pública ─────────────────────────────

/** Campos que indicam que o objeto já é o relatório (e não um envelope dele). */
const CAMPOS_RELATORIO = ['notaGeral', 'pontosFortes', 'pontosMelhoria', 'competencias'];

/** Tira a cerca de bloco de código (```json ... ```) que a IA às vezes devolve. */
function semCercaDeCodigo(texto: string): string {
  let t = texto.trim();
  // Sem regex com `\s*` no fim: em textos enormes ela fica quadrática
  if (t.startsWith('```')) t = t.replace(/^```(?:json)?/i, '');
  if (t.endsWith('```')) t = t.slice(0, -3);
  return t.trim();
}

/**
 * Extrai o objeto do relatório das formas que o n8n costuma devolver:
 * objeto, string JSON (com ou sem bloco ```json), `[{...}]`, `{ output: ... }` ou `{ relatorio: ... }`.
 */
export function desembrulharRelatorio(valor: unknown, profundidade = 0): Objeto | null {
  if (profundidade > 4) return null;
  if (typeof valor === 'string') {
    try {
      return desembrulharRelatorio(JSON.parse(semCercaDeCodigo(valor)), profundidade + 1);
    } catch {
      return null;
    }
  }
  if (Array.isArray(valor)) {
    return valor.length ? desembrulharRelatorio(valor[0], profundidade + 1) : null;
  }
  if (!ehObjeto(valor)) return null;
  if (!CAMPOS_RELATORIO.some((campo) => campo in valor)) {
    if ('output' in valor) return desembrulharRelatorio(valor.output, profundidade + 1);
    if ('relatorio' in valor) return desembrulharRelatorio(valor.relatorio, profundidade + 1);
  }
  return valor;
}

/**
 * Normaliza o relatório da IA para o formato v1. Devolve `null` se não der para aproveitar:
 * sem nota (nem em `padroes.notaGeral`, nem pela média das competências) ou sem nenhum
 * ponto forte/de melhoria válido.
 */
export function normalizarRelatorio(
  valor: unknown,
  padroes: { notaGeral?: number | null } = {},
): RelatorioEntrevista | null {
  const dados = desembrulharRelatorio(valor);
  if (!dados) return null;

  const competencias = itensValidos(dados.competencias, L.itens, competencia);
  const notaGeral =
    normalizarNota(dados.notaGeral) ??
    normalizarNota(padroes.notaGeral) ??
    media(competencias.map((c) => c.nota));
  if (notaGeral === null) return null;

  const pontosFortes = itensValidos(dados.pontosFortes, L.itens, pontoForte);
  const pontosMelhoria = itensValidos(dados.pontosMelhoria, L.itens, pontoMelhoria);
  if (!pontosFortes.length && !pontosMelhoria.length) return null;

  const relatorio: RelatorioEntrevista = {
    versao: 1,
    notaGeral,
    classificacao: lerClassificacao(dados.classificacao) ?? derivarClassificacao(notaGeral),
    resumo: textoLimpo(dados.resumo, L.resumo, true),
    recomendacao: textoLimpo(dados.recomendacao, L.recomendacao),
    competencias,
    pontosFortes,
    pontosMelhoria,
    dicasComunicacao: itensValidos(dados.dicasComunicacao, L.itens, frase),
    planoDeAcao: itensValidos(dados.planoDeAcao, L.itens, passoPlano),
    perguntasParaPraticar: itensValidos(dados.perguntasParaPraticar, L.itens, frase),
  };
  const exemplo = exemploResposta(dados.exemploResposta);
  if (exemplo) relatorio.exemploResposta = exemplo;
  return relatorio;
}

/** Monta um relatório parcial (versao 0) a partir dos campos de texto de registros antigos. */
export function relatorioLegado(
  entrevista: TextosLegados & { notaGeral?: number | null },
): RelatorioLegado {
  const nota = normalizarNota(entrevista.notaGeral);
  const itens = (texto: string) =>
    itensValidos(linhas(texto), L.itensLegado, (l) => itemDeLinha(String(l), L.descricaoLegado));
  const dica = (l: unknown) => cortar(limparLinha(String(l)), L.descricaoLegado) || null;

  return {
    versao: 0,
    notaGeral: nota,
    classificacao: nota === null ? null : derivarClassificacao(nota),
    resumo: '',
    recomendacao: '',
    competencias: [],
    pontosFortes: itens(entrevista.pontosFortes),
    pontosMelhoria: itens(entrevista.pontosMelhoria).map((p) => ({ ...p, comoMelhorar: '' })),
    dicasComunicacao: itensValidos(linhas(entrevista.dicasComunicacao), L.itensLegado, dica),
    planoDeAcao: [],
    perguntasParaPraticar: [],
  };
}

/** Relatório para exibição: o v1 salvo ou, em registros antigos, o legado (versao 0). */
export function relatorioParaExibicao(
  entrevista: TextosLegados & { notaGeral: number | null; relatorio: unknown },
): RelatorioEntrevista | RelatorioLegado {
  return (
    normalizarRelatorio(entrevista.relatorio, { notaGeral: entrevista.notaGeral }) ??
    relatorioLegado(entrevista)
  );
}

/**
 * Versão em texto do relatório para as colunas legadas (obrigatórias) de `EntrevistaBot`:
 * uma linha por item, no formato "Título: descrição".
 */
export function textosLegados(relatorio: RelatorioEntrevista): TextosLegados {
  const linha = (item: PontoForte) => {
    const descricao = sanitizarTexto(item.descricao, false);
    // Título que é só o começo da descrição não se repete — e é o mesmo que a leitura
    // legada (relatorioLegado) derivaria dessa linha
    return item.titulo === tituloCurto(descricao) ? descricao : `${item.titulo}: ${descricao}`;
  };
  return {
    pontosFortes: relatorio.pontosFortes.map(linha).join('\n'),
    pontosMelhoria: relatorio.pontosMelhoria.map(linha).join('\n'),
    dicasComunicacao: relatorio.dicasComunicacao.map((d) => sanitizarTexto(d, false)).join('\n'),
  };
}
