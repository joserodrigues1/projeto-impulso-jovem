import { BookOpen, FileUser, MessagesSquare, type LucideIcon } from "lucide-react";

/** Os 5 ingredientes de um bom prompt, na ordem em que aparecem no texto. */
export const ORDEM_INGREDIENTES = ["papel", "contexto", "tarefa", "formato", "tom"] as const;
export type IdIngrediente = (typeof ORDEM_INGREDIENTES)[number];

export interface Ingrediente {
  nome: string;
  /** Explicação curta (aparece no botão no desktop). */
  descricao: string;
  /** Por que o ingrediente melhora a resposta (dica do medidor e "por que funciona"). */
  porque: string;
}

export const INGREDIENTES: Record<IdIngrediente, Ingrediente> = {
  papel: {
    nome: "Papel",
    descricao: "“Aja como…”: quem a IA deve ser",
    porque: "a IA responde com o olhar de quem entende do assunto.",
  },
  contexto: {
    nome: "Contexto",
    descricao: "Quem você é e qual é a situação",
    porque: "a resposta fala da sua vida, não de um candidato qualquer.",
  },
  tarefa: {
    nome: "Tarefa",
    descricao: "O que exatamente você quer",
    porque: "a IA sabe exatamente o que entregar.",
  },
  formato: {
    nome: "Formato",
    descricao: "Como quer receber a resposta",
    porque: "a resposta já vem do jeito certo para usar.",
  },
  tom: {
    nome: "Tom e limites",
    descricao: "Jeito de falar e o que evitar",
    porque: "evita texto engessado e informação inventada.",
  },
};

/**
 * Cores de cada ingrediente (tokens da marca). O texto do prompt continua na cor normal
 * (contraste garantido); a cor aparece no fundo, no sublinhado e no ponto da legenda.
 */
export const COR_INGREDIENTE: Record<IdIngrediente, { ponto: string; trecho: string; anel: string }> = {
  papel: {
    ponto: "bg-marca",
    trecho: "bg-marca/10 decoration-marca dark:bg-marca/20",
    anel: "border-marca/45 bg-marca/8 dark:bg-marca/15",
  },
  contexto: {
    ponto: "bg-ciano",
    trecho: "bg-ciano/15 decoration-ciano dark:bg-ciano/15",
    anel: "border-ciano/60 bg-ciano/10 dark:border-ciano/45",
  },
  tarefa: {
    ponto: "bg-lima",
    trecho:
      "bg-lima/30 decoration-[color-mix(in_oklch,var(--lima)_70%,var(--tinta))] dark:bg-lima/15 dark:decoration-lima",
    anel: "border-[color-mix(in_oklch,var(--lima)_65%,var(--tinta))] bg-lima/15 dark:border-lima/40 dark:bg-lima/10",
  },
  formato: {
    ponto: "bg-chart-4",
    trecho: "bg-chart-4/15 decoration-chart-4 dark:bg-chart-4/15",
    anel: "border-chart-4/60 bg-chart-4/10 dark:border-chart-4/40",
  },
  tom: {
    ponto: "bg-chart-5",
    trecho: "bg-chart-5/12 decoration-chart-5 dark:bg-chart-5/15",
    anel: "border-chart-5/50 bg-chart-5/8 dark:border-chart-5/40 dark:bg-chart-5/10",
  },
};

export type IdModelo = "curriculo" | "entrevista" | "estudos";

export interface ModeloPrompt {
  id: IdModelo;
  rotulo: string;
  icone: LucideIcon;
  textos: Record<IdIngrediente, string>;
}

