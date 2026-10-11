"use client";

import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Revelar } from "@/components/movimento";
import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Erro inesperado dentro do painel. Fica no lugar só do conteúdo da página: o layout do painel
 * (menu lateral, cabeçalho, botão Sair) continua na tela. Não mostra a mensagem técnica — só o código (digest).
 */
export default function ErroNoPainel({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <Revelar y={12} transition={{ duration: 0.4 }}>
      <div
        role="alert"
        className="relative isolate mx-auto flex max-w-lg flex-col items-center overflow-hidden rounded-3xl border border-border bg-card p-6 text-center shadow-[0_1px_2px_rgb(20_16_40/0.04),0_12px_32px_-18px_rgb(20_16_40/0.18)] sm:p-10 dark:shadow-none"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklch,oklch(0.8_0.16_75)_18%,transparent),transparent_75%)]"
        />
        <span
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-2xl border border-amber-300/60 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300"
        >
          <TriangleAlert className="size-7" />
        </span>
        <h1 className="mt-5 font-display text-2xl leading-tight font-bold tracking-tight sm:text-3xl">
          Ops, algo deu errado
        </h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Tivemos um problema para mostrar esta parte do painel. Tente de novo — se o site acabou de ser atualizado,
          aguarde alguns segundos antes. Seus dados continuam salvos.
        </p>
        {error.digest && (
          <p className="mt-4 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
            Código do erro: <code className="font-mono text-foreground">{error.digest}</code>
          </p>
        )}
        <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button type="button" size="lg" onClick={() => retry()} className="group/tentar">
            <RefreshCw aria-hidden="true" className="transition-transform duration-500 group-hover/tentar:rotate-180" />
            Tentar de novo
          </Button>
          <Link href="/dashboard" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Voltar para o início
          </Link>
        </div>
      </div>
    </Revelar>
  );
}
