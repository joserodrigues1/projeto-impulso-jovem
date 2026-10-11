"use client";

import { useEffect, useId, useRef } from "react";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import { classeBotaoPerigoCheio, classeBotaoPrimario, classeBotaoSecundario, classeErro } from "./campos";

interface Props {
  aberto: boolean;
  titulo: string;
  descricao: string;
  textoConfirmar: string;
  textoCancelar?: string;
  perigoso?: boolean;
  processando?: boolean;
  erro?: string | null;
  onConfirmar: () => void;
  onCancelar: () => void;
}

/**
 * Confirmação em <dialog> nativo (modal de verdade: prende o foco, fecha com Esc e devolve o foco ao sair).
 * Substitui o confirm() do navegador. Entra com um leve "zoom" (só CSS; some com "reduzir movimento").
 */
export function DialogoConfirmacao({
  aberto,
  titulo,
  descricao,
  textoConfirmar,
  textoCancelar = "Cancelar",
  perigoso = false,
  processando = false,
  erro,
  onConfirmar,
  onCancelar,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const idTitulo = useId();
  const idDescricao = useId();

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (aberto && !dialogo.open) {
      dialogo.showModal();
      // Foco na opção segura (o React não grava o atributo autofocus no HTML)
      cancelarRef.current?.focus();
    }
    if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);

  function cancelar() {
    if (!processando) onCancelar();
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitulo}
      aria-describedby={idDescricao}
      onCancel={(e) => {
        // Esc: quem fecha é o estado do componente pai
        e.preventDefault();
        cancelar();
      }}
      onClose={() => {
        if (aberto) cancelar();
      }}
      onClick={(e) => {
        // clique no fundo escurecido
        if (e.target === e.currentTarget) cancelar();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-border bg-popover p-0 text-popover-foreground shadow-2xl shadow-tinta/25 transition-[opacity,scale] duration-200 ease-out starting:open:scale-95 starting:open:opacity-0 dark:shadow-black/50"
    >
      <div className="space-y-4 p-6 sm:p-7">
        <div className="flex items-start gap-4">
          {perigoso && (
            <span
              aria-hidden="true"
              className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive ring-1 ring-destructive/20"
            >
              <TriangleAlert className="size-5" />
            </span>
          )}
          <div className="min-w-0">
            <h2 id={idTitulo} className="font-display text-xl font-bold tracking-tight">
              {titulo}
            </h2>
            <p id={idDescricao} className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {descricao}
            </p>
          </div>
        </div>
        {erro && (
          <p role="alert" className={`${classeErro} flex items-start gap-2 p-3 text-sm`}>
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            {erro}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            ref={cancelarRef}
            onClick={cancelar}
            disabled={processando}
            className={classeBotaoSecundario}
          >
            {textoCancelar}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={processando}
            className={perigoso ? classeBotaoPerigoCheio : classeBotaoPrimario}
          >
            {processando && <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />}
            {textoConfirmar}
          </button>
        </div>
      </div>
    </dialog>
  );
}
