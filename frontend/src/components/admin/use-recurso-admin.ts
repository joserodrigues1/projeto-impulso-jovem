"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchApi, mensagemDeErro } from "@/lib/api";

export interface ErroAdmin {
  mensagem: string;
  /** Status HTTP (0 = sem conexão). 401 = sessão expirada, 403 = sem permissão, 404 = não existe. */
  status: number;
}

interface Resultado<T> {
  chave: string;
  dados?: T;
  erro?: ErroAdmin;
}

export function paraErroAdmin(erro: unknown, padrao = "Não foi possível carregar agora."): ErroAdmin {
  return { mensagem: mensagemDeErro(erro, padrao), status: erro instanceof ApiError ? erro.status : 0 };
}

interface OpcoesRecurso {
  /**
   * Enquanto busca outro endereço (troca de filtro ou de página), continua mostrando os dados anteriores —
   * a tela não "pisca". Não use em telas de um item só (mostraria a pessoa anterior por um instante).
   */
  manterAnteriores?: boolean;
  /** Mensagem de erro quando a API não manda uma. */
  mensagemPadrao?: string;
}

/**
 * Busca um endereço da API do painel admin. `endpoint` null = não buscar ainda.
 * Cada resposta é guardada com a chave da busca: uma resposta antiga nunca sobrescreve a atual.
 */
export function useRecursoAdmin<T>(endpoint: string | null, opcoes: OpcoesRecurso = {}) {
  const { manterAnteriores = false, mensagemPadrao } = opcoes;
  const [resultado, setResultado] = useState<Resultado<T> | null>(null);
  const [versao, setVersao] = useState(0);
  const chave = endpoint ? `${versao}|${endpoint}` : null;

  useEffect(() => {
    if (!endpoint) return;
    let ativo = true;
    const chaveDaBusca = `${versao}|${endpoint}`;
    fetchApi<T>(endpoint).then(
      (dados) => {
        if (!ativo) return;
        setResultado(
          dados === null || dados === undefined
            ? { chave: chaveDaBusca, erro: { mensagem: "A resposta veio vazia. Tente de novo em instantes.", status: 0 } }
            : { chave: chaveDaBusca, dados },
        );
      },
      (erro: unknown) => {
        if (ativo) setResultado({ chave: chaveDaBusca, erro: paraErroAdmin(erro, mensagemPadrao) });
      },
    );
    return () => {
      ativo = false;
    };
  }, [endpoint, versao, mensagemPadrao]);

  const atual = chave !== null && resultado?.chave === chave ? resultado : null;
  const carregando = chave !== null && atual === null;
  const anteriores = manterAnteriores && carregando ? (resultado?.dados ?? null) : null;

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  return {
    /** Dados da busca atual (ou os anteriores, com `manterAnteriores`, enquanto a nova carrega). */
    dados: atual?.dados ?? anteriores,
    erro: atual?.erro ?? null,
    carregando,
    recarregar,
  };
}
