"use client";

import { motion, type Variants } from "motion/react";
import type { ComponentProps } from "react";

/** Curva padrão do site: começa rápida e assenta suave ("ease-out expo"). */
export const CURVA_IMPULSO = [0.16, 1, 0.3, 1] as const;

const ELEMENTOS = {
  div: motion.div,
  section: motion.section,
  li: motion.li,
  ul: motion.ul,
  ol: motion.ol,
  article: motion.article,
  p: motion.p,
  span: motion.span,
  h2: motion.h2,
  h3: motion.h3,
} as const;

type Elemento = keyof typeof ELEMENTOS;

interface RevelarProps extends Omit<ComponentProps<typeof motion.div>, "initial" | "whileInView"> {
  como?: Elemento;
  /** Atraso em segundos (para escalonar elementos soltos). */
  atraso?: number;
  /** Distância (px) que o elemento sobe ao aparecer. */
  y?: number;
  /** Fração do elemento que precisa estar visível para disparar (0–1). */
  quanto?: number;
}

/**
 * Faz o conteúdo aparecer (subindo e surgindo) quando entra na tela, uma única vez.
 * O texto está no HTML desde o servidor; só a entrada é animada.
 */
export function Revelar({ como = "div", atraso = 0, y = 24, quanto = 0.2, transition, ...props }: RevelarProps) {
  const Componente = ELEMENTOS[como] as typeof motion.div;
  return (
    <Componente
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: quanto }}
      transition={{ duration: 0.7, ease: CURVA_IMPULSO, delay: atraso, ...transition }}
      {...props}
    />
  );
}

const variantesGrupo: Variants = {
  oculto: {},
  visivel: (intervalo: number = 0.08) => ({ transition: { staggerChildren: intervalo } }),
};

const variantesItem: Variants = {
  oculto: { opacity: 0, y: 20 },
  visivel: { opacity: 1, y: 0, transition: { duration: 0.6, ease: CURVA_IMPULSO } },
};

interface RevelarGrupoProps extends Omit<ComponentProps<typeof motion.div>, "initial" | "whileInView" | "variants"> {
  como?: Elemento;
  /** Intervalo (s) entre um filho e o próximo. */
  intervalo?: number;
  quanto?: number;
}

/** Contêiner que revela os filhos <RevelarItem> em sequência quando entra na tela. */
export function RevelarGrupo({ como = "div", intervalo = 0.08, quanto = 0.15, ...props }: RevelarGrupoProps) {
  const Componente = ELEMENTOS[como] as typeof motion.div;
  return (
    <Componente
      initial="oculto"
      whileInView="visivel"
      viewport={{ once: true, amount: quanto }}
      custom={intervalo}
      variants={variantesGrupo}
      {...props}
    />
  );
}

interface RevelarItemProps extends Omit<ComponentProps<typeof motion.div>, "variants"> {
  como?: Elemento;
}

/** Filho de <RevelarGrupo>: aparece na vez dele. */
export function RevelarItem({ como = "div", ...props }: RevelarItemProps) {
  const Componente = ELEMENTOS[como] as typeof motion.div;
  return <Componente variants={variantesItem} {...props} />;
}
