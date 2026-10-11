"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { classeLinkDestaque, RodapeAuth } from "@/components/layout/pagina-auth";
import { Alert, AlertList } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { fieldInputClass } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { LoadingScreen } from "@/components/ui/spinner";
import { ApiError, mensagemDeErro } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { caminhoInternoSeguro } from "@/lib/utils";

export function FormularioLogin() {
  const router = useRouter();
  const parametros = useSearchParams();
  const proximo = parametros.get("proximo");
  // Só aceita caminhos internos — evita redirecionamento aberto via ?proximo=https://…
  const destino = caminhoInternoSeguro(proximo);
  const { user, sessaoExpirada, login } = useAuth();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  // Já logado (ou acabou de entrar): segue para o painel
  useEffect(() => {
    if (user) router.replace(destino);
  }, [user, destino, router]);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    setErros([]);
    setEnviando(true);
    try {
      await login({ email: email.trim(), senha });
      // O efeito acima faz o redirecionamento
    } catch (erro) {
      setErros(erro instanceof ApiError ? erro.mensagens : [mensagemDeErro(erro)]);
      setEnviando(false);
    }
  }

  if (user) {
    return <LoadingScreen className="min-h-40" label="Você já está conectado. Abrindo o painel…" />;
  }

  const linkCadastro = proximo ? `/registro?proximo=${encodeURIComponent(destino)}` : "/registro";

  return (
    <>
      {erros.length > 0 ? (
        <Alert variant="error" className="mb-6">
          <AlertList itens={erros} />
        </Alert>
      ) : (
        sessaoExpirada && (
          <Alert variant="info" role="status" className="mb-6">
            Sua sessão expirou. Entre de novo para continuar de onde parou.
          </Alert>
        )
      )}

      <form onSubmit={enviar} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="login-email">E-mail</Label>
          <Input
            id="login-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="voce@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={fieldInputClass}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="login-senha">Senha</Label>
            <Link href="/recuperar-senha" className="rounded-md text-sm font-medium text-marca-forte underline-offset-4 hover:underline dark:text-marca-clara">
              Esqueceu a senha?
            </Link>
          </div>
          <PasswordInput
            id="login-senha"
            name="senha"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            className={fieldInputClass}
          />
        </div>

        <Button type="submit" size="lg" disabled={enviando} className="mt-2 w-full">
          {enviando ? "Entrando…" : "Entrar"}
          {!enviando && <ArrowRight aria-hidden="true" data-icon="seta" />}
        </Button>
      </form>

      <RodapeAuth>
        Ainda não tem conta?{" "}
        <Link href={linkCadastro} className={classeLinkDestaque}>
          Criar conta
        </Link>
      </RodapeAuth>
    </>
  );
}
