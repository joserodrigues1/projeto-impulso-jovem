"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useNoNavegador } from "./armazenamento";
import styles from "./curriculo.module.css";

/**
 * Mostra a folha A4 na tela, reduzindo a escala quando o espaço é menor que a folha (celular).
 * Só afeta a tela: a impressão usa a cópia de <AreaImpressao>.
 */
export function VisualizacaoA4({ children }: { children: ReactNode }) {
  const externoRef = useRef<HTMLDivElement>(null);
  const folhaRef = useRef<HTMLDivElement>(null);
  const [medidas, setMedidas] = useState<{ escala: number; altura: number } | null>(null);

  useEffect(() => {
    const externo = externoRef.current;
    const folha = folhaRef.current;
    if (!externo || !folha) return;
    // O ResizeObserver já dispara uma vez ao observar, então não precisa medir aqui
    const observador = new ResizeObserver(() => {
      const largura = externo.clientWidth;
      const larguraFolha = folha.offsetWidth;
      if (!largura || !larguraFolha) return;
      const escala = Math.min(1, largura / larguraFolha);
      const altura = Math.ceil(folha.offsetHeight * escala);
      setMedidas((atual) => (atual && atual.escala === escala && atual.altura === altura ? atual : { escala, altura }));
    });
    observador.observe(externo);
    observador.observe(folha);
    return () => observador.disconnect();
  }, []);

  return (
    <div
      ref={externoRef}
      // overflow-clip (e não hidden): a busca do navegador (Ctrl+F) não consegue rolar a folha para o lado
      className="w-full overflow-clip"
      style={{ height: medidas ? medidas.altura : undefined, visibility: medidas ? "visible" : "hidden" }}
    >
      <div
        ref={folhaRef}
        className="mx-auto w-fit shadow-2xl ring-1 shadow-tinta/20 ring-tinta/5 dark:shadow-black/50"
        style={{ transform: `scale(${medidas?.escala ?? 1})`, transformOrigin: "top left" }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Cópia do currículo usada só na impressão / "Salvar como PDF".
 * Fica num portal direto no <body> e, ao imprimir, todo o resto da página some — assim o layout
 * do painel (menu, rolagem, espaçamentos) não interfere no PDF.
 */
export function AreaImpressao({ children }: { children: ReactNode }) {
  const noNavegador = useNoNavegador();

  useEffect(() => {
    document.body.classList.add(styles.corpoImpressao);
    return () => document.body.classList.remove(styles.corpoImpressao);
  }, []);

  if (!noNavegador) return null;
  return createPortal(
    <div className={styles.areaImpressao}>{children}</div>,
    document.body,
  );
}
