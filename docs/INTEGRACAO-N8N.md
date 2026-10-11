# Integração com o n8n — guia passo a passo

Este guia mostra como colocar para funcionar a parte de inteligência artificial do Impulso Jovem: o currículo com IA
(inclusive a partir de um áudio ou de um currículo antigo), a recrutadora virtual "Helena" no WhatsApp e o relatório
das entrevistas. Não é preciso ser especialista em n8n: siga os passos na ordem. Leva de 30 a 60 minutos na primeira
vez.

Os contratos técnicos (rotas, campos e formatos) estão em [`ARQUITETURA.md`](./ARQUITETURA.md), seções 4, 5.6 e 6.

---

## 1. Visão geral

São três fluxos, na pasta `n8n-workflows/` do projeto:

| Arquivo | Nome no n8n | Quem dispara | O que faz |
|---|---|---|---|
| `Construtor_Curriculo.json` | Impulso Jovem — Construtor de Currículo (IA) | A API, quando o jovem pede um currículo com IA | Transcreve o áudio, lê o currículo antigo (PDF ou foto), junta tudo com o formulário e devolve o currículo em JSON |
| `Recrutador_RH_Virtual.json` | Impulso Jovem — Recrutadora Virtual (WhatsApp) | A Evolution API, a cada mensagem recebida no WhatsApp | Conduz a simulação de entrevista com a Helena (texto ou áudio) |
| `Gerador_Analise_RH.json` | Impulso Jovem — Gerador de Relatório da Entrevista | A API (quando a simulação termina) e um agendamento a cada 10 min | Gera o relatório com nota, pontos fortes, pontos a melhorar e plano de ação, salva na API e avisa o jovem no WhatsApp |

```
Site (currículo) ──► API ──POST /webhook/curriculo (dados + áudio + currículo antigo)──► n8n ──► Gemini
                      ▲                                                                    │
                      └──────────────────── resposta { conteudo } ◄────────────────────────┘

WhatsApp ◄──► Evolution API ──POST /webhook/whatsapp-rh?token=…──► n8n ──► Gemini
                    ▲                                        │
                    └────────── envia a resposta ◄───────────┤
                                                             └──x-api-key──► API (/api/v1/webhooks/whatsapp/*)

API ──POST /webhook/relatorio-entrevista──► n8n ──► Gemini ──► API (confere e salva) ──► WhatsApp (resumo + link)
```

Regras que valem para os três fluxos:

- **Sem nós Code.** Os fluxos usam só nós nativos (Edit Fields, IF, Switch, Filter, Merge, Extract from File,
  Convert to File, Google Gemini, Basic LLM Chain). As regras que antes ficavam em código (montar o diálogo, contar
  respostas, conferir notas e citações, controlar tentativas, reconhecer a pausa por cuidado) ficam **na API**, com
  testes automatizados. Isso deixa os fluxos mais fáceis de ler e de ajustar.
- **O n8n nunca acessa o banco de dados.** Tudo passa pela API, com o header `x-api-key`.
- **Nenhuma chave fica dentro dos arquivos JSON.** Chaves ficam nas *credenciais* do n8n; endereços e parâmetros ficam
  no nó **⚙️ Configuração** de cada fluxo. A única exceção é o `WEBHOOK_TOKEN` da Recrutadora, que você preenche no
  n8n depois de importar (no arquivo do projeto ele vem vazio).
- **Execuções bem-sucedidas não são guardadas.** Os três fluxos vêm com essa configuração porque as execuções teriam
  conversas, áudios e currículos de jovens (veja a seção 11). As execuções com erro continuam salvas para investigação.
- Se a IA ou a API falharem, os fluxos respondem algo útil: o currículo cai no modo "só formulário" e, no WhatsApp,
  o jovem recebe "Ops, tive um probleminha aqui..." em vez de ficar sem resposta.

---

## 2. Antes de começar

Você vai precisar de:

1. **n8n** acessível pela internet com HTTPS — a Evolution API precisa conseguir chamar o n8n. Use uma versão que já
   tenha o nó **Google Gemini** (o mesmo do "Transcribe a recording"); se, ao importar, algum nó aparecer com "?" ou
   pedindo instalação, atualize o n8n. Confira se a variável `WEBHOOK_URL` do n8n está com o endereço público (ex.:
   `https://n8n.seu-dominio.com.br/`): é ela que define as URLs de produção mostradas nos nós de webhook.
2. **Evolution API v2** com uma instância conectada ao número de WhatsApp da Helena (QR Code lido). No Impulso Jovem:
   `https://evolution.jose-de-ia.online`, número **(88) 9971-3766**.
