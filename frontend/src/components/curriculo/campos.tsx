"use client";

import { useId, useState, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus, X } from "lucide-react";
import { CURVA_IMPULSO } from "@/components/movimento";

/** Estilo comum dos campos (altura confortável no celular e texto de 16px para o iOS não dar zoom). */
export const classeCampo =
  "block w-full min-h-11 rounded-xl border border-input bg-card px-3.5 py-2.5 text-base text-foreground shadow-xs shadow-tinta/[0.03] transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-muted-foreground/90 hover:border-marca/40 focus:border-marca focus:outline-none focus:ring-3 focus:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-input aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/20 dark:bg-white/[0.04] dark:hover:border-marca/50 dark:focus:bg-white/[0.06] dark:[color-scheme:dark]";

/**
 * Select com o mesmo estilo dos campos. Vazio (a 1ª opção, "Selecione…"), o texto fica com a cor de exemplo, como
 * o placeholder dos inputs — senão parece já preenchido. As opções da lista têm cor própria (globals.css).
 */
export const classeSelect = `${classeCampo} has-[option:first-child:checked]:text-muted-foreground`;

const baseBotao =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold whitespace-nowrap transition-[background-color,border-color,color,box-shadow,scale] duration-200 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100";

/** Botão principal (pílula na cor da marca). */
export const classeBotaoPrimario = `${baseBotao} bg-marca px-5 py-2.5 text-white shadow-sm shadow-marca/25 hover:bg-marca-forte hover:shadow-md hover:shadow-marca/30 disabled:hover:bg-marca disabled:hover:shadow-sm`;

/** Botão secundário (pílula com borda). */
export const classeBotaoSecundario = `${baseBotao} border border-border bg-card px-4 py-2.5 text-foreground hover:border-marca/35 hover:bg-muted dark:bg-white/5 dark:hover:bg-white/10`;

/** Botão só com texto na cor da marca. */
export const classeBotaoTexto = `${baseBotao} px-3 py-2 text-marca-forte hover:bg-marca/8 dark:text-marca-clara dark:hover:bg-marca/15`;

/** Ação destrutiva discreta (remover, excluir). */
export const classeBotaoPerigo = `${baseBotao} px-3 py-2 text-destructive hover:bg-destructive/10`;

/**
 * Ação destrutiva cheia (confirmar exclusão). No escuro o vermelho do tema é claro demais para texto branco:
 * escurece só o necessário para manter o contraste ≥ 4,5:1.
 */
export const classeBotaoPerigoCheio = `${baseBotao} bg-destructive px-5 py-2.5 text-white shadow-sm shadow-destructive/25 hover:bg-[color:color-mix(in_oklch,var(--destructive),black_12%)] dark:bg-[color:color-mix(in_oklch,var(--destructive),black_28%)] dark:hover:bg-[color:color-mix(in_oklch,var(--destructive),black_36%)]`;

/** Cartão padrão do painel (mesmo desenho das telas de entrevista). */
export const classeCartao =
  "rounded-3xl border border-border bg-card text-card-foreground shadow-sm shadow-tinta/[0.04] dark:shadow-none";

/** Recado na cor da marca (rascunho salvo, dados da conta…). */
export const classeRecado =
  "rounded-2xl border border-marca/20 bg-marca/[0.06] text-foreground dark:border-marca/30 dark:bg-marca/10";

/** Recado de atenção (âmbar): o texto fica na cor do tema, só a moldura é colorida. */
export const classeAtencao =
  "rounded-2xl border border-chart-4/45 bg-chart-4/10 text-foreground dark:border-chart-4/30 dark:bg-chart-4/[0.08]";

/** Caixa de erro: texto na cor do tema e moldura vermelha (contraste garantido nos dois temas). */
export const classeErro =
  "rounded-2xl border border-destructive/30 bg-destructive/[0.06] text-foreground dark:bg-destructive/10";

/** Ícone âmbar legível sobre fundo claro (o tom do tema é claro demais no tema claro). */
export const classeIconeAtencao = "text-[color:color-mix(in_oklch,var(--chart-4),black_35%)] dark:text-chart-4";

/** Etiqueta "Refinado pela IA". */
export const classeSeloIa =
  "inline-flex w-fit items-center gap-1 rounded-full border border-marca/20 bg-marca/8 px-2.5 py-1 text-xs font-semibold text-marca-forte dark:border-marca/30 dark:bg-marca/15 dark:text-marca-clara";

/** Link de "voltar" do topo das páginas. */
export const classeLinkVoltar =
  "group inline-flex min-h-11 items-center gap-1.5 rounded-full pr-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

/** Sobretítulo em pílula com ponto lima (mesmo desenho do cabeçalho de seção da landing). */
export const classeSobretitulo =
  "inline-flex items-center gap-2 rounded-full border border-marca/20 bg-marca/8 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-marca-forte uppercase dark:text-marca-clara";

