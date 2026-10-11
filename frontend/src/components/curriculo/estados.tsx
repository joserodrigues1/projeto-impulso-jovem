import type { ReactNode } from "react";
import Link from "next/link";
import { FileQuestion, LogIn, RotateCw, TriangleAlert } from "lucide-react";
import { classeBotaoPrimario, classeBotaoSecundario, classeCartao } from "./campos";

/** Bloco cinza que pulsa enquanto o conteúdo carrega. */
const esqueleto = "animate-pulse rounded-2xl bg-muted dark:bg-white/[0.06]";

/**
 * Esqueleto enquanto o currículo carrega: a folha com a barra de ações (visualização)
 * ou o formulário em etapas (edição).
 */
export function CarregandoCurriculo({
  rotulo = "Carregando seu currículo…",
  formato = "folha",
}: {
  rotulo?: string;
  formato?: "folha" | "formulario";
}) {
  if (formato === "formulario") {
    return (
      <div className="mx-auto max-w-3xl space-y-5" aria-busy="true">
        <p className="sr-only" role="status">
          {rotulo}
        </p>
        <div className={`${esqueleto} h-6 w-40 rounded-full`} />
        <div className={`${esqueleto} h-10 w-72 max-w-full`} />
        <div className={`${esqueleto} h-2 w-full rounded-full`} />
        <div className={`${esqueleto} h-[28rem] w-full rounded-3xl`} />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-6xl space-y-5" aria-busy="true">
      <p className="sr-only" role="status">
        {rotulo}
      </p>
      <div className={`${esqueleto} h-6 w-44 rounded-full`} />
      <div className={`${esqueleto} h-10 w-80 max-w-full`} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className={`${esqueleto} aspect-[210/297] w-full rounded-3xl`} />
        <div className={`${esqueleto} hidden h-72 rounded-3xl lg:block`} />
      </div>
    </div>
  );
}

/** Cartão central dos estados de "não encontrado" e "erro". */
function CartaoEstado({
  icone,
  perigo = false,
  titulo,
  children,
  acoes,
  alerta = false,
}: {
  icone: ReactNode;
  perigo?: boolean;
  titulo: string;
  children: ReactNode;
  acoes: ReactNode;
  alerta?: boolean;
}) {
  return (
    <div role={alerta ? "alert" : undefined} className={`${classeCartao} relative mx-auto max-w-md overflow-hidden p-8 text-center`}>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 -top-24 mx-auto size-56 rounded-full blur-3xl ${
          perigo ? "bg-destructive/15" : "bg-marca/15"
        }`}
      />
      <div
        className={`relative mx-auto flex size-16 items-center justify-center rounded-2xl ring-1 ${
          perigo
            ? "bg-destructive/10 text-destructive ring-destructive/20"
            : "bg-marca/10 text-marca-forte ring-marca/20 dark:text-marca-clara"
        }`}
      >
        {icone}
      </div>
      <h1 className="relative mt-5 font-display text-2xl font-bold tracking-tight text-foreground">{titulo}</h1>
      <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{children}</p>
      <div className="relative mt-6 flex flex-col justify-center gap-2 sm:flex-row">{acoes}</div>
    </div>
  );
}

export function CurriculoNaoEncontrado() {
  return (
    <CartaoEstado
      icone={<FileQuestion className="size-8" aria-hidden="true" />}
      titulo="Currículo não encontrado"
      acoes={
        <Link href="/dashboard/curriculo" className={classeBotaoPrimario}>
          Ver meus currículos
        </Link>
      }
    >
      Ele pode ter sido excluído ou o link está incompleto.
    </CartaoEstado>
  );
}

export function ErroCurriculo({
  mensagem,
  status,
  onTentarDeNovo,
}: {
  mensagem: string;
  /** Status HTTP do erro: 401 (sessão expirada) troca "Tentar de novo" por "Entrar de novo". */
  status?: number;
  onTentarDeNovo: () => void;
}) {
  const sessaoExpirada = status === 401;
  return (
    <CartaoEstado
      alerta
      perigo
      icone={<TriangleAlert className="size-8" aria-hidden="true" />}
      titulo={sessaoExpirada ? "Sua sessão expirou" : "Não foi possível abrir o currículo"}
      acoes={
        <>
          {sessaoExpirada ? (
            <Link href="/login" className={classeBotaoPrimario}>
              <LogIn className="size-4" aria-hidden="true" />
              Entrar de novo
            </Link>
          ) : (
            <button type="button" onClick={onTentarDeNovo} className={classeBotaoPrimario}>
              <RotateCw className="size-4" aria-hidden="true" />
              Tentar de novo
            </button>
          )}
          <Link href="/dashboard/curriculo" className={classeBotaoSecundario}>
            Meus currículos
          </Link>
        </>
      }
    >
      {sessaoExpirada ? "Entre de novo na sua conta para ver o currículo." : mensagem}
    </CartaoEstado>
  );
}
