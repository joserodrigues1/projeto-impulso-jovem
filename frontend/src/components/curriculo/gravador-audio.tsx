"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type ChangeEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Mic, Pause, Play, RotateCcw, Square, Trash2, TriangleAlert, Upload } from "lucide-react";
import { CURVA_IMPULSO } from "@/components/movimento";
import { classeBotaoPerigo, classeBotaoSecundario, classeErro } from "./campos";
import { AUDIO_MAX_BYTES, AUDIO_MAX_SEGUNDOS, TIPOS_AUDIO_ACEITOS } from "./dados-curriculo";

export interface AudioHistoria {
  blob: Blob;
  /** Nome enviado no multipart, com extensão coerente com o tipo (ex.: historia.webm). */
  nomeArquivo: string;
  /** Tipo sem parâmetros (ex.: audio/webm). */
  mimeType: string;
  duracaoSegundos: number | null;
  origem: "gravacao" | "arquivo";
}

interface Props {
  audio: AudioHistoria | null;
  onChange: (audio: AudioHistoria | null) => void;
  /** Avisa o formulário enquanto o microfone está em uso (para não trocar de etapa no meio). */
  onGravandoChange?: (gravando: boolean) => void;
  desabilitado?: boolean;
}

type Status = "parado" | "iniciando" | "gravando" | "pausado" | "finalizando";

/** Recursos do navegador que precisam ser liberados ao parar ou sair da tela. */
interface Recursos {
  recorder: MediaRecorder | null;
  stream: MediaStream | null;
  contexto: AudioContext | null;
  intervalo: number | null;
  animacao: number | null;
  pedacos: Blob[];
  acumuladoMs: number;
  inicioTrecho: number | null;
  descartar: boolean;
  montado: boolean;
}

const ACEITOS: readonly string[] = TIPOS_AUDIO_ACEITOS;
const CANDIDATOS_GRAVACAO = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg"];

const EXTENSAO: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};

const SINONIMOS: Record<string, string> = {
  "audio/mp3": "audio/mpeg",
  "audio/x-mp3": "audio/mpeg",
  "audio/x-mpeg": "audio/mpeg",
  "audio/opus": "audio/ogg",
  "audio/x-aac": "audio/aac",
  "audio/wave": "audio/wav",
  "audio/vnd.wave": "audio/wav",
};

const POR_EXTENSAO: Record<string, string> = {
  webm: "audio/webm",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/ogg",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
};

function tipoBase(mime: string): string {
  return mime.split(";")[0].trim().toLowerCase();
}

/** Tipo aceito pela API para um arquivo escolhido, ou null se o formato não serve. */
function tipoDoArquivo(arquivo: File): string | null {
  let tipo = tipoBase(arquivo.type);
  tipo = SINONIMOS[tipo] ?? tipo;
  if (!ACEITOS.includes(tipo)) {
    const extensao = arquivo.name.split(".").pop()?.toLowerCase() ?? "";
    tipo = POR_EXTENSAO[extensao] ?? tipo;
  }
  return ACEITOS.includes(tipo) ? tipo : null;
}

