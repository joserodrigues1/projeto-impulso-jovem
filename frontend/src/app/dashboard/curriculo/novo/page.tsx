import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/curriculo/cabecalho-pagina";
import { FormularioCurriculo } from "@/components/curriculo/formulario-curriculo";

export const metadata: Metadata = {
  title: "Novo currículo",
};

export default function NovoCurriculoPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      <CabecalhoPagina
        voltar={{ href: "/dashboard/curriculo", rotulo: "Meus currículos" }}
        sobretitulo="Novo currículo"
        titulo="Vamos montar seu currículo"
        descricao={
          <p>
            São 5 etapas rápidas. Escreva do seu jeito — não precisa ser perfeito. Seu nome, e-mail e telefone vêm da
            sua conta.
          </p>
        }
      />

      <FormularioCurriculo modo="criar" />
    </div>
  );
}
