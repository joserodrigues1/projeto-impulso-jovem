import type { Metadata } from "next";
import { ConversaParticipanteView } from "@/components/admin/conversa-participante";

export const metadata: Metadata = {
  title: "Conversa e relatório",
};

export default function PaginaAdminConversaParticipante() {
  return <ConversaParticipanteView />;
}
