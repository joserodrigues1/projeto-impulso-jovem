import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma.service';
import { env } from '../../config/env';

@Injectable()
export class CurriculosService {
  private readonly logger = new Logger(CurriculosService.name);

  constructor(private readonly prisma: PrismaService) {}

  async gerarCurriculo(usuarioId: string, dados: any) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { perfil: true },
    });

    if (!usuario) {
      throw new InternalServerErrorException('Usuário não encontrado.');
    }

    const payload = {
      usuario: {
        id: usuario.id,
        nome: usuario.nomeCompleto,
        email: usuario.email,
        telefone: usuario.telefone,
      },
      curriculo: dados,
    };

    // Aqui faríamos o fetch para o Webhook do n8n.
    // Como o webhook exato não foi providenciado, vamos deixar a estrutura montada e mockar a resposta se o N8N_WEBHOOK_URL não existir.
    
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    let pdfUrl = 'https://s3.amazonaws.com/exemplo/curriculo-gerado-mock.pdf'; // Mock fallback

    if (webhookUrl) {
      try {
        const resposta = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!resposta.ok) {
          throw new Error(`Falha no n8n: ${resposta.statusText}`);
        }

        const data = await resposta.json();
        // Assume que o n8n devolve { pdfUrl: '...' }
        pdfUrl = data.pdfUrl || pdfUrl;
      } catch (error) {
        this.logger.error('Erro ao enviar dados para o n8n', error);
        throw new InternalServerErrorException('Não foi possível gerar o currículo no momento.');
      }
    } else {
      this.logger.warn('N8N_WEBHOOK_URL não configurada. Usando resposta mockada.');
    }

    const curriculo = await this.prisma.curriculoGerado.create({
      data: {
        usuarioId: usuario.id,
        pdfUrl,
      },
    });

    return curriculo;
  }
}
