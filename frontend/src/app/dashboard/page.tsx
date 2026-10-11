"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Check,
  Equal,
  Gauge,
  Hourglass,
  Lightbulb,
  MessageCircle,
  Plus,
  RefreshCw,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { ResultadoFinalizacao } from "@/components/entrevistas/card-sessao-ativa";
import { BotaoCopiar } from "@/components/landing/botao-copiar";
import { BotaoWhatsapp, useLinkWhatsapp } from "@/components/layout/botao-whatsapp";
import { CURVA_IMPULSO, FundoAurora, Revelar, RevelarGrupo, RevelarItem } from "@/components/movimento";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, fetchApi, mensagemDeErro } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { CurriculoResumo, Paginado, ResumoEntrevistas } from "@/lib/tipos";
import { cn, formatarData, formatarNota, primeiroNome } from "@/lib/utils";

// ───────────────────────────── Carregamento de dados ─────────────────────────────

type Estado<T> =
  | { status: "carregando" }
  | { status: "ok"; dados: T }
  | { status: "erro"; mensagem: string };

/**
 * Busca um endpoint e permite recarregar. Num recarregamento "silencioso" (ex.: atualização
 * automática) os dados antigos continuam na tela e uma falha não apaga o que já estava lá.
 */
function useRecurso<T>(endpoint: string) {
  const [estado, setEstado] = useState<Estado<T>>({ status: "carregando" });
  const [versao, setVersao] = useState(0);
  const silencioso = useRef(false);

  useEffect(() => {
    let ativo = true;
    fetchApi<T>(endpoint).then(
      (dados) => {
        if (ativo) setEstado({ status: "ok", dados });
      },
      (erro: unknown) => {
        if (!ativo) return;
        setEstado((anterior) =>
          silencioso.current && anterior.status === "ok"
            ? anterior
            : { status: "erro", mensagem: mensagemDeErro(erro) },
        );
      },
    );
    return () => {
      ativo = false;
    };
  }, [endpoint, versao]);

  const recarregar = useCallback((emSegundoPlano = false) => {
    silencioso.current = emSegundoPlano;
    if (!emSegundoPlano) setEstado({ status: "carregando" });
    setVersao((v) => v + 1);
  }, []);

  return [estado, recarregar] as const;
}

/** Enquanto o relatório é gerado, o resumo é reconsultado sozinho neste intervalo. */
const INTERVALO_RELATORIO_MS = 45_000;

/** Cabeçalho das seções do painel: título em display + link opcional à direita. */
function CabecalhoSecao({ id, titulo, children }: { id: string; titulo: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <h2 id={id} className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
        {titulo}
      </h2>
      {children}
    </div>
  );
}

const classeLinkSecao =
  "group inline-flex items-center gap-1 rounded-full text-sm font-semibold text-marca-forte underline-offset-4 hover:underline dark:text-marca-clara";

// ───────────────────────────── Página ─────────────────────────────

