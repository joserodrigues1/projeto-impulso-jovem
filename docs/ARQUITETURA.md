# Arquitetura e contratos — Impulso Jovem

Documento de referência para quem mexe no backend (NestJS), no frontend (Next.js) e nos fluxos do n8n.
Tudo que cruza fronteira entre essas três partes está descrito aqui. Se mudar um contrato, atualize este arquivo.

## 1. Visão geral

```
Navegador ──► Next.js (porta 3000) ──/api-proxy/*──► API NestJS (porta 3333, prefixo /api/v1) ──► PostgreSQL / Redis
                                                        ▲
WhatsApp ◄──► Evolution API ◄──► n8n ──x-api-key────────┘  (webhooks /api/v1/webhooks/whatsapp/*)
                                   └──► Google Gemini (conversa, transcrição de áudio, relatórios, currículo)
```

Três jornadas principais:

1. **Currículo com IA** — o usuário preenche o formulário (e/ou grava um áudio contando a história dele). A API envia
   para o n8n, que transcreve o áudio (Gemini), estrutura tudo em JSON (Gemini + Structured Output Parser) e devolve.
   A API valida/sanitiza e salva em `CurriculoGerado.conteudo`. O frontend renderiza o currículo no modelo visual e o
   usuário baixa o PDF pelo navegador (imprimir → salvar como PDF).
2. **Simulação de entrevista no WhatsApp** — a "Helena" (IA recrutadora) conduz a entrevista. Cada mensagem (do
   candidato e da IA) é registrada na API em uma `SessaoEntrevista`. Áudios do candidato são transcritos.
3. **Relatório da entrevista** — quando a sessão termina (IA encerra, usuário pede, ou inatividade), o fluxo de
   relatório lê a transcrição na API, gera um relatório estruturado (nota, competências, pontos fortes/melhoria
   numerados, plano de ação) e salva em `EntrevistaBot`. O usuário recebe o link no WhatsApp e vê o dashboard no painel.

## 2. Regras de deploy (não quebrar o servidor)

O deploy é automático: push na `main` → runner no servidor → `git pull` → `docker compose --profile full up -d --build`
→ `docker exec ij-api npx prisma db push`.

- **Schema só aditivo.** Novas tabelas, novas colunas *nullable* ou com `@default`. Nunca remover/renomear coluna,
  nunca adicionar `@unique` em coluna existente ou nova (o `db push` não interativo aborta pedindo `--accept-data-loss`).
  As migrações em `prisma/migrations` servem ao desenvolvimento local; o servidor usa `db push`.
- **Variáveis de ambiente novas são opcionais**, com padrão seguro. O `backend/.env` do servidor não está no git:
  sem a variável, a aplicação precisa subir e a funcionalidade correspondente fica desativada/oculta.
- **Dependências**: o Dockerfile usa `npm ci` — `package-lock.json` sempre atualizado junto com `package.json`.
- **Sem binários nativos novos.** O hash de senha usa `hash-wasm` (argon2id em WebAssembly), compatível com os hashes
  `argon2` já gravados no banco.
- **`COOKIE_SECURE`** continua valendo `false` se não definida (o servidor pode estar sem HTTPS). Com HTTPS, defina `true`.
- **Segredos de exemplo.** Com `NODE_ENV=production`, se `JWT_ACCESS_SECRET`, `DATA_ENCRYPTION_KEY`, `DATA_HASH_KEY` ou
  `N8N_API_KEY` estiverem com o valor do `.env.example` (atual ou antigo), a API **sobe mesmo assim** (para não derrubar
  o site num deploy) e registra um aviso bem visível no log, só com os nomes das variáveis. Troque-os no servidor.
- **`docker-compose.yml` (usado pelo servidor):** o PostgreSQL é publicado só em `127.0.0.1:5433` (a API usa
  `postgres:5432` na rede do Docker; porta publicada em todas as interfaces passa por cima do UFW). `api` e `web` têm
  `restart: unless-stopped` (voltam sozinhos depois de reiniciar o servidor). A porta `3333` da API continua publicada
  (o n8n pode chamá-la de fora).
- **E-mail em produção:** o serviço `api` do compose força `SMTP_HOST: mailpit` (e `S3_ENDPOINT: http://minio:9000`) no
  bloco `environment:`, que tem prioridade sobre o `backend/.env`. O Mailpit não existe no perfil `full`, então a
  recuperação de senha, as boas-vindas e o aviso de senha alterada **não saem** até um SMTP real ser configurado — veja
  "E-mail no servidor" no README. O envio falha só no log (aviso), sem erro para o usuário.

## 3. Banco de dados (resumo)

| Modelo | Uso |
|---|---|
| `Usuario`, `Perfil`, `Experiencia` | Conta e perfil |
| `CurriculoGerado` | Versões de currículo (`conteudo` = ConteudoCurriculo v2), `titulo`, `atualizadoEm` |
| `SessaoEntrevista` | Uma simulação no WhatsApp. Status: `EM_ANDAMENTO → FINALIZADA → ANALISADA` (ou `CANCELADA`). `motivoFinalizacao`: `CONCLUIDA`, `SOLICITADA_USUARIO`, `INATIVIDADE` ou `SEM_RELATORIO` (FINALIZADA há mais de 48 h sem relatório → CANCELADA) |
| `MensagemEntrevista` | Mensagens da simulação (`autor`: CANDIDATO/RECRUTADORA, `tipo`: TEXTO/AUDIO) |
| `EntrevistaBot` | Relatório final. Campos texto legados + `notaGeral` (0–10) + `relatorio` (JSON v1) + `sessaoId` |
| `RefreshToken`, `TokenRecuperacaoSenha`, `ConsentimentoLgpd`, `LogAuditoria` | Segurança e LGPD |

