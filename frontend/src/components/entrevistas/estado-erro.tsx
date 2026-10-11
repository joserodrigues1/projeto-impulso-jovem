"use client";

import Link from "next/link";
import { CircleAlert, LogIn, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { estiloBotao } from "./utils";

interface EstadoErroProps {
  mensagem: string;
  /** Status HTTP do erro (0 = sem conexão). 401 mostra o atalho para entrar de novo. */
  status?: number;
  titulo?: string;
  onTentarDeNovo?: () => void;
  className?: string;
}

/** Caixa de erro com ação para tentar de novo (ou entrar de novo, se a sessão expirou). */
export function EstadoErro({ mensagem, status, titulo, onTentarDeNovo, className }: EstadoErroProps) {
  const sessaoExpirada = status === 401;

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-4 rounded-3xl border border-destructive/30 bg-destructive/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between dark:bg-destructive/10",
        className,
      )}
    >
      <div className="flex gap-3.5">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive ring-1 ring-destructive/20 ring-inset"
        >
          <CircleAlert className="size-5" />
        </span>
        <div>
          <p className="font-semibold text-foreground">
            {sessaoExpirada ? "Sua sessão expirou" : (titulo ?? "Não foi possível carregar")}
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
            {sessaoExpirada ? "Entre de novo na sua conta para continuar." : mensagem}
          </p>
        </div>
      </div>
      {sessaoExpirada ? (
        <Link href="/login" className={estiloBotao("secundario", "sm", "shrink-0")}>
          <LogIn aria-hidden="true" />
          Entrar de novo
        </Link>
      ) : (
        onTentarDeNovo && (
          <button type="button" onClick={onTentarDeNovo} className={estiloBotao("secundario", "sm", "shrink-0")}>
            <RefreshCw aria-hidden="true" />
            Tentar de novo
          </button>
        )
      )}
    </div>
  );
}
