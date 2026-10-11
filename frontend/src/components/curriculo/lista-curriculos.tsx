"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  AudioLines,
  Eye,
  FileDown,
  History,
  LoaderCircle,
  Pencil,
  Plus,
  RotateCw,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { CartaoHolofote, CURVA_IMPULSO, Revelar } from "@/components/movimento";
import { ApiError, fetchApi, mensagemDeErro } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { CurriculoResumo, Paginado } from "@/lib/tipos";
import { formatarData } from "@/lib/utils";
import { chaves, remover, useArmazenamento } from "./armazenamento";
import {
  classeBotaoPerigo,
  classeBotaoPrimario,
  classeBotaoSecundario,
  classeCartao,
  classeErro,
  classeRecado,
  classeSeloIa,
  classeSobretitulo,
} from "./campos";
import { DialogoConfirmacao } from "./dialogo-confirmacao";

const POR_PAGINA = 12;

type Estado =
  | { tipo: "carregando" }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "ok"; itens: CurriculoResumo[]; total: number };

function tituloDe(c: CurriculoResumo): string {
  return c.titulo?.trim() || (c.cargoDesejado?.trim() ? `Currículo – ${c.cargoDesejado.trim()}` : "Currículo sem título");
}

/** Junta páginas sem repetir itens (a lista pode ter mudado entre uma página e outra). */
function juntar(atuais: CurriculoResumo[], novos: CurriculoResumo[]): CurriculoResumo[] {
  const ids = new Set(atuais.map((c) => c.id));
  return [...atuais, ...novos.filter((c) => !ids.has(c.id))];
}