interface PropsCampo {
  id: string;
  rotulo: ReactNode;
  dica?: ReactNode;
  erro?: string;
  opcional?: boolean;
  /** Mostra o contador "x/limite" (passe o tamanho atual e o limite). */
  contador?: { atual: number; limite: number };
  className?: string;
  children: (aria: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode;
}

/** Rótulo + campo + dica + erro, com os ids de acessibilidade ligados. */
export function Campo({ id, rotulo, dica, erro, opcional, contador, className, children }: PropsCampo) {
  const idDica = `${id}-dica`;
  const idErro = `${id}-erro`;
  const descritores = [dica ? idDica : null, erro ? idErro : null].filter(Boolean).join(" ") || undefined;
  const passou = contador ? contador.atual > contador.limite : false;
  // Contador ganha cor quando está quase no limite (90%)
  const perto = contador ? !passou && contador.atual >= contador.limite * 0.9 : false;

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold text-foreground">
          {rotulo}
          {opcional && <span className="ml-1 font-normal text-muted-foreground">(opcional)</span>}
        </label>
        {contador && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs tabular-nums transition-colors ${
              passou
                ? "bg-destructive/10 font-semibold text-destructive"
                : perto
                  ? "bg-chart-4/15 font-medium text-foreground"
                  : "text-muted-foreground"
            }`}
            aria-hidden="true"
          >
            {contador.atual}/{contador.limite}
          </span>
        )}
      </div>
      {children({ id, "aria-invalid": Boolean(erro), "aria-describedby": descritores })}
      {dica && (
        <p id={idDica} className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {dica}
        </p>
      )}
      {erro && (
        <p id={idErro} className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-destructive">
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-destructive" />
          {erro}
        </p>
      )}
    </div>
  );
}

interface PropsLista {
  id: string;
  rotulo: string;
  itens: string[];
  onChange: (itens: string[]) => void;
  limiteItens: number;
  limiteTexto: number;
  placeholder?: string;
  dica?: ReactNode;
  erro?: string;
  /** "chips": habilidades em etiquetas; "linhas": itens maiores, um embaixo do outro. */
  formato?: "chips" | "linhas";
  sugestoes?: readonly string[];
  /** Separa por vírgula ao digitar/colar (bom para habilidades, ruim para frases). */
  separarPorVirgula?: boolean;
  nomeItem: string;
  inputProps?: Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "value" | "onChange" | "onKeyDown">;
}

/** Chave estável de cada item (o texto; repetidos ganham um número), para animar entradas e saídas certas. */
function chavesDosItens(itens: string[]): string[] {
  const vistos = new Map<string, number>();
  return itens.map((item) => {
    const vezes = vistos.get(item) ?? 0;
    vistos.set(item, vezes + 1);
    return vezes ? `${item}#${vezes}` : item;
  });
}

const entradaItem = {
  initial: { opacity: 0, scale: 0.85 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.85 },
  transition: { duration: 0.25, ease: CURVA_IMPULSO },
} as const;

