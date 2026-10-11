import { ESTILO_CARD } from "@/components/entrevistas/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Texto para leitores de tela enquanto a tela carrega (os blocos são só visuais). */
function Anuncio({ texto }: { texto: string }) {
  return (
    <p className="sr-only" role="status">
      {texto}
    </p>
  );
}

function CabecalhoFalso() {
  return (
    <div aria-hidden="true" className="space-y-3">
      <Skeleton className="h-6 w-36 rounded-full" />
      <Skeleton className="h-10 w-72 max-w-full" />
      <Skeleton className="h-4 w-96 max-w-full" />
    </div>
  );
}

/** Indicadores + gráfico + funil da visão geral. */
export function EsqueletoVisaoGeral() {
  return (
    <div aria-busy="true" className="space-y-6">
      <Anuncio texto="Carregando os números de uso…" />
      <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cn(ESTILO_CARD, "space-y-3 p-5")}>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className={cn(ESTILO_CARD, "space-y-4 p-5 sm:p-6")}>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
      <div aria-hidden="true" className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className={cn(ESTILO_CARD, "space-y-3 p-5 sm:p-6")}>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-4/5" />
            <Skeleton className="h-8 w-3/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Linhas de tabela (computador) ou cartões (celular). */
export function EsqueletoTabela({ linhas = 6, comCabecalho = false }: { linhas?: number; comCabecalho?: boolean }) {
  return (
    <div aria-busy="true" className="space-y-6">
      <Anuncio texto="Carregando…" />
      {comCabecalho && <CabecalhoFalso />}
      <div aria-hidden="true" className={cn(ESTILO_CARD, "overflow-hidden")}>
        <div className="hidden border-b border-border bg-muted/50 px-5 py-3 lg:block">
          <Skeleton className="h-4 w-1/2" />
        </div>
        <ul className="divide-y divide-border">
          {Array.from({ length: linhas }, (_, i) => (
            <li key={i} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-48 max-w-full" />
                <Skeleton className="h-3 w-64 max-w-full" />
              </div>
              <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function EsqueletoListaParticipantes({ comCabecalho = false }: { comCabecalho?: boolean }) {
  return <EsqueletoTabela linhas={8} comCabecalho={comCabecalho} />;
}

/** Ficha do participante: cabeçalho, dados da conta e listas. */
export function EsqueletoFicha() {
  return (
    <div aria-busy="true" className="space-y-6">
      <Anuncio texto="Carregando a ficha do participante…" />
      <CabecalhoFalso />
      <div aria-hidden="true" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className={cn(ESTILO_CARD, "space-y-4 p-5 sm:p-6")}>
          <Skeleton className="h-5 w-40" />
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-40 max-w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className={cn(ESTILO_CARD, "space-y-3 p-5 sm:p-6")}>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div aria-hidden="true" className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className={cn(ESTILO_CARD, "space-y-3 p-5 sm:p-6")}>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Conversa: balões alternados. */
export function EsqueletoConversa() {
  return (
    <div aria-busy="true" className="space-y-6">
      <Anuncio texto="Carregando a conversa…" />
      <CabecalhoFalso />
      <div aria-hidden="true" className={cn(ESTILO_CARD, "space-y-4 p-5 sm:p-6")}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={cn("flex", i % 2 ? "justify-end" : "justify-start")}>
            <Skeleton className={cn("h-14 rounded-2xl", i % 2 ? "w-1/2" : "w-2/3")} />
          </div>
        ))}
      </div>
    </div>
  );
}
