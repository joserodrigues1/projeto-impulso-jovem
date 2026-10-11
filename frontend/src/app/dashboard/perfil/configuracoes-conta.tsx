"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, KeyRound, ShieldCheck, Trash2, User, type LucideIcon } from "lucide-react";
import { Revelar } from "@/components/movimento";
import { Alert, AlertList } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldError, FieldHint, fieldInputClass } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput, PasswordRules } from "@/components/ui/password-input";
import { limparDadosLocaisDaConta } from "@/components/curriculo/armazenamento";
import { ApiError, fetchApi, mensagemDeErro } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Usuario } from "@/lib/tipos";
import {
  cn,
  digitosTelefone,
  formatarData,
  iniciais,
  mascararTelefone,
  senhaValida,
  telefoneValido,
} from "@/lib/utils";

type Feedback = { tipo: "success" | "error"; mensagens: string[] } | null;

function feedbackDeErro(erro: unknown): Feedback {
  return { tipo: "error", mensagens: erro instanceof ApiError ? erro.mensagens : [mensagemDeErro(erro)] };
}

function MensagemFeedback({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <Alert variant={feedback.tipo}>
      <AlertList itens={feedback.mensagens} />
    </Alert>
  );
}

/** Atalhos para as seções da página (ids dos cartões abaixo). */
const SECOES: Array<{ id: string; rotulo: string }> = [
  { id: "dados-pessoais", rotulo: "Dados pessoais" },
  { id: "alterar-senha", rotulo: "Senha" },
  { id: "seus-dados", rotulo: "Seus dados" },
  { id: "excluir-conta", rotulo: "Excluir conta" },
];

/** Ícone do título de cada cartão, num quadradinho com a cor da marca (ou vermelho, na zona de perigo). */
function IconeTitulo({ icone: Icone, perigo = false }: { icone: LucideIcon; perigo?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-xl",
        perigo
          ? "bg-destructive/10 text-destructive dark:bg-destructive/15"
          : "bg-marca-suave text-marca-forte dark:bg-marca/15 dark:text-marca-clara",
      )}
    >
      <Icone className="size-[1.125rem]" />
    </span>
  );
}

/** Entrada curta de cada cartão ao aparecer na tela. */
function EntradaCartao({ atraso = 0, children }: { atraso?: number; children: React.ReactNode }) {
  return (
    <Revelar y={12} atraso={atraso} quanto={0.1} transition={{ duration: 0.45 }}>
      {children}
    </Revelar>
  );
}

const classeCartaoSecao = "scroll-mt-24";

