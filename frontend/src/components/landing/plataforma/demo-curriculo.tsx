"use client";

import { useEffect, useRef } from "react";
import { animate, AnimatePresence, motion, useMotionValue, useTransform, type Variants } from "motion/react";
import { Check, Keyboard, Mic, Sparkles } from "lucide-react";
import { CURVA_IMPULSO } from "@/components/movimento";
import { cn } from "@/lib/utils";
import { Palco } from "./palco";
import { useSequencia } from "./use-sequencia";

// Cores do modelo de currículo da plataforma (não mudam com o tema do site)
const NAVY = "#2B5576";
const AZUL_CLARO = "#5BA4D0";
const CINZA = "#EEF1F4";

/** Marcos (ms): começa a gravar → envia o áudio → monta o currículo → pronto. */
const MARCOS = [300, 4300, 5300, 7600] as const;
const DURACAO_GRAVACAO = (MARCOS[1] - MARCOS[0]) / 1000;

const TRANSCRICAO =
  "Tenho 17 anos, estou no 2º ano do ensino médio e aos sábados ajudo na loja da minha tia: atendo clientes e organizo o estoque…";

/** Alturas fixas das barras da onda de áudio (parecem aleatórias, mas não mudam entre servidor e navegador). */
const ONDA = [0.35, 0.6, 0.9, 0.5, 0.75, 1, 0.55, 0.3, 0.65, 0.95, 0.7, 0.4, 0.85, 0.6, 0.3, 0.7, 1, 0.5, 0.8, 0.45, 0.6, 0.35];

function formatarTempo(segundos: number): string {
  const s = Math.floor(segundos);
  return `0:${String(s).padStart(2, "0")}`;
}

// ───────────────────────────── Miniatura do currículo ─────────────────────────────

const grupo: Variants = {
  oculto: {},
  visivel: { transition: { staggerChildren: 0.075, delayChildren: 0.05 } },
};
const linha: Variants = {
  oculto: { opacity: 0, y: 6 },
  visivel: { opacity: 1, y: 0, transition: { duration: 0.45, ease: CURVA_IMPULSO } },
};
const barra: Variants = {
  oculto: { opacity: 0, scaleX: 0 },
  visivel: { opacity: 1, scaleX: 1, transition: { duration: 0.55, ease: CURVA_IMPULSO } },
};

function Barra({ largura, className }: { largura: string; className?: string }) {
  return (
    <motion.span
      variants={barra}
      style={{ width: largura }}
      className={cn("block h-[3px] origin-left rounded-full bg-[#c9d3dc]", className)}
    />
  );
}

function TituloCv({ children }: { children: React.ReactNode }) {
  return (
    <motion.div variants={linha} className="mt-[9px]">
      <p className="text-[5.5px] leading-none font-bold tracking-[0.32em] uppercase" style={{ color: AZUL_CLARO }}>
        {children}
      </p>
      <span className="mt-[3px] block h-[1.2px] w-[46px]" style={{ background: NAVY }} />
    </motion.div>
  );
}

