import { BadgeCheck, Eye, Quote, Scale, ShieldCheck, TriangleAlert, type LucideIcon } from "lucide-react";

/** Um cuidado ao usar IA no processo seletivo: o que é, o que fazer e o que evitar. */
export interface Combinado {
  icone: LucideIcon;
  titulo: string;
  descricao: string;
  faca: string;
  evite: string;
}

export const COMBINADOS: readonly Combinado[] = [
  {
    icone: TriangleAlert,
    titulo: "A IA erra — e com toda a confiança",
    descricao: "Ela pode inventar datas, números, leis e até informações sobre empresas, sempre com tom de certeza.",
    faca: "Confira o que for importante em fontes oficiais: o site da empresa, o edital da vaga, sites do governo.",
    evite: "Copiar dados, prazos ou regras sem checar — principalmente sobre a empresa da entrevista.",
  },
  {
    icone: BadgeCheck,
    titulo: "Verdade acima de tudo",
    descricao:
      "Quem recruta percebe quando o currículo não combina com a pessoa — e vai perguntar sobre tudo o que estiver escrito.",
    faca: "Use a IA para dizer melhor o que é verdade: o trabalho voluntário, o projeto da escola, a ajuda no negócio da família.",
    evite: "Inventar experiências, cursos, idiomas ou habilidades que você não tem.",
  },
  {
    icone: ShieldCheck,
    titulo: "Seus dados são seus",
    descricao: "O que você cola numa conversa pode ficar salvo nos servidores da ferramenta.",
    faca: "Troque dados pessoais por marcadores, como [meu nome] e [minha cidade], e preencha depois.",
    evite: "Colar CPF, RG, senhas, endereço completo, dados bancários ou fotos de documentos.",
  },
  {
    icone: Quote,
    titulo: "Mantenha a sua voz",
    descricao: "Texto de IA sem ajuste costuma soar genérico. Quem recruta quer conhecer você, não um robô.",
    faca: "Leia em voz alta e troque as palavras que você não usaria. Peça: “deixe mais simples, do meu jeito”.",
    evite: "Enviar o texto exatamente como veio, cheio de termos difíceis e frases de efeito.",
  },
  {
    icone: Scale,
    titulo: "Respeite as regras do jogo",
    descricao:
      "Usar IA para estudar e se preparar é ótimo. Usar escondido onde não é permitido pode tirar você do processo.",
    faca: "Na dúvida, pergunte se pode usar IA em testes online, desafios e trabalhos.",
    evite: "Usar IA durante prova, teste ou entrevista ao vivo quando isso não for permitido.",
  },
  {
    icone: Eye,
    titulo: "Olhar crítico e respeito",
    descricao: "A IA aprende com textos da internet e pode repetir preconceitos e estereótipos.",
    faca: "Questione respostas que generalizam pessoas e peça outros pontos de vista.",
    evite: "Aceitar conselhos que diminuem você ou outras pessoas por gênero, cor, origem, idade, religião ou deficiência.",
  },
];

/** Checklist rápido antes de usar qualquer texto da IA. */
export const CHECKLIST: readonly string[] = [
  "É verdade sobre mim?",
  "Conferi datas, números e nomes?",
  "Parece comigo falando?",
  "Tirei meus dados pessoais?",
  "Posso usar IA nesta etapa?",
];
