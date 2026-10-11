# Servidor — o que fazer depois do deploy

Guia para configurar o servidor (VPS) depois de um push na `main`. O deploy em si é automático
(`.github/workflows/deploy.yml`): o runner faz `git pull` em `~/projeto-impulso-jovem`, recria os containers com
`docker compose --profile full up -d --build` e atualiza o banco com `prisma db push`.

O que você faz à mão é só **configurar o `.env` uma vez** (e quando quiser mudar algo) e **importar os fluxos no n8n**.

---

## 1. Banco e Redis: próprios do site ou compartilhados?

**Recomendação: manter os do próprio site** — que é como o `docker-compose.yml` já funciona. Ele cria os containers
`ij-postgres` e `ij-redis`, separados de qualquer outro Postgres/Redis do servidor (como os do n8n ou da Evolution).

| | Próprios do site (atual) | Compartilhar com o n8n/Evolution |
|---|---|---|
| Dados de jovens (LGPD) | Isolados: o n8n não enxerga as tabelas | Ficam no mesmo servidor de banco de outros sistemas |
| Deploy automático | Já funciona assim, sem mudar nada | Exige mudar o compose, as URLs e a rede |
| Falha ou manutenção | Um não derruba o outro | Reiniciar o banco para um derruba todos |
| Backup e atualização | Independentes | Amarrados |
| Custo | ~150 MB de memória a mais | — |

**O n8n não precisa acessar o banco.** Por desenho, ele conversa só com a **API** (`/api/v1/webhooks/whatsapp/*`, com a
chave `x-api-key`). A API confere quem pode ver o quê, valida tudo e registra auditoria — o n8n nunca lê nem grava
direto nas tabelas. Compartilhar o banco não traria vantagem e aumentaria o risco.

Portas: o Postgres do site só aceita conexão **de dentro do servidor** (`127.0.0.1:5433`) e o Redis nem é publicado.
Não há conflito com outro Postgres/Redis que use as portas padrão (5432/6379). Para abrir o banco do site no seu
computador (DBeaver, pgAdmin), use um túnel SSH: `ssh -L 5433:127.0.0.1:5433 usuario@IP-DO-SERVIDOR`.

---

## 2. Passo a passo no servidor (SSH)

### 2.1 Entrar no servidor

No PowerShell do Windows (ou no terminal que você já usa):

```bash
ssh usuario@IP-DO-SERVIDOR
```

### 2.2 Conferir que o deploy terminou

No GitHub: aba **Actions** do repositório → o último "Deploy to VPS" deve estar com ✓ verde. No servidor:

```bash
cd ~/projeto-impulso-jovem
git log -1 --oneline
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

`git log` deve mostrar o commit novo; `docker ps` deve listar `ij-web`, `ij-api`, `ij-postgres` e `ij-redis` como
"Up". Também aparecem os containers do n8n e da Evolution, se estiverem no mesmo servidor.

### 2.3 Ver o `.env` atual sem mostrar segredos

```bash
sed -E 's/=(.{0,3}).*/=\1…/' backend/.env
```

Mostra só o nome de cada variável e os 3 primeiros caracteres do valor. **Pode mandar print desse comando.** Nunca
mande print de `cat backend/.env` (ele mostra as chaves inteiras).

### 2.4 Rodar o script de configuração

```bash
bash scripts/configurar-servidor.sh
```

Ele pergunta duas coisas:

1. **Endereço do site** — o que as pessoas abrem no navegador (ex.: `https://impulsojovem.com.br` ou
   `http://IP-DO-SERVIDOR:3000`). Com `https://`, ele liga o cookie seguro; com `http://`, deixa desligado (senão
   ninguém conseguiria entrar).
2. **Endereço do n8n** (ex.: `https://n8n.jose-de-ia.online`) — ou Enter para deixar para depois.

E então, sozinho:

- guarda uma cópia do `.env` atual (`backend/.env.antes-AAAAMMDD-HHMMSS`);
- coloca `NODE_ENV=production`, o endereço do site, o número da Helena (`558899713766`) e as URLs dos webhooks;
- **gera no próprio servidor** chaves novas para `JWT_ACCESS_SECRET`, `DATA_HASH_KEY`, `DATA_ENCRYPTION_KEY` e
  `N8N_API_KEY` **só se estiverem vazias, curtas ou com o valor de exemplo** do repositório (que é público). Chaves
  próprias são mantidas. Hoje nenhuma delas protege dado guardado, então a troca não apaga nada nem desloga ninguém;
- reinicia a API e mostra as últimas linhas do log (pode mandar print).

