export { cn } from "cn"

/** Primeiro nome, para saudações ("Maria Clara Souza" → "Maria"). */
export function primeiroNome(nomeCompleto: string | null | undefined): string {
  return nomeCompleto?.trim().split(/\s+/)[0] ?? ""
}

/** Iniciais para o avatar ("Maria Clara Souza" → "MS"). */
export function iniciais(nomeCompleto: string | null | undefined): string {
  const partes = nomeCompleto?.trim().split(/\s+/).filter(Boolean) ?? []
  if (!partes.length) return "?"
  const primeira = partes[0][0]
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ""
  return `${primeira}${ultima}`.toUpperCase()
}

// ───────────────────────────── Redirecionamento seguro ─────────────────────────────

const ORIGEM_FICTICIA = "http://interno.invalid"

/**
 * Devolve `valor` só se for um caminho interno do site (ex.: "/dashboard/curriculo?x=1").
 * Bloqueia redirecionamento aberto: "//site.com", "https://…", "/\\site.com", caracteres de controle
 * (o navegador remove tab/quebra de linha e "/\t/site.com" viraria "//site.com") e segmentos "."/".."
 * que, depois de normalizados, viram "//site.com" ("/.//site.com", "/%2e//site.com", "/a/..//site.com").
 */
export function caminhoInternoSeguro(valor: string | null | undefined, padrao = "/dashboard"): string {
  if (!valor || valor.length > 2000) return padrao
  if (!valor.startsWith("/") || valor.startsWith("//") || valor.includes("://") || valor.includes("\\")) {
    return padrao
  }
  for (const caractere of valor) {
    const codigo = caractere.charCodeAt(0)
    if (codigo < 0x20 || codigo === 0x7f) return padrao
  }
  try {
    const url = new URL(valor, ORIGEM_FICTICIA)
    if (url.origin !== ORIGEM_FICTICIA) return padrao
    // As checagens valem para o caminho já normalizado, que é o que vai para o router
    const caminho = url.pathname
    if (caminho.startsWith("//") || caminho.includes("\\")) return padrao
    // Voltar para as telas de entrada criaria um ciclo
    if (/^\/(login|registro)(\/|$)/.test(caminho)) return padrao
    const resultado = `${caminho}${url.search}${url.hash}`
    // Garantia final: lido de novo como endereço relativo, continua no próprio site
    if (new URL(resultado, ORIGEM_FICTICIA).origin !== ORIGEM_FICTICIA) return padrao
    return resultado
  } catch {
    return padrao
  }
}

// ───────────────────────────── Telefone (WhatsApp) ─────────────────────────────

/** Só os dígitos do telefone com DDD, sem o código do país nem o zero de operadora (máx. 11). */
export function digitosTelefone(valor: string): string {
  // Igual à API: zeros à esquerda ("061…", "0xx61…") não fazem parte do número
  let digitos = valor.replace(/\D/g, "").replace(/^0+/, "")
  if (digitos.length > 11 && digitos.startsWith("55")) digitos = digitos.slice(2)
  return digitos.slice(0, 11)
}

/** Máscara progressiva: fixo "(61) 3333-4444" (10 dígitos) ou celular "(61) 99999-8888" (11 dígitos). */
export function mascararTelefone(valor: string): string {
  const digitos = digitosTelefone(valor)
  if (!digitos) return ""
  if (digitos.length <= 2) return `(${digitos}`
  const ddd = digitos.slice(0, 2)
  const numero = digitos.slice(2)
  if (numero.length <= 4) return `(${ddd}) ${numero}`
  const corte = digitos.length === 11 ? 5 : 4
  return `(${ddd}) ${numero.slice(0, corte)}-${numero.slice(corte)}`
}

/** Mesmo critério da API: DDD (11–99) + 8 ou 9 dígitos. */
export function telefoneValido(valor: string): boolean {
  return /^[1-9][1-9]\d{8,9}$/.test(digitosTelefone(valor))
}

// ───────────────────────────── Senha ─────────────────────────────

/** Regras de senha da API (8 a 72 caracteres, com letras e números) — exibidas no formulário. */
export const REGRAS_SENHA: ReadonlyArray<{ id: string; texto: string; atende: (senha: string) => boolean }> = [
  { id: "tamanho", texto: "De 8 a 72 caracteres", atende: (s) => s.length >= 8 && s.length <= 72 },
  { id: "letra", texto: "Pelo menos uma letra", atende: (s) => /[A-Za-z]/.test(s) },
  { id: "numero", texto: "Pelo menos um número", atende: (s) => /\d/.test(s) },
]

export function senhaValida(senha: string): boolean {
  return REGRAS_SENHA.every((regra) => regra.atende(senha))
}

/** Validação simples de e-mail no navegador (a API faz a validação completa). */
export function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

// ───────────────────────────── Formatação ─────────────────────────────

/** Data no formato brasileiro ("08/10/2026"). Devolve "" para datas inválidas. */
export function formatarData(iso: string | null | undefined, opcoes?: Intl.DateTimeFormatOptions): string {
  if (!iso) return ""
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return ""
  return data.toLocaleDateString("pt-BR", opcoes ?? { day: "2-digit", month: "2-digit", year: "numeric" })
}

/** Nota com uma casa decimal ("7,5"); "—" quando não há nota. */
export function formatarNota(nota: number | null | undefined): string {
  if (nota === null || nota === undefined || Number.isNaN(nota)) return "—"
  return nota.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}
