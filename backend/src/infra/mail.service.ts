import { Injectable, Logger } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import { env } from '../config/env';

const escapar = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );

const urlFrontend = (caminho: string) => `${env.FRONTEND_URL.replace(/\/+$/, '')}${caminho}`;

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] || 'tudo bem';

interface Cta {
  texto: string;
  url: string;
}

/** Conteúdo de um e-mail: parágrafos em texto puro (escapados aqui) + botão opcional. */
interface Mensagem {
  assunto: string;
  titulo: string;
  paragrafos: string[];
  cta?: Cta;
}

function layoutHtml({ titulo, paragrafos, cta }: Mensagem) {
  const corpo = paragrafos.map((p) => `<p style="margin:0 0 12px">${escapar(p)}</p>`).join('');
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f2ff;font-family:Arial,Helvetica,sans-serif;color:#1e1b4b">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
    <tr><td style="background:linear-gradient(135deg,#6d28d9,#db2777);padding:24px 32px;color:#fff;font-size:22px;font-weight:bold">Impulso Jovem</td></tr>
    <tr><td style="padding:32px">
      <h1 style="font-size:20px;margin:0 0 16px">${escapar(titulo)}</h1>
      <div style="font-size:15px;line-height:1.6;color:#334155">${corpo}</div>
      ${cta ? `<p style="margin:28px 0 0"><a href="${escapar(cta.url)}" style="background:#6d28d9;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;display:inline-block">${escapar(cta.texto)}</a></p>` : ''}
    </td></tr>
    <tr><td style="padding:16px 32px;background:#faf9ff;color:#94a3b8;font-size:12px">Você recebeu este e-mail porque tem cadastro no Impulso Jovem.</td></tr>
  </table></td></tr></table></body></html>`;
}

/** Versão em texto puro — melhora a entrega e a leitura em apps simples. */
function layoutTexto({ titulo, paragrafos, cta }: Mensagem) {
  return [
    titulo,
    '',
    ...paragrafos,
    ...(cta ? ['', `${cta.texto}: ${cta.url}`] : []),
    '',
    '— Impulso Jovem',
  ].join('\n');
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter = createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    // Servidor de e-mail fora do ar não pode prender conexões por minutos
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  /** Envio não bloqueante — falhas são registradas (sem o endereço, por LGPD) e não quebram o fluxo. */
  private async enviar(para: string, mensagem: Mensagem): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: env.MAIL_FROM,
        to: para,
        subject: mensagem.assunto,
        html: layoutHtml(mensagem),
        text: layoutTexto(mensagem),
      });
    } catch (e) {
      // Só o código: a mensagem do servidor SMTP costuma trazer o endereço do destinatário
      const { code, responseCode } = e as { code?: string; responseCode?: number };
      this.logger.warn(
        `Falha ao enviar e-mail "${mensagem.assunto}" (${code ?? 'erro desconhecido'}${responseCode ? `, SMTP ${responseCode}` : ''})`,
      );
    }
  }

  boasVindas(para: string, nome: string) {
    return this.enviar(para, {
      assunto: 'Boas-vindas ao Impulso Jovem!',
      titulo: `Olá, ${primeiroNome(nome)}!`,
      paragrafos: [
        'Sua conta foi criada com sucesso. Agora você pode montar seu currículo com ajuda da IA — escrevendo ou gravando um áudio contando sua história.',
        'Quando quiser, treine uma entrevista de emprego pelo WhatsApp com a Helena, nossa recrutadora virtual. No final, você recebe um relatório com seus pontos fortes e o que dá para melhorar.',
      ],
      cta: { texto: 'Acessar minha conta', url: urlFrontend('/login') },
    });
  }

  recuperacaoSenha(para: string, nome: string, token: string) {
    return this.enviar(para, {
      assunto: 'Redefinição de senha — Impulso Jovem',
      titulo: `Olá, ${primeiroNome(nome)}!`,
      paragrafos: [
        'Recebemos um pedido para redefinir a senha da sua conta. O link abaixo vale por 30 minutos e só pode ser usado uma vez.',
        'Se não foi você, pode ignorar este e-mail: sua senha continua a mesma.',
      ],
      cta: {
        texto: 'Criar nova senha',
        url: urlFrontend(`/redefinir-senha?token=${encodeURIComponent(token)}`),
      },
    });
  }

  /** Aviso de segurança após troca/redefinição de senha. */
  senhaAlterada(para: string, nome: string) {
    return this.enviar(para, {
      assunto: 'Sua senha foi alterada — Impulso Jovem',
      titulo: `Olá, ${primeiroNome(nome)}!`,
      paragrafos: [
        'A senha da sua conta no Impulso Jovem acabou de ser alterada e, por segurança, encerramos as sessões abertas em outros aparelhos.',
        'Se não foi você, redefina sua senha agora pela opção "Esqueci minha senha" na tela de login.',
      ],
      cta: { texto: 'Ir para o login', url: urlFrontend('/login') },
    });
  }
}
