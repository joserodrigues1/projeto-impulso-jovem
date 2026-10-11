#!/usr/bin/env bash
# Liga o envio de e-mails do Impulso Jovem (boas-vindas, recuperação e aviso de troca de senha) e manda um teste.
# Uso (no servidor):  cd ~/projeto-impulso-jovem && bash scripts/configurar-email.sh
#
# Padrão: Resend (grátis: 100 e-mails por dia, 3.000 por mês) — smtp.resend.com, porta 465 (TLS), usuário "resend",
# senha = a chave de API criada no painel da Resend. Funciona com qualquer provedor SMTP (porta 465 ou 587).
# A chave é digitada sem aparecer na tela e fica só no backend/.env (há uma cópia do .env antes da mudança).
set -euo pipefail

PASTA="${PASTA:-$HOME/projeto-impulso-jovem}"
cd "$PASTA"
ARQ=backend/.env
[ -f "$ARQ" ] || { echo "Não encontrei $PASTA/$ARQ"; exit 1; }

valor() { grep -E "^$1=" "$ARQ" | tail -n1 | cut -d= -f2- || true; }
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
perguntar() { # perguntar "texto" "padrão" → resposta (ou o padrão com Enter)
  local resposta
  read -rp "$1 [$2]: " resposta
  echo "${resposta:-$2}"
}

echo ""
echo "== E-mail do Impulso Jovem =="
echo "Aperte Enter para aceitar o valor entre colchetes (o padrão já é o da Resend)."
echo ""
HOST="$(perguntar "Servidor SMTP" "smtp.resend.com")"
PORTA="$(perguntar "Porta (465 = TLS direto, 587 = STARTTLS)" "465")"
USUARIO="$(perguntar "Usuário SMTP" "resend")"
read -rsp "Senha SMTP / chave de API (não aparece enquanto digita): " SENHA
echo ""
[ -n "$SENHA" ] || { echo "A senha/chave não pode ficar vazia."; exit 1; }
REMETENTE="$(perguntar "E-mail remetente (precisa ser do domínio verificado no provedor)" "nao-responda@jose-de-ia.online")"
case "$PORTA" in
  465 | 587 | 2525) ;;
  *) echo "Use a porta 465 ou 587."; exit 1 ;;
esac
case "$REMETENTE" in
  *@*.*) ;;
  *) echo "Remetente inválido."; exit 1 ;;
esac

COPIA="$ARQ.antes-email-$(date +%Y%m%d-%H%M%S)"
cp "$ARQ" "$COPIA"
chmod 600 "$ARQ" "$COPIA"
definir SMTP_HOST "$HOST"
definir SMTP_PORT "$PORTA"
definir SMTP_USER "$USUARIO"
definir SMTP_PASS "$SENHA"
definir MAIL_FROM "\"Impulso Jovem <$REMETENTE>\""
unset SENHA
echo ""
echo "Configuração salva (cópia do .env antigo: $COPIA). Reiniciando a API..."
docker compose --profile full up -d --force-recreate api >/dev/null
for _ in $(seq 1 30); do
  docker exec ij-api wget -qO- http://localhost:3333/api/v1/saude >/dev/null 2>&1 && break
  sleep 2
done
echo "API no ar."
echo ""
read -rp "Mandar um e-mail de teste para qual endereço? (Enter para pular): " TESTE
if [ -n "$TESTE" ]; then
  # O teste roda dentro do container, com a mesma configuração que a API usa
  docker exec -e PARA="$TESTE" ij-api node -e '
    const nodemailer = require("nodemailer");
    const e = process.env, porta = Number(e.SMTP_PORT);
    nodemailer.createTransport({
      host: e.SMTP_HOST, port: porta, secure: porta === 465,
      auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASS } : undefined,
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
    }).sendMail({
      from: e.MAIL_FROM.replace(/^"|"$/g, ""), to: e.PARA,
      subject: "Teste de e-mail do Impulso Jovem",
      text: "Se você recebeu esta mensagem, o envio de e-mails do Impulso Jovem está funcionando.",
    }).then((r) => console.log("Enviado! Confira a caixa de entrada (e o spam). Id:", r.messageId))
      .catch((err) => { console.log("Falhou:", err.code || "", err.responseCode || "", String(err.response || err.message).slice(0, 200)); process.exit(1); });
  '
fi
echo ""
echo "Pronto. Para desfazer: cp $COPIA $ARQ && docker compose --profile full up -d --force-recreate api"
