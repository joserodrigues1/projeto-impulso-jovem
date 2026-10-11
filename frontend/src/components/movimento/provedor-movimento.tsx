"use client";

import { MotionConfig } from "motion/react";

/**
 * Configuração global das animações (motion). `reducedMotion="user"` respeita a preferência
 * "reduzir movimento" do sistema: transformações somem e só as mudanças de opacidade continuam.
 */
export function ProvedorMovimento({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
