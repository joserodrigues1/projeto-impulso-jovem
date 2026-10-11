"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode, type Ref } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useIsPresent, type Variants } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  ClipboardCheck,
  GraduationCap,
  History,
  LoaderCircle,
  Save,
  Sparkles,
  TriangleAlert,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { CURVA_IMPULSO } from "@/components/movimento";
import { ApiError, fetchApi, mensagemDeErro } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useConfigPublica } from "@/lib/config";
import type { CurriculoDetalhe, CurriculoGeradoResposta } from "@/lib/tipos";
import { chaves, gravar, lerJson, remover } from "./armazenamento";
import {
  classeAtencao,
  classeBotaoPrimario,
  classeBotaoSecundario,
  classeBotaoTexto,
  classeCartao,
  classeErro,
  classeIconeAtencao,
  classeRecado,
} from "./campos";
import {
  ETAPAS,
  estadoInicial,
  etapaDoRascunho,
  formularioVazio,
  lerRascunho,
  montarDados,
  rascunhoParaJson,
  validarEtapa,
  type ContextoValidacao,
  type ErrosFormulario,
  type Etapa,
  type FormularioEstado,
} from "./dados-curriculo";
import { DialogoConfirmacao } from "./dialogo-confirmacao";
import {
  EtapaExperiencias,
  EtapaFormacao,
  EtapaHabilidades,
  EtapaRevisao,
  EtapaSobre,
  TituloEtapa,
  type Removido,
} from "./etapas-formulario";
import type { AudioHistoria } from "./gravador-audio";
import { ProgressoGeracao } from "./progresso-geracao";

type Modo = "criar" | "editar";

type Props =
  | { modo: "criar" }
  | {
      modo: "editar";
      curriculoId: string;
      /** Currículo salvo já convertido para o formulário (conteudoParaFormulario). */
      inicial: FormularioEstado;
    };

/** Lido uma vez: só serve para limitar os anos aceitos na formação. */
const ANO_ATUAL = new Date().getFullYear();

const INFO_ETAPAS: Record<
  Etapa,
  { rotulo: string; titulo: string; descricao: string; icone: LucideIcon; tituloEditar?: string; descricaoEditar?: string }
> = {
  sobre: {
    rotulo: "Sobre você",
    icone: UserRound,
    titulo: "Conte sobre você",
    descricao: "Nada aqui é obrigatório, mas quanto mais você contar, melhor fica o currículo.",
    descricaoEditar: "Ajuste o que aparece no topo do currículo e o seu perfil profissional.",
  },
  experiencias: {
    rotulo: "Experiências",
    icone: Briefcase,
    titulo: "Suas experiências",
    descricao:
      "Vale bico, ajuda no negócio da família, voluntariado e projeto da escola. Ainda não tem nenhuma? Tudo bem, pode pular.",
  },
  formacao: {
    rotulo: "Formação",
    icone: GraduationCap,
    titulo: "Sua formação",
    descricao: "Escola, curso técnico, faculdade ou cursos longos — inclusive o que você está cursando agora.",
  },
  habilidades: {
    rotulo: "Habilidades",
    icone: Sparkles,
    titulo: "Habilidades, idiomas e premiações",
    descricao: "O que você sabe fazer bem, os idiomas que conhece e as conquistas de que se orgulha.",
  },
  revisao: {
    rotulo: "Revisão",
    icone: ClipboardCheck,
    titulo: "Confira antes de gerar",
    tituloEditar: "Confira antes de salvar",
    descricao: "Veja o resumo do que você preencheu. Dá para voltar e ajustar qualquer etapa.",
  },
};

interface Inicio {
  estado: FormularioEstado;
  etapa: number;
  recuperado: boolean;
}

/** Estado inicial: o currículo salvo (editar), o rascunho deste navegador ou um formulário em branco. */
function carregarInicio(props: Props, chaveRascunho: string | null): Inicio {
  if (props.modo === "editar") return { estado: props.inicial, etapa: 0, recuperado: false };
  if (chaveRascunho) {
    const salvo = lerJson("local", chaveRascunho);
    const estado = lerRascunho(salvo);
    if (estado && !formularioVazio(estado)) return { estado, etapa: etapaDoRascunho(salvo), recuperado: true };
  }
  return { estado: estadoInicial(), etapa: 0, recuperado: false };
}

