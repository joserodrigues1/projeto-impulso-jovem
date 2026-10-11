"use client";

import { useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGroup, motion } from "motion/react";
import {
  Bot,
  ExternalLink,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useLinkWhatsapp } from "@/components/layout/botao-whatsapp";
import { CURVA_IMPULSO } from "@/components/movimento";
import { useAuth } from "@/lib/auth";
import { cn, iniciais } from "@/lib/utils";

interface ItemMenu {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  /** Ativo só na rota exata (o "Início" não deve acender nas páginas filhas). */
  exato?: boolean;
}

const ITENS: ItemMenu[] = [
  { href: "/dashboard", rotulo: "Início", icone: LayoutDashboard, exato: true },
  { href: "/dashboard/curriculo", rotulo: "Currículos", icone: FileText },
  { href: "/dashboard/entrevistas", rotulo: "Entrevistas", icone: Bot },
];

/** Só para a conta ADMIN (a área e a API também conferem; o menu só esconde o caminho de quem não é). */
const ADMINISTRACAO: ItemMenu = { href: "/dashboard/admin", rotulo: "Administração", icone: ShieldCheck };

const CONFIGURACOES: ItemMenu = { href: "/dashboard/perfil", rotulo: "Configurações", icone: Settings };

const classeItem =
  "group relative flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none";
const classeInativo = "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground";
const classeAtivo = "text-foreground";
const classeTituloGrupo = "px-3 pb-2 text-[0.6875rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase";

function estaAtivo(pathname: string, item: ItemMenu): boolean {
  if (item.exato) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function LinkMenu({ item, pathname, aoNavegar }: { item: ItemMenu; pathname: string; aoNavegar?: () => void }) {
  const ativo = estaAtivo(pathname, item);
  const Icone = item.icone;
  return (
    <Link
      href={item.href}
      onClick={aoNavegar}
      aria-current={ativo ? "page" : undefined}
      className={cn(classeItem, ativo ? classeAtivo : classeInativo)}
    >
      {/* Indicador do item ativo: desliza de um item para o outro ao trocar de página */}
      {ativo && (
        <motion.span
          layoutId="indicador-ativo"
          aria-hidden="true"
          transition={{ duration: 0.45, ease: CURVA_IMPULSO }}
          className="absolute inset-0 -z-10 rounded-xl border border-border bg-card shadow-[0_1px_2px_rgb(20_16_40/0.06),0_6px_16px_-10px_rgb(20_16_40/0.25)] dark:border-white/10 dark:bg-white/[0.07] dark:shadow-none"
        >
          <span className="absolute top-1/2 left-0 h-5 w-[3px] -translate-x-px -translate-y-1/2 rounded-full bg-marca dark:bg-marca-clara" />
        </motion.span>
      )}
      <Icone
        aria-hidden="true"
        className={cn(
          "size-5 shrink-0 transition-[color,transform] duration-200",
          ativo ? "text-marca dark:text-marca-clara" : "group-hover:scale-110",
        )}
      />
      {item.rotulo}
    </Link>
  );
}

interface PainelNavProps {
  /** Chamado ao clicar num link (fecha o menu do celular). */
  aoNavegar?: () => void;
  aoSair: () => void;
  saindo: boolean;
}

/** Itens do menu do painel — usados na barra lateral (computador) e no menu do celular. */
export function PainelNav({ aoNavegar, aoSair, saindo }: PainelNavProps) {
  const pathname = usePathname() ?? "";
  const { link: linkWhatsapp } = useLinkWhatsapp();
  const { user } = useAuth();
  // Cada instância (barra lateral e gaveta do celular) tem o próprio indicador animado
  const grupo = useId();
  const itens = user?.tipoUsuario === "ADMIN" ? [...ITENS, ADMINISTRACAO] : ITENS;

  return (
    <LayoutGroup id={grupo}>
      <nav aria-label="Menu do painel" className="isolate flex flex-1 flex-col gap-6 overflow-y-auto p-4">
        <div>
          <p aria-hidden="true" className={classeTituloGrupo}>
            Painel
          </p>
          <ul className="flex flex-col gap-1">
            {itens.map((item) => (
              <li key={item.href}>
                <LinkMenu item={item} pathname={pathname} aoNavegar={aoNavegar} />
              </li>
            ))}
          </ul>
        </div>

        {linkWhatsapp && (
          <a
            href={linkWhatsapp}
            target="_blank"
            rel="noopener noreferrer"
            onClick={aoNavegar}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-marca/30 hover:shadow-[0_12px_30px_-16px_var(--marca)] focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none dark:bg-white/[0.04] dark:hover:border-marca-clara/30"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full bg-[radial-gradient(circle,color-mix(in_oklch,var(--marca)_22%,transparent),transparent_70%)]"
            />
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <span
                aria-hidden="true"
                className="flex size-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm"
              >
                <MessageCircle className="size-4" />
              </span>
              IA no WhatsApp
              <ExternalLink
                aria-hidden="true"
                className="ml-auto size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </span>
            <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">
              Treine uma entrevista com a Helena, a recrutadora virtual.
            </span>
            <span className="sr-only">(abre em uma nova aba)</span>
          </a>
        )}

        <div className="mt-auto space-y-3 border-t border-sidebar-border pt-4">
          {user && (
            <div className="flex items-center gap-3 px-3 py-1">
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--marca),var(--marca-forte))] text-xs font-bold text-white shadow-sm"
              >
                {iniciais(user.nomeCompleto)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">{user.nomeCompleto}</span>
                <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
              </span>
            </div>
          )}
          <ul className="flex flex-col gap-1">
            <li>
              <LinkMenu item={CONFIGURACOES} pathname={pathname} aoNavegar={aoNavegar} />
            </li>
            <li>
              <button
                type="button"
                onClick={aoSair}
                disabled={saindo}
                className={cn(
                  classeItem,
                  "text-muted-foreground hover:bg-red-50 hover:text-red-700 disabled:opacity-60 dark:hover:bg-red-400/10 dark:hover:text-red-300",
                )}
              >
                <LogOut
                  aria-hidden="true"
                  className="size-5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                />
                {saindo ? "Saindo…" : "Sair"}
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </LayoutGroup>
  );
}
