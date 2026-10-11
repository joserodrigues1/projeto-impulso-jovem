"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
} from "motion/react";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { CURVA_IMPULSO } from "@/components/movimento";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export interface LinkCabecalho {
  href: string;
  rotulo: string;
}

const FOCO = "focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none";

const classeBotaoPrimario = cn(
  "group/cta inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-marca px-4 text-sm font-semibold whitespace-nowrap text-white",
  "shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--marca)_70%,transparent)] transition-colors hover:bg-marca-forte",
  FOCO,
);

/** Linha (em fração da altura da tela) que decide qual seção está "sendo lida". */
const LINHA_LEITURA = 0.4;

// ───────────────────────────── Seção ativa ─────────────────────────────

/**
 * Seção que está sendo lida: a última da lista cujo topo já passou da linha de leitura.
 * O IntersectionObserver avisa quando alguma seção cruza essa linha — só então recalcula.
 */
function useSecaoAtiva(ids: readonly string[]): string | null {
  const [ativa, setAtiva] = useState<string | null>(null);
  const chave = ids.join("|");

  useEffect(() => {
    const lista = chave ? chave.split("|") : [];
    const elementos = lista
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (!elementos.length) return;

    const recalcular = () => {
      const linha = window.innerHeight * LINHA_LEITURA;
      let atual: string | null = null;
      for (const el of elementos) {
        if (el.getBoundingClientRect().top <= linha) atual = el.id;
      }
      setAtiva(atual);
    };

    const observador = new IntersectionObserver(recalcular, {
      rootMargin: `-${LINHA_LEITURA * 100}% 0px -${100 - LINHA_LEITURA * 100 - 1}% 0px`,
    });
    elementos.forEach((el) => observador.observe(el));
    return () => observador.disconnect();
  }, [chave]);

  return ativa;
}

// ───────────────────────────── Fundo escuro por trás ─────────────────────────────

/** Luminosidade aproximada (0–1) e opacidade de uma cor calculada pelo navegador. */
function lerCor(cor: string): { luz: number; alfa: number } | null {
  const numeros = cor.match(/-?[\d.]+%?/g);
  if (!numeros) return null;
  const valor = (texto: string, escala = 1) =>
    texto.endsWith("%") ? parseFloat(texto) / 100 : parseFloat(texto) / escala;
  const alfaDe = (indice: number) => (cor.includes("/") || cor.startsWith("rgba") ? valor(numeros[indice] ?? "1") : 1);

  if (cor.startsWith("oklch") || cor.startsWith("oklab")) {
    return { luz: valor(numeros[0]), alfa: alfaDe(3) };
  }
  if (cor.startsWith("lab") || cor.startsWith("lch")) {
    return { luz: valor(numeros[0], 100), alfa: alfaDe(3) };
  }
  if (cor.startsWith("rgb")) {
    const [r, g, b] = numeros.slice(0, 3).map((n) => valor(n, 255));
    // Luminância relativa → luminosidade perceptiva (raiz cúbica, como no OKLab)
    return { luz: Math.cbrt(0.2126 * r ** 2.2 + 0.7152 * g ** 2.2 + 0.0722 * b ** 2.2), alfa: alfaDe(3) };
  }
  if (cor.startsWith("color(srgb")) {
    const [r, g, b] = numeros.slice(0, 3).map((n) => valor(n));
    return { luz: Math.cbrt(0.2126 * r ** 2.2 + 0.7152 * g ** 2.2 + 0.0722 * b ** 2.2), alfa: alfaDe(3) };
  }
  return null;
}

/**
 * true quando o cabeçalho está sobre uma faixa escura que ocupa a largura da tela (ex.: a abertura e a
 * chamada final, sempre escuras): aí o cabeçalho também fica escuro, para o texto manter o contraste.
 */