/** Mensagens amigáveis para os erros do envio (a API já manda textos prontos na maioria dos casos). */
function mensagensDoErro(erro: unknown, modo: Modo): string[] {
  if (!(erro instanceof ApiError)) return [mensagemDeErro(erro)];
  if (erro.status === 413) {
    return ["O áudio passou do limite de 8 MB. Grave um áudio mais curto ou envie outro arquivo."];
  }
  if (erro.status === 401) {
    return [
      modo === "criar"
        ? "Sua sessão expirou. Entre na sua conta de novo — o que você escreveu continua salvo neste navegador (o áudio precisará ser gravado de novo)."
        : "Sua sessão expirou. Entre na sua conta de novo e refaça a edição.",
    ];
  }
  if (erro.status === 404 && modo === "editar") {
    return ["Não encontramos este currículo. Ele pode ter sido excluído."];
  }
  const mensagens = erro.mensagens.length ? erro.mensagens : [erro.message];
  // Sem resposta ou falha no meio do caminho: a API pode ter salvo o currículo mesmo assim
  if (modo === "criar" && (erro.status === 0 || (erro.status >= 500 && erro.status !== 503))) {
    return [
      ...mensagens,
      "Se a geração demorou, o currículo pode ter sido criado mesmo assim. Confira em “Meus currículos” antes de tentar de novo.",
    ];
  }
  return mensagens;
}

function focarPrimeiroErro(erros: ErrosFormulario) {
  const id = Object.keys(erros)[0];
  if (id) window.requestAnimationFrame(() => document.getElementById(id)?.focus());
}

/**
 * Formulário em etapas do currículo.
 * - criar: rascunho automático no navegador, áudio opcional e envio para POST /curriculos/gerar (com IA quando disponível);
 * - editar: pré-preenchido com o currículo salvo e envio para PUT /curriculos/:id (sem IA e sem áudio).
 */
