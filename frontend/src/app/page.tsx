import type { Metadata } from "next";
import { CabecalhoPublico, type LinkCabecalho } from "@/components/layout/cabecalho-publico";
import { RodapePublico } from "@/components/layout/rodape-publico";
import { SecaoAbertura } from "@/components/landing/secao-abertura";
import { SecaoAnatomiaPrompt } from "@/components/landing/secao-anatomia-prompt";
import { SecaoBibliotecaPrompts } from "@/components/landing/secao-biblioteca-prompts";
import { SecaoChamadaFinal } from "@/components/landing/secao-chamada-final";
import { SecaoCuidados } from "@/components/landing/secao-cuidados";
import { SecaoEstudar } from "@/components/landing/secao-estudar";
import { SecaoJornada } from "@/components/landing/secao-jornada";
import { SecaoPerguntas } from "@/components/landing/secao-perguntas";
import { SecaoPlataforma } from "@/components/landing/secao-plataforma";
import { ProvedorMovimento } from "@/components/movimento";

export const metadata: Metadata = {
  title: { absolute: "Impulso Jovem — use a IA a seu favor no processo seletivo" },
  description:
    "Guia gratuito para jovens: como usar a inteligência artificial em cada etapa do processo seletivo, prompts prontos para copiar, como estudar com IA e como treinar entrevistas. E uma plataforma para montar o currículo e simular a entrevista no WhatsApp.",
};

/** Âncoras do menu — cada uma corresponde ao `id` de uma seção. */
const LINKS_CABECALHO: LinkCabecalho[] = [
  { href: "#jornada", rotulo: "Processo seletivo" },
  { href: "#prompts", rotulo: "Prompts" },
  { href: "#estudar", rotulo: "Estudar com IA" },
  { href: "#plataforma", rotulo: "Plataforma" },
  { href: "#duvidas", rotulo: "Dúvidas" },
];

/**
 * Landing: primeiro um guia de IA para o processo seletivo (o conteúdo vale por si só),
 * depois a plataforma que leva o jovem do estudo à prática.
 */
export default function PaginaInicial() {
  return (
    <ProvedorMovimento>
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        <CabecalhoPublico links={LINKS_CABECALHO} />
        <main id="conteudo" className="flex-1">
          <SecaoAbertura />
          <SecaoJornada />
          <SecaoAnatomiaPrompt />
          <SecaoBibliotecaPrompts />
          <SecaoEstudar />
          <SecaoCuidados />
          <SecaoPlataforma />
          <SecaoPerguntas />
          <SecaoChamadaFinal />
        </main>
        <RodapePublico />
      </div>
    </ProvedorMovimento>
  );
}
