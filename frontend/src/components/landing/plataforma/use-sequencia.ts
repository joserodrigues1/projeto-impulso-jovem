"use client";

import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";
import { useInView, useReducedMotion } from "motion/react";

interface Sequencia {
  /** Quantos marcos da linha do tempo já passaram (0 = nada começou). */
  passo: number;
  /**
   * true quando a animação terminou e dá para vê-la de novo. Nunca com "reduzir movimento" (o estado final
   * já aparece direto, então não há o que repetir).
   */
  podeRepetir: boolean;
  /** Recomeça a demonstração do zero. */
  repetir: () => void;
}

const assinarNada = () => () => {};

/**
 * false no servidor e durante a hidratação; true logo depois. Assim o primeiro render do navegador é igual
 * ao HTML do servidor (que não sabe da preferência "reduzir movimento") e não há erro de hidratação.
 */
function useHidratado(): boolean {
  return useSyncExternalStore(
    assinarNada,
    () => true,
    () => false,
  );
}

/**
 * Linha do tempo das demonstrações: quando o elemento entra na tela, avança um `passo` a cada marco
 * (em milissegundos desde o início). Roda uma vez; `repetir` recomeça.
 * Quem prefere menos movimento vê direto o estado final, sem esperas.
 * `marcos` precisa ser uma constante (fora do componente) para não reiniciar a cada renderização.
 */
export function useSequencia(ref: RefObject<Element | null>, marcos: readonly number[]): Sequencia {
  const visivel = useInView(ref, { once: true, amount: 0.35 });
  const hidratado = useHidratado();
  const reduzir = useReducedMotion() === true && hidratado;
  const [passo, setPasso] = useState(0);
  const [rodada, setRodada] = useState(0);

  useEffect(() => {
    if (!visivel || reduzir) return;
    const relogios = marcos.map((ms, i) => setTimeout(() => setPasso(i + 1), ms));
    return () => relogios.forEach(clearTimeout);
  }, [visivel, reduzir, rodada, marcos]);

  const atual = reduzir ? marcos.length : passo;
  return {
    passo: atual,
    podeRepetir: !reduzir && atual >= marcos.length,
    repetir: () => {
      setPasso(0);
      setRodada((r) => r + 1);
    },
  };
}
