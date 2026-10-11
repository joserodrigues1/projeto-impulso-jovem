/**
 * Conteúdo do currículo salvo em `CurriculoGerado.conteudo` (ConteudoCurriculo v2 — docs/ARQUITETURA.md, seção 4.1).
 * O frontend renderiza o modelo visual a partir dele. Funções puras: nada aqui acessa banco ou rede.
 */

export type SituacaoFormacao = 'CONCLUIDO' | 'CURSANDO' | 'TRANCADO';
export const SITUACOES_FORMACAO: readonly SituacaoFormacao[] = [
  'CONCLUIDO',
  'CURSANDO',
  'TRANCADO',
];

export const NIVEIS_IDIOMA = ['Nativo', 'Básico', 'Intermediário', 'Avançado', 'Fluente'] as const;

export const UFS = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const;

export interface ExperienciaCurriculo {
  empresa: string;
  cargo: string;
  /** Texto de exibição: "jun/2023 – dez/2023", "dez/2024 – atual". */
  periodo: string;
  /** AAAA-MM */
  inicio?: string;
  /** AAAA-MM — ausente + atual=true → emprego atual */
  fim?: string;
  atual?: boolean;
  atividades: string[];
}

export interface FormacaoCurriculo {
  instituicao: string;
  curso: string;
  periodo: string;
  situacao?: SituacaoFormacao;
}

export interface IdiomaCurriculo {
  idioma: string;
  nivel: string;
}

export interface ConteudoCurriculo {
  versao: 2;
  // Identificação — sempre vem da conta do usuário, nunca da IA
  nomeCompleto: string;
  email: string;
  /** Formatado para exibição: "(61) 99999-9999". */
  telefone: string;
  cidade?: string;
  uf?: string;
  linkedin?: string;
  // Conteúdo
  cargoDesejado?: string;
  perfilProfissional: string;
  experiencias: ExperienciaCurriculo[];
  formacao: FormacaoCurriculo[];
  habilidades: string[];
  idiomas: IdiomaCurriculo[];
  premiacoes: string[];
}

/** Dados enviados pelo usuário (GerarCurriculoDto / AtualizarCurriculoDto). */
export interface DadosCurriculo {
  titulo?: string;
  cargoDesejado?: string;
  cidade?: string;
  uf?: string;
  linkedin?: string;
  perfilProfissional?: string;
  experiencias: Array<{
    empresa: string;
    cargo: string;
    inicio?: string;
    fim?: string;
    atual?: boolean;
    periodo?: string;
    atividades?: string[];
    descricao?: string;
  }>;
  formacao: Array<{
    instituicao: string;
    curso: string;
    periodo?: string;
    inicio?: string;
    fim?: string;
    situacao?: SituacaoFormacao;
  }>;
  habilidades: string[];
  idiomas: IdiomaCurriculo[];
  premiacoes: string[];
  usarIa?: boolean;
}

/** Identificação vinda da conta (nunca da IA). `telefone` já formatado. */
export interface IdentidadeCurriculo {
  nomeCompleto: string;
  email: string;
  telefone: string;
  cidade?: string;
  uf?: string;
  linkedin?: string;
}

export interface ResultadoIa {
  conteudo: ConteudoCurriculo;
  /** `true` quando ao menos um campo veio da IA. */
  refinado: boolean;
  transcricao?: string;
  observacoes: string[];
}

/** Limites do contrato (seção 4.1). Usados também pelos DTOs. */
export const LIMITES = {
  titulo: 120,
  cargoDesejado: 120,
  perfilProfissional: 1200,
  cidade: 100,
  linkedin: 255,
  experiencias: 15,
  empresa: 150,
  cargo: 150,
  periodo: 60,
  atividades: 8,
  atividade: 300,
  /** Texto livre de uma experiência (vira a lista de atividades). */
  descricao: 2400,
  formacao: 10,
  instituicao: 150,
  curso: 150,
  habilidades: 30,
  habilidade: 60,
  idiomas: 10,
  idioma: 60,
  nivel: 30,
  premiacoes: 15,
  premiacao: 200,
  nomeCompleto: 150,
  email: 100,
  telefone: 30,
  transcricao: 10000,
  observacoes: 5,
  observacao: 300,
} as const;

/** AAAA-MM (como o `<input type="month">`). */
export const MES_REGEX = /^(19|20)\d{2}-(0[1-9]|1[0-2])$/;
/** AAAA */
export const ANO_REGEX = /^(19|20)\d{2}$/;

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// ───────────────────────────── utilitários de texto ─────────────────────────────

type Objeto = Record<string, unknown>;

export const ehObjeto = (v: unknown): v is Objeto =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const campo = (o: Objeto, chave: string): unknown =>
  Object.hasOwn(o, chave) ? o[chave] : undefined;

