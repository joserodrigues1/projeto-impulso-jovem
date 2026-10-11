"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { classeLinkDestaque, RodapeAuth } from "@/components/layout/pagina-auth";
import { Alert, AlertList } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { FieldError, fieldInputClass } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { PasswordInput, PasswordRules } from "@/components/ui/password-input";
import { ApiError, fetchApi, mensagemDeErro } from "@/lib/api";
import { cn, senhaValida } from "@/lib/utils";

export function FormularioRedefinir() {
  const token = useSearchParams().get("token")?.trim() ?? "";

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [tentouEnviar, setTentouEnviar] = useState(false);
  const [errosApi, setErrosApi] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  const erroSenha = tentouEnviar && !senhaValida(novaSenha) ? "A senha ainda não cumpre todas as regras abaixo." : "";
  const erroConfirmacao =
    tentouEnviar && confirmacao !== novaSenha ? "As duas senhas precisam ser iguais." : "";

  // A API só aceita tokens de 20 a 200 caracteres: fora disso o link veio cortado
  if (token.length < 20 || token.length > 200) {
    return (
      <>
        <Alert variant="warning" title="Link incompleto">
          Este endereço não tem o código de redefinição completo. Abra o link exatamente como chegou no seu e-mail ou
          peça um novo.
        </Alert>
        <Link href="/recuperar-senha" className={cn(buttonVariants({ size: "lg" }), "mt-6 w-full")}>
          Pedir um novo link
        </Link>
      </>
    );
  }

  if (concluido) {
    return (
      <>
        <Alert variant="success" title="Senha alterada!">
          Pronto, sua nova senha já está valendo. Agora é só entrar com ela.
        </Alert>
        <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "mt-6 w-full")}>
          Ir para o login
        </Link>
      </>
    );
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    setTentouEnviar(true);
    setErrosApi([]);
    if (!senhaValida(novaSenha)) {
      document.getElementById("redefinir-senha")?.focus();
      return;
    }
    if (confirmacao !== novaSenha) {
      document.getElementById("redefinir-confirmacao")?.focus();
      return;
    }
    setEnviando(true);
    try {
      await fetchApi("/auth/redefinir-senha", { method: "POST", body: JSON.stringify({ token, novaSenha }) });
      setConcluido(true);
    } catch (erro) {
      setErrosApi(erro instanceof ApiError ? erro.mensagens : [mensagemDeErro(erro)]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      {errosApi.length > 0 && (
        <Alert variant="error" className="mb-6">
          <AlertList itens={errosApi} />
          <p className="mt-2">
            Se o link expirou, <Link href="/recuperar-senha">peça um novo</Link>.
          </p>
        </Alert>
      )}

      <form onSubmit={enviar} noValidate className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="redefinir-senha">Nova senha</Label>
          <PasswordInput
            id="redefinir-senha"
            name="novaSenha"
            autoComplete="new-password"
            maxLength={72}
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            aria-invalid={erroSenha ? true : undefined}
            aria-describedby={["redefinir-regras", erroSenha ? "redefinir-senha-erro" : ""].filter(Boolean).join(" ")}
            required
            className={fieldInputClass}
          />
          <PasswordRules id="redefinir-regras" senha={novaSenha} />
          <FieldError id="redefinir-senha-erro">{erroSenha}</FieldError>
        </div>

        <div className="space-y-2">
          <Label htmlFor="redefinir-confirmacao">Confirme a nova senha</Label>
          <PasswordInput
            id="redefinir-confirmacao"
            name="confirmacao"
            autoComplete="new-password"
            maxLength={72}
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            aria-invalid={erroConfirmacao ? true : undefined}
            aria-describedby={erroConfirmacao ? "redefinir-confirmacao-erro" : undefined}
            required
            className={fieldInputClass}
          />
          <FieldError id="redefinir-confirmacao-erro">{erroConfirmacao}</FieldError>
        </div>

        <Button type="submit" size="lg" disabled={enviando} className="w-full">
          {enviando ? "Salvando…" : "Salvar nova senha"}
        </Button>
      </form>

      <RodapeAuth>
        <Link href="/login" className={classeLinkDestaque}>
          Voltar para o login
        </Link>
      </RodapeAuth>
    </>
  );
}