export function ConfiguracoesConta() {
  const { user } = useAuth();
  // O layout do painel só renderiza com usuário logado
  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <Revelar y={12} transition={{ duration: 0.45 }}>
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
          <div
            aria-hidden="true"
            className="relative flex size-16 shrink-0 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,var(--marca),var(--marca-forte))] font-display text-2xl font-bold text-white shadow-[0_16px_36px_-16px_var(--marca)] sm:size-20 sm:text-3xl"
          >
            {iniciais(user.nomeCompleto)}
            <span className="absolute -right-1 -bottom-1 size-4 rounded-full bg-lima ring-4 ring-background" />
          </div>
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-marca/20 bg-marca/8 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-marca-forte uppercase dark:border-marca-clara/25 dark:text-marca-clara">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-lima" />
              Sua conta
            </p>
            <h1 className="mt-3 font-display text-3xl leading-[1.08] font-bold tracking-tight sm:text-4xl">
              Configurações
            </h1>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              Seus dados, sua senha e o controle da sua conta
              {user.criadoEm ? ` · conta criada em ${formatarData(user.criadoEm)}` : ""}.
            </p>
          </div>
        </header>

        <nav aria-label="Seções desta página" className="mt-6">
          <ul className="flex flex-wrap gap-2">
            {SECOES.map((secao) => (
              <li key={secao.id}>
                <a
                  href={`#${secao.id}`}
                  className="inline-flex h-9 items-center rounded-full border border-border bg-card px-3.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:border-marca/30 hover:text-foreground dark:bg-white/[0.03] dark:hover:border-marca-clara/30"
                >
                  {secao.rotulo}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </Revelar>

      <EntradaCartao atraso={0.05}>
        <DadosPessoais user={user} />
      </EntradaCartao>
      <EntradaCartao>
        <AlterarSenha email={user.email} />
      </EntradaCartao>
      <EntradaCartao>
        <MeusDados />
      </EntradaCartao>
      <EntradaCartao>
        <ExcluirConta />
      </EntradaCartao>
    </div>
  );
}

// ───────────────────────────── Dados pessoais ─────────────────────────────

function DadosPessoais({ user }: { user: Usuario }) {
  const { atualizarUsuario } = useAuth();
  const [nome, setNome] = useState(user.nomeCompleto);
  const [telefone, setTelefone] = useState(mascararTelefone(user.telefone ?? ""));
  const [tentouSalvar, setTentouSalvar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // Quando o usuário muda (depois de salvar aqui ou por outro caminho), os campos acompanham sem remontar
  // o formulário — remontar apagava o aviso "Dados atualizados!" e tirava o foco do botão.
  const [base, setBase] = useState({ nome: user.nomeCompleto, telefone: user.telefone });
  if (base.nome !== user.nomeCompleto || base.telefone !== user.telefone) {
    setBase({ nome: user.nomeCompleto, telefone: user.telefone });
    setNome(user.nomeCompleto);
    setTelefone(mascararTelefone(user.telefone ?? ""));
  }

  // O botão fica desabilitado durante o envio e o navegador tira o foco dele: devolve ao terminar
  const botaoSalvar = useRef<HTMLButtonElement>(null);
  const devolverFoco = useRef(false);
  useEffect(() => {
    if (salvando || !devolverFoco.current) return;
    devolverFoco.current = false;
    if (document.activeElement === document.body) botaoSalvar.current?.focus();
  }, [salvando]);

  const nomeLimpo = nome.trim();
  const erroNome = tentouSalvar && (nomeLimpo.length < 3 || nomeLimpo.length > 150) ? "Informe seu nome completo (de 3 a 150 caracteres)." : "";
  const erroTelefone = tentouSalvar && !telefoneValido(telefone) ? "Informe o WhatsApp com DDD, como (61) 99999-9999." : "";
  const nomeMudou = nomeLimpo !== user.nomeCompleto;
  const telefoneMudou = digitosTelefone(telefone) !== digitosTelefone(user.telefone ?? "");

  async function salvar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (salvando) return;
    setTentouSalvar(true);
    setFeedback(null);
    if (nomeLimpo.length < 3 || nomeLimpo.length > 150) {
      document.getElementById("perfil-nome")?.focus();
      return;
    }
    if (!telefoneValido(telefone)) {
      document.getElementById("perfil-telefone")?.focus();
      return;
    }
    if (!nomeMudou && !telefoneMudou) {
      setFeedback({ tipo: "success", mensagens: ["Nada mudou — seus dados já estão salvos."] });
      return;
    }

    devolverFoco.current = true;
    setSalvando(true);
    try {
      const corpo: { nomeCompleto?: string; telefone?: string } = {};
      if (nomeMudou) corpo.nomeCompleto = nomeLimpo;
      if (telefoneMudou) corpo.telefone = digitosTelefone(telefone);
      const atualizado = await fetchApi<Usuario>("/me", { method: "PATCH", body: JSON.stringify(corpo) });
      setFeedback({ tipo: "success", mensagens: ["Dados atualizados!"] });
      setTentouSalvar(false);
      atualizarUsuario(atualizado);
    } catch (erro) {
      setFeedback(feedbackDeErro(erro));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card id="dados-pessoais" className={classeCartaoSecao}>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <IconeTitulo icone={User} />
          Dados pessoais
        </CardTitle>
        <CardDescription>Esses dados aparecem no seu currículo e identificam você no WhatsApp.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={salvar} noValidate className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="perfil-nome">Nome completo</Label>
            <Input
              id="perfil-nome"
              autoComplete="name"
              maxLength={150}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              aria-invalid={erroNome ? true : undefined}
              aria-describedby={erroNome ? "perfil-nome-erro" : undefined}
              className={fieldInputClass}
            />
            <FieldError id="perfil-nome-erro">{erroNome}</FieldError>
          </div>

          <div className="space-y-2">
            <Label htmlFor="perfil-email">E-mail</Label>
            <Input
              id="perfil-email"
              type="email"
              value={user.email}
              readOnly
              aria-describedby="perfil-email-ajuda"
              className={`${fieldInputClass} cursor-not-allowed opacity-80`}
            />
            <FieldHint id="perfil-email-ajuda">O e-mail é usado para entrar e não pode ser alterado por aqui.</FieldHint>
          </div>

          <div className="space-y-2">
            <Label htmlFor="perfil-telefone">WhatsApp com DDD</Label>
            <Input
              id="perfil-telefone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="(61) 99999-9999"
              value={telefone}
              onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
              aria-invalid={erroTelefone ? true : undefined}
              aria-describedby={["perfil-telefone-ajuda", erroTelefone ? "perfil-telefone-erro" : ""].filter(Boolean).join(" ")}
              className={fieldInputClass}
            />
            <FieldHint id="perfil-telefone-ajuda">
              A recrutadora virtual só reconhece você se a mensagem vier deste número.
            </FieldHint>
            <FieldError id="perfil-telefone-erro">{erroTelefone}</FieldError>
          </div>

          <MensagemFeedback feedback={feedback} />

          <Button ref={botaoSalvar} type="submit" disabled={salvando} className="h-11 px-5">
            {salvando ? "Salvando…" : "Salvar alterações"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ───────────────────────────── Senha ─────────────────────────────

function AlterarSenha({ email }: { email: string }) {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [tentouSalvar, setTentouSalvar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const erroAtual = tentouSalvar && !senhaAtual ? "Digite sua senha atual." : "";
  const erroNova = !tentouSalvar
    ? ""
    : !senhaValida(novaSenha)
      ? "A nova senha ainda não cumpre todas as regras."
      : novaSenha === senhaAtual
        ? "A nova senha precisa ser diferente da atual."
        : "";
  const erroConfirmacao = tentouSalvar && confirmacao !== novaSenha ? "As duas senhas precisam ser iguais." : "";

  async function salvar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (salvando) return;
    setTentouSalvar(true);
    setFeedback(null);
    const primeiroErro = !senhaAtual
      ? "senha-atual"
      : !senhaValida(novaSenha) || novaSenha === senhaAtual
        ? "senha-nova"
        : confirmacao !== novaSenha
          ? "senha-confirmacao"
          : null;
    if (primeiroErro) {
      document.getElementById(primeiroErro)?.focus();
      return;
    }

    setSalvando(true);
    try {
      await fetchApi("/me/senha", { method: "PATCH", body: JSON.stringify({ senhaAtual, novaSenha }) });
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmacao("");
      setTentouSalvar(false);
      setFeedback({
        tipo: "success",
        mensagens: ["Senha alterada! Por segurança, sua conta foi desconectada dos outros aparelhos."],
      });
    } catch (erro) {
      setFeedback(feedbackDeErro(erro));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card id="alterar-senha" className={classeCartaoSecao}>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <IconeTitulo icone={KeyRound} />
          Alterar senha
        </CardTitle>
        <CardDescription>Ao trocar a senha, as outras sessões abertas (em outros aparelhos) são encerradas.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={salvar} noValidate className="space-y-5">
          {/* Ajuda o gerenciador de senhas a saber de qual conta é a senha */}
          <input type="text" name="username" autoComplete="username" value={email} readOnly hidden />

          <div className="space-y-2">
            <Label htmlFor="senha-atual">Senha atual</Label>
            <PasswordInput
              id="senha-atual"
              autoComplete="current-password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              aria-invalid={erroAtual ? true : undefined}
              aria-describedby={erroAtual ? "senha-atual-erro" : undefined}
              className={fieldInputClass}
            />
            <FieldError id="senha-atual-erro">{erroAtual}</FieldError>
          </div>

          <div className="space-y-2">
            <Label htmlFor="senha-nova">Nova senha</Label>
            <PasswordInput
              id="senha-nova"
              autoComplete="new-password"
              maxLength={72}
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              aria-invalid={erroNova ? true : undefined}
              aria-describedby={["senha-nova-regras", erroNova ? "senha-nova-erro" : ""].filter(Boolean).join(" ")}
              className={fieldInputClass}
            />
            <PasswordRules id="senha-nova-regras" senha={novaSenha} />
            <FieldError id="senha-nova-erro">{erroNova}</FieldError>
          </div>

          <div className="space-y-2">
            <Label htmlFor="senha-confirmacao">Confirme a nova senha</Label>
            <PasswordInput
              id="senha-confirmacao"
              autoComplete="new-password"
              maxLength={72}
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              aria-invalid={erroConfirmacao ? true : undefined}
              aria-describedby={erroConfirmacao ? "senha-confirmacao-erro" : undefined}
              className={fieldInputClass}
            />
            <FieldError id="senha-confirmacao-erro">{erroConfirmacao}</FieldError>
          </div>

          <MensagemFeedback feedback={feedback} />

          <Button type="submit" disabled={salvando} className="h-11 px-5">
            {salvando ? "Alterando…" : "Alterar senha"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ───────────────────────────── Exportar dados (LGPD) ─────────────────────────────

function MeusDados() {
  const [baixando, setBaixando] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function exportar() {
    setBaixando(true);
    setFeedback(null);
    try {
      const dados = await fetchApi<unknown>("/me/exportar-dados");
      // O arquivo é montado no próprio navegador — nada fica salvo no servidor
      const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const hoje = new Date();
      const data = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
      const link = document.createElement("a");
      link.href = url;
      link.download = `impulso-jovem-meus-dados-${data}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setFeedback({ tipo: "success", mensagens: ["Pronto! O arquivo foi baixado. Confira a pasta de downloads."] });
    } catch (erro) {
      setFeedback(feedbackDeErro(erro));
    } finally {
      setBaixando(false);
    }
  }

  return (
    <Card id="seus-dados" className={classeCartaoSecao}>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <IconeTitulo icone={ShieldCheck} />
          Seus dados
        </CardTitle>
        <CardDescription>
          Baixe uma cópia de tudo o que guardamos sobre você: conta, currículos, simulações e relatórios. Veja como
          usamos esses dados na <Link href="/privacidade" className="font-semibold text-marca-forte underline-offset-4 hover:underline dark:text-marca-clara">Política de privacidade</Link>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          O arquivo (.json) contém seus dados pessoais. Guarde em um lugar seguro e não compartilhe.
        </p>
        <MensagemFeedback feedback={feedback} />
        <Button type="button" variant="outline" onClick={exportar} disabled={baixando} className="h-11 px-5">
          <Download aria-hidden="true" />
          {baixando ? "Preparando arquivo…" : "Baixar meus dados"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ───────────────────────────── Excluir conta ─────────────────────────────

function ExcluirConta() {
  const router = useRouter();
  const { atualizarUsuario } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [senha, setSenha] = useState("");
  const [excluindo, setExcluindo] = useState(false);
  const [excluida, setExcluida] = useState(false);
  const [erros, setErros] = useState<string[]>([]);
  const campoSenha = useRef<HTMLInputElement>(null);
  const jaSaiu = useRef(false);

  function concluirSaida() {
    if (jaSaiu.current) return;
    jaSaiu.current = true;
    router.replace("/");
    atualizarUsuario(null);
  }

  function aoMudarAberto(abrir: boolean) {
    if (excluindo) return;
    if (excluida) {
      if (!abrir) concluirSaida();
      return;
    }
    setAberto(abrir);
    if (!abrir) {
      setSenha("");
      setErros([]);
    }
  }

  async function excluir(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (excluindo) return;
    if (!senha) {
      setErros(["Digite sua senha para confirmar."]);
      campoSenha.current?.focus();
      return;
    }
    setExcluindo(true);
    setErros([]);
    try {
      await fetchApi("/me/excluir-conta", { method: "POST", body: JSON.stringify({ senha }) });
      // Já apaga as cópias deste navegador (rascunho, foto, progresso), mesmo se a aba for fechada agora
      limparDadosLocaisDaConta();
      setSenha("");
      setExcluida(true);
      // Os cookies já foram apagados pela API; em instantes levamos para a página inicial
      setTimeout(concluirSaida, 5000);
    } catch (erro) {
      setErros(erro instanceof ApiError ? erro.mensagens : [mensagemDeErro(erro)]);
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <Card id="excluir-conta" className={cn(classeCartaoSecao, "border-destructive/30 dark:border-destructive/30")}>
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-destructive">
          <IconeTitulo icone={Trash2} perigo />
          Excluir conta
        </CardTitle>
        <CardDescription>
          Apaga sua conta e tudo o que está ligado a ela: currículos, simulações, mensagens e relatórios. Isso não pode
          ser desfeito.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" variant="destructive" onClick={() => setAberto(true)} className="h-11 px-5">
          <Trash2 aria-hidden="true" />
          Excluir minha conta
        </Button>

        <Dialog open={aberto} onOpenChange={aoMudarAberto} disablePointerDismissal={excluindo || excluida}>
          <DialogContent showCloseButton={!excluindo} initialFocus={campoSenha}>
            {excluida ? (
              <>
                <DialogHeader>
                  <DialogTitle>Conta excluída</DialogTitle>
                  <DialogDescription>
                    Seus dados foram apagados. Obrigado por ter treinado com a gente — você será levado para a página
                    inicial em instantes.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button type="button" onClick={concluirSaida}>
                    Ir para a página inicial
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <form onSubmit={excluir} noValidate className="flex flex-col gap-4">
                <DialogHeader>
                  <DialogTitle>Excluir sua conta de vez?</DialogTitle>
                  <DialogDescription>
                    Vamos apagar sua conta, seus currículos, suas simulações no WhatsApp e os relatórios. Se quiser
                    guardar uma cópia, baixe seus dados antes. Para confirmar, digite sua senha.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                  <Label htmlFor="excluir-senha">Sua senha</Label>
                  <PasswordInput
                    ref={campoSenha}
                    id="excluir-senha"
                    autoComplete="current-password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    aria-invalid={erros.length ? true : undefined}
                    className={fieldInputClass}
                  />
                </div>

                {erros.length > 0 && (
                  <Alert variant="error">
                    <AlertList itens={erros} />
                  </Alert>
                )}

                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />} disabled={excluindo}>
                    Cancelar
                  </DialogClose>
                  <Button type="submit" variant="perigo" disabled={excluindo}>
                    {excluindo ? "Excluindo…" : "Excluir definitivamente"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
