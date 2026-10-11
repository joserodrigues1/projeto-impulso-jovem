import type { Metadata } from "next";
import { PainelAdmin } from "@/components/admin/painel-admin";

// As telas desta seção são client components; o título padrão da aba fica aqui (cada página pode ter o seu).
export const metadata: Metadata = {
  title: { default: "Administração", template: "%s · Administração | Impulso Jovem" },
};

/** Área de administração: só a conta ADMIN vê o conteúdo (a API também recusa as rotas /admin). */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <PainelAdmin>{children}</PainelAdmin>;
}
