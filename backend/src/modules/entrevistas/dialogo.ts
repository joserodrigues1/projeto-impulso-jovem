/**
 * Conversa da simulação em texto, pronta para os prompts da IA (Helena e avaliador) — assim o n8n
 * não precisa de código para montar o diálogo. Funções puras, sem banco.
 */
import { AutorMensagem, TipoMensagem } from '@prisma/client';
import { derivarClassificacao, type RelatorioEntrevista } from './relatorio-entrevista';

export interface MensagemDialogo {
  autor: AutorMensagem;
  tipo: TipoMensagem;
  conteudo: string;
}

/** Quantas mensagens recentes vão para a Helena (o avaliador recebe a conversa inteira). */
export const MENSAGENS_DIALOGO_RECENTE = 30;

/** Com menos respostas que isso, a conversa é curta demais para uma nota alta. */
export const RESPOSTAS_PARA_NOTA_CHEIA = 4;
/** Nota máxima de uma conversa curta (com menos de RESPOSTAS_PARA_NOTA_CHEIA respostas). */
export const NOTA_MAXIMA_CONVERSA_CURTA = 6;

const ROTULO: Record<AutorMensagem, string> = {
  [AutorMensagem.RECRUTADORA]: 'Helena',
  [AutorMensagem.CANDIDATO]: 'Candidato',
};

/**
 * Uma linha por mensagem, numerada na ordem da conversa: `[03] Candidato (áudio): …`.
 * `aPartirDe` mantém a numeração original quando só o trecho final é usado.
 */
export function formatarDialogo(mensagens: MensagemDialogo[], aPartirDe = 0): string {
  const largura = Math.max(2, String(aPartirDe + mensagens.length).length);
  return mensagens
    .map((m, i) => {
      const numero = String(aPartirDe + i + 1).padStart(largura, '0');
      const audio = m.tipo === TipoMensagem.AUDIO ? ' (áudio transcrito)' : '';
      const texto = m.conteudo.replace(/\s+/g, ' ').trim();
      return `[${numero}] ${ROTULO[m.autor]}${audio}: ${texto}`;
    })
    .join('\n');
}

/** Trecho final da conversa (para a Helena), com a numeração original. */
export function dialogoRecente(
  mensagens: MensagemDialogo[],
  quantas = MENSAGENS_DIALOGO_RECENTE,
): string {
  const inicio = Math.max(0, mensagens.length - quantas);
  return formatarDialogo(mensagens.slice(inicio), inicio);
}

export function contarParticipacao(mensagens: MensagemDialogo[]) {
  return {
    respostasCandidato: mensagens.filter((m) => m.autor === AutorMensagem.CANDIDATO).length,
    perguntasHelena: mensagens.filter((m) => m.autor === AutorMensagem.RECRUTADORA).length,
  };
}

export interface ContextoCandidato {
  primeiroNome: string;
  curriculo: {
    cargoDesejado: string | null;
    perfilProfissional: string | null;
    experiencias: Array<{ cargo: string; empresa: string; periodo: string }>;
    formacao: Array<{ curso: string; instituicao: string; periodo: string }>;
    habilidades: string[];
    idiomas: Array<{ idioma: string; nivel: string }>;
  } | null;
  historico: Array<{ cargoAlvo: string; notaGeral: number | null; principaisMelhorias: string[] }>;
}

/** Contexto do candidato em texto (currículo resumido + treinos anteriores), para os prompts. */
export function textoContexto({ primeiroNome, curriculo, historico }: ContextoCandidato): string {
  const linhas = [`Nome: ${primeiroNome}`];
  if (curriculo) {
    if (curriculo.cargoDesejado) linhas.push(`Vaga que busca: ${curriculo.cargoDesejado}`);
    if (curriculo.perfilProfissional) linhas.push(`Perfil: ${curriculo.perfilProfissional}`);
    if (curriculo.experiencias.length) {
      linhas.push(
        'Experiências: ' +
          curriculo.experiencias
            .map((e) => `${e.cargo} em ${e.empresa} (${e.periodo || 'sem período'})`)
            .join('; '),
      );
    }
    if (curriculo.formacao.length) {
      linhas.push(
        'Formação: ' +
          curriculo.formacao
            .map((f) => `${f.curso} — ${f.instituicao}${f.periodo ? ` (${f.periodo})` : ''}`)
            .join('; '),
      );
    }
    if (curriculo.habilidades.length)
      linhas.push(`Habilidades: ${curriculo.habilidades.join(', ')}`);
    if (curriculo.idiomas.length) {
      linhas.push(
        `Idiomas: ${curriculo.idiomas.map((i) => `${i.idioma} (${i.nivel})`).join(', ')}`,
      );
    }
  } else {
    linhas.push(
      'Currículo: ainda não montou um currículo na plataforma (provável primeiro emprego).',
    );
  }
  if (historico.length) {
    linhas.push(
      'Treinos anteriores: ' +
        historico
          .map(
            (h) =>
              `${h.cargoAlvo}${h.notaGeral !== null ? ` (nota ${h.notaGeral.toFixed(1).replace('.', ',')})` : ''}` +
              (h.principaisMelhorias.length
                ? ` — precisava melhorar: ${h.principaisMelhorias.join('; ')}`
                : ''),
          )
          .join(' | '),
    );
  } else {
    linhas.push('Treinos anteriores: nenhum (é a primeira simulação).');
  }
  return linhas.join('\n');
}

