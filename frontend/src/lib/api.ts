export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  // Use Next.js proxy instead of direct backend URL
  // This avoids CORS issues and hardcoding the server IP in production.
  const baseUrl = "/api-proxy";
  
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
    // Garante o envio de cookies para as rotas autenticadas
    credentials: "include", 
  });

  if (!response.ok) {
    let errorMsg = "Erro na requisição";
    try {
      const errorData = await response.json();
      errorMsg = errorData.mensagem || errorData.message || errorMsg;
    } catch {
      // Ignora erro de JSON parsing se o corpo não for JSON
    }
    throw new Error(errorMsg);
  }

  // Verifica se o status é NO_CONTENT (204)
  if (response.status === 204) return null;

  return response.json();
}
