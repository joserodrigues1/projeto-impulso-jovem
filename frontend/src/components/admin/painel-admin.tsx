"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGroup, motion } from "motion/react";
import { ChartColumn, ScrollText, ShieldAlert, Users, type LucideIcon } from "lucide-react";
import { CURVA_IMPULSO, Revelar } from "@/components/movimento";
import { buttonVariants } from "@/components/ui/button";
import { rotasAdmin } from "@/lib/admin";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface Aba {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  exato?: boolean;
}

const ABAS: Aba[] = [
  { href: rotasAdmin.inicio, rotulo: "Visão geral", icone: ChartColumn, exato: true },
  { href: rotasAdmin.participantes, rotulo: "Participantes", icone: Users },
  { href: rotasAdmin.auditoria, rotulo: "Auditoria", icone: ScrollText },
];

function abaAtiva(pathname: string, aba: Aba): boolean {
  if (aba.exato) return pathname === aba.href;
  return pathname === aba.href || pathname.startsWith(`${aba.href}/`);
}

/** Abas da administração (Visão geral · Participantes · Auditoria), com o indicador deslizando entre elas. */
function AbasAdmin() {
  const pathname = usePathname() ?? "";
  return (
    <LayoutGroup id="abas-admin">
      <nav aria-label="Seções da administração" className="print:hidden">
        <ul className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-border bg-card p-1 shadow-sm shadow-tinta/[0.04] dark:bg-white/[0.03] dark:shadow-none">
          {ABAS.map((aba) => {
            const ativa = abaAtiva(pathname, aba);
            const Icone = aba.icone;
            return (
              <li key={aba.href} className="shrink-0">
                <Link
                  href={aba.href}
                  aria-current={ativa ? "page" : undefined}
                  className={cn(
                    "relative isolate inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold whitespace-nowrap outline-none transition-colors duration-200 focus-visible:ring-3 focus-visible:ring-ring/50",
                    ativa ? "text-white" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {ativa && (
                    <motion.span
                      layoutId="aba-admin-ativa"
                      aria-hidden="true"
                      transition={{ duration: 0.4, ease: CURVA_IMPULSO }}
                      className="absolute inset-0 -z-10 rounded-full bg-marca shadow-sm shadow-marca/30"
                    />
                  )}
                  <Icone aria-hidden="true" className="size-4" />
                  {aba.rotulo}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </LayoutGroup>
  );
}

/** Quem não é administrador vê só este aviso (a API também recusa as rotas /admin). */
function AcessoRestrito() {
  return (
    <Revelar y={12} transition={{ duration: 0.4 }}>
      <div className="relative isolate mx-auto flex max-w-lg flex-col items-center overflow-hidden rounded-3xl border border-border bg-card p-6 text-center shadow-[0_1px_2px_rgb(20_16_40/0.04),0_12px_32px_-18px_rgb(20_16_40/0.18)] sm:p-10 dark:shadow-none">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklch,var(--marca)_16%,transparent),transparent_75%)]"
        />
        <span
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-2xl bg-marca/10 text-marca-forte ring-1 ring-marca/20 dark:bg-marca/15 dark:text-marca-clara"
        >
          <ShieldAlert className="size-7" />
        </span>
        <h1 className="mt-5 font-display text-2xl leading-tight font-bold tracking-tight sm:text-3xl">Acesso restrito</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Esta área é só para a administração do Impulso Jovem. Se você acha que deveria ter acesso, fale com o
          responsável pela plataforma.
        </p>
        <Link href="/dashboard" className={buttonVariants({ size: "lg", className: "mt-6" })}>
          Voltar para o início
        </Link>
      </div>
    </Revelar>
  );
}

/**
 * Estrutura da área de administração: confere se a conta é admin (o menu e as telas dependem disso)
 * e mostra as abas. O PainelShell, acima, já garante que há alguém logado.
 */
export function PainelAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;
  if (user.tipoUsuario !== "ADMIN") return <AcessoRestrito />;

  return (
    <div className="mx-auto max-w-6xl min-w-0 space-y-6 pb-12">
      <AbasAdmin />
      {children}
    </div>
  );
}
