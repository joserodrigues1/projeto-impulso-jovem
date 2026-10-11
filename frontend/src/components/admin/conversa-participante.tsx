"use client";

import type { ReactNode } from "react";
import { useParams } from "next/navigation";
import { format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bot,
  Building2,
  CalendarDays,
  ClipboardList,
  Clock,
  HeartHandshake,
  Info,
  Mic,
  MessagesSquare,
  SearchX,
  UserRound,
} from "lucide-react";
import { EstadoErro } from "@/components/entrevistas/estado-erro";
import { RelatorioEntrevistaView } from "@/components/entrevistas/relatorio-entrevista";
import {
  apiAdmin,
  formatarDataHora,
  MOTIVO_CUIDADO,
  rotasAdmin,
  rotuloMotivoFinalizacao,
  type ConversaParticipante,
  type MensagemConversa,
} from "@/lib/admin";
import type { EntrevistaDetalhe } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { EsqueletoConversa } from "./esqueletos";
import { AvisoAcessoRegistrado, CabecalhoAdmin, EstadoVazio, SecaoAdmin, SeloStatusSessao } from "./ui-admin";
import { useRecursoAdmin } from "./use-recurso-admin";

/** Máximo de mensagens que a API devolve por simulação (LIMITE_MENSAGENS no módulo admin). */
const LIMITE_MENSAGENS = 1000;

function paraData(iso: string): Date | null {
  const data = new Date(iso);
  return isValid(data) ? data : null;
}

/** Duração legível entre o início e o fim ("12 min", "1 h 05 min"); null sem as duas pontas. */
function duracao(inicio: string, fim: string | null): string | null {
  const a = paraData(inicio);
  const b = fim ? paraData(fim) : null;
  if (!a || !b || b < a) return null;
  const minutos = Math.round((b.getTime() - a.getTime()) / 60_000);
  if (minutos < 1) return "menos de 1 min";
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  return `${horas} h ${String(minutos % 60).padStart(2, "0")} min`;
}

interface GrupoDoDia {
  /** AAAA-MM-DD no fuso do navegador. */
  dia: string;
  rotulo: string;
  mensagens: MensagemConversa[];
}

/** Separa as mensagens por dia (a conversa pode atravessar a meia-noite). */
function agruparPorDia(mensagens: MensagemConversa[]): GrupoDoDia[] {
  const grupos: GrupoDoDia[] = [];
  for (const m of mensagens) {
    const data = paraData(m.criadoEm);
    const dia = data ? format(data, "yyyy-MM-dd") : "";
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.dia === dia) ultimo.mensagens.push(m);
    else
      grupos.push({
        dia,
        rotulo: data ? format(data, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Data desconhecida",
        mensagens: [m],
      });
  }
  return grupos;
}

/** Um balão da conversa: Helena à esquerda, participante à direita (como no WhatsApp). */
function Balao({ mensagem, primeiraDoAutor }: { mensagem: MensagemConversa; primeiraDoAutor: boolean }) {
  const helena = mensagem.autor === "RECRUTADORA";
  const audio = mensagem.tipo === "AUDIO";
  const autor = helena ? "Helena" : "Participante";
  const data = paraData(mensagem.criadoEm);
  return (
    <li className={cn("flex items-end gap-2.5", helena ? "justify-start" : "flex-row-reverse", primeiraDoAutor && "pt-2")}>
      <span
        aria-hidden="true"
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          helena
            ? "bg-marca text-white shadow-sm shadow-marca/30"
            : "bg-muted text-muted-foreground ring-1 ring-border dark:bg-white/[0.06]",
          !primeiraDoAutor && "invisible",
        )}
      >
        {helena ? <Bot className="size-4" /> : <UserRound className="size-4" />}
      </span>
      <div
        className={cn(
          "max-w-[85%] min-w-0 rounded-2xl border px-3.5 py-2.5 sm:max-w-[75%]",
          helena
            ? "rounded-bl-md border-border bg-muted/70 dark:bg-white/[0.04]"
            : "rounded-br-md border-marca/20 bg-marca/[0.08] dark:border-marca/30 dark:bg-marca/15",
        )}
      >
        {primeiraDoAutor && (
          <p
            aria-hidden="true"
            className={cn(
              "mb-1 text-xs font-semibold",
              helena ? "text-marca-forte dark:text-marca-clara" : "text-muted-foreground",
            )}
          >
            {helena ? "Helena · recrutadora virtual" : "Participante"}
          </p>
        )}
        <p className="sr-only">{`${autor}${audio ? ", por áudio (transcrição)" : ""}:`}</p>
        {audio && (
          <p
            aria-hidden="true"
            className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground ring-1 ring-border dark:bg-white/[0.04]"
          >
            <Mic className="size-3" />
            Áudio transcrito
          </p>
        )}
        <p className="leading-relaxed break-words whitespace-pre-line text-foreground">{mensagem.conteudo}</p>
        {data && (
          <time
            dateTime={mensagem.criadoEm}
            title={formatarDataHora(mensagem.criadoEm)}
            className="mt-1 block text-right text-[0.6875rem] text-muted-foreground tabular-nums"
          >
            {format(data, "HH:mm")}
          </time>
        )}
      </div>
    </li>
  );
}

