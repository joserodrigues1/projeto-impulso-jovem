import type { Metadata } from "next";
import { VisaoGeralAdmin } from "@/components/admin/visao-geral";

export const metadata: Metadata = {
  title: "Visão geral",
};

export default function PaginaAdminVisaoGeral() {
  return <VisaoGeralAdmin />;
}
