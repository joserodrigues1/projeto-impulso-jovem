"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ApiError, fetchApi, mensagemDeErro } from "@/lib/api";
import type { CurriculoDetalhe } from "@/lib/tipos";
import { CabecalhoPagina } from "@/components/curriculo/cabecalho-pagina";
import { conteudoParaFormulario, type FormularioEstado } from "@/components/curriculo/dados-curriculo";
import { CarregandoCurriculo, CurriculoNaoEncontrado, ErroCurriculo } from "@/components/curriculo/estados";
import { FormularioCurriculo } from "@/components/curriculo/formulario-curriculo";

type Estado =
  | { tipo: "carregando"; id: string }
  | { tipo: "ok"; id: string; inicial: FormularioEstado; refinadoPorIa: boolean }
  | { tipo: "nao-encontrado"; id: string }
  | { tipo: "erro"; id: string; mensagem: string; status: number };

export default function EditarCurriculoPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const [estado, setEstado] = useState<Estado>({ tipo: "carregando", id });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (!id) return;
    let ativo = true;
    fetchApi<CurriculoDetalhe>(`/curriculos/${encodeURIComponent(id)}`)
      .then((curriculo) => {
        if (!ativo) return;
        setEstado(
          curriculo?.conteudo
            ? {
                tipo: "ok",
                id,
                inicial: conteudoParaFormulario(curriculo.conteudo, curriculo.titulo),
                refinadoPorIa: curriculo.refinadoPorIa,
              }
            : { tipo: "erro", id, mensagem: "O currículo veio incompleto. Tente de novo em instantes.", status: 0 },
        );
      })
      .catch((e: unknown) => {
        if (!ativo) return;
        if (e instanceof ApiError && (e.status === 404 || e.status === 400)) setEstado({ tipo: "nao-encontrado", id });
        else
          setEstado({
            tipo: "erro",
            id,
            mensagem: mensagemDeErro(e, "Não foi possível carregar o currículo agora."),
            status: e instanceof ApiError ? e.status : 0,
          });
      });
    return () => {
      ativo = false;
    };
  }, [id, tentativa]);

  const atual: Estado = estado.id === id ? estado : { tipo: "carregando", id };

  if (atual.tipo === "carregando") return <CarregandoCurriculo formato="formulario" />;
  if (atual.tipo === "nao-encontrado") return <CurriculoNaoEncontrado />;
  if (atual.tipo === "erro") {
    return (
      <ErroCurriculo
        mensagem={atual.mensagem}
        status={atual.status}
        onTentarDeNovo={() => {
          setEstado({ tipo: "carregando", id });
          setTentativa((t) => t + 1);
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      <CabecalhoPagina
        voltar={{ href: `/dashboard/curriculo/${encodeURIComponent(id)}`, rotulo: "Voltar para o currículo" }}
        sobretitulo="Editar currículo"
        titulo="Ajuste o que quiser"
        descricao={
          <p>
            Aqui as mudanças vão direto para o currículo, do jeito que você escrever
            {atual.refinadoPorIa ? " (a IA não reescreve de novo)" : ""}. Nome, e-mail e telefone vêm da sua conta.
          </p>
        }
      />

      <FormularioCurriculo key={atual.id} modo="editar" curriculoId={atual.id} inicial={atual.inicial} />
    </div>
  );
}
