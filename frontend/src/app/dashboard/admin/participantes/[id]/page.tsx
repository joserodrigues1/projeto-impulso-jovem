import type { Metadata } from "next";
import { FichaParticipante } from "@/components/admin/ficha-participante";

export const metadata: Metadata = {
  title: "Ficha do participante",
};

export default function PaginaAdminFichaParticipante() {
  return <FichaParticipante />;
}
