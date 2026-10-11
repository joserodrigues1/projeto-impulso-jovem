"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, CircleCheck, Info, Rocket, X } from "lucide-react";
import { CURVA_IMPULSO, Revelar } from "@/components/movimento";
import { ApiError, fetchApi, mensagemDeErro } from "@/lib/api";
import { useConfigPublica } from "@/lib/config";
import type { EntrevistaResumo, Paginado, ResumoEntrevistas } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { AvisoRelatorioPendente } from "@/components/entrevistas/aviso-relatorio-pendente";
import { BotaoNovaSimulacao } from "@/components/entrevistas/botao-nova-simulacao";
import { CardEntrevista } from "@/components/entrevistas/card-entrevista";
import { CardSessaoAtiva, type ResultadoFinalizacao } from "@/components/entrevistas/card-sessao-ativa";
import { ComoFunciona } from "@/components/entrevistas/como-funciona";
import { EsqueletoLista, EsqueletoResumo } from "@/components/entrevistas/esqueletos";
import { EstadoErro } from "@/components/entrevistas/estado-erro";
import { GraficoEvolucao } from "@/components/entrevistas/grafico-evolucao";
import { IndicadoresEntrevistas } from "@/components/entrevistas/indicadores-entrevistas";
import { ESTILO_CARD, ESTILO_SOBRETITULO, estiloBotao } from "@/components/entrevistas/utils";

const POR_PAGINA = 6;
/** Enquanto um relatório está sendo gerado, a página se atualiza sozinha (por até ~15 min). */
const INTERVALO_ATUALIZACAO_MS = 45_000;
const MAX_ATUALIZACOES_AUTOMATICAS = 20;

interface Erro {
  mensagem: string;
  status: number;
}

interface Aviso {
  tipo: "sucesso" | "info";
  texto: string;
}

function paraErro(e: unknown, padrao: string): Erro {
  return { mensagem: mensagemDeErro(e, padrao), status: e instanceof ApiError ? e.status : 0 };
}

