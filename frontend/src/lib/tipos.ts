/**
 * Tipos dos contratos da API (espelham docs/ARQUITETURA.md).
 * Se mudar algo aqui, confira o backend e o documento.
 */

export type TipoUsuario = "USUARIO" | "ADMIN";
export type StatusConta = "ATIVO" | "PENDENTE" | "BLOQUEADO";

export interface UsuarioSessao {
  id: string;
  nomeCompleto: string;
  email: string;
  tipoUsuario: TipoUsuario;
  statusConta: StatusConta;
  fotoUrl: string | null;
}

export interface Perfil {
  resumoProfissional: string | null;
  nivelEscolaridade: string | null;
  linkLinkedin: string | null;
  linkGithub: string | null;
  habilidades: string[];
  cidade: string | null;
  uf: string | null;
}

export interface Usuario extends UsuarioSessao {
  telefone: string;
  telefoneFormatado: string;
  criadoEm: string;
  perfil: Perfil | null;
}

export interface Paginado<T> {
  dados: T[];
  meta: { total: number; pagina: number; limite: number; totalPaginas: number };
}

export interface ConfigPublica {
  whatsappNumero: string | null;
  whatsappLink: string | null;
  curriculoIaDisponivel: boolean;
}

// ───────────────────────────── Currículo ─────────────────────────────

export type SituacaoFormacao = "CONCLUIDO" | "CURSANDO" | "TRANCADO";

export interface ExperienciaCurriculo {
  empresa: string;
  cargo: string;
  periodo: string;
  inicio?: string;
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
  nomeCompleto: string;
  email: string;
  telefone: string;
  cidade?: string;
  uf?: string;
  linkedin?: string;
  cargoDesejado?: string;
  perfilProfissional: string;
  experiencias: ExperienciaCurriculo[];
  formacao: FormacaoCurriculo[];
  habilidades: string[];
  idiomas: IdiomaCurriculo[];
  premiacoes: string[];
}

/** Corpo de POST /curriculos/gerar (campo `dados`) e PUT /curriculos/:id. */
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

export interface CurriculoResumo {
  id: string;
  titulo: string | null;
  cargoDesejado: string | null;
  refinadoPorIa: boolean;
  geradoEm: string;
  atualizadoEm: string;
}

export interface CurriculoDetalhe extends CurriculoResumo {
  conteudo: ConteudoCurriculo;
}

export interface CurriculoGeradoResposta extends CurriculoDetalhe {
  transcricao?: string;
  avisos: string[];
}

// ───────────────────────────── Entrevistas ─────────────────────────────

export type Classificacao = "INICIANTE" | "EM_DESENVOLVIMENTO" | "PREPARADO" | "DESTAQUE";

export interface RelatorioEntrevista {
  /** 1 = relatório estruturado; 0 = montado a partir dos campos de texto antigos */
  versao: 0 | 1;
  notaGeral: number | null;
  classificacao: Classificacao | null;
  resumo: string;
  recomendacao: string;
  competencias: Array<{ nome: string; nota: number; comentario: string }>;
  pontosFortes: Array<{ titulo: string; descricao: string; evidencia?: string }>;
  pontosMelhoria: Array<{ titulo: string; descricao: string; evidencia?: string; comoMelhorar: string }>;
  dicasComunicacao: string[];
  planoDeAcao: Array<{ passo: string; prazo?: string }>;
  perguntasParaPraticar: string[];
  exemploResposta?: { pergunta: string; resposta: string };
}

export interface EntrevistaResumo {
  id: string;
  cargoAlvo: string;
  empresaAlvo: string | null;
  notaGeral: number | null;
  classificacao: Classificacao | null;
  resumo: string | null;
  dataRealizacao: string;
}

export interface EntrevistaDetalhe {
  id: string;
  cargoAlvo: string;
  empresaAlvo: string | null;
  notaGeral: number | null;
  dataRealizacao: string;
  pontosFortes: string;
  pontosMelhoria: string;
  dicasComunicacao: string;
  relatorio: RelatorioEntrevista;
}

export interface SessaoAtiva {
  id: string;
  iniciadaEm: string;
  ultimaMensagemEm: string;
  totalMensagens: number;
}

export interface ResumoEntrevistas {
  total: number;
  mediaNota: number | null;
  ultimaNota: number | null;
  evolucao: Array<{ id: string; data: string; nota: number }>;
  sessaoAtiva: SessaoAtiva | null;
  sessaoAguardandoRelatorio: boolean;
}
