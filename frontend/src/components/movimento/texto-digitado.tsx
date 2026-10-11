"use client";

import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

const semAssinatura = () => () => {};

/** `false` no servidor e na hidratação; `true` depois — evita HTML diferente entre servidor e navegador. */
function useHidratado() {
  return useSyncExternalStore(
    semAssinatura,
    () => true,
    () => false,
  );
}

interface TextoDigitadoProps {
  texto: string;
  /** Milissegundos por caractere. */
  velocidade?: number;
  /** Espera (ms) antes de começar, depois de entrar na tela. */
  atraso?: number;
  className?: string;
  /** Mostra o cursor piscando enquanto digita (e um tempo depois). */
  comCursor?: boolean;
  /** Chamado quando termina de digitar. */
  aoTerminar?: () => void;
}

/**
 * Digita o texto letra por letra quando aparece na tela.
 * Leitores de tela e quem prefere menos movimento recebem o texto completo de imediato.
 */
export function TextoDigitado({
  texto,
  velocidade = 22,
  atraso = 300,
  className,
  comCursor = true,
  aoTerminar,
}: TextoDigitadoProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const visivel = useInView(ref, { once: true, amount: 0.6 });
  const hidratado = useHidratado();
  const prefereMenosMovimento = useReducedMotion();
  // A preferência "reduzir movimento" só existe no navegador: só vale depois da hidratação
  const reduzir = hidratado && Boolean(prefereMenosMovimento);
  const [quantos, setQuantos] = useState(0);
  const terminou = reduzir || quantos >= texto.length;
  // Evento de efeito: sempre chama a versão mais recente do callback sem reiniciar a digitação
  const avisarTermino = useEffectEvent(() => aoTerminar?.());

  useEffect(() => {
    if (!hidratado || !visivel || reduzir) return;
    let atual = 0;
    let intervalo: ReturnType<typeof setInterval> | undefined;
    const inicio = setTimeout(() => {
      intervalo = setInterval(() => {
        atual += 1;
        setQuantos(atual);
        if (atual >= texto.length) {
          clearInterval(intervalo);
          avisarTermino();
        }
      }, velocidade);
    }, atraso);
    return () => {
      clearTimeout(inicio);
      if (intervalo) clearInterval(intervalo);
    };
  }, [hidratado, visivel, reduzir, texto, velocidade, atraso]);

  useEffect(() => {
    if (reduzir) avisarTermino();
  }, [reduzir]);

  return (
    <span ref={ref} className={cn("relative", className)}>
      <span className="sr-only">{texto}</span>
      <span aria-hidden="true">
        {terminou ? texto : texto.slice(0, quantos)}
        {comCursor && !terminou && (
          <span className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[0.15em] animate-cursor bg-current" />
        )}
      </span>
    </span>
  );
}