function Conversa({ mensagens }: { mensagens: MensagemConversa[] }) {
  if (mensagens.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma mensagem registrada nesta simulação.</p>;
  }
  return (
    <div className="space-y-6">
      {agruparPorDia(mensagens).map((grupo) => (
        <div key={grupo.dia || "sem-data"}>
          <p className="flex justify-center">
            <span className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground first-letter:uppercase dark:bg-white/[0.06]">
              {grupo.dia ? <time dateTime={grupo.dia}>{grupo.rotulo}</time> : grupo.rotulo}
            </span>
          </p>
          <ol className="mt-3 space-y-1.5" aria-label={`Mensagens de ${grupo.rotulo}`}>
            {grupo.mensagens.map((m, i) => (
              <Balao
                key={`${m.criadoEm}-${i}`}
                mensagem={m}
                primeiraDoAutor={i === 0 || grupo.mensagens[i - 1].autor !== m.autor}
              />
            ))}
          </ol>
        </div>
      ))}
      {mensagens.length >= LIMITE_MENSAGENS && (
        <p className="text-center text-sm text-muted-foreground">
          Mostrando as primeiras {LIMITE_MENSAGENS.toLocaleString("pt-BR")} mensagens da conversa.
        </p>
      )}
    </div>
  );
}

/** Por que ainda não há relatório (depende da situação da simulação). */
function SemRelatorio({ conversa }: { conversa: ConversaParticipante }) {
  let texto: string;
  if (conversa.status === "EM_ANDAMENTO") {
    texto = "A simulação ainda está em andamento. O relatório sai quando a conversa terminar.";
  } else if (conversa.status === "FINALIZADA") {
    texto = "A conversa terminou e a análise da Helena ainda não chegou. O relatório aparece aqui assim que ficar pronto.";
  } else if (conversa.status === "CANCELADA") {
    texto =
      conversa.motivoFinalizacao === MOTIVO_CUIDADO
        ? "Simulações pausadas por cuidado não recebem relatório nem nota."
        : conversa.motivoFinalizacao === "SEM_RELATORIO"
          ? "O relatório não pôde ser gerado a tempo e a simulação foi cancelada."
          : "A simulação foi cancelada antes de ter conteúdo suficiente para uma análise.";
  } else {
    texto = "O relatório desta simulação não foi encontrado.";
  }
  return (
    <SecaoAdmin id="titulo-sem-relatorio" titulo="Relatório" icone={ClipboardList}>
      <p className="text-sm leading-relaxed text-muted-foreground">{texto}</p>
    </SecaoAdmin>
  );
}

/** Item de informação do cabeçalho (ícone + texto). */
function ItemInfo({ icone: Icone, children }: { icone: typeof Clock; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icone aria-hidden="true" className="size-4 shrink-0" />
      {children}
    </span>
  );
}

/**
 * Conversa de uma simulação com a Helena (em balões) e o relatório, se houver, no mesmo desenho que o
 * participante vê. Só leitura. Abrir fica registrado na auditoria (a API registra a cada consulta).
 */
