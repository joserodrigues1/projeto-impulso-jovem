"use client";

import { useEffect, useId, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  ChevronDown,
  Download,
  ImageMinus,
  ImagePlus,
  Info,
  LoaderCircle,
  MessageSquareText,
  Pencil,
  RefreshCw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { ApiError, fetchApi, mensagemDeErro } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { CurriculoDetalhe, Usuario } from "@/lib/tipos";
import { digitosTelefone, formatarData } from "@/lib/utils";
import { chaves, gravar, remover, useArmazenamento } from "@/components/curriculo/armazenamento";
import { CabecalhoPagina } from "@/components/curriculo/cabecalho-pagina";
import {
  classeAtencao,
  classeBotaoPerigo,
  classeBotaoPrimario,
  classeBotaoSecundario,
  classeBotaoTexto,
  classeCartao,
  classeErro,
  classeIconeAtencao,
  classeSeloIa,
} from "@/components/curriculo/campos";
import { conteudoParaDados } from "@/components/curriculo/dados-curriculo";
import { CarregandoCurriculo, CurriculoNaoEncontrado, ErroCurriculo } from "@/components/curriculo/estados";
import { FOTO_MAX_BYTES, prepararFoto } from "@/components/curriculo/foto";
import { ModeloCurriculo } from "@/components/curriculo/modelo-curriculo";
import { AreaImpressao, VisualizacaoA4 } from "@/components/curriculo/visualizacao-a4";
import { CURVA_IMPULSO, Revelar } from "@/components/movimento";

type Estado =
  | { tipo: "carregando"; id: string }
  | { tipo: "ok"; id: string; curriculo: CurriculoDetalhe }
  | { tipo: "nao-encontrado"; id: string }
  | { tipo: "erro"; id: string; mensagem: string; status: number };

interface Geracao {
  avisos: string[];
  transcricao: string;
  /** true depois que a pessoa clicou em "Entendi" no painel de recados. */
  dispensado: boolean;
}

/** Avisos e transcrição da geração, guardados na sessionStorage pela tela do formulário. */
function lerGeracao(bruto: string | null): Geracao | null {
  if (!bruto) return null;
  try {
    const valor: unknown = JSON.parse(bruto);
    if (typeof valor !== "object" || valor === null) return null;
    const { avisos, transcricao, dispensado } = valor as Record<string, unknown>;
    return {
      avisos: Array.isArray(avisos) ? avisos.filter((a): a is string => typeof a === "string" && a.trim() !== "") : [],
      transcricao: typeof transcricao === "string" ? transcricao.trim() : "",
      dispensado: dispensado === true,
    };
  } catch {
    return null;
  }
}

export default function VerCurriculoPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const [estado, setEstado] = useState<Estado>({ tipo: "carregando", id });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (!id) return;
    let ativo = true;
    fetchApi<CurriculoDetalhe>(`/curriculos/${encodeURIComponent(id)}`)
      .then((curriculo) => {
        if (!ativo) return;
        setEstado(
          curriculo?.conteudo
            ? { tipo: "ok", id, curriculo }
            : { tipo: "erro", id, mensagem: "O currículo veio incompleto. Tente de novo em instantes.", status: 0 },
        );
      })
      .catch((e: unknown) => {
        if (!ativo) return;
        if (e instanceof ApiError && (e.status === 404 || e.status === 400)) setEstado({ tipo: "nao-encontrado", id });
        else
          setEstado({
            tipo: "erro",
            id,
            mensagem: mensagemDeErro(e, "Não foi possível carregar o currículo agora."),
            status: e instanceof ApiError ? e.status : 0,
          });
      });
    return () => {
      ativo = false;
    };
  }, [id, tentativa]);

  // Ao trocar de currículo (outro id na URL), o estado anterior não vale mais
  const atual: Estado = estado.id === id ? estado : { tipo: "carregando", id };

  // O título da aba vira o nome sugerido do arquivo ao "Salvar como PDF"
  const nome = atual.tipo === "ok" ? atual.curriculo.conteudo.nomeCompleto?.trim() : "";
  useEffect(() => {
    if (!nome) return;
    const anterior = document.title;
    document.title = `Currículo - ${nome}`;
    return () => {
      document.title = anterior;
    };
  }, [nome]);

  if (atual.tipo === "carregando") return <CarregandoCurriculo />;
  if (atual.tipo === "nao-encontrado") return <CurriculoNaoEncontrado />;
  if (atual.tipo === "erro") {
    return (
      <ErroCurriculo
        mensagem={atual.mensagem}
        status={atual.status}
        onTentarDeNovo={() => {
          setEstado({ tipo: "carregando", id });
          setTentativa((t) => t + 1);
        }}
      />
    );
  }

  return (
    <VisualizacaoCurriculo
      curriculo={atual.curriculo}
      onAtualizado={(curriculo) => setEstado({ tipo: "ok", id, curriculo })}
    />
  );
}

