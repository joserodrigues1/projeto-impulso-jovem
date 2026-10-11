"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ChevronRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { PainelNav } from "@/components/layout/painel-nav";
import { ProvedorMovimento } from "@/components/movimento";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoadingScreen } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth";
import { iniciais, primeiroNome } from "@/lib/utils";

const classeBotaoIcone =
  "inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none dark:hover:bg-white/[0.08]";

/** Nome da seção atual, mostrado na barra superior (a página tem o próprio título). */
const SECOES: Array<{ prefixo: string; nome: string }> = [
  { prefixo: "/dashboard/curriculo", nome: "Currículos" },
  { prefixo: "/dashboard/entrevistas", nome: "Entrevistas" },
  { prefixo: "/dashboard/perfil", nome: "Configurações" },
  { prefixo: "/dashboard/admin", nome: "Administração" },
];

function nomeDaSecao(pathname: string): string {
  return SECOES.find((secao) => pathname === secao.prefixo || pathname.startsWith(`${secao.prefixo}/`))?.nome ?? "Início";
}

/**
 * Estrutura do painel logado: barra lateral no computador, barra superior + menu (gaveta) no celular.
 * Também protege as rotas: visitante é levado ao login (com "proximo" para voltar depois).
 */
export function PainelShell({ children }: { children: React.ReactNode }) {
  const { user, loading, sessaoExpirada, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [menuAberto, setMenuAberto] = useState(false);
  const [saindo, setSaindo] = useState(false);
  // Se o usuário já esteve logado aqui e a sessão terminou por ação dele (sair/excluir conta),
  // quem chamou cuida da navegação — não mandamos para o login com "proximo".
  const jaTeveUsuario = useRef(false);

  useEffect(() => {
    if (user) jaTeveUsuario.current = true;
  }, [user]);

  useEffect(() => {
    if (loading || user) return;
    if (jaTeveUsuario.current && !sessaoExpirada) {
      // Garantia caso a navegação de quem encerrou a sessão não aconteça
      const espera = setTimeout(() => router.replace("/login"), 2500);
      return () => clearTimeout(espera);
    }
    // Visitante, ou sessão que expirou sozinha: depois de entrar, volta para esta mesma tela
    const atual = `${window.location.pathname}${window.location.search}`;
    router.replace(`/login?proximo=${encodeURIComponent(atual)}`);
  }, [loading, user, sessaoExpirada, router]);

  // Se a tela crescer para o tamanho de computador com o menu aberto, fecha (a gaveta some no md)
  useEffect(() => {
    const consulta = window.matchMedia("(min-width: 768px)");
    const aoMudar = (evento: MediaQueryListEvent) => {
      if (evento.matches) setMenuAberto(false);
    };
    consulta.addEventListener("change", aoMudar);
    return () => consulta.removeEventListener("change", aoMudar);
  }, []);

  async function sair() {
    setSaindo(true);
    setMenuAberto(false);
    await logout();
    router.replace("/login");
  }

  // Nunca mostra o painel para visitante — nem por um instante
  if (!user) {
    return (
      <LoadingScreen
        className="min-h-dvh bg-background"
        label={
          loading
            ? "Carregando seu painel…"
            : saindo
              ? "Saindo…"
              : sessaoExpirada
                ? "Sua sessão expirou. Abrindo o login…"
                : "Redirecionando para o login…"
        }
      />
    );
  }

  const nome = primeiroNome(user.nomeCompleto);
  const perfilAtivo = pathname === "/dashboard/perfil" || pathname.startsWith("/dashboard/perfil/");

  return (
    <ProvedorMovimento>
      <div className="min-h-dvh bg-background text-foreground print:bg-white">
        <a
          href="#conteudo"
          className="sr-only z-[60] rounded-full bg-marca px-4 py-2 font-semibold text-white shadow-lg focus:not-sr-only focus:fixed focus:top-3 focus:left-3 print:hidden"
        >
          Pular para o conteúdo
        </a>

        {/* Barra lateral (computador) */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar md:flex print:hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-[radial-gradient(circle,color-mix(in_oklch,var(--marca)_14%,transparent),transparent_70%)]"
          />
          <div className="relative flex h-16 shrink-0 items-center px-5">
            <Logo href="/dashboard" />
          </div>
          <PainelNav aoSair={sair} saindo={saindo} />
        </aside>

        <div className="relative flex min-h-dvh flex-col md:pl-64 print:min-h-0 print:pl-0">
          {/* Brilho suave da marca no topo do conteúdo (decorativo) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(60%_100%_at_70%_0%,color-mix(in_oklch,var(--marca)_8%,transparent),transparent_75%)] print:hidden"
          />

          {/* Barra superior */}
          <header className="vidro sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b border-border/70 px-3 sm:px-6 print:hidden">
            <DialogPrimitive.Root open={menuAberto} onOpenChange={setMenuAberto}>
              <DialogPrimitive.Trigger aria-label="Abrir menu" className={`${classeBotaoIcone} md:hidden`}>
                <Menu aria-hidden="true" className="size-6" />
              </DialogPrimitive.Trigger>
              <DialogPrimitive.Portal>
                <DialogPrimitive.Backdrop className="fixed inset-0 z-40 min-h-dvh bg-tinta/55 backdrop-blur-sm transition-opacity duration-300 data-ending-style:opacity-0 data-starting-style:opacity-0 md:hidden print:hidden dark:bg-black/60" />
                <DialogPrimitive.Popup className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col overflow-hidden rounded-r-3xl border-r border-sidebar-border bg-sidebar shadow-2xl outline-none transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] data-ending-style:-translate-x-full data-starting-style:-translate-x-full md:hidden print:hidden">
                  <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
                    <DialogPrimitive.Title className="sr-only">Menu do painel</DialogPrimitive.Title>
                    <Logo href="/dashboard" />
                    <DialogPrimitive.Close aria-label="Fechar menu" className={classeBotaoIcone}>
                      <X aria-hidden="true" className="size-6" />
                    </DialogPrimitive.Close>
                  </div>
                  <PainelNav aoNavegar={() => setMenuAberto(false)} aoSair={sair} saindo={saindo} />
                </DialogPrimitive.Popup>
              </DialogPrimitive.Portal>
            </DialogPrimitive.Root>

            <div className="min-w-0 md:hidden">
              <Logo href="/dashboard" tamanho="sm" />
            </div>

            {/* Onde a pessoa está (computador) */}
            <p className="hidden min-w-0 items-center gap-1.5 text-sm md:flex">
              <span className="text-muted-foreground">Painel</span>
              <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground/70" />
              <span className="truncate font-semibold text-foreground">{nomeDaSecao(pathname)}</span>
            </p>

            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <ThemeToggle />
              <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-border sm:block" />
              <Link
                href="/dashboard/perfil"
                aria-label={`Configurações da conta de ${nome}`}
                aria-current={perfilAtivo ? "page" : undefined}
                className="group flex items-center gap-2.5 rounded-full p-0.5 transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none sm:pr-3 dark:hover:bg-white/[0.07]"
              >
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--marca),var(--marca-forte))] text-xs font-bold text-white shadow-[0_6px_16px_-8px_var(--marca)] ring-2 ring-background transition-transform duration-200 group-hover:scale-105"
                >
                  {iniciais(user.nomeCompleto)}
                </span>
                <span aria-hidden="true" className="hidden max-w-40 truncate text-sm font-medium text-foreground sm:block">
                  {nome}
                </span>
              </Link>
            </div>
          </header>

          <main
            id="conteudo"
            tabIndex={-1}
            className="relative min-w-0 flex-1 px-4 py-6 outline-none sm:px-6 md:px-10 md:py-10 print:overflow-visible print:p-0"
          >
            {children}
          </main>
        </div>
      </div>
    </ProvedorMovimento>
  );
}
