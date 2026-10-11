/**
 * Estado do formulário de currículo e conversões de/para o contrato da API
 * (ConteudoCurriculo v2 e DadosCurriculo — docs/ARQUITETURA.md, seções 4.1 e 5.4).
 * Funções puras: nada de React nem de acesso ao navegador aqui.
 */

import type { ConteudoCurriculo, DadosCurriculo, SituacaoFormacao } from "@/lib/tipos";

// ───────────────────────────── Limites (espelham o contrato) ─────────────────────────────

// Iguais aos LIMITES da API (backend/src/modules/curriculos/curriculo-conteudo.ts). Um limite menor aqui
// impediria editar um currículo salvo pela API (ex.: título automático = cargo desejado, até 120).
export const LIMITES = {
  titulo: 120,
  cargoDesejado: 120,
  cidade: 100,
  linkedin: 255,
  historia: 1200,
  experiencias: 15,
  empresa: 150,
  cargo: 150,
  periodo: 60,
  atividades: 8,
  atividade: 300,
  formacao: 10,
  instituicao: 150,
  curso: 150,
  habilidades: 30,
  habilidade: 60,
  idiomas: 10,
  idioma: 60,
  premiacoes: 15,
  premiacao: 200,
} as const;

export const AUDIO_MAX_BYTES = 8 * 1024 * 1024;
export const AUDIO_MAX_SEGUNDOS = 5 * 60;

/** Tipos de áudio aceitos pela API (parâmetros como `;codecs=opus` são ignorados). */
export const TIPOS_AUDIO_ACEITOS = [
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
] as const;

export const UFS = [
  ["AC", "Acre"],
  ["AL", "Alagoas"],
  ["AP", "Amapá"],
  ["AM", "Amazonas"],
  ["BA", "Bahia"],
  ["CE", "Ceará"],
  ["DF", "Distrito Federal"],
  ["ES", "Espírito Santo"],
  ["GO", "Goiás"],
  ["MA", "Maranhão"],
  ["MT", "Mato Grosso"],
  ["MS", "Mato Grosso do Sul"],
  ["MG", "Minas Gerais"],
  ["PA", "Pará"],
  ["PB", "Paraíba"],
  ["PR", "Paraná"],
  ["PE", "Pernambuco"],
  ["PI", "Piauí"],
  ["RJ", "Rio de Janeiro"],
  ["RN", "Rio Grande do Norte"],
  ["RS", "Rio Grande do Sul"],
  ["RO", "Rondônia"],
  ["RR", "Roraima"],
  ["SC", "Santa Catarina"],
  ["SP", "São Paulo"],
  ["SE", "Sergipe"],
  ["TO", "Tocantins"],
] as const;

const SIGLAS_UF: ReadonlySet<string> = new Set(UFS.map(([sigla]) => sigla));

export const NIVEIS_IDIOMA = ["Nativo", "Básico", "Intermediário", "Avançado", "Fluente"] as const;

export const SITUACOES: Array<{ valor: SituacaoFormacao; rotulo: string }> = [
  { valor: "CONCLUIDO", rotulo: "Concluído" },
  { valor: "CURSANDO", rotulo: "Cursando" },
  { valor: "TRANCADO", rotulo: "Trancado" },
];

export const SUGESTOES_HABILIDADES = [
  "Comunicação",
  "Trabalho em equipe",
  "Pacote Office",
  "Excel básico",
  "Atendimento ao cliente",
  "Organização",
  "Pontualidade",
  "Proatividade",
  "Vontade de aprender",
  "Resolução de problemas",
  "Informática básica",
  "Responsabilidade",
  "Criatividade",
  "Redes sociais",
  "Digitação",
] as const;

// ───────────────────────────── Estado do formulário ─────────────────────────────

export interface ExperienciaForm {
  id: string;
  empresa: string;
  cargo: string;
  /** AAAA-MM */
  inicio: string;
  /** AAAA-MM */
  fim: string;
  atual: boolean;
  /** Uma atividade por linha. */
  atividades: string;
  /** Período em texto vindo de um currículo salvo, usado quando não há datas. */
  periodoTexto: string;
}

