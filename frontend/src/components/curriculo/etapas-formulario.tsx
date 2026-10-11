"use client";

import { forwardRef, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  Briefcase,
  FileText,
  GraduationCap,
  Info,
  Mic,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  TriangleAlert,
  Undo2,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { CURVA_IMPULSO } from "@/components/movimento";
import type { Usuario } from "@/lib/tipos";
import {
  Campo,
  CampoLista,
  classeBotaoPerigo,
  classeBotaoSecundario,
  classeBotaoTexto,
  classeCampo,
  classeErro,
  classeRecado,
  classeSelect,
} from "./campos";
import {
  idCampo,
  LIMITES,
  linhas,
  NIVEIS_IDIOMA,
  novaExperiencia,
  novaFormacao,
  novoIdioma,
  SITUACOES,
  SUGESTOES_HABILIDADES,
  UFS,
  experienciaVazia,
  formacaoVazia,
  idiomaVazio,
  periodoExperiencia,
  periodoFormacao,
  type ErrosFormulario,
  type ExperienciaForm,
  type FormacaoForm,
  type FormularioEstado,
  type IdiomaForm,
} from "./dados-curriculo";
import { EnvioCurriculoAntigo } from "./envio-curriculo-antigo";
import { GravadorAudio, type AudioHistoria } from "./gravador-audio";

export type Alterar = (fn: (anterior: FormularioEstado) => FormularioEstado) => void;

interface PropsBase {
  estado: FormularioEstado;
  erros: ErrosFormulario;
  alterar: Alterar;
  desabilitado: boolean;
}

/** Título de cada etapa — recebe o foco quando a etapa muda (leitores de tela anunciam onde a pessoa está). */
export const TituloEtapa = forwardRef<HTMLHeadingElement, { titulo: string; descricao: ReactNode; icone?: LucideIcon }>(
  function TituloEtapa({ titulo, descricao, icone: Icone }, ref) {
    // O <h2> é sempre o mesmo elemento (recebe o foco); só o conteúdo troca com animação
    return (
      <div className="mb-7 flex items-start gap-4">
        {Icone && (
          <motion.span
            key={titulo}
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.6, rotate: -14 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-marca to-marca-forte text-white shadow-md shadow-marca/25 sm:size-12"
          >
            <Icone className="size-5" />
          </motion.span>
        )}
        <div className="min-w-0 pt-0.5">
          <h2
            ref={ref}
            tabIndex={-1}
            className="scroll-mt-24 font-display text-2xl leading-tight font-bold tracking-tight text-foreground outline-none sm:text-[1.75rem]"
          >
            <motion.span
              key={titulo}
              className="block"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: CURVA_IMPULSO }}
            >
              {titulo}
            </motion.span>
          </h2>
          <motion.p
            key={`d-${titulo}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="mt-1.5 text-sm leading-relaxed text-muted-foreground"
          >
            {descricao}
          </motion.p>
        </div>
      </div>
    );
  },
);

function focarDepois(id: string) {
  window.setTimeout(() => document.getElementById(id)?.focus(), 30);
}

// ───────────────────────────── a) Sobre você ─────────────────────────────

interface PropsSobre extends PropsBase {
  modo: "criar" | "editar";
  iaDisponivel: boolean;
  carregandoConfig: boolean;
  audio: AudioHistoria | null;
  onAudio: (audio: AudioHistoria | null) => void;
  onGravandoChange: (gravando: boolean) => void;
  curriculoAntigo: File | null;
  onCurriculoAntigo: (arquivo: File | null) => void;
}

export function EtapaSobre({
  estado,
  erros,
  alterar,
  desabilitado,
  modo,
  iaDisponivel,
  carregandoConfig,
  audio,
  onAudio,
  onGravandoChange,
  curriculoAntigo,
  onCurriculoAntigo,
}: PropsSobre) {
  const definir = <K extends keyof FormularioEstado>(campo: K, valor: FormularioEstado[K]) =>
    alterar((e) => ({ ...e, [campo]: valor }));

  return (
    <div className="space-y-5">
      <Campo
        id={idCampo.cargoDesejado}
        rotulo="Que vaga você procura?"
        opcional
        dica="Ex.: Jovem Aprendiz Administrativo, Estágio em TI, Atendente."
        erro={erros[idCampo.cargoDesejado]}
      >
        {(aria) => (
          <input
            {...aria}
            type="text"
            value={estado.cargoDesejado}
            onChange={(e) => definir("cargoDesejado", e.target.value)}
            maxLength={LIMITES.cargoDesejado}
            autoComplete="organization-title"
            disabled={desabilitado}
            className={classeCampo}
          />
        )}
      </Campo>

      {/* Coluna da UF na largura do maior nome ("RN – Rio Grande do Norte"): com 12rem fixos, 6 estados eram cortados */}
      <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
        <Campo id={idCampo.cidade} rotulo="Cidade" opcional erro={erros[idCampo.cidade]}>
          {(aria) => (
            <input
              {...aria}
              type="text"
              value={estado.cidade}
              onChange={(e) => definir("cidade", e.target.value)}
              maxLength={LIMITES.cidade}
              autoComplete="address-level2"
              disabled={desabilitado}
              className={classeCampo}
            />
          )}
        </Campo>
        <Campo id={idCampo.uf} rotulo="Estado (UF)" opcional erro={erros[idCampo.uf]}>
          {(aria) => (
            <select
              {...aria}
              value={estado.uf}
              onChange={(e) => definir("uf", e.target.value)}
              autoComplete="address-level1"
              disabled={desabilitado}
              className={classeSelect}
            >
              <option value="">Selecione…</option>
              {UFS.map(([sigla, nome]) => (
                <option key={sigla} value={sigla}>
                  {sigla} – {nome}
                </option>
              ))}
            </select>
          )}
        </Campo>
      </div>

      <Campo
        id={idCampo.linkedin}
        rotulo="LinkedIn"
        opcional
        dica="Copie o endereço do seu perfil, ex.: linkedin.com/in/seu-nome"
        erro={erros[idCampo.linkedin]}
      >
        {(aria) => (
          <input
            {...aria}
            type="url"
            inputMode="url"
            value={estado.linkedin}
            onChange={(e) => definir("linkedin", e.target.value)}
            maxLength={LIMITES.linkedin}
            autoComplete="url"
            placeholder="linkedin.com/in/seu-nome"
            disabled={desabilitado}
            className={classeCampo}
          />
        )}
      </Campo>

      <Campo
        id={idCampo.historia}
        rotulo={modo === "criar" ? "Conte sua história" : "Perfil profissional"}
        opcional={modo === "criar"}
        contador={{ atual: estado.historia.length, limite: LIMITES.historia }}
        dica={
          modo === "criar"
            ? iaDisponivel
              ? "Escreva do seu jeito: quem você é, o que já fez, o que gosta e o que quer aprender. A IA transforma isso num texto profissional."
              : "Escreva como se estivesse se apresentando para uma empresa, em 3 a 5 linhas. Esse texto vai direto para o currículo."
            : "É o texto de apresentação que aparece no topo do currículo (3 a 5 linhas)."
        }
        erro={erros[idCampo.historia]}
      >
        {(aria) => (
          <textarea
            {...aria}
            value={estado.historia}
            onChange={(e) => definir("historia", e.target.value)}
            maxLength={LIMITES.historia}
            rows={6}
            disabled={desabilitado}
            placeholder={
              modo === "criar"
                ? "Ex.: Tenho 17 anos, estou no 2º ano do ensino médio. Ajudo meu tio na loja aos sábados, gosto de tecnologia e quero minha primeira vaga de jovem aprendiz…"
                : undefined
            }
            className={`${classeCampo} min-h-36 resize-y leading-relaxed`}
          />
        )}
      </Campo>

      {modo === "criar" &&
        (iaDisponivel ? (
          <section aria-labelledby="cv-titulo-audio" className="space-y-3">
            <div className="flex items-center gap-3 py-1 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
              <span className="rounded-full border border-border px-3 py-1">ou</span>
              <span className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
            </div>
            <h3 id="cv-titulo-audio" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-foreground">
              <Mic className="size-4 text-marca-forte dark:text-marca-clara" aria-hidden="true" />
              Prefere falar? Grave um áudio
            </h3>
            <GravadorAudio audio={audio} onChange={onAudio} onGravandoChange={onGravandoChange} desabilitado={desabilitado} />

            <h3 id="cv-titulo-antigo" className="flex items-center gap-2 pt-3 font-display text-lg font-bold tracking-tight text-foreground">
              <FileText className="size-4 text-marca-forte dark:text-marca-clara" aria-hidden="true" />
              Já tem um currículo? Aproveite
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Envie o currículo que você já tem, mesmo antigo ou simples. A IA lê, aproveita o que serve e junta com o
              que você contar aqui. O arquivo não fica guardado.
            </p>
            <EnvioCurriculoAntigo arquivo={curriculoAntigo} onChange={onCurriculoAntigo} desabilitado={desabilitado} />
          </section>
        ) : (
          !carregandoConfig && (
            <p className="flex items-start gap-2 rounded-2xl border border-border bg-muted/60 p-3 text-sm leading-relaxed text-muted-foreground dark:bg-white/[0.03]">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              As opções de contar sua história por áudio e de aproveitar um currículo antigo aparecem quando a IA está
              ativa. Por enquanto, escreva no campo acima.
            </p>
          )
        ))}
    </div>
  );
}

// ───────────────────────────── Desfazer remoção ─────────────────────────────

/** Último item removido (para o "Desfazer"). */
export type Removido =
  | { lista: "experiencias"; indice: number; item: ExperienciaForm }
  | { lista: "formacao"; indice: number; item: FormacaoForm };

function AvisoDesfazer({ texto, onDesfazer }: { texto: string; onDesfazer: () => void }) {
  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: CURVA_IMPULSO }}
      className="flex flex-wrap items-center justify-between gap-2 rounded-full border border-border bg-tinta py-1.5 pr-1.5 pl-5 text-sm text-white shadow-lg shadow-tinta/20 dark:bg-tinta-3"
    >
      {texto}
      <button
        type="button"
        onClick={onDesfazer}
        className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold text-lima transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-lima/50"
      >
        <Undo2 className="size-4" aria-hidden="true" />
        Desfazer
      </button>
    </motion.div>
  );
}

/** Cartão de cada experiência/formação: entra e sai com animação e se reorganiza ao remover outro. */
const animacaoBloco = {
  layout: "position" as const,
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.2 } },
  transition: { duration: 0.45, ease: CURVA_IMPULSO },
};

const classeBloco =
  "relative space-y-4 rounded-2xl border border-border bg-muted/40 p-4 sm:p-5 dark:bg-white/[0.025]";

/** Título do bloco (legend flutuante: continua sendo o nome acessível do fieldset, sem ficar em cima da borda). */
function LegendaBloco({ icone: Icone, children }: { icone: LucideIcon; children: ReactNode }) {
  return (
    <legend className="float-left flex w-full items-center gap-2.5 pr-14 font-display text-base font-bold text-foreground sm:pr-32">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-marca/10 text-marca-forte dark:bg-marca/15 dark:text-marca-clara">
        <Icone className="size-4" aria-hidden="true" />
      </span>
      {children}
    </legend>
  );
}

const classeVazio =
  "flex flex-col items-center gap-3 rounded-2xl border border-dashed border-input bg-muted/30 p-6 text-center text-sm leading-relaxed text-muted-foreground dark:bg-white/[0.02]";

// ───────────────────────────── b) Experiências ─────────────────────────────

interface PropsListaRemovivel extends PropsBase {
  removido: Removido | null;
  onRemover: (removido: Removido) => void;
  onDesfazer: () => void;
}

export function EtapaExperiencias({ estado, erros, alterar, desabilitado, removido, onRemover, onDesfazer }: PropsListaRemovivel) {
  const atualizar = (id: string, parcial: Partial<ExperienciaForm>) =>
    alterar((e) => ({ ...e, experiencias: e.experiencias.map((x) => (x.id === id ? { ...x, ...parcial } : x)) }));

  function adicionar() {
    const nova = novaExperiencia();
    alterar((e) => ({ ...e, experiencias: [...e.experiencias, nova] }));
    focarDepois(idCampo.exp(nova.id, "empresa"));
  }

  function remover(indice: number) {
    const item = estado.experiencias[indice];
    alterar((e) => ({ ...e, experiencias: e.experiencias.filter((x) => x.id !== item.id) }));
    if (!experienciaVazia(item)) onRemover({ lista: "experiencias", indice, item });
  }

  const noLimite = estado.experiencias.length >= LIMITES.experiencias;

  return (
    <div className="space-y-5">
      {estado.experiencias.length === 0 && (
        <div className={classeVazio}>
          <span className="flex size-11 items-center justify-center rounded-2xl bg-card text-marca-forte shadow-sm ring-1 ring-border dark:text-marca-clara">
            <Briefcase className="size-5" aria-hidden="true" />
          </span>
          <p>Nenhuma experiência por aqui. Tudo bem! Se quiser, adicione uma — ou siga para a próxima etapa.</p>
        </div>
      )}

      <AnimatePresence initial={false}>
      {estado.experiencias.map((exp, i) => {
        const atividades = linhas(exp.atividades);
        const periodoSalvo = !exp.inicio && !exp.fim && exp.periodoTexto;
        return (
          <motion.fieldset key={exp.id} {...animacaoBloco} className={classeBloco}>
            <LegendaBloco icone={Briefcase}>Experiência {i + 1}</LegendaBloco>
            <button
              type="button"
              onClick={() => remover(i)}
              disabled={desabilitado}
              className={`${classeBotaoPerigo} absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5`}
              aria-label={`Remover experiência ${i + 1}`}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Remover</span>
            </button>

            <div className="clear-both grid gap-4 sm:grid-cols-2">
              <Campo
                id={idCampo.exp(exp.id, "empresa")}
                rotulo="Onde foi?"
                dica="Empresa, loja, ONG, escola ou projeto."
                erro={erros[idCampo.exp(exp.id, "empresa")]}
              >
                {(aria) => (
                  <input
                    {...aria}
                    type="text"
                    value={exp.empresa}
                    onChange={(e) => atualizar(exp.id, { empresa: e.target.value })}
                    maxLength={LIMITES.empresa}
                    disabled={desabilitado}
                    className={classeCampo}
                  />
                )}
              </Campo>
              <Campo
                id={idCampo.exp(exp.id, "cargo")}
                rotulo="O que você fazia?"
                dica="Cargo ou função. Ex.: Ajudante, Voluntário, Estagiário."
                erro={erros[idCampo.exp(exp.id, "cargo")]}
              >
                {(aria) => (
                  <input
                    {...aria}
                    type="text"
                    value={exp.cargo}
                    onChange={(e) => atualizar(exp.id, { cargo: e.target.value })}
                    maxLength={LIMITES.cargo}
                    disabled={desabilitado}
                    className={classeCampo}
                  />
                )}
              </Campo>
              <Campo id={idCampo.exp(exp.id, "inicio")} rotulo="Começou em" opcional erro={erros[idCampo.exp(exp.id, "inicio")]}>
                {(aria) => (
                  <input
                    {...aria}
                    type="month"
                    placeholder="AAAA-MM"
                    value={exp.inicio}
                    onChange={(e) => atualizar(exp.id, { inicio: e.target.value })}
                    disabled={desabilitado}
                    className={classeCampo}
                  />
                )}
              </Campo>
              <Campo id={idCampo.exp(exp.id, "fim")} rotulo="Terminou em" opcional erro={erros[idCampo.exp(exp.id, "fim")]}>
                {(aria) => (
                  <input
                    {...aria}
                    type="month"
                    placeholder="AAAA-MM"
                    value={exp.atual ? "" : exp.fim}
                    onChange={(e) => atualizar(exp.id, { fim: e.target.value })}
                    disabled={desabilitado || exp.atual}
                    className={classeCampo}
                  />
                )}
              </Campo>
            </div>

            <label className="flex min-h-11 w-fit cursor-pointer items-center gap-3 rounded-xl pr-3 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={exp.atual}
                onChange={(e) => atualizar(exp.id, { atual: e.target.checked, fim: e.target.checked ? "" : exp.fim })}
                disabled={desabilitado}
                className="size-5 rounded accent-marca focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              Trabalho aqui atualmente
            </label>

            {periodoSalvo && (
              <p className="text-xs text-muted-foreground">
                Período salvo: “{exp.periodoTexto}”. Preencha as datas se quiser mudar.
              </p>
            )}

            <Campo
              id={idCampo.exp(exp.id, "atividades")}
              rotulo="O que você fazia lá?"
              opcional
              dica={`Uma atividade por linha (até ${LIMITES.atividades}). Ex.: “Atendia clientes no caixa”.`}
              contador={{ atual: atividades.length, limite: LIMITES.atividades }}
              erro={erros[idCampo.exp(exp.id, "atividades")]}
            >
              {(aria) => (
                <textarea
                  {...aria}
                  value={exp.atividades}
                  onChange={(e) => atualizar(exp.id, { atividades: e.target.value })}
                  rows={4}
                  disabled={desabilitado}
                  placeholder={"Atendia clientes no caixa\nOrganizava o estoque"}
                  className={`${classeCampo} resize-y leading-relaxed`}
                />
              )}
            </Campo>
          </motion.fieldset>
        );
      })}
      </AnimatePresence>

      {removido?.lista === "experiencias" && <AvisoDesfazer texto="Experiência removida." onDesfazer={onDesfazer} />}

      <button type="button" onClick={adicionar} disabled={desabilitado || noLimite} className={classeBotaoSecundario}>
        <Plus className="size-4" aria-hidden="true" />
        {estado.experiencias.length ? "Adicionar outra experiência" : "Adicionar experiência"}
      </button>
      {noLimite && (
        <p className="text-xs text-muted-foreground">Você chegou ao limite de {LIMITES.experiencias} experiências.</p>
      )}
    </div>
  );
}

// ───────────────────────────── c) Formação ─────────────────────────────

export function EtapaFormacao({ estado, erros, alterar, desabilitado, removido, onRemover, onDesfazer }: PropsListaRemovivel) {
  const atualizar = (id: string, parcial: Partial<FormacaoForm>) =>
    alterar((e) => ({ ...e, formacao: e.formacao.map((x) => (x.id === id ? { ...x, ...parcial } : x)) }));

  function adicionar() {
    const nova = novaFormacao();
    alterar((e) => ({ ...e, formacao: [...e.formacao, nova] }));
    focarDepois(idCampo.form(nova.id, "instituicao"));
  }

  function remover(indice: number) {
    const item = estado.formacao[indice];
    alterar((e) => ({ ...e, formacao: e.formacao.filter((x) => x.id !== item.id) }));
    if (!formacaoVazia(item)) onRemover({ lista: "formacao", indice, item });
  }

  const noLimite = estado.formacao.length >= LIMITES.formacao;
  const apenasAno = (valor: string) => valor.replace(/\D/g, "").slice(0, 4);

  return (
    <div className="space-y-5">
      {estado.formacao.length === 0 && (
        <div className={classeVazio}>
          <span className="flex size-11 items-center justify-center rounded-2xl bg-card text-marca-forte shadow-sm ring-1 ring-border dark:text-marca-clara">
            <GraduationCap className="size-5" aria-hidden="true" />
          </span>
          <p>Nenhuma formação adicionada. Que tal colocar a sua escola atual?</p>
        </div>
      )}

      <AnimatePresence initial={false}>
      {estado.formacao.map((f, i) => {
        const periodoSalvo = !f.inicio && !f.fim && f.periodoTexto;
        return (
          <motion.fieldset key={f.id} {...animacaoBloco} className={classeBloco}>
            <LegendaBloco icone={GraduationCap}>Formação {i + 1}</LegendaBloco>
            <button
              type="button"
              onClick={() => remover(i)}
              disabled={desabilitado}
              className={`${classeBotaoPerigo} absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5`}
              aria-label={`Remover formação ${i + 1}`}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Remover</span>
            </button>

            <div className="clear-both grid gap-4 sm:grid-cols-2">
              <Campo
                id={idCampo.form(f.id, "instituicao")}
                rotulo="Escola ou instituição"
                erro={erros[idCampo.form(f.id, "instituicao")]}
              >
                {(aria) => (
                  <input
                    {...aria}
                    type="text"
                    value={f.instituicao}
                    onChange={(e) => atualizar(f.id, { instituicao: e.target.value })}
                    maxLength={LIMITES.instituicao}
                    disabled={desabilitado}
                    className={classeCampo}
                  />
                )}
              </Campo>
              <Campo
                id={idCampo.form(f.id, "curso")}
                rotulo="Curso"
                dica="Ex.: Ensino Médio, Técnico em Administração."
                erro={erros[idCampo.form(f.id, "curso")]}
              >
                {(aria) => (
                  <input
                    {...aria}
                    type="text"
                    value={f.curso}
                    onChange={(e) => atualizar(f.id, { curso: e.target.value })}
                    maxLength={LIMITES.curso}
                    disabled={desabilitado}
                    className={classeCampo}
                  />
                )}
              </Campo>
              <Campo id={idCampo.form(f.id, "situacao")} rotulo="Situação" opcional>
                {(aria) => (
                  <select
                    {...aria}
                    value={f.situacao}
                    onChange={(e) => {
                      const situacao = SITUACOES.find((s) => s.valor === e.target.value)?.valor ?? "";
                      atualizar(f.id, { situacao });
                    }}
                    disabled={desabilitado}
                    className={classeSelect}
                  >
                    <option value="">Selecione…</option>
                    {SITUACOES.map((s) => (
                      <option key={s.valor} value={s.valor}>
                        {s.rotulo}
                      </option>
                    ))}
                  </select>
                )}
              </Campo>
              <div className="grid grid-cols-2 gap-4">
                <Campo id={idCampo.form(f.id, "inicio")} rotulo="Ano de início" opcional erro={erros[idCampo.form(f.id, "inicio")]}>
                  {(aria) => (
                    <input
                      {...aria}
                      type="text"
                      inputMode="numeric"
                      placeholder="2022"
                      value={f.inicio}
                      onChange={(e) => atualizar(f.id, { inicio: apenasAno(e.target.value) })}
                      maxLength={4}
                      disabled={desabilitado}
                      className={classeCampo}
                    />
                  )}
                </Campo>
                <Campo
                  id={idCampo.form(f.id, "fim")}
                  rotulo={f.situacao === "CURSANDO" ? "Previsão de fim" : "Ano de fim"}
                  opcional
                  erro={erros[idCampo.form(f.id, "fim")]}
                >
                  {(aria) => (
                    <input
                      {...aria}
                      type="text"
                      inputMode="numeric"
                      placeholder="2025"
                      value={f.fim}
                      onChange={(e) => atualizar(f.id, { fim: apenasAno(e.target.value) })}
                      maxLength={4}
                      disabled={desabilitado}
                      className={classeCampo}
                    />
                  )}
                </Campo>
              </div>
            </div>

            {periodoSalvo && (
              <p className="text-xs text-muted-foreground">
                Período salvo: “{f.periodoTexto}”. Preencha os anos se quiser mudar.
              </p>
            )}
          </motion.fieldset>
        );
      })}
      </AnimatePresence>

      {removido?.lista === "formacao" && <AvisoDesfazer texto="Formação removida." onDesfazer={onDesfazer} />}

      <button type="button" onClick={adicionar} disabled={desabilitado || noLimite} className={classeBotaoSecundario}>
        <Plus className="size-4" aria-hidden="true" />
        {estado.formacao.length ? "Adicionar outra formação" : "Adicionar formação"}
      </button>
      {noLimite && (
        <p className="text-xs text-muted-foreground">Você chegou ao limite de {LIMITES.formacao} formações.</p>
      )}
    </div>
  );
}

// ───────────────────────────── d) Habilidades, idiomas e premiações ─────────────────────────────

const IDIOMAS_COMUNS = ["Português", "Inglês", "Espanhol", "Libras", "Francês", "Italiano", "Alemão", "Japonês", "Mandarim"];

export function EtapaHabilidades({ estado, erros, alterar, desabilitado }: PropsBase) {
  const atualizarIdioma = (id: string, parcial: Partial<IdiomaForm>) =>
    alterar((e) => ({ ...e, idiomas: e.idiomas.map((x) => (x.id === id ? { ...x, ...parcial } : x)) }));

  function adicionarIdioma() {
    const novo = novoIdioma();
    alterar((e) => ({ ...e, idiomas: [...e.idiomas, novo] }));
    focarDepois(idCampo.idioma(novo.id, "idioma"));
  }

  return (
    <div className="space-y-8">
      <CampoLista
        id={idCampo.habilidades}
        rotulo="Habilidades"
        nomeItem="habilidade"
        itens={estado.habilidades}
        onChange={(habilidades) => alterar((e) => ({ ...e, habilidades }))}
        limiteItens={LIMITES.habilidades}
        limiteTexto={LIMITES.habilidade}
        placeholder="Digite e aperte Enter"
        dica="Aperte Enter ou vírgula para adicionar. Vale o que você sabe fazer bem, inclusive fora do trabalho."
        erro={erros[idCampo.habilidades]}
        sugestoes={SUGESTOES_HABILIDADES}
        separarPorVirgula
        inputProps={{ disabled: desabilitado, enterKeyHint: "done" }}
      />

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-foreground">
          Idiomas <span className="font-normal text-muted-foreground">(opcional)</span>
        </legend>
        <datalist id="cv-lista-idiomas">
          {IDIOMAS_COMUNS.map((i) => (
            <option key={i} value={i} />
          ))}
        </datalist>
        {estado.idiomas.map((idioma, i) => (
          <div key={idioma.id} className="grid grid-cols-[1fr_auto] items-start gap-2 sm:grid-cols-[1fr_12rem_auto]">
            <Campo
              id={idCampo.idioma(idioma.id, "idioma")}
              rotulo={<span className="sr-only">Idioma {i + 1}</span>}
              erro={erros[idCampo.idioma(idioma.id, "idioma")]}
            >
              {(aria) => (
                <input
                  {...aria}
                  type="text"
                  list="cv-lista-idiomas"
                  placeholder="Idioma"
                  value={idioma.idioma}
                  onChange={(e) => atualizarIdioma(idioma.id, { idioma: e.target.value })}
                  maxLength={LIMITES.idioma}
                  disabled={desabilitado}
                  className={classeCampo}
                />
              )}
            </Campo>
            <Campo
              id={idCampo.idioma(idioma.id, "nivel")}
              rotulo={<span className="sr-only">Nível do idioma {i + 1}</span>}
              erro={erros[idCampo.idioma(idioma.id, "nivel")]}
              className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto"
            >
              {(aria) => (
                <select
                  {...aria}
                  value={idioma.nivel}
                  onChange={(e) => atualizarIdioma(idioma.id, { nivel: e.target.value })}
                  disabled={desabilitado}
                  className={classeSelect}
                >
                  <option value="">Nível…</option>
                  {NIVEIS_IDIOMA.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              )}
            </Campo>
            <button
              type="button"
              onClick={() => alterar((e) => ({ ...e, idiomas: e.idiomas.filter((x) => x.id !== idioma.id) }))}
              disabled={desabilitado}
              className="col-start-2 row-start-1 inline-flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:col-start-3"
              aria-label={`Remover idioma ${idioma.idioma || i + 1}`}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={adicionarIdioma}
          disabled={desabilitado || estado.idiomas.length >= LIMITES.idiomas}
          className={classeBotaoTexto}
        >
          <Plus className="size-4" aria-hidden="true" />
          Adicionar idioma
        </button>
      </fieldset>

      <CampoLista
        id={idCampo.premiacoes}
        rotulo="Premiações e certificados"
        nomeItem="premiação"
        itens={estado.premiacoes}
        onChange={(premiacoes) => alterar((e) => ({ ...e, premiacoes }))}
        limiteItens={LIMITES.premiacoes}
        limiteTexto={LIMITES.premiacao}
        placeholder="Ex.: Menção honrosa na OBMEP 2023"
        dica="Prêmios, olimpíadas, certificados e cursos livres. Digite um e aperte Enter."
        erro={erros[idCampo.premiacoes]}
        formato="linhas"
        inputProps={{ disabled: desabilitado }}
      />
    </div>
  );
}

// ───────────────────────────── e) Revisão ─────────────────────────────

interface PropsRevisao extends PropsBase {
  modo: "criar" | "editar";
  conta: Usuario | null;
  nomeConta?: string;
  emailConta?: string;
  audio: AudioHistoria | null;
  curriculoAntigo: File | null;
  iaDisponivel: boolean;
  carregandoConfig: boolean;
  usarIa: boolean;
  onUsarIa: (valor: boolean) => void;
  irPara: (indice: number) => void;
}

function BlocoRevisao({
  titulo,
  indice,
  irPara,
  desabilitado,
  children,
}: {
  titulo: string;
  indice: number;
  irPara: (indice: number) => void;
  desabilitado: boolean;
  children: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: CURVA_IMPULSO, delay: 0.06 * (indice + 1) }}
      className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-marca/30 sm:p-5 dark:bg-white/[0.02]"
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2.5 text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">
          <span
            aria-hidden="true"
            className="flex size-6 items-center justify-center rounded-full bg-marca/10 text-[0.7rem] text-marca-forte dark:bg-marca/15 dark:text-marca-clara"
          >
            {indice + 1}
          </span>
          {titulo}
        </h3>
        <button
          type="button"
          onClick={() => irPara(indice)}
          disabled={desabilitado}
          className={`${classeBotaoTexto} min-h-9 px-2`}
          aria-label={`Editar ${titulo.toLowerCase()}`}
        >
          <Pencil className="size-3.5" aria-hidden="true" />
          Editar
        </button>
      </div>
      <div className="text-sm leading-relaxed text-foreground/85">{children}</div>
    </motion.section>
  );
}

const vazio = <span className="text-muted-foreground italic">Nada preenchido</span>;
const classeTermo = "font-medium text-muted-foreground";

export function EtapaRevisao({
  estado,
  erros,
  alterar,
  desabilitado,
  modo,
  conta,
  nomeConta,
  emailConta,
  audio,
  curriculoAntigo,
  iaDisponivel,
  carregandoConfig,
  usarIa,
  onUsarIa,
  irPara,
}: PropsRevisao) {
  const experiencias = estado.experiencias.filter((e) => !experienciaVazia(e));
  const formacao = estado.formacao.filter((f) => !formacaoVazia(f));
  const idiomas = estado.idiomas.filter((i) => !idiomaVazio(i));
  const local = [estado.cidade.trim(), estado.uf].filter(Boolean).join(" - ");
  const nome = conta?.nomeCompleto ?? nomeConta;
  const email = conta?.email ?? emailConta;
  const telefone = conta?.telefoneFormatado || conta?.telefone;

  return (
    <div className="space-y-4">
      <div className={`${classeRecado} flex items-start gap-3 p-4 text-sm`}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-marca/12 text-marca-forte dark:text-marca-clara">
          <UserRound className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold">Seus dados de contato vêm da sua conta:</p>
          <p className="mt-1 break-words">{[nome, email, telefone].filter(Boolean).join(" · ") || "Carregando…"}</p>
          <p className="mt-1 text-muted-foreground">
            Para mudar nome ou telefone, acesse{" "}
            <Link
              href="/dashboard/perfil"
              className="font-semibold text-marca-forte underline underline-offset-2 dark:text-marca-clara"
            >
              Configurações
            </Link>
            .
          </p>
        </div>
      </div>

      <BlocoRevisao titulo="Sobre você" indice={0} irPara={irPara} desabilitado={desabilitado}>
        <dl className="grid gap-1 sm:grid-cols-[9rem_1fr]">
          <dt className={classeTermo}>Vaga</dt>
          <dd>{estado.cargoDesejado.trim() || vazio}</dd>
          <dt className={classeTermo}>Cidade</dt>
          <dd>{local || vazio}</dd>
          <dt className={classeTermo}>LinkedIn</dt>
          <dd className="break-all">{estado.linkedin.trim() || vazio}</dd>
          <dt className={classeTermo}>{modo === "criar" ? "Sua história" : "Perfil"}</dt>
          <dd>
            {estado.historia.trim() ? <span className="line-clamp-3 whitespace-pre-line">{estado.historia.trim()}</span> : null}
            {modo === "criar" && audio && (
              <span className="mt-1 inline-flex items-center gap-1.5 font-medium text-marca-forte dark:text-marca-clara">
                <Mic className="size-3.5" aria-hidden="true" />
                + áudio {audio.origem === "gravacao" ? "gravado" : "enviado"}
                {!usarIa && " (não será usado sem a IA)"}
              </span>
            )}
            {modo === "criar" && curriculoAntigo && (
              <span className="mt-1 flex items-center gap-1.5 font-medium text-marca-forte dark:text-marca-clara">
                <FileText className="size-3.5" aria-hidden="true" />
                + currículo antigo enviado
                {!usarIa && " (não será usado sem a IA)"}
              </span>
            )}
            {!estado.historia.trim() && !(modo === "criar" && (audio || curriculoAntigo)) && vazio}
          </dd>
        </dl>
      </BlocoRevisao>

      <BlocoRevisao titulo={`Experiências (${experiencias.length})`} indice={1} irPara={irPara} desabilitado={desabilitado}>
        {experiencias.length ? (
          <ul className="space-y-1">
            {experiencias.map((e) => (
              <li key={e.id}>
                <strong className="font-semibold text-foreground">{e.empresa || "—"}</strong>
                {e.cargo && ` · ${e.cargo}`}
                {(periodoExperiencia(e.inicio, e.fim, e.atual) || e.periodoTexto) && (
                  <span className="text-muted-foreground"> · {periodoExperiencia(e.inicio, e.fim, e.atual) || e.periodoTexto}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          vazio
        )}
      </BlocoRevisao>

      <BlocoRevisao titulo={`Formação (${formacao.length})`} indice={2} irPara={irPara} desabilitado={desabilitado}>
        {formacao.length ? (
          <ul className="space-y-1">
            {formacao.map((f) => (
              <li key={f.id}>
                <strong className="font-semibold text-foreground">{f.instituicao || "—"}</strong>
                {f.curso && ` · ${f.curso}`}
                {(periodoFormacao(f.inicio, f.fim, f.situacao) || f.periodoTexto) && (
                  <span className="text-muted-foreground"> · {periodoFormacao(f.inicio, f.fim, f.situacao) || f.periodoTexto}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          vazio
        )}
      </BlocoRevisao>

      <BlocoRevisao titulo="Habilidades, idiomas e premiações" indice={3} irPara={irPara} desabilitado={desabilitado}>
        <dl className="grid gap-1 sm:grid-cols-[9rem_1fr]">
          <dt className={classeTermo}>Habilidades</dt>
          <dd>{estado.habilidades.length ? estado.habilidades.join(", ") : vazio}</dd>
          <dt className={classeTermo}>Idiomas</dt>
          <dd>{idiomas.length ? idiomas.map((i) => `${i.idioma}${i.nivel ? ` (${i.nivel})` : ""}`).join(", ") : vazio}</dd>
          <dt className={classeTermo}>Premiações</dt>
          <dd>{estado.premiacoes.length ? estado.premiacoes.join("; ") : vazio}</dd>
        </dl>
      </BlocoRevisao>

      <Campo
        id={idCampo.titulo}
        rotulo="Dê um nome para este currículo"
        opcional
        dica="Ajuda a encontrar depois, se você tiver mais de um. Ex.: “Currículo para jovem aprendiz”."
        erro={erros[idCampo.titulo]}
      >
        {(aria) => (
          <input
            {...aria}
            type="text"
            value={estado.titulo}
            onChange={(e) => alterar((anterior) => ({ ...anterior, titulo: e.target.value }))}
            maxLength={LIMITES.titulo}
            disabled={desabilitado}
            className={classeCampo}
          />
        )}
      </Campo>

      {modo === "criar" && (
        <div
          className={`relative overflow-hidden rounded-2xl p-4 transition-shadow sm:p-5 ${
            usarIa ? "borda-gradiente shadow-md shadow-marca/10" : "border border-border bg-card"
          }`}
        >
          {usarIa && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-16 -right-10 size-40 rounded-full bg-marca/15 blur-2xl"
            />
          )}
          <label className={`relative flex items-start gap-3 ${iaDisponivel ? "cursor-pointer" : "cursor-not-allowed"}`}>
            <input
              type="checkbox"
              checked={usarIa}
              onChange={(e) => onUsarIa(e.target.checked)}
              disabled={desabilitado || !iaDisponivel}
              aria-describedby="cv-ia-explicacao"
              className="mt-0.5 size-5 shrink-0 rounded accent-marca focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <span>
              <span className="flex items-center gap-2 font-display font-bold text-foreground">
                <span
                  aria-hidden="true"
                  className={`flex size-7 items-center justify-center rounded-lg transition-colors ${
                    usarIa ? "bg-marca text-white" : "bg-muted text-muted-foreground dark:bg-white/10"
                  }`}
                >
                  <Sparkles className="size-3.5" />
                </span>
                Usar IA para melhorar meu currículo
              </span>
              <span id="cv-ia-explicacao" className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">
                {carregandoConfig
                  ? "Verificando se a IA está disponível…"
                  : iaDisponivel
                    ? "A IA organiza suas informações, melhora a escrita e deixa tudo com cara de currículo profissional. Ela não inventa experiências. Você pode editar tudo depois."
                    : "A melhoria com IA está indisponível no momento. Vamos montar o currículo com o que você preencheu — e você pode editar tudo depois."}
              </span>
            </span>
          </label>
        </div>
      )}

      {erros[idCampo.conteudo] && (
        <p
          id={idCampo.conteudo}
          tabIndex={-1}
          role="alert"
          className={`${classeErro} flex items-start gap-2 p-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-destructive/30`}
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          {erros[idCampo.conteudo]}
        </p>
      )}
    </div>
  );
}
