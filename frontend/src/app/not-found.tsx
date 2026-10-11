import Link from "next/link";
import { ArrowRight, Compass, LayoutDashboard, Library, MessageCircleQuestion, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { ProvedorMovimento, Revelar, RevelarGrupo, RevelarItem } from "@/components/movimento";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";

/** Caminhos conhecidos para quem caiu num endereço que não existe. */
const ATALHOS: Array<{ href: string; rotulo: string; texto: string; icone: LucideIcon }> = [
  { href: "/#jornada", rotulo: "Guia de IA", texto: "Como a IA ajuda em cada etapa do processo seletivo", icone: Compass },
  { href: "/#prompts", rotulo: "Biblioteca de prompts", texto: "Pedidos prontos para copiar e adaptar", icone: Library },
  { href: "/#duvidas", rotulo: "Perguntas frequentes", texto: "Respostas rápidas sobre a plataforma", icone: MessageCircleQuestion },
];

export default function NaoEncontrada() {
  return (
    <ProvedorMovimento>
      <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-background">
        {/* Luz da marca e grade (decorativas) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50%_45%_at_50%_0%,color-mix(in_oklch,var(--marca)_16%,transparent),transparent_70%),radial-gradient(35%_35%_at_85%_80%,color-mix(in_oklch,var(--ciano)_10%,transparent),transparent_70%)]"
        />
        <div
          aria-hidden="true"
          className="fundo-grade pointer-events-none absolute inset-0 -z-10 text-foreground [mask-image:radial-gradient(55%_50%_at_50%_30%,black,transparent)]"
        />

        <header className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-8 sm:pt-6">
          <Logo />
          <ThemeToggle />
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center sm:py-16">
          <Revelar y={16} transition={{ duration: 0.55 }} className="flex flex-col items-center">
            {/* O "404" é só ilustração: a informação está no selo e no título */}
            <div aria-hidden="true" className="relative select-none">
              <p className="font-display text-[7.5rem] leading-none font-extrabold tracking-tighter texto-gradiente-claro sm:text-[11rem] dark:texto-gradiente">
                404
              </p>
              <span className="absolute -top-1 -right-3 flex size-12 animate-flutuar items-center justify-center rounded-2xl border border-border bg-card text-marca-forte shadow-[0_14px_30px_-14px_var(--marca)] sm:-right-6 sm:size-14 dark:text-marca-clara">
                <Compass className="size-6 sm:size-7" />
              </span>
            </div>

            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-marca-forte uppercase backdrop-blur dark:text-marca-clara">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-lima ring-2 ring-lima/30" />
              Erro 404
            </p>
            <h1 className="mt-4 font-display text-3xl leading-tight font-bold tracking-tight sm:text-5xl">
              Página não encontrada
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
              O endereço pode estar errado ou a página mudou de lugar. Confira o link ou volte para um caminho
              conhecido.
            </p>

            <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
              <Link href="/" className={buttonVariants({ size: "lg" })}>
                Ir para a página inicial
                <ArrowRight aria-hidden="true" data-icon="seta" />
              </Link>
              <Link href="/dashboard" className={buttonVariants({ variant: "outline", size: "lg" })}>
                <LayoutDashboard aria-hidden="true" />
                Abrir meu painel
              </Link>
            </div>
          </Revelar>

          <nav aria-labelledby="titulo-atalhos" className="mt-14 w-full max-w-3xl">
            <h2 id="titulo-atalhos" className="font-sans text-sm font-medium text-muted-foreground">
              Ou continue pelo guia gratuito:
            </h2>
            <RevelarGrupo como="ul" intervalo={0.08} className="mt-4 grid gap-3 text-left sm:grid-cols-3">
              {ATALHOS.map(({ href, rotulo, texto, icone: Icone }) => (
                <RevelarItem como="li" key={href} className="min-w-0">
                  <Link
                    href={href}
                    className="group flex h-full items-start gap-3 rounded-3xl border border-border bg-card/80 p-4 shadow-xs backdrop-blur transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-marca/30 hover:shadow-[0_18px_40px_-24px_var(--marca)] dark:hover:border-marca-clara/30"
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-marca-suave text-marca-forte transition-transform duration-300 group-hover:-rotate-6 dark:bg-marca/15 dark:text-marca-clara"
                    >
                      <Icone className="size-[1.125rem]" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-foreground">{rotulo}</span>
                      <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">{texto}</span>
                    </span>
                  </Link>
                </RevelarItem>
              ))}
            </RevelarGrupo>
          </nav>
        </main>
      </div>
    </ProvedorMovimento>
  );
}