function useSobreFaixaEscura(cabecalho: React.RefObject<HTMLElement | null>, alturaAmostra: number): boolean {
  const [escuro, setEscuro] = useState(false);

  useEffect(() => {
    let quadro = 0;
    const medir = () => {
      quadro = 0;
      const pilha = document.elementsFromPoint(window.innerWidth / 2, alturaAmostra);
      const alvo = pilha.find((el) => !cabecalho.current?.contains(el));
      let resultado = false;
      for (let el: Element | null = alvo ?? null; el && el !== document.documentElement; el = el.parentElement) {
        // Só faixas de largura total contam (um cartão escuro no meio da página não muda o cabeçalho)
        if (el.getBoundingClientRect().width < window.innerWidth * 0.9) continue;
        const cor = lerCor(getComputedStyle(el).backgroundColor);
        if (cor && cor.alfa > 0.5) {
          resultado = cor.luz < 0.5;
          break;
        }
      }
      setEscuro(resultado);
    };
    const agendar = () => {
      if (!quadro) quadro = requestAnimationFrame(medir);
    };
    medir();
    window.addEventListener("scroll", agendar, { passive: true });
    window.addEventListener("resize", agendar);
    // O tema (classe .dark no <html>) muda as cores sem rolar a página
    const tema = new MutationObserver(agendar);
    tema.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      window.removeEventListener("scroll", agendar);
      window.removeEventListener("resize", agendar);
      tema.disconnect();
      if (quadro) cancelAnimationFrame(quadro);
    };
  }, [cabecalho, alturaAmostra]);

  return escuro;
}

// ───────────────────────────── Barra de progresso ─────────────────────────────

/** Barra fina no topo que acompanha a leitura da página. */
function BarraProgresso() {
  const { scrollYProgress } = useScroll();
  const reduzir = useReducedMotion();
  const suave = useSpring(scrollYProgress, { stiffness: 220, damping: 32, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX: reduzir ? scrollYProgress : suave }}
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-marca via-ciano to-lima"
    />
  );
}

// ───────────────────────────── Botão do menu (ícone animado) ─────────────────────────────

function IconeMenu({ aberto }: { aberto: boolean }) {
  const transicao = { duration: 0.35, ease: CURVA_IMPULSO };
  return (
    <span aria-hidden="true" className="relative block h-3.5 w-5">
      <motion.span
        className="absolute inset-x-0 top-0 h-0.5 rounded-full bg-current"
        animate={aberto ? { y: 6, rotate: 45 } : { y: 0, rotate: 0 }}
        transition={transicao}
      />
      <motion.span
        className="absolute inset-x-0 top-1.5 h-0.5 rounded-full bg-current"
        animate={aberto ? { opacity: 0, scaleX: 0.3 } : { opacity: 1, scaleX: 1 }}
        transition={transicao}
      />
      <motion.span
        className="absolute inset-x-0 top-3 h-0.5 rounded-full bg-current"
        animate={aberto ? { y: -6, rotate: -45 } : { y: 0, rotate: 0 }}
        transition={transicao}
      />
    </span>
  );
}

const SELETOR_FOCAVEL = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

// ───────────────────────────── Cabeçalho ─────────────────────────────

/**
 * Cabeçalho das páginas públicas: pílula de vidro flutuante. Na landing (quando recebe `links`), destaca a
 * seção que está sendo lida e mostra a barra de progresso de leitura. No celular, menu animado com foco
 * preso enquanto aberto (Esc fecha).
 */
