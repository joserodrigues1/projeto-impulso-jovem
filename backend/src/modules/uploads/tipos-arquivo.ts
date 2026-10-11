/** Tipos de arquivo aceitos nos uploads, reconhecidos pela assinatura binária (magic bytes). */
export interface TipoArquivo {
  mime: 'application/pdf' | 'image/png' | 'image/jpeg';
  extensao: 'pdf' | 'png' | 'jpg';
}

const ASSINATURAS: Array<{ bytes: number[]; tipo: TipoArquivo }> = [
  { bytes: [0x25, 0x50, 0x44, 0x46, 0x2d], tipo: { mime: 'application/pdf', extensao: 'pdf' } }, // %PDF-
  {
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    tipo: { mime: 'image/png', extensao: 'png' },
  },
  { bytes: [0xff, 0xd8, 0xff], tipo: { mime: 'image/jpeg', extensao: 'jpg' } },
];

/** Identifica o tipo real pelo conteúdo — o mimetype enviado pelo navegador pode mentir. */
export function detectarTipoArquivo(conteudo: Buffer): TipoArquivo | null {
  for (const { bytes, tipo } of ASSINATURAS) {
    if (conteudo.length >= bytes.length && bytes.every((b, i) => conteudo[i] === b)) return tipo;
  }
  return null;
}

/**
 * Confere o arquivo: o mimetype declarado E o conteúdo real precisam ser de um dos tipos
 * aceitos (image/jpg conta como image/jpeg). Devolve o tipo real (usado na extensão) ou null.
 */
export function validarTipoArquivo(
  conteudo: Buffer,
  mimetypeDeclarado: string,
  aceitos: ReadonlyArray<TipoArquivo['mime']>,
): TipoArquivo | null {
  const declarado = mimetypeDeclarado
    .toLowerCase()
    .split(';')[0]
    .trim()
    .replace('image/jpg', 'image/jpeg');
  if (!aceitos.some((m) => m === declarado)) return null;
  const tipo = detectarTipoArquivo(conteudo);
  return tipo && aceitos.includes(tipo.mime) ? tipo : null;
}