Uma sessão gera no máximo um relatório — garantido no serviço (não por `@unique`, ver seção 2).

## 4. Tipos compartilhados

### 4.1 ConteudoCurriculo v2 (`CurriculoGerado.conteudo`)

Espelha o modelo visual do currículo (coluna lateral: habilidades, idiomas, premiações; coluna principal: perfil,
experiência, formação).

```ts
interface ConteudoCurriculo {
  versao: 2;
  // Identificação — sempre vem da conta do usuário, nunca da IA
  nomeCompleto: string;
  email: string;
  telefone: string;            // formatado para exibição: "(61) 99999-9999"
  cidade?: string;
  uf?: string;                 // 2 letras
  linkedin?: string;           // URL
  // Conteúdo
  cargoDesejado?: string;      // objetivo, ex.: "Jovem Aprendiz Administrativo" (até 120)
  perfilProfissional: string;  // 3–5 linhas (até 1200)
  experiencias: Array<{
    empresa: string;           // até 150
    cargo: string;             // até 150
    periodo: string;           // texto de exibição: "jun/2023 – dez/2023", "dez/2024 – atual" (até 60)
    inicio?: string;           // AAAA-MM (opcional, para ordenação/edição)
    fim?: string;              // AAAA-MM; ausente + atual=true → emprego atual
    atual?: boolean;
    atividades: string[];      // bullets, até 8 itens de até 300 caracteres
  }>;                          // até 15
  formacao: Array<{
    instituicao: string;       // até 150
    curso: string;             // até 150
    periodo: string;           // "2021 – 2023" (até 60)
    situacao?: 'CONCLUIDO' | 'CURSANDO' | 'TRANCADO';
  }>;                          // até 10
  habilidades: string[];       // até 30, cada uma até 60
  idiomas: Array<{ idioma: string; nivel: string }>;   // até 10; nivel: "Nativo", "Básico", "Intermediário", "Avançado", "Fluente"
  premiacoes: string[];        // prêmios, certificados, cursos livres — até 15, cada um até 200
}
```

Registros antigos (`versao: 1`, com `resumoProfissional`, `nivelEscolaridade`, `experiencias[].descricao`,
`dataInicio`/`dataFim`) são convertidos para v2 na leitura (`normalizarConteudo`).

### 4.2 RelatorioEntrevista v1 (`EntrevistaBot.relatorio`)

```ts
interface RelatorioEntrevista {
  versao: 1;
  notaGeral: number;                 // 0–10, uma casa decimal
  classificacao: 'INICIANTE' | 'EM_DESENVOLVIMENTO' | 'PREPARADO' | 'DESTAQUE';
  resumo: string;                    // 2–4 frases, até 800
  recomendacao: string;              // 1 frase: seguiria para a próxima etapa? (até 300)
  competencias: Array<{              // 4–6 itens
    nome: string;                    // ex.: "Comunicação", "Clareza e objetividade", "Exemplos práticos (STAR)",
                                     //      "Autoconhecimento", "Postura profissional", "Interesse pela vaga"
    nota: number;                    // 0–10
    comentario: string;              // até 400
  }>;
  pontosFortes: Array<{ titulo: string; descricao: string; evidencia?: string }>;          // 1–6
  pontosMelhoria: Array<{ titulo: string; descricao: string; evidencia?: string; comoMelhorar: string }>; // 1–6
  dicasComunicacao: string[];        // 1–6
  planoDeAcao: Array<{ passo: string; prazo?: string }>;   // 2–6, exibido numerado
  perguntasParaPraticar: string[];   // 0–6
  exemploResposta?: { pergunta: string; resposta: string }; // reescrita de uma resposta fraca do candidato
}
```

`evidencia` = trecho curto e literal do que o candidato escreveu. Limites: strings de lista até 600 caracteres.
A API normaliza (corta, limita, descarta o que não tem o tipo certo). A `classificacao` é derivada da nota quando
ausente/inválida: <4 INICIANTE, <6.5 EM_DESENVOLVIMENTO, <8.5 PREPARADO, ≥8.5 DESTAQUE.

Para registros antigos (`relatorio` nulo), a API monta um relatório parcial a partir dos campos de texto
(uma linha = um item) e devolve `relatorio.versao = 0` para o frontend saber que é legado.

## 5. API — rotas (prefixo `/api/v1`)

Autenticação de usuário: cookies HttpOnly `ij_access` (path `/`) e `ij_refresh` (path `COOKIE_REFRESH_PATH`,
padrão `/api-proxy/auth`). O frontend chama sempre via `/api-proxy/...` e, ao receber 401, tenta `POST /auth/refresh`
uma vez e repete a requisição.

Erros seguem `{ statusCode, mensagem: string | string[], caminho, timestamp }`.