/** Caracteres de controle e separadores de linha Unicode (a quebra `\n` é tratada à parte). */
const CONTROLE = /(?!\n)[\p{Cc}\p{Zl}\p{Zp}]/gu;
/** Caracteres invisíveis de formatação (zero-width, BOM, marcas de direção do texto). */
const INVISIVEIS = /\p{Cf}/gu;
/** Metade de emoji sem o par (o PostgreSQL recusa no `jsonb` e o salvamento daria erro 500). */
const SURROGATE_SOLTO = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

const limparInvisiveis = (texto: string) =>
  texto.replace(SURROGATE_SOLTO, '').replace(INVISIVEIS, '').replace(CONTROLE, ' ');

/** Corta sem deixar meio emoji (surrogate solto) no final. */
function cortar(texto: string, max: number): string {
  if (texto.length <= max) return texto;
  let r = texto.slice(0, max);
  const ultimo = r.charCodeAt(r.length - 1);
  if (ultimo >= 0xd800 && ultimo <= 0xdbff) r = r.slice(0, -1);
  return r.trimEnd();
}

/** Texto de uma linha: sem quebras nem espaços repetidos. Não-string vira ''. */
export function linha(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return cortar(limparInvisiveis(v).replace(/\s+/g, ' ').trim(), max);
}