/** Lista de currículos do usuário: abrir, editar e excluir (com confirmação). */
export function ListaCurriculos() {
  const { user } = useAuth();
  const rascunho = useArmazenamento("local", user ? chaves.rascunho(user.id) : null);
  const [estado, setEstado] = useState<Estado>({ tipo: "carregando" });
  const [tentativa, setTentativa] = useState(0);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erroMais, setErroMais] = useState<string | null>(null);
  const [paraExcluir, setParaExcluir] = useState<CurriculoResumo | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);
  const [anuncio, setAnuncio] = useState("");
  const tituloRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let ativo = true;
    fetchApi<Paginado<CurriculoResumo>>(`/curriculos?pagina=1&limite=${POR_PAGINA}`)
      .then((r) => {
        if (ativo) setEstado({ tipo: "ok", itens: r?.dados ?? [], total: r?.meta?.total ?? 0 });
      })
      .catch((e: unknown) => {
        if (ativo) setEstado({ tipo: "erro", mensagem: mensagemDeErro(e, "Não foi possível carregar seus currículos.") });
      });
    return () => {
      ativo = false;
    };
  }, [tentativa]);

  function tentarDeNovo() {
    setEstado({ tipo: "carregando" });
    setTentativa((t) => t + 1);
  }

  async function carregarMais() {
    if (estado.tipo !== "ok" || carregandoMais) return;
    setCarregandoMais(true);
    setErroMais(null);
    // A página é calculada pelo que já está na tela: depois de excluir, nada fica pulado
    const pagina = Math.floor(estado.itens.length / POR_PAGINA) + 1;
    try {
      const r = await fetchApi<Paginado<CurriculoResumo>>(`/curriculos?pagina=${pagina}&limite=${POR_PAGINA}`);
      setEstado((atual) =>
        atual.tipo === "ok" ? { tipo: "ok", itens: juntar(atual.itens, r?.dados ?? []), total: r?.meta?.total ?? atual.total } : atual,
      );
    } catch (e) {
      setErroMais(mensagemDeErro(e, "Não foi possível carregar mais currículos."));
    } finally {
      setCarregandoMais(false);
    }
  }

  function pedirExclusao(c: CurriculoResumo) {
    setErroExclusao(null);
    setParaExcluir(c);
  }

  async function confirmarExclusao() {
    if (!paraExcluir || excluindo) return;
    const alvo = paraExcluir;
    setExcluindo(true);
    setErroExclusao(null);
    try {
      await fetchApi(`/curriculos/${encodeURIComponent(alvo.id)}`, { method: "DELETE" });
    } catch (e) {
      // 404: já não existia — para quem usa, dá no mesmo
      if (!(e instanceof ApiError && e.status === 404)) {
        setErroExclusao(mensagemDeErro(e, "Não foi possível excluir agora. Tente de novo."));
        setExcluindo(false);
        return;
      }
    }
    // A foto e os avisos guardados no navegador saem junto
    remover("local", chaves.foto(alvo.id));
    remover("sessao", chaves.geracao(alvo.id));
    setEstado((atual) =>
      atual.tipo === "ok"
        ? { tipo: "ok", itens: atual.itens.filter((c) => c.id !== alvo.id), total: Math.max(0, atual.total - 1) }
        : atual,
    );
    setAnuncio(`“${tituloDe(alvo)}” foi excluído.`);
    setExcluindo(false);
    setParaExcluir(null);
    // O botão que abriu o diálogo sumiu junto com o cartão: o foco vai para o título da página
    window.requestAnimationFrame(() => tituloRef.current?.focus());
  }

  const temRascunho = Boolean(rascunho);

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      <Revelar y={12} transition={{ duration: 0.45 }}>
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className={classeSobretitulo}>
              <span aria-hidden="true" className="size-1.5 rounded-full bg-lima" />
              Currículo
            </p>
            <h1
              ref={tituloRef}
              tabIndex={-1}
              className="mt-3 font-display text-3xl leading-[1.08] font-bold tracking-tight text-foreground outline-none sm:text-4xl"
            >
              Meus currículos
            </h1>
            <p className="mt-2 max-w-2xl leading-relaxed text-muted-foreground">
              Monte seu currículo em poucos minutos, deixe a IA caprichar no texto e baixe em PDF quando quiser.
            </p>
          </div>
          <Link href="/dashboard/curriculo/novo" className={`${classeBotaoPrimario} group shrink-0 px-6`}>
            <Plus className="size-4 transition-transform duration-300 group-hover:rotate-90" aria-hidden="true" />
            Criar novo currículo
          </Link>
        </header>
      </Revelar>

      <p className="sr-only" role="status" aria-live="polite">
        {anuncio}
      </p>

      <AnimatePresence initial={false}>
        {temRascunho && (
          <motion.div
            key="rascunho"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: CURVA_IMPULSO }}
            className="overflow-hidden"
          >
            <div
              className={`${classeRecado} flex flex-col gap-3 p-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:pl-5`}
            >
              <p className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-marca/12 text-marca-forte dark:text-marca-clara">
                  <History className="size-4" aria-hidden="true" />
                </span>
                <span>
                  <strong className="font-semibold">Tem um currículo pela metade</strong> salvo neste navegador.
                </span>
              </p>
              <Link href="/dashboard/curriculo/novo" className={`${classeBotaoSecundario} group min-h-10 shrink-0`}>
                Continuar de onde parei
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {estado.tipo === "carregando" && (
        <div aria-busy="true">
          <p className="sr-only" role="status">
            Carregando seus currículos…
          </p>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className={`${classeCartao} overflow-hidden`}>
                <div className="h-36 animate-pulse bg-muted dark:bg-white/[0.04]" />
                <div className="space-y-3 p-5">
                  <div className="h-5 w-3/4 animate-pulse rounded-full bg-muted dark:bg-white/[0.06]" />
                  <div className="h-4 w-1/2 animate-pulse rounded-full bg-muted dark:bg-white/[0.06]" />
                  <div className="h-10 w-full animate-pulse rounded-full bg-muted dark:bg-white/[0.06]" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {estado.tipo === "erro" && (
        <div
          role="alert"
          className={`${classeErro} flex flex-col items-start gap-3 p-5 text-sm sm:flex-row sm:items-center sm:justify-between`}
        >
          <p className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            {estado.mensagem}
          </p>
          <button type="button" onClick={tentarDeNovo} className={`${classeBotaoSecundario} shrink-0`}>
            <RotateCw className="size-4" aria-hidden="true" />
            Tentar de novo
          </button>
        </div>
      )}

      {estado.tipo === "ok" && estado.itens.length === 0 && <EstadoVazio />}

      {estado.tipo === "ok" && estado.itens.length > 0 && (
        <>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {estado.itens.map((c, i) => (
                <CartaoCurriculo key={c.id} curriculo={c} ordem={i % POR_PAGINA} onExcluir={() => pedirExclusao(c)} />
              ))}
            </AnimatePresence>
          </ul>

          {estado.itens.length < estado.total && (
            <div className="flex flex-col items-center gap-2">
              <button type="button" onClick={carregarMais} disabled={carregandoMais} className={classeBotaoSecundario}>
                {carregandoMais && <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />}
                {carregandoMais ? "Carregando…" : "Mostrar mais currículos"}
              </button>
              {erroMais && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {erroMais}
                </p>
              )}
            </div>
          )}
        </>
      )}

      <DialogoConfirmacao
        aberto={paraExcluir !== null}
        titulo="Excluir este currículo?"
        descricao={paraExcluir ? `“${tituloDe(paraExcluir)}” será apagado de vez. Não dá para desfazer.` : ""}
        textoConfirmar={excluindo ? "Excluindo…" : "Excluir currículo"}
        textoCancelar="Manter"
        perigoso
        processando={excluindo}
        erro={erroExclusao}
        onConfirmar={confirmarExclusao}
        onCancelar={() => setParaExcluir(null)}
      />
    </div>
  );
}

