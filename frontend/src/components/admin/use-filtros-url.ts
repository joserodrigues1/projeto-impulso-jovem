"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { comoQuery } from "@/lib/admin";

/** Espera depois da última tecla antes de buscar (não dispara uma consulta por letra). */
const ESPERA_BUSCA_MS = 400;

interface FiltrosComBusca {
  busca: string;
  pagina: number;
}

/**
 * Última busca por texto de cada lista (pelo endereço da tela), só em memória, nesta aba. Ao voltar da ficha
 * (pelo botão da tela ou pelo "voltar" do navegador) para os mesmos filtros, a busca volta junto. Recarregar a
 * página ou abrir o link em outra aba começa sem busca.
 */
const buscasLembradas = new Map<string, { filtros: string; busca: string }>();

/**
 * Filtros de uma lista guardados na URL (dá para voltar da ficha, recarregar ou copiar o link e ver a mesma lista).
 * `ler` e `montar` precisam ser funções estáveis (de módulo). Trocar qualquer filtro volta para a página 1.
 *
 * A busca por texto NÃO vai para a URL: ela pode ter nome, e-mail ou telefone de um jovem, e a URL fica no
 * histórico e nas sugestões da barra de endereço. Ela fica no estado da tela (e na memória acima) e só é aplicada
 * depois de uma pausa na digitação (ou no Enter). Por isso `montar` deixa a busca de fora e `ler` a devolve vazia.
 */
export function useFiltrosNaUrl<F extends FiltrosComBusca>(
  ler: (params: Pick<URLSearchParams, "get">) => F,
  montar: (filtros: F) => URLSearchParams,
) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const chaveUrl = params.toString();

  // Endereço que esta tela acabou de pedir. A navegação do Next é uma transição: até a URL trocar, os filtros já
  // valem os novos (senão a busca nova sairia um instante com a página antiga e faria uma consulta à toa).
  const [pedida, setPedida] = useState<{ de: string; para: string } | null>(null);
  if (pedida && pedida.de !== chaveUrl) setPedida(null);
  const chave = pedida && pedida.de === chaveUrl ? pedida.para : chaveUrl;
  const filtrosDaUrl = useMemo(() => ler(new URLSearchParams(chave)), [chave, ler]);

  const [busca, setBusca] = useState(() => {
    const lembrada = buscasLembradas.get(pathname);
    return lembrada && lembrada.filtros === montar(filtrosDaUrl).toString() ? lembrada.busca : "";
  });
  const [textoBusca, setTextoBusca] = useState(busca);
  const filtros = useMemo(() => ({ ...filtrosDaUrl, busca }), [filtrosDaUrl, busca]);

  const chaveFiltros = montar(filtros).toString();
  useEffect(() => {
    buscasLembradas.set(pathname, { filtros: chaveFiltros, busca });
  }, [pathname, chaveFiltros, busca]);

  const atualizar = useCallback(
    (mudancas: Partial<F>) => {
      const novos: F = { ...filtros, ...mudancas };
      if (!("pagina" in mudancas)) novos.pagina = 1;
      if (novos.busca !== busca) setBusca(novos.busca);
      const para = montar(novos).toString();
      // Mesma URL (ex.: só a busca mudou, já na página 1): não precisa navegar
      if (para === chave) return;
      setPedida({ de: chaveUrl, para });
      router.replace(`${pathname}${comoQuery(montar(novos))}`, { scroll: false });
    },
    [filtros, busca, montar, chave, chaveUrl, pathname, router],
  );

  useEffect(() => {
    const valor = textoBusca.trim();
    if (valor === busca) return;
    const espera = setTimeout(() => atualizar({ busca: valor } as Partial<F>), ESPERA_BUSCA_MS);
    return () => clearTimeout(espera);
  }, [textoBusca, busca, atualizar]);

  /** Enter no campo de busca: aplica na hora, sem esperar a pausa. */
  const buscarAgora = useCallback(() => {
    const valor = textoBusca.trim();
    if (valor !== busca) atualizar({ busca: valor } as Partial<F>);
  }, [textoBusca, busca, atualizar]);

  return { filtros, atualizar, textoBusca, setTextoBusca, buscarAgora };
}
