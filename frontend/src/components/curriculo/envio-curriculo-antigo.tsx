"use client";

import { useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FileText, Image as IconeImagem, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

/** Mesmo limite da API (POST /curriculos/gerar, campo `curriculoAntigo`). */
export const CURRICULO_ANTIGO_MAX_BYTES = 5 * 1024 * 1024;
const TIPOS_ACEITOS = ["application/pdf", "image/jpeg", "image/png"];
const EXTENSOES_ACEITAS = [".pdf", ".jpg", ".jpeg", ".png"];

function tamanhoLegivel(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

/** Confere tipo e tamanho antes de enviar (a API confere de novo, pelo conteúdo do arquivo). */
export function problemaCurriculoAntigo(arquivo: File): string | null {
  const nome = arquivo.name.toLowerCase();
  if (nome.endsWith(".doc") || nome.endsWith(".docx")) {
    return "Arquivo do Word: abra no Word ou no Google Docs e salve como PDF antes de enviar.";
  }
  const tipoOk = TIPOS_ACEITOS.includes(arquivo.type) || EXTENSOES_ACEITAS.some((e) => nome.endsWith(e));
  if (!tipoOk) return "Envie o currículo em PDF ou como foto (JPG ou PNG).";
  if (arquivo.size > CURRICULO_ANTIGO_MAX_BYTES) return "O arquivo passou de 5 MB. Envie um arquivo menor.";
  if (arquivo.size < 100) return "Esse arquivo parece vazio. Confira e tente de novo.";
  return null;
}

interface Props {
  arquivo: File | null;
  onChange: (arquivo: File | null) => void;
  desabilitado?: boolean;
}

/**
 * Envio de um currículo que o jovem já tem (PDF ou foto). A IA lê o conteúdo e aproveita no currículo novo;
 * o arquivo não fica guardado pelo Impulso Jovem.
 */
export function EnvioCurriculoAntigo({ arquivo, onChange, desabilitado }: Props) {
  const idEntrada = useId();
  const idAjuda = useId();
  const entrada = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState<string | null>(null);

  function escolher(lista: FileList | null) {
    const escolhido = lista?.[0];
    if (!escolhido) return;
    const problema = problemaCurriculoAntigo(escolhido);
    setErro(problema);
    if (!problema) onChange(escolhido);
    // Permite escolher o mesmo arquivo de novo depois de remover
    if (entrada.current) entrada.current.value = "";
  }

  const ehImagem = arquivo?.type.startsWith("image/");

  return (
    <div className="space-y-2">
      {/*
        Antes do rótulo (peer): o anel de foco do teclado aparece no rótulo visível. Com arquivo escolhido o rótulo
        some e o campo sai do Tab — quem assume é o botão "Remover".
      */}
      <input
        ref={entrada}
        id={idEntrada}
        type="file"
        accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
        aria-describedby={arquivo ? undefined : idAjuda}
        disabled={desabilitado}
        tabIndex={arquivo ? -1 : undefined}
        onChange={(e) => escolher(e.target.files)}
        className="peer sr-only"
      />
      <AnimatePresence mode="wait" initial={false}>
        {arquivo ? (
          <motion.div
            key="escolhido"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-3 rounded-2xl border border-marca/30 bg-marca/5 p-3"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-marca/15 text-marca-forte dark:text-marca-clara">
              {ehImagem ? <IconeImagem className="size-5" aria-hidden="true" /> : <FileText className="size-5" aria-hidden="true" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{arquivo.name}</p>
              <p className="text-xs text-muted-foreground">
                {tamanhoLegivel(arquivo.size)} · a IA vai ler e aproveitar o que servir
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setErro(null);
                // O botão some junto com o cartão: o foco volta para o envio, em vez de cair no começo da página
                entrada.current?.focus();
              }}
              disabled={desabilitado}
              aria-label="Remover o currículo antigo"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </motion.div>
        ) : (
          <motion.label
            key="vazio"
            htmlFor={idEntrada}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "group flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/40 p-4 transition-colors",
              "hover:border-marca/50 hover:bg-marca/5 peer-focus-visible:border-marca peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 dark:bg-white/[0.02]",
              desabilitado && "pointer-events-none opacity-60",
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background text-muted-foreground shadow-sm transition-colors group-hover:text-marca-forte dark:group-hover:text-marca-clara">
              <Upload className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">Enviar meu currículo antigo</span>
              <span id={idAjuda} className="block text-xs text-muted-foreground">
                PDF ou foto (JPG, PNG), até 5 MB. Está no Word? Salve como PDF.
              </span>
            </span>
          </motion.label>
        )}
      </AnimatePresence>
      {erro && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {erro}
        </p>
      )}
    </div>
  );
}
