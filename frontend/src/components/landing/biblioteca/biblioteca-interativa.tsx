"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BookOpen,
  Compass,
  FileText,
  Languages,
  LayoutGrid,
  Lightbulb,
  Mail,
  MessagesSquare,
  Plus,
  Search,
  SearchX,
  X,
  type LucideIcon,
} from "lucide-react";
import { CURVA_IMPULSO, Revelar } from "@/components/movimento";
import { cn } from "@/lib/utils";
import { CartaoPrompt } from "./cartao-prompt";
import { CATEGORIAS, PROMPTS, type IdCategoria, type PromptBiblioteca } from "./prompts";
import { TextoPrompt } from "./texto-prompt";

type Filtro = IdCategoria | "todos";

/**
 * Quantos cartões aparecem de cada vez (o "Ver mais" soma outro tanto). No celular (abaixo do md) a grade é
 * uma coluna só, então mostra menos — só com CSS (max-md:hidden), para o HTML do servidor já sair certo
 * nas duas larguras, sem troca depois da hidratação.
 */
const POR_VEZ = 9;
const POR_VEZ_CELULAR = 6;

const ICONES: Record<Filtro, LucideIcon> = {
  todos: LayoutGrid,
  curriculo: FileText,
  entrevista: MessagesSquare,
  estudos: BookOpen,
  comunicacao: Mail,
  carreira: Compass,
  ingles: Languages,
};

const ABAS: ReadonlyArray<{ id: Filtro; nome: string }> = [{ id: "todos", nome: "Todos" }, ...CATEGORIAS];

const NOME_CATEGORIA = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c.nome])) as Record<IdCategoria, string>;

/** Minúsculas e sem acento: "Currículo" casa com "curriculo". */
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** Em "Todos", intercala as categorias (um de cada): os primeiros cartões já mostram a variedade. */
function intercalar(lista: readonly PromptBiblioteca[]): PromptBiblioteca[] {
  const filas = CATEGORIAS.map((c) => lista.filter((p) => p.categoria === c.id));
  const resultado: PromptBiblioteca[] = [];
  for (let rodada = 0; resultado.length < lista.length; rodada++) {
    for (const fila of filas) if (fila[rodada]) resultado.push(fila[rodada]);
  }
  return resultado;
}

const ORDEM = intercalar(PROMPTS);
const TEXTO_BUSCAVEL = new Map(
  PROMPTS.map((p) => [p.id, normalizar(`${p.titulo} ${p.quandoUsar} ${p.texto} ${NOME_CATEGORIA[p.categoria]}`)]),
);

const SUGESTOES_BUSCA = ["LinkedIn", "redação", "dinâmica", "WhatsApp"];

