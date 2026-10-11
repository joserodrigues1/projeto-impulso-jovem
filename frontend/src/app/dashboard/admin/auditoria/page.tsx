import type { Metadata } from "next";
import { Suspense } from "react";
import { HistoricoAuditoria } from "@/components/admin/historico-auditoria";
import { EsqueletoTabela } from "@/components/admin/esqueletos";

export const metadata: Metadata = {
  title: "Auditoria",
};

export default function PaginaAdminAuditoria() {
  return (
    // Os filtros ficam na URL (useSearchParams), que precisa de Suspense para a página continuar pré-renderizada
    <Suspense fallback={<EsqueletoTabela comCabecalho />}>
      <HistoricoAuditoria />
    </Suspense>
  );
}
