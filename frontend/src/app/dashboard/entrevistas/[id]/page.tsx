"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer, SearchX } from "lucide-react";
import { FundoAurora, Revelar } from "@/components/movimento";
import { ApiError, fetchApi, mensagemDeErro } from "@/lib/api";
import { useConfigPublica } from "@/lib/config";
import type { EntrevistaDetalhe } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { BotaoNovaSimulacao } from "@/components/entrevistas/botao-nova-simulacao";
import { EsqueletoRelatorio } from "@/components/entrevistas/esqueletos";
import { EstadoErro } from "@/components/entrevistas/estado-erro";
import { RelatorioEntrevistaView } from "@/components/entrevistas/relatorio-entrevista";
import { ESTILO_CARD, estiloBotao } from "@/components/entrevistas/utils";

type Estado =
  | { tipo: "carregando"; id: string }
  | { tipo: "ok"; id: string; entrevista: EntrevistaDetalhe }
  | { tipo: "nao-encontrado"; id: string }
  | { tipo: "erro"; id: string; mensagem: string; status: number };

/**
 * Impressão limpa: sem sombras e com papel branco. A navegação do painel some pelo `print:hidden` do layout.
 * As regras `.dark` são só reserva para navegadores sem o evento `beforeprint` (ver useImpressaoNoTemaClaro).
 */
const ESTILO_IMPRESSAO = `
@media print {
  @page { margin: 12mm; }
  html, body { height: auto !important; background: #fff !important; }
  body *:not(.sr-only) { box-shadow: none !important; overflow: visible !important; }
  .dark body, .dark body * { background-color: transparent !important; background-image: none !important; }
  .dark .relatorio-imprimivel, .dark .relatorio-imprimivel *:not(svg):not(svg *) { color: #1f2937 !important; }
}
`;

/** Imprime sempre com as cores do tema claro: no escuro, o PDF sairia com texto claro e fundos apagados. */
function useImpressaoNoTemaClaro() {
  useEffect(() => {
    const raiz = document.documentElement;
    let trocou = false;
    let esquemaAnterior = "";

    const antes = () => {
      if (!raiz.classList.contains("dark")) return;
      trocou = true;
      esquemaAnterior = raiz.style.colorScheme;
      raiz.classList.remove("dark");
      raiz.style.colorScheme = "light";
    };
    const depois = () => {
      if (!trocou) return;
      trocou = false;
      raiz.classList.add("dark");
      raiz.style.colorScheme = esquemaAnterior;
    };

    window.addEventListener("beforeprint", antes);
    window.addEventListener("afterprint", depois);
    return () => {
      window.removeEventListener("beforeprint", antes);
      window.removeEventListener("afterprint", depois);
      depois();
    };
  }, []);
}

