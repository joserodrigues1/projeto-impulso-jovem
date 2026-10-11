import {
  CalendarCheck,
  FileUser,
  MessagesSquare,
  NotebookPen,
  ScanSearch,
  Send,
  type LucideIcon,
} from "lucide-react";

/** Uma etapa do processo seletivo e como a IA ajuda nela. */
export interface Etapa {
  /** id do painel da etapa — também serve de link direto (ex.: "/#etapa-vaga" abre essa etapa). */
  id: string;
  titulo: string;
  /** Rótulo curto para a lista lateral. */
  tituloCurto: string;
  resumo: string;
  icone: LucideIcon;
  /** O que a IA pode fazer nesta etapa (2–3 itens concretos). */
  ajudas: string[];
  /** Prompt pronto: papel + contexto + tarefa + formato + limites. [Colchetes] = o que o jovem troca. */
  prompt: string;
  cuidado: string;
  /** Mostra o convite para a simulação de entrevista da plataforma. */
  comPlataforma?: boolean;
}

export const ETAPAS: readonly Etapa[] = [
  {
    id: "etapa-vaga",
    titulo: "Entender a vaga e a empresa",
    tituloCurto: "Entender a vaga",
    resumo: "Antes de se candidatar, descubra o que a vaga pede de verdade e se ela combina com você.",
    icone: ScanSearch,
    ajudas: [
      "Traduz a descrição da vaga para uma linguagem simples: o que você faria no dia a dia.",
      "Separa o que é obrigatório do que é só “desejável”, para você não desistir antes da hora.",
      "Aponta as competências que a vaga valoriza e perguntas que podem aparecer na entrevista.",
    ],
    prompt: `Aja como uma recrutadora experiente em vagas de jovem aprendiz e estágio no Brasil. Vou colar abaixo a descrição de uma vaga de [nome da vaga] na empresa [nome da empresa].

Me explique em linguagem simples:
1. O que a pessoa faz no dia a dia nessa função.
2. Quais requisitos são obrigatórios e quais são só desejáveis.
3. As 5 competências que essa vaga mais valoriza.
4. 3 perguntas que provavelmente vão me fazer na entrevista.
5. O que vale eu pesquisar sobre a empresa antes de me candidatar.

Responda em tópicos curtos. Se alguma informação não estiver na descrição, diga que não está — não invente.

Descrição da vaga: [cole aqui o texto da vaga]`,
    cuidado:
      "A IA pode misturar ou inventar informações sobre empresas. Confira missão, valores e notícias no site oficial e nas redes da própria empresa.",
  },
  {
    id: "etapa-curriculo",
    titulo: "Currículo sob medida",
    tituloCurto: "Currículo sob medida",
    resumo: "Mesmo sem experiência formal, você tem muito para mostrar. A IA ajuda a contar isso do jeito certo.",
    icone: FileUser,
    ajudas: [
      "Transforma o que você já viveu (cursos, voluntariado, projetos da escola, ajudar no negócio da família) em experiência que conta.",
      "Reescreve suas frases começando com verbos de ação, de forma clara e objetiva.",
      "Compara seu currículo com a vaga e mostra o que destacar primeiro.",
    ],
    prompt: `Aja como especialista em currículos para primeiro emprego. Tenho [idade] anos, estou no [ano escolar ou curso] e quero me candidatar à vaga de [nome da vaga]. Nunca tive emprego formal, mas já fiz: [suas atividades — ex.: curso de informática, voluntariado, trabalho em grupo da escola, ajudo no comércio da família].

Com base nisso e na descrição da vaga abaixo, escreva:
1. Um objetivo profissional de até 2 linhas.
2. A seção "Experiências e atividades", com 3 a 5 tópicos começando com verbo de ação.
3. As 5 habilidades que mais combinam com a vaga.

Use só as informações que eu dei. Se faltar algo importante, me faça perguntas antes de escrever.

Descrição da vaga: [cole aqui o texto da vaga]`,
    cuidado:
      "Nunca deixe a IA inventar experiência, curso ou nota. Tudo o que está no seu currículo pode virar pergunta na entrevista.",
  },
  {
    id: "etapa-mensagem",
    titulo: "Mensagem de candidatura",
    tituloCurto: "Mensagem de candidatura",
    resumo: "E-mail, LinkedIn ou WhatsApp: a primeira impressão chega antes de você.",
    icone: Send,
    ajudas: [
      "Escreve uma mensagem curta e educada para enviar junto com o currículo.",
      "Sugere o assunto do e-mail e adapta o texto para cada canal.",
      "Revisa o português sem tirar o seu jeito de falar.",
    ],
    prompt: `Aja como um recrutador que recebe muitas mensagens de candidatos e sabe o que chama atenção. Me ajude a escrever uma mensagem de candidatura para a vaga de [nome da vaga] na [nome da empresa], que vou enviar por [e-mail / LinkedIn / WhatsApp].

Sobre mim: [2 ou 3 frases — o que você estuda, o que sabe fazer e por que quer essa vaga].

A mensagem deve ter no máximo 6 linhas: cumprimento, por que tenho interesse, um ponto forte meu ligado à vaga e um fechamento avisando que o currículo vai em anexo. Tom educado e natural, sem frases feitas como "venho por meio desta". Se for e-mail, sugira também o assunto. Me dê 2 versões diferentes.`,
    cuidado:
      "Leia em voz alta antes de enviar. Se não parece você falando, ajuste: texto genérico de IA chama atenção pelo motivo errado.",
  },
  {
    id: "etapa-provas",
    titulo: "Testes e provas",
    tituloCurto: "Testes e provas",
    resumo:
      "Se o processo tiver prova de português, matemática ou raciocínio lógico, a IA vira sua professora particular.",
    icone: NotebookPen,
    ajudas: [
      "Monta um plano de estudos que cabe na sua rotina até o dia da prova.",
      "Cria questões de treino e corrige explicando cada alternativa.",
      "Explica de outro jeito o conteúdo que não entrou na cabeça.",
    ],
    prompt: `Aja como um professor particular paciente. Vou fazer a prova do processo seletivo de [programa ou empresa] daqui a [número] dias. Ela cobra [conteúdos — ex.: português, matemática básica e raciocínio lógico], tenho [tempo] por dia para estudar e minha maior dificuldade é [assunto].

1. Monte um plano de estudos dia a dia até a prova, em formato de lista.
2. Depois, me passe 5 questões de múltipla escolha sobre [assunto], no nível de prova de jovem aprendiz, uma de cada vez.

Espere minha resposta antes de mostrar a correção e explique por que cada alternativa está certa ou errada.`,
    cuidado:
      "Use a IA para treinar antes, nunca durante a prova. E confira as respostas: a IA também erra conta.",
  },
  {
    id: "etapa-entrevista",
    titulo: "Entrevista",
    tituloCurto: "Entrevista",
    resumo: "Quanto mais você treina, mais natural fica. A IA faz o papel de recrutadora quantas vezes você quiser.",
    icone: MessagesSquare,
    ajudas: [
      "Simula a entrevista com perguntas comuns e situações do dia a dia.",
      "Dá retorno sobre suas respostas e ajuda a organizá-las em situação → ação → resultado.",
      "Sugere perguntas inteligentes para você fazer no final.",
    ],
    prompt: `Aja como recrutadora de RH entrevistando candidatos para a vaga de [nome da vaga] na [nome da empresa]. Faça uma simulação de entrevista comigo, com 6 perguntas: algumas sobre mim, algumas sobre a vaga e algumas sobre situações do dia a dia (ex.: "conte de uma vez em que você…").

Faça uma pergunta por vez e espere minha resposta. Depois de cada resposta, me dê um retorno curto: o que foi bom, o que melhorar e um exemplo de resposta mais forte no formato situação → ação → resultado, sem inventar fatos sobre mim.

No final, me dê uma nota de 0 a 10 e os 3 pontos que eu mais preciso treinar.`,
    cuidado: "Treine ideias, não decore textos prontos. Na entrevista vale a sua história, contada do seu jeito.",
    comPlataforma: true,
  },
  {
    id: "etapa-depois",
    titulo: "Depois da entrevista",
    tituloCurto: "Depois da entrevista",
    resumo: "O processo não acaba quando a entrevista termina. Agradecer e refletir também contam.",
    icone: CalendarCheck,
    ajudas: [
      "Escreve uma mensagem de agradecimento curta e sincera.",
      "Ajuda você a refletir sobre o que deu certo e o que treinar para a próxima.",
      "Ajuda a responder um “não” com elegância e a pedir um retorno.",
    ],
    prompt: `Aja como uma mentora de carreira para jovens. Fiz uma entrevista para a vaga de [nome da vaga] na [nome da empresa], com [nome de quem me entrevistou, se souber]. Conversamos sobre [1 ou 2 assuntos marcantes da entrevista].

1. Escreva uma mensagem de agradecimento de até 4 linhas para enviar por [e-mail / WhatsApp], retomando um desses assuntos e reforçando meu interesse, sem exagero.
2. Depois, me faça 5 perguntas, uma de cada vez, para eu refletir sobre como fui. Com as minhas respostas, monte uma lista do que repetir e do que treinar na próxima entrevista.`,
    cuidado:
      "Mande o agradecimento uma vez só e não pressione por resposta. Se vier um “não”, agradeça e peça um retorno: isso também é aprendizado.",
  },
];
