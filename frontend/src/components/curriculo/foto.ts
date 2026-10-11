/**
 * Foto do currículo: escolhida no aparelho, recortada em quadrado e reduzida para ~400 px.
 * Fica só no navegador (localStorage) — nunca é enviada ao servidor.
 */

export const FOTO_LADO_PX = 400;
/** Limite do arquivo original, antes de reduzir (fotos de celular costumam ter 3–8 MB). */
export const FOTO_MAX_BYTES = 15 * 1024 * 1024;

function carregarImagem(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    imagem.onload = () => resolve(imagem);
    imagem.onerror = () => reject(new Error("Imagem inválida"));
    imagem.src = url;
  });
}

/** Devolve a foto como JPEG em data URL. Rejeita se o navegador não conseguir abrir a imagem (ex.: HEIC fora do Safari). */
export async function prepararFoto(arquivo: File, lado = FOTO_LADO_PX): Promise<string> {
  const url = URL.createObjectURL(arquivo);
  try {
    const imagem = await carregarImagem(url);
    const largura = imagem.naturalWidth;
    const altura = imagem.naturalHeight;
    if (!largura || !altura) throw new Error("Imagem vazia");

    const recorte = Math.min(largura, altura);
    const sx = (largura - recorte) / 2;
    // Foto em pé: o recorte sobe um pouco, onde costuma estar o rosto
    const sy = altura > largura ? (altura - recorte) * 0.25 : (altura - recorte) / 2;
    const destino = Math.round(Math.min(lado, recorte));

    const canvas = document.createElement("canvas");
    canvas.width = destino;
    canvas.height = destino;
    const contexto = canvas.getContext("2d");
    if (!contexto) throw new Error("Canvas indisponível");
    // PNG com transparência vira fundo branco (o JPEG não tem transparência)
    contexto.fillStyle = "#fff";
    contexto.fillRect(0, 0, destino, destino);
    contexto.imageSmoothingQuality = "high";
    contexto.drawImage(imagem, sx, sy, recorte, recorte, 0, 0, destino, destino);
    return canvas.toDataURL("image/jpeg", 0.86);
  } finally {
    URL.revokeObjectURL(url);
  }
}
