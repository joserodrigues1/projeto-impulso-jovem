import type { Metadata } from "next";
import { Suspense } from "react";
import { PaginaAuth } from "@/components/layout/pagina-auth";
import { LoadingScreen } from "@/components/ui/spinner";
import { FormularioCadastro } from "./formulario-cadastro";

export const metadata: Metadata = {
  title: "Criar conta",
  description: "Crie sua conta no Impulso Jovem para montar seu currículo com IA e treinar entrevistas pelo WhatsApp.",
};

export default function PaginaCadastro() {
  return (
    <PaginaAuth titulo="Criar conta" subtitulo="Preencha seus dados para montar seu currículo e treinar entrevistas.">
      <Suspense fallback={<LoadingScreen className="min-h-40" />}>
        <FormularioCadastro />
      </Suspense>
    </PaginaAuth>
  );
}
