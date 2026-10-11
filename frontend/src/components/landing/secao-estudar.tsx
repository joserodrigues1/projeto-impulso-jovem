import {
  Brain,
  CalendarDays,
  Languages,
  Layers,
  Lightbulb,
  ListChecks,
  PenLine,
  ScrollText,
  Sparkles,
} from "lucide-react";
import { BlocoTecnica } from "@/components/landing/estudar/bloco-tecnica";
import { DemoFlashcards } from "@/components/landing/estudar/demo-flashcards";
import { DemoQuiz } from "@/components/landing/estudar/demo-quiz";
import { PlanoRotina } from "@/components/landing/estudar/plano-rotina";
import { TituloSecao } from "@/components/landing/titulo-secao";
import { Revelar } from "@/components/movimento";

/** Hábitos que deixam qualquer pedido de estudo melhor (aparecem ao lado do título). */
const HABITOS = [
  { titulo: "Diga seu nível e o objetivo", texto: "“Estou no 1º ano e tenho prova de seleção em 3 semanas.”" },
  { titulo: "Peça uma coisa por vez", texto: "Uma explicação, depois um exercício, depois a correção." },
  { titulo: "Não peça a resposta pronta", texto: "Peça dicas e correção: quem precisa aprender é você." },
] as const;

/** Do texto longo às perguntas (ilustração do bloco "Resuma e me pergunte"). */
const ETAPAS_RESUMO = [
  { titulo: "Texto longo", texto: "você cola", cor: "bg-marca" },
  { titulo: "5 tópicos", texto: "a IA resume", cor: "bg-ciano" },
  { titulo: "3 perguntas", texto: "você responde", cor: "bg-lima" },
] as const;

