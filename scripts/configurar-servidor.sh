#!/usr/bin/env bash
# Configura o backend/.env do Impulso Jovem no servidor e reinicia a API com ele.
# Uso (no servidor):  cd ~/projeto-impulso-jovem && bash scripts/configurar-servidor.sh
#
# - Guarda uma cópia do .env atual antes de mexer (backend/.env.antes-AAAAMMDD-HHMMSS).
# - Pergunta o endereço do site e o do n8n; o resto já vem certo.
# - Chaves secretas: mantém as que já são próprias; gera novas (no próprio servidor) só para as que estão vazias,
#   curtas ou com o valor de exemplo publicado no repositório. Hoje nenhuma dessas chaves protege dado guardado,
#   então trocá-las não apaga nada nem desloga ninguém.
# - Pode rodar de novo quantas vezes quiser.
set -euo pipefail

PASTA="${PASTA:-$HOME/projeto-impulso-jovem}"
cd "$PASTA"
ARQ=backend/.env
NUMERO_HELENA=558899713766 # (88) 9971-3766

if [ ! -f "$ARQ" ]; then
  echo "Não encontrei $PASTA/$ARQ. Me mande um print de: ls -la $PASTA/backend"
  exit 1
fi

# ───────────── Perguntas (antes de mexer em qualquer coisa) ─────────────
perguntar_url() { # perguntar_url "texto" obrigatório(sim|nao) → URL sem barra no fim
  local texto="$1" obrigatorio="$2" resposta
  while true; do
    read -rp "$texto" resposta
    resposta="${resposta%/}"
    resposta="${resposta// /}"
    if [ -z "$resposta" ] && [ "$obrigatorio" = nao ]; then
      echo ""
      return
    fi
    case "$resposta" in
      http://* | https://*)
        echo "$resposta"
        return
        ;;
    esac
    echo "   Precisa começar com http:// ou https://. Tente de novo." >&2
  done
}

echo ""
echo "== Configuração do Impulso Jovem =="
echo ""
SITE="$(perguntar_url "1) Endereço do site que as pessoas abrem no navegador
   (ex.: https://impulsojovem.com.br ou http://IP-DO-SERVIDOR:3000): " sim)"
N8N="$(perguntar_url "2) Endereço do seu n8n (ex.: https://n8n.jose-de-ia.online)
   Deixe vazio e aperte Enter para configurar a IA depois: " nao)"

# ───────────── Funções ─────────────
valor() { # valor atual de uma variável (sem aspas em volta)
  grep -E "^$1=" "$ARQ" | tail -n1 | cut -d= -f2- | sed -E 's/^"(.*)"$/\1/; s/^'"'"'(.*)'"'"'$/\1/' || true
}

definir() { # definir NOME VALOR — troca a linha se existir, senão acrescenta no fim
  local nome="$1" novo="$2" escapado
  if grep -qE "^$nome=" "$ARQ"; then
    escapado="$(printf '%s' "$novo" | sed -e 's/[&|\\]/\\&/g')"
    sed -i -E "s|^$nome=.*|$nome=$escapado|" "$ARQ"
  else
    [ -n "$(tail -c1 "$ARQ")" ] && echo "" >>"$ARQ"
    printf '%s=%s\n' "$nome" "$novo" >>"$ARQ"
  fi
}

e_exemplo() { # e_exemplo VALOR TAMANHO_MINIMO → verdadeiro se estiver vazio, curto ou for valor de exemplo
  local v="$1" minimo="$2"
  [ -z "$v" ] && return 0
  [ "${#v}" -lt "$minimo" ] && return 0
  case "$v" in
    troque* | sua-chave* | cole-aqui* | change* | exemplo* | 0f1e2d3c4b5a69788796a5b4c3d2e1f0*) return 0 ;;
  esac
  [[ "$v" =~ ^(.)\1+$ ]] && return 0
  return 1
}

segredo() { # segredo NOME TAMANHO_MINIMO BYTES [hex64]
  local nome="$1" minimo="$2" bytes="$3" formato="${4:-}" atual
  atual="$(valor "$nome")"
  if e_exemplo "$atual" "$minimo" || { [ "$formato" = hex64 ] && ! [[ "$atual" =~ ^[0-9a-fA-F]{64}$ ]]; }; then
    definir "$nome" "$(openssl rand -hex "$bytes")"
    echo "   • $nome: chave nova gerada"
  else
    echo "   • $nome: mantida (já era uma chave própria)"
  fi
}

# ───────────── Aplicando ─────────────
COPIA="$ARQ.antes-$(date +%Y%m%d-%H%M%S)"
cp "$ARQ" "$COPIA"
chmod 600 "$ARQ" "$COPIA"
echo ""
echo "Cópia do .env antigo: $COPIA"
echo ""
echo "Ajustando:"

definir NODE_ENV production
definir FRONTEND_URL "$SITE"
case "$SITE" in
  https://*) definir COOKIE_SECURE true ;;
  *) definir COOKIE_SECURE false ;;
esac
echo "   • site: $SITE (cookie seguro: $(valor COOKIE_SECURE))"

definir WHATSAPP_NUMERO_BOT "$NUMERO_HELENA"
echo "   • WhatsApp da Helena: $NUMERO_HELENA"

if [ -n "$N8N" ]; then
  definir N8N_CURRICULO_WEBHOOK_URL "$N8N/webhook/curriculo"
  definir N8N_RELATORIO_WEBHOOK_URL "$N8N/webhook/relatorio-entrevista"
  echo "   • n8n: $N8N (webhooks de currículo e relatório)"
elif [ -n "$(valor N8N_CURRICULO_WEBHOOK_URL)" ]; then
  echo "   • n8n: mantido como estava ($(valor N8N_CURRICULO_WEBHOOK_URL))"
else
  echo "   • n8n: não configurado (o currículo funciona sem IA até você rodar de novo com o endereço)"
fi

segredo JWT_ACCESS_SECRET 32 48
segredo DATA_HASH_KEY 32 32
segredo DATA_ENCRYPTION_KEY 64 32 hex64
segredo N8N_API_KEY 32 32

# ───────────── Reinicia a API com o .env novo ─────────────
echo ""
echo "Reiniciando a API com a configuração nova..."
docker compose --profile full up -d --force-recreate api
echo ""
echo "Esperando a API subir (até 60 s)..."
for _ in $(seq 1 30); do
  if docker exec ij-api wget -qO- http://localhost:3333/api/v1/saude >/dev/null 2>&1; then
    echo "API no ar."
    break
  fi
  sleep 2
done
echo ""
echo "Últimas linhas do log da API (pode mandar print):"
docker logs ij-api --tail 15 2>&1 | grep -viE "key|secret|senha|token" || true
echo ""
echo "Pronto! Próximo passo: copiar a N8N_API_KEY para a credencial do n8n."
echo "Para ver a chave (NÃO mande print dela):  grep '^N8N_API_KEY=' $PASTA/$ARQ"
