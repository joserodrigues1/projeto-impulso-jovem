import Link from "next/link";

export interface Pergunta {
  id: string;
  pergunta: string;
  /** Resposta exibida na página (pode ter links). */
  resposta: React.ReactNode;
  /** A mesma resposta em texto puro, para os dados estruturados (JSON-LD). */
  respostaTexto: string;
}

const classeLink =
  "font-semibold text-marca-forte underline decoration-marca/30 underline-offset-4 transition-colors hover:decoration-marca dark:text-marca-clara dark:decoration-marca-clara/40";

/** Perguntas frequentes da landing — as respostas descrevem só o que a plataforma faz hoje. */
export const PERGUNTAS: Pergunta[] = [
  {
    id: "qual-ia",
    pergunta: "Qual IA eu posso usar?",
    resposta: (
      <p>
        Qualquer assistente de IA de conversa serve — muitos têm versão gratuita, como o ChatGPT, o Gemini e o
        Copilot. As dicas e os prompts deste guia funcionam em todos eles: copie, troque o que está entre{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]">[colchetes]</code> pelos seus dados e
        ajuste a conversa até a resposta ficar boa.
      </p>
    ),
    respostaTexto:
      "Qualquer assistente de IA de conversa serve — muitos têm versão gratuita, como o ChatGPT, o Gemini e o Copilot. As dicas e os prompts deste guia funcionam em todos eles: copie, troque o que está entre [colchetes] pelos seus dados e ajuste a conversa até a resposta ficar boa.",
  },
  {
    id: "e-errado",
    pergunta: "É errado usar IA para fazer o currículo?",
    resposta: (
      <p>
        Não, desde que tudo seja verdade. A IA ajuda a organizar suas ideias, escolher palavras melhores e deixar o
        texto claro. O que não pode é inventar cursos, experiências ou habilidades que você não tem — isso aparece na
        entrevista. Revise tudo e deixe o texto com a sua cara.
      </p>
    ),
    respostaTexto:
      "Não, desde que tudo seja verdade. A IA ajuda a organizar suas ideias, escolher palavras melhores e deixar o texto claro. O que não pode é inventar cursos, experiências ou habilidades que você não tem — isso aparece na entrevista. Revise tudo e deixe o texto com a sua cara.",
  },
  {
    id: "ia-inventa",
    pergunta: "A IA pode inventar informações?",
    resposta: (
      <p>
        Pode, sim. Às vezes ela responde com segurança algo que está errado ou desatualizado. Por isso, confira datas,
        nomes de empresas e informações importantes em fontes confiáveis e nunca envie um texto sem ler antes. Veja
        mais em{" "}
        <a href="#cuidados" className={classeLink}>
          cuidados ao usar IA
        </a>
        .
      </p>
    ),
    respostaTexto:
      "Pode, sim. Às vezes ela responde com segurança algo que está errado ou desatualizado. Por isso, confira datas, nomes de empresas e informações importantes em fontes confiáveis e nunca envie um texto sem ler antes.",
  },
  {
    id: "simulacao-whatsapp",
    pergunta: "Como funciona a simulação de entrevista no WhatsApp?",
    resposta: (
      <p>
        Você cria sua conta com o seu número de WhatsApp e manda uma mensagem para a Helena, a recrutadora virtual da
        plataforma. Ela pergunta para qual vaga você quer treinar e faz a entrevista como numa seleção de verdade. Você
        responde por texto ou por áudio e, quando quiser terminar, é só digitar{" "}
        <strong className="font-semibold text-foreground">encerrar</strong>.
      </p>
    ),
    respostaTexto:
      "Você cria sua conta com o seu número de WhatsApp e manda uma mensagem para a Helena, a recrutadora virtual da plataforma. Ela pergunta para qual vaga você quer treinar e faz a entrevista como numa seleção de verdade. Você responde por texto ou por áudio e, quando quiser terminar, é só digitar encerrar.",
  },
  {
    id: "nota",
    pergunta: "Eu recebo uma nota?",
    resposta: (
      <p>
        Sim. Depois que você encerra, a conversa vira um relatório no seu painel, com nota de 0 a 10, avaliação por
        competência, pontos fortes, pontos de melhoria e um plano de ação com os próximos passos. A nota é um retrato
        daquele treino, não um julgamento sobre você — o objetivo é evoluir de uma simulação para a outra.
      </p>
    ),
    respostaTexto:
      "Sim. Depois que você encerra, a conversa vira um relatório no seu painel, com nota de 0 a 10, avaliação por competência, pontos fortes, pontos de melhoria e um plano de ação com os próximos passos. A nota é um retrato daquele treino, não um julgamento sobre você — o objetivo é evoluir de uma simulação para a outra.",
  },
  {
    id: "dados-seguros",
    pergunta: "Meus dados ficam seguros?",
    resposta: (
      <p>
        Seus dados são usados para a plataforma funcionar e para proteger sua conta — não vendemos seus dados nem os
        usamos para publicidade. O áudio que você grava para o currículo não fica guardado na plataforma: ele é enviado
        ao serviço de IA só para ser transcrito, e guardamos apenas o currículo que resulta dele. A foto do currículo
        fica só no seu aparelho. Os detalhes estão na{" "}
        <Link href="/privacidade" className={classeLink}>
          Política de privacidade
        </Link>
        .
      </p>
    ),
    respostaTexto:
      "Seus dados são usados para a plataforma funcionar e para proteger sua conta — não vendemos seus dados nem os usamos para publicidade. O áudio que você grava para o currículo não fica guardado na plataforma: ele é enviado ao serviço de IA só para ser transcrito, e guardamos apenas o currículo que resulta dele. A foto do currículo fica só no seu aparelho. Os detalhes estão na Política de privacidade.",
  },
  {
    id: "celular",
    pergunta: "Funciona no celular?",
    resposta: (
      <p>
        Funciona. Dá para usar tudo pelo celular: o guia, o currículo (inclusive gravando o áudio) e a simulação, que
        acontece no próprio WhatsApp. Para salvar o currículo, toque em Baixar PDF e escolha “Salvar como PDF”.
      </p>
    ),
    respostaTexto:
      "Funciona. Dá para usar tudo pelo celular: o guia, o currículo (inclusive gravando o áudio) e a simulação, que acontece no próprio WhatsApp. Para salvar o currículo, toque em Baixar PDF e escolha “Salvar como PDF”.",
  },
  {
    id: "pagar",
    pergunta: "Preciso pagar para criar a conta?",
    resposta: (
      <p>
        Não. O cadastro é gratuito e não pede cartão nem forma de pagamento. E o guia desta página é aberto: dá para
        usar as dicas e os prompts sem criar conta.
      </p>
    ),
    respostaTexto:
      "Não. O cadastro é gratuito e não pede cartão nem forma de pagamento. E o guia desta página é aberto: dá para usar as dicas e os prompts sem criar conta.",
  },
  {
    id: "menor-de-idade",
    pergunta: "Sou menor de idade. Posso usar?",
    resposta: (
      <p>
        A plataforma é pensada para jovens de 14 a 24 anos. Se você tem menos de 18, converse com seu pai, mãe ou
        responsável antes de criar a conta. As regras completas estão nos{" "}
        <Link href="/termos" className={classeLink}>
          Termos de uso
        </Link>{" "}
        e na{" "}
        <Link href="/privacidade" className={classeLink}>
          Política de privacidade
        </Link>
        .
      </p>
    ),
    respostaTexto:
      "A plataforma é pensada para jovens de 14 a 24 anos. Se você tem menos de 18, converse com seu pai, mãe ou responsável antes de criar a conta. As regras completas estão nos Termos de uso e na Política de privacidade.",
  },
];
