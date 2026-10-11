"use client";

import { useParams } from "next/navigation";
import { FileX, Info, Sparkles } from "lucide-react";
import { classeSeloIa } from "@/components/curriculo/campos";
import { ModeloCurriculo } from "@/components/curriculo/modelo-curriculo";
import { VisualizacaoA4 } from "@/components/curriculo/visualizacao-a4";
import { EstadoErro } from "@/components/entrevistas/estado-erro";
import { Revelar } from "@/components/movimento";
import { apiAdmin, rotasAdmin, type CurriculoParticipante } from "@/lib/admin";
import { formatarData } from "@/lib/utils";
import { CarregandoCurriculo } from "@/components/curriculo/estados";
import { AvisoAcessoRegistrado, CabecalhoAdmin, EstadoVazio } from "./ui-admin";
import { useRecursoAdmin } from "./use-recurso-admin";

/**
 * Currículo de um participante, no mesmo modelo visual que ele vê (folha A4). Só leitura: sem editar,
 * sem baixar. Abrir fica registrado na auditoria.
 */
export function CurriculoParticipanteView() {
  const params = useParams<{ id: string; curriculoId: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const curriculoId = typeof params?.curriculoId === "string" ? params.curriculoId : "";
  const { dados, erro, carregando, recarregar } = useRecursoAdmin<CurriculoParticipante>(
    id && curriculoId ? apiAdmin.curriculo(id, curriculoId) : null,
    { mensagemPadrao: "Não foi possível carregar o currículo agora." },
  );
  const voltar = { href: id ? rotasAdmin.ficha(id) : rotasAdmin.participantes, rotulo: "Voltar para a ficha" };

  if (!id || !curriculoId || erro?.status === 404 || erro?.status === 400) {
    return (
      <div className="space-y-6">
        <CabecalhoAdmin sobretitulo="Currículo do participante" titulo="Currículo" voltar={voltar} />
        <EstadoVazio icone={FileX} titulo="Currículo não encontrado">
          Ele pode ter sido excluído pelo participante ou o link está incompleto.
        </EstadoVazio>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="space-y-6">
        <CabecalhoAdmin sobretitulo="Currículo do participante" titulo="Currículo" voltar={voltar} />
        <EstadoErro titulo="Não foi possível abrir o currículo" mensagem={erro.mensagem} status={erro.status} onTentarDeNovo={recarregar} />
      </div>
    );
  }

  if (carregando || !dados?.conteudo) {
    return (
      <div className="space-y-6">
        <AvisoAcessoRegistrado />
        <CarregandoCurriculo rotulo="Carregando o currículo do participante…" />
      </div>
    );
  }

  const titulo = dados.titulo?.trim() || (dados.cargoDesejado?.trim() ? `Currículo – ${dados.cargoDesejado.trim()}` : "Currículo");
  const nome = dados.conteudo.nomeCompleto?.trim();

  return (
    <div className="space-y-6">
      <CabecalhoAdmin
        sobretitulo="Currículo do participante"
        voltar={voltar}
        titulo={titulo}
        descricao={
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {nome && <span className="font-medium text-foreground">{nome}</span>}
            {nome && <span aria-hidden="true">·</span>}
            <span>Atualizado em {formatarData(dados.atualizadoEm || dados.geradoEm)}</span>
            {dados.refinadoPorIa && (
              <span className={classeSeloIa}>
                <Sparkles className="size-3.5" aria-hidden="true" />
                Refinado pela IA
              </span>
            )}
          </div>
        }
      />

      <AvisoAcessoRegistrado />

      <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        Você está vendo o currículo como o participante vê. A foto, se ele adicionou, fica só no aparelho dele e não
        aparece aqui.
      </p>

      {/* Folha A4 que encolhe no celular, sobre uma "mesa" (mesmo desenho da tela do participante) */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-muted/60 p-2 sm:p-5 dark:bg-white/[0.03]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 fundo-grade text-foreground opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]"
        />
        <Revelar y={24} transition={{ duration: 0.55 }} className="relative">
          <VisualizacaoA4>
            <ModeloCurriculo conteudo={dados.conteudo} />
          </VisualizacaoA4>
        </Revelar>
      </div>
    </div>
  );
}