/** Miniatura ilustrativa de uma folha de currículo (só decoração: a informação está no texto do cartão). */
function MiniaturaFolha({ destaque = false }: { destaque?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`relative w-24 rounded-lg bg-white p-2.5 shadow-lg ring-1 shadow-tinta/15 ring-tinta/5 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1 group-hover:rotate-0 dark:shadow-black/40 ${destaque ? "-rotate-4" : "-rotate-3"}`}
    >
      <div className="-mx-2.5 -mt-2.5 mb-2 h-4 rounded-t-lg bg-gradient-to-r from-marca to-ciano" />
      <div className="flex items-center gap-1.5">
        <span className="size-4 shrink-0 rounded-full bg-marca/20 ring-2 ring-marca/40" />
        <span className="h-1.5 flex-1 rounded-full bg-tinta/70" />
      </div>
      <div className="mt-2 space-y-1">
        <span className="block h-1 w-full rounded-full bg-tinta/15" />
        <span className="block h-1 w-5/6 rounded-full bg-tinta/15" />
        <span className="block h-1 w-2/3 rounded-full bg-tinta/15" />
      </div>
      <div className="mt-2 flex gap-1">
        <span className="h-1.5 w-5 rounded-full bg-ciano/60" />
        <span className="h-1.5 w-4 rounded-full bg-marca/40" />
        <span className="h-1.5 w-6 rounded-full bg-lima/80" />
      </div>
      <div className="mt-2 space-y-1">
        <span className="block h-1 w-full rounded-full bg-tinta/10" />
        <span className="block h-1 w-3/4 rounded-full bg-tinta/10" />
      </div>
    </div>
  );
}