3. **Chave da API do Gemini**: em [aistudio.google.com](https://aistudio.google.com) → *Get API key*. Use um projeto
   **com faturamento ativado** (veja a seção 11, Privacidade).
4. **Acesso ao servidor do Impulso Jovem**, para editar o `backend/.env` (ele não fica no git).
5. **Rede liberada** nos dois sentidos: n8n → API, API → n8n, n8n → Evolution e Evolution → n8n.

---

## 3. Passo 1 — Gerar a chave compartilhada (`N8N_API_KEY`)

A API e o n8n se reconhecem por uma chave secreta enviada no header `x-api-key`. É **a mesma chave** nos dois lados.

Gere uma chave aleatória (qualquer uma das opções):

```bash
openssl rand -hex 32
# ou
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Guarde o resultado num gerenciador de senhas. Ele vai em dois lugares: no `backend/.env` (passo 5) e na credencial
"Impulso API (x-api-key)" do n8n (passo 2). Nunca coloque essa chave no git, em prints ou em mensagens.

---

## 4. Passo 2 — Criar as credenciais no n8n

Crie as credenciais **antes de importar** os fluxos e use **exatamente** estes nomes: assim o n8n já liga cada nó à
credencial certa na importação. (Se algum nó ficar com um triângulo de aviso depois, é só abrir o nó e escolher a
credencial na lista.)

No n8n: menu **Credentials** (ou **Overview → Credentials**) → **Add credential**.

| Nome exato | Tipo | Campos |
|---|---|---|
| `Impulso API (x-api-key)` | Header Auth | **Name:** `x-api-key` · **Value:** a chave do passo 1 |
| `Evolution API (apikey)` | Header Auth | **Name:** `apikey` · **Value:** a chave da Evolution (a global `AUTHENTICATION_API_KEY` ou o token da instância) |
| `Google Gemini(PaLM) Api account` | Google Gemini(PaLM) Api | **Host:** deixe o padrão · **API Key:** a chave do Gemini |

A credencial do Gemini talvez já exista na sua instância (os fluxos apontam para ela). Se existir, não precisa criar
outra. Ela é usada tanto pelos nós "Gemini (...)" dos agentes quanto pelos nós **Google Gemini** que transcrevem áudio
e leem currículos.

A credencial "Impulso API (x-api-key)" tem dois usos: protege os webhooks de entrada do n8n (currículo e relatório)
e autentica as chamadas do n8n para a API.

---

## 5. Passo 3 — Importar os fluxos

Para cada um dos três arquivos de `n8n-workflows/`:

1. No n8n, clique em **Add workflow** (ou **Create workflow**).
2. No menu **⋯** (canto superior direito), escolha **Import from File...** e selecione o arquivo `.json`.
3. Confira se nenhum nó mostra aviso de credencial. Se mostrar, abra o nó e selecione a credencial.
4. Clique em **Save**.

**Já tinha a versão anterior dos fluxos importada?** Desative (ou apague) os fluxos antigos **antes** de ativar os
novos: dois fluxos ativos com o mesmo caminho de webhook (`curriculo`, `whatsapp-rh`, `relatorio-entrevista`) entram em
conflito. Antes de apagar, anote o `WEBHOOK_TOKEN` e o `EVOLUTION_INSTANCE` do ⚙️ Configuração da Recrutadora antiga
para reaproveitar.

---

## 6. Passo 4 — Preencher o nó ⚙️ Configuração

Cada fluxo tem um nó **⚙️ Configuração** logo depois do gatilho. Abra-o e ajuste os valores. Não coloque chaves aqui.

### `API_URL` — endereço da API (Recrutadora e Relatório)

| Situação | Valor |
|---|---|
| O n8n roda no **mesmo servidor e na mesma rede Docker** da API | `http://api:3333/api/v1` |
| O n8n roda em outro lugar | A URL pública da API, ex.: `https://api.seu-dominio.com.br/api/v1` ou `http://IP-DO-SERVIDOR:3333/api/v1` |

Sem barra no final. Prefira HTTPS sempre que a chamada sair do servidor: a chave `x-api-key` vai no header.

Para colocar um n8n que roda em Docker na rede do projeto (o `docker-compose.yml` cria a rede `impulso-jovem_default`):

```bash
docker network connect impulso-jovem_default NOME-DO-CONTAINER-DO-N8N
```

Se o container do n8n for recriado, repita o comando (ou declare essa rede como `external` no compose do n8n).

### `WEBHOOK_TOKEN` — segredo do webhook da Recrutadora (obrigatório)

A Evolution API não consegue mandar uma chave no header para o n8n. Por isso, o webhook da Recrutadora exige um
**token secreto na própria URL** (`…/webhook/whatsapp-rh?token=SEU_TOKEN`), comparado com o `WEBHOOK_TOKEN` do nó
⚙️ Configuração. Sem isso, qualquer pessoa que descobrisse a URL poderia mandar mensagens falsas em nome de qualquer
jovem cadastrado, encerrar a simulação de outra pessoa ou fazer o número da Helena enviar convites para números
aleatórios (o que pode levar o WhatsApp a banir o número).

1. Gere um token aleatório, diferente da `N8N_API_KEY` (só letras e números, para não precisar codificar na URL):

   ```bash
   openssl rand -hex 24
   # ou
   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
   ```

2. Cole o valor em `WEBHOOK_TOKEN` no ⚙️ Configuração da Recrutadora e salve. Ele precisa ter **pelo menos 16
   caracteres**.
3. Use a mesma URL com o token na Evolution (passo 6).

O fluxo **falha fechado**: com `WEBHOOK_TOKEN` vazio ou curto, token ausente ou diferente na URL, ou evento sem
instância ou de outra instância, nada é processado e a Helena não responde (a execução para no filtro "Mensagem
válida?").

**Alternativa sem token — `ACEITAR_REDE_INTERNA=true`.** Quando a Evolution e o n8n estão no mesmo servidor (mesma
rede Docker) e o n8n só é acessível de fora pela **Cloudflare** (Tunnel ou proxy), dá para dispensar o token: a
Evolution chama `http://NOME-DO-CONTAINER-DO-N8N:5678/webhook/whatsapp-rh` por dentro, e o fluxo aceita sem token só
os eventos que **não** passaram pela Cloudflare (tudo o que vem por ela traz os headers `cf-connecting-ip`/`cf-ray`,
que o visitante não consegue remover). A instância continua sendo conferida. Não ligue essa opção se o n8n estiver
exposto direto na internet sem a Cloudflare na frente — aí use o token. Guarde o token num gerenciador de senhas e não o coloque em prints ou mensagens. Para trocar o token, mude
nos dois lugares (n8n e Evolution) ao mesmo tempo.

### Demais campos

| Campo | Fluxos | O que é |
|---|---|---|
| `EVOLUTION_URL` | Recrutadora, Relatório | Endereço da Evolution API, sem barra no final. Já vem com `https://evolution.jose-de-ia.online` |
| `EVOLUTION_INSTANCE` | Recrutadora, Relatório | **Nome exato** da instância no Evolution Manager. Eventos sem instância ou de outra instância são ignorados |
| `MAX_PERGUNTAS` | Recrutadora | Quantas perguntas a Helena faz antes de encerrar (padrão 8) |
| `MAX_AUDIO_MB` | Recrutadora | Tamanho máximo de áudio aceito no WhatsApp (padrão 15) |
| `MODELO_IA` | Os três | Modelo dos agentes (Headhunter, Helena, Avaliador). Padrão `models/gemini-2.5-flash` |
| `MODELO_LEITURA` | Currículo, Recrutadora | Modelo que transcreve áudio e lê currículo escaneado ou foto. Padrão `models/gemini-2.5-flash` |
| `MIN_TEXTO_PDF` | Currículo | Abaixo desse número de caracteres, o PDF é tratado como escaneado e vai para o Gemini ler (padrão 300) |
| `MAX_TEXTO_ARQUIVO` | Currículo | Limite de caracteres do texto do currículo antigo enviado à IA (padrão 12000) |
| `LOTE` | Relatório | Quantas sessões o agendamento avalia por ciclo (padrão 10). A API escolhe quais e controla as novas tentativas |
| `ENVIAR_WHATSAPP` | Relatório | `true` envia o resumo do relatório pelo WhatsApp; `false` só salva no painel |

O mínimo de respostas para haver relatório é decidido pela API (`SESSAO_MIN_MENSAGENS_CANDIDATO`) e chega pronto para
a Helena em cada mensagem: não há mais um valor duplicado no n8n.

Salve cada fluxo depois de editar.

---

## 7. Passo 5 — Ativar os fluxos e configurar o backend

1. Em cada fluxo, ligue a chave **Active** (ou **Publish**, nas versões mais novas) no topo da tela.
2. Abra o nó de webhook de cada fluxo e copie a **Production URL** (não a *Test URL*):
   - Currículo: `https://SEU-N8N/webhook/curriculo`
   - Relatório: `https://SEU-N8N/webhook/relatorio-entrevista`
   - Recrutadora: `https://SEU-N8N/webhook/whatsapp-rh` (vai na Evolution, passo 6, **com** `?token=` no final)
3. No servidor, edite o `backend/.env`:

```dotenv
# Mesma chave da credencial "Impulso API (x-api-key)" (mínimo 32 caracteres)
N8N_API_KEY=cole-aqui-a-chave-do-passo-1

# URLs de produção dos webhooks do n8n
N8N_CURRICULO_WEBHOOK_URL=https://SEU-N8N/webhook/curriculo
N8N_RELATORIO_WEBHOOK_URL=https://SEU-N8N/webhook/relatorio-entrevista

# Número do WhatsApp da Helena: só dígitos, com 55 + DDD. (88) 9971-3766 →
WHATSAPP_NUMERO_BOT=558899713766

# Opcionais (valores padrão)
# N8N_CURRICULO_TIMEOUT_MS=120000   # tempo máximo do fluxo de currículo
# SESSAO_INATIVIDADE_MIN=120        # minutos parada até a simulação encerrar sozinha
# SESSAO_MIN_MENSAGENS_CANDIDATO=3  # respostas mínimas para gerar relatório
```

Se o n8n estiver na mesma rede Docker da API, as URLs dos webhooks podem ser internas, por exemplo
`http://NOME-DO-CONTAINER-DO-N8N:5678/webhook/curriculo`.

4. Recrie o container da API para ler o `.env` novo (um simples `restart` não relê o arquivo):

```bash
docker compose --profile full up -d --force-recreate api
```

O que cada variável liga:

| Variável | Sem ela |
|---|---|
| `N8N_API_KEY` | Os webhooks `/api/v1/webhooks/whatsapp/*` respondem 503 e nada do WhatsApp funciona |
| `N8N_CURRICULO_WEBHOOK_URL` | O currículo é montado só com o formulário; enviar só áudio ou só o currículo antigo fica indisponível |
| `N8N_RELATORIO_WEBHOOK_URL` | Funciona do mesmo jeito, mas o relatório espera o agendamento (até 10 minutos) |
| `WHATSAPP_NUMERO_BOT` | Os botões "Treinar no WhatsApp" ficam ocultos no site |

---

## 8. Passo 6 — Ligar a Evolution API ao n8n

A Evolution precisa avisar o n8n a cada mensagem recebida. A URL configurada na Evolution é a Production URL do fluxo
da Recrutadora **com o token do passo 4 no final**:

```
https://SEU-N8N/webhook/whatsapp-rh?token=SEU_WEBHOOK_TOKEN
```

**Pelo Evolution Manager** (`https://evolution.jose-de-ia.online/manager/`): abra a instância → **Events / Webhook** e
configure:

- **Enabled:** ligado
- **URL:** a URL acima, com `?token=`
- **Webhook by Events:** **desligado** (se ligado, a Evolution acrescenta o nome do evento no fim da URL; com o token
  no final, a URL deixa de funcionar)
- **Webhook Base64:** ligado (recomendado: o áudio já chega no evento e o fluxo não precisa baixá-lo)
- **Events:** só `MESSAGES_UPSERT`

**Pela API da Evolution** (alternativa):

```bash
curl -sS -X POST "https://evolution.jose-de-ia.online/webhook/set/NOME-DA-INSTANCIA" \
  -H "Content-Type: application/json" \
  -H "apikey: COLE_AQUI_A_CHAVE_DA_EVOLUTION" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "https://SEU-N8N/webhook/whatsapp-rh?token=COLE_AQUI_O_WEBHOOK_TOKEN",
      "byEvents": false,
      "base64": true,
      "events": ["MESSAGES_UPSERT"]
    }
  }'
```

Os nomes de alguns campos mudam entre versões da Evolution (por exemplo, `byEvents`/`base64` ou
`webhookByEvents`/`webhookBase64`). Se a chamada der erro 400, confira a documentação da sua versão ou use o Manager.
Depois de salvar, confira (no Manager ou em `GET /webhook/find/NOME-DA-INSTANCIA`) se a URL ficou com o `?token=`.

**Segurança:**

- Sem o token certo, o fluxo ignora o evento. Ele também ignora eventos sem o campo de instância ou de outra
  instância. As duas conferências precisam passar.
- O token fica na URL, então pode aparecer em logs de acesso de um proxy (por exemplo, Nginx) na frente do n8n.
  Restrinja o acesso a esses logs ou desligue o registro da query string nesse caminho. Se o token vazar, gere outro e
  troque nos dois lugares.
- Proteção extra opcional: trocar o *path* `whatsapp-rh` por algo difícil de adivinhar (ex.: `whatsapp-rh-7f3k9q`) no
  nó "Webhook Evolution (mensagens)" e usar a mesma URL na Evolution. Isso **não substitui** o token.

---

## 9. Passo 7 — Testar

Use sempre **dados fictícios** nos testes. Troque `SUA-API`, `SEU-N8N` e as chaves pelos seus valores; nunca cole
chaves reais em documentos ou conversas.

### 9.1 A API aceita a chave do n8n?

```bash
curl -sS "https://SUA-API/api/v1/webhooks/whatsapp/usuario/5561900000000" \
  -H "x-api-key: COLE_AQUI_A_N8N_API_KEY"
```

Esperado (número sem cadastro): `{"encontrado":false,"motivo":"NAO_CADASTRADO","linkCadastro":"https://.../registro"}`.
Se vier `401`, a chave está diferente; se vier `503`, a `N8N_API_KEY` não está no `.env` do backend.

### 9.2 Currículo com IA

Direto no n8n, do mesmo jeito que a API chama (multipart). O áudio e o PDF são opcionais — use arquivos fictícios:

```bash
curl -sS -X POST "https://SEU-N8N/webhook/curriculo" \
  -H "x-api-key: COLE_AQUI_A_N8N_API_KEY" \
  -F 'dados={"versao":3,"formulario":{"cargoDesejado":"Jovem Aprendiz Administrativo","perfilProfissional":"to no 2 ano do ensino medio, gosto de organizar as coisas e mexo bem no computador","experiencias":[{"empresa":"Mercadinho do bairro","cargo":"ajudante","inicio":"2024-12","fim":"2025-02","descricao":"ficava no caixa e arrumava as prateleiras nas ferias"}],"formacao":[],"habilidades":["excel"],"idiomas":[],"premiacoes":[]},"temConteudoEscrito":true}' \
  -F 'audio=@historia-teste.ogg;type=audio/ogg' \
  -F 'curriculoAntigo=@curriculo-teste.pdf;type=application/pdf'
```

Esperado: `{ "conteudo": { ... }, "transcricao": "...", "observacoes": [ ... ] }` em 10 a 40 segundos.
Depois, teste pelo site: em **Currículos → Novo**, conte um pouco da história, grave um áudio e/ou envie um currículo
antigo em **"Já tem um currículo? Aproveite"**, e confira se o resultado aparece como "refinado por IA".

### 9.3 Recrutadora no WhatsApp

Durante os testes, ligue temporariamente o registro das execuções bem-sucedidas nos três fluxos: **⋯ → Settings →
Save successful production executions → Save**. Assim dá para acompanhar cada mensagem na aba **Executions** (o
caminho percorrido e onde algo falhou). **Volte para "Do not save" ao terminar** (motivo na seção 11).

1. Cadastre-se no site com o seu número de WhatsApp de teste.
2. Mande **oi** para o número da Helena: ela se apresenta e pergunta para qual vaga você quer treinar.
3. Responda algumas perguntas (texto e áudio).
4. Mande **ajuda** (instruções) e depois **encerrar**: ela confirma e o relatório chega em alguns minutos.
5. De um número sem cadastro, mande **oi**: a resposta deve trazer o link de cadastro.
6. Confira o token: um evento enviado **sem** o `?token=` (ou com outro valor) não pode gerar resposta.

   ```bash
   curl -sS -X POST "https://SEU-N8N/webhook/whatsapp-rh" -H "Content-Type: application/json" \
     -d '{"event":"messages.upsert","instance":"NOME-DA-INSTANCIA","data":{"key":{"remoteJid":"5561900000000@s.whatsapp.net","fromMe":false,"id":"TESTE"},"message":{"conversation":"oi"}}}'
   ```

   O n8n responde `{"message":"Workflow was started"}`, mas a execução para no filtro "Mensagem válida?" e nenhuma
   mensagem é enviada.
7. Encerrar com poucas respostas: mande **oi**, responda só uma pergunta e diga que precisa sair. A Helena encerra
   **sem** prometer relatório (a API cancela simulações com menos de `SESSAO_MIN_MENSAGENS_CANDIDATO` respostas).

### 9.4 Relatório

O relatório chega sozinho depois do **encerrar**. Para forçar o de uma sessão específica já encerrada:

```bash
curl -sS -X POST "https://SEU-N8N/webhook/relatorio-entrevista" \
  -H "Content-Type: application/json" \
  -H "x-api-key: COLE_AQUI_A_N8N_API_KEY" \
  -d '{ "sessaoId": "ID-DE-UMA-SESSAO-ENCERRADA" }'
```

O pedido com `sessaoId` tenta na hora, sem esperar a fila. Sem `sessaoId`, o fluxo processa as sessões pendentes (o
mesmo que o agendamento faz). Também dá para rodar o agendamento na hora: abra o fluxo e clique em **Execute
workflow** no nó "A cada 10 minutos".

---

## 10. Problemas comuns

| Sintoma | Causa provável e solução |
|---|---|
| O webhook do n8n responde **403 "Authorization data is wrong!"** | O header `x-api-key` não confere com a credencial "Impulso API (x-api-key)" do nó de webhook. Confira o valor nos dois lados |
| A API responde **401 "Chave de API inválida"** nas execuções | A credencial "Impulso API (x-api-key)" do n8n tem valor diferente de `N8N_API_KEY` |
| A API responde **503 "Integração com o n8n não configurada"** | `N8N_API_KEY` vazia ou o container da API não foi recriado depois de editar o `.env` |
| Nó aparece com "?" ou pedindo instalação depois de importar | O n8n é antigo e não tem o nó Google Gemini (ou uma versão de nó). Atualize o n8n |
| A Helena não responde nada | Fluxo não está ativo; a Evolution aponta para a *Test URL*; "Webhook by Events" ligado; evento diferente de `MESSAGES_UPSERT`; ou a execução para em "Mensagem válida?": `WEBHOOK_TOKEN` vazio ou com menos de 16 caracteres, URL da Evolution sem o `?token=` (ou com outro valor), ou `EVOLUTION_INSTANCE` diferente do nome da instância |
| A execução nem aparece no n8n | Execuções bem-sucedidas não são guardadas por padrão (ligue temporariamente em **Settings**, seção 9.3). Se nem as com erro aparecem, a Evolution não alcança o n8n: confira a URL, o HTTPS e o firewall |
| A Helena diz que o número não tem cadastro, mas tem | O número do WhatsApp é diferente do cadastrado no site. A API já trata o "9" extra dos celulares brasileiros; contas novas do WhatsApp que usam identificador sem número (LID) podem não trazer o telefone no evento |
| A Helena responde duas vezes | Há dois webhooks configurados na Evolution, ou dois fluxos da Recrutadora ativos (o antigo e o novo) |
| "Não consegui entender seu áudio" | Áudio sem fala, maior que `MAX_AUDIO_MB` ou o Gemini fora do ar. Veja o nó "Transcrever áudio (Gemini)" na execução |
| "Ops, tive um probleminha aqui" | A API ou a IA falhou nessa mensagem. Veja o nó com erro na execução (geralmente `API_URL` errada ou credencial) |
| Currículo sai sem IA (aviso no site) | Fluxo inativo, URL errada em `N8N_CURRICULO_WEBHOOK_URL`, tempo esgotado (aumente `N8N_CURRICULO_TIMEOUT_MS`) ou erro do Gemini. A execução mostra o motivo |
| Aviso "Não consegui ler o currículo antigo" | Foto muito escura ou tremida, PDF protegido por senha ou arquivo que não é um currículo. Peça um PDF exportado do Word/Docs ou uma foto nítida |
| Upload grande falha antes de chegar ao fluxo | O n8n aceita até 16 MB por requisição (`N8N_PAYLOAD_SIZE_MAX`); áudio (8 MB) + currículo antigo (5 MB) cabem. Um proxy na frente do n8n pode ter limite menor (ex.: `client_max_body_size` do Nginx: use pelo menos 16m) |
| O relatório não chega | Sem `N8N_RELATORIO_WEBHOOK_URL` ele espera o agendamento (até 10 min); a sessão teve menos respostas que o mínimo (vira "cancelada", sem relatório); a IA falhou e a API vai devolver a sessão de novo com espera crescente (depois de 8 falhas ela é cancelada); a conversa foi pausada porque o jovem relatou sofrimento e a Helena indicou o CVV (de propósito, essa conversa não recebe nota); ou `ENVIAR_WHATSAPP` está `false` (o relatório fica só no painel) |
| Erro "model not found" ou "is not supported" | O modelo do Gemini foi descontinuado ou não está liberado para a sua chave. Troque `MODELO_IA` e `MODELO_LEITURA` no ⚙️ Configuração (ex.: um Flash mais novo listado no Google AI Studio) |
| Erro 429 do Gemini | Limite de uso da chave (comum no plano gratuito). Ative o faturamento ou aumente a cota |
| Nó com aviso de credencial depois de importar | O nome da credencial não bateu. Abra o nó e selecione a credencial certa |

---

## 11. Limites, desempenho, custos e privacidade

### Limites e tempos

- **Áudio do currículo:** até 8 MB (limite da API). Um relato de 1 a 3 minutos é o ideal.
- **Currículo antigo:** PDF, JPG ou PNG, até 5 MB. Word (`.doc`/`.docx`) não é aceito: o site orienta a salvar como PDF.
- **Áudio no WhatsApp:** até `MAX_AUDIO_MB` (15 MB). Mensagens de voz comuns têm bem menos que isso.
- **Tempo de resposta:** currículo de 10 a 40 s (mais com áudio longo ou foto); Helena de 3 a 15 s por mensagem;
  relatório de 15 a 60 s depois do encerramento.
- **API:** os webhooks aceitam até 600 chamadas por minuto vindas do n8n.

### Custos

Tudo usa o **Gemini 2.5 Flash** por padrão, cobrado por quantidade de texto (tokens), áudio e imagem processados. Para
ter uma ideia: uma simulação completa faz cerca de 9 a 10 chamadas à Helena e uma ao Avaliador; um currículo faz uma
chamada ao Headhunter, mais uma por áudio e uma por currículo antigo **escaneado ou em foto**. Currículo antigo em
**PDF com texto** é lido pelo nó *Extract from File*, sem custo de IA — e o Headhunter recebe só o texto, que custa bem
menos que a imagem. Consulte a tabela de preços do Gemini e acompanhe o uso no Google AI Studio / Google Cloud.

Áudios mandados por números sem cadastro também são transcritos antes da verificação do cadastro; isso tem um custo
pequeno, mas existe (e só acontece com eventos que trazem o `WEBHOOK_TOKEN` certo). Um relatório que falha sempre é
tentado no máximo 8 vezes, com espera crescente, em vez de a cada 10 minutos.

### Privacidade (LGPD)

- Para o Gemini vão apenas o necessário: o conteúdo do currículo (sem nome, e-mail, telefone, cidade ou LinkedIn — a API
  nem envia esses dados ao n8n), o primeiro nome do jovem, o resumo do currículo e a conversa da simulação. Áudios vão
  para transcrição.
- **Currículo antigo:** do texto de um PDF, e-mails, telefones e CPFs são trocados por `[omitido]` antes de ir para a
  IA; na leitura de foto ou PDF escaneado, o prompt manda não copiar dados pessoais. O arquivo não fica guardado no
  Impulso Jovem.
- Os nós **Google Gemini** enviam o arquivo (áudio, foto, PDF) pela *Files API* do Google, que o guarda por até 48 horas
  para processamento e depois apaga.
- Segundo os termos da API do Gemini, no **plano gratuito** o Google pode usar o conteúdo enviado para melhorar os
  produtos dele. Como o público inclui adolescentes, use uma chave de projeto **com faturamento ativado** e
  **valide com o jurídico/encarregado de dados** se a política de privacidade do Impulso Jovem cobre o envio desses
  dados ao Google.

#### Retenção das execuções do n8n

Cada execução guardada pelo n8n contém **tudo o que passou pelo fluxo**: as mensagens da simulação, os áudios, o
currículo antigo, a transcrição e o relatório de jovens a partir de 14 anos. Guardar isso sem necessidade aumenta o
estrago de um vazamento e contraria o princípio de minimização da LGPD. Por isso:

- **Os três fluxos já vêm com "Save successful production executions = Do not save"** (no JSON, em `settings`). Só
  ficam guardadas as execuções que terminam com erro. Atenção: falhas que o fluxo trata sozinho (a mensagem "Ops, tive
  um probleminha aqui", um relatório que será tentado de novo) terminam como "sucesso" e também não ficam guardadas.
  Para investigar, ligue o registro por um tempo curto (seção 9.3) e desligue depois.
- **No servidor do n8n**, configure também a retenção global (vale para as execuções com erro e para outros fluxos):

  ```dotenv
  EXECUTIONS_DATA_SAVE_ON_SUCCESS=none   # não guarda execuções bem-sucedidas
  EXECUTIONS_DATA_PRUNE=true             # apaga execuções antigas automaticamente
  EXECUTIONS_DATA_MAX_AGE=72             # horas: guarda as com erro por 3 dias (ajuste com o encarregado de dados)
  EXECUTIONS_DATA_PRUNE_MAX_COUNT=5000   # teto de execuções guardadas
  ```

  Se o n8n é compartilhado com outros fluxos da empresa e vocês preferem não mudar o padrão global, mantenha só a
  configuração dos três fluxos e a limpeza (`EXECUTIONS_DATA_PRUNE` e `EXECUTIONS_DATA_MAX_AGE` curtos).
- Recrie o container do n8n depois de mudar essas variáveis.

#### Outros cuidados

- Restrinja o acesso ao n8n a quem precisa: quem entra no n8n vê as conversas nas execuções guardadas.
- Nos testes, use números e dados fictícios.

---

## 12. Como os fluxos funcionam por dentro

### Construtor de Currículo

`Webhook: currículo` → `⚙️ Configuração` → dois ramos em paralelo, que se juntam em `Juntar materiais` (Merge) →
`Tem o que aproveitar?` → `Headhunter` (Gemini, temperatura 0.2, com o *Structured Output Parser*) →
`A IA respondeu no formato?` → `Montar resposta` → `Responder currículo`.

- **⚙️ Configuração** lê o campo `dados`, guarda só os campos de conteúdo do formulário (título, cidade e UF ficam de
  fora) e repassa os arquivos `audio` e `curriculoAntigo` (o Edit Fields precisa de "Include Other Input Fields" e de
  "Strip Binary Data" desligado para manter arquivos).
- **Ramo do áudio:** `Tem áudio?` → `Transcrever áudio (Gemini)` (nó **Google Gemini → Audio → Analyze**, prompt em
  português: transcrição fiel, sem rótulos de tempo, `[sem fala]` quando não há fala e sem obedecer a pedidos ditos no
  áudio) → `Transcrição`. Falha ou áudio sem fala → `Sem transcrição` (a API avisa o jovem que o áudio não foi
  entendido). *Por que "Analyze" e não "Transcribe a recording"?* É o mesmo nó nativo; o *Transcribe* usa um prompt fixo
  em inglês, sem nenhuma dessas regras.
- **Ramo do currículo antigo:** `Tem currículo antigo?` → `É PDF?` → `Extrair texto do PDF` (*Extract from File*) →
  `PDF tem texto?` (pelo menos `MIN_TEXTO_PDF` caracteres) → `Texto do PDF` (troca e-mails, telefones e CPFs por
  `[omitido]`). PDF escaneado, foto ou falha na extração → `Ler currículo (Gemini)` (**Document → Analyze**, que aceita
  PDF e imagem) → `Texto lido pela IA`; ilegível → `Currículo antigo ilegível` (vira um aviso para o jovem).
- **Nada aproveitável** (ex.: só um áudio sem fala) → `Responder sem conteúdo (422)`, sem gastar o Headhunter. A API
  responde 503 ao jovem sem salvar um currículo vazio.
- **Headhunter:** junta formulário (fonte mais confiável), transcrição e currículo antigo; não inventa nada; junta
  experiências repetidas entre as fontes; ignora dados pessoais; devolve o JSON do contrato. Se o modelo não seguir o
  formato, `A IA respondeu no formato?` transforma isso em erro.
- Qualquer erro → `Responder erro (500)`. A API então salva o currículo só com o formulário e avisa o usuário (ou
  responde 503, se ele mandou só arquivos). A API também limpa e valida tudo de novo (limites, duplicatas, datas) e
  nunca deixa a IA mudar nome, e-mail ou telefone.

### Recrutadora Virtual (Helena)

`Webhook Evolution (mensagens)` → `⚙️ Configuração` → `Ler evento` → `Ler mensagem` → `Mensagem válida?` (Filter) →
`Tipo de mensagem` → (áudio: `Baixar áudio (Evolution)` se não veio no evento → `Preparar áudio` →
`Áudio dentro do limite?` → `Áudio para arquivo` → `Transcrever áudio (Gemini)` → `Entendi o áudio?` →
`Áudio transcrito`) → `Mensagem do candidato` → `Buscar usuário na API` → `Tem cadastro?` → `Comando` → conversa:
`Registrar mensagem do candidato` → `Ler sessão` → `Ainda é a última mensagem?` → `Helena` → `Resposta da Helena` →
`Resposta pronta?` → `Conferir sessão` → `A resposta ainda vale?` → `Registrar resposta da Helena` → `Registrou?` →
`Helena encerrou?` → (`Finalizar simulação (concluída)`) → `Mensagem para o jovem` → `Enviar mensagem (WhatsApp)`.

- **Filtro de entrada (`Mensagem válida?`):** só passa evento com `?token=` igual ao `WEBHOOK_TOKEN`, instância igual a
  `EVOLUTION_INSTANCE`, de uma pessoa (não grupo, status ou canal), que não foi enviado pelo próprio número, com até
  10 minutos (reenvios depois de uma reconexão são ignorados) e com conteúdo (reações, edições e mensagens apagadas
  ficam de fora).
- **Número do remetente:** vem do `remoteJid`. Em contas que usam identificador sem número (LID, `…@lid`), o fluxo usa
  os campos alternativos que a Evolution manda (`remoteJidAlt`, `senderPn`, `participantPn`); sem nenhum deles, o
  evento é ignorado.
- **Áudio:** com "Webhook Base64" ligado o áudio já vem no evento; senão o fluxo baixa pela Evolution. O *Convert to
  File* transforma o base64 em arquivo para o nó do Gemini.
- **Contexto pronto da API:** `Ler sessão` traz o diálogo numerado (`dialogoRecente`), o perfil do jovem em texto
  (`contextoTexto`: currículo e treinos anteriores), as contagens e se a conversa está pausada por cuidado. O prompt da
  Helena é montado direto no nó, sem código.
- **Mensagens em sequência:** cada mensagem gera uma execução. A API registra tudo na ordem certa; se o total de
  mensagens da sessão mudou depois do registro, chegou outra mensagem e quem responde é a execução dela (que já vê
  todas). Antes de registrar a resposta, o fluxo confere de novo; a resposta vai **com o `sessaoId`**, então, se a
  simulação foi encerrada nesse meio-tempo, a API responde 409 e nada é enviado. Um evento repetido pela Evolution
  (mesmo id) ainda é registrado duas vezes na conversa; evitar isso exige guardar o id da mensagem na API (melhoria
  futura).
- **Encerramento:** a resposta da Helena é registrada antes de a sessão ser finalizada. Se a API cancelar a sessão
  (poucas respostas ou cuidado) e a Helena tiver prometido relatório, `Mensagem para o jovem` troca o texto por uma
  explicação gentil.
- **Comandos** (a mensagem inteira, sem diferenciar acentos e maiúsculas): `encerrar`, `finalizar`, `relatório` →
  encerra e pede o relatório; `reiniciar`, `recomeçar` → encerra a atual e a próxima mensagem começa outra;
  `ajuda` → instruções. Imagem, figurinha, vídeo ou documento → pede para responder por texto ou áudio.
- **A Helena** segue um roteiro de 8 etapas (abertura, apresentação, experiência, comportamental, situacional,
  motivação, autoconhecimento e espaço para perguntas), informa em que etapa está (`etapa`, para não pular nem repetir),
  faz uma pergunta por mensagem, não dá feedback durante a entrevista e encerra depois de `MAX_PERGUNTAS`. Ela não pede
  dados sensíveis.
- **Relato de sofrimento ou risco (caminho do CVV):** a Helena acolhe, pausa a simulação e indica o CVV (188,
  cvv.org.br) e, em emergência, 190 ou 192. A resposta vem marcada (`alertaCuidado`) e `Resposta da Helena` garante que
  ela **sempre cite o CVV**. É essa menção, gravada na conversa, que a API usa para **cancelar a sessão sem nota** quando
  ela termina. Daí em diante a Helena só volta ao treino se o jovem pedir (sugerindo *reiniciar*). Ninguém da equipe é
  avisado automaticamente: definir quem acompanha esses casos é uma decisão da equipe e do jurídico.

### Gerador de Relatório

`Webhook: relatório da sessão` ou `A cada 10 minutos` → `⚙️ Configuração` → `Veio uma sessão específica?` →
(`Sessão pedida` ou `Buscar sessões pendentes` → `Uma sessão por item`) → `Buscar transcrição` →
`Pronta para avaliar?` (Filter) → `Avaliador` (Gemini, temperatura 0.2) → `Salvar relatório na API` →
`Enviar resultado?` → `Mensagem do resultado` → `Enviar resultado (WhatsApp)`.

- O webhook responde na hora (`{"message":"Workflow was started"}`); o relatório segue em segundo plano.
- **Fila e novas tentativas (na API):** `sessoes/pendentes` devolve até `LOTE` sessões e anota cada tentativa. A que
  continua sem relatório só volta depois de 10 min, 20, 40... até 6 h; na 8ª falha a API a cancela (`SEM_RELATORIO`).
  Assim uma sessão problemática não gasta IA a cada 10 minutos nem ocupa o lugar das novas.
- `Pronta para avaliar?` só deixa passar sessões `FINALIZADA` (a API só dá esse status a quem atingiu
  `SESSAO_MIN_MENSAGENS_CANDIDATO` respostas e não teve pausa por cuidado), sem cuidado e com respostas.
- O **Avaliador** recebe o diálogo inteiro numerado e o perfil, segue uma rubrica por competência (0–2 ausente,
  3–4 insuficiente, 5–6 em desenvolvimento, 7–8 bom, 9–10 excelente), cita trechos literais do jovem como evidência e
  reescreve a resposta mais fraca no método STAR. Ele não usa relatos de sofrimento como evidência.
- **A API confere antes de salvar:** retira "evidências" que o jovem não disse (sem diferenciar acentos, maiúsculas e
  pontuação), limita as notas a 6 em conversas com menos de 4 respostas, mantém a nota geral perto da média das
  competências (no máximo 1 ponto acima e 1,5 abaixo) e recalcula a classificação pela nota.
- Salvar é idempotente: se a sessão já tiver relatório, a API devolve o existente (`jaExistia`) sem `resultado`, e o
  WhatsApp não é enviado de novo. A mensagem usa o telefone devolvido pela API (o dono da sessão).
- **Modelo:** usamos o Gemini 2.5 Flash por ser rápido, barato e consistente com a rubrica. Um modelo Pro pode dar um
  feedback um pouco mais fino em conversas longas, mas custa e demora bem mais. Para trocar, mude `MODELO_IA`.

---

## 13. Manutenção

- **Ajustar o comportamento da IA:** os prompts ficam nos nós `Headhunter`, `Helena` e `Avaliador` (campo *System
  Message*) e nos nós Google Gemini de leitura (campo *Text Input*). Não use chaves `{` `}` nas *System Messages*:
  versões do n8n as interpretam como variáveis.
- **Trocar o modelo:** `MODELO_IA` e `MODELO_LEITURA` no ⚙️ Configuração de cada fluxo.
- **Mudar o formato de dados:** qualquer mudança nos campos trocados com a API precisa ser feita também no backend e
  registrada em [`ARQUITETURA.md`](./ARQUITETURA.md). Os nós *Structured Output Parser* ("Formato do ...") seguem esse
  contrato.
- **Depois de editar no n8n:** exporte o fluxo (**⋯ → Download**) e substitua o arquivo em `n8n-workflows/`, para a
  versão do projeto não ficar desatualizada. Confira antes se o arquivo exportado não contém chaves: **apague o valor
  de `WEBHOOK_TOKEN`** no arquivo da Recrutadora e confira se `settings` continua com
  `"saveDataSuccessExecution": "none"`.
- **Pausa por cuidado:** a API reconhece a conversa pausada pela menção ao "CVV" numa mensagem da Helena. Se mudar o
  texto de acolhimento, mantenha o CVV nele (o nó "Resposta da Helena" acrescenta a frase do CVV quando a IA esquece).
