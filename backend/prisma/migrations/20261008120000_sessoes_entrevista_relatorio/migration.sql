-- CreateEnum
CREATE TYPE "StatusSessaoEntrevista" AS ENUM ('EM_ANDAMENTO', 'FINALIZADA', 'ANALISADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "AutorMensagem" AS ENUM ('CANDIDATO', 'RECRUTADORA');

-- CreateEnum
CREATE TYPE "TipoMensagem" AS ENUM ('TEXTO', 'AUDIO');

-- AlterTable
ALTER TABLE "curriculos_gerados" ADD COLUMN     "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "titulo" VARCHAR(120);

-- AlterTable
ALTER TABLE "entrevistas_bot" ADD COLUMN     "nota_geral" DOUBLE PRECISION,
ADD COLUMN     "relatorio" JSONB,
ADD COLUMN     "sessao_id" UUID;

-- CreateTable
CREATE TABLE "sessoes_entrevista" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "status" "StatusSessaoEntrevista" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "cargo_alvo" VARCHAR(150),
    "empresa_alvo" VARCHAR(150),
    "motivo_finalizacao" VARCHAR(30),
    "iniciada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultima_mensagem_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizada_em" TIMESTAMP(3),

    CONSTRAINT "sessoes_entrevista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagens_entrevista" (
    "id" UUID NOT NULL,
    "sessao_id" UUID NOT NULL,
    "autor" "AutorMensagem" NOT NULL,
    "tipo" "TipoMensagem" NOT NULL DEFAULT 'TEXTO',
    "conteudo" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensagens_entrevista_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sessoes_entrevista_usuario_id_status_idx" ON "sessoes_entrevista"("usuario_id", "status");

-- CreateIndex
CREATE INDEX "sessoes_entrevista_status_ultima_mensagem_em_idx" ON "sessoes_entrevista"("status", "ultima_mensagem_em");

-- CreateIndex
CREATE INDEX "mensagens_entrevista_sessao_id_criado_em_idx" ON "mensagens_entrevista"("sessao_id", "criado_em");

-- CreateIndex
CREATE INDEX "entrevistas_bot_sessao_id_idx" ON "entrevistas_bot"("sessao_id");

-- AddForeignKey
ALTER TABLE "entrevistas_bot" ADD CONSTRAINT "entrevistas_bot_sessao_id_fkey" FOREIGN KEY ("sessao_id") REFERENCES "sessoes_entrevista"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes_entrevista" ADD CONSTRAINT "sessoes_entrevista_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_entrevista" ADD CONSTRAINT "mensagens_entrevista_sessao_id_fkey" FOREIGN KEY ("sessao_id") REFERENCES "sessoes_entrevista"("id") ON DELETE CASCADE ON UPDATE CASCADE;