**Rate limit** (Redis; fora do ar → libera sem contar, sem esperar o tempo máximo a cada requisição):
geral 100/min por **usuário logado** (visitante: por IP). Rotas com limite próprio:

| Rota | Limite | Chave |
|---|---|---|
| `POST /auth/cadastro` | 5/min | IP — **sempre**, mesmo com um access token válido (senão cada conta nova daria um balde novo) |
| `POST /auth/login` | 10/min | IP (sempre) |
| `POST /auth/recuperar-senha` | 3/min | IP (sempre) |
| `POST /auth/redefinir-senha` | 5/min | IP (sempre) |
| `POST /auth/refresh` | 30/min | a sessão (hash do refresh token); sem cookie, IP — quem divide a rede (escola, proxy) não derruba os outros |
| `POST /curriculos/gerar` | 5/min | usuário |
| `/uploads/*` | 10/min | usuário |
| `/webhooks/whatsapp/*` | sem limite com a `x-api-key` válida | — |

O IP é o `req.ip` do Express (respeita `TRUST_PROXY`, seção 7). IPv6 é agrupado por sub-rede /64.

### 5.1 Pública

| Método | Rota | Descrição |
|---|---|---|
| GET | `/config/publica` | `{ whatsappNumero: string \| null, whatsappLink: string \| null, curriculoIaDisponivel: boolean }` |
| GET | `/saude` | `{ status: 'ok', banco: boolean, redis: boolean }` |

`whatsappLink` = `https://wa.me/<numero>?text=<"Olá! Quero treinar para uma entrevista." codificado>`.

### 5.2 Auth (`/auth`)

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| POST | `/auth/cadastro` | `{ nomeCompleto, email, senha, telefone, aceiteTermos: true }` | `UsuarioSessao` + cookies |
| POST | `/auth/login` | `{ email, senha }` | `UsuarioSessao` + cookies. 429 com o bloqueio de login (abaixo) |
| POST | `/auth/refresh` | — (cookie) | `UsuarioSessao` + cookies novos |
| POST | `/auth/logout` | — | 204 |
| POST | `/auth/recuperar-senha` | `{ email }` | 202 `{ mensagem }` |
| POST | `/auth/redefinir-senha` | `{ token, novaSenha }` | 200 `{ mensagem }` |

`UsuarioSessao = { id, nomeCompleto, email, tipoUsuario: 'USUARIO' | 'ADMIN', statusConta, fotoUrl }`.
Senha: 8–72 caracteres, com letras e números.

**Bloqueio de login** (Redis, janelas de `LOGIN_BLOQUEIO_MIN`, chaves com hash do e-mail e do IP):
- `LOGIN_MAX_TENTATIVAS` senhas erradas para um e-mail **vindas do mesmo IP** → aquele IP fica bloqueado para aquele
  e-mail (429), inclusive com a senha certa (senão o bloqueio revelaria a senha). O dono entra normalmente de outro IP.
- **Teto por e-mail** = 3 × `LOGIN_MAX_TENTATIVAS` falhas de qualquer IP (ataque distribuído) → o e-mail fica bloqueado
  para todos, inclusive com a senha certa, até a janela expirar ou a senha ser redefinida.
- Login certo zera só o contador do par e-mail + IP; redefinir a senha zera o teto do e-mail e o IP de quem redefiniu.
- O login certo regrava hashes legados (argon2 nativo, m=65536) com os parâmetros atuais.

**Refresh token**: opaco, rotacionado a cada uso (família = uma sessão). Reusar um token já rotacionado revoga a família
inteira (`REFRESH_TOKEN_REUSO_DETECTADO` na auditoria). Exceção: até 15 s depois da rotação (abas simultâneas), o token
antigo ainda renova — **só se a família continuar viva** (algum token não revogado e não vencido). Logout, troca e
redefinição de senha revogam a família/todas as famílias; depois disso, nem um token de duas rotações atrás reabre a
sessão.

### 5.3 Conta (`/me`)

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| GET | `/me` | — | `UsuarioSessao & { telefone, telefoneFormatado, criadoEm, perfil }` |
| PATCH | `/me` | `{ nomeCompleto?, telefone? }` | igual ao `GET /me`. Campo ausente não muda; `null` → 400. 409 se o WhatsApp já for de outra conta |
| PATCH | `/me/senha` | `{ senhaAtual, novaSenha }` | 200 `{ mensagem }` — revoga as outras sessões e emite cookies novos |
| GET | `/me/exportar-dados` | — | JSON com todos os dados pessoais (sem hash de senha/tokens) |
| POST | `/me/excluir-conta` | `{ senha }` | 204 — apaga a conta e tudo em cascata, limpa cookies |

`exportar-dados` traz conta, perfil, consentimentos (com IP e navegador), currículos, relatórios, sessões do WhatsApp com
as mensagens, **sessões de login** (`refreshTokens`: `criadoEm`, `expiraEm`, `revogadoEm`, `ip`, `userAgent` — sem
token, família ou ids) e os **500 registros de auditoria mais recentes** (`acao`, `ip`, `criadoEm`).

O WhatsApp informado no cadastro/`PATCH /me` **não tem verificação de posse** (pendência de produto, ver seção 8).

