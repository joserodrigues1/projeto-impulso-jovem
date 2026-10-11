import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  HttpExceptionFilter,
  MENSAGEM_ERRO_INTERNO,
  traduzirExcecao,
} from './http-exception.filter';

/** Erro como o body-parser lança (http-errors): não é HttpException, mas tem status. */
function erroBodyParser(status: number, mensagem: string, type: string) {
  return Object.assign(new Error(mensagem), { status, statusCode: status, expose: true, type });
}

function hostFalso(url = '/api/v1/teste') {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status, headersSent: false };
  const req = { method: 'POST', url, originalUrl: url };
  const host = {
    switchToHttp: () => ({ getResponse: () => res, getRequest: () => req }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('HttpExceptionFilter', () => {
  let logError: jest.SpyInstance;

  beforeEach(() => {
    logError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => logError.mockRestore());

  it('payload grande do body-parser responde 413 com mensagem em português', () => {
    const r = traduzirExcecao(erroBodyParser(413, 'request entity too large', 'entity.too.large'));
    expect(r.status).toBe(413);
    expect(r.mensagem).toBe('O conteúdo enviado é grande demais.');
    expect(r.inesperado).toBe(false);
  });

  it('charset não suportado do body-parser responde 415', () => {
    const r = traduzirExcecao(
      erroBodyParser(415, 'unsupported charset "X"', 'charset.unsupported'),
    );
    expect(r.status).toBe(415);
    expect(r.mensagem).not.toMatch(/charset/);
  });

  it('JSON malformado responde 400 com mensagem amigável', () => {
    const r = traduzirExcecao(
      new BadRequestException("Expected property name or '}' in JSON at position 1"),
    );
    expect(r.status).toBe(400);
    expect(r.mensagem).toBe('O conteúdo enviado não é um JSON válido.');
  });

  it('erro inesperado vira 500 sem vazar detalhes internos', () => {
    const r = traduzirExcecao(new Error('falha ao conectar em postgres://usuario:segredo@db'));
    expect(r.status).toBe(500);
    expect(r.mensagem).toBe(MENSAGEM_ERRO_INTERNO);
    expect(r.inesperado).toBe(true);
  });

  it('erro "cru" com status 5xx também não vaza a mensagem', () => {
    const r = traduzirExcecao(
      erroBodyParser(500, 'stream encoding should not be set', 'stream.encoding.set'),
    );
    expect(r.status).toBe(500);
    expect(r.mensagem).toBe(MENSAGEM_ERRO_INTERNO);
  });

  it('InternalServerErrorException com texto técnico também é mascarada', () => {
    const r = traduzirExcecao(new InternalServerErrorException('coluna x não existe'));
    expect(r.status).toBe(500);
    expect(r.mensagem).toBe(MENSAGEM_ERRO_INTERNO);
  });

  it('mantém mensagens já escritas em português pelos serviços', () => {
    const r = traduzirExcecao(new ConflictException('Este e-mail já está cadastrado'));
    expect(r).toEqual({
      status: 409,
      mensagem: 'Este e-mail já está cadastrado',
      inesperado: false,
    });
  });

  it('mantém a lista de mensagens do ValidationPipe e traduz campos não permitidos', () => {
    const r = traduzirExcecao(
      new BadRequestException(['E-mail inválido', 'property admin should not exist']),
    );
    expect(r.mensagem).toEqual(['E-mail inválido', 'O campo "admin" não é permitido.']);
  });

  it('traduz textos padrão do Nest e do multer', () => {
    expect(traduzirExcecao(new UnauthorizedException()).mensagem).toBe(
      'Faça login para continuar.',
    );
    expect(traduzirExcecao(new NotFoundException('Cannot GET /api/v1/nada')).mensagem).toBe(
      'Rota não encontrada.',
    );
    expect(traduzirExcecao(new PayloadTooLargeException('File too large')).mensagem).toBe(
      'O arquivo enviado é grande demais.',
    );
  });

  it('valor duplicado no banco (P2002) vira 409', () => {
    const erro = new Prisma.PrismaClientKnownRequestError('Unique constraint failed on email', {
      code: 'P2002',
      clientVersion: 'teste',
    });
    const r = traduzirExcecao(erro);
    expect(r.status).toBe(409);
    expect(r.mensagem).not.toMatch(/email/);
  });

  it('responde no formato padrão e registra só os erros inesperados', () => {
    const filtro = new HttpExceptionFilter();

    const ok = hostFalso('/api/v1/auth/login');
    filtro.catch(erroBodyParser(413, 'request entity too large', 'entity.too.large'), ok.host);
    expect(ok.status).toHaveBeenCalledWith(413);
    expect(ok.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 413,
        mensagem: 'O conteúdo enviado é grande demais.',
        caminho: '/api/v1/auth/login',
      }),
    );
    expect(logError).not.toHaveBeenCalled();

    const falha = hostFalso('/api/v1/webhooks/whatsapp/usuario/5561999999999');
    filtro.catch(new Error('detalhe interno'), falha.host);
    expect(falha.status).toHaveBeenCalledWith(500);
    expect(falha.json).toHaveBeenCalledWith(
      expect.objectContaining({ mensagem: MENSAGEM_ERRO_INTERNO }),
    );
    expect(logError).toHaveBeenCalledTimes(1);
    // O telefone da URL não vai para o log
    expect(String(logError.mock.calls[0][0])).not.toContain('5561999999999');
  });

  it('erro de validação do Prisma vira 500 sem levar os argumentos da consulta ao log', () => {
    const filtro = new HttpExceptionFilter();
    const erro = new Prisma.PrismaClientValidationError(
      '\nInvalid `prisma.usuario.findUnique()` invocation:\n\n{\n  where: { email: "pessoa@exemplo.com" }\n}\n\nArgument `x` is missing.',
      { clientVersion: 'teste' },
    );
    const falha = hostFalso('/api/v1/me');
    filtro.catch(erro, falha.host);
    expect(falha.status).toHaveBeenCalledWith(500);
    expect(falha.json).toHaveBeenCalledWith(
      expect.objectContaining({ mensagem: MENSAGEM_ERRO_INTERNO }),
    );
    expect(String(logError.mock.calls[0][0])).toContain('prisma.usuario.findUnique');
    expect(String(logError.mock.calls[0][0])).not.toContain('pessoa@exemplo.com');
  });
});