export interface FormacaoForm {
  id: string;
  instituicao: string;
  curso: string;
  situacao: SituacaoFormacao | "";
  /** AAAA */
  inicio: string;
  /** AAAA */
  fim: string;
  periodoTexto: string;
}

export interface IdiomaForm {
  id: string;
  idioma: string;
  nivel: string;
}

export interface FormularioEstado {
  titulo: string;
  cargoDesejado: string;
  cidade: string;
  uf: string;
  linkedin: string;
  /** "Conte sua história" (criar) ou o perfil profissional pronto (editar). */
  historia: string;
  experiencias: ExperienciaForm[];
  formacao: FormacaoForm[];
  habilidades: string[];
  idiomas: IdiomaForm[];
  premiacoes: string[];
}

let contadorIds = 0;
/** Id local só para as chaves do React (não vai para a API). */
export function novoIdLocal(): string {
  contadorIds += 1;
  return `item-${Date.now().toString(36)}-${contadorIds}`;
}

export function novaExperiencia(): ExperienciaForm {
  return { id: novoIdLocal(), empresa: "", cargo: "", inicio: "", fim: "", atual: false, atividades: "", periodoTexto: "" };
}

export function novaFormacao(): FormacaoForm {
  return { id: novoIdLocal(), instituicao: "", curso: "", situacao: "", inicio: "", fim: "", periodoTexto: "" };
}

export function novoIdioma(idioma = "", nivel = ""): IdiomaForm {
  return { id: novoIdLocal(), idioma, nivel };
}

export function estadoInicial(): FormularioEstado {
  return {
    titulo: "",
    cargoDesejado: "",
    cidade: "",
    uf: "",
    linkedin: "",
    historia: "",
    experiencias: [novaExperiencia()],
    formacao: [novaFormacao()],
    habilidades: [],
    idiomas: [novoIdioma("Português", "Nativo")],
    premiacoes: [],
  };
}

// ───────────────────────────── Datas e períodos ─────────────────────────────

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MES_REGEX = /^(\d{4})-(0[1-9]|1[0-2])$/;
const ANO_REGEX = /^\d{4}$/;

export function mesValido(valor: string): boolean {
  return MES_REGEX.test(valor);
}

export function anoValido(valor: string): boolean {
  return ANO_REGEX.test(valor);
}

/** "2023-06" → "jun/2023" */
export function formatarMes(valor: string): string {
  const m = MES_REGEX.exec(valor);
  if (!m) return valor;
  return `${MESES[Number(m[2]) - 1]}/${m[1]}`;
}

/** Texto de exibição do período de uma experiência ("jun/2023 – dez/2023", "dez/2024 – atual"). */
export function periodoExperiencia(inicio: string, fim: string, atual: boolean): string {
  const temInicio = mesValido(inicio);
  const temFim = !atual && mesValido(fim);
  if (temInicio && atual) return `${formatarMes(inicio)} – atual`;
  if (temInicio && temFim) {
    return inicio === fim ? formatarMes(inicio) : `${formatarMes(inicio)} – ${formatarMes(fim)}`;
  }
  if (temInicio) return formatarMes(inicio);
  if (temFim) return formatarMes(fim);
  return atual ? "Atualmente" : "";
}

/** Texto de exibição do período de uma formação ("2021 – 2023", "2024 – atual"). */
export function periodoFormacao(inicio: string, fim: string, situacao: SituacaoFormacao | ""): string {
  const temInicio = anoValido(inicio);
  const temFim = anoValido(fim);
  if (temInicio && temFim) return inicio === fim ? fim : `${inicio} – ${fim}`;
  if (temInicio) return situacao === "CURSANDO" ? `${inicio} – atual` : inicio;
  if (temFim) return fim;
  return "";
}

const NOMES_MESES: Array<[RegExp, number]> = [
  [/^jan/, 1],
  [/^fev/, 2],
  [/^mar/, 3],
  [/^abr/, 4],
  [/^mai/, 5],
  [/^jun/, 6],
  [/^jul/, 7],
  [/^ago/, 8],
  [/^set/, 9],
  [/^out/, 10],
  [/^nov/, 11],
  [/^dez/, 12],
];

