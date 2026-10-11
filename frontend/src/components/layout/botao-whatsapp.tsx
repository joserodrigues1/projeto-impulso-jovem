"use client";

import { MessageCircle } from "lucide-react";
import { useConfigPublica } from "@/lib/config";
import { cn } from "@/lib/utils";

/**
 * Link do WhatsApp da IA recrutadora (GET /config/publica). `link` é null enquanto carrega
 * ou quando o servidor não tem número configurado — nesse caso os botões ficam ocultos.
 */
export function useLinkWhatsapp(): { link: string | null; carregando: boolean } {
  const { config, carregando } = useConfigPublica();
  const link = config.whatsappLink?.startsWith("https://") ? config.whatsappLink : null;
  return { link, carregando };
}

interface BotaoWhatsappProps {
  children?: React.ReactNode;
  className?: string;
  /** Sem número configurado: "oculto" (padrão) não renderiza nada; "em-breve" mostra um aviso desabilitado. */
  semNumero?: "oculto" | "em-breve";
}

const BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold whitespace-nowrap";

/** Botão para conversar com a IA recrutadora no WhatsApp (abre em nova aba). */
export function BotaoWhatsapp({ children = "Treinar no WhatsApp", className, semNumero = "oculto" }: BotaoWhatsappProps) {
  const { link, carregando } = useLinkWhatsapp();

  if (!link) {
    if (semNumero === "oculto" || carregando) return null;
    return (
      <span
        aria-disabled="true"
        className={cn(BASE, "cursor-not-allowed border border-dashed border-border text-muted-foreground", className)}
      >
        <MessageCircle aria-hidden="true" className="size-5" />
        WhatsApp em breve
      </span>
    );
  }

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        BASE,
        // Verde do WhatsApp em tom escuro: texto branco com contraste ≥ 4,5:1
        "bg-emerald-700 text-white shadow-[0_8px_24px_-10px_rgb(4_120_87/0.7)] transition-colors hover:bg-emerald-800",
        "focus-visible:ring-3 focus-visible:ring-emerald-500/50 focus-visible:outline-none",
        className,
      )}
    >
      <MessageCircle aria-hidden="true" className="size-5" />
      {children}
      <span className="sr-only"> (abre o WhatsApp em uma nova aba)</span>
    </a>
  );
}
