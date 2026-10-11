"use client";

import type { ReactNode } from "react";
import {
  Building2,
  CalendarDays,
  Check,
  Flag,
  Info,
  Lightbulb,
  ListChecks,
  MessageCircle,
  MessageSquareQuote,
  MessagesSquare,
  Sparkles,
  Target,
  ThumbsUp,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Revelar } from "@/components/movimento";
import type { EntrevistaDetalhe, RelatorioEntrevista } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { AnelNota } from "./anel-nota";
import { BarraCompetencia } from "./barra-competencia";
import { MENSAGEM_CLASSIFICACAO, classificacaoEfetiva, formatarNota } from "./faixas";
import { PlanoDeAcao } from "./plano-de-acao";
import { SeloClassificacao } from "./selo-classificacao";
import { ESTILO_CARD, ESTILO_ICONE_SECAO, ESTILO_SOBRETITULO, formatarData, linkWhatsappComTexto } from "./utils";

type PontoForte = RelatorioEntrevista["pontosFortes"][number];
type PontoMelhoria = RelatorioEntrevista["pontosMelhoria"][number];

/** Texto legado (uma linha = um item), sem marcadores como "-", "•" ou "1.". */
function linhasDoTexto(texto: string | null | undefined): string[] {
  if (!texto) return [];
  return texto
    .split(/\r?\n/)
    .map((linha) => linha.replace(/^\s*(?:[-*•–]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
}

/** Listas do relatório; registros antigos podem vir sem alguma delas. */
function lista<T>(valor: T[] | null | undefined): T[] {
  return Array.isArray(valor) ? valor : [];
}

/** Tira aspas que a IA às vezes coloca em volta da evidência (a tela já põe as suas). */
function semAspas(texto: string): string {
  return texto.trim().replace(/^["'“”‘’«»]+|["'“”‘’«»]+$/g, "").trim();
}

/**
 * Cores de destaque de cada seção (ícone e números). Tons do tema: marca, lima (chart-3),
 * âmbar (chart-4) e ciano (chart-2). No claro, o ícone usa o tom escurecido para manter o contraste.
 */
const DESTAQUES = {
  marca: {
    icone: "bg-marca/10 text-marca-forte ring-marca/20 dark:bg-marca/15 dark:text-marca-clara dark:ring-marca/30",
    numero: "bg-marca text-white",
  },
  lima: {
    icone:
      "bg-chart-3/20 text-[color:color-mix(in_oklch,var(--chart-3),black_50%)] ring-chart-3/40 dark:bg-chart-3/10 dark:text-chart-3 dark:ring-chart-3/25",
    numero: "bg-lima text-tinta",
  },
  ambar: {
    icone:
      "bg-chart-4/15 text-[color:color-mix(in_oklch,var(--chart-4),black_45%)] ring-chart-4/35 dark:bg-chart-4/10 dark:text-chart-4 dark:ring-chart-4/25",
    numero: "bg-chart-4 text-tinta",
  },
  ciano: {
    icone:
      "bg-chart-2/15 text-[color:color-mix(in_oklch,var(--chart-2),black_40%)] ring-chart-2/35 dark:bg-chart-2/10 dark:text-chart-2 dark:ring-chart-2/25",
    numero: "bg-ciano text-tinta",
  },
} as const;

type Destaque = keyof typeof DESTAQUES;

/** As seções aparecem ao rolar; na impressão ficam sempre visíveis (mesmo as que não foram "reveladas"). */
const IMPRESSAO_VISIVEL = "print:opacity-100! print:transform-none!";

function Secao({
  id,
  titulo,
  descricao,
  icone: Icone,
  destaque,
  className,
  children,
}: {
  id: string;
  titulo: string;
  descricao?: string;
  icone: LucideIcon;
  destaque: Destaque;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Revelar
      como="section"
      y={16}
      quanto={0.1}
      transition={{ duration: 0.5 }}
      aria-labelledby={id}
      className={cn(ESTILO_CARD, "p-5 sm:p-7", IMPRESSAO_VISIVEL, className)}
    >
      <div className="flex items-start gap-3.5">
        <span aria-hidden="true" className={cn(ESTILO_ICONE_SECAO, DESTAQUES[destaque].icone)}>
          <Icone />
        </span>
        <div className="min-w-0">
          <h2 id={id} className="font-display text-xl font-bold tracking-tight text-foreground">
            {titulo}
          </h2>
          {descricao && <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{descricao}</p>}
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </Revelar>
  );
}

/** Número do item. Fica legível para leitores de tela, que nem sempre anunciam a posição na lista. */
function Numero({ valor, destaque }: { valor: number; destaque: Destaque }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold tabular-nums shadow-sm",
        DESTAQUES[destaque].numero,
      )}
    >
      {valor}
      <span className="sr-only">.</span>
    </span>
  );
}

/** O que a pessoa disse na conversa, num balão como o do WhatsApp. */
function Evidencia({ texto, rotulo = "Você disse:" }: { texto: string; rotulo?: string }) {
  return (
    <blockquote className="relative mt-3 rounded-2xl rounded-tl-md border border-border bg-muted/70 px-3.5 py-2.5 text-sm text-foreground/90 dark:bg-white/[0.04]">
      <span className="mb-0.5 block text-xs font-semibold text-muted-foreground">{rotulo} </span>
      <span className="italic">“{semAspas(texto)}”</span>
    </blockquote>
  );
}

/** Título + descrição de um item; nos relatórios antigos, um dos dois pode vir vazio ou repetido. */
function TextoItem({ titulo, descricao }: { titulo: string; descricao: string }) {
  const mostrarDescricao = descricao.trim() !== "" && descricao.trim() !== titulo.trim();
  return (
    <>
      {titulo && <p className="font-semibold leading-snug text-foreground">{titulo}</p>}
      {mostrarDescricao && (
        <p className={cn("leading-relaxed text-muted-foreground", titulo && "mt-1")}>{descricao}</p>
      )}
    </>
  );
}

/** Cartão numerado dos pontos fortes e de melhoria. */
function CartaoPonto({ numero, destaque, children }: { numero: number; destaque: Destaque; children: ReactNode }) {
  return (
    <li className="flex gap-3.5 rounded-2xl border border-border bg-background/60 p-4 break-inside-avoid transition-colors duration-300 hover:border-marca/25 dark:bg-white/[0.02]">
      <Numero valor={numero} destaque={destaque} />
      <div className="min-w-0 flex-1 pt-0.5">{children}</div>
    </li>
  );
}

interface RelatorioEntrevistaViewProps {
  entrevista: EntrevistaDetalhe;
  /** Link do WhatsApp da IA (config pública); sem ele, os botões de treino ficam ocultos. */
  whatsappLink: string | null;
  /**
   * "administracao": o relatório aparece dentro da tela da administração — o título vira h2 (a página já tem
   * o seu h1) e o plano de ação é só leitura (a lista de "feito" é do participante, não de quem administra).
   */
  modo?: "participante" | "administracao";
}

/** Dashboard do relatório de uma simulação de entrevista. */
export function RelatorioEntrevistaView({ entrevista, whatsappLink, modo = "participante" }: RelatorioEntrevistaViewProps) {
  const administracao = modo === "administracao";
  const Titulo = administracao ? "h2" : "h1";
  const rotuloEvidencia = administracao ? "O participante disse:" : "Você disse:";
  const r = entrevista.relatorio;
  const legado = r.versao === 0;
  // Formato antigo: sem nota nem competências (só as listas de texto)
  const nota = legado ? null : (r.notaGeral ?? entrevista.notaGeral);
  const classificacao = legado ? null : classificacaoEfetiva(r.classificacao, nota);

  // Registros antigos: se a API não montou as listas, usamos os campos de texto (uma linha = um item).
  const fortesApi = lista(r.pontosFortes);
  const melhoriaApi = lista(r.pontosMelhoria);
  const dicasApi = lista(r.dicasComunicacao);
  const pontosFortes: PontoForte[] = fortesApi.length
    ? fortesApi
    : linhasDoTexto(entrevista.pontosFortes).map((linha) => ({ titulo: "", descricao: linha }));
  const pontosMelhoria: PontoMelhoria[] = melhoriaApi.length
    ? melhoriaApi
    : linhasDoTexto(entrevista.pontosMelhoria).map((linha) => ({ titulo: "", descricao: linha, comoMelhorar: "" }));
  const dicas = dicasApi.length ? dicasApi : linhasDoTexto(entrevista.dicasComunicacao);
  const competencias = legado ? [] : lista(r.competencias);
  const planoDeAcao = lista(r.planoDeAcao);
  const perguntas = lista(r.perguntasParaPraticar);
  const exemplo = r.exemploResposta?.pergunta && r.exemploResposta.resposta ? r.exemploResposta : null;
  const data = formatarData(entrevista.dataRealizacao, "d 'de' MMMM 'de' yyyy, 'às' HH:mm");

  return (
    <div className="space-y-6">
      {/* Topo: nota, classificação, resumo e recomendação */}
      <Revelar
        como="section"
        y={12}
        transition={{ duration: 0.5 }}
        aria-labelledby="relatorio-titulo"
        className={cn(ESTILO_CARD, "relative isolate overflow-hidden", IMPRESSAO_VISIVEL)}
      >
        <div className="h-1 bg-gradient-to-r from-marca via-ciano to-lima print:hidden" aria-hidden="true" />
        {/* Luz suave no canto (só na tela) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -right-24 -z-10 size-80 rounded-full bg-marca/12 blur-3xl print:hidden dark:bg-marca/20"
        />
        <div className="flex flex-col gap-7 p-5 sm:p-8 md:flex-row md:items-start md:gap-10">
          {nota !== null && (
            <div className="flex flex-col items-center gap-3.5 md:w-44 md:shrink-0 md:pt-1">
              <AnelNota nota={nota} tamanho={152} rotulo={`Nota geral: ${formatarNota(nota)} de 10`} />
              <SeloClassificacao classificacao={classificacao} nota={nota} className="px-3 py-1 text-sm" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className={ESTILO_SOBRETITULO}>
              <span aria-hidden="true" className="size-1.5 rounded-full bg-lima" />
              Relatório da simulação
            </p>
            <Titulo
              id="relatorio-titulo"
              className="mt-3 font-display text-3xl leading-[1.08] font-bold tracking-tight break-words text-foreground sm:text-4xl"
            >
              {entrevista.cargoAlvo}
            </Titulo>
            <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
              {entrevista.empresaAlvo && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1 dark:bg-white/[0.03]">
                  <Building2 aria-hidden="true" className="size-4" />
                  {entrevista.empresaAlvo}
                </span>
              )}
              {data && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1 dark:bg-white/[0.03]">
                  <CalendarDays aria-hidden="true" className="size-4" />
                  <time dateTime={entrevista.dataRealizacao}>{data}</time>
                </span>
              )}
            </div>

            {classificacao && (
              <p className="mt-5 text-lg leading-snug font-semibold text-foreground">{MENSAGEM_CLASSIFICACAO[classificacao]}</p>
            )}
            {r.resumo && <p className="mt-3 leading-relaxed text-muted-foreground">{r.resumo}</p>}

            {r.recomendacao && (
              <div className="mt-6 flex gap-3.5 rounded-2xl border border-marca/20 bg-marca/[0.06] p-4 dark:border-marca/30 dark:bg-marca/10">
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-marca text-white shadow-sm shadow-marca/30"
                >
                  <Flag className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-marca-forte dark:text-marca-clara">Recomendação da recrutadora</p>
                  <p className="mt-0.5 leading-relaxed text-foreground">{r.recomendacao}</p>
                </div>
              </div>
            )}

            {legado && (
              <p className="mt-5 flex items-start gap-2 rounded-2xl bg-muted/70 p-3.5 text-sm text-muted-foreground">
                <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>
                  Relatório no formato antigo: ele foi gerado antes de termos notas e competências.
                  {!administracao && " Faça uma nova simulação para receber o relatório completo."}
                </span>
              </p>
            )}
          </div>
        </div>
      </Revelar>

      {competencias.length > 0 && (
        <Secao
          id="secao-competencias"
          titulo="Competências"
          descricao="Como você foi em cada ponto que os recrutadores observam."
          icone={Target}
          destaque="marca"
        >
          <ul className="grid gap-x-10 gap-y-7 md:grid-cols-2 print:grid-cols-1">
            {competencias.map((c, i) => (
              <li key={i}>
                <BarraCompetencia nome={c.nome} nota={c.nota} comentario={c.comentario} atraso={i * 0.08} />
              </li>
            ))}
          </ul>
        </Secao>
      )}

      {(pontosFortes.length > 0 || pontosMelhoria.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2 print:grid-cols-1">
          {pontosFortes.length > 0 && (
            <Secao
              id="secao-pontos-fortes"
              titulo="Pontos fortes"
              descricao="O que você já faz bem. Continue assim!"
              icone={ThumbsUp}
              destaque="lima"
            >
              <ol className="space-y-3">
                {pontosFortes.map((p, i) => (
                  <CartaoPonto key={i} numero={i + 1} destaque="lima">
                    <TextoItem titulo={p.titulo} descricao={p.descricao} />
                    {p.evidencia && <Evidencia texto={p.evidencia} rotulo={rotuloEvidencia} />}
                  </CartaoPonto>
                ))}
              </ol>
            </Secao>
          )}

          {pontosMelhoria.length > 0 && (
            <Secao
              id="secao-pontos-melhoria"
              titulo="Pontos de melhoria"
              descricao="O que vale treinar para a próxima entrevista."
              icone={TrendingUp}
              destaque="ambar"
            >
              <ol className="space-y-3">
                {pontosMelhoria.map((p, i) => (
                  <CartaoPonto key={i} numero={i + 1} destaque="ambar">
                    <TextoItem titulo={p.titulo} descricao={p.descricao} />
                    {p.evidencia && <Evidencia texto={p.evidencia} rotulo={rotuloEvidencia} />}
                    {p.comoMelhorar && (
                      <div className="mt-3 flex gap-2.5 rounded-xl border border-chart-4/35 bg-chart-4/10 p-3 dark:border-chart-4/20 dark:bg-chart-4/[0.07]">
                        <Lightbulb
                          aria-hidden="true"
                          className="mt-0.5 size-4 shrink-0 text-[color:color-mix(in_oklch,var(--chart-4),black_40%)] dark:text-chart-4"
                        />
                        <p className="text-sm leading-relaxed text-foreground">
                          <span className="font-semibold">Como melhorar: </span>
                          {p.comoMelhorar}
                        </p>
                      </div>
                    )}
                  </CartaoPonto>
                ))}
              </ol>
            </Secao>
          )}
        </div>
      )}

      {(planoDeAcao.length > 0 || dicas.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2 print:grid-cols-1">
          {planoDeAcao.length > 0 && (
            <Secao
              id="secao-plano-acao"
              titulo="Plano de ação"
              descricao={
                administracao
                  ? "Os próximos passos sugeridos ao participante."
                  : "Seus próximos passos. Marque o que já fez — fica salvo neste aparelho."
              }
              icone={ListChecks}
              destaque="ciano"
            >
              <PlanoDeAcao entrevistaId={entrevista.id} passos={planoDeAcao} somenteLeitura={administracao} />
            </Secao>
          )}

          {dicas.length > 0 && (
            <Secao
              id="secao-dicas"
              titulo="Dicas de comunicação"
              descricao="Pequenos ajustes que fazem diferença na conversa."
              icone={Sparkles}
              destaque="marca"
            >
              <ul className="space-y-2.5">
                {dicas.map((dica, i) => (
                  <li key={i} className="flex gap-3 rounded-2xl p-2 break-inside-avoid">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-marca/10 text-marca-forte dark:bg-marca/20 dark:text-marca-clara"
                    >
                      <Check className="size-3.5" strokeWidth={3} />
                    </span>
                    <span className="leading-relaxed text-foreground/90">{dica}</span>
                  </li>
                ))}
              </ul>
            </Secao>
          )}
        </div>
      )}

      {perguntas.length > 0 && (
        <Secao
          id="secao-perguntas"
          titulo="Perguntas para praticar"
          descricao={
            whatsappLink
              ? "Treine cada uma com a Helena no WhatsApp ou em voz alta, como se fosse a entrevista."
              : "Treine cada uma em voz alta ou com alguém de confiança, como se fosse a entrevista."
          }
          icone={MessagesSquare}
          destaque="ciano"
        >
          <ol className="space-y-2.5">
            {perguntas.map((pergunta, i) => {
              const link = linkWhatsappComTexto(whatsappLink, `Quero treinar esta pergunta de entrevista: "${pergunta}"`);
              return (
                <li
                  key={i}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-background/60 p-3.5 break-inside-avoid transition-colors duration-300 hover:border-marca/25 sm:flex-row sm:items-center dark:bg-white/[0.02]"
                >
                  <div className="flex min-w-0 flex-1 gap-3.5">
                    <Numero valor={i + 1} destaque="ciano" />
                    <p className="pt-1 leading-relaxed text-foreground">{pergunta}</p>
                  </div>
                  {link && (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 shrink-0 items-center gap-1.5 self-start rounded-full border border-border px-4 text-sm font-semibold text-marca-forte outline-none transition-colors hover:border-marca/35 hover:bg-marca/8 focus-visible:ring-3 focus-visible:ring-ring/50 sm:self-center dark:text-marca-clara dark:hover:bg-marca/15 print:hidden"
                    >
                      <MessageCircle aria-hidden="true" className="size-4" />
                      Treinar no WhatsApp
                      <span className="sr-only">: pergunta {i + 1} (abre em nova aba)</span>
                    </a>
                  )}
                </li>
              );
            })}
          </ol>
        </Secao>
      )}

      {exemplo && (
        <Secao
          id="secao-exemplo"
          titulo="Exemplo de resposta"
          descricao="Uma forma mais forte de responder a uma pergunta da sua entrevista."
          icone={MessageSquareQuote}
          destaque="lima"
        >
          {/* Conversa: a pergunta da recrutadora à esquerda e a resposta sugerida à direita */}
          <div className="space-y-3">
            <div className="max-w-2xl rounded-2xl rounded-tl-md border border-border bg-muted/70 p-4 break-inside-avoid dark:bg-white/[0.04]">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Pergunta da entrevista</p>
              <p className="mt-1 font-medium text-foreground">{exemplo.pergunta}</p>
            </div>
            <div className="ml-auto max-w-2xl rounded-2xl rounded-tr-md border border-chart-3/45 bg-chart-3/12 p-4 break-inside-avoid sm:ml-10 dark:border-chart-3/25 dark:bg-chart-3/[0.07]">
              <p className="text-xs font-semibold tracking-wide text-[color:color-mix(in_oklch,var(--chart-3),black_55%)] uppercase dark:text-chart-3">
                Como você poderia responder
              </p>
              <p className="mt-1 leading-relaxed whitespace-pre-line text-foreground">{exemplo.resposta}</p>
            </div>
          </div>
        </Secao>
      )}
    </div>
  );
}