/**
 * Quais dados de contato do currículo (gravados quando ele foi salvo) não batem mais com a conta.
 * O currículo é uma foto daquele momento: trocar nome ou WhatsApp em Configurações não muda os já salvos.
 */
function contatosDesatualizados(conteudo: CurriculoDetalhe["conteudo"], conta: Usuario | null): string[] {
  if (!conta) return [];
  const diferentes: string[] = [];
  if ((conteudo.nomeCompleto ?? "").trim() !== conta.nomeCompleto.trim()) diferentes.push("o nome");
  if (digitosTelefone(conteudo.telefone ?? "") !== digitosTelefone(conta.telefone ?? "")) diferentes.push("o telefone");
  if ((conteudo.email ?? "").trim().toLowerCase() !== conta.email.trim().toLowerCase()) diferentes.push("o e-mail");
  return diferentes;
}

/** Entrada e saída dos recados do topo (contato desatualizado, currículo pronto). */
const entradaRecado = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 },
  transition: { duration: 0.4, ease: CURVA_IMPULSO },
};

function juntarComE(itens: string[]): string {
  return itens.length > 1 ? `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}` : (itens[0] ?? "");
}

function VisualizacaoCurriculo({
  curriculo,
  onAtualizado,
}: {
  curriculo: CurriculoDetalhe;
  onAtualizado: (curriculo: CurriculoDetalhe) => void;
}) {
  const { id, conteudo } = curriculo;
  const { user } = useAuth();
  const chaveFoto = chaves.foto(id);
  const chaveGeracao = chaves.geracao(id);
  const foto = useArmazenamento("local", chaveFoto);
  const geracao = lerGeracao(useArmazenamento("sessao", chaveGeracao));
  const [processandoFoto, setProcessandoFoto] = useState(false);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const [anuncio, setAnuncio] = useState("");
  const [atualizandoContato, setAtualizandoContato] = useState(false);
  const [erroContato, setErroContato] = useState<string[] | null>(null);
  const idFoto = useId();
  const idDicaFoto = useId();
  const desatualizados = contatosDesatualizados(conteudo, user);

  /** PUT com o próprio conteúdo: a API remonta nome, e-mail e telefone a partir da conta. */
  async function atualizarContato() {
    if (atualizandoContato) return;
    setAtualizandoContato(true);
    setErroContato(null);
    try {
      const atualizado = await fetchApi<CurriculoDetalhe>(`/curriculos/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(conteudoParaDados(conteudo)),
      });
      if (atualizado?.conteudo) onAtualizado(atualizado);
      setAnuncio("Dados de contato do currículo atualizados.");
    } catch (erro) {
      setErroContato(
        erro instanceof ApiError && erro.status === 400
          ? [
              "Não deu para atualizar sozinho: este currículo tem campos que precisam ser revisados.",
              "Toque em Editar, confira e salve — os dados de contato são atualizados junto.",
            ]
          : [mensagemDeErro(erro, "Não foi possível atualizar os dados de contato agora. Tente de novo.")],
      );
    } finally {
      setAtualizandoContato(false);
    }
  }

  const titulo = curriculo.titulo?.trim() || "Seu currículo";
  const data = formatarData(curriculo.atualizadoEm || curriculo.geradoEm);
  const hrefEditar = `/dashboard/curriculo/${encodeURIComponent(id)}/editar`;

  async function aoEscolherFoto(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!arquivo) return;
    setErroFoto(null);
    if (!arquivo.type.startsWith("image/")) {
      setErroFoto("Escolha um arquivo de imagem (JPG ou PNG).");
      return;
    }
    if (arquivo.size > FOTO_MAX_BYTES) {
      setErroFoto("Essa imagem é grande demais (limite de 15 MB). Escolha outra foto.");
      return;
    }
    setProcessandoFoto(true);
    try {
      const dataUrl = await prepararFoto(arquivo);
      if (gravar("local", chaveFoto, dataUrl)) {
        setAnuncio("Foto adicionada ao currículo.");
      } else {
        setErroFoto(
          "Não deu para guardar a foto neste navegador (o espaço pode estar cheio ou a navegação anônima bloqueia). Tente em uma janela normal.",
        );
      }
    } catch {
      setErroFoto("Não conseguimos abrir essa imagem. Tente uma foto em JPG ou PNG.");
    } finally {
      setProcessandoFoto(false);
    }
  }

  function removerFoto() {
    remover("local", chaveFoto);
    setErroFoto(null);
    setAnuncio("Foto removida do currículo.");
  }

  function dispensarAvisos() {
    if (!geracao) return;
    gravar("sessao", chaveGeracao, JSON.stringify({ ...geracao, dispensado: true }));
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <div className="space-y-5 print:hidden">
        <CabecalhoPagina
          voltar={{ href: "/dashboard/curriculo", rotulo: "Voltar para meus currículos" }}
          sobretitulo="Currículo"
          titulo={titulo}
          descricao={
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {data && <span>Atualizado em {data}</span>}
              {curriculo.refinadoPorIa && (
                <span className={classeSeloIa}>
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  Refinado pela IA
                </span>
              )}
            </div>
          }
        />

        <AnimatePresence initial={false}>
          {/* O currículo guarda o contato de quando foi salvo: oferece trazer o que está na conta agora */}
          {desatualizados.length > 0 && (
            <motion.section
              key="contato"
              {...entradaRecado}
              aria-labelledby="cv-contato-titulo"
              className={`${classeAtencao} overflow-hidden p-4 text-sm sm:p-5`}
            >
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-chart-4/20">
                  <Info className={`size-4 ${classeIconeAtencao}`} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 id="cv-contato-titulo" className="font-display text-base font-bold">
                    Seus dados de contato mudaram
                  </h2>
                  <p className="mt-1 leading-relaxed">
                    Este currículo ainda está com {juntarComE(desatualizados)}{" "}
                    {desatualizados.length > 1 ? "antigos" : "antigo"}. Atualize para o PDF sair com os dados da sua conta.
                  </p>
                  {erroContato && (
                    <div role="alert" className="mt-2 space-y-0.5 font-medium text-destructive">
                      {erroContato.map((m, i) => (
                        <p key={`${i}-${m}`}>{m}</p>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={atualizarContato}
                      disabled={atualizandoContato}
                      className={`${classeBotaoSecundario} min-h-10`}
                    >
                      {atualizandoContato ? (
                        <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />
                      ) : (
                        <RefreshCw className="size-4" aria-hidden="true" />
                      )}
                      {atualizandoContato ? "Atualizando…" : "Atualizar dados de contato"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {/* Logo depois de gerar: confirmação + recados da API/IA (ex.: "a IA está indisponível", dicas) */}
          {geracao && !geracao.dispensado && (
            <motion.section
              key="geracao"
              {...entradaRecado}
              aria-labelledby="cv-avisos-titulo"
              className={`overflow-hidden p-4 text-sm sm:p-5 ${
                geracao.avisos.length
                  ? classeAtencao
                  : "rounded-2xl border border-lima/60 bg-lima/10 text-foreground dark:border-lima/25 dark:bg-lima/[0.06]"
              }`}
            >
              <div className="flex items-start gap-3">
                <motion.span
                  initial={{ scale: 0.4, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.15 }}
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-lima text-tinta"
                >
                  <Check className="size-4" strokeWidth={3} />
                </motion.span>
                <div className="min-w-0 flex-1">
                  <h2 id="cv-avisos-titulo" className="pt-1.5 font-display text-base font-bold">
                    {geracao.avisos.length ? "Seu currículo está pronto! Alguns recados:" : "Seu currículo está pronto!"}
                  </h2>
                  {geracao.avisos.length > 0 ? (
                    <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed marker:text-muted-foreground">
                      {geracao.avisos.map((aviso, i) => (
                        <li key={`${i}-${aviso}`}>{aviso}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 leading-relaxed text-muted-foreground">
                      Confira se está tudo certo, adicione uma foto se quiser e baixe em PDF.
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {geracao.avisos.length > 0 && (
                      <Link href={hrefEditar} className={`${classeBotaoSecundario} min-h-10`}>
                        <Pencil className="size-4" aria-hidden="true" />
                        Completar agora
                      </Link>
                    )}
                    <button type="button" onClick={dispensarAvisos} className={`${classeBotaoTexto} min-h-10`}>
                      Entendi
                    </button>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {geracao?.transcricao && (
          <details className={`${classeCartao} group p-4 text-sm sm:px-5`}>
            <summary className="flex min-h-8 cursor-pointer list-none items-center gap-3 rounded-lg font-semibold text-foreground [&::-webkit-details-marker]:hidden">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-marca/10 text-marca-forte dark:bg-marca/15 dark:text-marca-clara">
                <MessageSquareText className="size-4" aria-hidden="true" />
              </span>
              O que entendemos do seu áudio
              <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <span className="group-open:hidden">Mostrar</span>
                <span className="hidden group-open:inline">Esconder</span>
                <ChevronDown className="size-4 transition-transform duration-300 group-open:rotate-180" aria-hidden="true" />
              </span>
            </summary>
            <p className="mt-4 max-h-64 overflow-y-auto rounded-2xl border border-border bg-muted/50 p-4 leading-relaxed whitespace-pre-line text-foreground/85 dark:bg-white/[0.03]">
              {geracao.transcricao}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Este texto aparece só nesta aba. O áudio não fica salvo na sua conta nem no nosso banco de dados: ele foi
              enviado ao serviço de IA só para ser transcrito.
            </p>
          </details>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
        {/* Barra de ações: no celular vem antes da folha; no computador fica ao lado, fixa ao rolar */}
        <Revelar
          y={12}
          atraso={0.05}
          transition={{ duration: 0.5 }}
          className="print:hidden lg:sticky lg:top-24 lg:order-2"
        >
          <aside aria-label="Ações do currículo" className={`${classeCartao} space-y-4 p-4 sm:p-5`}>
            <div className="flex flex-wrap gap-2 lg:flex-col">
              <button
                type="button"
                onClick={() => window.print()}
                className={`${classeBotaoPrimario} group relative overflow-hidden lg:w-full`}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent motion-safe:animate-brilho motion-reduce:hidden"
                />
                <Download className="size-4 transition-transform duration-200 group-hover:translate-y-0.5" aria-hidden="true" />
                Baixar PDF
              </button>
              <Link href={hrefEditar} className={`${classeBotaoSecundario} lg:w-full`}>
                <Pencil className="size-4" aria-hidden="true" />
                Editar
              </Link>
              <div className="lg:w-full">
                {/* Input visualmente oculto, mas focável; o rótulo faz o papel de botão */}
                <input
                  id={idFoto}
                  type="file"
                  accept="image/*"
                  className="peer sr-only"
                  onChange={aoEscolherFoto}
                  disabled={processandoFoto}
                  aria-describedby={idDicaFoto}
                />
                <label
                  htmlFor={idFoto}
                  className={`${classeBotaoSecundario} cursor-pointer peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card peer-disabled:cursor-not-allowed peer-disabled:opacity-60 lg:w-full`}
                >
                  {processandoFoto ? (
                    <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />
                  ) : (
                    <ImagePlus className="size-4" aria-hidden="true" />
                  )}
                  {foto ? "Trocar foto" : "Adicionar foto"}
                </label>
              </div>
              {foto && (
                <button type="button" onClick={removerFoto} className={`${classeBotaoPerigo} lg:w-full`}>
                  <ImageMinus className="size-4" aria-hidden="true" />
                  Remover foto
                </button>
              )}
            </div>
            <div className="space-y-2 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
              <p className="flex items-start gap-2">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                <span>
                  Para baixar, toque em <strong className="font-semibold text-foreground">Baixar PDF</strong> e, na janela
                  de impressão, escolha <strong className="font-semibold text-foreground">“Salvar como PDF”</strong> como
                  destino.
                </span>
              </p>
              <p id={idDicaFoto} className="flex items-start gap-2">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                A foto fica salva só neste aparelho e não é enviada para o servidor. Em outro celular ou computador, é só
                adicionar de novo.
              </p>
            </div>
            {erroFoto && (
              <p role="alert" className={`${classeErro} flex items-start gap-2 p-3 text-sm leading-relaxed`}>
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
                {erroFoto}
              </p>
            )}
            <p className="sr-only" role="status" aria-live="polite">
              {anuncio}
            </p>
          </aside>
        </Revelar>

        {/* Na tela: folha A4 que encolhe no celular, sobre uma "mesa". Na impressão: a cópia do portal. */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-muted/60 p-2 sm:p-5 print:hidden lg:order-1 dark:bg-white/[0.03]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 fundo-grade text-foreground opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 left-1/2 size-96 -translate-x-1/2 rounded-full bg-marca/10 blur-3xl"
          />
          <Revelar y={24} transition={{ duration: 0.55 }} className="relative">
            <VisualizacaoA4>
              <ModeloCurriculo conteudo={conteudo} foto={foto} />
            </VisualizacaoA4>
          </Revelar>
        </div>
      </div>
      <AreaImpressao>
        <ModeloCurriculo conteudo={conteudo} foto={foto} />
      </AreaImpressao>
    </div>
  );
}
