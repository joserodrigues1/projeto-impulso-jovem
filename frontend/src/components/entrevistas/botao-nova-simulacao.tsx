"use client";

import { MessageCircle } from "lucide-react";
import { useConfigPublica } from "@/lib/config";
import { estiloBotao } from "./utils";

interface BotaoNovaSimulacaoProps {
  rotulo?: string;
  /** "clara": para faixas sempre escuras (bg-tinta). */
  variante?: "primario" | "secundario" | "clara";
  tamanho?: "md" | "sm";
  className?: string;
}

/**
 * Abre a conversa com a IA recrutadora no WhatsApp.
 * Sem número configurado na API, vira um botão desabilitado "Em breve".
 */
export function BotaoNovaSimulacao({
  rotulo = "Nova simulação no WhatsApp",
  variante = "primario",
  tamanho = "md",
  className,
}: BotaoNovaSimulacaoProps) {
  const { config, carregando } = useConfigPublica();
  const classes = estiloBotao(variante, tamanho, className);

  if (config.whatsappLink) {
    return (
      <a href={config.whatsappLink} target="_blank" rel="noopener noreferrer" className={`group ${classes}`}>
        <MessageCircle aria-hidden="true" className="transition-transform duration-300 group-hover:-rotate-12" />
        {rotulo}
        <span className="sr-only">(abre o WhatsApp em nova aba)</span>
      </a>
    );
  }

  if (carregando) {
    return (
      <button type="button" disabled className={classes}>
        <MessageCircle aria-hidden="true" />
        {rotulo}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled
      aria-label="Em breve: simulação de entrevista pelo WhatsApp"
      title="A simulação pelo WhatsApp ainda não está disponível."
      className={classes}
    >
      <MessageCircle aria-hidden="true" />
      Em breve
    </button>
  );
}
