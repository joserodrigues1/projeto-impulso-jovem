"use client";

import { useId, useState, type MouseEvent } from "react";
import { FileDown, LoaderCircle } from "lucide-react";
import { estiloBotao } from "@/components/entrevistas/utils";
import { baixarArquivo, mensagemDeErro, urlDaApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface BotaoExportarCsvProps {
  /** Endereço da planilha na API (ex.: "/admin/exportar/uso.csv?de=…&ate=…"). */
  endpoint: string;
  /** Nome do arquivo se a API não mandar um. */
  nomePadrao: string;
  rotulo?: string;
  className?: string;
}

/**
 * "Exportar CSV": é um link para a planilha (`/api-proxy/admin/exportar/…`), mas o clique baixa pelo
 * fetch — assim a sessão é renovada se o acesso tiver expirado e um erro aparece aqui, não numa página em JSON.
 */
export function BotaoExportarCsv({ endpoint, nomePadrao, rotulo = "Exportar CSV", className }: BotaoExportarCsvProps) {
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const idDica = useId();

  async function aoClicar(evento: MouseEvent<HTMLAnchorElement>) {
    // Ctrl/Cmd/Shift + clique (ou botão do meio) segue o comportamento normal do link
    if (evento.button !== 0 || evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) return;
    evento.preventDefault();
    if (baixando) return;
    setBaixando(true);
    setErro(null);
    try {
      await baixarArquivo(endpoint, nomePadrao);
    } catch (e) {
      setErro(mensagemDeErro(e, "Não foi possível gerar a planilha agora. Tente de novo."));
    } finally {
      setBaixando(false);
    }
  }

  return (
    <div className={cn("flex flex-col items-start gap-1.5", className)}>
      <a
        href={urlDaApi(endpoint)}
        download={nomePadrao}
        onClick={aoClicar}
        aria-describedby={idDica}
        aria-disabled={baixando || undefined}
        className={estiloBotao("secundario", "sm")}
      >
        {baixando ? (
          <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" />
        ) : (
          <FileDown aria-hidden="true" />
        )}
        {baixando ? "Gerando planilha…" : rotulo}
      </a>
      <span id={idDica} className="sr-only">
        Planilha para Excel. O download fica registrado na auditoria.
      </span>
      {erro && (
        <p role="alert" className="max-w-xs text-sm font-medium text-destructive">
          {erro}
        </p>
      )}
    </div>
  );
}
