import type { Metadata } from "next";
import { ProvedorMovimento } from "@/components/movimento";

// As páginas desta seção são client components (não podem exportar metadata); o título da aba fica aqui.
export const metadata: Metadata = {
  title: "Simulações de entrevista",
};

/** As animações desta seção respeitam o "reduzir movimento" do sistema (ProvedorMovimento). */
export default function EntrevistasLayout({ children }: { children: React.ReactNode }) {
  return <ProvedorMovimento>{children}</ProvedorMovimento>;
}
