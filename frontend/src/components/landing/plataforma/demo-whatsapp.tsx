"use client";

import { useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, CheckCheck, Keyboard, Mic, Play, Smile } from "lucide-react";
import { CURVA_IMPULSO } from "@/components/movimento";
import { cn } from "@/lib/utils";
import { Palco } from "./palco";
import { useSequencia } from "./use-sequencia";

interface Mensagem {
  de: "helena" | "jovem";
  /** Momento (ms) em que a mensagem aparece. As da Helena têm "digitando…" antes. */
  em: number;
  hora: string;
  texto?: string;
  /** Mensagem de voz: duração exibida. */
  audio?: string;
}

/** Tempo em que a Helena fica "digitando…" antes de cada mensagem. */
const DIGITANDO = 1200;

const CONVERSA: Mensagem[] = [
  { de: "jovem", em: 300, hora: "19:02", texto: "Oi, Helena! Quero treinar uma entrevista" },
  {
    de: "helena",
    em: 2000,
    hora: "19:02",
    texto: "Oi! Eu sou a Helena, recrutadora virtual do Impulso Jovem. Para qual vaga você quer treinar hoje?",
  },
  { de: "jovem", em: 3100, hora: "19:03", texto: "Jovem aprendiz administrativo" },
  {
    de: "helena",
    em: 4800,
    hora: "19:03",
    texto: "Ótimo! Para começar: me conta um pouco sobre você e por que essa vaga te interessa?",
  },
  { de: "jovem", em: 6000, hora: "19:05", audio: "0:48" },
  {
    de: "helena",
    em: 7800,
    hora: "19:05",
    texto:
      "Legal saber que você ajuda na loja da sua tia! Me conta uma situação em que precisou resolver um problema com um cliente. O que você fez?",
  },
  { de: "jovem", em: 9000, hora: "19:08", texto: "encerrar" },
  {
    de: "helena",
    em: 10500,
    hora: "19:08",
    texto: "Combinado! Obrigada pela conversa. Seu relatório fica pronto em alguns minutos no seu painel.",
  },
];

/** Todos os momentos em que algo muda: cada mensagem e cada início de "digitando…". */
const MARCOS = [
  ...new Set(CONVERSA.flatMap((m) => (m.de === "helena" ? [m.em - DIGITANDO, m.em] : [m.em]))),
].sort((a, b) => a - b);

// Cores do WhatsApp (só do mock — não fazem parte da paleta do site)
const CORES = {
  tela: "bg-[#efeae2] dark:bg-[#0b141a]",
  topo: "bg-[#f7f5f3] text-[#111b21] dark:bg-[#202c33] dark:text-[#e9edef]",
  recebida: "bg-white text-[#111b21] dark:bg-[#202c33] dark:text-[#e9edef]",
  enviada: "bg-[#d9fdd3] text-[#111b21] dark:bg-[#005c4b] dark:text-[#e9edef]",
  hora: "text-[#667781] dark:text-[#8696a0]",
  verde: "bg-[#00a884]",
};

function Visto({ lida }: { lida: boolean }) {
  return (
    <CheckCheck
      className={cn("size-3.5 transition-colors duration-500", lida ? "text-[#53bdeb]" : "text-[#8696a0]")}
    />
  );
}

