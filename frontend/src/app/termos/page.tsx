import type { Metadata } from "next";
import Link from "next/link";
import { MarcadorPendente, PaginaLegal, type SecaoLegal } from "@/components/layout/pagina-legal";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: "As regras para usar o Impulso Jovem: conta, uso da inteligência artificial, conduta e encerramento.",
};

const SECOES: SecaoLegal[] = [
  {
    id: "o-servico",
    titulo: "O que é o Impulso Jovem",
    conteudo: (
      <>
        <p>
          O Impulso Jovem é uma plataforma para quem busca o primeiro emprego, vaga de jovem aprendiz ou estágio. Nela
          você pode:
        </p>
        <ul>
          <li>montar seu currículo com ajuda da inteligência artificial (IA), digitando ou gravando um áudio;</li>
          <li>treinar entrevistas de emprego pelo WhatsApp com a Helena, uma recrutadora virtual (IA);</li>
          <li>receber um relatório de cada simulação, com nota, pontos fortes, pontos de melhoria e plano de ação.</li>
        </ul>
        <p>
          Responsável pela plataforma: <MarcadorPendente>[razão social e CNPJ a definir]</MarcadorPendente>.
        </p>
      </>
    ),
  },
  {
    id: "quem-pode-usar",
    titulo: "Quem pode usar",
    conteudo: (
      <p>
        A plataforma é pensada para jovens de 14 a 24 anos. Para treinar no WhatsApp, você precisa de um número de
        WhatsApp próprio. Se você tem menos de 18 anos, converse com seu pai, mãe ou responsável antes de criar a conta.{" "}
        <MarcadorPendente>[regras específicas para menores de idade a definir]</MarcadorPendente>
      </p>
    ),
  },
  {
    id: "sua-conta",
    titulo: "Sua conta",
    conteudo: (
      <ul>
        <li>Use dados verdadeiros e mantenha-os atualizados em Configurações.</li>
        <li>Sua senha é pessoal. Não compartilhe com ninguém.</li>
        <li>
          A recrutadora virtual reconhece você pelo número de WhatsApp cadastrado: quem enviar mensagem desse número
          conversa como se fosse você. Se trocar de número, atualize-o em Configurações.
        </li>
        <li>Se perceber algo estranho na conta, troque a senha imediatamente.</li>
      </ul>
    ),
  },
  {
    id: "inteligencia-artificial",
    titulo: "Como funciona a inteligência artificial",
    conteudo: (
      <>
        <p>
          <strong>Currículo:</strong> a IA reorganiza e reescreve o que você contou. Ela pode errar, deixar algo de fora
          ou exagerar. Revise tudo antes de enviar para uma empresa e não inclua experiências que você não teve.
        </p>
        <p>
          <strong>Simulação de entrevista:</strong> a Helena é uma IA, não uma pessoa, e não representa nenhuma empresa
          real. O relatório serve para você treinar e evoluir: ele não garante vaga e não substitui um processo seletivo
          de verdade.
        </p>
        <p>
          Para funcionar, o conteúdo que você envia é processado por serviços de IA de terceiros. Os detalhes estão na{" "}
          <Link href="/privacidade">Política de privacidade</Link>.
        </p>
      </>
    ),
  },
  {
    id: "uso-adequado",
    titulo: "Uso adequado",
    conteudo: (
      <>
        <p>Ao usar o Impulso Jovem, você concorda em não:</p>
        <ul>
          <li>enviar conteúdo ofensivo, discriminatório, violento ou ilegal;</li>
          <li>usar dados de outra pessoa ou se passar por alguém;</li>
          <li>tentar invadir, sobrecarregar ou burlar os limites e a segurança da plataforma;</li>
          <li>usar o número da recrutadora virtual para spam ou para assuntos que não são o treino de entrevista.</li>
        </ul>
        <p>
          Também recomendamos não enviar nas conversas dados desnecessários, como documentos, CPF ou informações de saúde.
        </p>
      </>
    ),
  },
  {
    id: "seu-conteudo",
    titulo: "Seu conteúdo",
    conteudo: (
      <p>
        O que você escreve, grava e responde continua sendo seu. Você nos autoriza a usar esse conteúdo apenas para
        prestar o serviço: montar seus currículos, conduzir as simulações e gerar os relatórios.
      </p>
    ),
  },
  {
    id: "disponibilidade",
    titulo: "Disponibilidade",
    conteudo: (
      <p>
        A plataforma pode ficar fora do ar por alguns instantes durante atualizações e manutenções, e os recursos podem
        mudar com o tempo. O treino no WhatsApp depende de serviços de terceiros (como o próprio WhatsApp) e pode ficar
        indisponível por um tempo.
      </p>
    ),
  },
  {
    id: "encerramento",
    titulo: "Encerramento da conta",
    conteudo: (
      <p>
        Você pode excluir sua conta a qualquer momento em <Link href="/dashboard/perfil">Configurações</Link>; a exclusão
        apaga seus currículos, simulações e relatórios e não pode ser desfeita. Contas que desrespeitarem estes termos
        podem ser bloqueadas.
      </p>
    ),
  },
  {
    id: "responsabilidades",
    titulo: "Responsabilidades",
    conteudo: (
      <>
        <p>
          O Impulso Jovem é uma ferramenta de apoio. As decisões sobre suas candidaturas e o conteúdo que você envia às
          empresas são suas.
        </p>
        <p>
          <MarcadorPendente>[limitações de responsabilidade e foro a definir]</MarcadorPendente>
        </p>
      </>
    ),
  },
  {
    id: "mudancas",
    titulo: "Mudanças nestes termos",
    conteudo: (
      <p>
        Quando estes termos mudarem, a data de “Última atualização” no topo desta página também muda. Se a mudança for
        importante, avisaremos na plataforma.
      </p>
    ),
  },
  {
    id: "contato",
    titulo: "Contato",
    conteudo: (
      <p>
        Dúvidas sobre estes termos ou sobre seus dados: <MarcadorPendente>[contato do encarregado a definir]</MarcadorPendente>.
      </p>
    ),
  },
];

export default function PaginaTermos() {
  return (
    <PaginaLegal
      titulo="Termos de uso"
      resumo="As regras para usar o Impulso Jovem — o que a plataforma faz, o que esperamos de você e o que você pode esperar da gente."
      atualizadoEm="outubro de 2026"
      secoes={SECOES}
      relacionado={{ href: "/privacidade", rotulo: "Política de privacidade" }}
    />
  );
}
