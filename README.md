# Projeto Impulso Jovem

Guia e plataforma para jovens (primeiro emprego, jovem aprendiz, estágio) usarem a inteligência artificial a seu
favor no processo seletivo.

- **Guia aberto (landing)** — como a IA ajuda em cada etapa do processo seletivo, como montar um bom prompt,
  biblioteca de prompts prontos para copiar, como estudar com IA e como usá-la com responsabilidade;
- **currículo com IA** — digitando, gravando um áudio contando a própria história e/ou enviando um currículo antigo
  (PDF ou foto); a IA aproveita tudo, organiza no modelo visual do Impulso e o jovem baixa o PDF;
- **treino de entrevista no WhatsApp** — a "Helena", uma recrutadora simulada por IA, faz a entrevista (texto ou áudio);
- **relatório** ao final de cada simulação — nota, competências, pontos fortes e de melhoria numerados,
  plano de ação — num dashboard no painel.

Arquitetura, contratos entre as partes e regras de deploy: [docs/ARQUITETURA.md](docs/ARQUITETURA.md).
Sistema visual (cores, tipografia, movimento, roteiro da landing): [docs/DESIGN.md](docs/DESIGN.md).
Configuração dos fluxos de IA no n8n: [docs/INTEGRACAO-N8N.md](docs/INTEGRACAO-N8N.md).

## Estrutura

| Pasta | O que é |
|---|---|
| `backend/` | API NestJS 11 + Prisma (PostgreSQL) + Redis. Autenticação por cookies HttpOnly, LGPD, webhooks para o n8n |
| `frontend/` | Next.js 16 + Tailwind v4 + Motion. Fala com a API pelo proxy `/api-proxy/*` |
| `docs/` | Arquitetura, design e guia do n8n |
| `n8n-workflows/` | Fluxos do n8n (fora do git — importados manualmente no n8n) |

## Como rodar localmente

Requisitos: Node.js 22+ e Docker.

### 1. Infraestrutura (PostgreSQL, Redis e Mailpit)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis mailpit
```

O PostgreSQL fica na porta `5433`, o Redis em `127.0.0.1:6379` e os e-mails enviados aparecem em
http://localhost:8025. O `docker-compose.dev.yml` é só para desenvolvimento — o servidor não usa.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env          # ajuste os valores
npx prisma migrate deploy     # cria/atualiza as tabelas
npm run db:seed               # contas e dados de demonstração
npm run dev                   # http://localhost:3333/api/v1 (Swagger em /api/docs)
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:3000
```

### Contas de teste (seed)

| Conta | E-mail | Senha |
|---|---|---|
| Admin | `admin@impulso.gov.br` | `Senha123` |
| Jovem (com currículo e relatórios de exemplo) | `jovem@teste.com` | `Senha123` |

O seed recusa rodar com `NODE_ENV=production`.

### Testes e checagens

```bash
cd backend && npm test && npx tsc --noEmit -p tsconfig.json
cd frontend && npx tsc --noEmit && npm run lint
```

## Deploy

Cada push na `main` dispara o GitHub Actions no runner do servidor (`.github/workflows/deploy.yml`):
`git pull` → `docker compose --profile full up -d --build` → `npx prisma db push`.

- Mudanças no banco precisam ser **aditivas** (ver `docs/ARQUITETURA.md`, seção 2).
- O `backend/.env` do servidor não está no git. As variáveis novas são opcionais e liberam recursos quando
  definidas: `WHATSAPP_NUMERO_BOT`, `N8N_API_KEY`, `N8N_CURRICULO_WEBHOOK_URL`, `N8N_RELATORIO_WEBHOOK_URL`.
  Todas estão comentadas em `backend/.env.example`.
- Com HTTPS no servidor, defina `COOKIE_SECURE=true`. A gravação de áudio no navegador também exige HTTPS
  (sem ele, o usuário ainda pode enviar um arquivo de áudio gravado no celular).

### Segurança do servidor (conferir uma vez)

- **Segredos:** se o `backend/.env` foi criado com `cp .env.example .env`, troque `JWT_ACCESS_SECRET`,
  `DATA_ENCRYPTION_KEY`, `DATA_HASH_KEY` e `N8N_API_KEY` (ex.: `openssl rand -hex 48` / `openssl rand -hex 32`).
  Com os valores de exemplo a API sobe, mas registra um aviso "SEGREDOS DE EXEMPLO EM PRODUÇÃO" no log
  (`docker logs ij-api`). Trocar o `JWT_ACCESS_SECRET` só obriga os navegadores a renovar o access token; a
  `N8N_API_KEY` nova precisa ir também para a credencial "Impulso API (x-api-key)" do n8n. Hoje nenhum dado gravado
  depende das chaves `DATA_*`, então elas podem ser trocadas sem migração.
