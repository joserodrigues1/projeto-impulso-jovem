import type { Metadata } from "next";
import { PainelShell } from "@/components/layout/painel-shell";

export const metadata: Metadata = {
  // Páginas do painel sem título próprio aparecem como "Painel | Impulso Jovem". O template precisa ser
  // repetido aqui: um título só em texto faria as páginas filhas perderem o "| Impulso Jovem".
  title: { default: "Painel", template: "%s | Impulso Jovem" },
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <PainelShell>{children}</PainelShell>;
}