export function FormularioCurriculo(props: Props) {
  const { modo } = props;
  const router = useRouter();
  const { user } = useAuth();
  const { config, carregando: carregandoConfig } = useConfigPublica();
  const iaDisponivel = config.curriculoIaDisponivel;
  const chaveRascunho = modo === "criar" && user ? chaves.rascunho(user.id) : null;

  const [inicio] = useState(() => carregarInicio(props, chaveRascunho));
  const [estado, setEstado] = useState(inicio.estado);
  const [indice, setIndice] = useState(inicio.etapa);
  // Para onde a etapa desliza: 1 = avançou (entra pela direita), -1 = voltou (entra pela esquerda)
  const [direcao, setDirecao] = useState(1);
  const [maxVisitado, setMaxVisitado] = useState(modo === "editar" ? ETAPAS.length - 1 : inicio.etapa);
  const [rascunhoRecuperado, setRascunhoRecuperado] = useState(inicio.recuperado);
  const [confirmarDescarte, setConfirmarDescarte] = useState(false);
  const [mostrarErros, setMostrarErros] = useState(false);
  const [audio, setAudio] = useState<AudioHistoria | null>(null);
  // Currículo que o jovem já tinha (PDF/foto): só vai para a IA, não fica guardado
  const [curriculoAntigo, setCurriculoAntigo] = useState<File | null>(null);
  const [gravando, setGravando] = useState(false);
  const [escolhaIa, setEscolhaIa] = useState<boolean | null>(null);
  const [removido, setRemovido] = useState<Removido | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errosEnvio, setErrosEnvio] = useState<string[] | null>(null);
  // Trava síncrona contra clique duplo (o estado só muda na próxima renderização)
  const enviandoRef = useRef(false);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const erroEnvioRef = useRef<HTMLDivElement>(null);

  const etapa = ETAPAS[indice];
  const info = INFO_ETAPAS[etapa];
  // A IA vem marcada quando está disponível; a pessoa pode desmarcar
  const usarIa = modo === "criar" && iaDisponivel && (escolhaIa ?? true);
  // `temAudio` cobre qualquer material extra para a IA (áudio ou currículo antigo) no lugar do texto da história
  const ctx: ContextoValidacao = {
    modo,
    temAudio: Boolean(audio || curriculoAntigo),
    usarIa,
    iaDisponivel,
    anoAtual: ANO_ATUAL,
  };
  // Depois da primeira tentativa, os erros acompanham a digitação
  const erros = mostrarErros ? validarEtapa(etapa, estado, ctx) : {};
  const totalErros = Object.keys(erros).length;

  // Rascunho automático (só ao criar). Pausa durante o envio para não regravar o que acabou de ser apagado.
  useEffect(() => {
    if (!chaveRascunho || enviando) return;
    const espera = window.setTimeout(() => {
      if (formularioVazio(estado)) remover("local", chaveRascunho);
      else gravar("local", chaveRascunho, rascunhoParaJson(estado, indice));
    }, 400);
    return () => window.clearTimeout(espera);
  }, [chaveRascunho, estado, indice, enviando]);

  // Avisa antes de fechar a aba no meio da geração
  useEffect(() => {
    if (!enviando) return;
    const aoSair = (evento: BeforeUnloadEvent) => evento.preventDefault();
    window.addEventListener("beforeunload", aoSair);
    return () => window.removeEventListener("beforeunload", aoSair);
  }, [enviando]);

  // Edição (não tem rascunho automático): alterações ainda não salvas = o que iria para a API mudou
  const inicialEdicao = props.modo === "editar" ? props.inicial : null;
  const dadosIniciais = useMemo(
    () => (inicialEdicao ? JSON.stringify(montarDados(inicialEdicao)) : ""),
    [inicialEdicao],
  );
  const edicaoPendente =
    inicialEdicao !== null && !enviando && estado !== inicio.estado && JSON.stringify(montarDados(estado)) !== dadosIniciais;
  const [saidaPendente, setSaidaPendente] = useState<string | null>(null);

  // Com alterações não salvas: confirma antes de fechar/recarregar a aba e antes de seguir um link do site
  // (menu, "Cancelar", "Voltar para o currículo"). O clique é interceptado antes do <Link> do Next.
  useEffect(() => {
    if (!edicaoPendente) return;
    const aoFecharAba = (evento: BeforeUnloadEvent) => evento.preventDefault();
    const aoClicar = (evento: MouseEvent) => {
      if (evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
      const link = evento.target instanceof Element ? evento.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.hasAttribute("download")) return;
      if (link.target && link.target !== "_self") return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Âncora na própria página não sai do formulário
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      evento.preventDefault();
      setSaidaPendente(`${url.pathname}${url.search}${url.hash}`);
    };
    window.addEventListener("beforeunload", aoFecharAba);
    window.addEventListener("click", aoClicar, true);
    return () => {
      window.removeEventListener("beforeunload", aoFecharAba);
      window.removeEventListener("click", aoClicar, true);
    };
  }, [edicaoPendente]);

  function focarTitulo() {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0 });
      tituloRef.current?.focus({ preventScroll: true });
    });
  }

  function irPara(destino: number) {
    if (destino === indice || destino < 0 || destino >= ETAPAS.length || enviandoRef.current) return;
    if (gravando) {
      setAviso("Conclua ou descarte a gravação antes de mudar de etapa.");
      return;
    }
    if (destino > indice) {
      const encontrados = validarEtapa(etapa, estado, ctx);
      if (Object.keys(encontrados).length) {
        setMostrarErros(true);
        focarPrimeiroErro(encontrados);
        return;
      }
    }
    setMostrarErros(false);
    setAviso(null);
    setRemovido(null);
    setDirecao(destino > indice ? 1 : -1);
    setIndice(destino);
    setMaxVisitado((m) => Math.max(m, destino));
    focarTitulo();
  }

  function desfazerRemocao() {
    if (!removido) return;
    setEstado((e) => {
      if (removido.lista === "experiencias") {
        const lista = [...e.experiencias];
        lista.splice(Math.min(removido.indice, lista.length), 0, removido.item);
        return { ...e, experiencias: lista };
      }
      const lista = [...e.formacao];
      lista.splice(Math.min(removido.indice, lista.length), 0, removido.item);
      return { ...e, formacao: lista };
    });
    setRemovido(null);
  }

  function descartarRascunho() {
    if (chaveRascunho) remover("local", chaveRascunho);
    setEstado(estadoInicial());
    setAudio(null);
    setCurriculoAntigo(null);
    setIndice(0);
    setMaxVisitado(0);
    setMostrarErros(false);
    setRemovido(null);
    setAviso(null);
    setErrosEnvio(null);
    setRascunhoRecuperado(false);
    setConfirmarDescarte(false);
    setDirecao(-1);
    focarTitulo();
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviandoRef.current) return;
    // Enter num campo de texto nas etapas do meio = "Continuar"
    if (etapa !== "revisao") {
      irPara(indice + 1);
      return;
    }
    if (gravando) {
      setAviso("Conclua ou descarte a gravação antes de gerar o currículo.");
      return;
    }

    // Confere todas as etapas e leva para a primeira com problema
    for (let i = 0; i < ETAPAS.length; i++) {
      const encontrados = validarEtapa(ETAPAS[i], estado, ctx);
      if (Object.keys(encontrados).length) {
        setMostrarErros(true);
        setDirecao(i > indice ? 1 : -1);
        setIndice(i);
        focarPrimeiroErro(encontrados);
        return;
      }
    }

    enviandoRef.current = true;
    setEnviando(true);
    setErrosEnvio(null);
    setAviso(null);
    try {
      if (props.modo === "criar") {
        const corpo = new FormData();
        corpo.append("dados", JSON.stringify(montarDados(estado, usarIa)));
        // Sem IA o áudio e o currículo antigo seriam ignorados pela API: nem envia
        if (audio && usarIa) corpo.append("audio", audio.blob, audio.nomeArquivo);
        if (curriculoAntigo && usarIa) corpo.append("curriculoAntigo", curriculoAntigo, curriculoAntigo.name);
        const resposta = await fetchApi<CurriculoGeradoResposta>("/curriculos/gerar", { method: "POST", body: corpo });
        // Avisos e transcrição aparecem na próxima tela (ficam só nesta aba)
        gravar(
          "sessao",
          chaves.geracao(resposta.id),
          JSON.stringify({ avisos: resposta.avisos ?? [], transcricao: resposta.transcricao ?? "" }),
        );
        if (chaveRascunho) remover("local", chaveRascunho);
        router.push(`/dashboard/curriculo/${encodeURIComponent(resposta.id)}`);
      } else {
        const id = encodeURIComponent(props.curriculoId);
        await fetchApi<CurriculoDetalhe>(`/curriculos/${id}`, {
          method: "PUT",
          body: JSON.stringify(montarDados(estado)),
        });
        // Os recados da geração já foram vistos: não reaparecem depois da edição
        const chaveGeracao = chaves.geracao(props.curriculoId);
        const geracao = lerJson("sessao", chaveGeracao);
        if (typeof geracao === "object" && geracao !== null) {
          gravar("sessao", chaveGeracao, JSON.stringify({ ...geracao, dispensado: true }));
        }
        router.push(`/dashboard/curriculo/${id}`);
      }
      // Em caso de sucesso, continua "enviando" até a troca de página
    } catch (erro) {
      enviandoRef.current = false;
      setEnviando(false);
      setErrosEnvio(mensagensDoErro(erro, modo));
      window.requestAnimationFrame(() => erroEnvioRef.current?.focus());
    }
  }

  if (enviando && modo === "criar") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: CURVA_IMPULSO }}
        className={`${classeCartao} relative overflow-hidden p-5 sm:p-8`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 fundo-grade text-foreground opacity-50 [mask-image:radial-gradient(ellipse_at_top,black,transparent_65%)]"
        />
        <ProgressoGeracao
          comAudio={Boolean(audio && usarIa)}
          comCurriculoAntigo={Boolean(curriculoAntigo && usarIa)}
          comIa={usarIa}
        />
      </motion.div>
    );
  }

  const desabilitado = enviando;
  const voltarPara = props.modo === "editar" ? `/dashboard/curriculo/${encodeURIComponent(props.curriculoId)}` : "/dashboard/curriculo";

  return (
    <div className="space-y-6">
      <AnimatePresence initial={false}>
        {rascunhoRecuperado && (
          <motion.div
            key="rascunho"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: CURVA_IMPULSO }}
            className="overflow-hidden"
          >
            <div
              role="status"
              className={`${classeRecado} flex flex-col gap-3 p-4 text-sm sm:flex-row sm:items-center sm:justify-between`}
            >
              <p className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-marca/12 text-marca-forte dark:text-marca-clara">
                  <History className="size-4" aria-hidden="true" />
                </span>
                <span className="pt-0.5 leading-relaxed">
                  <strong className="font-semibold">Continuamos de onde você parou.</strong> O rascunho fica salvo só
                  neste navegador (áudios não entram no rascunho).
                </span>
              </p>
              <div className="flex shrink-0 flex-wrap gap-2 sm:flex-nowrap">
                <button type="button" onClick={() => setRascunhoRecuperado(false)} className={`${classeBotaoTexto} min-h-10`}>
                  Ok
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmarDescarte(true)}
                  disabled={gravando}
                  className={`${classeBotaoSecundario} min-h-10`}
                >
                  Começar do zero
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <IndicadorEtapas indice={indice} maxVisitado={maxVisitado} desabilitado={desabilitado} onIr={irPara} />

      <form
        onSubmit={enviar}
        noValidate
        aria-busy={enviando}
        // overflow-x-clip: a etapa que desliza não cria rolagem lateral no celular
        className={`${classeCartao} relative overflow-x-clip p-5 sm:p-8`}
      >
        {/* Fio de luz no topo do cartão, na cor da marca */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-marca/60 to-transparent"
        />
        <TituloEtapa
          ref={tituloRef}
          titulo={modo === "editar" ? (info.tituloEditar ?? info.titulo) : info.titulo}
          descricao={modo === "editar" ? (info.descricaoEditar ?? info.descricao) : info.descricao}
          icone={info.icone}
        />

        <div className="relative">
          <AnimatePresence mode="popLayout" initial={false} custom={direcao}>
            <PainelEtapa key={etapa} direcao={direcao}>
              {etapa === "sobre" && (
                <EtapaSobre
                  estado={estado}
                  erros={erros}
                  alterar={setEstado}
                  desabilitado={desabilitado}
                  modo={modo}
                  iaDisponivel={iaDisponivel}
                  carregandoConfig={carregandoConfig}
                  audio={audio}
                  onAudio={setAudio}
                  curriculoAntigo={curriculoAntigo}
                  onCurriculoAntigo={setCurriculoAntigo}
                  onGravandoChange={(valor) => {
                    setGravando(valor);
                    if (!valor) setAviso(null);
                  }}
                />
              )}
              {etapa === "experiencias" && (
                <EtapaExperiencias
                  estado={estado}
                  erros={erros}
                  alterar={setEstado}
                  desabilitado={desabilitado}
                  removido={removido}
                  onRemover={setRemovido}
                  onDesfazer={desfazerRemocao}
                />
              )}
              {etapa === "formacao" && (
                <EtapaFormacao
                  estado={estado}
                  erros={erros}
                  alterar={setEstado}
                  desabilitado={desabilitado}
                  removido={removido}
                  onRemover={setRemovido}
                  onDesfazer={desfazerRemocao}
                />
              )}
              {etapa === "habilidades" && (
                <EtapaHabilidades estado={estado} erros={erros} alterar={setEstado} desabilitado={desabilitado} />
              )}
              {etapa === "revisao" && (
                <EtapaRevisao
                  estado={estado}
                  erros={erros}
                  alterar={setEstado}
                  desabilitado={desabilitado}
                  modo={modo}
                  conta={user}
                  audio={audio}
                  curriculoAntigo={curriculoAntigo}
                  iaDisponivel={iaDisponivel}
                  carregandoConfig={carregandoConfig}
                  usarIa={usarIa}
                  onUsarIa={setEscolhaIa}
                  irPara={irPara}
                />
              )}
            </PainelEtapa>
          </AnimatePresence>
        </div>

        <div className="mt-8 space-y-4 border-t border-border pt-6">
          <AnimatePresence initial={false}>
            {aviso && (
              <motion.p
                key="aviso"
                role="status"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: CURVA_IMPULSO }}
                className={`${classeAtencao} flex items-start gap-2 p-3 text-sm font-medium`}
              >
                <TriangleAlert className={`mt-0.5 size-4 shrink-0 ${classeIconeAtencao}`} aria-hidden="true" />
                {aviso}
              </motion.p>
            )}
          </AnimatePresence>
          {totalErros > 0 && etapa !== "revisao" && (
            <p role="alert" className="flex items-center gap-2 text-sm font-medium text-destructive">
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-destructive" />
              {totalErros === 1
                ? "Confira o campo destacado antes de continuar."
                : `Confira os ${totalErros} campos destacados antes de continuar.`}
            </p>
          )}
          {errosEnvio && (
            <div
              ref={erroEnvioRef}
              tabIndex={-1}
              role="alert"
              className={`${classeErro} flex items-start gap-3 p-4 text-sm outline-none focus-visible:ring-3 focus-visible:ring-destructive/30`}
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
              <div className="space-y-1 leading-relaxed">
                <p className="font-semibold">
                  {modo === "criar" ? "Não deu para gerar o currículo." : "Não deu para salvar as alterações."}
                </p>
                {errosEnvio.length === 1 ? (
                  <p>{errosEnvio[0]}</p>
                ) : (
                  <ul className="list-disc space-y-0.5 pl-4">
                    {errosEnvio.map((m, i) => (
                      <li key={`${i}-${m}`}>{m}</li>
                    ))}
                  </ul>
                )}
                {modo === "criar" && <p className="text-muted-foreground">Seus dados continuam aqui: é só tentar de novo.</p>}
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            {indice > 0 ? (
              <button
                type="button"
                onClick={() => irPara(indice - 1)}
                disabled={desabilitado}
                className={`${classeBotaoSecundario} group`}
              >
                <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
                Voltar
              </button>
            ) : (
              <Link href={voltarPara} className={classeBotaoTexto}>
                {modo === "editar" ? "Cancelar" : "Voltar para meus currículos"}
              </Link>
            )}

            {etapa !== "revisao" ? (
              <button type="submit" disabled={desabilitado} className={`${classeBotaoPrimario} group sm:px-6`}>
                Continuar
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={desabilitado}
                className={`${classeBotaoPrimario} relative overflow-hidden sm:px-7`}
              >
                {/* Reflexo que atravessa o botão final (some com "reduzir movimento") */}
                {!enviando && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent motion-safe:animate-brilho motion-reduce:hidden"
                  />
                )}
                {enviando ? (
                  <>
                    <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />
                    Salvando…
                  </>
                ) : modo === "editar" ? (
                  <>
                    <Save className="size-4" aria-hidden="true" />
                    Salvar alterações
                  </>
                ) : usarIa ? (
                  <>
                    <Sparkles className="size-4" aria-hidden="true" />
                    Gerar meu currículo com IA
                  </>
                ) : (
                  <>
                    <Check className="size-4" aria-hidden="true" />
                    Gerar meu currículo
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>

      {modo === "criar" && !rascunhoRecuperado && !formularioVazio(estado) && (
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="flex size-4 items-center justify-center rounded-full bg-lima text-tinta">
              <Check className="size-2.5" strokeWidth={3.5} />
            </span>
            Seu progresso é salvo automaticamente neste navegador.
          </span>
          <button
            type="button"
            onClick={() => setConfirmarDescarte(true)}
            disabled={gravando || desabilitado}
            className="min-h-11 rounded-full px-2 font-semibold text-marca-forte underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60 dark:text-marca-clara"
          >
            Apagar e começar do zero
          </button>
        </p>
      )}

      <DialogoConfirmacao
        aberto={confirmarDescarte}
        titulo="Começar do zero?"
        descricao="Tudo o que você preencheu até agora será apagado deste navegador. Não dá para desfazer."
        textoConfirmar="Apagar e começar do zero"
        textoCancelar="Manter o que preenchi"
        perigoso
        onConfirmar={descartarRascunho}
        onCancelar={() => setConfirmarDescarte(false)}
      />

      <DialogoConfirmacao
        aberto={saidaPendente !== null}
        titulo="Sair sem salvar?"
        descricao="As alterações que você fez neste currículo ainda não foram salvas e serão perdidas."
        textoConfirmar="Sair sem salvar"
        textoCancelar="Continuar editando"
        perigoso
        onConfirmar={() => {
          const destino = saidaPendente;
          setSaidaPendente(null);
          if (destino) router.push(destino);
        }}
        onCancelar={() => setSaidaPendente(null)}
      />
    </div>
  );
}

// ───────────────────────────── Troca de etapa ─────────────────────────────

const variantesEtapa: Variants = {
  entrar: (direcao: number) => ({ opacity: 0, x: direcao * 40 }),
  centro: { opacity: 1, x: 0, transition: { duration: 0.45, ease: CURVA_IMPULSO } },
  sair: (direcao: number) => ({ opacity: 0, x: direcao * -40, transition: { duration: 0.18, ease: "easeIn" } }),
};

/**
 * Conteúdo de uma etapa: entra deslizando do lado para onde a pessoa foi.
 * Enquanto a etapa anterior sai, ela fica inerte (sem foco, sem leitor de tela, sem clique).
 */
function PainelEtapa({ direcao, children, ref }: { direcao: number; children: ReactNode; ref?: Ref<HTMLDivElement> }) {
  const presente = useIsPresent();
  return (
    <motion.div
      ref={ref}
      custom={direcao}
      variants={variantesEtapa}
      initial="entrar"
      animate="centro"
      exit="sair"
      inert={!presente}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}

// ───────────────────────────── Indicador de progresso ─────────────────────────────

interface PropsIndicador {
  indice: number;
  maxVisitado: number;
  desabilitado: boolean;
  onIr: (indice: number) => void;
}

function IndicadorEtapas({ indice, maxVisitado, desabilitado, onIr }: PropsIndicador) {
  const total = ETAPAS.length;
  return (
    <nav aria-label="Etapas do currículo">
      {/* Celular e telas médias: texto + barra em segmentos */}
      <div className="lg:hidden">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">
            <span className="text-marca-forte dark:text-marca-clara">{INFO_ETAPAS[ETAPAS[indice]].rotulo}</span>
          </p>
          <p className="text-xs font-medium text-muted-foreground tabular-nums">
            Etapa {indice + 1} de {total}
          </p>
        </div>
        <div className="mt-2.5 grid grid-cols-5 gap-1.5" aria-hidden="true">
          {ETAPAS.map((e, i) => (
            <span key={e} className="h-1.5 overflow-hidden rounded-full bg-muted dark:bg-white/10">
              <motion.span
                className="block h-full origin-left rounded-full bg-gradient-to-r from-marca to-ciano"
                initial={false}
                animate={{ scaleX: i <= indice ? 1 : 0 }}
                transition={{ duration: 0.5, ease: CURVA_IMPULSO, delay: i === indice ? 0.1 : 0 }}
              />
            </span>
          ))}
        </div>
      </div>

      {/* Computador: etapas clicáveis (as já visitadas) */}
      <ol className="hidden items-center gap-2 lg:flex">
        {ETAPAS.map((e, i) => {
          const atual = i === indice;
          const feita = i < indice;
          const liberada = i <= maxVisitado && !desabilitado && !atual;
          return (
            <li key={e} className="flex flex-1 items-center gap-2 last:flex-none">
              <button
                type="button"
                onClick={() => onIr(i)}
                disabled={!liberada}
                aria-current={atual ? "step" : undefined}
                className="group flex items-center gap-2.5 rounded-full p-1 pr-3 text-left text-sm transition-colors enabled:hover:bg-card enabled:hover:shadow-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default dark:enabled:hover:bg-white/5"
              >
                <span className="relative flex size-8 shrink-0 items-center justify-center" aria-hidden="true">
                  {atual && (
                    <motion.span
                      layoutId="etapa-atual"
                      className="absolute -inset-1 rounded-full bg-marca/15 ring-1 ring-marca/30"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span
                    className={`relative flex size-8 items-center justify-center rounded-full text-sm font-bold transition-colors duration-300 ${
                      atual
                        ? "bg-marca text-white shadow-md shadow-marca/30"
                        : feita
                          ? "bg-lima text-tinta"
                          : "border border-border bg-card text-muted-foreground dark:bg-white/5"
                    }`}
                  >
                    {feita ? <Check className="size-4" strokeWidth={3} /> : i + 1}
                  </span>
                </span>
                <span
                  className={`whitespace-nowrap transition-colors ${
                    atual ? "font-semibold text-foreground" : "text-muted-foreground group-enabled:group-hover:text-foreground"
                  }`}
                >
                  {INFO_ETAPAS[e].rotulo}
                  <span className="sr-only">
                    {atual ? " (etapa atual)" : feita ? " (concluída)" : ` (etapa ${i + 1} de ${total})`}
                  </span>
                </span>
              </button>
              {i < total - 1 && (
                <span className="relative h-0.5 min-w-3 flex-1 overflow-hidden rounded-full bg-border" aria-hidden="true">
                  <motion.span
                    className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-lima to-marca"
                    initial={false}
                    animate={{ scaleX: feita ? 1 : 0 }}
                    transition={{ duration: 0.5, ease: CURVA_IMPULSO }}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
