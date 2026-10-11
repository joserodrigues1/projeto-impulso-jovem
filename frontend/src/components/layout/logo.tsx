import { useId } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  href?: string;
  /** "sm" no rodapé, "md" nos cabeçalhos, "lg" nas telas de entrada. */
  tamanho?: "sm" | "md" | "lg";
  /** Mostra o nome ao lado do símbolo. */
  comNome?: boolean;
  className?: string;
}

const TAMANHO_SIMBOLO = {
  sm: "size-7",
  md: "size-9",
  lg: "size-12",
} as const;

const TAMANHO_NOME = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-2xl",
} as const;

/**
 * Símbolo da marca: um "J" que sobe e vira seta (o impulso), sobre um bloco em degradê
 * violeta → ciano, com uma faísca lima. Decorativo: quem dá nome ao link é o texto ou o aria-label.
 */
export function SimboloImpulso({ className }: { className?: string }) {
  // Ids únicos: o símbolo aparece mais de uma vez na mesma página (cabeçalho e rodapé)
  const id = useId();
  const degrade = `${id}-degrade`;
  const brilho = `${id}-brilho`;

  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false" className={cn("shrink-0", className)}>
      <defs>
        <linearGradient id={degrade} x1="4" y1="38" x2="36" y2="2" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: "var(--marca-forte)" }} />
          <stop offset="0.5" style={{ stopColor: "var(--marca)" }} />
          <stop offset="1" style={{ stopColor: "var(--ciano)" }} />
        </linearGradient>
        <radialGradient id={brilho} cx="10" cy="4" r="26" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0.4" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill={`url(#${degrade})`} />
      <rect width="40" height="40" rx="12" fill={`url(#${brilho})`} />
      <rect x="0.5" y="0.5" width="39" height="39" rx="11.5" fill="none" stroke="#fff" strokeOpacity="0.22" />
      {/* "J" de Jovem que sobe e termina em seta */}
      <g fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11.5 24.5c0 3.1 2.1 4.8 4.9 4.8s4.9-1.7 4.9-4.8V10.8" />
        <path d="M15.4 16.7l5.9-5.9 5.9 5.9" />
      </g>
      {/* Faísca */}
      <path d="M29.6 21.2c.45 2.35 1.25 3.15 3.6 3.6-2.35.45-3.15 1.25-3.6 3.6-.45-2.35-1.25-3.15-3.6-3.6 2.35-.45 3.15-1.25 3.6-3.6Z" style={{ fill: "var(--lima)" }} />
    </svg>
  );
}

/** Marca do Impulso Jovem: símbolo + nome. A cor do nome acompanha o texto (`className` pode trocar). */
export function Logo({ href = "/", tamanho = "md", comNome = true, className }: LogoProps) {
  return (
    <Link
      href={href}
      aria-label={comNome ? undefined : "Impulso Jovem — página inicial"}
      className={cn(
        "group/logo inline-flex items-center gap-2.5 rounded-xl font-display font-bold tracking-tight text-foreground",
        className,
      )}
    >
      <SimboloImpulso
        className={cn(
          TAMANHO_SIMBOLO[tamanho],
          "drop-shadow-[0_6px_14px_color-mix(in_oklch,var(--marca)_35%,transparent)] transition-transform duration-300 ease-out group-hover/logo:-rotate-6 group-hover/logo:scale-105",
        )}
      />
      {comNome && (
        <span className={cn("leading-none whitespace-nowrap", TAMANHO_NOME[tamanho])}>
          Impulso<span className="font-semibold opacity-80"> Jovem</span>
        </span>
      )}
    </Link>
  );
}
