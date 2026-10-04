-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('JOVEM', 'EMPRESA', 'MENTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "StatusConta" AS ENUM ('ATIVO', 'PENDENTE', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "StatusBusca" AS ENUM ('ATIVO', 'DISPONIVEL', 'EMPREGADO');

-- CreateEnum
CREATE TYPE "Modalidade" AS ENUM ('PRESENCIAL', 'REMOTO', 'HIBRIDO');

-- CreateEnum
CREATE TYPE "TipoContrato" AS ENUM ('ESTAGIO', 'APRENDIZ', 'CLT');

-- CreateEnum
CREATE TYPE "StatusVaga" AS ENUM ('ABERTA', 'FECHADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "StatusCandidatura" AS ENUM ('ENVIADO', 'EM_ANALISE', 'ENTREVISTA', 'ACEITO', 'RECUSADO');

-- CreateEnum
CREATE TYPE "NivelCurso" AS ENUM ('INICIANTE', 'INTERMEDIARIO', 'AVANCADO');

-- CreateEnum
CREATE TYPE "StatusCurso" AS ENUM ('RASCUNHO', 'PUBLICADO');

-- CreateEnum
CREATE TYPE "StatusMensagem" AS ENUM ('NOVA', 'LIDA', 'RESPONDIDA');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "nome_completo" VARCHAR(150) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "senha_hash" VARCHAR(255) NOT NULL,
    "tipo_usuario" "TipoUsuario" NOT NULL,
    "status_conta" "StatusConta" NOT NULL DEFAULT 'ATIVO',
    "data_nascimento" DATE,
    "cpf_criptografado" TEXT,
    "cpf_hash" VARCHAR(64),
    "telefone" VARCHAR(20),
    "foto_url" VARCHAR(500),
    "ultimo_login_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfis_jovens" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "resumo_profissional" TEXT,
    "nivel_escolaridade" VARCHAR(50),
    "link_linkedin" VARCHAR(255),
    "link_github" VARCHAR(255),
    "status_busca" "StatusBusca" NOT NULL DEFAULT 'DISPONIVEL',
    "curriculo_url" VARCHAR(500),
    "area_interesse" VARCHAR(100),
    "habilidades" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cidade" VARCHAR(100),
    "uf" CHAR(2),

    CONSTRAINT "perfis_jovens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiencias" (
    "id" UUID NOT NULL,
    "perfil_jovem_id" UUID NOT NULL,
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
CREATE TABLE "perfis_empresas" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "razao_social" VARCHAR(150) NOT NULL,
    "nome_fantasia" VARCHAR(150) NOT NULL,
    "cnpj" VARCHAR(14) NOT NULL,
    "setor" VARCHAR(100),
    "site" VARCHAR(255),
    "logo_url" VARCHAR(500),
    "descricao" TEXT,
    "cidade" VARCHAR(100),
    "uf" CHAR(2),
    "parceira_destaque" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "perfis_empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vagas" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "descricao" TEXT NOT NULL,
    "requisitos" TEXT,
    "beneficios" TEXT,
    "area" VARCHAR(100),
    "modalidade" "Modalidade" NOT NULL,
    "tipo_contrato" "TipoContrato" NOT NULL,
    "localizacao" VARCHAR(100),
    "faixa_salarial" VARCHAR(50),
    "status" "StatusVaga" NOT NULL DEFAULT 'ABERTA',
    "bloqueada_moderacao" BOOLEAN NOT NULL DEFAULT false,
    "motivo_moderacao" VARCHAR(255),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vagas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidaturas" (
    "id" UUID NOT NULL,
    "vaga_id" UUID NOT NULL,
    "jovem_id" UUID NOT NULL,
    "status_candidatura" "StatusCandidatura" NOT NULL DEFAULT 'ENVIADO',
    "mensagem" TEXT,
    "observacao_empresa" TEXT,
    "aplicado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidaturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cursos" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "descricao" TEXT,
    "carga_horaria" INTEGER,
    "nivel" "NivelCurso" NOT NULL,
    "status" "StatusCurso" NOT NULL DEFAULT 'RASCUNHO',
    "area" VARCHAR(100),
    "capa_url" VARCHAR(500),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modulos_curso" (
    "id" UUID NOT NULL,
    "curso_id" UUID NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "modulos_curso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aulas" (
    "id" UUID NOT NULL,
    "modulo_id" UUID NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "descricao" TEXT,
    "video_url" VARCHAR(500),
    "conteudo" TEXT,
    "duracao_minutos" INTEGER NOT NULL DEFAULT 0,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "aulas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matriculas" (
    "id" UUID NOT NULL,
    "curso_id" UUID NOT NULL,
    "jovem_id" UUID NOT NULL,
    "matriculado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluido_em" TIMESTAMP(3),

    CONSTRAINT "matriculas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progresso_aulas" (
    "id" UUID NOT NULL,
    "matricula_id" UUID NOT NULL,
    "aula_id" UUID NOT NULL,
    "concluida_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progresso_aulas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificados" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "jovem_id" UUID NOT NULL,
    "curso_id" UUID NOT NULL,
    "emitido_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificados_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "depoimentos" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "cargo" VARCHAR(150),
    "texto" TEXT NOT NULL,
    "foto_url" VARCHAR(500),
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "depoimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq" (
    "id" UUID NOT NULL,
    "pergunta" VARCHAR(255) NOT NULL,
    "resposta" TEXT NOT NULL,
    "categoria" VARCHAR(60),
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagens_contato" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "assunto" VARCHAR(150) NOT NULL,
    "mensagem" TEXT NOT NULL,
    "status" "StatusMensagem" NOT NULL DEFAULT 'NOVA',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensagens_contato_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "usuarios_cpf_hash_key" ON "usuarios"("cpf_hash");

-- CreateIndex
CREATE INDEX "usuarios_tipo_usuario_status_conta_idx" ON "usuarios"("tipo_usuario", "status_conta");

-- CreateIndex
CREATE UNIQUE INDEX "perfis_jovens_usuario_id_key" ON "perfis_jovens"("usuario_id");

-- CreateIndex
CREATE INDEX "experiencias_perfil_jovem_id_idx" ON "experiencias"("perfil_jovem_id");

-- CreateIndex
CREATE UNIQUE INDEX "perfis_empresas_usuario_id_key" ON "perfis_empresas"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "perfis_empresas_cnpj_key" ON "perfis_empresas"("cnpj");

-- CreateIndex
CREATE INDEX "vagas_status_bloqueada_moderacao_idx" ON "vagas"("status", "bloqueada_moderacao");

-- CreateIndex
CREATE INDEX "vagas_empresa_id_idx" ON "vagas"("empresa_id");

-- CreateIndex
CREATE INDEX "vagas_modalidade_idx" ON "vagas"("modalidade");

-- CreateIndex
CREATE INDEX "vagas_area_idx" ON "vagas"("area");

-- CreateIndex
CREATE INDEX "candidaturas_jovem_id_idx" ON "candidaturas"("jovem_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidaturas_vaga_id_jovem_id_key" ON "candidaturas"("vaga_id", "jovem_id");

-- CreateIndex
CREATE UNIQUE INDEX "cursos_slug_key" ON "cursos"("slug");

-- CreateIndex
CREATE INDEX "cursos_status_idx" ON "cursos"("status");

-- CreateIndex
CREATE INDEX "modulos_curso_curso_id_ordem_idx" ON "modulos_curso"("curso_id", "ordem");

-- CreateIndex
CREATE INDEX "aulas_modulo_id_ordem_idx" ON "aulas"("modulo_id", "ordem");

-- CreateIndex
CREATE INDEX "matriculas_jovem_id_idx" ON "matriculas"("jovem_id");

-- CreateIndex
CREATE UNIQUE INDEX "matriculas_curso_id_jovem_id_key" ON "matriculas"("curso_id", "jovem_id");

-- CreateIndex
CREATE UNIQUE INDEX "progresso_aulas_matricula_id_aula_id_key" ON "progresso_aulas"("matricula_id", "aula_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificados_codigo_key" ON "certificados"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "certificados_jovem_id_curso_id_key" ON "certificados"("jovem_id", "curso_id");

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
ALTER TABLE "perfis_jovens" ADD CONSTRAINT "perfis_jovens_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiencias" ADD CONSTRAINT "experiencias_perfil_jovem_id_fkey" FOREIGN KEY ("perfil_jovem_id") REFERENCES "perfis_jovens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfis_empresas" ADD CONSTRAINT "perfis_empresas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vagas" ADD CONSTRAINT "vagas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidaturas" ADD CONSTRAINT "candidaturas_vaga_id_fkey" FOREIGN KEY ("vaga_id") REFERENCES "vagas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidaturas" ADD CONSTRAINT "candidaturas_jovem_id_fkey" FOREIGN KEY ("jovem_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modulos_curso" ADD CONSTRAINT "modulos_curso_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aulas" ADD CONSTRAINT "aulas_modulo_id_fkey" FOREIGN KEY ("modulo_id") REFERENCES "modulos_curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_jovem_id_fkey" FOREIGN KEY ("jovem_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progresso_aulas" ADD CONSTRAINT "progresso_aulas_matricula_id_fkey" FOREIGN KEY ("matricula_id") REFERENCES "matriculas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progresso_aulas" ADD CONSTRAINT "progresso_aulas_aula_id_fkey" FOREIGN KEY ("aula_id") REFERENCES "aulas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificados" ADD CONSTRAINT "certificados_jovem_id_fkey" FOREIGN KEY ("jovem_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificados" ADD CONSTRAINT "certificados_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens_recuperacao_senha" ADD CONSTRAINT "tokens_recuperacao_senha_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consentimentos_lgpd" ADD CONSTRAINT "consentimentos_lgpd_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_auditoria" ADD CONSTRAINT "logs_auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