function escolherTipoGravacao(): string {
  if (typeof MediaRecorder.isTypeSupported !== "function") return "";
  return CANDIDATOS_GRAVACAO.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

/** Gravação só funciona em HTTPS (ou localhost) e em navegadores com MediaRecorder. */
function suportaGravacao(): boolean {
  try {
    return (
      window.isSecureContext &&
      typeof window.MediaRecorder !== "undefined" &&
      typeof navigator.mediaDevices?.getUserMedia === "function"
    );
  } catch {
    return false;
  }
}

const semInscricao = () => () => {};

/** Quantidade de barras da onda e de quanto em quanto tempo ela anda. */
const BARRAS_ONDA = 40;
const PASSO_ONDA_MS = 70;

function liberar(r: Recursos) {
  if (r.intervalo !== null) window.clearInterval(r.intervalo);
  if (r.animacao !== null) window.cancelAnimationFrame(r.animacao);
  r.intervalo = null;
  r.animacao = null;
  r.stream?.getTracks().forEach((t) => t.stop());
  r.stream = null;
  r.contexto?.close().catch(() => {});
  r.contexto = null;
}

function decorrido(r: Recursos): number {
  return r.acumuladoMs + (r.inicioTrecho !== null ? performance.now() - r.inicioTrecho : 0);
}

function formatarTempo(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

function mensagemErroMicrofone(erro: unknown): string {
  const nome = erro instanceof Error || erro instanceof DOMException ? erro.name : "";
  switch (nome) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return "Você não liberou o microfone. Para gravar, toque no cadeado (ou em “Configurações do site”) ao lado do endereço, permita o microfone e tente de novo. Se preferir, envie um arquivo de áudio.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "Não encontramos nenhum microfone neste aparelho. Você pode enviar um arquivo de áudio gravado no celular.";
    case "NotReadableError":
    case "TrackStartError":
      return "O microfone está sendo usado por outro aplicativo. Feche o outro app e tente de novo.";
    default:
      return "Não foi possível acessar o microfone. Tente de novo ou envie um arquivo de áudio.";
  }
}

/** Player do áudio gravado. A URL temporária é criada e liberada junto com o elemento. */
function PlayerAudio({ blob, rotulo }: { blob: Blob; rotulo: string }) {
  const conectar = useCallback(
    (el: HTMLAudioElement | null) => {
      if (!el) return;
      const url = URL.createObjectURL(blob);
      el.src = url;
      return () => {
        el.removeAttribute("src");
        URL.revokeObjectURL(url);
      };
    },
    [blob],
  );
  return (
    <audio ref={conectar} controls preload="metadata" aria-label={rotulo} className="h-11 w-full dark:[color-scheme:dark]" />
  );
}

/** Botões do painel escuro de gravação (sempre sobre bg-tinta, nos dois temas). */
const botaoPainel =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-[background-color,color,scale] duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-lima/60 focus-visible:ring-offset-2 focus-visible:ring-offset-tinta disabled:cursor-not-allowed disabled:opacity-50";

/** Troca suave entre os estados do gravador (pronto para gravar → gravando → áudio pronto). */
const trocaEstado = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.98 },
  transition: { duration: 0.3, ease: CURVA_IMPULSO },
} as const;

/**
 * Grava (ou recebe por arquivo) o áudio em que o jovem conta a própria história.
 * Sem MediaRecorder/microfone — ou fora de HTTPS — oferece só o envio de arquivo.
 */