/** Texto com parágrafos: mantém quebras de linha (no máximo uma linha em branco seguida). */
export function paragrafo(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  const texto = limparInvisiveis(v.replace(/\r\n?/g, '\n'))
    .split('\n')
    .map((l) => l.replace(/[^\S\n]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return cortar(texto, max);
}

/** Chave de comparação: sem acentos, minúscula, espaços normalizados. */
export function chave(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function deduplicar<T>(itens: T[], chaveDe: (item: T) => string): T[] {
  const vistos = new Set<string>();
  return itens.filter((item) => {
    const k = chaveDe(item);
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}

/**
 * Itens brutos examinados por lista: folga para descartes (vazios, repetidos, tipo errado) sem processar
 * listas gigantes vindas da IA ou de registros corrompidos.
 */
const brutosDaLista = (v: unknown[], max: number) => v.slice(0, max * 4);

/** Lista de textos curtos: aceita array (ou string separada por `separador`), corta e remove duplicatas. */
function listaTextos(
  v: unknown,
  maxItens: number,
  maxTamanho: number,
  separador: RegExp,
): string[] {
  const brutos: unknown[] = Array.isArray(v) ? v : typeof v === 'string' ? v.split(separador) : [];
  const itens = brutosDaLista(brutos, maxItens)
    .map((b) => linha(b, maxTamanho))
    .filter(Boolean);
  return deduplicar(itens, chave).slice(0, maxItens);
}

/** Quebra um texto livre em itens (linhas, "•", ";"), tirando marcadores como "-", "*" ou "1.". */
function dividirEmItens(texto: string, max: number): string[] {
  // O que passa disso não caberia nas 8 atividades de qualquer forma
  return (
    cortar(texto, LIMITES.descricao * 2)
      .split(/\r?\n|•|;/)
      .map((parte) =>
        linha(parte, Number.MAX_SAFE_INTEGER)
          .replace(/^[-–—*·●▪◦>\s]+/, '')
          .replace(/^\d{1,2}[.)]\s+/, ''),
      )
      .filter(Boolean)
      // Parágrafo longo demais vira uma frase por item
      .flatMap((parte) => (parte.length > max ? parte.split(/(?<=[.!?])\s+/) : [parte]))
      .map((parte) => cortar(parte.trim(), max))
      .filter(Boolean)
  );
}

function listaAtividades(atividades: unknown, descricao: unknown): string[] {
  let itens: string[] = [];
  if (Array.isArray(atividades)) {
    itens = brutosDaLista(atividades, LIMITES.atividades)
      .map((a) => linha(a, LIMITES.atividade))
      .filter(Boolean);
  } else if (typeof atividades === 'string') {
    itens = dividirEmItens(atividades, LIMITES.atividade);
  }
  if (!itens.length && typeof descricao === 'string') {
    itens = dividirEmItens(descricao, LIMITES.atividade);
  }
  return deduplicar(itens, chave).slice(0, LIMITES.atividades);
}

// ───────────────────────────── datas e período ─────────────────────────────

/** "AAAA-MM" (aceita "AAAA-MM-DD" de registros antigos) → "AAAA-MM"; senão undefined. */
function mesValido(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const m = /^(\d{4})-(\d{2})/.exec(v.trim());
  if (!m) return undefined;
  const valor = `${m[1]}-${m[2]}`;
  return MES_REGEX.test(valor) ? valor : undefined;
}

function anoValido(v: unknown): string | undefined {
  const texto = typeof v === 'number' ? String(v) : typeof v === 'string' ? v.trim() : '';
  return ANO_REGEX.test(texto) ? texto : undefined;
}

/** "2023-06" → "jun/2023"; "2023" → "2023"; inválido → undefined. */
function rotuloData(v: string | undefined): string | undefined {
  const mes = mesValido(v);
  if (mes) return `${MESES[Number(mes.slice(5, 7)) - 1]}/${mes.slice(0, 4)}`;
  return anoValido(v);
}

/**
 * Texto de exibição do período: "jun/2023 – dez/2023", "dez/2024 – atual", "2021 – 2023".
 * Aceita AAAA-MM e AAAA. Com `atual`, o fim é ignorado.
 */
export function formatarPeriodo(inicio?: string, fim?: string, atual?: boolean): string {
  const de = rotuloData(inicio);
  const ate = atual ? 'atual' : rotuloData(fim);
  if (de && ate) return de === ate ? de : `${de} – ${ate}`;
  return de ?? ate ?? '';
}

// ───────────────────────────── itens ─────────────────────────────

function normalizarSituacao(v: unknown): SituacaoFormacao | undefined {
  if (typeof v !== 'string') return undefined;
  const k = chave(v);
  if (k.startsWith('conclu') || k === 'completo') return 'CONCLUIDO';
  if (k.startsWith('cursando') || k === 'em andamento') return 'CURSANDO';
  if (k.startsWith('trancad')) return 'TRANCADO';
  return undefined;
}

function normalizarNivel(v: unknown): string {
  const texto = linha(v, LIMITES.nivel);
  return NIVEIS_IDIOMA.find((n) => chave(n) === chave(texto)) ?? texto;
}

interface OpcoesItem {
  /** Exige os dois campos principais (empresa+cargo / instituição+curso). Usado na resposta da IA. */
  exigirAmbos: boolean;
  /** Registro v1: `dataFim` ausente significava emprego atual. */
  legado?: boolean;
}

function normalizarExperiencia(v: unknown, opcoes: OpcoesItem): ExperienciaCurriculo | null {
  if (!ehObjeto(v)) return null;
  const empresa = linha(campo(v, 'empresa'), LIMITES.empresa);
  const cargo = linha(campo(v, 'cargo'), LIMITES.cargo);
  if (opcoes.exigirAmbos ? !(empresa && cargo) : !(empresa || cargo)) return null;

  const inicio = mesValido(campo(v, 'inicio') ?? campo(v, 'dataInicio'));
  let fim = mesValido(campo(v, 'fim') ?? campo(v, 'dataFim'));
  const atual =
    campo(v, 'atual') === true ||
    (Boolean(opcoes.legado) && Boolean(inicio) && !fim && campo(v, 'atual') === undefined);
  if (atual) fim = undefined;

  // As datas (quando existem) são a fonte da verdade do período
  const calculado = inicio || fim ? formatarPeriodo(inicio, fim, atual) : '';
  const periodo =
    calculado ||
    linha(campo(v, 'periodo'), LIMITES.periodo) ||
    (atual ? formatarPeriodo(undefined, undefined, true) : '');

  const experiencia: ExperienciaCurriculo = {
    empresa,
    cargo,
    periodo,
    atividades: listaAtividades(campo(v, 'atividades'), campo(v, 'descricao')),
  };
  if (inicio) experiencia.inicio = inicio;
  if (fim) experiencia.fim = fim;
  if (atual) experiencia.atual = true;
  return experiencia;
}

function normalizarFormacao(v: unknown, opcoes: OpcoesItem): FormacaoCurriculo | null {
  if (!ehObjeto(v)) return null;
  const instituicao = linha(campo(v, 'instituicao'), LIMITES.instituicao);
  const curso = linha(campo(v, 'curso'), LIMITES.curso);
  if (opcoes.exigirAmbos ? !(instituicao && curso) : !(instituicao || curso)) return null;

  const situacao = normalizarSituacao(campo(v, 'situacao'));
  const inicio = anoValido(campo(v, 'inicio'));
  const fim = anoValido(campo(v, 'fim'));
  const calculado =
    inicio || fim ? formatarPeriodo(inicio, fim, situacao === 'CURSANDO' && !fim) : '';

  const formacao: FormacaoCurriculo = {
    instituicao,
    curso,
    periodo: calculado || linha(campo(v, 'periodo'), LIMITES.periodo),
  };
  if (situacao) formacao.situacao = situacao;
  return formacao;
}

function normalizarIdioma(v: unknown): IdiomaCurriculo | null {
  // A IA às vezes devolve "Inglês - Básico" ou "Inglês (Básico)".
  // Texto cortado antes da regex: em textos longos ela teria custo polinomial.
  if (typeof v === 'string') {
    const texto = linha(v, LIMITES.idioma + LIMITES.nivel + 10);
    const m = /^([^-–—:(]+?)\s*(?:[-–—:(]\s*([^)]*?)\s*\)?)?\s*$/.exec(texto);
    return m ? normalizarIdioma({ idioma: m[1], nivel: m[2] ?? '' }) : null;
  }
  if (!ehObjeto(v)) return null;
  const idioma = linha(campo(v, 'idioma') ?? campo(v, 'nome'), LIMITES.idioma);
  if (!idioma) return null;
  return { idioma, nivel: normalizarNivel(campo(v, 'nivel')) };
}

function normalizarLista<T>(v: unknown, max: number, item: (bruto: unknown) => T | null): T[] {
  if (!Array.isArray(v)) return [];
  return brutosDaLista(v, max)
    .map(item)
    .filter((i): i is T => i !== null)
    .slice(0, max);
}

const listaIdiomas = (v: unknown) =>
  deduplicar(normalizarLista(v, LIMITES.idiomas * 3, normalizarIdioma), (i) =>
    chave(i.idioma),
  ).slice(0, LIMITES.idiomas);

/** Atuais primeiro; depois pelo início, do mais recente para o mais antigo (sem data no fim). */
function ordenarExperiencias(lista: ExperienciaCurriculo[]): ExperienciaCurriculo[] {
  return [...lista].sort((a, b) => {
    if (Boolean(a.atual) !== Boolean(b.atual)) return a.atual ? -1 : 1;
    if (a.inicio && b.inicio) return b.inicio.localeCompare(a.inicio);
    if (a.inicio) return -1;
    if (b.inicio) return 1;
    return 0;
  });
}

// ───────────────────────────── campos de identificação ─────────────────────────────

export function normalizarUf(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const uf = v.trim().toUpperCase();
  return (UFS as readonly string[]).includes(uf) ? uf : undefined;
}

/**
 * Acrescenta "https://" quando o usuário digita só "linkedin.com/in/...". Outro esquema ("javascript:",
 * "ftp://") é mantido para ser recusado na validação; "host:porta" não conta como esquema.
 */
export function prefixarProtocolo(v: string): string {
  const texto = v.trim();
  return texto && !/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(texto) ? `https://${texto}` : texto;
}

/** Link seguro para exibição: só http/https, com domínio, até 255 caracteres. */
export function normalizarLink(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const texto = prefixarProtocolo(v);
  if (!texto || texto.length > LIMITES.linkedin || /\s/.test(texto)) return undefined;
  try {
    const url = new URL(texto);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
    if (!url.hostname.includes('.')) return undefined;
    return texto;
  } catch {
    return undefined;
  }
}

// ───────────────────────────── API pública ─────────────────────────────

/**
 * Converte qualquer JSON salvo (v1, v2 ou lixo) em ConteudoCurriculo v2 válido, aplicando os limites do contrato.
 * Registros v1 tinham `resumoProfissional`, `nivelEscolaridade` e experiências com `descricao`/`dataInicio`/`dataFim`.
 */
export function normalizarConteudo(json: unknown): ConteudoCurriculo {
  const o: Objeto = ehObjeto(json) ? json : {};
  const legado = campo(o, 'versao') !== 2;

  const conteudo: ConteudoCurriculo = {
    versao: 2,
    nomeCompleto: linha(campo(o, 'nomeCompleto'), LIMITES.nomeCompleto),
    email: linha(campo(o, 'email'), LIMITES.email),
    telefone: linha(campo(o, 'telefone'), LIMITES.telefone),
    perfilProfissional: paragrafo(
      campo(o, 'perfilProfissional') ?? (legado ? campo(o, 'resumoProfissional') : undefined),
      LIMITES.perfilProfissional,
    ),
    experiencias: normalizarLista(campo(o, 'experiencias'), LIMITES.experiencias, (i) =>
      normalizarExperiencia(i, { exigirAmbos: false, legado }),
    ),
    formacao: normalizarLista(campo(o, 'formacao'), LIMITES.formacao, (i) =>
      normalizarFormacao(i, { exigirAmbos: false }),
    ),
    habilidades: listaTextos(
      campo(o, 'habilidades'),
      LIMITES.habilidades,
      LIMITES.habilidade,
      /[,;\n]/,
    ),
    idiomas: listaIdiomas(campo(o, 'idiomas')),
    premiacoes: listaTextos(campo(o, 'premiacoes'), LIMITES.premiacoes, LIMITES.premiacao, /[;\n]/),
  };

  // v1 guardava só o nível de escolaridade ("Ensino Médio Completo")
  if (legado && !conteudo.formacao.length) {
    const nivel = linha(campo(o, 'nivelEscolaridade'), LIMITES.curso);
    if (nivel) {
      const formacao: FormacaoCurriculo = { instituicao: '', curso: nivel, periodo: '' };
      const k = chave(nivel);
      if (k.includes('cursando')) formacao.situacao = 'CURSANDO';
      else if (k.includes('completo') && !k.includes('incompleto')) formacao.situacao = 'CONCLUIDO';
      conteudo.formacao.push(formacao);
    }
  }

  const cidade = linha(campo(o, 'cidade'), LIMITES.cidade);
  if (cidade) conteudo.cidade = cidade;
  const uf = normalizarUf(campo(o, 'uf'));
  if (uf) conteudo.uf = uf;
  const linkedin = normalizarLink(campo(o, 'linkedin'));
  if (linkedin) conteudo.linkedin = linkedin;
  const cargoDesejado = linha(campo(o, 'cargoDesejado'), LIMITES.cargoDesejado);
  if (cargoDesejado) conteudo.cargoDesejado = cargoDesejado;

  return conteudo;
}

/** Cópia do conteúdo com as experiências na ordem de exibição (atuais primeiro, depois pelo início). */
export function ordenarConteudo(conteudo: ConteudoCurriculo): ConteudoCurriculo {
  return { ...conteudo, experiencias: ordenarExperiencias(conteudo.experiencias) };
}

/**
 * Monta o currículo só com o formulário (sem IA). Cidade/UF/LinkedIn do formulário têm prioridade
 * sobre os da identidade (perfil). Experiências: atuais primeiro, depois pelo início (mais recente antes).
 * Com `manterOrdem`, as experiências ficam na ordem do formulário — a mesma que a IA recebe, para
 * casar item a item na resposta (`aplicarRespostaIa` ordena no final).
 */
export function montarConteudo(
  identidade: IdentidadeCurriculo,
  dados: DadosCurriculo,
  opcoes: { manterOrdem?: boolean } = {},
): ConteudoCurriculo {
  const conteudo = normalizarConteudo({
    versao: 2,
    nomeCompleto: identidade.nomeCompleto,
    email: identidade.email,
    telefone: identidade.telefone,
    cidade: dados.cidade || identidade.cidade,
    uf: dados.uf || identidade.uf,
    linkedin: dados.linkedin || identidade.linkedin,
    cargoDesejado: dados.cargoDesejado,
    perfilProfissional: dados.perfilProfissional,
    experiencias: dados.experiencias,
    formacao: dados.formacao,
    habilidades: dados.habilidades,
    idiomas: dados.idiomas,
    premiacoes: dados.premiacoes,
  });
  return opcoes.manterOrdem ? conteudo : ordenarConteudo(conteudo);
}

/**
 * O usuário escreveu algo além do áudio? (perfil, experiências, formação ou habilidades — seção 5.4).
 * Sem nada disso, o envio é "só áudio": se a IA falhar, não há currículo para salvar.
 */
export function temConteudoEscrito(dados: DadosCurriculo): boolean {
  return Boolean(
    linha(dados.perfilProfissional, LIMITES.perfilProfissional) ||
    dados.experiencias?.length ||
    dados.formacao?.length ||
    dados.habilidades?.length,
  );
}

/** Formulário totalmente vazio (nem cargo, idiomas ou premiações)? */
export function formularioVazio(dados: DadosCurriculo): boolean {
  return !(
    temConteudoEscrito(dados) ||
    linha(dados.cargoDesejado, LIMITES.cargoDesejado) ||
    dados.idiomas?.length ||
    dados.premiacoes?.length
  );
}

/** `cargoDesejado` de um conteúdo salvo, sem normalizar o resto (listagem). */
export function cargoDesejadoDe(json: unknown): string | null {
  return (ehObjeto(json) && linha(campo(json, 'cargoDesejado'), LIMITES.cargoDesejado)) || null;
}

// ───────────────────────────── resposta da IA (n8n) ─────────────────────────────

const CHAVES_CONTEUDO = [
  'cargoDesejado',
  'perfilProfissional',
  'experiencias',
  'formacao',
  'habilidades',
  'idiomas',
  'premiacoes',
];
const CHAVES_ENVELOPE = ['conteudo', 'transcricao', 'observacoes'];
/** Embrulhos comuns dos nós do n8n (AI Agent → `output`, LLM Chain → `text`). */
const CHAVES_EMBRULHO = ['output', 'text', 'json', 'response'];
const MAX_TEXTO_JSON = 2_000_000;

/** JSON puro, dentro de bloco ```json``` ou cercado de texto. `undefined` se não houver JSON. */
function parseJsonTolerante(texto: string): unknown {
  const t = texto.trim();
  if (!t || t.length > MAX_TEXTO_JSON) return undefined;
  const tentativas = [t];
  const bloco = /```(?:json)?\s*([\s\S]*?)```/i.exec(t);
  if (bloco) tentativas.push(bloco[1].trim());
  const inicio = t.indexOf('{');
  const fim = t.lastIndexOf('}');
  if (inicio >= 0 && fim > inicio) tentativas.push(t.slice(inicio, fim + 1));
  for (const tentativa of tentativas) {
    try {
      return JSON.parse(tentativa) as unknown;
    } catch {
      // tenta o próximo formato
    }
  }
  return undefined;
}

/** Desembrulha a resposta até achar um objeto com campos conhecidos. */
function extrairObjeto(v: unknown, profundidade = 0): Objeto | null {
  if (profundidade > 6) return null;
  if (typeof v === 'string') {
    const json = parseJsonTolerante(v);
    return json === undefined ? null : extrairObjeto(json, profundidade + 1);
  }
  if (Array.isArray(v)) return v.length ? extrairObjeto(v[0], profundidade + 1) : null;
  if (!ehObjeto(v)) return null;
  if ([...CHAVES_ENVELOPE, ...CHAVES_CONTEUDO].some((k) => Object.hasOwn(v, k))) return v;
  for (const k of CHAVES_EMBRULHO) {
    if (Object.hasOwn(v, k)) return extrairObjeto(v[k], profundidade + 1);
  }
  return null;
}

/** Conectivos ignorados na comparação aproximada ("Mercadinho do Bairro" × "mercadinho bairo"). */
const CONECTIVOS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

function palavras(texto: string): string[] {
  return chave(texto)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** Nome sem espaços, pontuação e conectivos. */
function compacto(texto: string): string {
  return palavras(texto)
    .filter((p) => !CONECTIVOS.has(p))
    .join('');
}

/** Distância de edição (Levenshtein) — só para nomes curtos (até 150 caracteres). */
function distancia(a: string, b: string): number {
  let anterior = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    for (let j = 1; j <= b.length; j++) {
      atual[j] = Math.min(
        anterior[j] + 1,
        atual[j - 1] + 1,
        anterior[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    anterior = atual;
  }
  return anterior[b.length];
}

const mesmoNome = (a: string, b: string) => chave(a) !== '' && chave(a) === chave(b);

/** Os números do nome batem? ("Loja 1" × "Loja 12" e "Filial 2" × "Filial 3" são lugares diferentes) */
function mesmosNumeros(a: string, b: string): boolean {
  const numeros = (t: string) => (chave(t).match(/\d+/g) ?? []).join(',');
  return numeros(a) === numeros(b);
}

/** Um nome contém o outro ("Mercado Bom Preço" × "Supermercado Bom Preço"), ignorando acentos e caixa. */
function nomesContidos(a: string, b: string): boolean {
  const [ka, kb] = [chave(a), chave(b)];
  return (
    Math.min(ka.length, kb.length) >= 4 &&
    (ka.includes(kb) || kb.includes(ka)) &&
    mesmosNumeros(a, b)
  );
}

/** Erro de digitação corrigido pela IA ("lanchonete sabr bom" × "Lanchonete Sabor Bom"). */
function nomesSemelhantes(a: string, b: string): boolean {
  if (!mesmosNumeros(a, b)) return false;
  const [ca, cb] = [compacto(a), compacto(b)];
  const menor = Math.min(ca.length, cb.length);
  if (menor < 6) return false;
  if (ca.includes(cb) || cb.includes(ca)) return true;
  return distancia(ca, cb) <= Math.max(1, Math.floor(Math.max(ca.length, cb.length) * 0.15));
}

/**
 * Para cada item sugerido pela IA, a posição do item original correspondente (-1 = item novo,
 * ex.: veio do áudio). Em passos, para um nome parecido não "roubar" o par exato de outro item:
 * mesmo nome → um contém o outro → nome quase igual → mesma posição (só com listas do mesmo
 * tamanho, que estão na mesma ordem: a do formulário enviado à IA).
 */
function casarItens<T>(
  sugeridos: T[],
  base: T[],
  nomes: (sugerido: T, original: T) => [string, string],
): number[] {
  const pares = sugeridos.map(() => -1);
  const usados = new Set<number>();
  const passo = (criterio: (a: string, b: string) => boolean) => {
    sugeridos.forEach((sugerido, i) => {
      if (pares[i] >= 0) return;
      const j = base.findIndex(
        (original, k) => !usados.has(k) && criterio(...nomes(sugerido, original)),
      );
      if (j >= 0) {
        pares[i] = j;
        usados.add(j);
      }
    });
  };
  passo(mesmoNome);
  passo(nomesContidos);
  passo(nomesSemelhantes);
  if (sugeridos.length === base.length) {
    pares.forEach((par, i) => {
      if (par < 0 && !usados.has(i)) {
        pares[i] = i;
        usados.add(i);
      }
    });
  }
  return pares;
}

/** Itens do usuário que a IA não devolveu (por posição em `base`). */
const naoCasados = <T>(base: T[], pares: number[]) => base.filter((_, j) => !pares.includes(j));

interface Mescla<T> {
  lista: T[];
  /** Itens do usuário mantidos porque a IA os deixou de fora. */
  mantidos: number;
}

/**
 * Item de texto do usuário já coberto por um da IA: mesmo texto, todas as palavras dele aparecem
 * no da IA ("excel" × "Pacote Office (Word, Excel)") ou quase igual (erro de digitação).
 */
function textoCoberto(doUsuario: string, daIa: string): boolean {
  if (mesmoNome(doUsuario, daIa)) return true;
  const deUsuario = palavras(doUsuario).filter((p) => !CONECTIVOS.has(p));
  const deIa = new Set(palavras(daIa));
  if (deUsuario.length && deUsuario.every((p) => deIa.has(p))) return true;
  return nomesSemelhantes(doUsuario, daIa);
}

/**
 * Lista da IA completada com o que o usuário digitou e ela deixou de fora (ex.: o prompt limita as
 * habilidades a menos itens do que o formulário aceita). Os do usuário têm vaga garantida no limite.
 */
function completarTextos(daIa: string[], doUsuario: string[], max: number): string[] {
  const faltando = doUsuario.filter((u) => !daIa.some((a) => textoCoberto(u, a)));
  const lista = [...daIa.slice(0, Math.max(0, max - faltando.length)), ...faltando];
  return deduplicar(lista, chave).slice(0, max);
}

function mesclarExperiencias(
  base: ExperienciaCurriculo[],
  daIa: unknown,
): Mescla<ExperienciaCurriculo> | null {
  const sugeridas = normalizarLista(daIa, LIMITES.experiencias, (i) =>
    normalizarExperiencia(i, { exigirAmbos: true }),
  );
  if (!sugeridas.length) return null;
  const pares = casarItens(sugeridas, base, (s, o) => [s.empresa, o.empresa]);
  const mescladas = sugeridas.map((exp, i) => {
    const j = pares[i];
    if (j < 0) return exp;
    const original = base[j];
    // Lista vazia da IA não apaga as atividades que o usuário digitou
    const atividades = exp.atividades.length ? exp.atividades : [...original.atividades];
    // Período informado pelo usuário (datas ou texto) prevalece sobre o da IA
    if (!original.periodo) return { ...exp, atividades };
    const { inicio: _i, fim: _f, atual: _a, ...resto } = exp;
    const mesclada: ExperienciaCurriculo = { ...resto, periodo: original.periodo, atividades };
    if (original.inicio) mesclada.inicio = original.inicio;
    if (original.fim) mesclada.fim = original.fim;
    if (original.atual) mesclada.atual = true;
    return mesclada;
  });
  // O que o usuário digitou e a IA deixou de fora continua no currículo
  const mantidas = naoCasados(base, pares).map((e) => ({ ...e, atividades: [...e.atividades] }));
  const unicas = deduplicar(
    [...mescladas, ...mantidas],
    (e) => `${chave(e.empresa)}|${chave(e.cargo)}|${chave(e.periodo)}`,
  );
  const lista = ordenarExperiencias(unicas).slice(0, LIMITES.experiencias);
  return { lista, mantidos: mantidas.filter((e) => lista.includes(e)).length };
}

function mesclarFormacao(
  base: FormacaoCurriculo[],
  daIa: unknown,
): Mescla<FormacaoCurriculo> | null {
  // Basta o curso OU a instituição: "2º ano do Ensino Médio" sem o nome da escola é o caso
  // mais comum entre 14 e 17 anos (a IA deixa a instituição vazia e pede para completar)
  const sugeridas = normalizarLista(daIa, LIMITES.formacao, (i) =>
    normalizarFormacao(i, { exigirAmbos: false }),
  );
  if (!sugeridas.length) return null;
  // Compara pela instituição quando os dois lados têm; senão, pelo curso
  const pares = casarItens(sugeridas, base, (s, o) =>
    s.instituicao && o.instituicao ? [s.instituicao, o.instituicao] : [s.curso, o.curso],
  );
  const mescladas = sugeridas.map((form, i) => {
    const j = pares[i];
    if (j < 0) return form;
    const original = base[j];
    // Campo vazio da IA não apaga o que o usuário digitou; período e situação dele prevalecem
    const mesclada: FormacaoCurriculo = {
      ...form,
      instituicao: form.instituicao || original.instituicao,
      curso: form.curso || original.curso,
      periodo: original.periodo || form.periodo,
    };
    if (original.situacao) mesclada.situacao = original.situacao;
    return mesclada;
  });
  const mantidas = naoCasados(base, pares).map((f) => ({ ...f }));
  const lista = deduplicar(
    [...mescladas, ...mantidas],
    (f) => `${chave(f.instituicao)}|${chave(f.curso)}`,
  ).slice(0, LIMITES.formacao);
  return { lista, mantidos: mantidas.filter((f) => lista.includes(f)).length };
}

/** Aviso para o usuário conferir os itens que a IA não reescreveu (ou `null`). */
function avisoItensMantidos(experiencias: number, formacoes: number): string | null {
  const partes = [
    experiencias ? `${experiencias} ${experiencias === 1 ? 'experiência' : 'experiências'}` : '',
    formacoes ? `${formacoes} ${formacoes === 1 ? 'formação' : 'formações'}` : '',
  ].filter(Boolean);
  if (!partes.length) return null;
  return `Mantivemos ${partes.join(' e ')} que você preencheu e a IA não reescreveu. Confira se está tudo certo.`;
}

/**
 * Aplica a resposta da IA sobre o currículo montado com o formulário.
 * A resposta NÃO é confiável: só entram campos com o tipo certo, cortados nos limites; a identificação
 * (nome, e-mail, telefone, cidade, UF, LinkedIn) nunca muda; nada do que o usuário digitou some — lista vazia
 * da IA não apaga a dele, e itens que a IA deixou de fora (experiência, formação, habilidade, idioma,
 * premiação) são mantidos, com um aviso para conferir. Para casar item a item por posição, `base` deve vir
 * na ordem do formulário enviado à IA (montarConteudo com `manterOrdem`); o resultado sai ordenado.
 * Aceita: objeto, `[obj]`, `{ output: obj | "json" }`, `{ conteudo: ... }`, string JSON e JSON em bloco markdown.
 */
export function aplicarRespostaIa(base: ConteudoCurriculo, resposta: unknown): ResultadoIa {
  const envelope = extrairObjeto(resposta);
  if (!envelope) return { conteudo: base, refinado: false, observacoes: [] };

  const dados = Object.hasOwn(envelope, 'conteudo') ? extrairObjeto(envelope.conteudo) : envelope;
  const conteudo: ConteudoCurriculo = {
    ...base,
    experiencias: base.experiencias.map((e) => ({ ...e, atividades: [...e.atividades] })),
    formacao: base.formacao.map((f) => ({ ...f })),
    habilidades: [...base.habilidades],
    idiomas: base.idiomas.map((i) => ({ ...i })),
    premiacoes: [...base.premiacoes],
  };
  let refinado = false;
  let experienciasMantidas = 0;
  let formacoesMantidas = 0;

  if (dados) {
    const cargoDesejado = linha(campo(dados, 'cargoDesejado'), LIMITES.cargoDesejado);
    if (cargoDesejado) {
      conteudo.cargoDesejado = cargoDesejado;
      refinado = true;
    }

    const perfil = paragrafo(campo(dados, 'perfilProfissional'), LIMITES.perfilProfissional);
    if (perfil) {
      conteudo.perfilProfissional = perfil;
      refinado = true;
    }

    const experiencias = mesclarExperiencias(base.experiencias, campo(dados, 'experiencias'));
    if (experiencias) {
      conteudo.experiencias = experiencias.lista;
      experienciasMantidas = experiencias.mantidos;
      refinado = true;
    }

    const formacao = mesclarFormacao(base.formacao, campo(dados, 'formacao'));
    if (formacao) {
      conteudo.formacao = formacao.lista;
      formacoesMantidas = formacao.mantidos;
      refinado = true;
    }

    const habilidades = listaTextos(
      campo(dados, 'habilidades'),
      LIMITES.habilidades,
      LIMITES.habilidade,
      /[,;\n]/,
    );
    if (habilidades.length) {
      conteudo.habilidades = completarTextos(habilidades, base.habilidades, LIMITES.habilidades);
      refinado = true;
    }

    const idiomas = listaIdiomas(campo(dados, 'idiomas'));
    if (idiomas.length) {
      const faltando = base.idiomas.filter(
        (u) =>
          !idiomas.some(
            (a) => mesmoNome(a.idioma, u.idioma) || nomesSemelhantes(a.idioma, u.idioma),
          ),
      );
      conteudo.idiomas = [
        ...idiomas.slice(0, Math.max(0, LIMITES.idiomas - faltando.length)),
        ...faltando.map((i) => ({ ...i })),
      ].slice(0, LIMITES.idiomas);
      refinado = true;
    }

    const premiacoes = listaTextos(
      campo(dados, 'premiacoes'),
      LIMITES.premiacoes,
      LIMITES.premiacao,
      /[;\n]/,
    );
    if (premiacoes.length) {
      conteudo.premiacoes = completarTextos(premiacoes, base.premiacoes, LIMITES.premiacoes);
      refinado = true;
    }
  }

  const observacoes = listaTextos(
    campo(envelope, 'observacoes'),
    LIMITES.observacoes,
    LIMITES.observacao,
    /\n/,
  );
  const aviso = avisoItensMantidos(experienciasMantidas, formacoesMantidas);
  if (aviso) observacoes.push(aviso);

  const resultado: ResultadoIa = {
    // A base pode vir na ordem do formulário (montarConteudo com manterOrdem)
    conteudo: ordenarConteudo(conteudo),
    refinado,
    observacoes,
  };
  const transcricao = paragrafo(campo(envelope, 'transcricao'), LIMITES.transcricao);
  if (transcricao) resultado.transcricao = transcricao;
  return resultado;
}
