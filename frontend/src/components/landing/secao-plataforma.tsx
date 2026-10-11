import Link from "next/link";
import { ArrowRight, Check, ClipboardCheck, FileText, MessageCircle, type LucideIcon } from "lucide-react";
import { BotaoWhatsapp } from "@/components/layout/botao-whatsapp";
import { Revelar, RevelarGrupo, RevelarItem } from "@/components/movimento";
import { DemoCurriculo } from "@/components/landing/plataforma/demo-curriculo";
import { DemoRelatorio } from "@/components/landing/plataforma/demo-relatorio";
import { DemoWhatsapp } from "@/components/landing/plataforma/demo-whatsapp";
import { TituloSecao } from "@/components/landing/titulo-secao";
import { cn } from "@/lib/utils";

interface Etapa {
  id: string;
  numero: string;
  rotulo: string;
  /** Rótulo curto para os atalhos no celular. */
  rotuloCurto: string;
  icone: LucideIcon;
  titulo: React.ReactNode;
  texto: React.ReactNode;
  beneficios: string[];
  demo: React.ReactNode;
}

const ETAPAS: Etapa[] = [
  {
    id: "plataforma-curriculo",
    numero: "01",
    rotulo: "Currículo com IA",
    rotuloCurto: "Currículo",
    icone: FileText,
    titulo: "Fale do seu jeito. A IA organiza o currículo.",
    texto: (
      <>
        Grave um áudio contando sua história ou digite o que você já fez — escola, cursos, bicos, trabalho voluntário.
        A IA transforma tudo em um currículo organizado, no modelo da plataforma, pronto para revisar e baixar em PDF.
      </>
    ),
    beneficios: [
      "Por áudio ou por texto, como for mais fácil para você",
      "Você revisa e edita tudo antes de usar",
      "Modelo limpo e profissional, pronto para salvar em PDF",
    ],
    demo: <DemoCurriculo />,
  },
  {
    id: "plataforma-entrevista",
    numero: "02",
    rotulo: "Simulação no WhatsApp",
    rotuloCurto: "Entrevista",
    icone: MessageCircle,
    titulo: "Treine a entrevista no WhatsApp com a Helena.",
    texto: (
      <>
        A Helena é a recrutadora virtual da plataforma. Ela pergunta para qual vaga você quer treinar e conduz a
        entrevista como numa seleção de verdade. Responda no seu tempo e, quando quiser parar, digite{" "}
        <strong className="font-semibold text-foreground">encerrar</strong>.
      </>
    ),
    beneficios: [
      "Perguntas pensadas para a vaga que você escolher",
      "Responda digitando ou mandando áudio",
      "Sem plateia: errar no treino faz parte",
    ],
    demo: <DemoWhatsapp />,
  },
  {
    id: "plataforma-relatorio",
    numero: "03",
    rotulo: "Relatório e plano",
    rotuloCurto: "Relatório",
    icone: ClipboardCheck,
    titulo: "Receba uma nota e um plano para evoluir.",
    texto: (
      <>
        Quando você encerra, a conversa vira um relatório no seu painel: nota geral, avaliação por competência, o que
        você fez bem e o que pode melhorar — com trechos das suas respostas — e um plano de ação para o próximo treino.
      </>
    ),
    beneficios: [
      "Nota de 0 a 10 e avaliação por competência",
      "Pontos fortes e de melhoria numerados, com exemplos",
      "Plano de ação com os próximos passos",
    ],
    demo: <DemoRelatorio />,
  },
];

const FOCO = "focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none";

function LinhaEtapa({ etapa, invertida }: { etapa: Etapa; invertida: boolean }) {
  const Icone = etapa.icone;
  return (
    <article
      id={etapa.id}
      aria-labelledby={`${etapa.id}-titulo`}
      className="grid scroll-mt-28 items-center gap-10 lg:grid-cols-12 lg:gap-14"
    >
      <Revelar className={cn("lg:col-span-5", invertida && "lg:order-last")}>
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="font-display text-5xl leading-none font-extrabold tracking-tighter text-transparent [-webkit-text-stroke:1.5px_var(--marca)] dark:[-webkit-text-stroke-color:var(--marca-clara)]"
          >
            {etapa.numero}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            <Icone aria-hidden="true" className="size-3.5 text-marca-forte dark:text-marca-clara" />
            <span className="sr-only">Etapa {Number(etapa.numero)}: </span>
            {etapa.rotulo}
          </span>
        </div>
        <h3
          id={`${etapa.id}-titulo`}
          className="mt-6 font-display text-3xl leading-[1.08] font-bold tracking-tight text-foreground md:text-4xl"
        >
          {etapa.titulo}
        </h3>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{etapa.texto}</p>
        <RevelarGrupo como="ul" intervalo={0.1} className="mt-7 space-y-3">
          {etapa.beneficios.map((beneficio) => (
            <RevelarItem como="li" key={beneficio} className="flex items-start gap-3 text-base text-foreground">
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-lima text-tinta"
              >
                <Check className="size-3.5" strokeWidth={3} />
              </span>
              {beneficio}
            </RevelarItem>
          ))}
        </RevelarGrupo>
      </Revelar>

      <Revelar atraso={0.1} y={40} className="min-w-0 lg:col-span-7">
        {etapa.demo}
      </Revelar>
    </article>
  );
}