const ATUAL_REGEX = /\b(atual|atualmente|hoje|agora|presente|o momento|em andamento|cursando)\b/i;

/** Nome de mês por extenso ou abreviado ("jun", "junho", "março"). */
const MES_NOME = "(jan(?:eiro)?|fev(?:ereiro)?|mar(?:ço|co)?|abr(?:il)?|mai(?:o)?|jun(?:ho)?|jul(?:ho)?|ago(?:sto)?|set(?:embro)?|out(?:ubro)?|nov(?:embro)?|dez(?:embro)?)";

function numeroDoMes(nome: string): number | null {
  const n = nome.toLowerCase();
  for (const [regex, numero] of NOMES_MESES) if (regex.test(n)) return numero;
  return null;
}

/**
 * Tenta recuperar início/fim (AAAA-MM) de um período em texto, para a edição.
 * Só devolve datas quando a leitura não é ambígua; senão o texto original é mantido.
 */
export function lerPeriodoExperiencia(periodo: string): { inicio: string; fim: string; atual: boolean } | null {
  const texto = periodo.trim().toLowerCase();
  if (!texto) return null;
  const atual = ATUAL_REGEX.test(texto);
  const datas: string[] = [];

  // "jun/2023", "junho de 2023", "jun. 2023"
  const porNome = new RegExp(`\\b${MES_NOME}\\.?\\s*(?:\\/|de|-)?\\s*(\\d{4})\\b`, "g");
  const nomesDeMes = texto.match(new RegExp(`\\b${MES_NOME}(?![a-zç])`, "g")) ?? [];
  for (const m of texto.matchAll(porNome)) {
    const mes = numeroDoMes(m[1]);
    if (mes) datas.push(`${m[2]}-${String(mes).padStart(2, "0")}`);
  }
  // Algum mês sem ano ("de junho a dezembro de 2023") → ambíguo
  if (nomesDeMes.length !== datas.length) return null;

  if (!datas.length) {
    // "06/2023 - 12/2023"
    for (const m of texto.matchAll(/\b(0?[1-9]|1[0-2])\/(\d{4})\b/g)) {
      datas.push(`${m[2]}-${m[1].padStart(2, "0")}`);
    }
  }

  if (datas.length === 2 && !atual) return { inicio: datas[0], fim: datas[1], atual: false };
  if (datas.length === 1 && atual) return { inicio: datas[0], fim: "", atual: true };
  if (datas.length === 1) return { inicio: datas[0], fim: datas[0], atual: false };
  return null;
}

/** Recupera anos de início/fim de um período de formação ("2021 – 2023", "2024 – atual"). */
export function lerPeriodoFormacao(
  periodo: string,
  situacao: SituacaoFormacao | undefined,
): { inicio: string; fim: string } | null {
  const texto = periodo.trim();
  if (!texto) return null;
  const anos = texto.match(/\b(19|20)\d{2}\b/g) ?? [];
  // Algo além de anos e separadores (ex.: meses) → mantém o texto
  const resto = texto.replace(/\b(19|20)\d{2}\b/g, "").replace(ATUAL_REGEX, "").replace(/[\s\-–—/a]+/gi, "");
  if (resto) return null;
  if (anos.length === 2) return { inicio: anos[0], fim: anos[1] };
  if (anos.length === 1) {
    return ATUAL_REGEX.test(texto) || situacao === "CURSANDO"
      ? { inicio: anos[0], fim: "" }
      : { inicio: "", fim: anos[0] };
  }
  return null;
}

// ───────────────────────────── Conversões ─────────────────────────────

/** Linhas não vazias, sem marcadores do começo ("- ", "• ", "* "). */
export function linhas(texto: string): string[] {
  return texto
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-•*·–]\s*/, "").trim())
    .filter(Boolean);
}