### 5.4 Currículos (`/curriculos`)

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| POST | `/curriculos/gerar` | `multipart/form-data`: campo `dados` (JSON de `GerarCurriculoDto`) + arquivos opcionais `audio` e `curriculoAntigo` | `CurriculoDetalhe & { transcricao?: string, avisos: string[] }` |
| GET | `/curriculos` | `?pagina&limite` | `Paginado<CurriculoResumo>` |
| GET | `/curriculos/:id` | — | `CurriculoDetalhe` |
| PUT | `/curriculos/:id` | `AtualizarCurriculoDto` (JSON) | `CurriculoDetalhe` — edição manual, sem IA |
| DELETE | `/curriculos/:id` | — | 204 |

```ts
// GerarCurriculoDto (campo `dados`) e AtualizarCurriculoDto: os campos de conteúdo do ConteudoCurriculo v2,
// sem nomeCompleto/email/telefone (vêm da conta) e todos opcionais exceto as listas (podem ser vazias).
interface GerarCurriculoDto {
  titulo?: string;
  cargoDesejado?: string;
  cidade?: string; uf?: string; linkedin?: string;
  perfilProfissional?: string;          // texto livre e informal — a IA reescreve
  experiencias: Array<{ empresa; cargo; inicio?: 'AAAA-MM'; fim?: 'AAAA-MM'; atual?: boolean; periodo?: string;
                        atividades?: string[]; descricao?: string }>;
  formacao: Array<{ instituicao; curso; periodo?: string; inicio?: 'AAAA'; fim?: 'AAAA'; situacao? }>;
  habilidades: string[];
  idiomas: Array<{ idioma; nivel }>;
  premiacoes: string[];
  usarIa?: boolean;                     // padrão true
}
type CurriculoResumo = { id, titulo, cargoDesejado, refinadoPorIa, geradoEm, atualizadoEm };
type CurriculoDetalhe = CurriculoResumo & { conteudo: ConteudoCurriculo };
```

Áudio: até 8 MB; tipos `audio/webm`, `audio/ogg`, `audio/mpeg`, `audio/mp4`, `audio/m4a`, `audio/x-m4a`, `audio/aac`,
`audio/wav`, `audio/x-wav` (parâmetros como `;codecs=opus` são ignorados). Exige `N8N_CURRICULO_WEBHOOK_URL`.

Currículo antigo (`curriculoAntigo`): o currículo que o jovem já tinha, para a IA aproveitar o conteúdo. PDF, JPG ou PNG,
até 5 MB; o tipo é conferido **pelo conteúdo** do arquivo (assinatura `%PDF-`, JPEG ou PNG), não pela extensão — um
`.docx` renomeado é recusado com 400. O arquivo vai só para o n8n e **não é guardado** (nem no banco, nem no storage).

Comportamento de `gerar`:
- Formulário totalmente vazio e sem arquivos → 400. Só arquivos com `usarIa: false` → 400.
- n8n configurado e `usarIa !== false` → envia para o n8n (seção 6.1). Sucesso → `refinadoPorIa: true`.
- n8n ausente/falhou → salva o currículo montado só com o formulário (`refinadoPorIa: false`) e devolve um aviso em
  `avisos`. Se o usuário mandou **só arquivos** (áudio e/ou currículo antigo, sem texto), responde 503 explicando que
  eles não puderam ser processados.
- Rate limit: 5 por minuto por usuário.
- Auditoria (`CURRICULO_GERADO`): `{ refinadoPorIa, usouIa, comAudio, comCurriculoAntigo }` — nunca o conteúdo.

Mescla da resposta da IA com o formulário (a resposta não é confiável):
- A identificação (nome, e-mail, telefone, cidade, UF, LinkedIn) nunca vem da IA.
- Cada item da IA é casado com o do formulário por: mesmo nome → um nome contém o outro → nome quase igual (erro de
  digitação corrigido, com os mesmos números) → mesma posição (só com listas do mesmo tamanho; a API compara na ordem do
  formulário, a mesma enviada ao n8n). Datas/período do usuário prevalecem; na formação, também a situação, e campo
  vazio da IA não apaga o que o usuário digitou.
- **Nada do que o usuário digitou some:** experiência, formação, habilidade, idioma ou premiação que a IA deixou de fora é
  mantida (com vaga garantida dentro do limite da lista). Para experiência/formação mantidas, vai um aviso em `avisos`.
- Formação da IA vale com o curso **ou** a instituição (ex.: "Ensino Médio" sem o nome da escola).
- Textos acima do limite são cortados, não recusados.

`GET /curriculos/:id`: a identificação (`nomeCompleto`, `email`, `telefone`) é sempre a **atual da conta** — inclusive
em registros v1, que não a guardavam.

### 5.5 Entrevistas do usuário (`/entrevistas`)

