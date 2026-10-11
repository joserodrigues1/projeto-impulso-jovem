"use client";

import { useState } from "react";
import Link from "next/link";
import { classeLinkDestaque, RodapeAuth } from "@/components/layout/pagina-auth";
import { Alert, AlertList } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldError, fieldInputClass } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, fetchApi, mensagemDeErro } from "@/lib/api";
import { emailValido } from "@/lib/utils";

export function FormularioRecuperar() {
  const [email, setEmail] = useState("");
  const [erroCampo, setErroCampo] = useState("");
  const [errosApi, setErrosApi] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    setErrosApi([]);
    if (!emailValido(email)) {
      setErroCampo("Informe um e-mail válido, como voce@email.com.");
      document.getElementById("recuperar-email")?.focus();
      return;
    }
    setErroCampo("");
    setEnviando(true);
    try {
      await fetchApi("/auth/recuperar-senha", { method: "POST", body: JSON.stringify({ email: email.trim() }) });
      setEnviado(true);
    } catch (erro) {
      setErrosApi(erro instanceof ApiError ? erro.mensagens : [mensagemDeErro(erro)]);
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <>
        {/* Mensagem neutra de propósito: não revela se o e-mail tem cadastro */}
        <Alert variant="success" title="Pedido recebido">
          Se o e-mail <strong className="break-all">{email.trim()}</strong> estiver cadastrado, você vai receber em
          alguns minutos um link para criar uma nova senha. O link vale por pouco tempo. Confira também a caixa de spam.
        </Alert>
        <div className="mt-6 flex flex-col gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg" className="w-full"
            onClick={() => {
              setEnviado(false);
              setEmail("");
            }}
          >
            Usar outro e-mail
          </Button>
        </div>
        <RodapeAuth>
          Lembrou a senha?{" "}
          <Link href="/login" className={classeLinkDestaque}>
            Voltar para o login
          </Link>
        </RodapeAuth>
      </>
    );
  }

  return (
    <>
      {errosApi.length > 0 && (
        <Alert variant="error" className="mb-6">
          <AlertList itens={errosApi} />
        </Alert>
      )}

      <form onSubmit={enviar} noValidate className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="recuperar-email">E-mail da sua conta</Label>
          <Input
            id="recuperar-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="voce@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={erroCampo ? true : undefined}
            aria-describedby={erroCampo ? "recuperar-email-erro" : undefined}
            required
            className={fieldInputClass}
          />
          <FieldError id="recuperar-email-erro">{erroCampo}</FieldError>
        </div>

        <Button type="submit" size="lg" disabled={enviando} className="w-full">
          {enviando ? "Enviando…" : "Enviar link de redefinição"}
        </Button>
      </form>

      <RodapeAuth>
        Lembrou a senha?{" "}
        <Link href="/login" className={classeLinkDestaque}>
          Voltar para o login
        </Link>
      </RodapeAuth>
    </>
  );
}
