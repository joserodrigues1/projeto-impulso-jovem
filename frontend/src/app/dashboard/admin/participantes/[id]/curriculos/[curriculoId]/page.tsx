import type { Metadata } from "next";
import { CurriculoParticipanteView } from "@/components/admin/curriculo-participante";

export const metadata: Metadata = {
  title: "Currículo do participante",
};

export default function PaginaAdminCurriculoParticipante() {
  return <CurriculoParticipanteView />;
}