| Método | Rota | Resposta |
|---|---|---|
| GET | `/entrevistas` | `Paginado<{ id, cargoAlvo, empresaAlvo, notaGeral, classificacao, resumo, dataRealizacao }>` |
| GET | `/entrevistas/resumo` | `{ total, mediaNota, ultimaNota, evolucao: Array<{ id, data, nota }>, sessaoAtiva: { id, iniciadaEm, ultimaMensagemEm, totalMensagens } \| null, sessaoAguardandoRelatorio: boolean }` |
| GET | `/entrevistas/:id` | `{ id, cargoAlvo, empresaAlvo, notaGeral, dataRealizacao, pontosFortes, pontosMelhoria, dicasComunicacao, relatorio: RelatorioEntrevista \| (legado versao 0) }` |
| POST | `/entrevistas/sessao-ativa/finalizar` | 200 `{ sessaoId, status }` — encerra a simulação em andamento (404 se não houver) e dispara o relatório |

`evolucao`: últimas 10 entrevistas com nota, da mais antiga para a mais recente.

`GET /entrevistas/resumo`, antes de responder, encerra as sessões inativas **do próprio usuário** (disparando o
relatório) e cancela as dele que estão `FINALIZADA` há mais de 48 h sem relatório (`SEM_RELATORIO`) — assim
`sessaoAguardandoRelatorio` não fica `true` para sempre.

### 5.6 Webhooks do n8n (`/webhooks/whatsapp`) — header `x-api-key: N8N_API_KEY`

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| GET | `/webhooks/whatsapp/usuario/:telefone` | — | ver abaixo |
| POST | `/webhooks/whatsapp/mensagens` | `{ telefone, sessaoId?, autor: 'CANDIDATO'\|'RECRUTADORA', conteudo, tipo?: 'TEXTO'\|'AUDIO', cargoAlvo?, empresaAlvo? }` | `{ sessaoId, novaSessao, totalMensagens, mensagensCandidato }` |
| GET | `/webhooks/whatsapp/sessoes/pendentes` | `?limite=10` | `{ sessoes: Array<{ sessaoId, telefone, primeiroNome }> }` |
| GET | `/webhooks/whatsapp/sessoes/:id/transcricao` | — | ver abaixo |
| POST | `/webhooks/whatsapp/sessoes/:id/finalizar` | `{ motivo?: 'CONCLUIDA'\|'SOLICITADA_USUARIO'\|'INATIVIDADE'\|'CUIDADO' }` | `{ sessaoId, status, cuidado }` |
| POST | `/webhooks/whatsapp/entrevista` | ver abaixo | `{ id, dataRealizacao, linkRelatorio, telefone, primeiroNome, cargoAlvo, jaExistia, resultado? }` |

`GET usuario/:telefone` (sempre 200):

```jsonc
{ "encontrado": false, "motivo": "TELEFONE_INVALIDO" | "NAO_CADASTRADO" | "CONTA_BLOQUEADA", "linkCadastro": "https://.../registro" }
{ "encontrado": true,
  "usuario": { "id", "primeiroNome", "nomeCompleto",
               "perfil": { ... },                 // resumo/escolaridade/habilidades/cidade/uf/experiências
               "curriculo": { cargoDesejado, perfilProfissional, experiencias[{cargo, empresa, periodo}], formacao[{curso, instituicao, periodo}], habilidades[], idiomas[] } | null,
               "ultimasEntrevistas": [{ cargoAlvo, empresaAlvo, notaGeral, pontosMelhoria, dataRealizacao }] },
  "sessaoAtiva": { "id", "iniciadaEm", "ultimaMensagemEm", "totalMensagens", "cargoAlvo" } | null,
  "linkPainel": "https://.../dashboard" }
```

`POST mensagens`: registra a mensagem na sessão `EM_ANDAMENTO` do usuário.
- **Mensagem do candidato** sem sessão em andamento (ou com a ativa parada há mais de `SESSAO_INATIVIDADE_MIN` — a antiga
  é encerrada com motivo `INATIVIDADE`) → cria uma sessão nova (`novaSessao: true`).
- **Resposta da IA (`RECRUTADORA`) nunca abre sessão:** sem sessão em andamento e ativa → **409** e nada é gravado (ex.:
  o jovem encerrou enquanto a Helena pensava). O n8n não deve enviar essa resposta ao WhatsApp.
- `sessaoId` (opcional, recomendado na resposta da IA): grava só naquela sessão; 404 se não existir, 400 se for de outro
  usuário, 409 se já tiver sido encerrada ou estiver inativa.
- 404 se o telefone não tiver cadastro; **403 se a conta estiver bloqueada**.
- Cortes em vez de recusa (para o n8n não perder a mensagem por um detalhe): `conteudo` cortado em 8000 caracteres;
  `cargoAlvo`/`empresaAlvo` cortados em 150 (cargo com menos de 2 caracteres é ignorado); `""`/`null` = ausente.
- `cargoAlvo`/`empresaAlvo` atualizam a sessão quando enviados.

`GET sessoes/pendentes`: antes de responder, encerra (motivo `INATIVIDADE`) as sessões `EM_ANDAMENTO` paradas há mais
de `SESSAO_INATIVIDADE_MIN`; sessões encerradas com menos de `SESSAO_MIN_MENSAGENS_CANDIDATO` respostas do candidato
viram `CANCELADA`. Também cancela (motivo `SEM_RELATORIO`) as `FINALIZADA` há mais de **48 h** sem relatório — o n8n
não conseguiu avaliá-las (conteúdo bloqueado pela IA, relatório inválido, mínimo de respostas diferente) e elas
voltariam para sempre na frente da fila. Devolve as `FINALIZADA` (ainda sem relatório), mais antigas primeiro.

