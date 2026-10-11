import { detectarTipoArquivo, validarTipoArquivo } from './tipos-arquivo';

const PDF = Buffer.from('%PDF-1.7\n...', 'latin1');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const HTML = Buffer.from('<html><script>alert(1)</script></html>');

describe('tipos de arquivo (magic bytes)', () => {
  it('reconhece PDF, PNG e JPEG pelo conteúdo', () => {
    expect(detectarTipoArquivo(PDF)?.extensao).toBe('pdf');
    expect(detectarTipoArquivo(PNG)?.extensao).toBe('png');
    expect(detectarTipoArquivo(JPEG)?.extensao).toBe('jpg');
    expect(detectarTipoArquivo(HTML)).toBeNull();
    expect(detectarTipoArquivo(Buffer.alloc(0))).toBeNull();
  });

  it('recusa conteúdo disfarçado com mimetype aceito', () => {
    expect(validarTipoArquivo(HTML, 'application/pdf', ['application/pdf'])).toBeNull();
    expect(validarTipoArquivo(HTML, 'image/png', ['image/png', 'image/jpeg'])).toBeNull();
  });

  it('recusa mimetype declarado fora da lista, mesmo com conteúdo válido', () => {
    expect(validarTipoArquivo(PNG, 'image/gif', ['image/png', 'image/jpeg'])).toBeNull();
    expect(validarTipoArquivo(PDF, 'image/png', ['image/png', 'image/jpeg'])).toBeNull();
  });

  it('usa o tipo real do conteúdo para a extensão (image/jpg conta como jpeg)', () => {
    expect(validarTipoArquivo(JPEG, 'image/jpg', ['image/png', 'image/jpeg'])?.mime).toBe(
      'image/jpeg',
    );
    expect(validarTipoArquivo(JPEG, 'image/png', ['image/png', 'image/jpeg'])?.extensao).toBe(
      'jpg',
    );
    expect(validarTipoArquivo(PDF, 'application/pdf', ['application/pdf'])?.extensao).toBe('pdf');
  });
});