/** Biblioteca de prompts: abas por categoria, busca, grade animada e "Ver mais". */
export function BibliotecaInterativa() {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [paginas, setPaginas] = useState(1);
  const limite = paginas * POR_VEZ;
  const limiteCelular = paginas * POR_VEZ_CELULAR;
  const abasRef = useRef<Array<HTMLButtonElement | null>>([]);
  const listaRef = useRef<HTMLUListElement>(null);
  const buscaRef = useRef<HTMLInputElement>(null);
  // Depois do "Ver mais", o foco vai para o primeiro cartão novo (quem usa teclado não precisa voltar)
  const focarIndice = useRef<number | null>(null);

  const termos = useMemo(() => normalizar(busca).split(/\s+/).filter(Boolean), [busca]);

  // Resultado da busca (em todas as categorias) — base para a contagem das abas e para a lista
  const encontrados = useMemo(
    () => ORDEM.filter((p) => termos.every((t) => TEXTO_BUSCAVEL.get(p.id)?.includes(t))),
    [termos],
  );
  const contagem = useMemo(() => {
    const porAba = { todos: encontrados.length } as Record<Filtro, number>;
    for (const c of CATEGORIAS) porAba[c.id] = encontrados.filter((p) => p.categoria === c.id).length;
    return porAba;
  }, [encontrados]);

  const filtrados = filtro === "todos" ? encontrados : encontrados.filter((p) => p.categoria === filtro);
  const visiveis = filtrados.slice(0, limite);
  const restantes = filtrados.length - visiveis.length;
  const visiveisCelular = Math.min(limiteCelular, filtrados.length);
  const restantesCelular = filtrados.length - visiveisCelular;

  useEffect(() => {
    const indice = focarIndice.current;
    if (indice === null) return;
    focarIndice.current = null;
    listaRef.current?.querySelectorAll<HTMLElement>(":scope > li")[indice]?.focus({ preventScroll: true });
  }, [paginas]);

  function escolherFiltro(id: Filtro) {
    setFiltro(id);
    setPaginas(1);
  }

  function mudarBusca(valor: string) {
    setBusca(valor);
    setPaginas(1);
  }

  function limparBusca() {
    mudarBusca("");
    buscaRef.current?.focus();
  }

  function verMais() {
    // O primeiro cartão novo depende da largura (6 por vez no celular, 9 nas telas maiores)
    focarIndice.current = window.matchMedia("(max-width: 767px)").matches ? visiveisCelular : visiveis.length;
    setPaginas((atual) => atual + 1);
  }

  // Abas acessíveis: setas, Home e End movem o foco e já selecionam (padrão WAI-ARIA)
  function aoTeclarAba(evento: KeyboardEvent<HTMLButtonElement>, indice: number) {
    const total = ABAS.length;
    const destino: Record<string, number> = {
      ArrowRight: (indice + 1) % total,
      ArrowLeft: (indice - 1 + total) % total,
      Home: 0,
      End: total - 1,
    };
    const proximo = destino[evento.key];
    if (proximo === undefined) return;
    evento.preventDefault();
    escolherFiltro(ABAS[proximo].id);
    abasRef.current[proximo]?.focus();
  }

  const nomeFiltro = filtro === "todos" ? null : NOME_CATEGORIA[filtro];
  // No estado vazio, não sugere a mesma palavra que acabou de dar em nada
  const sugestoes = SUGESTOES_BUSCA.filter((sugestao) => normalizar(sugestao) !== termos.join(" "));
  const resumo =
    filtrados.length === 0 ? (
      "Nenhum prompt encontrado"
    ) : (
      <>
        Mostrando <span className="md:hidden">{visiveisCelular}</span>
        <span className="max-md:hidden">{visiveis.length}</span> de {filtrados.length}{" "}
        {filtrados.length === 1 ? "prompt" : "prompts"}
      </>
    );

  return (
    <div className="mt-12 md:mt-16">
      {/* Abas por categoria (no celular, rolam de lado) */}
      <Revelar y={16}>
        <div className="-mx-4 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          <div
            role="tablist"
            aria-label="Categorias de prompts"
            className="mx-auto flex w-max gap-1 rounded-full border bg-card/80 p-1.5 shadow-sm backdrop-blur"
          >
            {ABAS.map((aba, i) => {
              const ativa = aba.id === filtro;
              const Icone = ICONES[aba.id];
              return (
                <button
                  key={aba.id}
                  ref={(el) => {
                    abasRef.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`aba-prompts-${aba.id}`}
                  aria-selected={ativa}
                  aria-controls="painel-prompts"
                  tabIndex={ativa ? 0 : -1}
                  onClick={() => escolherFiltro(aba.id)}
                  onKeyDown={(evento) => aoTeclarAba(evento, i)}
                  className={cn(
                    "relative isolate inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors",
                    "focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none",
                    ativa ? "text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {ativa && (
                    <motion.span
                      layoutId="indicador-aba-prompts"
                      aria-hidden="true"
                      className="absolute inset-0 -z-10 rounded-full bg-marca shadow-md shadow-marca/30"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                  <Icone aria-hidden="true" className="size-4" />
                  {aba.nome}
                  <span
                    className={cn(
                      "min-w-5 rounded-full px-1.5 text-center text-[11px] leading-5 tabular-nums",
                      ativa ? "bg-white/20 text-white" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <span className="sr-only">(</span>
                    {contagem[aba.id]}
                    <span className="sr-only"> prompts)</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Revelar>

      {/* Busca + dica fixa + resumo do filtro */}
      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
        <div className="relative w-full shrink-0 lg:w-80">
          <label htmlFor="busca-prompts" className="sr-only">
            Buscar prompts
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            ref={buscaRef}
            id="busca-prompts"
            type="search"
            value={busca}
            onChange={(evento) => mudarBusca(evento.target.value)}
            placeholder="Buscar: LinkedIn, redação, inglês…"
            autoComplete="off"
            enterKeyHint="search"
            className={cn(
              "h-12 w-full rounded-full border bg-card pr-12 pl-11 text-[15px] shadow-sm transition-colors placeholder:text-muted-foreground",
              "focus-visible:border-marca/50 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
              "[&::-webkit-search-cancel-button]:appearance-none",
            )}
          />
          {busca && (
            <button
              type="button"
              onClick={limparBusca}
              aria-label="Limpar busca"
              className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          )}
        </div>
        <p className="flex items-start gap-2.5 rounded-2xl border border-dashed border-marca/30 bg-marca/5 px-4 py-3 text-sm leading-relaxed lg:rounded-full dark:bg-marca/10">
          <Lightbulb aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-marca-forte dark:text-marca-clara" />
          <span>
            Troque o que está entre <TextoPrompt texto="[colchetes]" className="font-mono text-[13px]" /> e cole na
            IA que você usa.
          </span>
        </p>
        <p aria-live="polite" className="text-sm text-muted-foreground tabular-nums lg:ml-auto lg:text-right">
          {resumo}
          {busca.trim() && filtrados.length > 0 && <> para “{busca.trim()}”</>}
        </p>
      </div>

      {/* Lista */}
      <div role="tabpanel" id="painel-prompts" aria-labelledby={`aba-prompts-${filtro}`} className="mt-6">
        {filtrados.length > 0 ? (
          <ul ref={listaRef} className="relative grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {visiveis.map((prompt, i) => (
                <motion.li
                  key={prompt.id}
                  layout="position"
                  tabIndex={-1}
                  initial={{ opacity: 0, y: 18, scale: 0.98 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, amount: 0.15 }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.5, ease: CURVA_IMPULSO, delay: (i % 3) * 0.05 }}
                  className={cn(
                    "rounded-3xl focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none",
                    i >= limiteCelular && "max-md:hidden",
                  )}
                >
                  <CartaoPrompt
                    prompt={prompt}
                    nomeCategoria={NOME_CATEGORIA[prompt.categoria]}
                    Icone={ICONES[prompt.categoria]}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: CURVA_IMPULSO }}
            className="flex flex-col items-center rounded-3xl border border-dashed bg-card/60 px-6 py-14 text-center"
          >
            <span className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <SearchX aria-hidden="true" className="size-6" />
            </span>
            <p className="mt-5 font-display text-xl font-semibold tracking-tight">
              Nada por aqui com “{busca.trim()}”{nomeFiltro && <> em {nomeFiltro}</>}
            </p>
            <p className="mt-2 max-w-md text-muted-foreground">
              Tente outra palavra ou uma destas:{" "}
              {sugestoes.map((sugestao, i) => (
                <span key={sugestao}>
                  <button
                    type="button"
                    onClick={() => {
                      setFiltro("todos");
                      mudarBusca(sugestao);
                    }}
                    className="rounded font-medium text-marca-forte underline decoration-marca/30 underline-offset-4 hover:decoration-current focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none dark:text-marca-clara"
                  >
                    {sugestao}
                  </button>
                  {i < sugestoes.length - 1 ? ", " : "."}
                </span>
              ))}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {filtro !== "todos" && contagem.todos > 0 && (
                <button
                  type="button"
                  onClick={() => escolherFiltro("todos")}
                  className="inline-flex h-11 items-center rounded-full bg-marca px-5 text-sm font-semibold text-white transition-colors hover:bg-marca-forte focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  Ver {contagem.todos} em todas as categorias
                </button>
              )}
              <button
                type="button"
                onClick={limparBusca}
                className="inline-flex h-11 items-center rounded-full border bg-background px-5 text-sm font-semibold transition-colors hover:border-marca/40 hover:bg-marca/5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                Limpar busca
              </button>
            </div>
          </motion.div>
        )}

        {restantesCelular > 0 && (
          <motion.div layout="position" className={cn("mt-10 flex justify-center", restantes === 0 && "md:hidden")}>
            <button
              type="button"
              onClick={verMais}
              className={cn(
                "group inline-flex h-12 items-center gap-2 rounded-full border bg-card px-6 text-[15px] font-semibold shadow-sm transition-colors",
                "hover:border-marca/40 hover:bg-marca/5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              )}
            >
              <Plus
                aria-hidden="true"
                className="size-4 text-marca-forte transition-transform duration-300 group-hover:rotate-90 dark:text-marca-clara"
              />
              Ver mais prompts
              <span className="text-muted-foreground tabular-nums">
                (<span className="md:hidden">{restantesCelular}</span>
                <span className="max-md:hidden">{restantes}</span>)
              </span>
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
