import type { Metadata } from "next";
import { Suspense } from "react";
import { PaginaAuth } from "@/components/layout/pagina-auth";
import { LoadingScreen } from "@/components/ui/spinner";
import { FormularioLogin } from "./formulario-login";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse sua conta do Impulso Jovem para continuar seu currículo e seus treinos de entrevista.",
};

export default function PaginaLogin() {
  return (
    <PaginaAuth titulo="Bem-vindo de volta" subtitulo="Entre para continuar seu currículo e seus treinos.">
      {/* useSearchParams (o "proximo") precisa de Suspense para a página continuar pré-renderizada */}
      <Suspense fallback={<LoadingScreen className="min-h-40" />}>
        <FormularioLogin />
      </Suspense>
    </PaginaAuth>
  );
}