/** Modelos prontos do construtor. [Colchetes] = o que o jovem troca pelos dados dele. */
export const MODELOS: readonly ModeloPrompt[] = [
  {
    id: "curriculo",
    rotulo: "Currículo",
    icone: FileUser,
    textos: {
      papel: "Aja como uma recrutadora experiente em vagas de jovem aprendiz e estágio.",
      contexto:
        "Tenho [idade] anos, estou no [ano escolar ou curso] e nunca tive emprego formal, mas já [fiz curso de informática / ajudo no comércio da família / participei de um projeto voluntário].",
      tarefa: "Escreva a seção “Experiências e atividades” do meu currículo para a vaga de [nome da vaga].",
      formato:
        "Use de 3 a 5 tópicos curtos, cada um começando com um verbo de ação, e no fim sugira 3 habilidades que combinam com a vaga.",
      tom: "Linguagem simples e profissional. Use só o que eu contei: não invente experiências, cursos ou números. Se faltar informação, me pergunte antes.",
    },
  },
  {
    id: "entrevista",
    rotulo: "Entrevista",
    icone: MessagesSquare,
    textos: {
      papel: "Aja como recrutadora de RH conduzindo uma entrevista para jovem aprendiz.",
      contexto:
        "Minha entrevista para a vaga de [nome da vaga] na [nome da empresa] é [quando]. É a minha primeira, e o que mais me preocupa são as perguntas sobre [assunto].",
      tarefa: "Faça uma simulação de entrevista comigo, com 5 perguntas.",
      formato:
        "Uma pergunta por vez, esperando minha resposta. Depois de cada uma, dê um retorno em 3 partes: o que foi bom, o que melhorar e um exemplo de resposta mais forte.",
      tom: "Seja realista, mas acolhedor. Não responda por mim e não invente fatos sobre a minha vida.",
    },
  },
  {
    id: "estudos",
    rotulo: "Estudos",
    icone: BookOpen,
    textos: {
      papel: "Aja como um professor particular paciente, que explica com exemplos do dia a dia.",
      contexto:
        "Vou fazer a prova de um processo seletivo daqui a [número] dias. Ela cobra [conteúdo — ex.: porcentagem] e é aí que eu tenho mais dificuldade.",
      tarefa: "Me explique [conteúdo] do zero e depois me teste com 5 questões.",
      formato:
        "Explique em até 3 passos curtos, com um exemplo resolvido. Faça as questões uma por vez e só mostre a correção depois da minha resposta.",
      tom: "Fale de um jeito simples, sem termos difíceis. Se eu errar, me dê uma dica antes de mostrar a resposta certa.",
    },
  },
];

/** Comparação antes × depois (um caso diferente dos modelos, para mostrar o método em outro pedido). */
export const ANTES = "me ajuda a me apresentar na entrevista";

export const DEPOIS: Record<IdIngrediente, string> = {
  papel: "Aja como recrutadora de um programa de jovem aprendiz.",
  contexto:
    "Tenho [idade] anos, estou no [ano escolar], gosto de [seus interesses] e vou fazer minha primeira entrevista para [nome da vaga] na [nome da empresa].",
  tarefa: "Me ajude a responder “fale um pouco sobre você”.",
  formato: "Monte um roteiro de até 1 minuto em 3 partes: quem eu sou, o que eu estudo e faço, e por que quero essa vaga.",
  tom: "Linguagem natural, do jeito que um jovem fala. Use só o que eu contei e me pergunte o que faltar.",
};

/** Problemas típicos da resposta a um pedido vago (numerados como as marcas da resposta de exemplo). */
export const PROBLEMAS_ANTES = [
  { rotulo: "Frase pronta", texto: "soa decorada e qualquer candidato poderia dizer." },
  { rotulo: "Suposição", texto: "a IA inventou uma experiência que talvez você não tenha." },
  { rotulo: "Genérica", texto: "não fala da vaga, da empresa nem de você." },
] as const;

/**
 * Exemplo ilustrativo (escrito por nós) do tipo de resposta que um pedido vago costuma receber.
 * `problema` é o índice em PROBLEMAS_ANTES do trecho marcado.
 */
export const RESPOSTA_ANTES: ReadonlyArray<{ texto: string; problema?: number }> = [
  { texto: "“Olá, meu nome é [seu nome]. Sou uma pessoa " },
  { texto: "proativa, comunicativa e apaixonada por novos desafios", problema: 0 },
  { texto: ". " },
  { texto: "Tenho experiência com atendimento ao cliente", problema: 1 },
  { texto: " e " },
  { texto: "busco uma oportunidade para crescer e contribuir com a empresa", problema: 2 },
  { texto: ".”" },
];

/** Junta os trechos ligados, na ordem certa, no texto que vai para a área de transferência. */
export function montarPrompt(textos: Record<IdIngrediente, string>, ligados: ReadonlySet<IdIngrediente>): string {
  return ORDEM_INGREDIENTES.filter((id) => ligados.has(id))
    .map((id) => textos[id])
    .join("\n\n");
}
