import { Montserrat, Source_Sans_3 } from "next/font/google";
import type { ReactNode } from "react";
import type { ConteudoCurriculo } from "@/lib/tipos";
import styles from "./curriculo.module.css";

const fonteTitulo = Montserrat({ subsets: ["latin"], variable: "--cv-fonte-titulo", display: "swap" });
const fonteTexto = Source_Sans_3({ subsets: ["latin"], variable: "--cv-fonte-texto", display: "swap" });

const NAVY = "#2B5576";
const AZUL_CLARO = "#5BA4D0";

const SITUACAO_SUFIXO = { CURSANDO: " (cursando)", TRANCADO: " (trancado)", CONCLUIDO: "" } as const;

/** Só aceita imagens em data URL (a foto vem do próprio navegador). */
function fotoSegura(foto?: string | null): string | null {
  return foto && /^data:image\/(png|jpe?g|webp);base64,/i.test(foto) ? foto : null;
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  const primeira = partes[0][0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1][0] ?? "") : "";
  return (primeira + ultima).toLocaleUpperCase("pt-BR");
}

/** Link exibível e clicável no PDF — só http(s). */
function linkSeguro(url?: string): { href: string; texto: string } | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    const texto = `${u.hostname.replace(/^www\./, "")}${u.pathname}`.replace(/\/$/, "");
    return { href: u.toString(), texto };
  } catch {
    return null;
  }
}