export function ConversaParticipanteView() {
  const params = useParams<{ id: string; sessaoId: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const sessaoId = typeof params?.sessaoId === "string" ? params.sessaoId : "";
  const { dados, erro, carregando, recarregar } = useRecursoAdmin<ConversaParticipante>(
    id && sessaoId ? apiAdmin.conversa(id, sessaoId) : null,
    { mensagemPadrao: "Não foi possível carregar a conversa agora." },
  );
  const voltar = { href: id ? rotasAdmin.ficha(id) : rotasAdmin.participantes, rotulo: "Voltar para a ficha" };

  if (!id || !sessaoId || erro?.status === 404 || erro?.status === 400) {
    return (
      <div className="space-y-6">
        <CabecalhoAdmin sobretitulo="Simulação do participante" titulo="Conversa e relatório" voltar={voltar} />
        <EstadoVazio icone={SearchX} titulo="Simulação não encontrada">
          Ela pode ter sido apagada junto com a conta do participante, ou o link está incompleto.
        </EstadoVazio>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="space-y-6">
        <CabecalhoAdmin sobretitulo="Simulação do participante" titulo="Conversa e relatório" voltar={voltar} />
        <EstadoErro
          titulo="Não foi possível abrir a conversa"
          mensagem={erro.mensagem}
          status={erro.status}
          onTentarDeNovo={recarregar}
        />
      </div>
    );
  }

  if (carregando || !dados) {
    return (
      <div className="space-y-6">
        <AvisoAcessoRegistrado />
        <EsqueletoConversa />
      </div>
    );
  }

  const conversa = dados;
  const mensagens = conversa.mensagens ?? [];
  const cargo = conversa.cargoAlvo?.trim() || "Simulação de entrevista";
  const tempo = duracao(conversa.iniciadaEm, conversa.finalizadaEm);
  const motivo = rotuloMotivoFinalizacao(conversa.motivoFinalizacao);
  const audios = mensagens.filter((m) => m.tipo === "AUDIO").length;
  const pausadaPorCuidado = conversa.motivoFinalizacao === MOTIVO_CUIDADO;

  // O relatório no mesmo formato da tela do participante (as listas já vêm montadas pela API)
  const entrevista: EntrevistaDetalhe | null = conversa.entrevista?.relatorio
    ? {
        id: conversa.entrevista.id,
        cargoAlvo: cargo,
        empresaAlvo: conversa.empresaAlvo,
        notaGeral: conversa.entrevista.notaGeral,
        dataRealizacao: conversa.entrevista.dataRealizacao,
        pontosFortes: "",
        pontosMelhoria: "",
        dicasComunicacao: "",
        relatorio: conversa.entrevista.relatorio,
      }
    : null;

  return (
    <div className="space-y-6">
      <CabecalhoAdmin
        sobretitulo="Simulação do participante"
        voltar={voltar}
        titulo={cargo}
        descricao={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <SeloStatusSessao status={conversa.status} />
            {conversa.empresaAlvo && <ItemInfo icone={Building2}>{conversa.empresaAlvo}</ItemInfo>}
            <ItemInfo icone={CalendarDays}>
              Iniciada em <time dateTime={conversa.iniciadaEm}>{formatarDataHora(conversa.iniciadaEm)}</time>
            </ItemInfo>
            {tempo && <ItemInfo icone={Clock}>Duração: {tempo}</ItemInfo>}
            {motivo && <span>{motivo}</span>}
          </div>
        }
      />

      <AvisoAcessoRegistrado />

      {pausadaPorCuidado && (
        <div
          role="note"
          className="flex items-start gap-3 rounded-2xl border border-chart-4/45 bg-chart-4/10 p-3.5 text-sm leading-relaxed text-foreground dark:border-chart-4/30 dark:bg-chart-4/[0.08]"
        >
          <HeartHandshake
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-[color:color-mix(in_oklch,var(--chart-4),black_35%)] dark:text-chart-4"
          />
          <p>
            <strong className="font-semibold">Simulação pausada por cuidado:</strong> a Helena interrompeu a conversa
            porque o participante relatou sofrimento ou risco. Por isso ela não tem relatório nem nota.
          </p>
        </div>
      )}

      {entrevista && (
        <nav aria-label="Nesta página" className="flex flex-wrap gap-2 print:hidden">
          <a
            href="#titulo-conversa"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-sm font-semibold text-foreground outline-none transition-colors hover:border-marca/35 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <MessagesSquare aria-hidden="true" className="size-4" />
            Conversa
          </a>
          <a
            href="#relatorio-participante"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-sm font-semibold text-foreground outline-none transition-colors hover:border-marca/35 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <ClipboardList aria-hidden="true" className="size-4" />
            Relatório
          </a>
        </nav>
      )}

      <SecaoAdmin
        id="titulo-conversa"
        titulo="Conversa com a Helena"
        descricao={
          mensagens.length
            ? `${mensagens.length.toLocaleString("pt-BR")} ${mensagens.length === 1 ? "mensagem" : "mensagens"}` +
              (audios ? ` · ${audios} ${audios === 1 ? "áudio aparece transcrito" : "áudios aparecem transcritos"}` : "") +
              "."
            : undefined
        }
        icone={MessagesSquare}
        className="scroll-mt-24"
      >
        <Conversa mensagens={mensagens} />
      </SecaoAdmin>

      {entrevista ? (
        <div id="relatorio-participante" className="scroll-mt-24 space-y-3">
          <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Você está vendo o relatório como o participante vê. As marcações de &ldquo;feito&rdquo; do plano de ação
            ficam só no aparelho dele e não aparecem aqui.
          </p>
          <RelatorioEntrevistaView entrevista={entrevista} whatsappLink={null} modo="administracao" />
        </div>
      ) : (
        <SemRelatorio conversa={conversa} />
      )}
    </div>
  );
}
