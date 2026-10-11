/**
 * Resumo do currículo mais recente do usuário, usado como contexto pela IA recrutadora.
 *
 * Lê o JSON de `CurriculoGerado.conteudo` de forma tolerante — tanto o formato v2
 * (docs/ARQUITETURA.md, seção 4.1) quanto o v1 antigo — sem depender do módulo de currículos.
 * Só leva o necessário para a conversa: sem e-mail, telefone ou endereço.
 */
import { ehObjeto, itensValidos, Objeto, textoLimpo } from './normalizacao';

export type ResumoCurriculo = {
  cargoDesejado: string | null;
  perfilProfissional: string | null;
  experiencias: Array<{ cargo: string; empresa: string; periodo: string }>;
  formacao: Array<{ curso: string; instituicao: string; periodo: string }>;
  habilidades: string[];
  idiomas: Array<{ idioma: string; nivel: string }>;
};

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "2023-06" → "jun/2023"; "2023" → "2023"; outros formatos → ''. */
function formatarData(valor: unknown): string {
  if (typeof valor !== 'string') return '';
  const m = /^(\d{4})(?:-(\d{2}))?/.exec(valor.trim());
  if (!m) return '';
  const mes = m[2] ? MESES[Number(m[2]) - 1] : undefined;
  return mes ? `${mes}/${m[1]}` : m[1];
}

/** Período de exibição a partir das datas, quando o texto pronto não existe (v1). */
function periodoDeDatas(inicio: unknown, fim: unknown, atual: unknown): string {
  const de = formatarData(inicio);
  if (!de) return '';
  const ate = formatarData(fim) || (atual === false ? '' : 'atual');
  return ate ? `${de} – ${ate}` : de;
}

function experiencia(item: unknown): ResumoCurriculo['experiencias'][number] | null {
  if (!ehObjeto(item)) return null;
  const cargo = textoLimpo(item.cargo, 150);
  const empresa = textoLimpo(item.empresa, 150);
  if (!cargo && !empresa) return null;
  const periodo =
    textoLimpo(item.periodo, 60) ||
    periodoDeDatas(item.inicio ?? item.dataInicio, item.fim ?? item.dataFim, item.atual);
  return { cargo, empresa, periodo };
}

function formacao(item: unknown): ResumoCurriculo['formacao'][number] | null {
  if (!ehObjeto(item)) return null;
  const curso = textoLimpo(item.curso, 150);
  const instituicao = textoLimpo(item.instituicao, 150);
  if (!curso && !instituicao) return null;
  const periodo = textoLimpo(item.periodo, 60) || periodoDeDatas(item.inicio, item.fim, false);
  return { curso, instituicao, periodo };
}

function idioma(item: unknown): ResumoCurriculo['idiomas'][number] | null {
  if (!ehObjeto(item)) return null;
  const nome = textoLimpo(item.idioma, 60);
  return nome ? { idioma: nome, nivel: textoLimpo(item.nivel, 40) } : null;
}

/** v1 não tinha lista de formação, só o nível de escolaridade. */
function formacaoV1(conteudo: Objeto): ResumoCurriculo['formacao'] {
  const nivel = textoLimpo(conteudo.nivelEscolaridade, 150);
  return nivel ? [{ curso: nivel, instituicao: '', periodo: '' }] : [];
}

/** Resumo do conteúdo do currículo; `null` se não houver nada aproveitável. */
export function resumirCurriculo(conteudo: unknown): ResumoCurriculo | null {
  if (!ehObjeto(conteudo)) return null;

  const listaFormacao = itensValidos(conteudo.formacao, 10, formacao);
  const resumo: ResumoCurriculo = {
    cargoDesejado: textoLimpo(conteudo.cargoDesejado, 120) || null,
    perfilProfissional:
      textoLimpo(conteudo.perfilProfissional ?? conteudo.resumoProfissional, 1200, true) || null,
    experiencias: itensValidos(conteudo.experiencias, 10, experiencia),
    formacao: listaFormacao.length ? listaFormacao : formacaoV1(conteudo),
    habilidades: itensValidos(conteudo.habilidades, 30, (h) => textoLimpo(h, 60) || null),
    idiomas: itensValidos(conteudo.idiomas, 10, idioma),
  };

  const vazio =
    !resumo.cargoDesejado &&
    !resumo.perfilProfissional &&
    !resumo.experiencias.length &&
    !resumo.formacao.length &&
    !resumo.habilidades.length &&
    !resumo.idiomas.length;
  return vazio ? null : resumo;
}
