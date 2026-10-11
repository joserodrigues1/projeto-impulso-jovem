import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { descreverErro } from '../logger/descrever-erro';
import { mascararUrl } from '../logger/mascarar-url';

interface CorpoErro {
  statusCode: number;
  mensagem: string | string[];
  caminho: string;
  timestamp: string;
}

export interface ErroTraduzido {
  status: number;
  mensagem: string | string[];
  /** Erro inesperado — vai para o log com detalhes (nunca para o cliente). */
  inesperado: boolean;
}

export const MENSAGEM_ERRO_INTERNO = 'Ocorreu um erro inesperado. Tente novamente em instantes.';

/** Mensagens padrão (em inglês) do Nest/Express trocadas por textos amigáveis. */
const MENSAGEM_POR_STATUS: Record<number, string> = {
  400: 'Não foi possível entender a requisição. Confira os dados e tente de novo.',
  401: 'Faça login para continuar.',
  403: 'Você não tem permissão para fazer isso.',
  404: 'Não encontramos o que você procurou.',
  405: 'Ação não permitida.',
  408: 'A requisição demorou demais. Tente de novo.',
  409: 'Esse registro já existe.',
  413: 'O conteúdo enviado é grande demais.',
  415: 'Formato de conteúdo não suportado.',
  422: 'Não foi possível processar os dados enviados.',
  429: 'Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo.',
  500: MENSAGEM_ERRO_INTERNO,
  502: 'Um serviço externo não respondeu como esperado. Tente novamente em instantes.',
  503: 'Serviço temporariamente indisponível. Tente novamente em instantes.',
  504: 'Um serviço externo demorou demais para responder. Tente novamente em instantes.',
};

/** Textos padrão que o Nest usa quando a exceção é criada sem mensagem. */
const TEXTOS_PADRAO_HTTP = new Set([
  'Bad Request',
  'Unauthorized',
  'Forbidden',
  'Not Found',
  'Method Not Allowed',
  'Request Timeout',
  'Conflict',
  'Payload Too Large',
  'Unsupported Media Type',
  'Unprocessable Entity',
  'Too Many Requests',
  'ThrottlerException: Too Many Requests',
  'Internal Server Error',
  'Bad Gateway',
  'Service Unavailable',
  'Gateway Timeout',
]);

/** Mensagens técnicas conhecidas (multer, body-parser, pipes do Nest) → português. */
const TRADUCOES: Array<[RegExp, string]> = [
  [/^File too large/i, 'O arquivo enviado é grande demais.'],
  [/^Too many files/i, 'Envie apenas um arquivo por vez.'],
  [/^Unexpected (file )?field/i, 'O formulário tem um campo de arquivo inesperado.'],
  [
    /^(Too many (parts|fields)|Field (name|value) too long|Field name missing|Field name nesting too deep)/i,
    'O formulário enviado é inválido.',
  ],
  [/^Multipart:/i, 'O formulário enviado está incompleto ou corrompido. Tente de novo.'],
  // Erros do JSON.parse repassados pelo body-parser
  [
    /(in JSON at position|JSON input|is not valid JSON|after JSON|^Unexpected token|^Bad (control|escaped) character)/,
    'O conteúdo enviado não é um JSON válido.',
  ],
  [/^URI malformed/i, 'Endereço inválido.'],
  [/^Cannot (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) /, 'Rota não encontrada.'],
  [/^Validation failed \(uuid/i, 'Identificador inválido.'],
  [/^Validation failed \((numeric|boolean)/i, 'Parâmetro inválido.'],
];

function traduzirTexto(mensagem: string, status: number): string {
  if (TEXTOS_PADRAO_HTTP.has(mensagem)) return MENSAGEM_POR_STATUS[status] ?? mensagem;
  // Erro do ValidationPipe com whitelist: "property x should not exist"
  const campo = /^property (\S+) should not exist$/.exec(mensagem);
  if (campo) return `O campo "${campo[1]}" não é permitido.`;
  for (const [padrao, traducao] of TRADUCOES) {
    if (padrao.test(mensagem)) return traducao;
  }
  return mensagem;
}

function traduzirMensagem(mensagem: string | string[], status: number): string | string[] {
  return Array.isArray(mensagem)
    ? mensagem.map((m) => traduzirTexto(String(m), status))
    : traduzirTexto(mensagem, status);
}

function mensagemDaHttpException(exception: HttpException): string | string[] {
  const r = exception.getResponse();
  if (typeof r === 'string') return r;
  if (r && typeof r === 'object' && 'message' in r) {
    const m = (r as { message: unknown }).message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m)) return m.map(String);
  }
  return exception.message;
}

/** Status numérico de erros "crus" do Express/body-parser (ex.: 413 payload grande). */
function statusDeErroExterno(exception: unknown): number | null {
  if (!exception || typeof exception !== 'object') return null;
  const e = exception as { status?: unknown; statusCode?: unknown };
  const status = typeof e.status === 'number' ? e.status : e.statusCode;
  return typeof status === 'number' && Number.isInteger(status) ? status : null;
}

/** Converte qualquer exceção em status + mensagem segura para o cliente. */
export function traduzirExcecao(exception: unknown): ErroTraduzido {
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      return { status, mensagem: MENSAGEM_ERRO_INTERNO, inesperado: true };
    }
    return {
      status,
      mensagem: traduzirMensagem(mensagemDaHttpException(exception), status),
      inesperado:
        status > HttpStatus.INTERNAL_SERVER_ERROR && status !== HttpStatus.SERVICE_UNAVAILABLE,
    };
  }

  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    switch (exception.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          mensagem: 'Esse registro já existe.',
          inesperado: false,
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          mensagem: 'Registro não encontrado.',
          inesperado: false,
        };
      case 'P2023': // ex.: id que não é um UUID válido
        return {
          status: HttpStatus.NOT_FOUND,
          mensagem: 'Registro não encontrado.',
          inesperado: false,
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          mensagem: 'Referência inválida.',
          inesperado: false,
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          mensagem: MENSAGEM_ERRO_INTERNO,
          inesperado: true,
        };
    }
  }

  if (exception instanceof Prisma.PrismaClientInitializationError) {
    return {
      status: HttpStatus.SERVICE_UNAVAILABLE,
      mensagem: MENSAGEM_POR_STATUS[HttpStatus.SERVICE_UNAVAILABLE],
      inesperado: true,
    };
  }

  // Erros do Express/body-parser que não são HttpException (ex.: 413, 415, 400)
  const status = statusDeErroExterno(exception);
  if (status !== null && status >= 400 && status < 500) {
    return {
      status,
      mensagem: MENSAGEM_POR_STATUS[status] ?? MENSAGEM_POR_STATUS[400],
      inesperado: false,
    };
  }

  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    mensagem: MENSAGEM_ERRO_INTERNO,
    inesperado: true,
  };
}

/** Padroniza todas as respostas de erro da API: `{ statusCode, mensagem, caminho, timestamp }`. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Excecao');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const { status, mensagem, inesperado } = traduzirExcecao(exception);
    if (inesperado) {
      this.logger.error(
        `${req.method} ${mascararUrl(req.originalUrl ?? req.url)} → ${status}: ${descreverErro(exception, true)}`,
      );
    }

    if (res.headersSent) return;
    const corpo: CorpoErro = {
      statusCode: status,
      mensagem,
      caminho: req.url,
      timestamp: new Date().toISOString(),
    };
    res.status(status).json(corpo);
  }
}