- **Banco:** o PostgreSQL fica publicado só em `127.0.0.1:5433`. A senha vem de `POSTGRES_PASSWORD` no `.env` da **raiz**
  (padrão `impulso`). Para trocar a senha de um banco que já existe, mudar o `.env` não basta: rode
  `docker exec -it ij-postgres psql -U impulso -d impulso_jovem -c "ALTER USER impulso PASSWORD 'nova-senha';"`, depois
  ajuste `POSTGRES_PASSWORD` no `.env` da raiz e rode `docker compose --profile full up -d`.

### E-mail no servidor (recuperação de senha)

"Esqueci minha senha", boas-vindas e o aviso de senha alterada dependem de um SMTP de verdade (sem ele, o site responde
normalmente e só aparece "Falha ao enviar e-mail" no log da API). No servidor:

1. Crie uma conta num provedor de e-mail transacional e verifique o domínio do remetente (registros SPF/DKIM no DNS).
   Para começar sem custo: **Resend** (100 e-mails por dia, 3.000 por mês; configura o DNS da Cloudflare sozinho).
2. Rode `bash scripts/configurar-email.sh` — ele pede o servidor SMTP (padrão da Resend), a chave (sem mostrar na tela)
   e o remetente, grava no `backend/.env`, reinicia a API e manda um e-mail de teste.

O `SMTP_HOST` vem do `backend/.env` (o compose não o sobrepõe mais). Porta 465 usa TLS direto; 587, STARTTLS.

## Observações

- O hash de senha usa argon2id via `hash-wasm` (WebAssembly), compatível com os hashes antigos do pacote nativo
  `argon2` — sem compilação nativa, funciona em qualquer máquina (inclusive Windows com Application Control).
- O frontend sobe em produção por `frontend/servidor-producao.js`, que repassa à API o IP real de quem acessa (rate
  limit e auditoria por pessoa, sem IP forjado). Com Nginx/Caddy na frente, defina `CONFIAR_PROXY_REVERSO=true` no
  serviço `web`.

## Sugestões para as próximas versões

Ideias em ordem aproximada de impacto × esforço. Todas são decisões de produto — nenhuma está implementada.

**Para o jovem**

1. **Simulação para uma vaga específica** — o jovem cola a descrição de uma vaga real; a Helena adapta as perguntas e
   o currículo ganha uma versão "sob medida" para aquela vaga.
2. **Trilha de preparação com progresso** — módulos curtos (apresentação pessoal, método STAR, perguntas difíceis,
   postura no online) com marcações de concluído e lembretes; o guia da landing vira trilha dentro do painel.
3. **Carta de apresentação e mensagem para recrutador** geradas a partir do currículo salvo.
4. **Helena por áudio** — a recrutadora também responde em áudio (síntese de voz), para treinar a escuta e o nervosismo.
5. **Exportar o currículo em .docx** e link de compartilhamento opcional (com expiração).
6. **App instalável (PWA)** e notificações de "seu relatório chegou".
7. **Acessibilidade ampliada** — VLibras, leitura em voz alta dos relatórios, modo de alto contraste.

**Para quem acompanha os jovens (escolas, ONGs, programas de aprendizagem)**

8. **Painel do educador** — turmas, evolução agregada das notas e engajamento, sempre com consentimento e sem expor
   conversas individuais (LGPD; validar com o jurídico).

**Produto e operação**

9. **Verificação do WhatsApp por código** antes de vincular o número (evita usar o número de outra pessoa).
10. **HTTPS com domínio próprio** (Caddy faz o certificado sozinho) — libera a gravação de áudio no navegador e os
    cookies seguros.
11. **Testes de ponta a ponta no CI** (ex.: Playwright) e **ambiente de homologação** antes do deploy na `main`; health
    check após o deploy com volta automática se falhar.
12. **Métricas de uso com privacidade** (ex.: Umami ou Plausible, sem cookies) para saber quais partes do guia ajudam mais.
13. **Páginas do guia indexáveis** (`/guia/curriculo`, `/guia/entrevista`…) para atrair jovens pela busca do Google.
14. **Fila por telefone no n8n** para mensagens enviadas em sequência, e deduplicação de eventos da Evolution.