**Tentativas do relatório (fila).** Cada vez que uma sessão é devolvida por `sessoes/pendentes`, a API anota uma
tentativa no Redis (`ij:relatorio:tentativas:<id>`, 3 dias). Se ela voltar pendente, só é devolvida de novo depois de
10 min, 20, 40... até 6 h; na 8ª falha é cancelada (`SEM_RELATORIO`). Assim uma sessão problemática não gasta IA a cada
ciclo nem ocupa a vez das novas. Sem Redis, todas são devolvidas (e o prazo de 48 h continua valendo).

**Cuidado.** Se alguma mensagem da Helena na sessão citar o **CVV** (a mensagem de acolhimento de um relato de
sofrimento ou risco sempre cita), a sessão é encerrada como `CANCELADA`, qualquer que seja o motivo ou o número de
respostas: essa conversa nunca vira relatório com nota. O motivo `CUIDADO` tem o mesmo efeito. `finalizar` devolve
`cuidado: true` nesses casos (o n8n usa para escolher a mensagem ao jovem).

`GET sessoes/:id/transcricao`:

```jsonc
{ "sessaoId", "status", "cargoAlvo", "empresaAlvo", "iniciadaEm", "finalizadaEm",
  "candidato": { "primeiroNome", "nomeCompleto", "telefone" },
  "curriculo": { ... } | null,                         // mesmo resumo do contexto
  "historico": [{ "cargoAlvo", "notaGeral", "dataRealizacao", "principaisMelhorias": string[] }],
  "mensagens": [{ "autor": "CANDIDATO" | "RECRUTADORA", "tipo": "TEXTO" | "AUDIO", "conteudo", "criadoEm" }],
  // Prontos para os prompts do n8n (os fluxos não têm nós Code):
  "totalMensagens": 12,              // total da sessão (o n8n compara para saber se chegou mensagem nova)
  "respostasCandidato": 6, "perguntasHelena": 6,
  "minimoRespostas": 3,              // SESSAO_MIN_MENSAGENS_CANDIDATO
  "emCuidado": false,                // a Helena já acolheu um relato de sofrimento/risco (citou o CVV)
  "dialogo": "[01] Helena: Oi, Ana! ...\n[02] Candidato (áudio transcrito): ...",   // conversa inteira, numerada
  "dialogoRecente": "...",           // só as 30 últimas falas, com a numeração original (para a Helena)
  "contextoTexto": "Nome: Ana\nVaga que busca: ...\nTreinos anteriores: ..." }       // currículo + histórico em texto
```

`POST entrevista` (registrar relatório):

```jsonc
{ "sessaoId": "uuid",            // recomendado — se informado, telefone é opcional
  "telefone": "5561999999999",   // obrigatório quando não há sessaoId (compatibilidade)
  "cargoAlvo": "Jovem Aprendiz Administrativo",  // se ausente, usa o da sessão ou "Entrevista simulada"
  "empresaAlvo": "…",
  "notaGeral": 7.5,
  "relatorio": { RelatorioEntrevista },
  // legado (opcionais se `relatorio` vier): texto ou lista de strings
  "pontosFortes": [], "pontosMelhoria": [], "dicasComunicacao": [],
  "dataRealizacao": "ISO 8601" }
```

Idempotente por `sessaoId`: se a sessão já tiver relatório, devolve o existente com `jaExistia: true`.
Marca a sessão como `ANALISADA`. `linkRelatorio` = `${FRONTEND_URL}/dashboard/entrevistas/<id>`.

Antes de salvar, a API **confere o relatório com a conversa**: a `evidencia` que não aparece nas falas do candidato é
retirada (o jovem nunca vê uma citação que não disse); com menos de 4 respostas, notas limitadas a 6; a nota geral fica
entre 1,5 abaixo e 1 acima da média das competências; a classificação é sempre recalculada pela nota. Quando o relatório
é novo, a resposta traz `resultado: { notaGeral, notaTexto: "7,5", classificacao, classificacaoTexto: "Preparado(a)",
destaques: string[] (até 2), melhoria: { titulo, comoMelhorar } | null }` para a mensagem do WhatsApp.

- Com `sessaoId` e `telefone`, os dois precisam ser da mesma pessoa (senão **400**). Sessão inexistente ou telefone sem
  cadastro → 404.
- **Relatório válido** = tem nota (`notaGeral`, a nota de fora do objeto ou a média das competências) e ao menos um
  ponto forte ou de melhoria válido. Sem relatório válido, os três textos legados (`pontosFortes`, `pontosMelhoria`,
  `dicasComunicacao`) são obrigatórios (400). A API corta textos e listas nos limites da seção 4.2 em vez de recusar.
- `dataRealizacao` padrão = início da sessão (ou agora, sem sessão); data mais de 5 min no futuro é ignorada.

`GET sessoes/:id/transcricao` devolve no máximo as **300 mensagens mais recentes** (em ordem cronológica).

## 6. n8n — contratos de entrada/saída

