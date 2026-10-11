"use client";

import { useId, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { classeCampo } from "@/components/curriculo/campos";
import { estiloBotao } from "@/components/entrevistas/utils";
import { CURVA_IMPULSO } from "@/components/movimento";
import { erroDoPeriodo, hojeEmBrasilia, MAXIMO_DIAS_PERIODO, somarDias } from "@/lib/admin";
import { cn } from "@/lib/utils";

export type TipoPeriodo = 7 | 30 | 90 | "personalizado";

export interface Periodo {
  tipo: TipoPeriodo;
  /** AAAA-MM-DD (fuso de Brasília), as duas pontas incluídas. */
  de: string;
  ate: string;
}

const PRESETS: Array<{ tipo: Exclude<TipoPeriodo, "personalizado">; rotulo: string }> = [
  { tipo: 7, rotulo: "7 dias" },
  { tipo: 30, rotulo: "30 dias" },
  { tipo: 90, rotulo: "90 dias" },
];

/** Últimos N dias, contando hoje (igual ao padrão da API: 30 dias = hoje e os 29 anteriores). */
export function periodoDosUltimosDias(dias: Exclude<TipoPeriodo, "personalizado">): Periodo {
  const ate = hojeEmBrasilia();
  return { tipo: dias, de: somarDias(ate, -(dias - 1)), ate };
}

interface SeletorPeriodoProps {
  valor: Periodo;
  aoMudar: (periodo: Periodo) => void;
  desabilitado?: boolean;
}

const classeOpcao =
  "relative inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors duration-200 " +
  "has-focus-visible:ring-3 has-focus-visible:ring-ring/50";

/** Períodos prontos (7, 30, 90 dias) e um personalizado com duas datas (máximo de 366 dias). */
export function SeletorPeriodo({ valor, aoMudar, desabilitado }: SeletorPeriodoProps) {
  const nome = useId();
  const idDe = useId();
  const idAte = useId();
  const idErro = useId();
  const [abertoPersonalizado, setAbertoPersonalizado] = useState(valor.tipo === "personalizado");
  const [de, setDe] = useState(valor.de);
  const [ate, setAte] = useState(valor.ate);
  const [erro, setErro] = useState<string | null>(null);
  const hoje = hojeEmBrasilia();
  const selecionado: TipoPeriodo = abertoPersonalizado ? "personalizado" : valor.tipo;

  function escolher(tipo: TipoPeriodo) {
    setErro(null);
    if (tipo === "personalizado") {
      setAbertoPersonalizado(true);
      setDe(valor.de);
      setAte(valor.ate);
      return;
    }
    setAbertoPersonalizado(false);
    aoMudar(periodoDosUltimosDias(tipo));
  }

  function aplicar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const problema = erroDoPeriodo(de, ate) ?? (ate > hoje ? "A data final não pode ser depois de hoje." : null);
    setErro(problema);
    if (!problema) aoMudar({ tipo: "personalizado", de, ate });
  }

  const opcoes: Array<{ tipo: TipoPeriodo; rotulo: string }> = [...PRESETS, { tipo: "personalizado", rotulo: "Personalizado" }];

  return (
    <div className="min-w-0 space-y-3">
      <fieldset disabled={desabilitado} className="min-w-0">
        <legend className="sr-only">Período dos números</legend>
        <div className="inline-flex max-w-full flex-wrap gap-1 rounded-full border border-border bg-card p-1 shadow-sm shadow-tinta/[0.04] dark:bg-white/[0.03] dark:shadow-none">
          {opcoes.map((opcao) => {
            const ativo = selecionado === opcao.tipo;
            return (
              <label
                key={String(opcao.tipo)}
                className={cn(
                  classeOpcao,
                  ativo ? "bg-marca text-white shadow-sm shadow-marca/30" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <input
                  type="radio"
                  name={nome}
                  value={String(opcao.tipo)}
                  checked={ativo}
                  onChange={() => escolher(opcao.tipo)}
                  className="sr-only"
                />
                {ativo && <Check aria-hidden="true" className="size-4" strokeWidth={3} />}
                {opcao.rotulo}
              </label>
            );
          })}
        </div>
      </fieldset>

      <AnimatePresence initial={false}>
        {abertoPersonalizado && (
          <motion.form
            key="personalizado"
            onSubmit={aplicar}
            noValidate
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: CURVA_IMPULSO }}
            className="overflow-hidden"
            aria-label="Período personalizado"
          >
            <div className="flex flex-wrap items-end gap-3 pt-1 pb-1">
              <div>
                <label htmlFor={idDe} className="mb-1.5 block text-sm font-semibold text-foreground">
                  De
                </label>
                <input
                  id={idDe}
                  type="date"
                  value={de}
                  max={ate || hoje}
                  onChange={(e) => setDe(e.target.value)}
                  aria-invalid={Boolean(erro)}
                  aria-describedby={erro ? idErro : undefined}
                  className={cn(classeCampo, "w-auto")}
                />
              </div>
              <div>
                <label htmlFor={idAte} className="mb-1.5 block text-sm font-semibold text-foreground">
                  Até
                </label>
                <input
                  id={idAte}
                  type="date"
                  value={ate}
                  min={de || undefined}
                  max={hoje}
                  onChange={(e) => setAte(e.target.value)}
                  aria-invalid={Boolean(erro)}
                  aria-describedby={erro ? idErro : undefined}
                  className={cn(classeCampo, "w-auto")}
                />
              </div>
              <button type="submit" disabled={desabilitado} className={estiloBotao("primario", "sm")}>
                Aplicar
              </button>
            </div>
            {erro ? (
              <p id={idErro} role="alert" className="mt-1.5 text-sm font-medium text-destructive">
                {erro}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-muted-foreground">Até {MAXIMO_DIAS_PERIODO} dias, com as duas datas incluídas.</p>
            )}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
