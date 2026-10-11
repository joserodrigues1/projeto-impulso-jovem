import type { Metadata } from "next";
import { ConfiguracoesConta } from "./configuracoes-conta";

export const metadata: Metadata = {
  title: "Configurações",
};

export default function PaginaConfiguracoes() {
  return <ConfiguracoesConta />;
}
