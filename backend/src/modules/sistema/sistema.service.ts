import { Injectable } from '@nestjs/common';
import { env } from '../../config/env';
import { PrismaService } from '../../infra/prisma.service';
import { RedisService } from '../../infra/redis.service';

export const MENSAGEM_INICIAL_WHATSAPP = 'Olá! Quero treinar para uma entrevista.';

const TEMPO_MAXIMO_CHECAGEM_MS = 2000;

export interface ConfigPublica {
  whatsappNumero: string | null;
  whatsappLink: string | null;
  curriculoIaDisponivel: boolean;
}

export interface Saude {
  status: 'ok';
  banco: boolean;
  redis: boolean;
}

/** Monta o link do WhatsApp da IA recrutadora (ou null se o número não estiver configurado). */
export function linkWhatsapp(numero: string | undefined): string | null {
  return numero
    ? `https://wa.me/${numero}?text=${encodeURIComponent(MENSAGEM_INICIAL_WHATSAPP)}`
    : null;
}

@Injectable()
export class SistemaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  configPublica(): ConfigPublica {
    return {
      whatsappNumero: env.WHATSAPP_NUMERO_BOT ?? null,
      whatsappLink: linkWhatsapp(env.WHATSAPP_NUMERO_BOT),
      curriculoIaDisponivel: !!env.N8N_CURRICULO_WEBHOOK_URL,
    };
  }

  /** Sempre responde (status 200): quem monitora olha os campos `banco` e `redis`. */
  async saude(): Promise<Saude> {
    const [banco, redis] = await Promise.all([this.bancoOk(), this.redis.ping()]);
    return { status: 'ok', banco, redis };
  }

  private async bancoOk(): Promise<boolean> {
    let timer: NodeJS.Timeout | undefined;
    try {
      const limite = new Promise<boolean>((resolver) => {
        timer = setTimeout(() => resolver(false), TEMPO_MAXIMO_CHECAGEM_MS);
      });
      const consulta = this.prisma.$queryRaw`SELECT 1`.then(() => true);
      return await Promise.race([consulta, limite]);
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
}