export default function EntrevistasPage() {
  const { config } = useConfigPublica();

  const [resumo, setResumo] = useState<ResumoEntrevistas | null>(null);
  const [erroResumo, setErroResumo] = useState<Erro | null>(null);
  const [atualizandoResumo, setAtualizandoResumo] = useState(false);

  const [lista, setLista] = useState<Paginado<EntrevistaResumo> | null>(null);
  const [erroLista, setErroLista] = useState<Erro | null>(null);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [pagina, setPagina] = useState(1);

  /** Incrementar força uma nova busca do resumo e da lista. */
  const [recarga, setRecarga] = useState(0);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const tituloListaRef = useRef<HTMLHeadingElement>(null);
  const aguardavaRelatorioRef = useRef<{ aguardando: boolean; total: number } | null>(null);

  // Resumo: indicadores, evolução e sessão em andamento
  useEffect(() => {
    let ativo = true;
    fetchApi<ResumoEntrevistas>("/entrevistas/resumo")
      .then((dados) => {
        if (!ativo) return;
        const anterior = aguardavaRelatorioRef.current;
        if (anterior?.aguardando && !dados.sessaoAguardandoRelatorio && dados.total > anterior.total) {
          setAviso({ tipo: "sucesso", texto: "Seu novo relatório ficou pronto! Ele já está na lista abaixo." });
        }
        aguardavaRelatorioRef.current = { aguardando: dados.sessaoAguardandoRelatorio, total: dados.total };
        setResumo(dados);
        setErroResumo(null);
      })
      .catch((e: unknown) => {
        if (ativo) setErroResumo(paraErro(e, "Não foi possível carregar o seu resumo agora."));
      })
      .finally(() => {
        if (ativo) setAtualizandoResumo(false);
      });
    return () => {
      ativo = false;
    };
  }, [recarga]);

  // Lista paginada de relatórios
  useEffect(() => {
    let ativo = true;
    fetchApi<Paginado<EntrevistaResumo>>(`/entrevistas?pagina=${pagina}&limite=${POR_PAGINA}`)
      .then((dados) => {
        if (!ativo) return;
        // Página que deixou de existir (ex.: dados mudaram): volta para a última.
        if (dados.dados.length === 0 && dados.meta.total > 0 && pagina > dados.meta.totalPaginas) {
          setPagina(dados.meta.totalPaginas);
          return;
        }
        setLista(dados);
        setErroLista(null);
        setCarregandoLista(false);
      })
      .catch((e: unknown) => {
        if (!ativo) return;
        setErroLista(paraErro(e, "Não foi possível carregar seus relatórios agora."));
        setCarregandoLista(false);
      });
    return () => {
      ativo = false;
    };
  }, [pagina, recarga]);

  // Atualiza sozinho enquanto a IA prepara um relatório (só com a aba visível).
  const aguardandoRelatorio = resumo?.sessaoAguardandoRelatorio ?? false;
  useEffect(() => {
    if (!aguardandoRelatorio) return;
    let tentativas = 0;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      tentativas += 1;
      if (tentativas > MAX_ATUALIZACOES_AUTOMATICAS) {
        window.clearInterval(timer);
        return;
      }
      setRecarga((r) => r + 1);
    }, INTERVALO_ATUALIZACAO_MS);
    return () => window.clearInterval(timer);
  }, [aguardandoRelatorio]);

  function atualizarTudo() {
    setAtualizandoResumo(true);
    setCarregandoLista(true);
    setRecarga((r) => r + 1);
  }

  function irParaPagina(nova: number) {
    if (nova === pagina) return;
    setCarregandoLista(true);
    setPagina(nova);
    tituloListaRef.current?.focus();
  }

  function aoFinalizarSessao(resultado: ResultadoFinalizacao | null) {
    const gerandoRelatorio = resultado?.status === "FINALIZADA";
    // Atualiza a tela na hora; a recarga confirma com os dados da API.
    setResumo((atual) =>
      atual
        ? {
            ...atual,
            sessaoAtiva: null,
            sessaoAguardandoRelatorio: gerandoRelatorio || atual.sessaoAguardandoRelatorio,
          }
        : atual,
    );
    if (resultado === null) {
      setAviso({ tipo: "info", texto: "Essa simulação já tinha sido encerrada." });
    } else if (resultado.status === "CANCELADA") {
      setAviso({
        tipo: "info",
        texto:
          "Simulação encerrada. Ela teve poucas respostas para gerar um relatório — na próxima, responda mais algumas perguntas da Helena.",
      });
    } else if (resultado.status === "ANALISADA") {
      setAviso({ tipo: "info", texto: "Essa simulação já tinha sido analisada. O relatório está na lista abaixo." });
    } else {
      setAviso({
        tipo: "sucesso",
        texto: "Simulação encerrada! A IA já está preparando seu relatório — ele aparece aqui em poucos minutos.",
      });
    }
    atualizarTudo();
  }

  const totalRelatorios = lista?.meta.total ?? resumo?.total ?? 0;
  const semEntrevistas = resumo !== null && resumo.total === 0 && !resumo.sessaoAtiva;
  const mostrarComoFuncionaNoTopo = resumo === null || resumo.total === 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <Revelar y={12} transition={{ duration: 0.45 }}>
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className={ESTILO_SOBRETITULO}>
              <span aria-hidden="true" className="size-1.5 rounded-full bg-lima" />
              Treino de entrevista
            </p>
            <h1 className="mt-3 font-display text-3xl leading-[1.08] font-bold tracking-tight text-foreground sm:text-4xl">
              Simulações de entrevista
            </h1>
            <p className="mt-2 max-w-2xl leading-relaxed text-muted-foreground">
              Converse com a Helena, nossa recrutadora virtual, e acompanhe sua evolução a cada treino.
            </p>
          </div>
          <BotaoNovaSimulacao className="shrink-0" />
        </header>
      </Revelar>

      {/* Avisos de ações (encerrar simulação, relatório pronto) */}
      <div role="status" aria-live="polite">
        <AnimatePresence initial={false}>
          {aviso && (
            <motion.div
              key={aviso.texto}
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.35, ease: CURVA_IMPULSO }}
              className={cn(
                "flex items-start gap-3 rounded-2xl border p-4",
                aviso.tipo === "sucesso"
                  ? "border-chart-3/45 bg-chart-3/12 dark:border-chart-3/25 dark:bg-chart-3/[0.08]"
                  : "border-chart-2/40 bg-chart-2/10 dark:border-chart-2/25 dark:bg-chart-2/[0.08]",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full",
                  aviso.tipo === "sucesso" ? "bg-lima text-tinta" : "bg-ciano text-tinta",
                )}
              >
                {aviso.tipo === "sucesso" ? <CircleCheck className="size-4" /> : <Info className="size-4" />}
              </span>
              <p className="flex-1 pt-0.5 text-sm font-medium text-foreground">{aviso.texto}</p>
              <button
                type="button"
                onClick={() => setAviso(null)}
                aria-label="Fechar aviso"
                className="-m-1.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {resumo?.sessaoAtiva && (
        <CardSessaoAtiva
          key={resumo.sessaoAtiva.id}
          sessao={resumo.sessaoAtiva}
          whatsappLink={config.whatsappLink}
          onFinalizada={aoFinalizarSessao}
        />
      )}

      {aguardandoRelatorio && <AvisoRelatorioPendente onAtualizar={atualizarTudo} atualizando={atualizandoResumo} />}

      {mostrarComoFuncionaNoTopo && <ComoFunciona />}

      {/* Indicadores e evolução */}
      {erroResumo && !resumo ? (
        <EstadoErro
          titulo="Não foi possível carregar seu resumo"
          mensagem={erroResumo.mensagem}
          status={erroResumo.status}
          onTentarDeNovo={atualizarTudo}
        />
      ) : !resumo ? (
        <EsqueletoResumo />
      ) : resumo.total > 0 ? (
        <section aria-labelledby="titulo-evolucao" className="space-y-4">
          <h2 id="titulo-evolucao" className="sr-only">
            Seu desempenho
          </h2>
          <IndicadoresEntrevistas resumo={resumo} />
          <Revelar y={16} transition={{ duration: 0.5, delay: 0.1 }} className={cn(ESTILO_CARD, "p-5 sm:p-7")}>
            <h3 className="font-display text-xl font-bold tracking-tight text-foreground">Sua evolução</h3>
            <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
              {resumo.evolucao.length > 1
                ? `Notas das suas últimas ${resumo.evolucao.length} simulações, de 0 a 10. Clique ou toque em um ponto para ver o relatório.`
                : "Notas de 0 a 10 de cada simulação."}
            </p>
            <GraficoEvolucao pontos={resumo.evolucao} className="mt-5" />
          </Revelar>
        </section>
      ) : null}

      {/* Lista de relatórios */}
      <section aria-labelledby="titulo-lista" className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2
            id="titulo-lista"
            ref={tituloListaRef}
            tabIndex={-1}
            className="scroll-mt-24 rounded-lg font-display text-2xl font-bold tracking-tight text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Seus relatórios
          </h2>
          {lista && totalRelatorios > 0 && (
            <p className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground tabular-nums">
              {totalRelatorios} {totalRelatorios === 1 ? "relatório" : "relatórios"}
            </p>
          )}
        </div>

        {erroLista && !lista ? (
          <EstadoErro
            titulo="Não foi possível carregar seus relatórios"
            mensagem={erroLista.mensagem}
            status={erroLista.status}
            onTentarDeNovo={atualizarTudo}
          />
        ) : !lista ? (
          <EsqueletoLista />
        ) : lista.dados.length === 0 ? (
          <Revelar
            y={16}
            transition={{ duration: 0.5 }}
            className="relative isolate overflow-hidden rounded-3xl border border-dashed border-border bg-card px-6 py-14 text-center"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 fundo-grade text-foreground [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
            />
            <span
              aria-hidden="true"
              className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-marca to-marca-forte text-white shadow-lg shadow-marca/30 motion-safe:animate-flutuar"
            >
              <Rocket className="size-7" />
            </span>
            <h3 className="mt-6 font-display text-2xl font-bold tracking-tight text-foreground">
              {semEntrevistas ? "Sua primeira entrevista começa aqui" : "Nenhum relatório por enquanto"}
            </h3>
            <p className="mx-auto mt-2 max-w-md leading-relaxed text-muted-foreground">
              Treinar antes faz diferença: você chega na entrevista de verdade com mais calma e com as respostas na
              ponta da língua. Chame a Helena no WhatsApp — ao final, seu relatório aparece aqui.
            </p>
            <BotaoNovaSimulacao className="mt-7" rotulo="Começar minha primeira simulação" />
          </Revelar>
        ) : (
          <>
            {erroLista && (
              <EstadoErro
                titulo="Não foi possível atualizar a lista"
                mensagem={erroLista.mensagem}
                status={erroLista.status}
                onTentarDeNovo={atualizarTudo}
              />
            )}
            <ul
              aria-busy={carregandoLista}
              className={cn(
                "grid gap-4 transition-opacity duration-300 md:grid-cols-2",
                carregandoLista && "pointer-events-none opacity-60",
              )}
            >
              {lista.dados.map((entrevista, i) => (
                // Cada cartão entra na sua vez (ao carregar e ao trocar de página)
                <motion.li
                  key={entrevista.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: CURVA_IMPULSO, delay: Math.min(i, 8) * 0.06 }}
                >
                  <CardEntrevista entrevista={entrevista} />
                </motion.li>
              ))}
            </ul>

            {lista.meta.totalPaginas > 1 && (
              <nav aria-label="Páginas dos relatórios" className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => irParaPagina(Math.max(1, lista.meta.pagina - 1))}
                  disabled={lista.meta.pagina <= 1 || carregandoLista}
                  className={estiloBotao("secundario", "sm")}
                >
                  <ChevronLeft aria-hidden="true" />
                  Anteriores
                </button>
                <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
                  Página {lista.meta.pagina} de {lista.meta.totalPaginas}
                </p>
                <button
                  type="button"
                  onClick={() => irParaPagina(Math.min(lista.meta.totalPaginas, lista.meta.pagina + 1))}
                  disabled={lista.meta.pagina >= lista.meta.totalPaginas || carregandoLista}
                  className={estiloBotao("secundario", "sm")}
                >
                  Próximas
                  <ChevronRight aria-hidden="true" />
                </button>
              </nav>
            )}
          </>
        )}
      </section>

      {!mostrarComoFuncionaNoTopo && <ComoFunciona />}
    </div>
  );
}
