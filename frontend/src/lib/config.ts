"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "./api";
import type { ConfigPublica } from "./tipos";

const PADRAO: ConfigPublica = { whatsappNumero: null, whatsappLink: null, curriculoIaDisponivel: false };

let cache: ConfigPublica | null = null;
let emAndamento: Promise<ConfigPublica> | null = null;

/** Busca a configuração pública da API uma vez por carregamento da página. */
export function carregarConfigPublica(): Promise<ConfigPublica> {
  if (cache) return Promise.resolve(cache);
  emAndamento ??= fetchApi<ConfigPublica>("/config/publica")
    .then((c) => (cache = { ...PADRAO, ...c }))
    .catch(() => PADRAO)
    .finally(() => {
      emAndamento = null;
    });
  return emAndamento;
}

/**
 * Configuração pública (número do WhatsApp da IA, recursos disponíveis).
 * Enquanto carrega — ou se a API estiver fora — devolve valores que escondem os recursos opcionais.
 */
export function useConfigPublica(): { config: ConfigPublica; carregando: boolean } {
  const [config, setConfig] = useState<ConfigPublica>(cache ?? PADRAO);
  const [carregando, setCarregando] = useState(!cache);

  useEffect(() => {
    let ativo = true;
    carregarConfigPublica().then((c) => {
      if (!ativo) return;
      setConfig(c);
      setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, []);

  return { config, carregando };
}