/** Seção 5 da landing: a IA como professora particular, em uma grade "bento" de técnicas. */
export function SecaoEstudar() {
  return (
    <section
      id="estudar"
      aria-labelledby="titulo-estudar"
      className="relative isolate overflow-x-clip bg-gradient-to-b from-background via-marca-suave/50 to-background py-24 md:py-32 dark:via-tinta-2/70"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-12">
          <TituloSecao
            id="titulo-estudar"
            alinhamento="esquerda"
            className="lg:col-span-7"
            sobretitulo="Estudar com IA"
            titulo={
              <>
                Transforme a IA em{" "}
                <span className="texto-gradiente-claro dark:texto-gradiente">professora particular</span>
              </>
            }
            descricao="Ela não cansa de explicar, cria exercícios na hora e corrige sem julgar. Oito técnicas para se preparar para provas de seleção, escrever melhor e destravar o inglês."
          />
          <Revelar atraso={0.12} className="lg:col-span-5">
            <div className="rounded-3xl border bg-card/70 p-5 shadow-sm backdrop-blur sm:p-6">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles aria-hidden="true" className="size-4 text-marca-forte dark:text-marca-clara" />
                Três hábitos que melhoram qualquer pedido
              </p>
              <ol className="mt-4 space-y-3.5">
                {HABITOS.map((habito, i) => (
                  <li key={habito.titulo} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="grid size-6 shrink-0 place-items-center rounded-full bg-lima font-mono text-xs font-semibold text-tinta"
                    >
                      {i + 1}
                    </span>
                    <p className="text-sm leading-relaxed">
                      <span className="font-semibold">{habito.titulo}.</span>{" "}
                      <span className="text-muted-foreground">{habito.texto}</span>
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </Revelar>
        </div>

        {/* Grade bento: 12 colunas no desktop, 2 no tablet, 1 no celular */}
        <div className="mt-14 grid gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-12">
          <Revelar quanto={0.1} className="md:col-span-2 lg:col-span-7 lg:row-span-2">
            <BlocoTecnica
              destaque
              crescer
              icone={ListChecks}
              titulo="Me teste"
              porque="Tentar lembrar a resposta — e até errar — fixa muito mais do que reler o caderno. Peça questões no estilo da prova, com a correção explicada."
              prompt="Me faça 5 questões de múltipla escolha sobre [porcentagem], uma por vez, no estilo de prova de seleção. Espere minha resposta e corrija explicando o porquê."
            >
              <DemoQuiz />
            </BlocoTecnica>
          </Revelar>

          <Revelar atraso={0.08} className="lg:col-span-5">
            <BlocoTecnica
              icone={Lightbulb}
              titulo="Explique de outro jeito"
              porque="Se a explicação do livro não entrou, peça outra — quantas vezes quiser. Mudar o exemplo muda tudo."
              prompt="Explique [juros simples] como se eu tivesse 15 anos, com um exemplo do dia a dia. Depois, me faça uma pergunta para ver se eu entendi."
            >
              <ul aria-label="Jeitos de pedir outra explicação" className="flex flex-wrap gap-2">
                {["como se eu tivesse 15 anos", "com exemplo de futebol", "em 3 passos", "com um desenho em texto"].map(
                  (jeito) => (
                    <li
                      key={jeito}
                      className="rounded-full border border-marca/20 bg-marca/5 px-3 py-1.5 text-[13px] font-medium text-marca-forte dark:bg-marca/15 dark:text-marca-clara"
                    >
                      “…{jeito}”
                    </li>
                  ),
                )}
              </ul>
            </BlocoTecnica>
          </Revelar>

          <Revelar atraso={0.12} className="lg:col-span-5">
            <BlocoTecnica
              icone={Layers}
              titulo="Flashcards"
              porque="Revisar um pouco a cada dia, voltando no que você errou, ajuda a memória a guardar por mais tempo. A IA transforma sua anotação em cartões."
              prompt="Transforme este conteúdo em 15 flashcards de pergunta e resposta curtas: [cole sua anotação]. Depois, me pergunte um por vez e repita os que eu errar."
            >
              <DemoFlashcards />
            </BlocoTecnica>
          </Revelar>

          <Revelar className="lg:col-span-4">
            <BlocoTecnica
              icone={PenLine}
              titulo="Corrija minha redação"
              porque="Ver o erro explicado ensina a regra — e você para de repeti-lo. Peça para a IA apontar, não para reescrever por você."
              prompt="Corrija minha redação sem reescrever por mim: aponte erros de português, de coesão e de argumentação, explique cada um e dê uma nota de 0 a 10. Texto: [cole aqui]"
            >
              <div className="rounded-2xl border bg-background/70 p-4 text-sm leading-relaxed">
                <p>
                  Estudei muito, <del className="text-destructive decoration-2">mais</del>{" "}
                  <ins className="rounded bg-lima/60 px-1 font-semibold text-tinta no-underline dark:bg-lima">mas</ins>{" "}
                  não desisti.
                </p>
                <p className="mt-2 text-[13px] text-muted-foreground">
                  “Mas” indica oposição; “mais” indica quantidade.
                </p>
              </div>
            </BlocoTecnica>
          </Revelar>

          <Revelar atraso={0.06} className="lg:col-span-4">
            <BlocoTecnica
              icone={Languages}
              titulo="Converse em inglês"
              porque="Conversar sem plateia tira a vergonha de errar. A IA corrige na hora e se adapta ao seu nível."
              prompt="Let's talk! Converse comigo em inglês sobre [futebol], no nível [básico]. Corrija meus erros entre parênteses, com uma explicação curta em português."
            >
              <div className="space-y-2 text-sm" aria-label="Exemplo de conversa em inglês" role="group">
                <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-marca px-3.5 py-2 text-white">
                  I have 17 years.
                </p>
                <p className="w-fit max-w-[92%] rounded-2xl rounded-tl-md border bg-background/80 px-3.5 py-2 leading-relaxed">
                  Quase! Idade em inglês usa o verbo <em>to be</em>: <strong>I am 17 years old.</strong>
                </p>
              </div>
            </BlocoTecnica>
          </Revelar>

          <Revelar atraso={0.12} className="lg:col-span-4">
            <BlocoTecnica
              icone={ScrollText}
              titulo="Resuma e me pergunte"
              porque="Um resumo em tópicos mostra o essencial de um texto longo. Responder perguntas sobre ele é um ótimo treino de interpretação."
              prompt="Resuma este texto em 5 tópicos e depois me faça 3 perguntas para ver se eu entendi. Use só o que está no texto: [cole o texto]"
            >
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="absolute top-3 bottom-3 left-[0.6875rem] w-px bg-gradient-to-b from-marca/50 via-ciano/60 to-lima"
                />
                <ol aria-label="Do texto às perguntas" className="relative space-y-3">
                  {ETAPAS_RESUMO.map((etapa) => (
                    <li key={etapa.titulo} className="relative flex items-center gap-3">
                      <span aria-hidden="true" className={`size-[1.375rem] shrink-0 rounded-full border-4 border-card ${etapa.cor}`} />
                      <span className="text-sm">
                        <span className="font-semibold">{etapa.titulo}</span>{" "}
                        <span className="text-muted-foreground">— {etapa.texto}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </BlocoTecnica>
          </Revelar>

          <Revelar className="lg:col-span-5">
            <BlocoTecnica
              icone={Brain}
              titulo="Método Feynman"
              porque="Se você consegue explicar com palavras simples, você entendeu. Onde você travar é exatamente o que falta estudar."
              prompt="Vou explicar [o que é inflação] com as minhas palavras. Aponte o que está errado, vago ou faltando — sem me dar a resposta pronta: [sua explicação]"
            >
              <ol className="space-y-2">
                {["Explique com as suas palavras", "A IA aponta os furos", "Explique de novo, mais simples"].map(
                  (passo, i) => (
                    <li key={passo} className="flex items-center gap-3 text-sm font-medium">
                      <span
                        aria-hidden="true"
                        className="grid size-7 shrink-0 place-items-center rounded-full border border-marca/25 bg-marca/10 font-mono text-xs text-marca-forte dark:text-marca-clara"
                      >
                        {i + 1}
                      </span>
                      {passo}
                    </li>
                  ),
                )}
              </ol>
              <div className="mt-4 space-y-2 text-sm" role="group" aria-label="Exemplo do método Feynman">
                <p className="ml-auto w-fit max-w-[88%] rounded-2xl rounded-br-md bg-marca px-3.5 py-2 leading-relaxed text-white">
                  Inflação é quando as coisas ficam mais caras.
                </p>
                <p className="w-fit max-w-[94%] rounded-2xl rounded-tl-md border bg-background/80 px-3.5 py-2 leading-relaxed">
                  Bom começo! Faltou o principal: são os preços <strong>em geral</strong> subindo ao longo do tempo — e aí
                  o mesmo dinheiro compra menos. Consegue me dar um exemplo?
                </p>
              </div>
            </BlocoTecnica>
          </Revelar>

          <Revelar atraso={0.08} className="md:col-span-2 lg:col-span-7">
            <BlocoTecnica
              icone={CalendarDays}
              titulo="Plano de estudos semanal"
              porque="Estudar um pouco todo dia rende mais do que virar a noite antes da prova. Peça um plano que caiba na sua rotina, com revisão no fim da semana."
              prompt="A prova é em [4 semanas] e tenho [1 hora] por dia. Monte um plano semanal com português, matemática básica, raciocínio lógico e atualidades, com revisão no sábado. Meus pontos fracos: [porcentagem e crase]."
            >
              <PlanoRotina />
            </BlocoTecnica>
          </Revelar>
        </div>
      </div>
    </section>
  );
}
