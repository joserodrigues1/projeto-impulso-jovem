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
