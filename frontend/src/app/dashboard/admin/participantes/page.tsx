import type { Metadata } from "next";
import { Suspense } from "react";
import { EsqueletoListaParticipantes } from "@/components/admin/esqueletos";
import { ListaParticipantes } from "@/components/admin/lista-participantes";

export const metadata: Metadata = {
  title: "Participantes",
};

export default function PaginaAdminParticipantes() {
  return (
    // Os filtros ficam na URL (useSearchParams), que precisa de Suspense para a página continuar pré-renderizada
    <Suspense fallback={<EsqueletoListaParticipantes comCabecalho />}>
      <ListaParticipantes />
    </Suspense>
  );
}
