import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

// Carrega o .env local (Node >= 20.12). Variáveis já definidas no ambiente têm prioridade.
const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const booleano = z
  .string()
  .optional()
  .transform((v) => v === 'true');

/** Trata `VAR=` (vazia) no .env como não definida. */
const vazioParaUndefined = (v: unknown) =>
  typeof v === 'string' && v.trim() === '' ? undefined : v;

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  FRONTEND_URL: z.string().min(1).default('http://localhost:3000'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET deve ter ao menos 32 caracteres'),
  JWT_ACCESS_TTL_MIN: z.coerce.number().int().positive().default(15),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(7),
  COOKIE_SECURE: booleano,
  /**
   * Path do cookie do refresh token. O navegador fala com a API pelo proxy do Next
   * (`/api-proxy/*`), então o cookie precisa valer para `/api-proxy/auth` (refresh e logout).
   */
  COOKIE_REFRESH_PATH: z.preprocess(
    vazioParaUndefined,
    z.string().startsWith('/').default('/api-proxy/auth'),
  ),
  /**
   * Valor do `trust proxy` do Express. Padrão: confia só em proxies de rede local/Docker
   * (o Next.js), para que o IP real do usuário chegue ao rate limit e à auditoria.
   */
  TRUST_PROXY: z.preprocess(
    vazioParaUndefined,
    z.string().default('loopback, linklocal, uniquelocal'),
  ),
  /** Tentativas de login erradas por e-mail antes do bloqueio temporário. */
  LOGIN_MAX_TENTATIVAS: z.coerce.number().int().positive().default(10),
  LOGIN_BLOQUEIO_MIN: z.coerce.number().int().positive().default(15),

  DATA_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'DATA_ENCRYPTION_KEY deve ter 64 caracteres hexadecimais'),
  DATA_HASH_KEY: z.string().min(32, 'DATA_HASH_KEY deve ter ao menos 32 caracteres'),

  S3_ENDPOINT: z.string().optional(),
  S3_PUBLIC_URL: z.string().min(1),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: booleano,

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('Impulso Jovem <nao-responda@impulsojovem.com.br>'),

  LGPD_TERMO_VERSAO: z.string().default('2026.1'),

  // Integração com o n8n (IA recrutadora no WhatsApp + refinamento de currículo)
  /** Chave enviada pelo n8n no header `x-api-key`. Sem ela, os webhooks ficam desativados. */
  N8N_API_KEY: z.preprocess(
    vazioParaUndefined,
    z.string().min(32, 'N8N_API_KEY deve ter ao menos 32 caracteres').optional(),
  ),
  /** Webhook do n8n que monta o currículo com IA (transcrição de áudio + estruturação). Opcional. */
  N8N_CURRICULO_WEBHOOK_URL: z.preprocess(vazioParaUndefined, z.url().optional()),
  N8N_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  /** O currículo pode transcrever áudio antes de chamar a IA — precisa de mais tempo. */
  N8N_CURRICULO_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
  /**
   * Webhook do n8n que gera o relatório de uma sessão encerrada (opcional).
   * Sem ele, o agendamento do próprio fluxo de relatório busca as sessões pendentes.
   */
  N8N_RELATORIO_WEBHOOK_URL: z.preprocess(vazioParaUndefined, z.url().optional()),

  /** Número do WhatsApp da IA recrutadora (só dígitos, com DDI). Sem ele, o botão fica oculto. */
  WHATSAPP_NUMERO_BOT: z.preprocess(
    (v) => (typeof v === 'string' ? v.replace(/\D/g, '') || undefined : v),
    z
      .string()
      .regex(/^\d{10,15}$/, 'WHATSAPP_NUMERO_BOT deve ter de 10 a 15 dígitos (ex.: 5561999999999)')
      .optional(),
  ),
  /** Minutos sem mensagens até uma simulação em andamento ser encerrada automaticamente. */
  SESSAO_INATIVIDADE_MIN: z.coerce.number().int().positive().default(120),
  /** Mínimo de respostas do candidato para uma sessão gerar relatório. */
  SESSAO_MIN_MENSAGENS_CANDIDATO: z.coerce.number().int().positive().default(3),
});

const resultado = schema.safeParse(process.env);

if (!resultado.success) {
  const problemas = resultado.error.issues
    .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(`Variáveis de ambiente inválidas:\n${problemas}`);
}

export const env = resultado.data;
export type Env = typeof env;
export const isProducao = env.NODE_ENV === 'production';
