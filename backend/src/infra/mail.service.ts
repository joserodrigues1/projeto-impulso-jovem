import { Injectable, Logger } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import { env } from '../config/env';

const escapar = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function layout(titulo: string, corpo: string, cta?: { texto: string; url: string }) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f2ff;font-family:Arial,Helvetica,sans-serif;color:#1e1b4b">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden">
    <tr><td style="background:linear-gradient(135deg,#6d28d9,#db2777);padding:24px 32px;color:#fff;font-size:22px;font-weight:bold">Impulso Jovem</td></tr>
    <tr><td style="padding:32px">
      <h1 style="font-size:20px;margin:0 0 16px">${escapar(titulo)}</h1>
      <div style="font-size:15px;line-height:1.6;color:#334155">${corpo}</div>
      ${cta ? `<p style="margin:28px 0 0"><a href="${cta.url}" style="background:#6d28d9;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;display:inline-block">${escapar(cta.texto)}</a></p>` : ''}
    </td></tr>
    <tr><td style="padding:16px 32px;background:#faf9ff;color:#94a3b8;font-size:12px">Você recebeu este e-mail porque possui cadastro no Impulso Jovem.</td></tr>
  </table></td></tr></table></body></html>`;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter = createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });

  /** Envio não bloqueante — falhas são registradas mas não quebram o fluxo. */
  async enviar(para: string, assunto: string, titulo: string, corpoHtml: string, cta?: { texto: string; url: string }) {
    try {
      await this.transporter.sendMail({
        from: env.MAIL_FROM,
        to: para,
        subject: assunto,
        html: layout(titulo, corpoHtml, cta),
      });
    } catch (e) {
      this.logger.error(`Falha ao enviar e-mail para ${para}: ${(e as Error).message}`);
    }
  }

  recuperacaoSenha(para: string, nome: string, token: string) {
    const url = `${env.FRONTEND_URL}/redefinir-senha?token=${encodeURIComponent(token)}`;
    return this.enviar(
      para,
      'Redefinição de senha — Impulso Jovem',
      `Olá, ${nome.split(' ')[0]}!`,
      '<p>Recebemos uma solicitação para redefinir sua senha. O link abaixo é válido por <strong>30 minutos</strong>.</p><p>Se não foi você, ignore este e-mail.</p>',
      { texto: 'Redefinir minha senha', url },
    );
  }

  boasVindas(para: string, nome: string, pendente: boolean) {
    return this.enviar(
      para,
      'Bem-vindo(a) ao Impulso Jovem!',
      `Olá, ${nome.split(' ')[0]}!`,
      pendente
        ? '<p>Recebemos o cadastro da sua empresa. Nossa equipe fará a validação em breve e avisaremos por e-mail assim que o perfil for liberado.</p>'
        : '<p>Sua conta foi criada com sucesso. Explore vagas, trilhas de capacitação e dê o próximo passo na sua carreira.</p>',
      { texto: 'Acessar a plataforma', url: `${env.FRONTEND_URL}/login` },
    );
  }

  empresaLiberada(para: string, nome: string) {
    return this.enviar(
      para,
      'Seu perfil corporativo foi liberado',
      'Perfil aprovado! 🎉',
      `<p>Olá, ${escapar(nome)}. O perfil da sua empresa foi aprovado e você já pode publicar vagas.</p>`,
      { texto: 'Publicar uma vaga', url: `${env.FRONTEND_URL}/dashboard/empresa/vagas/nova` },
    );
  }

  statusCandidatura(para: string, nome: string, vaga: string, status: string) {
    return this.enviar(
      para,
      `Atualização da sua candidatura: ${vaga}`,
      `Olá, ${nome.split(' ')[0]}!`,
      `<p>Sua candidatura para <strong>${escapar(vaga)}</strong> foi atualizada para: <strong>${escapar(status)}</strong>.</p>`,
      { texto: 'Ver minhas candidaturas', url: `${env.FRONTEND_URL}/dashboard/jovem/candidaturas` },
    );
  }

  novaCandidatura(para: string, vaga: string, candidato: string) {
    return this.enviar(
      para,
      `Nova candidatura: ${vaga}`,
      'Você recebeu uma nova candidatura',
      `<p><strong>${escapar(candidato)}</strong> se candidatou à vaga <strong>${escapar(vaga)}</strong>.</p>`,
      { texto: 'Ver candidatos', url: `${env.FRONTEND_URL}/dashboard/empresa/candidatos` },
    );
  }
}