export default function RelatorioEntrevistaPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const { config } = useConfigPublica();
  const [estado, setEstado] = useState<Estado>({ tipo: "carregando", id });
  const [tentativa, setTentativa] = useState(0);
  useImpressaoNoTemaClaro();

  useEffect(() => {
    if (!id) return;
    let ativo = true;
    fetchApi<EntrevistaDetalhe>(`/entrevistas/${encodeURIComponent(id)}`)
      .then((entrevista) => {
        if (!ativo) return;
        setEstado(
          entrevista?.relatorio
            ? { tipo: "ok", id, entrevista }
            : { tipo: "erro", id, mensagem: "O relatório veio incompleto. Tente de novo em instantes.", status: 0 },
        );
      })
      .catch((e: unknown) => {
        if (!ativo) return;
        // 400 = id em formato inválido; para quem usa, é o mesmo que "não existe".
        if (e instanceof ApiError && (e.status === 404 || e.status === 400)) {
          setEstado({ tipo: "nao-encontrado", id });
        } else {
          setEstado({
            tipo: "erro",
            id,
            mensagem: mensagemDeErro(e, "Não foi possível carregar o relatório agora."),
            status: e instanceof ApiError ? e.status : 0,
          });
        }
      });
    return () => {
      ativo = false;
    };
  }, [id, tentativa]);

  // Nome sugerido para o PDF ao "Salvar como PDF".
  const cargo = estado.tipo === "ok" ? estado.entrevista.cargoAlvo : null;
  useEffect(() => {
    if (!cargo) return;
    const anterior = document.title;
    document.title = `Relatório de entrevista - ${cargo}`;
    return () => {
      document.title = anterior;
    };
  }, [cargo]);

  function tentarDeNovo() {
    setEstado({ tipo: "carregando", id });
    setTentativa((t) => t + 1);
  }

  // Estado de outro id (navegação entre relatórios) conta como carregando.
  const atual: Estado = !id ? { tipo: "nao-encontrado", id } : estado.id === id ? estado : { tipo: "carregando", id };

  return (
    <div className="relatorio-imprimivel mx-auto max-w-5xl space-y-6 pb-12 print:max-w-none print:pb-0">
      <style>{ESTILO_IMPRESSAO}</style>

      <p className="hidden text-sm text-muted-foreground print:block">Impulso Jovem · Relatório de simulação de entrevista</p>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/dashboard/entrevistas" className={estiloBotao("secundario", "sm", "group")}>
          <ArrowLeft aria-hidden="true" className="transition-transform duration-200 group-hover:-translate-x-0.5" />
          Voltar para simulações
        </Link>
        {atual.tipo === "ok" && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => window.print()} className={estiloBotao("secundario", "sm")}>
              <Printer aria-hidden="true" />
              Imprimir / Salvar PDF
            </button>
            <BotaoNovaSimulacao tamanho="sm" rotulo="Nova simulação" />
          </div>
        )}
      </div>

      {atual.tipo === "carregando" && (
        <div aria-busy="true">
          <p className="sr-only" role="status">
            Carregando relatório…
          </p>
          <EsqueletoRelatorio />
        </div>
      )}

      {atual.tipo === "nao-encontrado" && (
        <Revelar y={12} transition={{ duration: 0.45 }} className={cn(ESTILO_CARD, "px-6 py-14 text-center")}>
          <span
            aria-hidden="true"
            className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground ring-1 ring-border"
          >
            <SearchX className="size-7" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-foreground">
            Não encontramos este relatório
          </h1>
          <p className="mx-auto mt-2 max-w-md leading-relaxed text-muted-foreground">
            Ele pode ter sido apagado ou o link está incompleto. Seus relatórios ficam todos na página de simulações.
          </p>
          <Link href="/dashboard/entrevistas" className={estiloBotao("primario", "md", "mt-7")}>
            Ver minhas simulações
          </Link>
        </Revelar>
      )}

      {atual.tipo === "erro" && (
        <EstadoErro
          titulo="Não foi possível carregar o relatório"
          mensagem={atual.mensagem}
          status={atual.status}
          onTentarDeNovo={tentarDeNovo}
        />
      )}

      {atual.tipo === "ok" && (
        <>
          <RelatorioEntrevistaView entrevista={atual.entrevista} whatsappLink={config.whatsappLink} />

          {/* Faixa sempre escura (mesma linguagem da chamada final da landing) */}
          <Revelar
            como="section"
            y={16}
            transition={{ duration: 0.5 }}
            aria-labelledby="proxima-simulacao"
            className="relative isolate flex flex-col gap-5 overflow-hidden rounded-3xl bg-tinta p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8 print:hidden"
          >
            <FundoAurora intensidade="suave" />
            <div className="max-w-xl">
              <h2 id="proxima-simulacao" className="font-display text-2xl font-bold tracking-tight">
                Bora treinar <span className="texto-gradiente">de novo?</span>
              </h2>
              <p className="mt-2 leading-relaxed text-white/75">
                Siga o plano de ação, pratique as perguntas e faça uma nova simulação para ver sua nota subir.
              </p>
            </div>
            <BotaoNovaSimulacao variante="clara" className="shrink-0" />
          </Revelar>
        </>
      )}
    </div>
  );
}
