import type { Metadata } from "next";
import { PaginaAuth } from "@/components/layout/pagina-auth";
import { FormularioRecuperar } from "./formulario-recuperar";

export const metadata: Metadata = {
  title: "Recuperar senha",
  description: "Receba por e-mail um link para criar uma nova senha no Impulso Jovem.",
  robots: { index: false },
};

export default function PaginaRecuperarSenha() {
  return (
    <PaginaAuth
      titulo="Esqueceu a senha?"
      subtitulo="Sem problema. Informe o e-mail da sua conta e enviaremos um link para você criar uma nova."
    >
      <FormularioRecuperar />
    </PaginaAuth>
  );
}
