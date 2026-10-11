"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleStop, LoaderCircle, MessageCircle } from "lucide-react";
import { CURVA_IMPULSO } from "@/components/movimento";
import { ApiError, fetchApi, mensagemDeErro } from "@/lib/api";
import type { SessaoAtiva } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { estiloBotao, tempoRelativo } from "./utils";

/**
 * Resposta de POST /entrevistas/sessao-ativa/finalizar.
 * FINALIZADA = relatório a caminho; CANCELADA = poucas respostas para avaliar;
 * ANALISADA = o relatório já tinha sido gerado.
 */
export interface ResultadoFinalizacao {
  sessaoId: string;
  status: "EM_ANDAMENTO" | "FINALIZADA" | "ANALISADA" | "CANCELADA";
}

interface CardSessaoAtivaProps {
  sessao: SessaoAtiva;
  whatsappLink: string | null;
  /** Chamado quando a simulação foi encerrada (resultado) ou já não estava ativa (null). */
  onFinalizada: (resultado: ResultadoFinalizacao | null) => void;
  className?: string;
}

type Etapa = "ocioso" | "confirmando" | "enviando";

/** Simulação em andamento no WhatsApp, com a opção de encerrar e pedir o relatório. */
export function CardSessaoAtiva({ sessao, whatsappLink, onFinalizada, className }: CardSessaoAtivaProps) {
  const [etapa, setEtapa] = useState<Etapa>("ocioso");
  const [erro, setErro] = useState<string | null>(null);
  const botaoEncerrarRef = useRef<HTMLButtonElement>(null);
  const confirmacaoRef = useRef<HTMLDivElement>(null);
  const tituloConfirmacaoId = useId();
  const textoConfirmacaoId = useId();

  // Leva o foco para a pergunta de confirmação assim que ela aparece. Sem rolar: ela abre (animando a altura)
  // logo abaixo do botão clicado, e rolar uma caixa ainda fechada deixaria o conteúdo deslocado.
  useEffect(() => {
    if (etapa === "confirmando") confirmacaoRef.current?.focus({ preventScroll: true });
  }, [etapa]);

  function cancelar() {
    setEtapa("ocioso");
    setErro(null);
    // Devolve o foco ao botão que abriu a confirmação (depois de ele voltar à tela).
    requestAnimationFrame(() => botaoEncerrarRef.current?.focus());
  }

  async function encerrar() {
    setEtapa("enviando");
    setErro(null);
    try {
      const resultado = await fetchApi<ResultadoFinalizacao>("/entrevistas/sessao-ativa/finalizar", {
        method: "POST",
      });
      onFinalizada(resultado);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        onFinalizada(null);
        return;
      }
      setErro(mensagemDeErro(e, "Não foi possível encerrar a simulação agora. Tente de novo."));
      setEtapa("confirmando");
    }
  }

  function aoPressionarTecla(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key === "Escape" && etapa === "confirmando") {
      evento.stopPropagation();
      cancelar();
    }
  }

  const mensagens = sessao.totalMensagens;
  const enviando = etapa === "enviando";

  return (
    <section
      aria-label="Simulação em andamento"
      className={cn(
        "borda-gradiente relative isolate overflow-hidden rounded-3xl p-5 shadow-lg shadow-marca/[0.08] sm:p-6 print:hidden",
        className,
      )}
    >
      {/* Luz suave atrás do cartão */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -left-16 -z-10 size-56 rounded-full bg-marca/15 blur-3xl dark:bg-marca/25"
      />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <span className="relative mt-1.5 flex size-3 shrink-0" aria-hidden="true">
            <span className="absolute inline-flex size-full rounded-full bg-lima opacity-80 motion-safe:animate-ping" />
            <span className="relative inline-flex size-3 rounded-full bg-lima ring-2 ring-lima/30" />
          </span>
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-marca-forte uppercase dark:text-marca-clara">
              Simulação no WhatsApp
            </p>
            <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-foreground">
              Você tem uma simulação em andamento
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Começou {tempoRelativo(sessao.iniciadaEm)} · {mensagens} {mensagens === 1 ? "mensagem" : "mensagens"} ·
              última mensagem {tempoRelativo(sessao.ultimaMensagemEm)}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Terminou de conversar com a Helena? Digite{" "}
              <strong className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.85em] font-semibold text-foreground">
                encerrar
              </strong>{" "}
              no WhatsApp ou use o botão aqui para receber seu relatório.
            </p>
          </div>
        </div>

        {etapa === "ocioso" && (
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className={estiloBotao("secundario", "sm")}
              >
                <MessageCircle aria-hidden="true" />
                Continuar no WhatsApp
                <span className="sr-only">(abre em nova aba)</span>
              </a>
            )}
            <button
              ref={botaoEncerrarRef}
              type="button"
              onClick={() => setEtapa("confirmando")}
              className={estiloBotao("primario", "sm")}
            >
              <CircleStop aria-hidden="true" />
              Encerrar e gerar relatório
            </button>
          </div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {etapa !== "ocioso" && (
          <motion.div
            key="confirmacao"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: CURVA_IMPULSO }}
            className="overflow-hidden"
          >
            <div
              ref={confirmacaoRef}
              role="group"
              tabIndex={-1}
              aria-labelledby={tituloConfirmacaoId}
              aria-describedby={textoConfirmacaoId}
              onKeyDown={aoPressionarTecla}
              className="mt-5 rounded-2xl border border-marca/20 bg-marca/[0.06] p-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-marca/10"
            >
              <p id={tituloConfirmacaoId} className="font-semibold text-foreground">
                Encerrar a simulação agora?
              </p>
              <p id={textoConfirmacaoId} className="mt-1 text-sm leading-relaxed text-muted-foreground">
                A Helena vai finalizar a entrevista e a gente começa a preparar o seu relatório. Depois disso, essa
                conversa não pode ser retomada — mas você pode começar outra quando quiser. Se você respondeu poucas
                perguntas, não vai dar para gerar o relatório.
              </p>

              {erro && (
                <p role="alert" className="mt-3 text-sm font-medium text-destructive">
                  {erro}
                </p>
              )}

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={encerrar} disabled={enviando} className={estiloBotao("primario", "sm")}>
                  {enviando ? (
                    <>
                      <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" />
                      Encerrando…
                    </>
                  ) : (
                    "Sim, encerrar e gerar relatório"
                  )}
                </button>
                <button
                  type="button"
                  onClick={cancelar}
                  disabled={enviando}
                  className={estiloBotao("secundario", "sm")}
                >
                  Continuar a entrevista
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