function EstadoVazio() {
  const passos = [
    { icone: AudioLines, titulo: "Conte do seu jeito", texto: "Escreva ou grave um áudio sobre você." },
    { icone: Sparkles, titulo: "A IA organiza", texto: "Ela melhora a escrita sem inventar nada." },
    { icone: FileDown, titulo: "Baixe em PDF", texto: "Pronto para mandar para as vagas." },
  ];
  return (
    <Revelar y={16} transition={{ duration: 0.55 }}>
      <section className={`${classeCartao} group relative overflow-hidden px-6 py-12 text-center sm:px-10`}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 fundo-grade text-foreground opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute -top-32 left-1/2 size-80 -translate-x-1/2 rounded-full bg-marca/15 blur-3xl" />
        <div className="relative mx-auto flex w-fit justify-center motion-safe:animate-flutuar">
          <MiniaturaFolha destaque />
        </div>
        <h2 className="relative mt-8 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Seu primeiro currículo começa aqui
        </h2>
        <p className="relative mx-auto mt-3 max-w-md leading-relaxed text-muted-foreground">
          Responda algumas perguntas sobre você — vale bico, voluntariado e projeto da escola — e a gente monta um
          currículo caprichado, pronto para baixar em PDF. Leva uns 5 minutos.
        </p>
        <ol className="relative mx-auto mt-8 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
          {passos.map(({ icone: Icone, titulo, texto }, i) => (
            <li key={titulo} className="flex items-start gap-3 rounded-2xl border border-border bg-background/60 p-3.5 dark:bg-white/[0.02]">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-marca/10 text-marca-forte dark:bg-marca/15 dark:text-marca-clara">
                <Icone className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  <span className="sr-only">Passo {i + 1}: </span>
                  {titulo}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{texto}</span>
              </span>
            </li>
          ))}
        </ol>
        <Link href="/dashboard/curriculo/novo" className={`${classeBotaoPrimario} relative mt-8 px-6`}>
          <Sparkles className="size-4" aria-hidden="true" />
          Criar meu primeiro currículo
        </Link>
      </section>
    </Revelar>
  );
}

function CartaoCurriculo({
  curriculo: c,
  ordem,
  onExcluir,
}: {
  curriculo: CurriculoResumo;
  /** Posição na página carregada (escalona a entrada). */
  ordem: number;
  onExcluir: () => void;
}) {
  const titulo = tituloDe(c);
  const subtitulo = c.titulo?.trim() && c.cargoDesejado?.trim() ? c.cargoDesejado.trim() : null;
  const data = formatarData(c.atualizadoEm || c.geradoEm);
  const href = `/dashboard/curriculo/${encodeURIComponent(c.id)}`;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.55, ease: CURVA_IMPULSO, delay: Math.min(ordem, 8) * 0.07 } }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.25, ease: CURVA_IMPULSO } }}
      className="h-full"
    >
      <CartaoHolofote
        className={`${classeCartao} group flex h-full flex-col overflow-hidden transition-[box-shadow,border-color,translate] duration-300 hover:-translate-y-0.5 hover:border-marca/30 hover:shadow-lg hover:shadow-marca/[0.08] focus-within:border-marca/30`}
      >
        {/* Vitrine com a miniatura da folha */}
        <div className="relative flex h-36 items-end justify-center overflow-hidden border-b border-border bg-gradient-to-b from-marca/[0.07] to-transparent pt-6 dark:from-marca/[0.12]">
          <div aria-hidden="true" className="absolute inset-0 fundo-grade text-foreground opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
          <div className="relative -mb-6">
            <MiniaturaFolha />
          </div>
          {c.refinadoPorIa && (
            <span className={`${classeSeloIa} absolute top-3 left-3 bg-card/90 backdrop-blur dark:bg-card/80`}>
              <Sparkles className="size-3.5" aria-hidden="true" />
              Refinado pela IA
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <h2 className="line-clamp-2 font-display text-lg leading-snug font-semibold tracking-tight break-words text-foreground">
            {titulo}
          </h2>
          {subtitulo && <p className="mt-1 truncate text-sm text-muted-foreground">{subtitulo}</p>}
          {data && <p className="mt-1.5 text-xs text-muted-foreground">Atualizado em {data}</p>}

          <div className="mt-auto flex items-center gap-2 pt-5">
            <Link href={href} className={`${classeBotaoPrimario} min-h-11 flex-1 px-4`} aria-label={`Abrir ${titulo}`}>
              <Eye className="size-4" aria-hidden="true" />
              Abrir
            </Link>
            <Link
              href={`${href}/editar`}
              className={`${classeBotaoSecundario} min-h-11 flex-1 px-4`}
              aria-label={`Editar ${titulo}`}
            >
              <Pencil className="size-4" aria-hidden="true" />
              Editar
            </Link>
            <button
              type="button"
              onClick={onExcluir}
              className={`${classeBotaoPerigo} min-h-11 w-11 shrink-0 px-0`}
              aria-label={`Excluir ${titulo}`}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </CartaoHolofote>
    </motion.li>
  );
}
