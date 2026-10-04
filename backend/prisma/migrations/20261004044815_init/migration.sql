-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('USUARIO', 'ADMIN');

-- CreateEnum
CREATE TYPE "StatusConta" AS ENUM ('ATIVO', 'PENDENTE', 'BLOQUEADO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "nome_completo" VARCHAR(150) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "senha_hash" VARCHAR(255) NOT NULL,
    "tipo_usuario" "TipoUsuario" NOT NULL DEFAULT 'USUARIO',
    "status_conta" "StatusConta" NOT NULL DEFAULT 'ATIVO',
    "telefone" VARCHAR(20) NOT NULL,
    "foto_url" VARCHAR(500),
    "ultimo_login_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfis" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "resumo_profissional" TEXT,
    "nivel_escolaridade" VARCHAR(50),
    "link_linkedin" VARCHAR(255),
    "link_github" VARCHAR(255),
    "habilidades" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cidade" VARCHAR(100),
    "uf" CHAR(2),

    CONSTRAINT "perfis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiencias" (
    "id" UUID NOT NULL,
    "perfil_id" UUID NOT NULL,
    "cargo" VARCHAR(150) NOT NULL,
    "empresa" VARCHAR(150) NOT NULL,
    "descricao" TEXT,
    "data_inicio" DATE NOT NULL,
    "data_fim" DATE,
    "atual" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experiencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculos_gerados" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "conteudo" JSONB NOT NULL,
    "refinado_por_ia" BOOLEAN NOT NULL DEFAULT false,
    "gerado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculos_gerados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entrevistas_bot" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "cargo_alvo" VARCHAR(150) NOT NULL,
    "empresa_alvo" VARCHAR(150),
    "pontos_fortes" TEXT NOT NULL,
    "pontos_melhoria" TEXT NOT NULL,
    "dicas_comunicacao" TEXT NOT NULL,
    "data_realizacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entrevistas_bot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "familia" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "revogado_em" TIMESTAMP(3),
    "substituido_por" UUID,
    "user_agent" VARCHAR(255),
    "ip" VARCHAR(64),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens_recuperacao_senha" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "usado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_recuperacao_senha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consentimentos_lgpd" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "versao_termo" VARCHAR(20) NOT NULL,
    "aceito_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" VARCHAR(64),
    "user_agent" VARCHAR(255),

    CONSTRAINT "consentimentos_lgpd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs_auditoria" (
    "id" UUID NOT NULL,
    "usuario_id" UUID,
    "acao" VARCHAR(100) NOT NULL,
    "entidade" VARCHAR(60),
    "entidade_id" VARCHAR(64),
    "detalhes" JSONB,
    "ip" VARCHAR(64),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracoes_sistema" (
    "chave" VARCHAR(80) NOT NULL,
    "valor" JSONB NOT NULL,
    "descricao" VARCHAR(255),
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_sistema_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_telefone_key" ON "usuarios"("telefone");

-- CreateIndex
CREATE INDEX "usuarios_tipo_usuario_status_conta_idx" ON "usuarios"("tipo_usuario", "status_conta");

-- CreateIndex
CREATE UNIQUE INDEX "perfis_usuario_id_key" ON "perfis"("usuario_id");

-- CreateIndex
CREATE INDEX "experiencias_perfil_id_idx" ON "experiencias"("perfil_id");

-- CreateIndex
CREATE INDEX "curriculos_gerados_usuario_id_gerado_em_idx" ON "curriculos_gerados"("usuario_id", "gerado_em");

-- CreateIndex
CREATE INDEX "entrevistas_bot_usuario_id_data_realizacao_idx" ON "entrevistas_bot"("usuario_id", "data_realizacao");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_usuario_id_idx" ON "refresh_tokens"("usuario_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_familia_idx" ON "refresh_tokens"("familia");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_recuperacao_senha_token_hash_key" ON "tokens_recuperacao_senha"("token_hash");

-- CreateIndex
CREATE INDEX "consentimentos_lgpd_usuario_id_idx" ON "consentimentos_lgpd"("usuario_id");

-- CreateIndex
CREATE INDEX "logs_auditoria_criado_em_idx" ON "logs_auditoria"("criado_em");

-- AddForeignKey
ALTER TABLE "perfis" ADD CONSTRAINT "perfis_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiencias" ADD CONSTRAINT "experiencias_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculos_gerados" ADD CONSTRAINT "curriculos_gerados_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrevistas_bot" ADD CONSTRAINT "entrevistas_bot_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens_recuperacao_senha" ADD CONSTRAINT "tokens_recuperacao_senha_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consentimentos_lgpd" ADD CONSTRAINT "consentimentos_lgpd_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_auditoria" ADD CONSTRAINT "logs_auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