function Balao({ mensagem, lida }: { mensagem: Mensagem; lida: boolean }) {
  const minha = mensagem.de === "jovem";
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 14, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: CURVA_IMPULSO }}
      style={{ originX: minha ? 1 : 0, originY: 1 }}
      className={cn("flex", minha ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "relative max-w-[82%] rounded-[10px] px-2.5 pt-1.5 pb-1 text-[12.5px] leading-snug shadow-[0_1px_0.5px_rgb(11_20_26/0.13)]",
          minha ? cn(CORES.enviada, "rounded-tr-[3px]") : cn(CORES.recebida, "rounded-tl-[3px]"),
        )}
      >
        {mensagem.audio ? (
          <div className="flex w-[170px] items-center gap-2 py-1">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white">
              <Play className="size-3.5 translate-x-px fill-current" />
            </span>
            <span className="flex h-5 flex-1 items-center gap-[2px]">
              {[0.4, 0.7, 1, 0.6, 0.85, 0.5, 0.3, 0.75, 0.95, 0.55, 0.4, 0.8, 0.6, 0.35, 0.7, 0.5].map((a, i) => (
                <span key={i} className="block w-[2px] flex-1 rounded-full bg-current opacity-50" style={{ height: `${a * 100}%` }} />
              ))}
            </span>
          </div>
        ) : (
          <p className={cn(mensagem.texto === "encerrar" && "font-semibold")}>{mensagem.texto}</p>
        )}
        <span className={cn("mt-0.5 flex items-center justify-end gap-1 text-[10px]", CORES.hora)}>
          {mensagem.audio && <span className="mr-auto">{mensagem.audio}</span>}
          {mensagem.hora}
          {minha && <Visto lida={lida} />}
        </span>
      </div>
    </motion.div>
  );
}

function BalaoDigitando() {
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      transition={{ duration: 0.3, ease: CURVA_IMPULSO }}
      style={{ originX: 0, originY: 1 }}
      className="flex justify-start"
    >
      <div className={cn("flex items-center gap-1 rounded-[10px] rounded-tl-[3px] px-3 py-2.5", CORES.recebida)}>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full bg-current opacity-50"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          />
        ))}
      </div>
    </motion.div>
  );
}

