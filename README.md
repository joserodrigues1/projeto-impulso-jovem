# Projeto Impulso Jovem

Plataforma de empregabilidade e capacitação voltada para jovens aprendizes e estagiários.

## Arquitetura
Este projeto consiste em um **monorepo lógico** (separado em duas pastas) com:

1. **Backend (NestJS)**
   - API RESTful protegida por autenticação JWT (Cookies `HttpOnly`)
   - Banco de Dados PostgreSQL (gerenciado via Prisma ORM)
   - Armazenamento de Arquivos Local / MinIO (compatível com S3)
   - Sistema de filas com Redis (para envio de emails via Mailpit)
   - Funcionalidades: Gestão de Vagas, Candidaturas, Trilhas de Aprendizado, LGPD, Perfis e Admin.

2. **Frontend (Next.js 14+)**
   - Estilização com Tailwind CSS v4 e Shadcn/ui
   - Consumo de API via Fetch nativo
   - Layouts segmentados (Painel do Jovem, Painel da Empresa e Painel do Administrador).
   - Design moderno, com suporte a Dark Mode.

## Como Rodar Localmente

### 1. Requisitos
- Node.js (v22+)
- Docker e Docker Compose

### 2. Subir a Infraestrutura (Postgres, Redis, MinIO, Mailpit)
```bash
docker-compose up -d
```
> **Nota:** Se houver conflito de portas no banco local, o `docker-compose` está configurado para expor o PostgreSQL na porta `5433`.

### 3. Configurar e rodar o Backend
```bash
cd backend
npm install

# Preencher o .env baseado no .env.example
cp .env.example .env

# Rodar as migrações e alimentar dados iniciais (Jovem, Empresa, Admin, Mentor)
npm run prisma:migrate
npm run db:seed

# Iniciar o servidor
npm run start:dev
```

### 4. Configurar e rodar o Frontend
```bash
cd frontend
npm install
npm run dev
```
A aplicação estará rodando na porta `3000`.

## Contas de Teste Iniciais (Seed)
- **Admin**: `admin@impulso.gov.br`
- **Mentor**: `mentor@impulso.gov.br`
- **Jovem**: `jovem@teste.com`
- **Empresa**: `empresa@teste.com`
> Senha para todas as contas: `123456`