/** Normaliza o LinkedIn digitado: aceita "linkedin.com/in/fulano" e completa o https://. */
export function normalizarLink(valor: string): string {
  const v = valor.trim();
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

export function linkValido(valor: string): boolean {
  try {
    const url = new URL(normalizarLink(valor));
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

function opcional(valor: string): string | undefined {
  const v = valor.trim();
  return v ? v : undefined;
}

export function experienciaVazia(e: ExperienciaForm): boolean {
  return !e.empresa.trim() && !e.cargo.trim() && !e.inicio && !e.fim && !e.atividades.trim();
}

export function formacaoVazia(f: FormacaoForm): boolean {
  return !f.instituicao.trim() && !f.curso.trim() && !f.inicio.trim() && !f.fim.trim() && !f.situacao;
}

export function idiomaVazio(i: IdiomaForm): boolean {
  return !i.idioma.trim() && !i.nivel;
}

/** true quando a pessoa ainda não digitou nada (o "Português - Nativo" que já vem preenchido não conta). */
export function formularioVazio(estado: FormularioEstado): boolean {
  const textos = [estado.titulo, estado.cargoDesejado, estado.cidade, estado.uf, estado.linkedin, estado.historia];
  return (
    textos.every((t) => !t.trim()) &&
    estado.experiencias.every(experienciaVazia) &&
    estado.formacao.every(formacaoVazia) &&
    estado.habilidades.length === 0 &&
    estado.premiacoes.length === 0 &&
    estado.idiomas.every((i) => idiomaVazio(i) || (i.idioma.trim() === "Português" && i.nivel === "Nativo"))
  );
}

/** Remove repetidas sem diferenciar maiúsculas/minúsculas, mantendo a primeira grafia. */
export function semRepetidas(lista: string[]): string[] {
  const vistos = new Set<string>();
  const resultado: string[] = [];
  for (const item of lista) {
    const v = item.trim();
    const chave = v.toLocaleLowerCase("pt-BR");
    if (!v || vistos.has(chave)) continue;
    vistos.add(chave);
    resultado.push(v);
  }
  return resultado;
}

/** Estado do formulário → corpo da API. Itens totalmente vazios são descartados. */
export function montarDados(estado: FormularioEstado, usarIa?: boolean): DadosCurriculo {
  const dados: DadosCurriculo = {
    titulo: opcional(estado.titulo),
    cargoDesejado: opcional(estado.cargoDesejado),
    cidade: opcional(estado.cidade),
    uf: opcional(estado.uf),
    linkedin: opcional(normalizarLink(estado.linkedin)),
    perfilProfissional: opcional(estado.historia),
    experiencias: estado.experiencias
      .filter((e) => !experienciaVazia(e))
      .map((e) => {
        const inicio = mesValido(e.inicio) ? e.inicio : undefined;
        const fim = !e.atual && mesValido(e.fim) ? e.fim : undefined;
        const periodo = periodoExperiencia(e.inicio, e.fim, e.atual) || e.periodoTexto.trim();
        return {
          empresa: e.empresa.trim(),
          cargo: e.cargo.trim(),
          inicio,
          fim,
          atual: e.atual || undefined,
          periodo: periodo ? periodo.slice(0, LIMITES.periodo) : undefined,
          atividades: linhas(e.atividades),
        };
      }),
    formacao: estado.formacao
      .filter((f) => !formacaoVazia(f))
      .map((f) => {
        const inicio = anoValido(f.inicio.trim()) ? f.inicio.trim() : undefined;
        const fim = anoValido(f.fim.trim()) ? f.fim.trim() : undefined;
        const periodo = periodoFormacao(f.inicio.trim(), f.fim.trim(), f.situacao) || f.periodoTexto.trim();
        return {
          instituicao: f.instituicao.trim(),
          curso: f.curso.trim(),
          inicio,
          fim,
          periodo: periodo ? periodo.slice(0, LIMITES.periodo) : undefined,
          situacao: f.situacao || undefined,
        };
      }),
    habilidades: semRepetidas(estado.habilidades),
    idiomas: estado.idiomas
      .filter((i) => !idiomaVazio(i))
      .map((i) => ({ idioma: i.idioma.trim(), nivel: i.nivel })),
    premiacoes: semRepetidas(estado.premiacoes),
  };
  if (usarIa !== undefined) dados.usarIa = usarIa;
  return dados;
}

/**
 * Currículo salvo → corpo do PUT, sem mudar o conteúdo. Usado em "Atualizar dados de contato": no PUT a API
 * remonta nome, e-mail e telefone a partir da conta. Sem `titulo`, a API mantém o título atual.
 */
export function conteudoParaDados(conteudo: ConteudoCurriculo): DadosCurriculo {
  const limpo = (v: string | undefined) => v?.trim() || undefined;
  return {
    cargoDesejado: limpo(conteudo.cargoDesejado),
    cidade: limpo(conteudo.cidade),
    uf: limpo(conteudo.uf),
    linkedin: limpo(conteudo.linkedin),
    perfilProfissional: limpo(conteudo.perfilProfissional),
    experiencias: (conteudo.experiencias ?? []).map((e) => ({
      empresa: e.empresa ?? "",
      cargo: e.cargo ?? "",
      inicio: limpo(e.inicio),
      fim: e.atual ? undefined : limpo(e.fim),
      atual: e.atual || undefined,
      periodo: limpo(e.periodo),
      atividades: [...(e.atividades ?? [])],
    })),
    formacao: (conteudo.formacao ?? []).map((f) => ({
      instituicao: f.instituicao ?? "",
      curso: f.curso ?? "",
      periodo: limpo(f.periodo),
      situacao: f.situacao || undefined,
    })),
    habilidades: [...(conteudo.habilidades ?? [])],
    idiomas: (conteudo.idiomas ?? []).map((i) => ({ idioma: i.idioma, nivel: i.nivel })),
    premiacoes: [...(conteudo.premiacoes ?? [])],
  };
}

/** Currículo salvo → estado do formulário (para a edição). */
export function conteudoParaFormulario(conteudo: ConteudoCurriculo, titulo: string | null): FormularioEstado {
  const experiencias = conteudo.experiencias.map<ExperienciaForm>((e) => {
    let inicio = e.inicio && mesValido(e.inicio) ? e.inicio : "";
    let fim = e.fim && mesValido(e.fim) ? e.fim : "";
    let atual = Boolean(e.atual);
    if (!inicio && !fim) {
      const lido = lerPeriodoExperiencia(e.periodo ?? "");
      if (lido) ({ inicio, fim, atual } = lido);
    }
    return {
      id: novoIdLocal(),
      empresa: e.empresa ?? "",
      cargo: e.cargo ?? "",
      inicio,
      fim: atual ? "" : fim,
      atual,
      atividades: (e.atividades ?? []).join("\n"),
      periodoTexto: inicio || fim ? "" : (e.periodo ?? ""),
    };
  });

  const formacao = conteudo.formacao.map<FormacaoForm>((f) => {
    const lido = lerPeriodoFormacao(f.periodo ?? "", f.situacao);
    return {
      id: novoIdLocal(),
      instituicao: f.instituicao ?? "",
      curso: f.curso ?? "",
      situacao: f.situacao ?? "",
      inicio: lido?.inicio ?? "",
      fim: lido?.fim ?? "",
      periodoTexto: lido ? "" : (f.periodo ?? ""),
    };
  });

  return {
    titulo: titulo ?? "",
    cargoDesejado: conteudo.cargoDesejado ?? "",
    cidade: conteudo.cidade ?? "",
    uf: conteudo.uf && SIGLAS_UF.has(conteudo.uf.toUpperCase()) ? conteudo.uf.toUpperCase() : "",
    linkedin: conteudo.linkedin ?? "",
    historia: conteudo.perfilProfissional ?? "",
    experiencias: experiencias.length ? experiencias : [novaExperiencia()],
    formacao: formacao.length ? formacao : [novaFormacao()],
    habilidades: [...(conteudo.habilidades ?? [])],
    idiomas: (conteudo.idiomas ?? []).map((i) => novoIdioma(i.idioma, i.nivel)),
    premiacoes: [...(conteudo.premiacoes ?? [])],
  };
}

// ───────────────────────────── Rascunho (localStorage) ─────────────────────────────

type Registro = Record<string, unknown>;
const ehRegistro = (v: unknown): v is Registro => typeof v === "object" && v !== null && !Array.isArray(v);
const texto = (v: unknown, max: number): string => (typeof v === "string" ? v.slice(0, max) : "");
const listaDeTextos = (v: unknown, maxItens: number, maxTexto: number): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, maxItens).map((x) => x.slice(0, maxTexto)) : [];

/** Rascunho guardado no navegador: o estado do formulário + a etapa em que a pessoa parou. */
export function rascunhoParaJson(estado: FormularioEstado, etapa: number): string {
  return JSON.stringify({ ...estado, etapa });
}

export function etapaDoRascunho(valor: unknown): number {
  const etapa = ehRegistro(valor) ? valor.etapa : 0;
  return typeof etapa === "number" && Number.isInteger(etapa) && etapa >= 0 && etapa < ETAPAS.length ? etapa : 0;
}

/**
 * Valida um rascunho lido do navegador (pode estar corrompido ou ser de uma versão antiga).
 * Devolve null quando não dá para aproveitar.
 */
export function lerRascunho(valor: unknown): FormularioEstado | null {
  if (!ehRegistro(valor)) return null;
  const situacaoValida = (v: unknown): SituacaoFormacao | "" =>
    v === "CONCLUIDO" || v === "CURSANDO" || v === "TRANCADO" ? v : "";

  const experiencias = (Array.isArray(valor.experiencias) ? valor.experiencias : [])
    .filter(ehRegistro)
    .slice(0, LIMITES.experiencias)
    .map<ExperienciaForm>((e) => ({
      id: novoIdLocal(),
      empresa: texto(e.empresa, LIMITES.empresa),
      cargo: texto(e.cargo, LIMITES.cargo),
      inicio: mesValido(texto(e.inicio, 7)) ? texto(e.inicio, 7) : "",
      fim: mesValido(texto(e.fim, 7)) ? texto(e.fim, 7) : "",
      atual: e.atual === true,
      atividades: texto(e.atividades, LIMITES.atividades * (LIMITES.atividade + 1)),
      periodoTexto: texto(e.periodoTexto, LIMITES.periodo),
    }));

  const formacao = (Array.isArray(valor.formacao) ? valor.formacao : [])
    .filter(ehRegistro)
    .slice(0, LIMITES.formacao)
    .map<FormacaoForm>((f) => ({
      id: novoIdLocal(),
      instituicao: texto(f.instituicao, LIMITES.instituicao),
      curso: texto(f.curso, LIMITES.curso),
      situacao: situacaoValida(f.situacao),
      inicio: texto(f.inicio, 4),
      fim: texto(f.fim, 4),
      periodoTexto: texto(f.periodoTexto, LIMITES.periodo),
    }));

  const idiomas = (Array.isArray(valor.idiomas) ? valor.idiomas : [])
    .filter(ehRegistro)
    .slice(0, LIMITES.idiomas)
    .map((i) => novoIdioma(texto(i.idioma, LIMITES.idioma), texto(i.nivel, 20)));

  const uf = texto(valor.uf, 2).toUpperCase();

  return {
    titulo: texto(valor.titulo, LIMITES.titulo),
    cargoDesejado: texto(valor.cargoDesejado, LIMITES.cargoDesejado),
    cidade: texto(valor.cidade, LIMITES.cidade),
    uf: SIGLAS_UF.has(uf) ? uf : "",
    linkedin: texto(valor.linkedin, LIMITES.linkedin),
    historia: texto(valor.historia, LIMITES.historia),
    experiencias: experiencias.length ? experiencias : [novaExperiencia()],
    formacao: formacao.length ? formacao : [novaFormacao()],
    habilidades: listaDeTextos(valor.habilidades, LIMITES.habilidades, LIMITES.habilidade),
    idiomas,
    premiacoes: listaDeTextos(valor.premiacoes, LIMITES.premiacoes, LIMITES.premiacao),
  };
}

// ───────────────────────────── Validação ─────────────────────────────

/** Erros por id do campo na tela (assim dá para levar o foco direto ao campo). */
export type ErrosFormulario = Record<string, string>;

export const ETAPAS = ["sobre", "experiencias", "formacao", "habilidades", "revisao"] as const;
export type Etapa = (typeof ETAPAS)[number];

export interface ContextoValidacao {
  modo: "criar" | "editar";
  temAudio: boolean;
  usarIa: boolean;
  iaDisponivel: boolean;
  anoAtual: number;
}

/** Ids dos campos na tela — usados pelo formulário e pela validação. */
export const idCampo = {
  cargoDesejado: "cv-cargo-desejado",
  cidade: "cv-cidade",
  uf: "cv-uf",
  linkedin: "cv-linkedin",
  historia: "cv-historia",
  titulo: "cv-titulo",
  conteudo: "cv-conteudo",
  habilidades: "cv-habilidades",
  premiacoes: "cv-premiacoes",
  exp: (id: string, campo: "empresa" | "cargo" | "inicio" | "fim" | "atividades") => `cv-exp-${id}-${campo}`,
  form: (id: string, campo: "instituicao" | "curso" | "situacao" | "inicio" | "fim") => `cv-form-${id}-${campo}`,
  idioma: (id: string, campo: "idioma" | "nivel") => `cv-idioma-${id}-${campo}`,
};

function maximo(erros: ErrosFormulario, id: string, valor: string, limite: number, nome: string) {
  if (valor.trim().length > limite) erros[id] = `${nome} pode ter até ${limite} caracteres.`;
}

export function validarEtapa(etapa: Etapa, estado: FormularioEstado, ctx: ContextoValidacao): ErrosFormulario {
  const erros: ErrosFormulario = {};

  if (etapa === "sobre") {
    maximo(erros, idCampo.cargoDesejado, estado.cargoDesejado, LIMITES.cargoDesejado, "O cargo desejado");
    maximo(erros, idCampo.cidade, estado.cidade, LIMITES.cidade, "A cidade");
    if (estado.uf && !SIGLAS_UF.has(estado.uf)) erros[idCampo.uf] = "Escolha um estado da lista.";
    if (estado.linkedin.trim()) {
      if (normalizarLink(estado.linkedin).length > LIMITES.linkedin) {
        erros[idCampo.linkedin] = `O link pode ter até ${LIMITES.linkedin} caracteres.`;
      } else if (!linkValido(estado.linkedin)) {
        erros[idCampo.linkedin] = "Esse link não parece válido. Exemplo: linkedin.com/in/seu-nome";
      }
    }
    maximo(erros, idCampo.historia, estado.historia, LIMITES.historia, "Este texto");
  }

  if (etapa === "experiencias") {
    for (const e of estado.experiencias) {
      if (experienciaVazia(e)) continue;
      if (!e.empresa.trim()) erros[idCampo.exp(e.id, "empresa")] = "Informe onde foi (empresa, projeto ou local).";
      else maximo(erros, idCampo.exp(e.id, "empresa"), e.empresa, LIMITES.empresa, "Este campo");
      if (!e.cargo.trim()) erros[idCampo.exp(e.id, "cargo")] = "Informe o que você fazia (cargo ou função).";
      else maximo(erros, idCampo.exp(e.id, "cargo"), e.cargo, LIMITES.cargo, "Este campo");
      // Navegadores sem o seletor de mês mostram um campo de texto: daí o exemplo no formato
      if (e.inicio && !mesValido(e.inicio)) erros[idCampo.exp(e.id, "inicio")] = "Informe mês e ano (ex.: 2023-06).";
      if (!e.atual && e.fim && !mesValido(e.fim)) erros[idCampo.exp(e.id, "fim")] = "Informe mês e ano (ex.: 2023-12).";
      if (mesValido(e.inicio) && !e.atual && mesValido(e.fim) && e.fim < e.inicio) {
        erros[idCampo.exp(e.id, "fim")] = "O fim não pode ser antes do início.";
      }
      if (mesValido(e.inicio) && !e.atual && !e.fim) {
        erros[idCampo.exp(e.id, "fim")] = "Informe quando terminou ou marque “Trabalho aqui atualmente”.";
      }
      const atividades = linhas(e.atividades);
      if (atividades.length > LIMITES.atividades) {
        erros[idCampo.exp(e.id, "atividades")] = `Use no máximo ${LIMITES.atividades} atividades (uma por linha).`;
      } else if (atividades.some((a) => a.length > LIMITES.atividade)) {
        erros[idCampo.exp(e.id, "atividades")] = `Cada atividade pode ter até ${LIMITES.atividade} caracteres.`;
      }
    }
  }

  if (etapa === "formacao") {
    const anoMax = ctx.anoAtual + 10;
    const anoOk = (v: string) => anoValido(v) && Number(v) >= 1950 && Number(v) <= anoMax;
    for (const f of estado.formacao) {
      if (formacaoVazia(f)) continue;
      if (!f.instituicao.trim()) erros[idCampo.form(f.id, "instituicao")] = "Informe a escola, faculdade ou instituição.";
      else maximo(erros, idCampo.form(f.id, "instituicao"), f.instituicao, LIMITES.instituicao, "Este campo");
      if (!f.curso.trim()) erros[idCampo.form(f.id, "curso")] = "Informe o curso (ex.: Ensino Médio).";
      else maximo(erros, idCampo.form(f.id, "curso"), f.curso, LIMITES.curso, "Este campo");
      if (f.inicio.trim() && !anoOk(f.inicio.trim())) erros[idCampo.form(f.id, "inicio")] = "Use um ano com 4 dígitos, ex.: 2022.";
      if (f.fim.trim() && !anoOk(f.fim.trim())) erros[idCampo.form(f.id, "fim")] = "Use um ano com 4 dígitos, ex.: 2025.";
      if (anoOk(f.inicio.trim()) && anoOk(f.fim.trim()) && Number(f.fim) < Number(f.inicio)) {
        erros[idCampo.form(f.id, "fim")] = "O ano de conclusão não pode ser antes do início.";
      }
    }
  }

  if (etapa === "habilidades") {
    if (estado.habilidades.length > LIMITES.habilidades) {
      erros[idCampo.habilidades] = `Escolha no máximo ${LIMITES.habilidades} habilidades.`;
    }
    for (const i of estado.idiomas) {
      if (idiomaVazio(i)) continue;
      if (!i.idioma.trim()) erros[idCampo.idioma(i.id, "idioma")] = "Informe o idioma.";
      else maximo(erros, idCampo.idioma(i.id, "idioma"), i.idioma, LIMITES.idioma, "O idioma");
      if (!i.nivel) erros[idCampo.idioma(i.id, "nivel")] = "Escolha o nível.";
    }
    if (estado.premiacoes.length > LIMITES.premiacoes) {
      erros[idCampo.premiacoes] = `Informe no máximo ${LIMITES.premiacoes} itens.`;
    }
  }

  if (etapa === "revisao") {
    maximo(erros, idCampo.titulo, estado.titulo, LIMITES.titulo, "O nome do currículo");
    // Mesmo critério da API (temConteudoEscrito): perfil, experiência, formação ou habilidade.
    // Só áudio vale apenas quando ele vai mesmo para a IA.
    const temTexto = Boolean(estado.historia.trim());
    const temItens =
      estado.experiencias.some((e) => !experienciaVazia(e)) ||
      estado.formacao.some((f) => !formacaoVazia(f)) ||
      estado.habilidades.length > 0;
    const audioConta = ctx.modo === "criar" && ctx.temAudio && ctx.usarIa && ctx.iaDisponivel;
    if (!temTexto && !temItens && !audioConta) {
      erros[idCampo.conteudo] =
        ctx.modo === "criar"
          ? ctx.temAudio && !(ctx.usarIa && ctx.iaDisponivel)
            ? "Sem a IA, o áudio e o currículo antigo não podem ser usados. Escreva um pouco sobre você ou preencha uma experiência, formação ou habilidade."
            : "Conte um pouco sobre você (por texto, áudio ou currículo antigo) ou preencha pelo menos uma experiência, formação ou habilidade."
          : "O currículo precisa ter pelo menos o perfil, uma experiência, uma formação ou uma habilidade.";
    }
  }

  return erros;
}
