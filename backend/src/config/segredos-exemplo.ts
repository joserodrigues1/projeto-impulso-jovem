/**
 * Detecta segredos copiados do `.env.example` (atual ou de versões antigas) sem troca.
 * Função pura: não lê o ambiente sozinha nem imprime valores — devolve só os NOMES das variáveis.
 */

type NomeSegredo = 'JWT_ACCESS_SECRET' | 'DATA_HASH_KEY' | 'DATA_ENCRYPTION_KEY' | 'N8N_API_KEY';

/** Placeholders publicados no `backend/.env.example` (versões atual e antigas). */
const PLACEHOLDERS: Record<NomeSegredo, readonly string[]> = {
  JWT_ACCESS_SECRET: ['troque-este-segredo-de-acesso-com-pelo-menos-32-caracteres'],
  DATA_HASH_KEY: ['troque-esta-chave-de-hmac-com-pelo-menos-32-caracteres'],
  DATA_ENCRYPTION_KEY: [
    '0f1e2d3c4b5a69788796a5b4c3d2e1f00f1e2d3c4b5a69788796a5b4c3d2e1f0',
    '0'.repeat(64),
  ],
  N8N_API_KEY: [
    'troque-esta-chave-do-n8n-com-pelo-menos-32-caracteres',
    'sua-chave-secreta-para-n8n',
  ],
};

/** Prefixos usados nos exemplos ("troque-...", "sua-chave-..."): ninguém gera um segredo assim. */
const PREFIXOS_EXEMPLO = /^(troque|sua-chave|cole-aqui|change-?me|exemplo)/i;

function pareceExemplo(nome: NomeSegredo, valor: string): boolean {
  const v = valor.trim();
  if (!v) return false;
  if (PLACEHOLDERS[nome].includes(v)) return true;
  if (PREFIXOS_EXEMPLO.test(v)) return true;
  // Um caractere só repetido ("000...0", "aaaa...a")
  return /^(.)\1+$/.test(v);
}

export type SegredosVerificados = Partial<Record<NomeSegredo, string | undefined>>;

/** Nomes das variáveis que ainda estão com valor de exemplo (vazio = tudo certo). */
export function segredosDeExemplo(valores: SegredosVerificados): NomeSegredo[] {
  return (Object.keys(PLACEHOLDERS) as NomeSegredo[]).filter((nome) => {
    const valor = valores[nome];
    return typeof valor === 'string' && pareceExemplo(nome, valor);
  });
}

/** Texto do aviso de inicialização (sem os valores). */
export function avisoSegredosDeExemplo(nomes: string[]): string {
  return [
    '══════════════ ATENÇÃO: SEGREDOS DE EXEMPLO EM PRODUÇÃO ══════════════',
    `As variáveis ${nomes.join(', ')} estão com o valor de exemplo do .env.example (público no repositório).`,
    'Com o JWT_ACCESS_SECRET de exemplo, qualquer pessoa consegue forjar a sessão de qualquer usuário;',
    'com a N8N_API_KEY de exemplo, consegue chamar os webhooks e ler dados dos jovens.',
    'Gere valores novos no backend/.env do servidor (ex.: openssl rand -hex 48 / openssl rand -hex 32)',
    'e reinicie a API. Trocar o JWT_ACCESS_SECRET só obriga a renovar o access token (o refresh continua);',
    'a N8N_API_KEY nova precisa ir também para a credencial "Impulso API (x-api-key)" do n8n.',
    '══════════════════════════════════════════════════════════════════════',
  ].join('\n');
}
