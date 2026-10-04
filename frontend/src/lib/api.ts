export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333/api/v1";
  
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