/** Currículo em miniatura no modelo real da plataforma (faixas onduladas, foto redonda, coluna cinza). */
function MiniCurriculo({ montado }: { montado: boolean }) {
  return (
    <motion.div
      initial={false}
      animate={montado ? "visivel" : "oculto"}
      variants={grupo}
      className="relative aspect-[210/297] w-[230px] overflow-hidden rounded-[6px] bg-white text-[#34414e] shadow-[0_30px_60px_-20px_rgb(15_23_42/0.45)] ring-1 ring-black/5 sm:w-[262px] lg:w-[236px] xl:w-[292px]"
    >
      {/* Faixa ondulada do topo */}
      <motion.svg
        variants={linha}
        viewBox="0 0 210 30"
        preserveAspectRatio="none"
        className="absolute inset-x-0 top-0 h-[12%] w-full"
      >
        <path d="M0 0H210V16C182 19 152 6 106 8C66 10 32 22 0 26Z" fill={NAVY} />
        <path
          d="M0 28.4C32 24.4 66 12.4 106 10.4C152 8.4 182 21.4 210 18.4"
          fill="none"
          stroke={AZUL_CLARO}
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </motion.svg>

      <div className="absolute inset-x-0 top-[13%] bottom-[11%] grid grid-cols-[37%_1fr] gap-x-[6%] pr-[7%]">
        {/* Coluna lateral */}
        <div className="flex min-w-0 flex-col">
          <motion.div
            variants={linha}
            className="mx-auto flex aspect-square w-[66%] items-center justify-center border-[3px] text-[13px] font-extrabold tracking-wide"
            style={{
              borderColor: NAVY,
              color: NAVY,
              background: CINZA,
              borderRadius: "52% 48% 47% 53% / 50% 54% 46% 50%",
            }}
          >
            AS
          </motion.div>
          <motion.div
            variants={linha}
            className="mt-[10px] flex-1 rounded-r-[12px] py-[8px] pr-[6px] pl-[12px]"
            style={{ background: CINZA }}
          >
            <p className="text-[5.5px] leading-none font-bold tracking-[0.32em] uppercase" style={{ color: AZUL_CLARO }}>
              Habilidades
            </p>
            <span className="mt-[3px] block h-[1.2px] w-[22px]" style={{ background: NAVY }} />
            <div className="mt-[6px] flex flex-wrap gap-[3px]">
              {["Atendimento", "Organização", "Excel básico", "Trabalho em equipe"].map((h) => (
                <motion.span
                  key={h}
                  variants={linha}
                  className="rounded-full px-[5px] py-[2px] text-[5px] leading-none font-semibold text-white"
                  style={{ background: NAVY }}
                >
                  {h}
                </motion.span>
              ))}
            </div>
            <p
              className="mt-[10px] text-[5.5px] leading-none font-bold tracking-[0.32em] uppercase"
              style={{ color: AZUL_CLARO }}
            >
              Idiomas
            </p>
            <span className="mt-[3px] block h-[1.2px] w-[22px]" style={{ background: NAVY }} />
            <motion.p variants={linha} className="mt-[5px] text-[5.5px] leading-tight">
              Inglês - básico
            </motion.p>
          </motion.div>
        </div>

        {/* Coluna principal */}
        <div className="min-w-0 pt-[2px]">
          <motion.p
            variants={linha}
            className="text-[15px] leading-none font-extrabold tracking-[0.02em] uppercase sm:text-[17px]"
            style={{ color: NAVY }}
          >
            Ana Souza
          </motion.p>
          <motion.span
            variants={barra}
            className="mt-[5px] block h-[1.5px] w-[50px] origin-left"
            style={{ background: NAVY }}
          />
          <motion.p
            variants={linha}
            className="mt-[5px] text-[5.5px] leading-tight font-semibold tracking-[0.12em] text-[#6b7a89] uppercase"
          >
            Jovem aprendiz administrativo
          </motion.p>
          <motion.div variants={linha} className="mt-[5px] flex flex-wrap gap-x-[6px] gap-y-[3px]">
            {[28, 36, 22].map((w) => (
              <span key={w} className="flex items-center gap-[2px]">
                <span className="size-[5px] rounded-full" style={{ background: NAVY }} />
                <span className="block h-[2.5px] rounded-full bg-[#c9d3dc]" style={{ width: w }} />
              </span>
            ))}
          </motion.div>

          <TituloCv>Perfil profissional</TituloCv>
          <div className="mt-[6px] space-y-[3.5px]">
            <Barra largura="100%" />
            <Barra largura="96%" />
            <Barra largura="92%" />
            <Barra largura="64%" />
          </div>

          <TituloCv>Experiência</TituloCv>
          <motion.p variants={linha} className="mt-[6px] text-[7px] leading-none font-bold" style={{ color: NAVY }}>
            Loja da família
          </motion.p>
          <motion.p variants={linha} className="mt-[3px] text-[5.5px] leading-none tracking-[0.06em] text-[#6b7a89]">
            Ajudante / 2024 - atual
          </motion.p>
          <div className="mt-[5px] space-y-[3.5px] pl-[6px]">
            <Barra largura="90%" />
            <Barra largura="78%" />
            <Barra largura="84%" />
          </div>

          <TituloCv>Formação acadêmica</TituloCv>
          <motion.p
            variants={linha}
            className="mt-[6px] text-[6.5px] leading-none font-bold tracking-[0.03em] uppercase"
            style={{ color: NAVY }}
          >
            Escola estadual
          </motion.p>
          <motion.p variants={linha} className="mt-[3px] text-[5.5px] leading-none tracking-[0.06em] text-[#6b7a89]">
            Ensino médio (cursando)
          </motion.p>

          <TituloCv>Cursos</TituloCv>
          <div className="mt-[6px] space-y-[3.5px] pl-[6px]">
            <Barra largura="82%" />
            <Barra largura="66%" />
          </div>
        </div>
      </div>

      {/* Faixa ondulada do rodapé */}
      <motion.svg
        variants={linha}
        viewBox="0 0 210 30"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-[9%] w-full"
      >
        <path d="M0 4C40 7 92 20 142 20.5C172 21 192 16.5 210 14V30H0Z" fill={NAVY} />
        <path
          d="M0 1.8C40 4.8 92 17.8 142 18.3C172 18.8 192 14.3 210 11.8"
          fill="none"
          stroke={AZUL_CLARO}
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </motion.svg>

      {/* Folha em branco esperando o conteúdo */}
      <AnimatePresence>
        {!montado && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            className="absolute inset-0 flex flex-col gap-[6px] p-[12%] pt-[20%]"
          >
            {[60, 90, 80, 95, 70, 85, 55].map((w, i) => (
              <span
                key={i}
                className="block h-[5px] animate-pulso-suave rounded-full bg-[#e7ecf1]"
                style={{ width: `${w}%`, animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ───────────────────────────── Gravação ─────────────────────────────

function CartaoGravacao({ gravando, enviado }: { gravando: boolean; enviado: boolean }) {
  const tempo = useMotionValue(0);
  const texto = useMotionValue(0);
  const tempoFormatado = useTransform(tempo, formatarTempo);
  const trecho = useTransform(texto, (n) => TRANSCRICAO.slice(0, Math.round(n)));

  useEffect(() => {
    if (enviado) {
      // Terminou (ou "reduzir movimento"): mostra tudo, sem animar
      tempo.set(Math.max(tempo.get(), DURACAO_GRAVACAO));
      texto.set(TRANSCRICAO.length);
      return;
    }
    if (!gravando) {
      tempo.set(0);
      texto.set(0);
      return;
    }
    const relogio = animate(tempo, DURACAO_GRAVACAO, { duration: DURACAO_GRAVACAO, ease: "linear" });
    const digitacao = animate(texto, TRANSCRICAO.length, { duration: DURACAO_GRAVACAO - 0.4, ease: "linear", delay: 0.3 });
    return () => {
      relogio.stop();
      digitacao.stop();
    };
  }, [gravando, enviado, tempo, texto]);

  return (
    <div className="w-full rounded-3xl border border-border bg-card/95 p-4 shadow-[0_24px_60px_-28px_rgb(15_23_42/0.45)] backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
          <span className="flex size-5 items-center justify-center rounded-full bg-marca/12 font-mono text-[10px] text-marca-forte dark:text-marca-clara">
            1
          </span>
          Grave ou digite
        </p>
        <span className="flex items-center rounded-full bg-muted p-0.5 text-muted-foreground">
          <span className="flex size-6 items-center justify-center rounded-full bg-background text-foreground shadow-sm">
            <Mic className="size-3.5" />
          </span>
          <span className="flex size-6 items-center justify-center">
            <Keyboard className="size-3.5" />
          </span>
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2.5 rounded-full bg-muted py-1.5 pr-3.5 pl-1.5">
        <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-marca text-white">
          {gravando && (
            <motion.span
              className="absolute inset-0 rounded-full bg-marca"
              animate={{ scale: [1, 1.7], opacity: [0.5, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
            />
          )}
          {enviado ? <Check className="relative size-4" /> : <Mic className="relative size-4" />}
        </span>
        <span className="flex h-8 flex-1 items-center gap-[3px]">
          {ONDA.map((altura, i) => (
            <motion.span
              key={i}
              className={cn("block w-[3px] flex-1 rounded-full", gravando || enviado ? "bg-marca" : "bg-foreground/20")}
              style={{ height: "100%", originY: 0.5 }}
              initial={false}
              animate={
                gravando
                  ? { scaleY: [altura * 0.4, altura, altura * 0.55, altura * 0.9, altura * 0.4] }
                  : { scaleY: enviado ? altura : 0.18 }
              }
              transition={
                gravando
                  ? { duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: (i % 7) * 0.09 }
                  : { duration: 0.4 }
              }
            />
          ))}
        </span>
        <motion.span className="w-8 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">
          {tempoFormatado}
        </motion.span>
      </div>

      <p className="mt-3 min-h-[4.6em] text-[13px] leading-relaxed text-muted-foreground">
        <span className="text-foreground/40">“</span>
        <motion.span>{trecho}</motion.span>
        {gravando && <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[0.15em] animate-cursor bg-marca" />}
        {enviado && <span className="text-foreground/40">”</span>}
      </p>

      <div className="mt-1 flex h-5 items-center text-xs font-medium">
        <AnimatePresence mode="wait" initial={false}>
          {enviado ? (
            <motion.span
              key="enviado"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300"
            >
              <Check className="size-3.5" /> Áudio enviado para a IA
            </motion.span>
          ) : gravando ? (
            <motion.span
              key="gravando"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-300"
            >
              <span className="size-2 animate-pulso-suave rounded-full bg-rose-500" /> Gravando… fale do seu jeito
            </motion.span>
          ) : (
            <motion.span key="parado" className="text-muted-foreground">
              Toque no microfone e conte sua história
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ───────────────────────────── Demonstração ─────────────────────────────

/** Demonstração animada: áudio → IA organiza → currículo se montando linha a linha. */
export function DemoCurriculo() {
  const ref = useRef<HTMLDivElement>(null);
  const { passo, podeRepetir, repetir } = useSequencia(ref, MARCOS);
  const gravando = passo === 1;
  const enviado = passo >= 2;
  const montado = passo >= 3;
  const pronto = passo >= 4;

  return (
    <Palco
      nome="currículo com IA"
      brilho="bg-ciano/25 dark:bg-ciano/15"
      podeRepetir={podeRepetir}
      aoRepetir={repetir}
      descricao="Demonstração: a pessoa grava um áudio contando sua história, a IA organiza as informações e um currículo no modelo da plataforma vai se montando, com foto, habilidades, perfil, experiência e formação."
    >
      <div
        ref={ref}
        className="relative flex flex-col items-center gap-4 sm:block sm:min-h-[430px] sm:pt-1 xl:min-h-[450px]"
      >
        <div className="relative z-20 w-full max-w-[320px] sm:absolute sm:top-0 sm:left-0 sm:w-[280px] lg:w-[256px] xl:w-[280px]">
          <CartaoGravacao gravando={gravando} enviado={enviado} />
        </div>

        {/* Fio que leva o áudio até a IA */}
        <div className="absolute top-[262px] bottom-[74px] left-[30px] z-10 hidden w-0 border-l-2 border-dashed border-marca/30 sm:block">
          {enviado && !pronto && (
            <motion.span
              className="absolute -left-[5px] size-2 rounded-full bg-marca shadow-[0_0_12px_var(--marca)]"
              initial={{ top: "0%", opacity: 0 }}
              animate={{ top: ["0%", "100%"], opacity: [0, 1, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "easeIn" }}
            />
          )}
        </div>

        {/* Etapa 2: a IA organiza */}
        <div className="relative z-20 sm:absolute sm:bottom-6 sm:left-2">
          <motion.div
            initial={false}
            animate={{ opacity: enviado ? 1 : 0.55, scale: enviado ? 1 : 0.96 }}
            transition={{ duration: 0.4, ease: CURVA_IMPULSO }}
            className="relative inline-flex items-center gap-2.5 overflow-hidden rounded-full border border-border bg-card py-2 pr-4 pl-2 text-[13px] font-semibold text-foreground shadow-lg"
          >
            {enviado && !pronto && (
              <span className="pointer-events-none absolute inset-y-0 left-0 w-1/2 animate-brilho bg-gradient-to-r from-transparent via-marca/20 to-transparent" />
            )}
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full transition-colors duration-500",
                pronto ? "bg-lima text-tinta" : "bg-gradient-to-br from-marca to-ciano text-white",
              )}
            >
              {pronto ? (
                <Check className="size-4" />
              ) : (
                <motion.span
                  className="inline-flex"
                  animate={enviado ? { rotate: 360 } : { rotate: 0 }}
                  transition={enviado ? { duration: 2.4, repeat: Infinity, ease: "linear" } : { duration: 0 }}
                >
                  <Sparkles className="size-4" />
                </motion.span>
              )}
            </span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={pronto ? "pronto" : enviado ? "organizando" : "espera"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
              >
                {pronto ? "Currículo pronto para revisar" : enviado ? "A IA organiza…" : "2 · A IA organiza"}
              </motion.span>
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Etapa 3: o currículo se monta */}
        <div className="relative z-10 sm:ml-auto sm:w-fit sm:pr-2 lg:pr-0 xl:pr-6">
          <MiniCurriculo montado={montado} />
          <AnimatePresence>
            {pronto && (
              <motion.span
                initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
                animate={{ opacity: 1, scale: 1, rotate: -6 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 18 }}
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-lima px-3 py-1 text-xs font-bold whitespace-nowrap text-tinta shadow-lg"
              >
                PDF pronto
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Palco>
  );
}
