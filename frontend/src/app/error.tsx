"use client";

import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { ProvedorMovimento, Revelar } from "@/components/movimento";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Tela de erro inesperado (fronteira de erro da aplicação). Não mostra a mensagem técnica —
 * só o código (digest), que ajuda a achar o erro nos registros do servidor sem expor detalhes.
 */
export default function ErroInesperado({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <ProvedorMovimento>
      <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-background">
        {/* Luz suave e grade (decorativas) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50%_45%_at_50%_0%,color-mix(in_oklch,var(--marca)_13%,transparent),transparent_70%)]"
        />
        <div
          aria-hidden="true"
          className="fundo-grade pointer-events-none absolute inset-0 -z-10 text-foreground [mask-image:radial-gradient(50%_45%_at_50%_35%,black,transparent)]"
        />

        <header className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-8 sm:pt-6">
          <Logo />
          <ThemeToggle />
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
          <Revelar y={16} transition={{ duration: 0.5 }} className="flex max-w-xl flex-col items-center">
            <span
              aria-hidden="true"
              className="flex size-16 items-center justify-center rounded-3xl border border-amber-300/60 bg-amber-50 text-amber-700 shadow-[0_16px_36px_-18px_rgb(180_83_9/0.6)] dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300"
            >
              <TriangleAlert className="size-8" />
            </span>
            <h1 className="mt-6 font-display text-3xl leading-tight font-bold tracking-tight sm:text-5xl">
              Ops, algo deu errado
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
              Tivemos um problema para mostrar esta página. Tente de novo — se o site acabou de ser atualizado, aguarde
              alguns segundos antes.
            </p>
            {error.digest && (
              <p className="mt-4 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
                Código do erro: <code className="font-mono text-foreground">{error.digest}</code>
              </p>
            )}
            <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
              <Button type="button" size="lg" onClick={() => retry()} className="group/tentar">
                <RefreshCw
                  aria-hidden="true"
                  className="transition-transform duration-500 group-hover/tentar:rotate-180"
                />
                Tentar de novo
              </Button>
              <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
                Ir para a página inicial
              </Link>
            </div>
          </Revelar>
        </main>
      </div>
    </ProvedorMovimento>
  );
}
