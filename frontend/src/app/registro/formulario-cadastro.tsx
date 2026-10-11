"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { classeLinkDestaque, RodapeAuth } from "@/components/layout/pagina-auth";
import { Alert, AlertList } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldError, FieldHint, fieldInputClass } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput, PasswordRules } from "@/components/ui/password-input";
import { LoadingScreen } from "@/components/ui/spinner";
import { ApiError, mensagemDeErro } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  caminhoInternoSeguro,
  digitosTelefone,
  emailValido,
  mascararTelefone,
  senhaValida,
  telefoneValido,
} from "@/lib/utils";

type Campo = "nomeCompleto" | "email" | "telefone" | "senha" | "aceite";
type Erros = Partial<Record<Campo, string>>;

interface Dados {
  nomeCompleto: string;
  email: string;
  telefone: string;
  senha: string;
  aceite: boolean;
}

const ORDEM_CAMPOS: Campo[] = ["nomeCompleto", "email", "telefone", "senha", "aceite"];
const ID_CAMPO: Record<Campo, string> = {
  nomeCompleto: "cadastro-nome",
  email: "cadastro-email",
  telefone: "cadastro-telefone",
  senha: "cadastro-senha",
  aceite: "cadastro-aceite",
};

function validar(dados: Dados): Erros {
  const erros: Erros = {};
  const nome = dados.nomeCompleto.trim();
  if (nome.length < 3 || nome.length > 150) erros.nomeCompleto = "Informe seu nome completo (de 3 a 150 caracteres).";
  if (!emailValido(dados.email)) erros.email = "Informe um e-mail válido, como voce@email.com.";
  if (!telefoneValido(dados.telefone)) erros.telefone = "Informe o WhatsApp com DDD, como (61) 99999-9999.";
  if (!senhaValida(dados.senha)) erros.senha = "A senha ainda não cumpre todas as regras abaixo.";
  if (!dados.aceite) erros.aceite = "Para criar a conta, marque que você leu e concorda com os termos.";
  return erros;
}

