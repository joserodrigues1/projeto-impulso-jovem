import Link from "next/link";
import { ArrowDown, ArrowRight, Check, Sparkles } from "lucide-react";
import { DemonstracaoIA } from "@/components/landing/abertura/demonstracao-ia";
import { FaixaRolante, FundoAurora } from "@/components/movimento";
import { cn } from "@/lib/utils";

/** Palavras do título. As marcadas com `gradiente` dividem um único degradê entre si. */
const TITULO: ReadonlyArray<{ texto: string; gradiente?: boolean }> = [
  { texto: "Do" },
  { texto: "primeiro" },
  { texto: "prompt" },
  { texto: "ao" },
  { texto: "primeiro", gradiente: true },
  { texto: "emprego.", gradiente: true },
];
const PALAVRAS_GRADIENTE = TITULO.filter((p) => p.gradiente).length;

/**
 * Cada palavra em degradê mostra só o seu pedaço do degradê (fundo N vezes mais largo, deslocado),
 * então o conjunto parece um degradê só — mesmo com a animação palavra por palavra.
 */
function estiloDegrade(indice: number): React.CSSProperties | undefined {
  if (!TITULO[indice].gradiente) return undefined;
  const posicao = TITULO.slice(0, indice).filter((p) => p.gradiente).length;
  return {
    backgroundSize: `${PALAVRAS_GRADIENTE * 100}% 100%`,
    backgroundPosition: `${(posicao / Math.max(PALAVRAS_GRADIENTE - 1, 1)) * 100}% 0`,
  };
}

/** Exemplos de pedidos que o guia ensina a fazer (faixa rolante). */
const PEDIDOS = [
  "Explique essa vaga como se eu tivesse 16 anos",
  "Transforme meu trabalho voluntário em experiência",
  "Me faça 5 perguntas de entrevista, uma por vez",
  "Revise minha mensagem para o recrutador",
  "Monte um plano de estudos para a prova",
  "Crie flashcards de porcentagem",
  "Corrija minha redação e explique os erros",
  "Que perguntas posso fazer no fim da entrevista?",
  "Me ajude a falar dos meus pontos a melhorar",
  "Traduza essa vaga em inglês para mim",
];

const PONTOS = ["Gratuito", "Sem cadastro para ler", "Para quem tem de 14 a 24 anos"];

/** Entrada com CSS (não espera o JavaScript): sobe e aparece, na curva do site. */
const ENTRADA = "animate-in fade-in fill-mode-both duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]";

/**
 * Abertura da landing: faixa sempre escura (a classe `dark` aplica os tokens do tema escuro só aqui),
 * com a promessa do guia, as chamadas e uma demonstração de conversa com uma IA.
 */
export function SecaoAbertura() {
  return (
    <section
      aria-labelledby="abertura-titulo"
      className="dark relative isolate flex flex-col overflow-hidden bg-tinta text-foreground lg:min-h-[90svh]"
    >
      <FundoAurora />
      {/* Grade que some nas bordas: dá profundidade sem competir com o texto */}
      <div
        aria-hidden="true"
        className="fundo-grade pointer-events-none absolute inset-0 -z-10 text-white opacity-50 [mask-image:radial-gradient(ellipse_75%_60%_at_50%_35%,black,transparent)]"
      />

      <div className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-14 px-4 pt-28 pb-14 sm:px-6 sm:pt-32 lg:grid-cols-12 lg:gap-10 lg:pt-36 lg:pb-20">
        <div className="lg:col-span-7">
          <p
            className={cn(
              ENTRADA,
              "slide-in-from-bottom-3 inline-flex items-center gap-2.5 rounded-full border border-white/12 bg-white/5 py-1 pr-4 pl-1 text-sm text-white/80 backdrop-blur-sm",
            )}
          >
            <span className="rounded-full bg-lima px-2.5 py-0.5 text-xs font-bold text-tinta">Guia gratuito</span>
            IA no processo seletivo
          </p>

          <h1
            id="abertura-titulo"
            className="mt-7 font-display text-[3.25rem] leading-[0.95] font-bold tracking-[-0.035em] text-white [font-stretch:94%] sm:text-7xl xl:text-[5.75rem]"
          >
            {TITULO.map((palavra, i) => (
              <span key={i}>
                <span className="-mb-[0.12em] inline-block overflow-hidden pb-[0.12em] align-bottom">
                  <span
                    className={cn(
                      ENTRADA,
                      "slide-in-from-bottom-[105%] inline-block duration-1000",
                      palavra.gradiente && "texto-gradiente",
                    )}
                    style={{ animationDelay: `${150 + i * 70}ms`, ...estiloDegrade(i) }}
                  >
                    {palavra.texto}
                  </span>
                </span>
                {i < TITULO.length - 1 && " "}
              </span>
            ))}
          </h1>

          <p
            className={cn(
              ENTRADA,
              "slide-in-from-bottom-4 mt-7 max-w-xl text-lg leading-relaxed text-white/75 delay-500 sm:text-xl",
            )}
          >
            <strong className="font-semibold text-white">Prompt é o pedido que você faz para a IA.</strong> Neste guia,
            você aprende a pedir a ajuda certa em cada etapa: entender a vaga, montar o currículo, estudar para as provas
            e se preparar para a entrevista. Depois, é só praticar com a gente.
          </p>

          <div className={cn(ENTRADA, "slide-in-from-bottom-4 mt-9 flex flex-col gap-3 delay-700 sm:flex-row sm:items-center")}>
            <a
              href="#jornada"
              className="group relative inline-flex h-13 items-center justify-center gap-2 overflow-hidden rounded-full bg-marca px-7 text-base font-semibold text-white shadow-[0_10px_40px_-10px] shadow-marca transition-colors hover:bg-marca-forte"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 w-1/2 animate-brilho bg-linear-to-r from-transparent via-white/30 to-transparent"
              />
              Começar o guia
              <ArrowDown aria-hidden="true" className="size-4 transition-transform group-hover:translate-y-0.5" />
            </a>
            <Link
              href="/registro"
              className="group inline-flex h-13 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 text-base font-semibold text-white backdrop-blur-sm transition-colors hover:border-white/40 hover:bg-white/10"
            >
              Criar conta
              <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <ul
            className={cn(
              ENTRADA,
              "mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70 [animation-delay:850ms]",
            )}
          >
            {PONTOS.map((ponto) => (
              <li key={ponto} className="flex items-center gap-2">
                <Check aria-hidden="true" className="size-4 text-lima" strokeWidth={2.5} />
                {ponto}
              </li>
            ))}
          </ul>
        </div>

        <div className={cn(ENTRADA, "zoom-in-95 slide-in-from-bottom-6 duration-1000 delay-300 lg:col-span-5")}>
          <DemonstracaoIA />
        </div>
      </div>

      {/* Faixa de exemplos de pedidos */}
      <div className="relative border-t border-white/10 py-7">
        <p className="mx-auto mb-5 max-w-7xl px-4 text-xs font-semibold tracking-[0.16em] text-white/60 uppercase sm:px-6">
          Pedidos que você vai aprender a fazer
        </p>
        <FaixaRolante
          rotulo="Exemplos de pedidos para a IA"
          duracao={60}
          itens={PEDIDOS.map((pedido) => (
            <span
              key={pedido}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm whitespace-nowrap text-white/80"
            >
              <Sparkles aria-hidden="true" className="size-3.5 text-lima" />
              {pedido}
            </span>
          ))}
        />
      </div>
    </section>
  );
}
