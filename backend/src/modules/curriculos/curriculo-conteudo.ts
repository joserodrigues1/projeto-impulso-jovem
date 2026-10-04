/**
 * Conteúdo do currículo salvo em `CurriculoGerado.conteudo` (snapshot).
 * O PDF é renderizado a partir dele, então regerar o arquivo dá sempre o mesmo resultado.
 */
export interface ExperienciaConteudo {
  cargo: string;
  empresa: string;
  descricao?: string;
  /** AAAA-MM */
  dataInicio: string;
  /** AAAA-MM — ausente = trabalho atual */
  dataFim?: string;
}

export interface ConteudoCurriculo {
  versao: 1;
  nomeCompleto: string;
  email: string;
  /** Telefone já formatado para exibição. */
  telefone: string;
  cidade?: string;
  uf?: string;
  resumoProfissional?: string;
  nivelEscolaridade?: string;
  habilidades: string[];
  experiencias: ExperienciaConteudo[];
}

const LIMITE_TEXTO = 2000;
const LIMITE_HABILIDADES = 30;
const LIMITE_HABILIDADE = 60;

type Objeto = Record<string, unknown>;
const ehObjeto = (v: unknown): v is Objeto => typeof v === 'object' && v !== null && !Array.isArray(v);
const textoValido = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

/**
 * Extrai o objeto útil da resposta do n8n, que varia conforme o fluxo:
 * `{...}`, `[{...}]` ("all items") ou `{ output: {...} | "<json>" }` (nó AI Agent).
 */
function extrairRespostaN8n(resposta: unknown): Objeto | null {
  let atual: unknown = Array.isArray(resposta) ? resposta[0] : resposta;
  if (ehObjeto(atual) && 'output' in atual) {
    atual = atual.output;
    if (typeof atual === 'string') {
      try {
        atual = JSON.parse(atual);
      } catch {
        return null;
      }
    }
  }
  return ehObjeto(atual) ? atual : null;
}

/**
 * Aplica os textos refinados pela IA sobre o conteúdo original.
 * A resposta é tratada como não confiável: só aplicamos campos com o tipo esperado,
 * com limites de tamanho. Cargo, empresa e datas nunca são alterados pela IA.
 */
export function aplicarRefinamento(
  base: ConteudoCurriculo,
  resposta: unknown,
): { conteudo: ConteudoCurriculo; refinado: boolean } {
  const dados = extrairRespostaN8n(resposta);
  if (!dados) return { conteudo: base, refinado: false };

  let refinado = false;
  const conteudo: ConteudoCurriculo = {
    ...base,
    habilidades: [...base.habilidades],
    experiencias: base.experiencias.map((e) => ({ ...e })),
  };

  if (textoValido(dados.resumoProfissional)) {
    conteudo.resumoProfissional = dados.resumoProfissional.trim().slice(0, LIMITE_TEXTO);
    refinado = true;
  }

  if (Array.isArray(dados.habilidades)) {
    const habilidades = [
      ...new Set(
        dados.habilidades.filter(textoValido).map((h) => h.trim().slice(0, LIMITE_HABILIDADE)),
      ),
    ].slice(0, LIMITE_HABILIDADES);
    if (habilidades.length) {
      conteudo.habilidades = habilidades;
      refinado = true;
    }
  }

  if (Array.isArray(dados.experiencias)) {
    const sugeridas: unknown[] = dados.experiencias;
    // Correspondência por posição: a IA só reescreve a descrição de cada experiência
    conteudo.experiencias.forEach((exp, i) => {
      const sugerida = sugeridas[i];
      if (ehObjeto(sugerida) && textoValido(sugerida.descricao)) {
        exp.descricao = sugerida.descricao.trim().slice(0, LIMITE_TEXTO);
        refinado = true;
      }
    });
  }

  return { conteudo, refinado };
}