function OndaTopo() {
  return (
    <svg className={`${styles.onda} ${styles.ondaTopo}`} viewBox="0 0 210 30" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M0 0H210V16C182 19 152 6 106 8C66 10 32 22 0 26Z" fill={NAVY} />
      <path
        d="M0 28.4C32 24.4 66 12.4 106 10.4C152 8.4 182 21.4 210 18.4"
        fill="none"
        stroke={AZUL_CLARO}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function OndaRodape() {
  return (
    <svg className={`${styles.onda} ${styles.ondaRodape}`} viewBox="0 0 210 30" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M0 4C40 7 92 20 142 20.5C172 21 192 16.5 210 14V30H0Z" fill={NAVY} />
      <path
        d="M0 1.8C40 4.8 92 17.8 142 18.3C172 18.8 192 14.3 210 11.8"
        fill="none"
        stroke={AZUL_CLARO}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Ícones simples (traço branco dentro do círculo azul-marinho)
const icones = {
  telefone: (
    <path d="M5.2 2.5 7 4.3c.4.4.4 1 0 1.4l-.9.9a8.6 8.6 0 0 0 3.3 3.3l.9-.9c.4-.4 1-.4 1.4 0l1.8 1.8c.4.4.4 1 0 1.4l-1 1c-.8.8-2 1-3 .5A14 14 0 0 1 2.3 6.5c-.5-1-.3-2.2.5-3l1-1c.4-.4 1-.4 1.4 0Z" />
  ),
  email: (
    <>
      <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
      <path d="m2.5 4.5 5.5 4.3 5.5-4.3" />
    </>
  ),
  link: (
    <>
      <path d="M6.8 9.2a2.6 2.6 0 0 0 3.7 0l2.2-2.2a2.6 2.6 0 0 0-3.7-3.7l-.8.8" />
      <path d="M9.2 6.8a2.6 2.6 0 0 0-3.7 0L3.3 9a2.6 2.6 0 0 0 3.7 3.7l.8-.8" />
    </>
  ),
  local: (
    <>
      <path d="M8 14s-4.5-4.2-4.5-7.5a4.5 4.5 0 0 1 9 0C12.5 9.8 8 14 8 14Z" />
      <circle cx="8" cy="6.5" r="1.6" />
    </>
  ),
};

function Contato({ icone, children }: { icone: keyof typeof icones; children: ReactNode }) {
  return (
    <li className={styles.contato}>
      <span className={styles.iconeContato} aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {icones[icone]}
        </svg>
      </span>
      <span>{children}</span>
    </li>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className={styles.secao}>
      <h3 className={styles.titulo}>{titulo}</h3>
      {children}
    </section>
  );
}

interface Props {
  conteudo: ConteudoCurriculo;
  /** Foto em data URL, guardada só no navegador. */
  foto?: string | null;
}

/** Currículo no modelo visual da Impulso Jovem (página A4). Seções vazias não aparecem. */
export function ModeloCurriculo({ conteudo, foto }: Props) {
  const nome = conteudo.nomeCompleto?.trim() || "Seu nome";
  const classeNome = nome.length > 26 ? styles.nomeLongo : nome.length > 18 ? styles.nomeMedio : "";
  const imagem = fotoSegura(foto);
  const linkedin = linkSeguro(conteudo.linkedin);
  const local = [conteudo.cidade?.trim(), conteudo.uf?.trim()].filter(Boolean).join(" - ");

  const habilidades = (conteudo.habilidades ?? []).filter((h) => h.trim());
  const idiomas = (conteudo.idiomas ?? []).filter((i) => i.idioma?.trim());
  const premiacoes = (conteudo.premiacoes ?? []).filter((p) => p.trim());
  const experiencias = (conteudo.experiencias ?? []).filter((e) => e.empresa?.trim() || e.cargo?.trim());
  const formacao = (conteudo.formacao ?? []).filter((f) => f.instituicao?.trim() || f.curso?.trim());
  const perfil = conteudo.perfilProfissional?.trim();
  const temPainel = habilidades.length > 0 || idiomas.length > 0 || premiacoes.length > 0;

  return (
    <article
      className={`${fonteTitulo.variable} ${fonteTexto.variable} ${styles.folha}`}
      aria-label={`Currículo de ${nome}`}
      lang="pt-BR"
    >
      <OndaTopo />

      <table className={styles.estrutura} role="presentation">
        <thead>
          <tr>
            <td>
              <div className={styles.respiroTopo} />
            </td>
          </tr>
        </thead>
        <tfoot>
          <tr>
            <td>
              <div className={styles.respiroRodape} />
            </td>
          </tr>
        </tfoot>
        <tbody>
          <tr>
            <td>
              <div className={styles.grade}>
                <div className={styles.lateral}>
                  <div className={styles.moldura}>
                    {imagem ? (
                      // eslint-disable-next-line @next/next/no-img-element -- foto local em data URL, não passa pelo otimizador
                      <img className={styles.foto} src={imagem} alt={`Foto de ${nome}`} />
                    ) : (
                      <span className={styles.iniciais} aria-hidden="true">
                        {iniciais(nome)}
                      </span>
                    )}
                  </div>

                  {temPainel && (
                    <div className={styles.painel}>
                      {habilidades.length > 0 && (
                        <Secao titulo="Habilidades">
                          <ul className={`${styles.lista} ${styles.listaPilula}`}>
                            {habilidades.map((h, i) => (
                              <li key={`${i}-${h}`}>{h}</li>
                            ))}
                          </ul>
                        </Secao>
                      )}
                      {idiomas.length > 0 && (
                        <Secao titulo="Idiomas">
                          <ul className={styles.lista}>
                            {idiomas.map((idioma, i) => (
                              <li key={`${i}-${idioma.idioma}`}>
                                {idioma.nivel?.trim() ? `${idioma.idioma} - ${idioma.nivel}` : idioma.idioma}
                              </li>
                            ))}
                          </ul>
                        </Secao>
                      )}
                      {premiacoes.length > 0 && (
                        <Secao titulo="Premiações">
                          <ul className={`${styles.lista} ${styles.listaAnel}`}>
                            {premiacoes.map((p, i) => (
                              <li key={`${i}-${p}`}>{p}</li>
                            ))}
                          </ul>
                        </Secao>
                      )}
                    </div>
                  )}
                </div>

                <div className={styles.principal}>
                  <h2 className={`${styles.nome} ${classeNome}`}>{nome}</h2>
                  <div className={styles.traco} />
                  {conteudo.cargoDesejado?.trim() && <p className={styles.objetivo}>{conteudo.cargoDesejado}</p>}
                  <ul className={styles.contatos}>
                    {conteudo.telefone?.trim() && <Contato icone="telefone">{conteudo.telefone}</Contato>}
                    {conteudo.email?.trim() && <Contato icone="email">{conteudo.email}</Contato>}
                    {linkedin && (
                      <Contato icone="link">
                        <a href={linkedin.href} target="_blank" rel="noopener noreferrer">
                          {linkedin.texto}
                        </a>
                      </Contato>
                    )}
                    {local && <Contato icone="local">{local}</Contato>}
                  </ul>

                  {perfil && (
                    <Secao titulo="Perfil profissional">
                      <p className={styles.paragrafo}>{perfil}</p>
                    </Secao>
                  )}

                  {experiencias.length > 0 && (
                    <Secao titulo="Experiência">
                      {experiencias.map((e, i) => {
                        const atividades = (e.atividades ?? []).filter((a) => a.trim());
                        const linha = [e.cargo?.trim(), e.periodo?.trim()].filter(Boolean).join(" / ");
                        return (
                          <div className={styles.item} key={`${i}-${e.empresa}`}>
                            <h4 className={styles.itemTitulo}>{e.empresa?.trim() || e.cargo}</h4>
                            {linha && <p className={styles.itemSub}>{linha}</p>}
                            {atividades.length > 0 && (
                              <ul className={styles.marcadores}>
                                {atividades.map((a, j) => (
                                  <li key={`${j}-${a}`}>{a}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    </Secao>
                  )}

                  {formacao.length > 0 && (
                    <Secao titulo="Formação acadêmica">
                      {formacao.map((f, i) => (
                        <div className={styles.item} key={`${i}-${f.instituicao}`}>
                          <h4 className={`${styles.itemTitulo} ${styles.instituicao}`}>{f.instituicao?.trim() || f.curso}</h4>
                          {f.periodo?.trim() && <p className={styles.itemSub}>{f.periodo}</p>}
                          {f.curso?.trim() && (
                            <ul className={styles.marcadores}>
                              <li>
                                {f.curso}
                                {f.situacao ? SITUACAO_SUFIXO[f.situacao] : ""}
                              </li>
                            </ul>
                          )}
                        </div>
                      ))}
                    </Secao>
                  )}
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <OndaRodape />
    </article>
  );
}
