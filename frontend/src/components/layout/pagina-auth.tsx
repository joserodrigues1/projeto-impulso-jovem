import Link from "next/link";
import { ArrowLeft, FileText, MessageCircle, Sparkles, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { FundoAurora, ProvedorMovimento, Revelar, RevelarGrupo, RevelarItem } from "@/components/movimento";
import { ThemeToggle } from "@/components/theme-toggle";

interface PaginaAuthProps {
  titulo: string;
  subtitulo?: React.ReactNode;
  children: React.ReactNode;
  /** Conteúdo abaixo do formulário, separado por uma linha (ex.: "Ainda não tem conta?"). */
  rodape?: React.ReactNode;
}

/**
 * Moldura das telas de entrada (login, cadastro, recuperação de senha).
 * No computador: formulário à direita e, à esquerda, um painel sempre escuro com a proposta da plataforma.
 * No celular: só o formulário. O painel vem depois no HTML (leitor de tela e teclado chegam primeiro ao formulário).
 */
export function PaginaAuth({ titulo, subtitulo, children, rodape }: PaginaAuthProps) {
  return (
    <ProvedorMovimento>
      <div className="relative flex min-h-dvh bg-background">
        <div className="relative isolate flex min-w-0 flex-1 flex-col">
          {/* Luz suave da marca no canto (decorativa) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(55%_45%_at_100%_0%,color-mix(in_oklch,var(--marca)_11%,transparent),transparent_70%),radial-gradient(45%_35%_at_0%_100%,color-mix(in_oklch,var(--ciano)_9%,transparent),transparent_70%)] lg:bg-[radial-gradient(55%_45%_at_100%_0%,color-mix(in_oklch,var(--marca)_8%,transparent),transparent_70%)]"
          />

          <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-8 sm:pt-6">
            <Link
              href="/"
              className="group inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft aria-hidden="true" className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
              Voltar ao início
            </Link>
            <ThemeToggle />
          </div>

          <main className="flex flex-1 flex-col justify-center px-4 pt-8 pb-10 sm:px-8 sm:py-12">
            <Revelar y={16} transition={{ duration: 0.55 }} className="mx-auto w-full max-w-[26rem]">
              <div className="mb-8">
                <Logo tamanho="md" className="mb-8 lg:hidden" />
                <h1 className="font-display text-3xl leading-[1.08] font-bold tracking-tight text-foreground sm:text-4xl">
                  {titulo}
                </h1>
                {subtitulo && <p className="mt-3 text-base leading-relaxed text-muted-foreground">{subtitulo}</p>}
              </div>

              {children}

              {rodape && <RodapeAuth>{rodape}</RodapeAuth>}
            </Revelar>
          </main>

          <footer className="px-4 pb-6 text-center text-xs text-muted-foreground sm:px-8">
            <nav aria-label="Documentos" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <Link href="/termos" className="underline-offset-4 transition-colors hover:text-foreground hover:underline">
                Termos de uso
              </Link>
              <span aria-hidden="true">·</span>
              <Link href="/privacidade" className="underline-offset-4 transition-colors hover:text-foreground hover:underline">
                Política de privacidade
              </Link>
            </nav>
          </footer>
        </div>

        <PainelMarca />
      </div>
    </ProvedorMovimento>
  );
}

const BENEFICIOS: Array<{ icone: LucideIcon; titulo: string; texto: string }> = [
  {
    icone: FileText,
    titulo: "Currículo com IA",
    texto: "Conte sua história digitando ou gravando um áudio. A IA organiza no formato certo.",
  },
  {
    icone: MessageCircle,
    titulo: "Entrevista no WhatsApp",
    texto: "Treine com a Helena, a recrutadora virtual, no app que você já usa.",
  },
  {
    icone: Sparkles,
    titulo: "Relatório com plano de ação",
    texto: "Nota, competências, pontos fortes e o que melhorar para a próxima.",
  },
];

/** Painel lateral (só no computador): sempre escuro — a classe "dark" troca os tokens só aqui dentro. */
function PainelMarca() {
  return (
    <aside
      aria-label="O que você encontra no Impulso Jovem"
      className="dark relative isolate order-first hidden h-dvh w-[44%] max-w-[44rem] shrink-0 flex-col justify-between gap-8 self-start overflow-hidden bg-tinta p-10 text-foreground lg:sticky lg:top-0 lg:flex xl:px-14"
    >
      <FundoAurora intensidade="suave" />
      <div
        aria-hidden="true"
        className="fundo-grade pointer-events-none absolute inset-0 -z-10 text-white [mask-image:radial-gradient(70%_60%_at_30%_40%,black,transparent)]"
      />

      <Logo tamanho="md" />

      <div className="max-w-lg">
        <Revelar y={20}>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-marca-clara uppercase">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-lima" />
            Do estudo à prática
          </p>
          <p className="font-display text-4xl leading-[1.05] font-bold tracking-tight text-white xl:text-5xl">
            Seu primeiro emprego começa com um <span className="texto-gradiente">bom treino.</span>
          </p>
        </Revelar>

        <RevelarGrupo como="ul" intervalo={0.1} className="mt-9 space-y-4">
          {BENEFICIOS.map(({ icone: Icone, titulo, texto }) => (
            <RevelarItem como="li" key={titulo} className="flex gap-4">
              <span
                aria-hidden="true"
                className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-marca-clara shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]"
              >
                <Icone className="size-5" />
              </span>
              <span>
                <span className="block font-semibold text-white">{titulo}</span>
                <span className="mt-0.5 block text-sm leading-relaxed text-white/70">{texto}</span>
              </span>
            </RevelarItem>
          ))}
        </RevelarGrupo>
      </div>

      <MockConversa />
    </aside>
  );
}

/** Ilustração (HTML/CSS) de uma conversa com a Helena — decorativa: o conteúdo está na lista acima. */
function MockConversa() {
  return (
    // Em telas baixas (notebooks pequenos) a ilustração sai para o texto caber sem rolagem
    <div aria-hidden="true" className="relative max-w-md [@media(max-height:820px)]:hidden">
      <div className="animate-flutuar rounded-3xl border border-white/10 bg-white/[0.05] p-4 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.8)] backdrop-blur-md">
        <div className="mb-3 flex items-center gap-3 border-b border-white/10 pb-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-marca to-ciano font-display text-sm font-bold text-white">
            H
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-white">Helena</span>
            <span className="block text-xs text-white/60">recrutadora virtual</span>
          </span>
        </div>
        <RevelarGrupo intervalo={0.35} className="space-y-2 text-sm">
          <RevelarItem className="w-fit max-w-[85%] rounded-2xl rounded-tl-md bg-white/10 px-3.5 py-2 text-white/90">
            Oi! Vamos treinar para a sua entrevista? Me conta um pouco sobre você.
          </RevelarItem>
          <RevelarItem className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-md bg-marca px-3.5 py-2 text-white">
            Bora! Estou terminando o ensino médio e quero meu primeiro emprego.
          </RevelarItem>
          <RevelarItem className="flex w-fit items-center gap-2 rounded-full bg-lima px-3 py-1.5 text-xs font-semibold text-tinta">
            <Sparkles className="size-3.5" />
            Relatório pronto: pontos fortes e plano de ação
          </RevelarItem>
        </RevelarGrupo>
      </div>
    </div>
  );
}

/** Linha final do formulário (ex.: "Ainda não tem conta? Criar conta"). */
export function RodapeAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">{children}</div>
  );
}

/** Link de destaque usado nos rodapés das telas de entrada. */
export const classeLinkDestaque =
  "font-semibold text-marca-forte underline-offset-4 transition-colors hover:underline dark:text-marca-clara";