export function FormularioCadastro() {
  const router = useRouter();
  const parametros = useSearchParams();
  const proximo = parametros.get("proximo");
  // Só aceita caminhos internos — evita redirecionamento aberto via ?proximo=https://…
  const destino = caminhoInternoSeguro(proximo);
  const { user, cadastrar } = useAuth();

  // O consentimento começa DESMARCADO: precisa ser um ato da pessoa (LGPD)
  const [dados, setDados] = useState<Dados>({ nomeCompleto: "", email: "", telefone: "", senha: "", aceite: false });
  const [tentouEnviar, setTentouEnviar] = useState(false);
  const [errosApi, setErrosApi] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  // Depois da primeira tentativa, os erros dos campos acompanham a digitação
  const erros = tentouEnviar ? validar(dados) : {};

  useEffect(() => {
    if (user) router.replace(destino);
  }, [user, destino, router]);

  function alterar<K extends keyof Dados>(campo: K, valor: Dados[K]) {
    setDados((atual) => ({ ...atual, [campo]: valor }));
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    setTentouEnviar(true);
    setErrosApi([]);

    const encontrados = validar(dados);
    const primeiro = ORDEM_CAMPOS.find((campo) => encontrados[campo]);
    if (primeiro) {
      document.getElementById(ID_CAMPO[primeiro])?.focus();
      return;
    }

    setEnviando(true);
    try {
      await cadastrar({
        nomeCompleto: dados.nomeCompleto.trim(),
        email: dados.email.trim(),
        telefone: digitosTelefone(dados.telefone),
        senha: dados.senha,
        aceiteTermos: true,
      });
      // O efeito acima leva para o painel
    } catch (erro) {
      setErrosApi(erro instanceof ApiError ? erro.mensagens : [mensagemDeErro(erro)]);
      setEnviando(false);
    }
  }

  if (user) {
    return <LoadingScreen className="min-h-40" label="Conta pronta! Abrindo o painel…" />;
  }

  const descricao = (campo: Campo, ...extras: string[]) =>
    [...extras, erros[campo] ? `${ID_CAMPO[campo]}-erro` : ""].filter(Boolean).join(" ") || undefined;

  return (
    <>
      {errosApi.length > 0 && (
        <Alert variant="error" className="mb-6" title="Não foi possível criar a conta">
          <AlertList itens={errosApi} />
        </Alert>
      )}

      <form onSubmit={enviar} noValidate className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor={ID_CAMPO.nomeCompleto}>Nome completo</Label>
          <Input
            id={ID_CAMPO.nomeCompleto}
            name="nomeCompleto"
            autoComplete="name"
            autoCapitalize="words"
            placeholder="Como está no seu documento"
            maxLength={150}
            value={dados.nomeCompleto}
            onChange={(e) => alterar("nomeCompleto", e.target.value)}
            aria-invalid={erros.nomeCompleto ? true : undefined}
            aria-describedby={descricao("nomeCompleto")}
            required
            className={fieldInputClass}
          />
          <FieldError id={`${ID_CAMPO.nomeCompleto}-erro`}>{erros.nomeCompleto}</FieldError>
        </div>

        <div className="space-y-2">
          <Label htmlFor={ID_CAMPO.email}>E-mail</Label>
          <Input
            id={ID_CAMPO.email}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="voce@email.com"
            maxLength={100}
            value={dados.email}
            onChange={(e) => alterar("email", e.target.value)}
            aria-invalid={erros.email ? true : undefined}
            aria-describedby={descricao("email")}
            required
            className={fieldInputClass}
          />
          <FieldError id={`${ID_CAMPO.email}-erro`}>{erros.email}</FieldError>
        </div>

        <div className="space-y-2">
          <Label htmlFor={ID_CAMPO.telefone}>WhatsApp com DDD</Label>
          <Input
            id={ID_CAMPO.telefone}
            name="telefone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(61) 99999-9999"
            value={dados.telefone}
            onChange={(e) => alterar("telefone", mascararTelefone(e.target.value))}
            aria-invalid={erros.telefone ? true : undefined}
            aria-describedby={descricao("telefone", `${ID_CAMPO.telefone}-ajuda`)}
            required
            className={fieldInputClass}
          />
          <FieldHint id={`${ID_CAMPO.telefone}-ajuda`}>
            É por esse número que a recrutadora virtual reconhece você no WhatsApp.
          </FieldHint>
          <FieldError id={`${ID_CAMPO.telefone}-erro`}>{erros.telefone}</FieldError>
        </div>

        <div className="space-y-2">
          <Label htmlFor={ID_CAMPO.senha}>Senha</Label>
          <PasswordInput
            id={ID_CAMPO.senha}
            name="senha"
            autoComplete="new-password"
            maxLength={72}
            value={dados.senha}
            onChange={(e) => alterar("senha", e.target.value)}
            aria-invalid={erros.senha ? true : undefined}
            aria-describedby={descricao("senha", `${ID_CAMPO.senha}-regras`)}
            required
            className={fieldInputClass}
          />
          <PasswordRules id={`${ID_CAMPO.senha}-regras`} senha={dados.senha} />
          <FieldError id={`${ID_CAMPO.senha}-erro`}>{erros.senha}</FieldError>
        </div>

        <div className="space-y-2 pt-1">
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/50 p-4 transition-colors duration-200 has-checked:border-marca/35 has-checked:bg-marca-suave has-[[aria-invalid=true]]:border-red-300 dark:bg-white/[0.03] dark:has-checked:border-marca-clara/30 dark:has-checked:bg-marca/10 dark:has-[[aria-invalid=true]]:border-red-400/40">
            <input
              type="checkbox"
              id={ID_CAMPO.aceite}
              name="aceiteTermos"
              checked={dados.aceite}
              onChange={(e) => alterar("aceite", e.target.checked)}
              aria-invalid={erros.aceite ? true : undefined}
              aria-describedby={descricao("aceite")}
              required
              className="mt-0.5 size-5 shrink-0 cursor-pointer rounded accent-marca focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
            <label htmlFor={ID_CAMPO.aceite} className="text-sm leading-relaxed text-muted-foreground">
              Li e concordo com os{" "}
              <Link href="/termos" target="_blank" rel="noopener noreferrer" className={classeLinkDestaque}>
                Termos de uso
                <span className="sr-only"> (abre em nova aba)</span>
              </Link>{" "}
              e com a{" "}
              <Link href="/privacidade" target="_blank" rel="noopener noreferrer" className={classeLinkDestaque}>
                Política de privacidade
                <span className="sr-only"> (abre em nova aba)</span>
              </Link>
              , e autorizo o uso dos meus dados para as finalidades descritas nela.
            </label>
          </div>
          <FieldError id={`${ID_CAMPO.aceite}-erro`}>{erros.aceite}</FieldError>
        </div>

        <Button type="submit" size="lg" disabled={enviando} className="mt-2 w-full">
          {enviando ? "Criando sua conta…" : "Criar minha conta"}
          {!enviando && <ArrowRight aria-hidden="true" data-icon="seta" />}
        </Button>
      </form>

      <RodapeAuth>
        Já tem uma conta?{" "}
        <Link href={proximo ? `/login?proximo=${encodeURIComponent(destino)}` : "/login"} className={classeLinkDestaque}>
          Entrar
        </Link>
      </RodapeAuth>
    </>
  );
}