/** Lista editável: digita e aperta Enter (ou vírgula) para adicionar; cada item tem botão de remover. */
export function CampoLista({
  id,
  rotulo,
  itens,
  onChange,
  limiteItens,
  limiteTexto,
  placeholder,
  dica,
  erro,
  formato = "chips",
  sugestoes = [],
  separarPorVirgula = false,
  nomeItem,
  inputProps,
}: PropsLista) {
  const [rascunho, setRascunho] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const idStatus = useId();
  const cheio = itens.length >= limiteItens;
  const bloqueado = Boolean(inputProps?.disabled);
  const existentes = new Set(itens.map((i) => i.toLocaleLowerCase("pt-BR")));
  const chaves = chavesDosItens(itens);

  function adicionar(texto: string) {
    const novos = (separarPorVirgula ? texto.split(/[,;\n]/) : [texto]).map((t) => t.trim()).filter(Boolean);
    if (!novos.length) return;
    const lista = [...itens];
    const vistos = new Set(existentes);
    let cortado = false;
    for (const novo of novos) {
      const chave = novo.toLocaleLowerCase("pt-BR");
      if (vistos.has(chave)) continue;
      if (lista.length >= limiteItens) {
        cortado = true;
        break;
      }
      if (novo.length > limiteTexto) cortado = true;
      lista.push(novo.slice(0, limiteTexto));
      vistos.add(chave);
    }
    onChange(lista);
    setRascunho("");
    setMensagem(
      lista.length >= limiteItens
        ? `Você chegou ao limite de ${limiteItens} itens.`
        : cortado
          ? `Cada item pode ter até ${limiteTexto} caracteres.`
          : `${novos.length > 1 ? "Itens adicionados" : `“${novos[0]}” adicionado`}.`,
    );
  }

  function remover(indice: number) {
    const removido = itens[indice];
    onChange(itens.filter((_, i) => i !== indice));
    setMensagem(`“${removido}” removido.`);
  }

  function aoTeclar(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || (separarPorVirgula && e.key === ",")) {
      e.preventDefault();
      adicionar(rascunho);
    } else if (e.key === "Backspace" && !rascunho && itens.length && formato === "chips" && !bloqueado) {
      remover(itens.length - 1);
    }
  }

  const sugestoesLivres = sugestoes.filter((s) => !existentes.has(s.toLocaleLowerCase("pt-BR")));

  return (
    // Lista cheia: o aviso vai na dica visível (no placeholder de um campo desabilitado ficava quase ilegível)
    <Campo
      id={id}
      rotulo={rotulo}
      dica={cheio ? `Você chegou ao limite de ${limiteItens} itens. Remova um para adicionar outro.` : dica}
      erro={erro}
      opcional
    >
      {(aria) => (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              {...inputProps}
              {...aria}
              type="text"
              value={rascunho}
              placeholder={placeholder}
              disabled={cheio || bloqueado}
              maxLength={separarPorVirgula ? undefined : limiteTexto}
              onChange={(e) => {
                const valor = e.target.value;
                // colar "a, b, c" já separa
                if (separarPorVirgula && /[,;\n]/.test(valor)) adicionar(valor);
                else setRascunho(valor);
              }}
              onKeyDown={aoTeclar}
              // Texto digitado e não confirmado (sem Enter/Adicionar) entra na lista ao sair do campo —
              // senão ele sumiria ao tocar em "Continuar" ou mudar de etapa
              onBlur={(e) => {
                inputProps?.onBlur?.(e);
                if (rascunho.trim() && !cheio && !bloqueado) adicionar(rascunho);
              }}
              className={classeCampo}
            />
            <button
              type="button"
              className={`${classeBotaoSecundario} shrink-0`}
              onClick={() => adicionar(rascunho)}
              // Não desabilita com o campo vazio: ao clicar aqui, o onBlur do campo já adicionou o texto e o
              // botão desabilitado no meio do clique faria o foco se perder
              disabled={bloqueado || cheio}
              aria-label={`Adicionar ${nomeItem}`}
            >
              <Plus className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Adicionar</span>
            </button>
          </div>

          <p id={idStatus} className="sr-only" aria-live="polite">
            {mensagem}
          </p>

          {itens.length > 0 &&
            (formato === "chips" ? (
              <ul className="flex flex-wrap gap-2" aria-label={rotulo}>
                <AnimatePresence initial={false} mode="popLayout">
                  {itens.map((item, i) => (
                    <motion.li
                      key={chaves[i]}
                      layout
                      {...entradaItem}
                      className="inline-flex max-w-full items-center gap-1 rounded-full border border-marca/25 bg-marca/8 py-1 pr-1 pl-3 text-sm font-medium text-marca-forte dark:border-marca/35 dark:bg-marca/15 dark:text-marca-clara"
                    >
                      <span className="truncate">{item}</span>
                      <button
                        type="button"
                        onClick={() => remover(i)}
                        disabled={bloqueado}
                        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-marca/15 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:hover:bg-marca/25"
                        aria-label={`Remover ${nomeItem} ${item}`}
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            ) : (
              <ul className="space-y-2" aria-label={rotulo}>
                <AnimatePresence initial={false} mode="popLayout">
                  {itens.map((item, i) => (
                    <motion.li
                      key={chaves[i]}
                      layout
                      {...entradaItem}
                      className="flex items-start justify-between gap-2 rounded-xl border border-border bg-muted/50 py-2 pr-1 pl-3 text-sm text-foreground dark:bg-white/[0.03]"
                    >
                      <span className="min-w-0 pt-1 break-words">{item}</span>
                      <button
                        type="button"
                        onClick={() => remover(i)}
                        disabled={bloqueado}
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        aria-label={`Remover ${nomeItem}: ${item}`}
                      >
                        <X className="size-4" aria-hidden="true" />
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            ))}

          {sugestoesLivres.length > 0 && !cheio && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Sugestões (toque para adicionar):</p>
              <div className="flex flex-wrap gap-2">
                {sugestoesLivres.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => adicionar(s)}
                    disabled={bloqueado}
                    className="inline-flex min-h-9 items-center gap-1 rounded-full border border-dashed border-input px-3 text-sm text-muted-foreground transition-[background-color,border-color,color,scale] duration-200 hover:border-marca/50 hover:bg-marca/8 hover:text-marca-forte focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95 dark:hover:bg-marca/15 dark:hover:text-marca-clara"
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Campo>
  );
}