Os fluxos ficam em `n8n-workflows/` (importar no n8n; passo a passo em `docs/INTEGRACAO-N8N.md`). Eles **não têm nós
Code**: as regras (diálogo formatado, contagens, cuidado, coerência das notas, tentativas) ficam na API, testadas, e o
n8n usa só nós nativos (Edit Fields, IF, Switch, Filter, Merge, Extract from File, Convert to File, Google Gemini, Basic
LLM Chain + Structured Output Parser). Configuração (URL da API, Evolution, instância, modelos) fica no nó
"⚙️ Configuração" de cada fluxo; chaves ficam em credenciais do n8n (nunca no JSON).

### 6.1 Construtor de Currículo — `POST {n8n}/webhook/curriculo`

Chamado pela API com header `x-api-key: N8N_API_KEY`, em `multipart/form-data` (sem dados de contato):

```jsonc
// campo "dados" (texto JSON)
{ "versao": 3,
  "formulario": { titulo, cargoDesejado, cidade, uf, perfilProfissional, experiencias[], formacao[], habilidades[],
                  idiomas[], premiacoes[] },
  "temAudio": true, "temCurriculoAntigo": true,
  "temConteudoEscrito": false }   // perfil, experiência, formação ou habilidade escritos (seção 5.4)
// arquivo "audio" (opcional): a história contada pelo jovem
// arquivo "curriculoAntigo" (opcional): PDF, JPG ou PNG
```

No n8n: o áudio é transcrito pelo nó **Google Gemini** (Audio → Analyze, prompt próprio em português); o currículo antigo
em PDF com texto sai pelo **Extract from File**, sem custo de IA (e-mails, telefones e CPFs viram `[omitido]`); PDF
escaneado ou foto vai para o Gemini (Document → Analyze) com instrução de não copiar dados pessoais. O **Headhunter**
recebe só `cargoDesejado`, `perfilProfissional`, `experiencias`, `formacao`, `habilidades`, `idiomas` e `premiacoes`
(título, cidade e UF ficam no n8n), a transcrição e o texto do currículo antigo. Prioridade em conflitos: formulário,
depois áudio, depois currículo antigo.

Resposta (nó "Respond to Webhook", JSON):

```jsonc
{ "conteudo": { cargoDesejado, perfilProfissional, experiencias[{empresa,cargo,periodo,atividades[]}],
                formacao[{instituicao,curso,periodo,situacao}], habilidades[], idiomas[{idioma,nivel}], premiacoes[] },
  "transcricao": "texto do áudio" | "",
  "observacoes": ["dicas curtas para o usuário completar o currículo"] }   // inclui aviso se o arquivo não pôde ser lido
```

Erros: 500 `{ erro }` (IA falhou ou respondeu fora do formato) e 422 `{ erro }` (nada aproveitável: áudio sem fala, sem
texto e sem currículo legível). Em qualquer status diferente de 2xx a API salva só o formulário e avisa (ou responde 503
se o jovem mandou só arquivos). A API aceita também a resposta embrulhada em array, em `{ output: ... }` ou como string
JSON.

### 6.2 Recrutadora Virtual (WhatsApp) — webhook da Evolution API

URL configurada na Evolution: `{n8n}/webhook/whatsapp-rh?token=<WEBHOOK_TOKEN>` (evento `MESSAGES_UPSERT`). O fluxo
**falha fechado**: sem o token certo ou sem a instância configurada, o evento é ignorado.

1. **Ler evento / Ler mensagem / Mensagem válida?**: ignora grupos, status, canais, mensagens próprias, reações e
   edições, eventos de outra instância e mensagens com mais de 10 min (reenvio na reconexão). Remetente em formato LID
   (`<id>@lid`) é trocado pelo número real (`remoteJidAlt`/`senderPn`).
2. Áudio: usa o base64 do evento ("Webhook Base64" ligado) ou baixa pela Evolution → **Convert to File** → Gemini
   transcreve. Acima de `MAX_AUDIO_MB`, sem fala ou com falha: pede para repetir.
3. `GET usuario/:telefone` → sem cadastro: convite com o link de cadastro (conta bloqueada: aviso).
4. Comandos (mensagem inteira, sem acento/caixa/pontuação): `encerrar`/`finalizar`/`relatório` finaliza
   (SOLICITADA_USUARIO); `reiniciar`/`recomeçar` encerra e a próxima mensagem abre outra simulação; `ajuda` explica. A
   confirmação depende de `status`/`cuidado` devolvidos pela API (FINALIZADA promete o relatório; CANCELADA explica).
5. Conversa: `POST mensagens` (CANDIDATO) → `GET sessoes/:id/transcricao` → se `totalMensagens` mudou, chegou outra
   mensagem e quem responde é a execução dela → **Helena** (prompt com `contextoTexto`, `dialogoRecente`, contagens e
   `emCuidado`) gera `{ etapa, resposta, encerrar, cargoAlvo, empresaAlvo, alertaCuidado }`.
6. Antes de responder, confere de novo a sessão (continua EM_ANDAMENTO e com o mesmo total). Depois: `POST mensagens`
   (RECRUTADORA, **com `sessaoId`**) → se `encerrar`, `POST sessoes/:id/finalizar` (CONCLUIDA) → envia pela Evolution.
   Registro recusado com **409** (simulação encerrada no meio) → a resposta não é enviada.
