import { hashSenha, precisaAtualizarHash, verificarSenha } from './senha';

// Gerado pelo pacote nativo argon2@0.45 (formato dos hashes já gravados no servidor).
const HASH_LEGADO =
  '$argon2id$v=19$m=65536,p=4,t=3$PSIrXD+oBqPCqy8WBrKOZQ$7n4GClVJ+aCQbtodFpJav9vhCJzDoTW3tTPmWABD0Ik';

describe('senha', () => {
  it('aceita a senha correta de um hash gerado pelo argon2 nativo', async () => {
    await expect(verificarSenha(HASH_LEGADO, 'Fixture123')).resolves.toBe(true);
  });

  it('recusa a senha errada de um hash gerado pelo argon2 nativo', async () => {
    await expect(verificarSenha(HASH_LEGADO, 'Errada123')).resolves.toBe(false);
  });

  it('gera hashes argon2id com os parâmetros novos e salt aleatório', async () => {
    const a = await hashSenha('Senha123');
    const b = await hashSenha('Senha123');
    expect(a).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(a).not.toBe(b);
    await expect(verificarSenha(a, 'Senha123')).resolves.toBe(true);
    await expect(verificarSenha(a, 'Senha124')).resolves.toBe(false);
  });

  it('pede para regravar só os hashes com parâmetros diferentes dos atuais', async () => {
    expect(precisaAtualizarHash(HASH_LEGADO)).toBe(true);
    expect(precisaAtualizarHash(await hashSenha('Senha123'))).toBe(false);
    expect(precisaAtualizarHash('')).toBe(true);
  });

  it('trata hash inválido como senha errada, sem lançar erro', async () => {
    await expect(verificarSenha('lixo', 'Senha123')).resolves.toBe(false);
    await expect(verificarSenha('', 'Senha123')).resolves.toBe(false);
  });
});
