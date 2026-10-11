import { Prisma } from '@prisma/client';

/**
 * Descreve um erro para o log sem dados pessoais. Erros do Prisma trazem os argumentos da
 * consulta na mensagem (e-mail, IP, telefone...): deles fica só o código ou a primeira linha.
 */
export function descreverErro(erro: unknown, comStack = false): string {
  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    return `Prisma ${erro.code} (${String(erro.meta?.modelName ?? '?')})`;
  }
  if (
    erro instanceof Prisma.PrismaClientValidationError ||
    erro instanceof Prisma.PrismaClientUnknownRequestError ||
    erro instanceof Prisma.PrismaClientRustPanicError ||
    erro instanceof Prisma.PrismaClientInitializationError
  ) {
    return `${erro.name}: ${erro.message.split('\n').find((l) => l.trim()) ?? ''}`;
  }
  if (erro instanceof Error) {
    return comStack
      ? (erro.stack ?? `${erro.name}: ${erro.message}`)
      : `${erro.name}: ${erro.message}`;
  }
  return String(erro);
}