7. Relato de sofrimento ou risco: a Helena acolhe e pausa a simulação; o fluxo garante que a mensagem cite o CVV (188).
   Daí em diante `emCuidado` é `true` e, ao encerrar, a API cancela a sessão (sem relatório com nota).

### 6.3 Gerador de Relatório — `POST {n8n}/webhook/relatorio-entrevista` + agendamento

Entradas: webhook `{ sessaoId }` (header `x-api-key`; chamado pela API ao finalizar, se `N8N_RELATORIO_WEBHOOK_URL`
estiver definida; responde na hora) e um Schedule Trigger (a cada 10 min) que chama `GET sessoes/pendentes?limite=LOTE`
(a API escolhe o lote e controla as tentativas — seção 5.6). Para cada sessão: `GET transcricao` → **Pronta para
avaliar?** (só `FINALIZADA`, sem cuidado, com respostas) → **Avaliador** (prompt com `contextoTexto` e `dialogo`
numerado; Gemini + Structured Output Parser, RelatorioEntrevista v1) → `POST entrevista` com `sessaoId` (a API confere
notas e evidências) → se o relatório é novo (`resultado` presente), envia nota, destaques, a melhoria principal e o link
pelo WhatsApp. Uma sessão que falha continua pendente e volta nos próximos ciclos.

## 7. Variáveis de ambiente do backend

Obrigatórias (já existentes): `DATABASE_URL`, `JWT_ACCESS_SECRET`, `DATA_ENCRYPTION_KEY`, `DATA_HASH_KEY`,
`S3_PUBLIC_URL`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`.

Novas (todas opcionais):

| Variável | Padrão | Para quê |
|---|---|---|
| `WHATSAPP_NUMERO_BOT` | — | Número da IA recrutadora (só dígitos, DDI 55 + DDD; ex.: `558899713766`). Sem ele, os botões de WhatsApp ficam ocultos |
| `N8N_RELATORIO_WEBHOOK_URL` | — | Dispara o relatório na hora em que a sessão termina |
| `N8N_CURRICULO_TIMEOUT_MS` | 120000 | Tempo máximo do fluxo de currículo (áudio + IA) |
| `SESSAO_INATIVIDADE_MIN` | 120 | Minutos parada até a simulação encerrar sozinha |
| `SESSAO_MIN_MENSAGENS_CANDIDATO` | 3 | Respostas mínimas para gerar relatório |
| `COOKIE_REFRESH_PATH` | `/api-proxy/auth` | Path do cookie de refresh (o navegador usa o proxy do Next) |
| `TRUST_PROXY` | `loopback, linklocal, uniquelocal` | Em quem a API confia para ler o `X-Forwarded-For` (o Next, na rede local/Docker) |
| `LOGIN_MAX_TENTATIVAS` / `LOGIN_BLOQUEIO_MIN` | 10 / 15 | Bloqueio de login por e-mail + IP; teto de 3× por e-mail (seção 5.2) |

**IP real do usuário (rate limit, auditoria, `ConsentimentoLgpd.ip`).** A API lê o IP do `X-Forwarded-For` só quando a
conexão vem de um proxy confiável (`TRUST_PROXY`) — na prática, o Next. Isso só dá o IP certo se **quem está na frente do
Next sobrescrever** o `X-Forwarded-For` com o IP de quem conectou (sem anexar ao valor recebido): o rewrite `/api-proxy`
do Next 16 repassa o cabeçalho do cliente como veio e não acrescenta o IP real. Sem isso, um cliente pode forjar o IP e,
sem cabeçalho, todos aparecem com o IP do container do Next. Por isso o container do frontend sobe pelo
`frontend/servidor-producao.js`, que **sobrescreve** o `X-Forwarded-For` com o IP do socket antes de o Next tratar a
requisição (verificado em Docker: um IP forjado é ignorado e o limite de login vale por IP real). Se um proxy reverso
(Nginx/Caddy) for colocado na frente do Next, defina `CONFIAR_PROXY_REVERSO=true` no serviço `web` (o wrapper passa a
usar o último IP do `X-Forwarded-For`, que é o que esse proxy acrescentou) e deixe de publicar a porta 3000 para fora.
Chamadas diretas à porta 3333 vindas da internet não são afetadas: o IP de origem é público (não confiável) e o
`X-Forwarded-For` é ignorado. Um `TRUST_PROXY` inválido não derruba a API: ela registra um aviso e usa o padrão.

## 8. Pendências conhecidas (decisões de produto/escala)

- **Verificação de posse do WhatsApp:** hoje qualquer número livre é aceito no cadastro e no `PATCH /me`. Quem cadastra o
  número de outra pessoa passa a receber as mensagens dela com a Helena (e o 409 revela se um número tem conta).
  Solução prevista: código gerado no painel e enviado pelo WhatsApp (ou OTP pela Evolution) antes de vincular o número.
- **argon2 na thread principal:** o `hash-wasm` calcula o hash de forma síncrona (≈65 ms por hash novo; ≈300 ms para
  conferir um hash legado no primeiro login), travando o event loop nesse tempo. Aceitável na escala atual; com mais
  volume, mover para `worker_threads`.
- **Exportação LGPD:** a auditoria vai limitada aos 500 registros mais recentes — confirmar com o jurídico se basta.