export default function PaginaInicioPainel() {
  const { user } = useAuth();
  const [resumo, recarregarResumo] = useRecurso<ResumoEntrevistas>("/entrevistas/resumo");
  const [curriculos, recarregarCurriculos] = useRecurso<Paginado<CurriculoResumo>>("/curriculos?limite=3");

  const aguardandoRelatorio = resumo.status === "ok" && resumo.dados.sessaoAguardandoRelatorio;

  useEffect(() => {
    if (!aguardandoRelatorio) return;
    const intervalo = setInterval(() => {
      if (document.visibilityState === "visible") recarregarResumo(true);
    }, INTERVALO_RELATORIO_MS);
    return () => clearInterval(intervalo);
  }, [aguardandoRelatorio, recarregarResumo]);

  // O layout só renderiza a página com usuário logado
  if (!user) return null;

  const hoje = formatarData(new Date().toISOString(), { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="mx-auto max-w-6xl min-w-0 space-y-10">
      <Revelar y={14} transition={{ duration: 0.5 }}>
        <section
          aria-labelledby="saudacao"
          // "dark": a faixa é sempre escura — os tokens mudam só aqui dentro
          className="dark relative isolate overflow-hidden rounded-3xl bg-tinta p-6 text-foreground shadow-[0_30px_60px_-30px_rgb(20_16_40/0.55)] sm:p-10"
        >
          <FundoAurora intensidade="suave" />
          <div
            aria-hidden="true"
            className="fundo-grade pointer-events-none absolute inset-0 -z-10 text-white [mask-image:radial-gradient(60%_90%_at_85%_10%,black,transparent)]"
          />

          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl min-w-0 space-y-4">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-marca-clara uppercase">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-lima" />
                {hoje || "Seu painel"}
              </p>
              <h1 id="saudacao" className="font-display text-4xl leading-[1.05] font-bold tracking-tight text-white sm:text-5xl">
                Olá, <span className="texto-gradiente">{primeiroNome(user.nomeCompleto)}</span>!
              </h1>
              <p className="text-base leading-relaxed text-white/75 sm:text-lg">
                Monte seu currículo com ajuda da IA e treine entrevistas no WhatsApp. Cada simulação gera um relatório
                para você ver o que já manda bem e o que dá para melhorar.
              </p>
              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
                <Link
                  href="/dashboard/curriculo/novo"
                  className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-tinta shadow-[0_10px_30px_-12px_rgb(255_255_255/0.5)] transition-[background-color,transform] duration-200 hover:bg-white/90 focus-visible:ring-3 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-tinta focus-visible:outline-none active:scale-[0.97]"
                >
                  <Plus aria-hidden="true" className="size-5 transition-transform duration-300 group-hover:rotate-90" />
                  Criar currículo
                </Link>
                <BotaoWhatsapp className="h-12 rounded-full px-6 py-0" />
              </div>
            </div>

            <PrimeirosPassos resumo={resumo} curriculos={curriculos} />
          </div>
        </section>
      </Revelar>

      <BannerSessao estado={resumo} recarregar={recarregarResumo} />

      <section aria-labelledby="titulo-indicadores" className="space-y-4">
        <CabecalhoSecao id="titulo-indicadores" titulo="Seus treinos de entrevista">
          <Link href="/dashboard/entrevistas" className={classeLinkSecao}>
            Ver relatórios
            <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </CabecalhoSecao>
        <Indicadores estado={resumo} recarregar={() => recarregarResumo()} telefone={user.telefoneFormatado} />
      </section>

      {/* grid-cols-1 + min-w-0: no celular os cartões nunca passam da largura da tela */}
      <Revelar y={16} transition={{ duration: 0.5 }} className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-5">
        <section aria-labelledby="titulo-evolucao" className="min-w-0 lg:col-span-3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle id="titulo-evolucao">Evolução das notas</CardTitle>
              <CardDescription>Suas últimas simulações, da mais antiga para a mais recente (nota de 0 a 10).</CardDescription>
            </CardHeader>
            <CardContent>
              {resumo.status === "carregando" && <Skeleton className="h-52 w-full rounded-2xl" />}
              {resumo.status === "erro" && (
                <p className="text-sm text-muted-foreground">O gráfico aparece assim que os dados carregarem.</p>
              )}
              {resumo.status === "ok" && <GraficoEvolucao pontos={resumo.dados.evolucao} />}
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="titulo-curriculo" className="min-w-0 lg:col-span-2">
          <UltimoCurriculo estado={curriculos} recarregar={() => recarregarCurriculos()} />
        </section>
      </Revelar>

      <DicasIa />
    </div>
  );
}

// ───────────────────────────── Primeiros passos (na faixa de boas-vindas) ─────────────────────────────

/**
 * Lista curta do caminho na plataforma, marcada a partir dos dados reais da conta.
 * Cada passo pendente é um link para fazer aquilo. Some se algum dado não carregar.
 */
function PrimeirosPassos({
  resumo,
  curriculos,
}: {
  resumo: Estado<ResumoEntrevistas>;
  curriculos: Estado<Paginado<CurriculoResumo>>;
}) {
  if (resumo.status === "erro" || curriculos.status === "erro") return null;

  const carregando = resumo.status === "carregando" || curriculos.status === "carregando";
  const temCurriculo =
    curriculos.status === "ok" && (curriculos.dados.meta?.total ?? curriculos.dados.dados.length) > 0;
  const treinou = resumo.status === "ok" && (resumo.dados.total > 0 || resumo.dados.sessaoAtiva !== null);

  const passos: Array<{ rotulo: string; feito: boolean; href?: string }> = [
    { rotulo: "Criar sua conta", feito: true },
    { rotulo: "Montar seu currículo", feito: temCurriculo, href: "/dashboard/curriculo/novo" },
    { rotulo: "Treinar uma entrevista", feito: treinou, href: "/dashboard/entrevistas" },
  ];
  const feitos = passos.filter((passo) => passo.feito).length;
  const completo = feitos === passos.length;

  return (
    <div className="w-full shrink-0 rounded-3xl border border-white/10 bg-white/[0.05] p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] backdrop-blur-md lg:w-[22rem]">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-base font-semibold text-white">
          {completo ? "Tudo pronto para evoluir" : "Seus primeiros passos"}
        </p>
        {!carregando && (
          <p className="shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white/80 tabular-nums">
            {feitos} de {passos.length}
          </p>
        )}
      </div>

      {carregando ? (
        <div className="mt-4 space-y-2.5" aria-busy="true">
          <span className="sr-only">Carregando seus passos…</span>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <div aria-hidden="true" className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full origin-left rounded-full bg-gradient-to-r from-marca-clara via-ciano to-lima"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: feitos / passos.length }}
              transition={{ duration: 0.9, ease: CURVA_IMPULSO, delay: 0.2 }}
            />
          </div>
          <ol className="mt-4 space-y-1.5">
            {passos.map((passo) => {
              const conteudo = (
                <>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border",
                      passo.feito ? "border-transparent bg-lima text-tinta" : "border-white/25 text-white/60",
                    )}
                  >
                    {passo.feito && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                  <span className={cn("min-w-0 flex-1 text-sm", passo.feito ? "text-white/60 line-through decoration-white/30" : "font-medium text-white")}>
                    {passo.rotulo}
                    <span className="sr-only">{passo.feito ? " (feito)" : " (pendente)"}</span>
                  </span>
                  {!passo.feito && (
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-marca-clara transition-transform duration-200 group-hover:translate-x-0.5"
                    />
                  )}
                </>
              );
              return (
                <li key={passo.rotulo}>
                  {!passo.feito && passo.href ? (
                    <Link
                      href={passo.href}
                      className="group flex min-h-10 items-center gap-3 rounded-2xl px-2 py-1.5 transition-colors hover:bg-white/[0.07] focus-visible:ring-3 focus-visible:ring-white/50 focus-visible:outline-none"
                    >
                      {conteudo}
                    </Link>
                  ) : (
                    <div className="flex min-h-10 items-center gap-3 px-2 py-1.5">{conteudo}</div>
                  )}
                </li>
              );
            })}
          </ol>
          {completo && (
            <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-relaxed text-white/70">
              Agora é praticar: siga o plano de ação do último relatório e treine de novo.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ───────────────────────────── Sessão em andamento / relatório ─────────────────────────────

function tempoRelativo(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  return formatDistanceToNow(data, { addSuffix: true, locale: ptBR });
}

function BannerSessao({
  estado,
  recarregar,
}: {
  estado: Estado<ResumoEntrevistas>;
  recarregar: (emSegundoPlano?: boolean) => void;
}) {
  const { link: linkWhatsapp } = useLinkWhatsapp();
  const [confirmarAberto, setConfirmarAberto] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [erroFinalizar, setErroFinalizar] = useState("");
  const [aviso, setAviso] = useState<{ variante: "success" | "info"; texto: string } | null>(null);

  // Quando o relatório que estava "sendo preparado" fica pronto (pela atualização automática), avisa.
  // Comparação feita na renderização (padrão do React para reagir a mudança de props, sem efeito).
  const aguardandoAgora = estado.status === "ok" && estado.dados.sessaoAguardandoRelatorio;
  const [aguardandoAntes, setAguardandoAntes] = useState(aguardandoAgora);
  const [relatorioProntoId, setRelatorioProntoId] = useState<string | null>(null);
  if (estado.status === "ok" && aguardandoAntes !== aguardandoAgora) {
    setAguardandoAntes(aguardandoAgora);
    if (aguardandoAntes && !aguardandoAgora) {
      const recente = estado.dados.evolucao[estado.dados.evolucao.length - 1];
      setRelatorioProntoId(recente?.id ?? "");
      setAviso(null);
    }
  }

  async function finalizar() {
    setFinalizando(true);
    setErroFinalizar("");
    try {
      const resultado = await fetchApi<ResultadoFinalizacao>("/entrevistas/sessao-ativa/finalizar", {
        method: "POST",
      });
      setConfirmarAberto(false);
      // Mesmo critério da página Entrevistas: só FINALIZADA vai gerar relatório
      if (resultado?.status === "CANCELADA") {
        setAviso({
          variante: "info",
          texto:
            "Simulação encerrada. Ela teve poucas respostas para gerar um relatório — na próxima, responda mais algumas perguntas da Helena.",
        });
      } else if (resultado?.status === "ANALISADA") {
        setAviso({ variante: "info", texto: "Essa simulação já tinha sido analisada. O relatório está em Entrevistas." });
      } else {
        setAviso({
          variante: "success",
          texto:
            "Simulação encerrada! A IA está preparando seu relatório. Ele aparece em Entrevistas em alguns minutos e o link também chega no seu WhatsApp.",
        });
      }
      recarregar(true);
    } catch (erro) {
      if (erro instanceof ApiError && erro.status === 404) {
        setConfirmarAberto(false);
        setAviso({ variante: "info", texto: "Essa simulação já tinha sido encerrada." });
        recarregar(true);
      } else {
        setErroFinalizar(mensagemDeErro(erro));
      }
    } finally {
      setFinalizando(false);
    }
  }

  if (estado.status !== "ok") return null;
  const { sessaoAtiva, sessaoAguardandoRelatorio } = estado.dados;
  if (!sessaoAtiva && !sessaoAguardandoRelatorio && !aviso && relatorioProntoId === null) return null;

  return (
    <div className="space-y-4" aria-live="polite">
      {aviso && (
        <Alert variant={aviso.variante} role="status">
          {aviso.texto}
        </Alert>
      )}

      {relatorioProntoId !== null && (
        <Alert variant="success" title="Seu relatório ficou pronto!" role="status">
          <Link href={relatorioProntoId ? `/dashboard/entrevistas/${relatorioProntoId}` : "/dashboard/entrevistas"}>
            Ver o relatório da simulação
          </Link>
        </Alert>
      )}

      {sessaoAtiva && (
        <Alert variant="info" title="Você tem uma simulação em andamento">
          <p>
            Começou {tempoRelativo(sessaoAtiva.iniciadaEm)} · {sessaoAtiva.totalMensagens}{" "}
            {sessaoAtiva.totalMensagens === 1 ? "mensagem" : "mensagens"} até agora. Quando terminar a conversa, encerre
            para receber o relatório.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {linkWhatsapp && (
              <a
                href={linkWhatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "outline" }), "no-underline")}
              >
                <MessageCircle aria-hidden="true" />
                Continuar no WhatsApp
                <span className="sr-only"> (abre em nova aba)</span>
              </a>
            )}
            <Button type="button" onClick={() => setConfirmarAberto(true)}>
              Encerrar e gerar relatório
            </Button>
          </div>
        </Alert>
      )}

      {!sessaoAtiva && sessaoAguardandoRelatorio && (
        <Alert variant="warning" title="Seu relatório está sendo preparado" hideIcon>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2">
              <Hourglass aria-hidden="true" className="size-4 shrink-0 animate-pulso-suave" />A IA está analisando sua
              última simulação. Isso costuma levar alguns minutos — esta página se atualiza sozinha.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => recarregar(true)}>
              <RefreshCw aria-hidden="true" />
              Atualizar agora
            </Button>
          </div>
        </Alert>
      )}

      <Dialog
        open={confirmarAberto}
        onOpenChange={(aberto) => {
          if (!finalizando) setConfirmarAberto(aberto);
          if (!aberto) setErroFinalizar("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encerrar a simulação agora?</DialogTitle>
            <DialogDescription>
              A conversa com a recrutadora será encerrada e a IA vai gerar seu relatório com nota, pontos fortes e pontos
              de melhoria. Se você respondeu poucas perguntas, não vai dar para gerar o relatório. Para treinar de novo
              depois, é só mandar uma nova mensagem no WhatsApp.
            </DialogDescription>
          </DialogHeader>
          {erroFinalizar && <Alert variant="error">{erroFinalizar}</Alert>}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />} disabled={finalizando}>
              Continuar conversando
            </DialogClose>
            <Button type="button" onClick={finalizar} disabled={finalizando}>
              {finalizando ? "Encerrando…" : "Encerrar e gerar relatório"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ───────────────────────────── Indicadores ─────────────────────────────

interface IndicadorProps {
  rotulo: string;
  valor: string;
  icone: LucideIcon;
  detalhe?: string;
  /** Nota de 0 a 10: desenha a barrinha abaixo do número (o valor já está no texto). */
  nota?: number | null;
  rodape?: React.ReactNode;
}

function Indicador({ rotulo, valor, icone: Icone, detalhe, nota, rodape }: IndicadorProps) {
  const fracao = nota === null || nota === undefined ? null : Math.min(Math.max(nota, 0), 10) / 10;
  return (
    <Card className="group relative h-full overflow-hidden p-5 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-marca/25 sm:p-6 dark:hover:border-marca-clara/25">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{rotulo}</p>
        <span
          aria-hidden="true"
          className="flex size-9 items-center justify-center rounded-xl bg-marca-suave text-marca-forte transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 dark:bg-marca/15 dark:text-marca-clara"
        >
          <Icone className="size-[1.125rem]" />
        </span>
      </div>
      <p className="mt-3 font-display text-4xl font-bold tracking-tight tabular-nums">
        {valor}
        {detalhe && <span className="ml-1.5 font-sans text-base font-medium text-muted-foreground">{detalhe}</span>}
      </p>
      {fracao !== null && (
        // O trilho é quem "vê" a entrada na tela: a barra começa com largura zero e não seria detectada
        <motion.div
          aria-hidden="true"
          className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"
          initial="oculto"
          whileInView="visivel"
          viewport={{ once: true }}
        >
          <motion.div
            className="h-full origin-left rounded-full bg-marca dark:bg-marca-clara"
            variants={{
              oculto: { scaleX: 0 },
              visivel: { scaleX: fracao, transition: { duration: 0.9, ease: CURVA_IMPULSO, delay: 0.15 } },
            }}
          />
        </motion.div>
      )}
      {rodape && <div className="mt-3 text-xs font-medium text-muted-foreground">{rodape}</div>}
    </Card>
  );
}

/** Compara a última nota com a média — com ícone e texto (a cor nunca é a única pista). */
function ComparacaoMedia({ ultima, media }: { ultima: number | null; media: number | null }) {
  if (ultima === null || media === null) return null;
  const diferenca = Math.round((ultima - media) * 10) / 10;
  if (diferenca === 0) {
    return (
      <span className="inline-flex items-center gap-1">
        <Equal aria-hidden="true" className="size-3.5" />
        Igual à sua média
      </span>
    );
  }
  const subiu = diferenca > 0;
  const Icone = subiu ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        subiu ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300",
      )}
    >
      <Icone aria-hidden="true" className="size-3.5" />
      {formatarNota(Math.abs(diferenca))} {subiu ? "acima" : "abaixo"} da sua média
    </span>
  );
}

function Indicadores({
  estado,
  recarregar,
  telefone,
}: {
  estado: Estado<ResumoEntrevistas>;
  recarregar: () => void;
  telefone: string;
}) {
  if (estado.status === "carregando") {
    return (
      <div className="grid gap-4 sm:grid-cols-3" aria-busy="true">
        <span className="sr-only">Carregando seus indicadores…</span>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-36 rounded-3xl" />
        ))}
      </div>
    );
  }

  if (estado.status === "erro") {
    return (
      <Alert variant="warning" title="Não conseguimos carregar seus indicadores agora">
        <p>{estado.mensagem} Se o site acabou de ser atualizado, aguarde alguns segundos.</p>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={recarregar}>
          <RefreshCw aria-hidden="true" />
          Tentar de novo
        </Button>
      </Alert>
    );
  }

  const { total, mediaNota, ultimaNota } = estado.dados;

  if (total === 0) {
    return (
      <Card className="relative flex flex-col gap-5 overflow-hidden p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-[radial-gradient(circle,color-mix(in_oklch,var(--marca)_14%,transparent),transparent_70%)]"
        />
        <div className="relative flex min-w-0 gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-marca-suave text-marca-forte dark:bg-marca/15 dark:text-marca-clara">
            <Bot aria-hidden="true" className="size-6" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="font-display text-lg font-semibold">Você ainda não fez nenhuma simulação</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Mande uma mensagem para a recrutadora virtual no WhatsApp. Use o número {telefone || "cadastrado na sua conta"}{" "}
              — é por ele que ela reconhece você.
            </p>
          </div>
        </div>
        <BotaoWhatsapp semNumero="em-breve" className="relative shrink-0 rounded-full">
          Começar a treinar
        </BotaoWhatsapp>
      </Card>
    );
  }

  return (
    <RevelarGrupo className="grid gap-4 sm:grid-cols-3">
      <RevelarItem className="min-w-0">
        <Indicador
          rotulo="Simulações feitas"
          valor={total.toLocaleString("pt-BR")}
          icone={Bot}
          rodape={total === 1 ? "Primeiro treino concluído" : "Cada treino conta"}
        />
      </RevelarItem>
      <RevelarItem className="min-w-0">
        <Indicador
          rotulo="Média das notas"
          valor={formatarNota(mediaNota)}
          detalhe={mediaNota === null ? undefined : "de 10"}
          icone={Gauge}
          nota={mediaNota}
        />
      </RevelarItem>
      <RevelarItem className="min-w-0">
        <Indicador
          rotulo="Última nota"
          valor={formatarNota(ultimaNota)}
          detalhe={ultimaNota === null ? undefined : "de 10"}
          icone={Star}
          nota={ultimaNota}
          rodape={total > 1 ? <ComparacaoMedia ultima={ultimaNota} media={mediaNota} /> : undefined}
        />
      </RevelarItem>
    </RevelarGrupo>
  );
}

// ───────────────────────────── Gráfico de evolução (SVG simples) ─────────────────────────────

const NOTA_MAXIMA = 10;

function GraficoEvolucao({ pontos }: { pontos: ResumoEntrevistas["evolucao"] }) {
  const validos = pontos.filter((p) => Number.isFinite(p.nota));
  const reduzir = useReducedMotion();
  // Id do degradê da área (sem os caracteres especiais do useId, que atrapalham o url(#…))
  const idDegrade = `degrade-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  if (validos.length < 2) {
    return (
      <div className="flex h-52 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center">
        <span
          aria-hidden="true"
          className="mb-1 flex size-10 items-center justify-center rounded-xl bg-marca-suave text-marca-forte dark:bg-marca/15 dark:text-marca-clara"
        >
          <TrendingUp className="size-5" />
        </span>
        <p className="font-medium">Seu gráfico aparece aqui</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {validos.length === 1
            ? `Sua primeira nota foi ${formatarNota(validos[0].nota)}. Faça mais uma simulação para ver sua evolução.`
            : "Depois de duas simulações com relatório, você vê aqui como suas notas estão evoluindo."}
        </p>
      </div>
    );
  }

  // Coordenadas em % da área do gráfico: x espalha os pontos, y = 0 no topo (nota 10)
  const coordenadas = validos.map((p, i) => ({
    ...p,
    x: (i / (validos.length - 1)) * 100,
    y: (1 - Math.min(Math.max(p.nota, 0), NOTA_MAXIMA) / NOTA_MAXIMA) * 100,
    dataCurta: formatarData(p.data, { day: "2-digit", month: "2-digit" }),
  }));
  const linha = coordenadas.map((c, i) => `${i ? "L" : "M"}${c.x},${c.y}`).join(" ");
  const area = `${linha} L100,100 L0,100 Z`;
  const ultimo = coordenadas[coordenadas.length - 1];
  const descricao = `Notas das últimas ${coordenadas.length} simulações: ${coordenadas
    .map((c) => `${formatarNota(c.nota)} em ${c.dataCurta}`)
    .join("; ")}.`;

  return (
    <figure className="min-w-0">
      {/* pt-7: espaço para o rótulo e as dicas dos pontos perto da nota 10 */}
      <div className="flex min-w-0 gap-2 pt-7">
        {/* Eixo Y (texto em HTML para não encolher no celular) */}
        <div aria-hidden="true" className="relative h-48 w-6 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
          {[10, 5, 0].map((valor) => (
            <span key={valor} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - valor * 10}%` }}>
              {valor}
            </span>
          ))}
        </div>

        {/* O contêiner (sempre visível) dispara a entrada; a área recortada e os pontos seguem as variantes */}
        <motion.div
          className="relative mx-2 h-48 min-w-0 flex-1"
          initial={reduzir ? false : "oculto"}
          whileInView="visivel"
          viewport={{ once: true, amount: 0.4 }}
        >
          {/* Linhas de grade fixas; a área e a linha "se desenham" da esquerda para a direita */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="absolute inset-0 h-full w-full overflow-visible"
          >
            {[0, 50, 100].map((y) => (
              <line
                key={y}
                x1={0}
                x2={100}
                y1={y}
                y2={y}
                vectorEffect="non-scaling-stroke"
                strokeWidth={1}
                strokeDasharray={y === 100 ? undefined : "3 4"}
                className="stroke-border"
              />
            ))}
          </svg>
          <motion.div
            aria-hidden="true"
            className="absolute inset-0"
            variants={{
              oculto: { clipPath: "inset(-10% 100% -10% 0%)" },
              visivel: {
                clipPath: "inset(-10% 0% -10% 0%)",
                transition: { duration: 1.1, ease: CURVA_IMPULSO, delay: 0.15 },
              },
            }}
          >
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
              <defs>
                <linearGradient id={idDegrade} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" style={{ stopColor: "var(--chart-1)", stopOpacity: 0.28 }} />
                  <stop offset="100%" style={{ stopColor: "var(--chart-1)", stopOpacity: 0 }} />
                </linearGradient>
              </defs>
              <path d={area} fill={`url(#${idDegrade})`} />
              <path
                d={linha}
                fill="none"
                vectorEffect="non-scaling-stroke"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                className="stroke-chart-1"
              />
            </svg>
          </motion.div>

          {/* Pontos em HTML (ficam redondos em qualquer largura); cada um abre o relatório */}
          {coordenadas.map((c, i) => {
            const alinhamento =
              i === 0 ? "left-0" : i === coordenadas.length - 1 ? "right-0" : "left-1/2 -translate-x-1/2";
            return (
              <Link
                key={c.id}
                href={`/dashboard/entrevistas/${c.id}`}
                aria-label={`Nota ${formatarNota(c.nota)} em ${formatarData(c.data)} — abrir relatório`}
                className="group absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-ring"
                style={{ left: `${c.x}%`, top: `${c.y}%` }}
              >
                <motion.span
                  variants={{
                    oculto: { scale: 0 },
                    visivel: {
                      scale: 1,
                      transition: { duration: 0.4, ease: CURVA_IMPULSO, delay: 0.3 + (i / coordenadas.length) * 0.9 },
                    },
                  }}
                  className="size-3 rounded-full bg-chart-1 ring-[3px] ring-card transition-transform group-hover:scale-125"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute bottom-full z-10 mb-1 hidden rounded-lg bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background shadow-lg group-hover:block group-focus-visible:block",
                    alinhamento,
                  )}
                >
                  <strong className="font-semibold">{formatarNota(c.nota)}</strong> · {c.dataCurta}
                </span>
              </Link>
            );
          })}

          {/* Valor do último ponto escrito logo acima dele */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-0 -translate-y-full pb-2.5 font-display text-sm font-bold text-foreground"
            style={{ top: `${ultimo.y}%` }}
          >
            {formatarNota(ultimo.nota)}
          </span>
        </motion.div>
      </div>

      {/* Eixo X: primeira e última data */}
      <div aria-hidden="true" className="mt-2 flex justify-between pr-2 pl-10 text-xs text-muted-foreground tabular-nums">
        <span>{coordenadas[0].dataCurta}</span>
        <span>{ultimo.dataCurta}</span>
      </div>

      <figcaption className="sr-only">{descricao}</figcaption>

      <details className="group/tabela mt-5 rounded-2xl border border-border text-sm open:bg-muted/30">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-2xl px-4 font-medium text-marca-forte select-none dark:text-marca-clara [&::-webkit-details-marker]:hidden">
          Ver as notas em tabela
          <Plus aria-hidden="true" className="size-4 transition-transform duration-200 group-open/tabela:rotate-45" />
        </summary>
        <div className="px-4 pb-3">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th scope="col" className="py-2 font-medium">
                  Data
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Nota
                </th>
              </tr>
            </thead>
            <tbody>
              {coordenadas.map((c) => (
                <tr key={c.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2">{formatarData(c.data)}</td>
                  <td className="py-2 text-right font-semibold tabular-nums">{formatarNota(c.nota)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

// ───────────────────────────── Último currículo ─────────────────────────────

function UltimoCurriculo({
  estado,
  recarregar,
}: {
  estado: Estado<Paginado<CurriculoResumo>>;
  recarregar: () => void;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle id="titulo-curriculo">Seu currículo</CardTitle>
        <CardDescription>Abra para editar, revisar ou baixar em PDF.</CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-1 flex-col">
        {estado.status === "carregando" && (
          <div className="space-y-3" aria-busy="true">
            <span className="sr-only">Carregando seus currículos…</span>
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-10 w-2/3 rounded-full" />
          </div>
        )}

        {estado.status === "erro" && (
          <Alert variant="warning" title="Não conseguimos carregar seus currículos">
            <p>{estado.mensagem}</p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={recarregar}>
              <RefreshCw aria-hidden="true" />
              Tentar de novo
            </Button>
          </Alert>
        )}

        {estado.status === "ok" && <ConteudoUltimoCurriculo pagina={estado.dados} />}
      </CardContent>
    </Card>
  );
}

/** Miniatura decorativa de uma folha A4 (só HTML/CSS). */
function MiniaturaFolha({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative flex aspect-[210/297] w-16 shrink-0 flex-col gap-1 overflow-hidden rounded-lg border border-border bg-white p-1.5 shadow-[0_8px_20px_-10px_rgb(20_16_40/0.35)] transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105",
        className,
      )}
    >
      <span className="h-2.5 rounded-sm bg-[#1e3a5f]" />
      <span className="h-1 w-3/4 rounded-full bg-slate-300" />
      <span className="h-1 w-1/2 rounded-full bg-slate-200" />
      <span className="mt-0.5 h-1 rounded-full bg-sky-200" />
      <span className="h-1 w-5/6 rounded-full bg-slate-200" />
      <span className="h-1 w-2/3 rounded-full bg-slate-200" />
      <span className="mt-0.5 h-1 rounded-full bg-sky-200" />
      <span className="h-1 w-4/5 rounded-full bg-slate-200" />
    </div>
  );
}

function ConteudoUltimoCurriculo({ pagina }: { pagina: Paginado<CurriculoResumo> }) {
  const ultimo = pagina.dados[0];

  if (!ultimo) {
    return (
      <div className="flex flex-1 flex-col items-start justify-between gap-5">
        <div className="flex min-w-0 items-center gap-4">
          <MiniaturaFolha className="opacity-60 grayscale" />
          <p className="min-w-0 text-sm leading-relaxed text-muted-foreground">
            Você ainda não criou um currículo. Conte sua história digitando ou gravando um áudio — a IA organiza tudo no
            formato certo.
          </p>
        </div>
        <Link href="/dashboard/curriculo/novo" className={buttonVariants()}>
          <Plus aria-hidden="true" />
          Criar meu currículo
        </Link>
      </div>
    );
  }

  const titulo = ultimo.titulo || ultimo.cargoDesejado || "Currículo sem título";
  const total = pagina.meta?.total ?? pagina.dados.length;

  return (
    <div className="flex min-w-0 flex-1 flex-col justify-between gap-6">
      <div className="group flex min-w-0 items-center gap-4 rounded-2xl border border-border bg-muted/40 p-3 pr-4 dark:bg-white/[0.03]">
        <MiniaturaFolha />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate font-semibold" title={titulo}>
            {titulo}
          </p>
          {ultimo.cargoDesejado && ultimo.titulo && (
            <p className="truncate text-sm text-muted-foreground">{ultimo.cargoDesejado}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Atualizado em {formatarData(ultimo.atualizadoEm || ultimo.geradoEm)}
          </p>
          {ultimo.refinadoPorIa && (
            <span className="inline-flex items-center gap-1 rounded-full bg-marca-suave px-2 py-0.5 text-xs font-semibold text-marca-forte dark:bg-marca/15 dark:text-marca-clara">
              <Sparkles aria-hidden="true" className="size-3" />
              Melhorado com IA
            </span>
          )}
        </div>
      </div>

      <p className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
        <Lightbulb aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-marca-forte dark:text-marca-clara" />
        <span>
          Antes de se candidatar, adapte o currículo à vaga: destaque o que ela pede e revise cada informação.
        </span>
      </p>

      <div className="flex flex-wrap gap-2">
        <Link href={`/dashboard/curriculo/${ultimo.id}`} className={buttonVariants()}>
          Abrir currículo
          <ArrowUpRight aria-hidden="true" data-icon="seta" />
        </Link>
        <Link href="/dashboard/curriculo" className={buttonVariants({ variant: "outline" })}>
          {total > 1 ? `Ver todos (${total})` : "Ver currículos"}
        </Link>
      </div>
    </div>
  );
}

// ───────────────────────────── Dicas de letramento digital ─────────────────────────────

const DICAS: Array<{ titulo: string; texto: string; prompt: string; icone: LucideIcon }> = [
  {
    titulo: "Dê contexto",
    texto: "Quanto mais a IA souber sobre você e o objetivo, melhor a resposta. Experimente:",
    prompt: "Aja como um recrutador. Vou colar minha carta de apresentação e quero saber o que posso melhorar.",
    icone: Lightbulb,
  },
  {
    titulo: "Pergunte o porquê",
    texto: "Não entendeu um ponto do relatório? Peça exemplos até ficar claro:",
    prompt: "Por que minha resposta sobre defeitos ficou fraca? Me mostre um exemplo de resposta melhor.",
    icone: Sparkles,
  },
];

function DicasIa() {
  return (
    <section aria-labelledby="titulo-dicas" className="space-y-4">
      <CabecalhoSecao id="titulo-dicas" titulo="Dicas para usar IA no dia a dia">
        <Link href="/#prompts" className={classeLinkSecao}>
          Mais prompts no guia
          <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </CabecalhoSecao>
      <RevelarGrupo className="grid gap-4 md:grid-cols-2">
        {DICAS.map(({ titulo, texto, prompt, icone: Icone }) => (
          <RevelarItem key={titulo} className="min-w-0">
            <Card className="group flex h-full flex-col p-5 transition-[border-color] duration-300 hover:border-marca/25 sm:p-6 dark:hover:border-marca-clara/25">
              <h3 className="flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight">
                <span
                  aria-hidden="true"
                  className="flex size-8 items-center justify-center rounded-lg bg-marca-suave text-marca-forte dark:bg-marca/15 dark:text-marca-clara"
                >
                  <Icone className="size-4" />
                </span>
                {titulo}
              </h3>
              <p className="mt-2 mb-4 text-sm leading-relaxed text-muted-foreground">{texto}</p>
              <div className="mt-auto rounded-2xl border border-border bg-muted/50 p-4 dark:bg-white/[0.03]">
                <p className="font-mono text-[0.8125rem] leading-relaxed text-foreground">“{prompt}”</p>
                <div className="mt-3 flex justify-end">
                  <BotaoCopiar texto={prompt} rotulo="Copiar prompt" />
                </div>
              </div>
            </Card>
          </RevelarItem>
        ))}
      </RevelarGrupo>
    </section>
  );
}
