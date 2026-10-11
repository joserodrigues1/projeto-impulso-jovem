import { BookOpen, FileUser, MessagesSquare, type LucideIcon } from "lucide-react";

/** Um exemplo de conversa com uma IA, mostrado na demonstração da abertura. */
export interface Cenario {
  id: "entrevista" | "curriculo" | "estudos";
  /** Rótulo do chip que escolhe o exemplo. */
  rotulo: string;
  icone: LucideIcon;
  /** O que o jovem pede (é "digitado" na tela). */
  pedido: string;
  /** Primeira linha da resposta da IA. */
  abertura: string;
  /** Itens da resposta, que aparecem em sequência. */
  itens: string[];
}

/** Exemplos ilustrativos (não são respostas reais de nenhuma IA específica). */
export const CENARIOS: readonly Cenario[] = [
  {
    id: "entrevista",
    rotulo: "Entrevista",
    icone: MessagesSquare,
    pedido:
      "Aja como recrutadora. Sexta é minha primeira entrevista para jovem aprendiz administrativo. Faça uma pergunta por vez e me dê um retorno sobre cada resposta.",
    abertura: "Combinado! Vamos treinar como se fosse de verdade.",
    itens: [
      "Pergunta 1: me conte um pouco sobre você.",
      "Dica: fale do que você estuda, do que gosta de fazer e por que quer essa vaga.",
      "Responda do seu jeito. Depois eu digo o que foi bem e o que dá para melhorar.",
    ],
  },
  {
    id: "curriculo",
    rotulo: "Currículo",
    icone: FileUser,
    pedido:
      "Tenho 17 anos, nunca trabalhei, mas fiz curso de informática e ajudo no comércio da minha família. Como coloco isso no currículo para uma vaga de jovem aprendiz?",
    abertura: "Isso conta, e muito! Veja como organizar:",
    itens: [
      "O comércio da família entra em “Experiências e atividades”, mesmo sem carteira assinada.",
      "O curso vai em “Formação complementar”, com o nome da escola e o ano.",
      "Me conta o que você faz lá no dia a dia? Aí eu escrevo os tópicos com verbos de ação.",
    ],
  },
  {
    id: "estudos",
    rotulo: "Estudos",
    icone: BookOpen,
    pedido:
      "A prova do processo seletivo cobra raciocínio lógico e é daqui a 10 dias. Tenho 1 hora por dia. Monta um plano e me testa com uma questão por vez?",
    abertura: "Fechado! Seu plano em 3 fases:",
    itens: [
      "Dias 1 a 4: sequências, proporção e porcentagem.",
      "Dias 5 a 8: questões de treino, com correção comentada.",
      "Dias 9 e 10: revisão leve e um simulado com tempo.",
      "Primeira questão: qual é o próximo número da sequência 2, 6, 12, 20…?",
    ],
  },
];