Pode rodar de novo quando quiser (por exemplo, para informar o n8n depois).

### 2.5 Copiar a chave do n8n

```bash
grep '^N8N_API_KEY=' backend/.env
```

Copie o valor (tudo depois do `=`) e cole no n8n, na credencial **Impulso API (x-api-key)** (campo *Value*). **Não
mande print desse comando.**

### 2.6 Se precisar desfazer

```bash
ls backend/.env.antes-*                         # lista as cópias
cp backend/.env.antes-AAAAMMDD-HHMMSS backend/.env
docker compose --profile full up -d --force-recreate api
```

---

## 3. O `.env` completo, para referência

O script já deixa o `backend/.env` assim. As linhas marcadas com `(gerada)` recebem valores aleatórios no servidor;
as demais podem ficar como estão. `DATABASE_URL`, `REDIS_URL`, `S3_ENDPOINT` e `SMTP_HOST` são sobrepostas pelo
`docker-compose.yml` (o valor do `.env` não é usado para elas).

```dotenv
NODE_ENV=production
PORT=3333
FRONTEND_URL=https://endereco-do-site          # o que as pessoas abrem no navegador
DATABASE_URL=postgresql://impulso:impulso@postgres:5432/impulso_jovem?schema=public   # (o compose sobrepõe)
REDIS_URL=redis://redis:6379                    # (o compose sobrepõe)

JWT_ACCESS_SECRET=(gerada)
JWT_ACCESS_TTL_MIN=15
JWT_REFRESH_TTL_DAYS=7
COOKIE_SECURE=true                              # true com https://, false com http://

DATA_ENCRYPTION_KEY=(gerada: 64 caracteres hexadecimais)
DATA_HASH_KEY=(gerada)

S3_ENDPOINT=http://minio:9000                   # (o compose sobrepõe)
S3_PUBLIC_URL=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=impulso-jovem
S3_ACCESS_KEY=impulso
S3_SECRET_KEY=impulso-secret
S3_FORCE_PATH_STYLE=true

SMTP_HOST=localhost                             # (o compose sobrepõe com "mailpit")
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
MAIL_FROM="Impulso Jovem <nao-responda@impulsojovem.com.br>"

LGPD_TERMO_VERSAO=2026.1

N8N_API_KEY=(gerada: a mesma da credencial "Impulso API (x-api-key)" do n8n)
N8N_CURRICULO_WEBHOOK_URL=https://endereco-do-n8n/webhook/curriculo
N8N_RELATORIO_WEBHOOK_URL=https://endereco-do-n8n/webhook/relatorio-entrevista
N8N_TIMEOUT_MS=30000
N8N_CURRICULO_TIMEOUT_MS=120000

WHATSAPP_NUMERO_BOT=558899713766
SESSAO_INATIVIDADE_MIN=120
SESSAO_MIN_MENSAGENS_CANDIDATO=3
```

**Pendências conhecidas (não impedem o site de funcionar):**

- **E-mail** (recuperação de senha): o compose aponta o envio para um `mailpit` que está desligado, então os e-mails
  não saem. Para ativar, é preciso um SMTP real (ex.: o do Google Workspace, Brevo, Amazon SES) e tirar a linha
  `SMTP_HOST: mailpit` do `docker-compose.yml`, para valer o `SMTP_HOST` do `.env`.
- **Foto de perfil**: o armazenamento (MinIO/S3) também está desligado no compose; o envio de foto falha até
  configurar um bucket.

---

## 4. n8n e Evolution

Siga [`INTEGRACAO-N8N.md`](./INTEGRACAO-N8N.md) a partir do **passo 2** (credenciais), lembrando:

- a chave da credencial **Impulso API (x-api-key)** é a `N8N_API_KEY` do passo 2.5;
- no ⚙️ Configuração dos fluxos, o `API_URL` depende de onde o n8n roda:
  - **n8n em Docker neste mesmo servidor:** conecte-o à rede do site e use o nome do container:

    ```bash
    docker network connect impulso-jovem_default NOME-DO-CONTAINER-DO-N8N
    ```

    `API_URL` = `http://ij-api:3333/api/v1` (repita o `network connect` se o container do n8n for recriado);
  - **n8n em outro servidor:** a URL pública da API, ex.: `http://IP-DO-SERVIDOR:3333/api/v1`;
- desative os fluxos antigos antes de ativar os novos (mesmos caminhos de webhook);
- na Evolution, o webhook da instância aponta para `https://SEU-N8N/webhook/whatsapp-rh?token=SEU_TOKEN`.