export function CabecalhoPublico({ links = [] }: { links?: LinkCabecalho[] }) {
  const { user } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [rolado, setRolado] = useState(false);
  const cabecalhoRef = useRef<HTMLElement>(null);
  const botaoMenuRef = useRef<HTMLButtonElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);

  const ids = links.map((link) => link.href.replace(/^\/?#/, ""));
  const ativa = useSecaoAtiva(ids);
  const sobreEscuro = useSobreFaixaEscura(cabecalhoRef, 40);
  const temLinks = links.length > 0;

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setRolado(y > 12));

  const fechar = useCallback((devolverFoco = false) => {
    setAberto(false);
    if (devolverFoco) botaoMenuRef.current?.focus();
  }, []);

  // Menu aberto: Esc fecha, Tab circula só entre o botão do menu e os itens do painel, a página não rola
  useEffect(() => {
    if (!aberto) return;
    const primeiro = painelRef.current?.querySelector<HTMLElement>(SELETOR_FOCAVEL);
    primeiro?.focus();

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        fechar(true);
        return;
      }
      if (evento.key !== "Tab" || !painelRef.current || !botaoMenuRef.current) return;
      // Só o que está visível (o seletor de tema do painel some em telas médias)
      const itens = [...painelRef.current.querySelectorAll<HTMLElement>(SELETOR_FOCAVEL)].filter(
        (el) => el.getClientRects().length > 0,
      );
      const focaveis = [botaoMenuRef.current, ...itens];
      const indice = focaveis.indexOf(document.activeElement as HTMLElement);
      const proximo = evento.shiftKey
        ? indice <= 0
          ? focaveis.length - 1
          : indice - 1
        : indice === -1 || indice === focaveis.length - 1
          ? 0
          : indice + 1;
      evento.preventDefault();
      focaveis[proximo]?.focus();
    };

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAnterior;
    };
  }, [aberto, fechar]);

  // A tela cresceu para o tamanho de computador com o menu aberto: fecha (o menu some no lg)
  useEffect(() => {
    const consulta = window.matchMedia("(min-width: 1024px)");
    const aoMudar = (evento: MediaQueryListEvent) => {
      if (evento.matches) setAberto(false);
    };
    consulta.addEventListener("change", aoMudar);
    return () => consulta.removeEventListener("change", aoMudar);
  }, []);

  // As cores seguem os tokens do tema. Sobre uma faixa escura, a pílula recebe a classe `dark`: os tokens
  // (inclusive o fundo do `vidro`) passam a ser os do tema escuro só ali dentro, e o contraste se mantém.
  const tons = {
    link: "text-foreground/70 hover:text-foreground",
    linkAtivo: "text-foreground",
    indicador: "bg-marca/10 ring-1 ring-marca/15 dark:bg-white/10 dark:ring-white/15",
    texto: "text-foreground/80 hover:bg-foreground/6 hover:text-foreground",
    tema: "text-foreground/80 hover:bg-foreground/6 dark:text-foreground/80 dark:hover:bg-foreground/10",
  };

  return (
    <>
      {temLinks && <BarraProgresso />}
      <header ref={cabecalhoRef} className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4">
        {/* Fundo do menu do celular: clicar fora fecha */}
        <AnimatePresence>
          {aberto && (
            <motion.div
              aria-hidden="true"
              onClick={() => fechar()}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="pointer-events-auto fixed inset-0 bg-tinta/40 backdrop-blur-[3px] lg:hidden"
            />
          )}
        </AnimatePresence>

        <div className="relative mx-auto max-w-6xl">
          <div
            className={cn(
              "vidro pointer-events-auto flex h-14 items-center justify-between gap-2 rounded-full border border-foreground/10 py-2 pr-2 pl-3 text-foreground transition-[background-color,border-color,box-shadow,color] duration-300 sm:pl-4",
              sobreEscuro && "dark",
              rolado || aberto
                ? "shadow-[0_12px_40px_-12px_rgb(0_0_0/0.35)]"
                : "shadow-[0_4px_20px_-12px_rgb(0_0_0/0.2)]",
            )}
          >
            <Logo
              tamanho="sm"
              className={cn(
                // Onde falta espaço (telas bem estreitas e o início do lg) o nome fica só para leitores de tela
                "shrink-0 px-1 py-1 [&>span]:text-[1.05rem] max-[359px]:[&>span]:sr-only lg:[&>span]:sr-only xl:[&>span]:not-sr-only",
                FOCO,
              )}
            />

            {temLinks && (
              <nav aria-label="Seções da página" className="hidden lg:block">
                <LayoutGroup id="secoes-cabecalho">
                  <ul className="flex items-center gap-0.5 text-sm font-medium">
                    {links.map((link, i) => {
                      const eAtiva = ativa === ids[i];
                      return (
                        <li key={link.href} className="relative">
                          {eAtiva && (
                            <motion.span
                              layoutId="indicador-secao"
                              aria-hidden="true"
                              transition={{ type: "spring", stiffness: 380, damping: 32 }}
                              className={cn("absolute inset-0 rounded-full", tons.indicador)}
                            />
                          )}
                          <a
                            href={link.href}
                            aria-current={eAtiva ? "location" : undefined}
                            className={cn(
                              "relative inline-flex h-9 items-center rounded-full px-3.5 whitespace-nowrap transition-colors",
                              eAtiva ? tons.linkAtivo : tons.link,
                              FOCO,
                            )}
                          >
                            {link.rotulo}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </LayoutGroup>
              </nav>
            )}

            <div className="flex shrink-0 items-center gap-1">
              <ThemeToggle className={cn("hidden sm:inline-flex", tons.tema)} />
              {user ? (
                <Link href="/dashboard" className={classeBotaoPrimario}>
                  <LayoutDashboard aria-hidden="true" className="size-4" />
                  <span className="hidden min-[400px]:inline">Ir para o painel</span>
                  <span className="min-[400px]:hidden">Painel</span>
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className={cn(
                      "hidden h-10 items-center rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors lg:inline-flex",
                      tons.texto,
                      FOCO,
                    )}
                  >
                    Entrar
                  </Link>
                  <Link href="/registro" className={classeBotaoPrimario}>
                    Criar conta
                    <ArrowRight
                      aria-hidden="true"
                      className="hidden size-4 transition-transform duration-300 group-hover/cta:translate-x-0.5 sm:block"
                    />
                  </Link>
                </>
              )}
              <button
                ref={botaoMenuRef}
                type="button"
                onClick={() => setAberto((v) => !v)}
                aria-expanded={aberto}
                aria-controls="menu-publico"
                aria-label={aberto ? "Fechar menu" : "Abrir menu"}
                className={cn(
                  "inline-flex size-10 items-center justify-center rounded-full transition-colors lg:hidden",
                  tons.texto,
                  FOCO,
                )}
              >
                <IconeMenu aberto={aberto} />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {aberto && (
              <motion.div
                ref={painelRef}
                id="menu-publico"
                initial={{ opacity: 0, y: -10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.18 } }}
                transition={{ duration: 0.4, ease: CURVA_IMPULSO }}
                className="pointer-events-auto absolute inset-x-0 top-full mt-2 max-h-[calc(100dvh-6rem)] origin-top overflow-y-auto rounded-3xl border border-border bg-popover/95 p-3 text-popover-foreground shadow-2xl backdrop-blur-xl lg:hidden"
              >
                {temLinks && (
                  <nav aria-label="Seções da página">
                    <motion.ul
                      className="flex flex-col"
                      initial="oculto"
                      animate="visivel"
                      variants={{ oculto: {}, visivel: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } } }}
                    >
                      {links.map((link, i) => {
                        const eAtiva = ativa === ids[i];
                        return (
                          <motion.li
                            key={link.href}
                            variants={{
                              oculto: { opacity: 0, x: -8 },
                              visivel: { opacity: 1, x: 0, transition: { duration: 0.35, ease: CURVA_IMPULSO } },
                            }}
                          >
                            <a
                              href={link.href}
                              onClick={() => fechar()}
                              aria-current={eAtiva ? "location" : undefined}
                              className={cn(
                                "flex min-h-12 items-center gap-3 rounded-2xl px-3 text-base font-medium transition-colors hover:bg-muted",
                                eAtiva && "bg-marca/8 text-marca-forte dark:bg-white/8 dark:text-white",
                                FOCO,
                              )}
                            >
                              <span
                                aria-hidden="true"
                                className="w-6 font-mono text-xs text-muted-foreground tabular-nums"
                              >
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              {link.rotulo}
                              {eAtiva && <span aria-hidden="true" className="ml-auto size-1.5 rounded-full bg-lima" />}
                            </a>
                          </motion.li>
                        );
                      })}
                    </motion.ul>
                  </nav>
                )}

                <div className={cn("flex flex-col gap-2", temLinks && "mt-3 border-t border-border pt-3")}>
                  {user ? (
                    <Link href="/dashboard" onClick={() => fechar()} className={cn(classeBotaoPrimario, "h-12 w-full text-base")}>
                      <LayoutDashboard aria-hidden="true" className="size-4" />
                      Ir para o painel
                    </Link>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href="/login"
                        onClick={() => fechar()}
                        className={cn(
                          "inline-flex h-12 items-center justify-center rounded-full border border-border text-base font-semibold transition-colors hover:bg-muted",
                          FOCO,
                        )}
                      >
                        Entrar
                      </Link>
                      <Link href="/registro" onClick={() => fechar()} className={cn(classeBotaoPrimario, "h-12 text-base")}>
                        Criar conta
                      </Link>
                    </div>
                  )}
                  <div className="flex items-center justify-between rounded-2xl px-3 py-1 sm:hidden">
                    <span className="text-sm text-muted-foreground">Tema da página</span>
                    <ThemeToggle />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>
    </>
  );
}
