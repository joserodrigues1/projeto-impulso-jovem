import type { Metadata } from "next";
import Link from "next/link";
import { MarcadorPendente, PaginaLegal, type SecaoLegal } from "@/components/layout/pagina-legal";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description:
    "Quais dados o Impulso Jovem usa, para quê, com quem compartilha, por quanto tempo guarda e como você exporta ou exclui seus dados.",
};

// Texto baseado no que o sistema faz de fato (ver docs/ARQUITETURA.md). Mudou a coleta? Atualize aqui.
const SECOES: SecaoLegal[] = [
  {
    id: "quem-somos",
    titulo: "Quem somos",
    conteudo: (
      <>
        <p>
          O Impulso Jovem é uma plataforma que ajuda jovens que buscam o primeiro emprego, vaga de jovem aprendiz ou
          estágio a montar o currículo com inteligência artificial (IA) e a treinar entrevistas de emprego pelo WhatsApp.
        </p>
        <p>
          Responsável pelo tratamento dos dados (controlador): <MarcadorPendente>[razão social e CNPJ a definir]</MarcadorPendente>.
          <br />
          Encarregado de dados (DPO): <MarcadorPendente>[contato do encarregado a definir]</MarcadorPendente>.
        </p>
      </>
    ),
  },
  {
    id: "dados-coletados",
    titulo: "Quais dados usamos",
    conteudo: (
      <>
        <ul>
          <li>
            <strong>Dados da conta:</strong> nome completo, e-mail, número de WhatsApp e senha. A senha é guardada de
            forma irreversível (hash): nem a nossa equipe consegue vê-la.
          </li>
          <li>
            <strong>Dados do currículo:</strong> o que você preenche ou conta para a IA — cargo desejado, cidade e estado,
            LinkedIn, perfil profissional, experiências, formação, habilidades, idiomas, prêmios e cursos.
          </li>
          <li>
            <strong>Áudio do currículo:</strong> se você gravar um áudio contando sua história, ele é enviado, pela
            nossa ferramenta de automação, ao serviço de IA para ser transcrito e organizado. O áudio não fica salvo
            na sua conta nem no nosso banco de dados: guardamos só o currículo que resulta dele. O tratamento do áudio
            pelo serviço de IA segue o que explicamos em “Como a inteligência artificial entra nisso”.
          </li>
          <li>
            <strong>Simulações de entrevista no WhatsApp:</strong> as mensagens trocadas com a recrutadora virtual (os
            textos e a transcrição dos áudios que você enviar), o cargo e a empresa da simulação, e as datas e horários
            da conversa.
          </li>
          <li>
            <strong>Relatórios gerados por IA:</strong> nota, avaliação por competência, pontos fortes, pontos de
            melhoria, plano de ação e dicas de cada simulação.
          </li>
          <li>
            <strong>Dados de segurança:</strong> o registro do seu aceite destes termos (data, versão do texto, endereço
            IP e navegador), o endereço IP e o navegador das sessões de login e um histórico de ações importantes da
            conta, como cadastro, troca de senha e tentativas de login com erro.
          </li>
        </ul>
        <p>
          <strong>No seu navegador</strong>, usamos apenas cookies essenciais para manter você conectado com segurança.
          Algumas preferências (como o tema claro ou escuro), o rascunho do currículo, a foto que você adicionar ao
          currículo e o progresso do plano de ação ficam salvos só no seu aparelho — a foto nunca é enviada para nós.
          Ao clicar em “Sair” ou excluir a conta, apagamos do aparelho o rascunho, a foto e o progresso. Em computador
          compartilhado, lembre-se de sair da conta. Não usamos cookies de publicidade nem ferramentas de rastreamento.
        </p>
      </>
    ),
  },
  {
    id: "finalidades",
    titulo: "Para que usamos seus dados",
    conteudo: (
      <ul>
        <li>Criar e manter sua conta e permitir que você entre nela.</li>
        <li>Montar, guardar e deixar você editar seus currículos e baixá-los em PDF.</li>
        <li>Reconhecer você no WhatsApp pelo número cadastrado e conduzir a simulação de entrevista.</li>
        <li>Gerar o relatório de cada simulação e mostrar sua evolução no painel.</li>
        <li>Enviar e-mails da conta, como o link para criar uma nova senha.</li>
        <li>Proteger a plataforma contra acessos indevidos e abusos (por exemplo, limitando tentativas de login).</li>
      </ul>
    ),
  },
  {
    id: "inteligencia-artificial",
    titulo: "Como a inteligência artificial entra nisso",
    conteudo: (
      <>
        <p>
          Para organizar o currículo, conduzir a simulação e escrever o relatório, enviamos o conteúdo necessário — os
          dados do currículo, o áudio para transcrição e as mensagens da simulação — para o{" "}
          <strong>Google Gemini</strong>, serviço de IA do Google, por meio da nossa ferramenta de automação (n8n).
        </p>
        <p>
          A IA pode errar. Revise o currículo antes de usá-lo e entenda o relatório como um apoio para treinar, não como
          a avaliação oficial de uma empresa. Evite enviar nas conversas dados que não são necessários, como documentos,
          CPF ou informações de saúde.
        </p>
      </>
    ),
  },
  {
    id: "compartilhamento",
    titulo: "Com quem compartilhamos",
    conteudo: (
      <>
        <p>Compartilhamos dados só com quem precisa deles para o serviço funcionar:</p>
        <ul>
          <li>
            <strong>Google (Gemini):</strong> processamento por IA, como explicado acima.
          </li>
          <li>
            <strong>WhatsApp (Meta) e o serviço que conecta nosso número ao WhatsApp:</strong> troca das mensagens da
            simulação. As conversas no WhatsApp também seguem as regras de privacidade do próprio WhatsApp.
          </li>
          <li>
            <strong>Serviço de envio de e-mail:</strong> mensagens da conta, como a recuperação de senha.
          </li>
          <li>
            <strong>Provedores de hospedagem e infraestrutura</strong> onde a plataforma funciona.
          </li>
          <li>
            <strong>Autoridades públicas</strong>, quando a lei exigir.
          </li>
        </ul>
        <p>
          Alguns desses serviços podem processar dados fora do Brasil. Lista detalhada de fornecedores:{" "}
          <MarcadorPendente>[lista de operadores a definir]</MarcadorPendente>.
        </p>
        <p>Não vendemos seus dados e não os usamos para publicidade.</p>
      </>
    ),
  },
  {
    id: "retencao",
    titulo: "Por quanto tempo guardamos",
    conteudo: (
      <>
        <p>
          Seus dados ficam guardados <strong>enquanto a sua conta existir</strong>.
        </p>
        <p>
          Quando você <strong>exclui a conta</strong>, apagamos na hora seus dados de cadastro, currículos, simulações,
          mensagens e relatórios. Ficam apenas registros técnicos de segurança (como o tipo de ação, a data e o endereço
          IP), sem o seu nome, e-mail ou telefone, pelo prazo de{" "}
          <MarcadorPendente>[prazo de retenção dos registros de segurança a definir]</MarcadorPendente>.
        </p>
        <p>As sessões de login e os links de redefinição de senha expiram sozinhos depois de um tempo.</p>
      </>
    ),
  },
  {
    id: "direitos",
    titulo: "Seus direitos e como exercê-los",
    conteudo: (
      <>
        <p>Pela Lei Geral de Proteção de Dados (LGPD), você pode, entre outros direitos:</p>
        <ul>
          <li>
            <strong>Ver e corrigir seus dados:</strong> altere nome e WhatsApp em{" "}
            <Link href="/dashboard/perfil">Configurações</Link> e edite seus currículos quando quiser.
          </li>
          <li>
            <strong>Receber uma cópia (portabilidade):</strong> use “Baixar meus dados” em Configurações para baixar um
            arquivo com tudo o que guardamos sobre você.
          </li>
          <li>
            <strong>Excluir seus dados:</strong> use “Excluir minha conta” em Configurações. A exclusão é definitiva.
          </li>
          <li>
            <strong>Retirar o consentimento:</strong> a qualquer momento, excluindo a conta.
          </li>
          <li>
            <strong>Saber com quem compartilhamos:</strong> veja a seção “Com quem compartilhamos”.
          </li>
        </ul>
        <p>
          Para outros pedidos ou dúvidas, fale com o encarregado:{" "}
          <MarcadorPendente>[contato do encarregado a definir]</MarcadorPendente>. Você também pode procurar a Autoridade
          Nacional de Proteção de Dados (ANPD).
        </p>
      </>
    ),
  },
  {
    id: "consentimento",
    titulo: "Consentimento",
    conteudo: (
      <p>
        Ao criar a conta, você marca, por conta própria, que leu e concorda com os{" "}
        <Link href="/termos">Termos de uso</Link> e com esta política. Guardamos a data desse aceite, a versão do texto, o
        endereço IP e o navegador usado, como comprovação. Você pode retirar o consentimento quando quiser, excluindo a
        conta em Configurações.
      </p>
    ),
  },
  {
    id: "menores",
    titulo: "Menores de 18 anos",
    conteudo: (
      <p>
        O Impulso Jovem é pensado para jovens de 14 a 24 anos. Se você tem menos de 18 anos, converse com seu pai, mãe
        ou responsável sobre o uso da plataforma.{" "}
        <MarcadorPendente>[regras específicas para menores de idade a definir]</MarcadorPendente>
      </p>
    ),
  },
  {
    id: "seguranca",
    titulo: "Segurança",
    conteudo: (
      <p>
        Sua senha é guardada de forma irreversível e a sessão fica em cookies protegidos, que os scripts da página não
        conseguem ler. Também limitamos tentativas de login para dificultar invasões. Nenhum sistema é 100% seguro: se
        notar algo estranho na sua conta, troque a senha em Configurações e fale com a gente.
      </p>
    ),
  },
  {
    id: "mudancas",
    titulo: "Mudanças nesta política",
    conteudo: (
      <p>
        Quando esta política mudar, a data de “Última atualização” no topo desta página também muda. Se a mudança for
        importante, avisaremos na plataforma.
      </p>
    ),
  },
];

export default function PaginaPrivacidade() {
  return (
    <PaginaLegal
      titulo="Política de privacidade"
      resumo="Explicamos, de um jeito direto, quais dados o Impulso Jovem usa, para quê, com quem compartilha e como você controla tudo isso."
      atualizadoEm="outubro de 2026"
      secoes={SECOES}
      relacionado={{ href: "/termos", rotulo: "Termos de uso" }}
    />
  );
}