/** "Do estudo à prática": a plataforma (currículo, simulação no WhatsApp e relatório) com demonstrações animadas. */
export function SecaoPlataforma() {
  return (
    <section
      id="plataforma"
      aria-labelledby="plataforma-titulo"
      className="relative isolate scroll-mt-24 overflow-hidden py-24 md:py-32"
    >
      {/* Brilho e grade no topo da seção */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[40rem]">
        <div className="absolute -top-40 left-1/2 h-[30rem] w-[60rem] max-w-[140%] -translate-x-1/2 rounded-full bg-marca/12 blur-[110px] dark:bg-marca/20" />
        <div className="fundo-grade absolute inset-0 text-foreground/60 [mask-image:radial-gradient(ellipse_55%_60%_at_50%_0%,black,transparent)]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <TituloSecao
          id="plataforma-titulo"
          sobretitulo="Plataforma Impulso Jovem"
          titulo={
            <>
              Do estudo <span className="texto-gradiente-claro dark:texto-gradiente">à prática</span>
            </>
          }
          descricao="Você já sabe usar a IA a seu favor. Agora é hora de treinar de verdade: monte seu currículo, simule a entrevista no WhatsApp e receba um relatório para evoluir."
        />

        {/* Trilha: atalhos para as três etapas */}
        <Revelar atraso={0.1}>
          <nav aria-label="Etapas da plataforma" className="mt-10">
            <ol className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-1.5 sm:gap-3">
              {ETAPAS.map((etapa, i) => {
                const Icone = etapa.icone;
                return (
                  <li key={etapa.id} className="flex items-center gap-1.5 sm:gap-3">
                    <a
                      href={`#${etapa.id}`}
                      className={cn(
                        "group inline-flex h-11 items-center gap-1.5 rounded-full border border-border bg-card/80 pr-3 pl-1 text-[13px] font-medium sm:gap-2 sm:pr-4 sm:pl-1.5 sm:text-sm text-foreground shadow-sm backdrop-blur transition-[border-color,transform] hover:-translate-y-0.5 hover:border-marca/40",
                        FOCO,
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="flex size-7 items-center justify-center rounded-full bg-marca-suave sm:size-8 text-marca-forte transition-colors group-hover:bg-marca group-hover:text-white dark:bg-marca/15 dark:text-marca-clara"
                      >
                        <Icone className="size-4" />
                      </span>
                      <span className="sm:hidden">{etapa.rotuloCurto}</span>
                      <span className="hidden sm:inline">{etapa.rotulo}</span>
                    </a>
                    {i < ETAPAS.length - 1 && (
                      <ArrowRight aria-hidden="true" className="hidden size-4 text-muted-foreground/60 sm:block" />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </Revelar>

        <div className="mt-20 space-y-24 md:mt-28 md:space-y-36">
          {ETAPAS.map((etapa, i) => (
            <LinhaEtapa key={etapa.id} etapa={etapa} invertida={i % 2 === 1} />
          ))}
        </div>

        {/* Chamada da plataforma */}
        <Revelar className="mt-24 md:mt-32">
          <div className="borda-gradiente relative overflow-hidden rounded-[2rem] p-8 text-center shadow-[0_30px_80px_-40px_color-mix(in_oklch,var(--marca)_60%,transparent)] sm:p-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[36rem] max-w-full -translate-x-1/2 rounded-full bg-marca/15 blur-[80px]"
            />
            <h3 className="relative font-display text-3xl leading-tight font-bold tracking-tight text-foreground md:text-4xl">
              Pronto para sair do estudo e ir para o treino?
            </h3>
            <p className="relative mx-auto mt-3 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Crie sua conta, monte o currículo e marque a primeira conversa com a Helena quando quiser.
            </p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/registro"
                className={cn(
                  "group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-marca px-7 text-base font-semibold text-white sm:w-auto",
                  "shadow-[0_14px_36px_-12px_color-mix(in_oklch,var(--marca)_80%,transparent)] transition-colors hover:bg-marca-forte",
                  FOCO,
                )}
              >
                Criar conta
                <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <BotaoWhatsapp className="h-12 w-full px-7 text-base sm:w-auto">Falar com a Helena</BotaoWhatsapp>
            </div>
          </div>
        </Revelar>
      </div>
    </section>
  );
}