/** Celular com a conversa: a Helena entrevista, o jovem responde por texto e áudio e digita "encerrar". */
function Celular({ agora }: { agora: number }) {
  const visiveis = CONVERSA.filter((m) => m.em <= agora);
  const digitando = CONVERSA.some((m) => m.de === "helena" && m.em - DIGITANDO <= agora && agora < m.em);

  return (
    <div className="relative mx-auto w-[272px] rounded-[2.6rem] bg-tinta p-[9px] shadow-[0_40px_80px_-30px_rgb(15_23_42/0.6)] ring-1 ring-white/10 sm:w-[300px]">
      {/* Botões laterais */}
      <span className="absolute top-24 -left-[3px] h-10 w-[3px] rounded-l bg-tinta-3" />
      <span className="absolute top-28 -right-[3px] h-14 w-[3px] rounded-r bg-tinta-3" />

      <div className={cn("relative flex h-[540px] flex-col overflow-hidden rounded-[2.1rem] sm:h-[580px]", CORES.tela)}>
        {/* Barra de status */}
        <div className={cn("flex items-center justify-between px-6 pt-2.5 pb-1 text-[11px] font-semibold", CORES.topo)}>
          <span>19:08</span>
          <span className="absolute top-2 left-1/2 h-5 w-20 -translate-x-1/2 rounded-full bg-tinta" />
          <span className="flex items-center gap-1">
            <span className="flex items-end gap-[1.5px]">
              {[4, 6, 8, 10].map((h) => (
                <span key={h} className="w-[2.5px] rounded-[1px] bg-current" style={{ height: h }} />
              ))}
            </span>
            <span className="ml-1 h-[9px] w-[18px] rounded-[3px] border border-current p-px">
              <span className="block h-full w-3/4 rounded-[1px] bg-current" />
            </span>
          </span>
        </div>

        {/* Topo da conversa */}
        <div className={cn("flex items-center gap-2.5 px-3 pt-1 pb-2.5 shadow-[0_1px_0_rgb(0_0_0/0.06)]", CORES.topo)}>
          <ArrowLeft className="size-4 opacity-70" />
          <span className="relative flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-marca to-ciano text-sm font-bold text-white">
            H
            <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-[#f7f5f3] bg-[#00a884] dark:border-[#202c33]" />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13.5px] font-semibold">Helena · Recrutadora virtual</p>
            <div className="relative h-4 text-[11px]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={digitando ? "digitando" : "online"}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className={cn("absolute inset-0", digitando ? "text-[#008069] dark:text-[#00a884]" : CORES.hora)}
                >
                  {digitando ? "digitando…" : "online"}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Mensagens (as mais antigas saem por cima) */}
        <div className="relative flex min-h-0 flex-1 flex-col justify-end gap-1.5 overflow-hidden px-2.5 pt-6 pb-2 [mask-image:linear-gradient(to_bottom,transparent,black_2.5rem)]">
          {/* Textura discreta do fundo */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:14px_14px] dark:opacity-[0.08]" />
          <motion.p
            layout="position"
            className="mx-auto mb-1 rounded-md bg-[#fff8c5] px-2 py-1 text-center text-[10px] leading-snug text-[#54656f] dark:bg-[#1d282f] dark:text-[#ffd279]"
          >
            Simulação de entrevista · responda por texto ou áudio
          </motion.p>
          {visiveis.map((m) => (
            <Balao key={m.em} mensagem={m} lida={agora > m.em} />
          ))}
          <AnimatePresence>{digitando && <BalaoDigitando key="digitando" />}</AnimatePresence>
        </div>

        {/* Barra de digitação */}
        <div className="flex items-center gap-1.5 px-2 pt-1 pb-3">
          <div className={cn("flex h-9 flex-1 items-center gap-2 rounded-full px-3 text-[12px]", CORES.recebida)}>
            <Smile className="size-4 opacity-50" />
            <span className="opacity-50">Mensagem</span>
            <Keyboard className="ml-auto size-4 opacity-40" />
          </div>
          <span className={cn("flex size-9 items-center justify-center rounded-full text-white", CORES.verde)}>
            <Mic className="size-4" />
          </span>
        </div>
      </div>
    </div>
  );
}

function Nota({ visivel, children, className }: { visivel: boolean; children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={false}
      animate={visivel ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.5, ease: CURVA_IMPULSO }}
      className={cn(
        "flex items-center gap-2.5 rounded-2xl border border-border bg-card/95 px-3 py-2 text-[12.5px] leading-snug font-medium text-foreground shadow-lg backdrop-blur",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

const ICONE_NOTA = "flex size-6 shrink-0 items-center justify-center rounded-full";

/** Demonstração animada da simulação de entrevista no WhatsApp com a Helena. */
export function DemoWhatsapp() {
  const ref = useRef<HTMLDivElement>(null);
  const { passo, podeRepetir, repetir } = useSequencia(ref, MARCOS);
  const agora = passo === 0 ? -1 : MARCOS[passo - 1];
  const audioEnviado = agora >= CONVERSA[4].em;
  const encerrou = agora >= CONVERSA[6].em;

  return (
    <Palco
      nome="simulação no WhatsApp"
      brilho="bg-emerald-400/25 dark:bg-emerald-500/15"
      podeRepetir={podeRepetir}
      aoRepetir={repetir}
      descricao="Demonstração: no WhatsApp, a Helena se apresenta, pergunta para qual vaga o jovem quer treinar e faz perguntas de entrevista. O jovem responde por texto e por áudio e, no fim, digita encerrar; a Helena avisa que o relatório fica pronto em alguns minutos no painel."
    >
      <div ref={ref} className="relative py-2">
        <Celular agora={agora} />

        {/* Notas: embaixo do celular; nas telas largas, nas laterais — sem cobrir as mensagens */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 xl:mt-0 xl:block">
          <Nota visivel={audioEnviado} className="xl:absolute xl:top-[36%] xl:left-0 xl:w-[9.5rem]">
            <span className={cn(ICONE_NOTA, "bg-[#00a884] text-white")}>
              <Mic className="size-3.5" />
            </span>
            <span>Pode responder por áudio</span>
          </Nota>
          <Nota visivel={encerrou} className="xl:absolute xl:right-0 xl:bottom-[18%] xl:w-[9.5rem]">
            <span className={cn(ICONE_NOTA, "bg-lima text-tinta")}>
              <Keyboard className="size-3.5" />
            </span>
            <span>
              Digite <strong className="font-semibold">encerrar</strong> para terminar
            </span>
          </Nota>
        </div>
      </div>
    </Palco>
  );
}
