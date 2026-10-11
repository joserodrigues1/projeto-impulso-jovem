import type { Metadata } from "next";
import { Suspense } from "react";
import { PaginaAuth } from "@/components/layout/pagina-auth";
import { LoadingScreen } from "@/components/ui/spinner";
import { FormularioRedefinir } from "./formulario-redefinir";

export const metadata: Metadata = {
  title: "Criar nova senha",
  robots: { index: false, follow: false },
};

export default function PaginaRedefinirSenha() {
  return (
    <PaginaAuth titulo="Criar nova senha" subtitulo="Escolha uma senha nova para a sua conta.">
      {/* O token vem na URL (?token=…) — useSearchParams precisa de Suspense */}
      <Suspense fallback={<LoadingScreen className="min-h-40" />}>
        <FormularioRedefinir />
      </Suspense>
    </PaginaAuth>
  );
}