export function GravadorAudio({ audio, onChange, onGravandoChange, desabilitado = false }: Props) {
  const podeGravar = useSyncExternalStore(semInscricao, suportaGravacao, () => false);
  const [status, setStatus] = useState<Status>("parado");
  const [tempoMs, setTempoMs] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  /** Barras da onda: atualizadas direto no DOM a cada passo (sem re-renderizar o React). */
  const ondaRef = useRef<HTMLDivElement>(null);
  const recursosRef = useRef<Recursos>({
    recorder: null,
    stream: null,
    contexto: null,
    intervalo: null,
    animacao: null,
    pedacos: [],
    acumuladoMs: 0,
    inicioTrecho: null,
    descartar: false,
    montado: false,
  });
  const onChangeRef = useRef(onChange);
  const onGravandoRef = useRef(onGravandoChange);
  const idDica = useId();
  const idArquivo = useId();

  useEffect(() => {
    onChangeRef.current = onChange;
    onGravandoRef.current = onGravandoChange;
  });

  // Ao sair da tela: para a gravação (o áudio ainda é entregue) e libera o microfone
  useEffect(() => {
    const r = recursosRef.current;
    r.montado = true;
    return () => {
      r.montado = false;
      if (r.recorder && r.recorder.state !== "inactive") {
        try {
          r.recorder.stop();
        } catch {
          // já parado
        }
      }
      liberar(r);
    };
  }, []);

  const ativo = status !== "parado";

  function finalizar(recorder: MediaRecorder, tipoEscolhido: string) {
    const r = recursosRef.current;
    const tipo = tipoBase(recorder.mimeType || r.pedacos[0]?.type || tipoEscolhido || "audio/webm");
    const pedacos = r.pedacos;
    const duracao = Math.round(r.acumuladoMs / 1000);
    const descartar = r.descartar;
    r.pedacos = [];
    r.recorder = null;
    r.descartar = false;
    liberar(r);
    setStatus("parado");
    onGravandoRef.current?.(false);
    if (descartar) return;

    const blob = new Blob(pedacos, { type: tipo });
    if (!blob.size) {
      setErro("A gravação ficou vazia. Confira se o microfone está funcionando e tente de novo.");
    } else if (!ACEITOS.includes(tipo)) {
      setErro("Seu navegador gravou num formato que não conseguimos usar. Envie um arquivo de áudio (MP3, M4A, OGG ou WAV).");
    } else if (blob.size > AUDIO_MAX_BYTES) {
      setErro("O áudio passou de 8 MB. Grave um áudio um pouco mais curto.");
    } else if (duracao < 3) {
      setErro("O áudio ficou curtinho demais. Grave pelo menos alguns segundos contando sobre você.");
    } else {
      onChangeRef.current({
        blob,
        nomeArquivo: `historia.${EXTENSAO[tipo] ?? "webm"}`,
        mimeType: tipo,
        duracaoSegundos: duracao,
        origem: "gravacao",
      });
    }
  }

  function parar() {
    const r = recursosRef.current;
    const recorder = r.recorder;
    if (!recorder || recorder.state === "inactive") return;
    r.acumuladoMs = decorrido(r);
    r.inicioTrecho = null;
    if (r.intervalo !== null) window.clearInterval(r.intervalo);
    r.intervalo = null;
    setTempoMs(r.acumuladoMs);
    setStatus("finalizando");
    recorder.stop();
  }

  function medirNivel(stream: MediaStream) {
    const r = recursosRef.current;
    try {
      const Contexto =
        window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Contexto) return;
      const contexto = new Contexto();
      r.contexto = contexto;
      const analisador = contexto.createAnalyser();
      analisador.fftSize = 512;
      contexto.createMediaStreamSource(stream).connect(analisador);
      const amostras = new Uint8Array(analisador.fftSize);
      // Histórico do volume: a onda anda da direita para a esquerda, como num gravador de voz
      const historico = new Array<number>(BARRAS_ONDA).fill(0);
      let ultimoPasso = 0;
      const desenhar = (agora: number) => {
        analisador.getByteTimeDomainData(amostras);
        let soma = 0;
        for (const v of amostras) {
          const x = (v - 128) / 128;
          soma += x * x;
        }
        const nivel = Math.min(1, Math.sqrt(soma / amostras.length) * 4);
        // Pausado (sem trecho em andamento): a onda congela
        if (r.inicioTrecho !== null && agora - ultimoPasso >= PASSO_ONDA_MS) {
          ultimoPasso = agora;
          historico.shift();
          historico.push(nivel);
          const barras = ondaRef.current?.children;
          if (barras) {
            for (let i = 0; i < barras.length; i++) {
              const altura = Math.max(0.08, Math.min(1, historico[i] ?? 0));
              (barras[i] as HTMLElement).style.transform = `scaleY(${altura.toFixed(3)})`;
            }
          }
        }
        r.animacao = window.requestAnimationFrame(desenhar);
      };
      r.animacao = window.requestAnimationFrame(desenhar);
    } catch {
      // o indicador de volume é só um extra
    }
  }

  async function iniciar() {
    const r = recursosRef.current;
    if (!podeGravar || r.recorder) return;
    setErro(null);
    setAviso(null);
    setStatus("iniciando");
    onGravandoRef.current?.(true);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      setStatus("parado");
      onGravandoRef.current?.(false);
      setErro(mensagemErroMicrofone(e));
      return;
    }
    if (!r.montado) {
      stream.getTracks().forEach((t) => t.stop());
      onGravandoRef.current?.(false);
      return;
    }
    r.stream = stream;

    const tipoEscolhido = escolherTipoGravacao();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, {
        ...(tipoEscolhido ? { mimeType: tipoEscolhido } : {}),
        audioBitsPerSecond: 64000,
      });
    } catch {
      liberar(r);
      setStatus("parado");
      onGravandoRef.current?.(false);
      setErro("Não foi possível começar a gravação neste navegador. Você pode enviar um arquivo de áudio.");
      return;
    }

    r.pedacos = [];
    r.descartar = false;
    r.acumuladoMs = 0;
    r.inicioTrecho = performance.now();
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) r.pedacos.push(ev.data);
    };
    recorder.onstop = () => finalizar(recorder, tipoEscolhido);
    recorder.start(1000);
    r.recorder = recorder;

    setTempoMs(0);
    setStatus("gravando");
    r.intervalo = window.setInterval(() => {
      const ms = decorrido(r);
      setTempoMs(ms);
      if (ms >= AUDIO_MAX_SEGUNDOS * 1000) {
        setAviso("Você chegou ao limite de 5 minutos, então a gravação parou sozinha. Ouça e veja se ficou bom!");
        parar();
      }
    }, 250);
    medirNivel(stream);
  }

  function pausar() {
    const r = recursosRef.current;
    if (r.recorder?.state !== "recording") return;
    r.recorder.pause();
    r.acumuladoMs = decorrido(r);
    r.inicioTrecho = null;
    setTempoMs(r.acumuladoMs);
    setStatus("pausado");
  }

  function continuar() {
    const r = recursosRef.current;
    if (r.recorder?.state !== "paused") return;
    r.recorder.resume();
    r.inicioTrecho = performance.now();
    setStatus("gravando");
  }

  function descartarGravacao() {
    recursosRef.current.descartar = true;
    parar();
  }

  function regravar() {
    onChange(null);
    void iniciar();
  }

  function aoEscolherArquivo(ev: ChangeEvent<HTMLInputElement>) {
    const arquivo = ev.target.files?.[0];
    ev.target.value = "";
    if (!arquivo) return;
    setErro(null);
    setAviso(null);
    const tipo = tipoDoArquivo(arquivo);
    if (!tipo) {
      setErro("Esse formato de áudio não é aceito. Use MP3, M4A, OGG, OPUS, WEBM, AAC ou WAV.");
      return;
    }
    if (!arquivo.size) {
      setErro("Esse arquivo de áudio está vazio.");
      return;
    }
    if (arquivo.size > AUDIO_MAX_BYTES) {
      setErro(`Esse arquivo tem ${formatarTamanho(arquivo.size)} e o limite é 8 MB. Envie um áudio mais curto (até uns 5 minutos).`);
      return;
    }
    const blob = tipoBase(arquivo.type) === tipo ? arquivo : new Blob([arquivo], { type: tipo });
    onChange({ blob, nomeArquivo: `historia.${EXTENSAO[tipo]}`, mimeType: tipo, duracaoSegundos: null, origem: "arquivo" });
  }

  const statusLegivel =
    status === "iniciando"
      ? "Pedindo acesso ao microfone…"
      : status === "gravando"
        ? "Gravando"
        : status === "pausado"
          ? "Gravação pausada"
          : status === "finalizando"
            ? "Finalizando a gravação…"
            : audio
              ? "Áudio pronto"
              : "";

  // O input fica visualmente oculto, mas continua focável pelo teclado (o rótulo mostra o foco)
  const inputArquivo = (
    <input
      id={idArquivo}
      type="file"
      // Só "audio/*": no celular isso oferece o gravador nativo; o tipo é conferido em aoEscolherArquivo
      accept="audio/*"
      className="peer sr-only"
      onChange={aoEscolherArquivo}
      disabled={desabilitado || ativo}
      aria-describedby={idDica}
    />
  );

  const fracaoLimite = Math.min(1, tempoMs / (AUDIO_MAX_SEGUNDOS * 1000));
  const estadoVisual = audio && !ativo ? "pronto" : ativo ? "gravando" : "inicio";

  return (
    <div className="relative space-y-4 overflow-hidden rounded-3xl border border-marca/15 bg-gradient-to-br from-marca/[0.06] via-transparent to-ciano/[0.07] p-4 sm:p-5 dark:border-marca/25 dark:from-marca/[0.12] dark:to-ciano/[0.06]">
      <div id={idDica} className="space-y-1.5 text-sm leading-relaxed text-foreground/85">
        <p>
          Fale por até <strong className="font-semibold text-foreground">5 minutos</strong>: quem você é, o que já fez
          (vale bico, voluntariado, projeto da escola), o que gosta de fazer e que vaga procura.
        </p>
        <p className="text-muted-foreground">
          O áudio é enviado ao serviço de IA só para ser transcrito e virar o seu currículo.{" "}
          <strong className="font-semibold text-foreground">
            Ele não fica salvo na sua conta nem no nosso banco de dados
          </strong>{" "}
          — guardamos só o currículo.
        </p>
      </div>

      {/* Anúncios para leitores de tela */}
      <p className="sr-only" aria-live="polite">
        {statusLegivel}
      </p>

      <AnimatePresence mode="wait" initial={false}>
        {estadoVisual === "pronto" && audio ? (
          <motion.div key="pronto" {...trocaEstado} className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <motion.span
                initial={{ scale: 0.4, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 20, delay: 0.1 }}
                aria-hidden="true"
                className="flex size-8 items-center justify-center rounded-full bg-lima text-tinta"
              >
                <Check className="size-4" strokeWidth={3} />
              </motion.span>
              <p className="font-display text-base font-bold text-foreground">Áudio pronto</p>
              <span className="text-sm text-muted-foreground tabular-nums">
                {audio.duracaoSegundos ? `${formatarTempo(audio.duracaoSegundos * 1000)} · ` : ""}
                {formatarTamanho(audio.blob.size)}
              </span>
            </div>
            <PlayerAudio blob={audio.blob} rotulo="Ouvir o áudio da sua história" />
            <div className="flex flex-wrap gap-2">
              {podeGravar && (
                <button type="button" className={classeBotaoSecundario} onClick={regravar} disabled={desabilitado}>
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Gravar de novo
                </button>
              )}
              <button type="button" className={classeBotaoPerigo} onClick={() => onChange(null)} disabled={desabilitado}>
                <Trash2 className="size-4" aria-hidden="true" />
                Excluir áudio
              </button>
            </div>
          </motion.div>
        ) : estadoVisual === "gravando" ? (
          <motion.div
            key="gravando"
            {...trocaEstado}
            className="relative overflow-hidden rounded-2xl bg-tinta p-4 text-white shadow-xl ring-1 shadow-tinta/25 ring-white/10 sm:p-5"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-marca/35 blur-3xl"
            />
            <div className="relative flex flex-wrap items-center justify-between gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase ${
                  status === "gravando" ? "bg-destructive/20 text-white" : "bg-white/10 text-white/80"
                }`}
              >
                <span className="relative flex size-2.5" aria-hidden="true">
                  {status === "gravando" && (
                    <span className="absolute inset-0 rounded-full bg-destructive motion-safe:animate-ping" />
                  )}
                  <span
                    className={`relative size-2.5 rounded-full ${status === "gravando" ? "bg-destructive" : "bg-white/50"}`}
                  />
                </span>
                {statusLegivel}
              </span>
              <span role="timer" className="font-mono text-sm text-white/70 tabular-nums">
                <span className="font-display text-2xl font-bold tracking-tight text-white">{formatarTempo(tempoMs)}</span>{" "}
                / {formatarTempo(AUDIO_MAX_SEGUNDOS * 1000)}
              </span>
            </div>

            {/* Onda do volume da sua voz (decorativa: o estado é anunciado em texto) */}
            <div
              ref={ondaRef}
              aria-hidden="true"
              className={`relative mt-4 flex h-16 items-center gap-[3px] transition-opacity duration-300 ${
                status === "pausado" ? "opacity-40" : "opacity-100"
              }`}
            >
              {Array.from({ length: BARRAS_ONDA }, (_, i) => (
                <span
                  key={i}
                  className="h-full min-w-0 flex-1 rounded-full bg-gradient-to-t from-marca-clara via-ciano to-lima transition-transform duration-100 ease-out"
                  style={{ transform: "scaleY(0.08)" }}
                />
              ))}
            </div>

            {/* Quanto do limite de 5 minutos já foi usado */}
            <div className="relative mt-4 h-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
              <div
                className="h-full origin-left rounded-full bg-lima transition-transform duration-300 ease-linear"
                style={{ transform: `scaleX(${fracaoLimite})` }}
              />
            </div>

            <div className="relative mt-4 flex flex-wrap gap-2">
              {status === "gravando" && typeof MediaRecorder !== "undefined" && "pause" in MediaRecorder.prototype && (
                <button type="button" className={`${botaoPainel} bg-white/10 text-white hover:bg-white/20`} onClick={pausar}>
                  <Pause className="size-4" aria-hidden="true" />
                  Pausar
                </button>
              )}
              {status === "pausado" && (
                <button type="button" className={`${botaoPainel} bg-white/10 text-white hover:bg-white/20`} onClick={continuar}>
                  <Play className="size-4" aria-hidden="true" />
                  Continuar
                </button>
              )}
              <button
                type="button"
                className={`${botaoPainel} bg-lima text-tinta hover:bg-lima/90`}
                onClick={parar}
                disabled={status === "iniciando" || status === "finalizando"}
              >
                <Square className="size-3.5 fill-current" aria-hidden="true" />
                Concluir gravação
              </button>
              <button
                type="button"
                className={`${botaoPainel} text-white/75 hover:bg-white/10 hover:text-white`}
                onClick={descartarGravacao}
                disabled={status === "iniciando" || status === "finalizando"}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Descartar
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="inicio" {...trocaEstado} className="space-y-4">
            {podeGravar ? (
              <button
                type="button"
                className="group relative inline-flex min-h-14 items-center gap-3 rounded-full bg-marca py-2 pr-6 pl-2 text-sm font-semibold text-white shadow-lg shadow-marca/30 transition-[background-color,box-shadow,scale] duration-200 hover:bg-marca-forte hover:shadow-xl hover:shadow-marca/35 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void iniciar()}
                disabled={desabilitado}
              >
                <span className="relative flex size-10 items-center justify-center rounded-full bg-white/15" aria-hidden="true">
                  {/* Pulso que convida a gravar */}
                  <span className="absolute inset-0 rounded-full bg-white/35 motion-safe:animate-[ping_2.2s_cubic-bezier(0,0,0.2,1)_infinite]" />
                  <span className="absolute -inset-1 rounded-full ring-2 ring-white/20 motion-safe:animate-pulso-suave" />
                  <Mic className="relative size-5 transition-transform duration-200 group-hover:scale-110" />
                </span>
                Gravar minha história
              </button>
            ) : (
              <p className="text-sm leading-relaxed text-foreground/85">
                Por aqui não dá para gravar direto (a gravação só funciona em conexão segura). Grave um áudio no celular, no
                gravador de voz ou no WhatsApp, e envie o arquivo:
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {inputArquivo}
              <label
                htmlFor={idArquivo}
                className={`${classeBotaoSecundario} cursor-pointer peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background peer-disabled:cursor-not-allowed peer-disabled:opacity-60`}
              >
                <Upload className="size-4" aria-hidden="true" />
                {podeGravar ? "Ou envie um arquivo de áudio" : "Escolher arquivo de áudio"}
              </label>
              <p className="text-xs text-muted-foreground">MP3, M4A, OGG, OPUS, WEBM ou WAV · até 8 MB</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {aviso && (
        <p className="text-sm font-medium text-marca-forte dark:text-marca-clara" role="status">
          {aviso}
        </p>
      )}
      {erro && (
        <p className={`${classeErro} flex items-start gap-2 p-3 text-sm leading-relaxed`} role="alert">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          {erro}
        </p>
      )}
    </div>
  );
}
