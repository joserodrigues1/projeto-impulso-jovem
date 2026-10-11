/**
 * Cliente HTTP da API.
 * Tudo passa pelo proxy do Next (`/api-proxy/*` → API `/api/v1/*`): sem CORS e sem expor o endereço da API.
 * A sessão vive em cookies HttpOnly; quando o access token expira (401), renovamos uma vez e repetimos.
 */

const BASE_URL = "/api-proxy";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Todas as mensagens de validação, quando a API devolve uma lista. */
    readonly mensagens: string[] = [message],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Rotas em que um 401 significa "credencial errada", não "sessão expirada". */
const SEM_RENOVACAO = ["/auth/login", "/auth/refresh", "/auth/logout", "/auth/cadastro"];

/**
 * Evento disparado na `window` quando uma rota autenticada recebeu 401 e a renovação falhou
 * (sessão vencida, encerrada em outra aba ou revogada pela troca de senha). O AuthProvider escuta.
 */
export const EVENTO_SESSAO_EXPIRADA = "ij:sessao-expirada";

function avisarSessaoExpirada() {
  try {
    window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
  } catch {
    // fora do navegador
  }
}

/**
 * "recusada" = a API respondeu 401 no refresh (a sessão acabou de verdade);
 * "indisponivel" = rede/servidor fora do ar ou limite de tentativas (a sessão pode continuar válida).
 */
type Renovacao = "renovada" | "recusada" | "indisponivel";

let renovacaoEmCurso: Promise<Renovacao> | null = null;

/** Renova a sessão uma única vez, mesmo com várias requisições recebendo 401 ao mesmo tempo. */
function renovarSessao(): Promise<Renovacao> {
  renovacaoEmCurso ??= fetch(`${BASE_URL}/auth/refresh`, { method: "POST", credentials: "include" })
    .then((r): Renovacao => (r.ok ? "renovada" : r.status === 401 ? "recusada" : "indisponivel"))
    .catch((): Renovacao => "indisponivel")
    .finally(() => {
      renovacaoEmCurso = null;
    });
  return renovacaoEmCurso;
}

async function erroDaResposta(response: Response): Promise<ApiError> {
  let mensagens: string[] = [];
  try {
    const corpo = await response.json();
    const bruto = corpo?.mensagem ?? corpo?.message;
    mensagens = Array.isArray(bruto) ? bruto.map(String) : bruto ? [String(bruto)] : [];
  } catch {
    // corpo não é JSON
  }
  if (!mensagens.length) {
    mensagens = [
      response.status === 429
        ? "Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo."
        : response.status >= 500
          ? "O servidor está com instabilidade. Tente novamente em instantes."
          : "Não foi possível concluir a ação.",
    ];
  }
  return new ApiError(mensagens[0], response.status, mensagens);
}

export async function fetchApi<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const ehFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = new Headers(options.headers);
  if (!ehFormData && options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const executar = () =>
    fetch(`${BASE_URL}${endpoint}`, { ...options, headers, credentials: "include" });

  let response: Response;
  let sessaoExpirou = false;
  try {
    response = await executar();
    if (response.status === 401 && !SEM_RENOVACAO.some((r) => endpoint.startsWith(r))) {
      const renovacao = await renovarSessao();
      if (renovacao === "renovada") response = await executar();
      else sessaoExpirou = renovacao === "recusada";
    }
  } catch {
    throw new ApiError("Sem conexão com o servidor. Verifique sua internet.", 0);
  }

  if (sessaoExpirou) avisarSessaoExpirada();

  if (!response.ok) throw await erroDaResposta(response);
  if (response.status === 204) return null as T;

  const texto = await response.text();
  return (texto ? JSON.parse(texto) : null) as T;
}

/** Mensagem amigável para exibir na tela a partir de qualquer erro. */
export function mensagemDeErro(erro: unknown, padrao = "Algo deu errado. Tente novamente."): string {
  if (erro instanceof ApiError) return erro.message;
  if (erro instanceof Error && erro.message) return erro.message;
  return padrao;
}
