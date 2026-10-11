"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Revelar } from "@/components/movimento";
import { classeLinkVoltar, classeSobretitulo } from "./campos";

/** Link "voltar" do topo das telas de currículo (seta que desliza no hover). */
export function LinkVoltar({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={classeLinkVoltar}>
      <span className="flex size-8 items-center justify-center rounded-full border border-border bg-card transition-[border-color,translate] duration-200 group-hover:-translate-x-0.5 group-hover:border-marca/40 dark:bg-white/5">
        <ArrowLeft className="size-4" aria-hidden="true" />
      </span>
      {children}
    </Link>
  );
}

interface Props {
  voltar: { href: string; rotulo: string };
  sobretitulo: string;
  titulo: ReactNode;
  descricao?: ReactNode;
  /** Conteúdo à direita do título (ações). */
  lateral?: ReactNode;
}

/** Cabeçalho das telas de currículo: voltar + sobretítulo em pílula + título display + descrição. */
export function CabecalhoPagina({ voltar, sobretitulo, titulo, descricao, lateral }: Props) {
  return (
    <Revelar y={12} transition={{ duration: 0.45 }} className="space-y-5">
      <LinkVoltar href={voltar.href}>{voltar.rotulo}</LinkVoltar>
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className={classeSobretitulo}>
            <span aria-hidden="true" className="size-1.5 rounded-full bg-lima" />
            {sobretitulo}
          </p>
          <h1 className="mt-3 font-display text-3xl leading-[1.08] font-bold tracking-tight break-words text-foreground sm:text-4xl">
            {titulo}
          </h1>
          {descricao && <div className="mt-2 max-w-2xl leading-relaxed text-muted-foreground">{descricao}</div>}
        </div>
        {lateral}
      </header>
    </Revelar>
  );
}
