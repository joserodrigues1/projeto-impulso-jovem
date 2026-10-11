"use client";

/**
 * Acesso seguro ao localStorage/sessionStorage: pode estar bloqueado (aba anônima, cota cheia),
 * então toda leitura/escrita fica em try/catch e a tela funciona sem ele.
 * Nada daqui vai para o servidor.
 */

import { useSyncExternalStore } from "react";

type Tipo = "local" | "sessao";

const EVENTO_MUDANCA = "ij:armazenamento";

const PREFIXO = "ij:curriculo:";

export const chaves = {
  rascunho: (usuarioId: string) => `${PREFIXO}rascunho:${usuarioId}`,
  foto: (curriculoId: string) => `${PREFIXO}foto:${curriculoId}`,
  geracao: (curriculoId: string) => `${PREFIXO}geracao:${curriculoId}`,
};

/** Dados da pessoa guardados no navegador: currículo (rascunho, foto, avisos) e progresso do plano de ação. */
const PREFIXOS_DA_CONTA = [PREFIXO, "ij:plano-acao:"];

/**
 * Apaga deste navegador os rascunhos, fotos e avisos de currículo e o progresso dos planos de ação.
 * Chamado ao sair e ao excluir a conta (computador compartilhado não deve guardar dados de quem saiu).
 * Preferências que não são pessoais (como o tema) ficam.
 */
export function limparDadosLocaisDaConta(): void {
  for (const tipo of ["local", "sessao"] as const) {
    try {
      const armazenamento = area(tipo);
      if (!armazenamento) continue;
      const alvo: string[] = [];
      for (let i = 0; i < armazenamento.length; i++) {
        const chave = armazenamento.key(i);
        if (chave && PREFIXOS_DA_CONTA.some((prefixo) => chave.startsWith(prefixo))) alvo.push(chave);
      }
      alvo.forEach((chave) => armazenamento.removeItem(chave));
    } catch {
      // sem armazenamento: nada a limpar
    }
  }
  try {
    window.dispatchEvent(new Event(EVENTO_MUDANCA));
  } catch {
    // fora do navegador
  }
}

function area(tipo: Tipo): Storage | null {
  try {
    return tipo === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function ler(tipo: Tipo, chave: string): string | null {
  try {
    return area(tipo)?.getItem(chave) ?? null;
  } catch {
    return null;
  }
}

/** Grava e avisa os componentes que estão lendo. Devolve false se o navegador recusou (ex.: cota cheia). */
export function gravar(tipo: Tipo, chave: string, valor: string): boolean {
  try {
    const armazenamento = area(tipo);
    if (!armazenamento) return false;
    armazenamento.setItem(chave, valor);
    window.dispatchEvent(new Event(EVENTO_MUDANCA));
    return true;
  } catch {
    return false;
  }
}

export function remover(tipo: Tipo, chave: string): void {
  try {
    area(tipo)?.removeItem(chave);
    window.dispatchEvent(new Event(EVENTO_MUDANCA));
  } catch {
    // sem armazenamento: nada a remover
  }
}

export function lerJson(tipo: Tipo, chave: string): unknown {
  const bruto = ler(tipo, chave);
  if (!bruto) return null;
  try {
    return JSON.parse(bruto) as unknown;
  } catch {
    return null;
  }
}

function inscrever(aoMudar: () => void): () => void {
  window.addEventListener("storage", aoMudar);
  window.addEventListener(EVENTO_MUDANCA, aoMudar);
  return () => {
    window.removeEventListener("storage", aoMudar);
    window.removeEventListener(EVENTO_MUDANCA, aoMudar);
  };
}

/** Valor guardado no navegador; no servidor (e na hidratação) é sempre null. */
export function useArmazenamento(tipo: Tipo, chave: string | null): string | null {
  return useSyncExternalStore(
    inscrever,
    () => (chave ? ler(tipo, chave) : null),
    () => null,
  );
}

const semInscricao = () => () => {};

/** true só depois da hidratação — para o que depende do navegador (portal, APIs de mídia). */
export function useNoNavegador(): boolean {
  return useSyncExternalStore(
    semInscricao,
    () => true,
    () => false,
  );
}
