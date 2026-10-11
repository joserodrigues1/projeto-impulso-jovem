/**
 * Biblioteca de prompts da landing (seção "prompts").
 * Convenção: tudo o que está entre [colchetes] é o que o jovem troca pela realidade dele —
 * o componente TextoPrompt realça esses trechos. O texto copiado é exatamente o `texto` abaixo.
 */

export type IdCategoria = "curriculo" | "entrevista" | "estudos" | "comunicacao" | "carreira" | "ingles";

export interface Categoria {
  id: IdCategoria;
  nome: string;
}

/** Ordem das abas (depois de "Todos"). */
export const CATEGORIAS: readonly Categoria[] = [
  { id: "curriculo", nome: "Currículo" },
  { id: "entrevista", nome: "Entrevista" },
  { id: "estudos", nome: "Estudos" },
  { id: "comunicacao", nome: "Comunicação" },
  { id: "carreira", nome: "Carreira" },
  { id: "ingles", nome: "Inglês" },
];

export interface PromptBiblioteca {
  id: string;
  categoria: IdCategoria;
  titulo: string;
  /** Uma linha: em que momento esse prompt ajuda. */
  quandoUsar: string;
  texto: string;
}

export const PROMPTS: readonly PromptBiblioteca[] = [
  // ───────────────────────────── Currículo ─────────────────────────────
  {
    id: "curriculo-do-zero",
    categoria: "curriculo",
    titulo: "Primeiro currículo, do zero",
    quandoUsar: "Você nunca trabalhou e não sabe o que colocar no papel.",
    texto:
      "Você é recrutador(a) especialista em vagas de jovem aprendiz e estágio no Brasil. Quero montar meu primeiro currículo para [jovem aprendiz na área administrativa], mas nunca trabalhei com carteira assinada. Antes de escrever, me faça até 8 perguntas, uma por vez, sobre escola, cursos, trabalho voluntário, projetos, bicos e tarefas que faço em casa ou na comunidade. Depois, monte um currículo de uma página com: objetivo, formação, cursos, experiências (inclusive informais), habilidades e idiomas. Use só o que eu contar — não invente nada.",
  },
  {
    id: "curriculo-sob-medida",
    categoria: "curriculo",
    titulo: "Currículo sob medida para a vaga",
    quandoUsar: "Antes de se candidatar, para mostrar que você combina com o que a vaga pede.",
    texto:
      "Vou colar a descrição de uma vaga e o meu currículo. Compare os dois e me diga: 1) quais requisitos eu já mostro; 2) quais eu tenho, mas não deixei claros; 3) quais palavras-chave da vaga eu deveria usar. Depois, reescreva o resumo e as experiências destacando o que combina com a vaga, sem inventar nada que não esteja no meu currículo.\n\nVaga: [cole a descrição da vaga]\nMeu currículo: [cole seu currículo]",
  },
  {
    id: "curriculo-conquistas",
    categoria: "curriculo",
    titulo: "De tarefa a conquista",
    quandoUsar: "Suas experiências parecem “simples demais” no currículo.",
    texto:
      "Reescreva estas atividades para o meu currículo, começando cada item com um verbo de ação (organizei, atendi, criei, ajudei a…): [liste o que você fazia, ex.: ajudava na loja da minha tia; organizei a festa junina da escola]. Para cada uma, me dê duas versões de no máximo uma linha, mostrando responsabilidade e resultado. Se faltar informação para mostrar resultado (quantidade, frequência, o que melhorou), me pergunte em vez de inventar.",
  },
  {
    id: "curriculo-resumo",
    categoria: "curriculo",
    titulo: "Resumo profissional",
    quandoUsar: "Para escrever as 3 ou 4 linhas que abrem o currículo.",
    texto:
      "Escreva 3 opções de resumo profissional para o topo do meu currículo, com no máximo 4 linhas cada. Tenho [idade] anos, estou [cursando o 2º ano do ensino médio], busco [minha primeira vaga de jovem aprendiz] e meus pontos fortes são [organização, facilidade com computador e paciência para atender pessoas]. Tom: simples, confiante e sem exageros. Evite clichês como “sou proativo e dinâmico” sem um exemplo que comprove.",
  },
  {
    id: "curriculo-olhar-recrutador",
    categoria: "curriculo",
    titulo: "Olhar de recrutador",
    quandoUsar: "Para receber uma crítica sincera antes de enviar.",
    texto:
      "Aja como recrutador(a) que recebe muitos currículos para vagas de [estágio em marketing]. Avalie o meu currículo com sinceridade: o que chama atenção nos primeiros segundos, o que está confuso ou sobrando e quais são os erros de português e de formatação. Termine com as 5 mudanças mais importantes, em ordem de prioridade.\n\nCurrículo: [cole seu currículo — sem CPF, endereço completo ou telefone]",
  },

  // ───────────────────────────── Entrevista ─────────────────────────────
  {
    id: "entrevista-simulado",
    categoria: "entrevista",
    titulo: "Simulado de entrevista",
    quandoUsar: "Para treinar respondendo uma pergunta por vez, como na vida real.",
    texto:
      "Vamos simular uma entrevista para a vaga de [jovem aprendiz no setor administrativo] na [nome da empresa]. Você é o(a) recrutador(a): faça uma pergunta por vez e espere a minha resposta. Depois de cada resposta, me dê um feedback curto — o que foi bom, o que melhorar e um exemplo de resposta mais forte. Comece pelas perguntas mais comuns e aumente a dificuldade aos poucos. No final, dê uma nota de 0 a 10 e diga o que eu devo treinar mais.",
  },
  {
    id: "entrevista-fale-sobre-voce",
    categoria: "entrevista",
    titulo: "“Fale sobre você”",
    quandoUsar: "Para preparar a pergunta que abre quase toda entrevista.",
    texto:
      "Me ajude a montar minha resposta para “Fale um pouco sobre você” em uma entrevista de [estágio em administração]. Ela deve durar cerca de 1 minuto falando e seguir esta ordem: quem eu sou hoje, o que já fiz (escola, cursos, projetos) e por que quero esta vaga. Sobre mim: [conte em poucas linhas]. Escreva do jeito que um jovem fala, sem decoreba, e marque onde fazer pausas. Depois, me dê uma versão de 30 segundos.",
  },
  {
    id: "entrevista-star",
    categoria: "entrevista",
    titulo: "Histórias no método STAR",
    quandoUsar: "Para perguntas do tipo “conte uma situação em que você…”.",
    texto:
      "Vou contar uma situação real que vivi: [ex.: organizei um trabalho em grupo em que ninguém se entendia]. Transforme essa história em uma resposta de entrevista usando o método STAR (Situação, Tarefa, Ação, Resultado), com até 1 minuto de fala e sem aumentar o que aconteceu. Depois, me diga para quais perguntas essa história serve (trabalho em equipe, conflitos, liderança…) e que detalhe eu poderia acrescentar para deixá-la mais forte.",
  },
  {
    id: "entrevista-perguntas-dificeis",
    categoria: "entrevista",
    titulo: "Perguntas difíceis sem travar",
    quandoUsar: "Para não ser pego(a) de surpresa por “qual é o seu maior defeito?”.",
    texto:
      "Liste as 8 perguntas mais difíceis em entrevistas para [jovem aprendiz], como “qual é o seu maior defeito?” e “por que devemos contratar você?”. Para cada uma, explique em uma frase o que o recrutador quer descobrir e me dê um roteiro de resposta honesta que eu possa adaptar à minha realidade: [ex.: é meu primeiro emprego, estudo à tarde e cuido do meu irmão mais novo].",
  },
  {
    id: "entrevista-dinamica",
    categoria: "entrevista",
    titulo: "Dinâmica de grupo",
    quandoUsar: "Quando o processo seletivo tem uma atividade em grupo.",
    texto:
      "Vou participar de uma dinâmica de grupo na seleção para [jovem aprendiz no varejo]. Explique os tipos de dinâmica mais comuns, o que os avaliadores costumam observar e como me destacar sem atropelar ninguém. Depois, simule uma dinâmica comigo por texto: você faz o papel dos outros participantes e do avaliador. No final, me dê um feedback sobre como eu me saí.",
  },

  // ───────────────────────────── Estudos ─────────────────────────────
  {
    id: "estudos-simulado-prova",
    categoria: "estudos",
    titulo: "Simulado da prova de seleção",
    quandoUsar: "A seleção tem prova e você quer treinar no formato de verdade.",
    texto:
      "Crie um simulado com 10 questões de múltipla escolha (A a D) no estilo de prova de seleção para [jovem aprendiz], misturando português, matemática básica e raciocínio lógico, da mais fácil para a mais difícil. Mostre uma questão por vez e espere a minha resposta. No final, me dê o gabarito comentado, minha pontuação e os 3 assuntos que eu mais preciso revisar. Se ajudar, este é o conteúdo do edital: [cole aqui].",
  },
  {
    id: "estudos-onde-errei",
    categoria: "estudos",
    titulo: "Onde foi que eu errei?",
    quandoUsar: "Você errou um exercício e não entendeu o porquê.",
    texto:
      "Resolvi este exercício e errei: [cole o enunciado e a sua resolução, passo a passo]. Não me dê a resposta logo de cara. Primeiro, me mostre em qual passo eu errei e por quê. Depois, me dê uma dica para eu tentar de novo. Só mostre a resolução completa se eu errar mais uma vez — e, aí, crie um exercício parecido para eu praticar.",
  },
  {
    id: "estudos-interpretacao",
    categoria: "estudos",
    titulo: "Interpretação de texto",
    quandoUsar: "Para treinar leitura, que aparece em muitas provas de seleção.",
    texto:
      "Vou colar um texto. Faça 5 perguntas de interpretação no estilo de prova de seleção: ideia principal, sentido de palavras no contexto, intenção do autor e o que dá para concluir. Espere as minhas respostas e corrija mostrando em que trecho do texto estava a pista.\n\nTexto: [cole aqui um texto ou uma notícia]",
  },
  {
    id: "estudos-atualidades",
    categoria: "estudos",
    titulo: "Atualidades com fonte confiável",
    quandoUsar: "Para estudar notícias sem cair em informação errada.",
    texto:
      "Vou colar uma notícia de um site confiável: [cole a notícia]. Resuma em até 5 linhas, explique o contexto como se eu não soubesse nada do assunto e liste os termos difíceis com o significado. Depois, crie 3 perguntas de múltipla escolha sobre ela. Use só as informações do texto — se precisar de algo de fora, avise que eu devo conferir.",
  },
  {
    id: "estudos-redacao",
    categoria: "estudos",
    titulo: "Treino de redação com correção",
    quandoUsar: "A seleção pede uma redação e você quer treinar antes do dia.",
    texto:
      "Quero treinar a redação da prova de seleção para [jovem aprendiz]. Me dê um tema no estilo dessas provas e espere eu escrever um texto de [20 a 25 linhas]. Depois, corrija sem reescrever por mim: diga se respondi ao tema e avalie organização dos parágrafos, argumentos e português, com uma nota de 0 a 10 para cada um. Aponte os 3 problemas mais importantes, explique como resolver e me peça para reescrever só os trechos com problema.",
  },

  // ───────────────────────────── Comunicação ─────────────────────────────
  {
    id: "comunicacao-email-candidatura",
    categoria: "comunicacao",
    titulo: "E-mail de candidatura",
    quandoUsar: "Para enviar o currículo sem parecer mensagem copiada.",
    texto:
      "Escreva um e-mail curto para me candidatar à vaga de [vaga] na [empresa]. Inclua: 3 opções de assunto, uma saudação, 2 ou 3 frases dizendo quem sou e por que me interessei por essa vaga, a menção ao currículo em anexo e uma despedida educada. Tom: profissional, mas natural para um jovem. Sobre mim: [2 ou 3 informações principais]. Sobre a empresa: [algo que você admira nela].",
  },
  {
    id: "comunicacao-whatsapp-rh",
    categoria: "comunicacao",
    titulo: "WhatsApp com o RH",
    quandoUsar: "Quando o contato do processo seletivo é pelo WhatsApp.",
    texto:
      "Reescreva esta mensagem de WhatsApp para o RH de uma empresa, deixando-a educada, clara e curta — sem gírias, sem abreviações e sem parecer um e-mail formal demais: [cole sua mensagem]. O objetivo é [confirmar presença na entrevista / remarcar um horário / tirar uma dúvida sobre documentos]. Me dê duas versões: uma mais curta e outra um pouco mais completa.",
  },
  {
    id: "comunicacao-linkedin",
    categoria: "comunicacao",
    titulo: "Perfil no LinkedIn",
    quandoUsar: "Para criar o título e o “Sobre” do seu perfil.",
    texto:
      "Me ajude a montar meu perfil no LinkedIn. Quero 3 opções de título (até 220 caracteres) e um texto para a seção “Sobre” com até 4 parágrafos curtos. Sou [estudante do 3º ano do ensino médio], tenho interesse em [área], já fiz [cursos, projetos ou voluntariado] e busco [minha primeira oportunidade de estágio]. Escreva em primeira pessoa, com tom positivo, sem exageros e sem inventar experiências.",
  },
  {
    id: "comunicacao-agradecimento",
    categoria: "comunicacao",
    titulo: "Agradecimento pós-entrevista",
    quandoUsar: "No mesmo dia da entrevista, para deixar uma boa lembrança.",
    texto:
      "Escreva uma mensagem curta de agradecimento para [nome de quem me entrevistou], depois da entrevista de hoje para [vaga]. Cite algo específico que conversamos: [ex.: o projeto de atendimento que ela comentou]. Reforce meu interesse em uma frase, sem parecer ansioso(a). Faça uma versão para e-mail e outra para WhatsApp.",
  },
  {
    id: "comunicacao-pedir-retorno",
    categoria: "comunicacao",
    titulo: "Pedir notícias do processo",
    quandoUsar: "O prazo passou e ninguém deu retorno.",
    texto:
      "Faz [10 dias] que fiz a entrevista para [vaga] na [empresa] e ainda não tive retorno. Escreva uma mensagem educada perguntando sobre o andamento do processo, sem cobrar e sem parecer ansioso(a), com no máximo 5 linhas. Escreva também uma segunda mensagem, para o caso de eu não ser aprovado(a), agradecendo e pedindo um feedback para eu melhorar.",
  },

  // ───────────────────────────── Carreira ─────────────────────────────
  {
    id: "carreira-descobrir-areas",
    categoria: "carreira",
    titulo: "Descobrir áreas que combinam comigo",
    quandoUsar: "Você quer trabalhar, mas ainda não sabe em quê.",
    texto:
      "Quero descobrir áreas de trabalho que combinam comigo. Faça 10 perguntas, uma por vez, sobre o que eu gosto de fazer, minhas matérias preferidas, como prefiro trabalhar (com pessoas, com números, com as mãos, criando coisas) e o que me incomoda. Depois, sugira 5 áreas de entrada para quem está começando: como é o dia a dia, o que estudar e que tipo de vaga procurar (jovem aprendiz, estágio ou primeiro emprego).",
  },
  {
    id: "carreira-aprendiz-estagio-clt",
    categoria: "carreira",
    titulo: "Aprendiz, estágio ou CLT?",
    quandoUsar: "Para entender qual tipo de vaga faz sentido para você agora.",
    texto:
      "Explique de forma simples as diferenças entre jovem aprendiz, estágio e emprego com carteira assinada no Brasil: quem pode participar, carga horária, se precisa estar estudando e quais direitos cada um tem. Minha situação: tenho [idade] anos e estou [no 2º ano do ensino médio / em um curso técnico / na faculdade]. No final, diga quais caminhos fazem sentido para mim e onde confirmar as regras em fontes oficiais.",
  },
  {
    id: "carreira-traduzir-vaga",
    categoria: "carreira",
    titulo: "Traduzir a descrição da vaga",
    quandoUsar: "A vaga está cheia de termos que você não conhece.",
    texto:
      "Traduza esta descrição de vaga para uma linguagem simples: [cole a vaga]. Explique o que a pessoa faz no dia a dia, o que é obrigatório e o que é só “desejável”, e o significado dos termos técnicos. Depois, diga quais das minhas experiências combinam com ela — [conte o que você já fez] — e que perguntas eu poderia fazer na entrevista.",
  },
  {
    id: "carreira-pesquisar-empresa",
    categoria: "carreira",
    titulo: "Pesquisar a empresa",
    quandoUsar: "Antes da entrevista, para mostrar que você se preparou.",
    texto:
      "Vou ter uma entrevista na [nome da empresa]. Monte um roteiro de 30 minutos para eu pesquisar sobre ela: por onde começar, onde procurar (site oficial, redes sociais, notícias) e o que anotar — o que a empresa faz, seus valores, produtos e novidades. Se você não tiver certeza de alguma informação sobre a empresa, diga claramente que não sabe, em vez de chutar.",
  },
  {
    id: "carreira-plano-90-dias",
    categoria: "carreira",
    titulo: "Plano de 90 dias",
    quandoUsar: "Para trocar o “quero trabalhar” por passos concretos.",
    texto:
      "Meu objetivo é conseguir [minha primeira vaga de jovem aprendiz] nos próximos 3 meses. Hoje eu [ex.: estudo de manhã, ainda não tenho currículo e nunca fiz entrevista]. Monte um plano semana a semana, com tarefas pequenas e práticas: currículo, cursos gratuitos, onde procurar vagas, treino de entrevista e contatos. Termine com um checklist para eu marcar o que já fiz.",
  },

  // ───────────────────────────── Inglês ─────────────────────────────
  {
    id: "ingles-conversa",
    categoria: "ingles",
    titulo: "Conversa para destravar",
    quandoUsar: "Para praticar conversação sem vergonha de errar.",
    texto:
      "Let's practice English! Converse comigo em inglês sobre [meus hobbies / minha rotina / meus planos], no nível [básico]. Faça uma pergunta por vez, com frases curtas. Quando eu errar, mostre a forma correta entre parênteses e explique o erro em português, em uma linha. A cada 5 mensagens, me ensine 3 expressões novas para eu usar na conversa.",
  },
  {
    id: "ingles-tell-me-about-yourself",
    categoria: "ingles",
    titulo: "“Tell me about yourself”",
    quandoUsar: "A vaga pede inglês e você quer chegar preparado(a).",
    texto:
      "Me ajude a preparar uma resposta curta em inglês para “Tell me about yourself” em uma entrevista de [estágio]. Meu nível é [básico / intermediário]. Sobre mim: [conte em português]. Use frases simples que eu consiga falar com naturalidade, mostre a pronúncia aproximada das palavras difíceis e, depois, faça 3 perguntas de continuação que um recrutador poderia fazer — uma por vez.",
  },
  {
    id: "ingles-vocabulario",
    categoria: "ingles",
    titulo: "Vocabulário da área",
    quandoUsar: "Para aprender as palavras que você vai ouvir no trabalho.",
    texto:
      "Liste 20 palavras e expressões em inglês muito usadas na área de [administração / tecnologia / atendimento ao cliente], com tradução, pronúncia aproximada e uma frase de exemplo. Depois, me teste com 10 delas, uma por vez, misturando inglês → português e português → inglês, e me diga quantas eu acertei.",
  },
  {
    id: "ingles-corrigir-texto",
    categoria: "ingles",
    titulo: "Corrija meu inglês",
    quandoUsar: "Você escreveu algo em inglês e quer saber se está certo.",
    texto:
      "Corrija este texto que escrevi em inglês: [cole seu texto]. Mostre primeiro a versão corrigida. Depois, faça uma lista com cada erro, a correção e a regra explicada em português, de um jeito simples. Não mude o sentido e não deixe o texto mais difícil do que o meu nível. No final, me dê 3 frases parecidas para eu praticar o que errei.",
  },
  {
    id: "ingles-nivel",
    categoria: "ingles",
    titulo: "Qual é o meu nível?",
    quandoUsar: "Para descrever seu inglês no currículo com honestidade.",
    texto:
      "Faça um teste de nivelamento de inglês com 12 questões de múltipla escolha, da mais fácil para a mais difícil (gramática, vocabulário e interpretação), uma por vez. No final, diga meu nível aproximado (básico, intermediário ou avançado), como descrever esse nível no currículo com honestidade e por onde eu devo começar a estudar.",
  },
];
