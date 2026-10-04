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

interface CorpoErro {
  statusCode: number;
  mensagem: string | string[];
  caminho: string;
  timestamp: string;
}

/** Padroniza todas as respostas de erro da API. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Excecao');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let mensagem: string | string[] = 'Erro interno do servidor';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      if (typeof r === 'string') mensagem = r;
      else if (r && typeof r === 'object' && 'message' in r) {
        mensagem = (r as { message: string | string[] }).message;
      } else mensagem = exception.message;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          mensagem = 'Registro já existente (valor duplicado)';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          mensagem = 'Registro não encontrado';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          mensagem = 'Referência inválida';
          break;
        default:
          this.logger.error(exception);
      }
    } else {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    const corpo: CorpoErro = {
      statusCode: status,
      mensagem,
      caminho: req.url,
      timestamp: new Date().toISOString(),
    };
    res.status(status).json(corpo);
  }
}