/** Texto comparável: sem acentos, sem pontuação, minúsculo e com espaços simples. */
export function normalizarParaComparar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * A "evidência" que a IA atribui ao candidato é mesmo algo que ele escreveu (ou falou)?
 * Aceita diferença de acento, pontuação e caixa; trechos curtos demais não contam como prova.
 */
export function evidenciaDoCandidato(evidencia: string, falasCandidato: string): boolean {
  const trecho = normalizarParaComparar(evidencia);
  if (trecho.length < 8) return false;
  return normalizarParaComparar(falasCandidato).includes(trecho);
}

/** A nota geral fica perto da média das competências: no máximo 1 ponto acima e 1,5 abaixo. */
const NOTA_ACIMA_DA_MEDIA = 1;
const NOTA_ABAIXO_DA_MEDIA = 1.5;

const umaCasa = (n: number) => Math.round(n * 10) / 10;

/**
 * Confere o relatório da IA com a conversa real (antes de salvar):
 * - "Evidência" que não aparece nas falas do candidato é retirada — o jovem nunca vê uma citação que não disse;
 * - conversa curta (menos de RESPOSTAS_PARA_NOTA_CHEIA respostas) tem as notas limitadas: pouca conversa
 *   não permite avaliar tudo;
 * - a nota geral fica coerente com as competências e a classificação sempre corresponde à nota.
 */
export function conferirComConversa(
  relatorio: RelatorioEntrevista,
  falasCandidato: string[],
): RelatorioEntrevista {
  const falas = falasCandidato.join('\n');
  const semEvidenciaFalsa = <T extends { evidencia?: string }>(p: T): T => {
    if (!p.evidencia || evidenciaDoCandidato(p.evidencia, falas)) return p;
    const copia = { ...p };
    delete copia.evidencia;
    return copia;
  };

  const curta = falasCandidato.length < RESPOSTAS_PARA_NOTA_CHEIA;
  const teto = (n: number) => (curta ? Math.min(n, NOTA_MAXIMA_CONVERSA_CURTA) : n);
  const competencias = relatorio.competencias.map((c) => ({ ...c, nota: teto(c.nota) }));

  let notaGeral = relatorio.notaGeral;
  if (competencias.length) {
    const media = competencias.reduce((soma, c) => soma + c.nota, 0) / competencias.length;
    notaGeral = Math.min(
      Math.max(notaGeral, media - NOTA_ABAIXO_DA_MEDIA),
      media + NOTA_ACIMA_DA_MEDIA,
    );
  }
  notaGeral = umaCasa(Math.min(Math.max(teto(notaGeral), 0), 10));

  return {
    ...relatorio,
    notaGeral,
    classificacao: derivarClassificacao(notaGeral),
    competencias,
    pontosFortes: relatorio.pontosFortes.map(semEvidenciaFalsa),
    pontosMelhoria: relatorio.pontosMelhoria.map(semEvidenciaFalsa),
  };
}

const CLASSIFICACAO_TEXTO: Record<RelatorioEntrevista['classificacao'], string> = {
  INICIANTE: 'Iniciante',
  EM_DESENVOLVIMENTO: 'Em desenvolvimento',
  PREPARADO: 'Preparado(a)',
  DESTAQUE: 'Destaque',
};

/** O essencial do relatório para a mensagem de resultado no WhatsApp (montada no n8n, sem código). */
export function resumoDoResultado(relatorio: RelatorioEntrevista) {
  const melhoria = relatorio.pontosMelhoria[0];
  return {
    notaGeral: relatorio.notaGeral,
    notaTexto: relatorio.notaGeral.toFixed(1).replace('.', ','),
    classificacao: relatorio.classificacao,
    classificacaoTexto: CLASSIFICACAO_TEXTO[relatorio.classificacao],
    destaques: relatorio.pontosFortes.slice(0, 2).map((p) => p.titulo),
    melhoria: melhoria
      ? { titulo: melhoria.titulo, comoMelhorar: melhoria.comoMelhorar || melhoria.descricao }
      : null,
  };
}
