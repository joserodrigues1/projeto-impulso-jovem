import { avisoSegredosDeExemplo, segredosDeExemplo } from './segredos-exemplo';

describe('segredosDeExemplo', () => {
  it('aponta os placeholders do .env.example (atual e antigos) sem devolver valores', () => {
    const nomes = segredosDeExemplo({
      JWT_ACCESS_SECRET: 'troque-este-segredo-de-acesso-com-pelo-menos-32-caracteres',
      DATA_HASH_KEY: 'troque-esta-chave-de-hmac-com-pelo-menos-32-caracteres',
      DATA_ENCRYPTION_KEY: '0f1e2d3c4b5a69788796a5b4c3d2e1f00f1e2d3c4b5a69788796a5b4c3d2e1f0',
      N8N_API_KEY: 'sua-chave-secreta-para-n8n',
    });
    expect(nomes).toEqual([
      'JWT_ACCESS_SECRET',
      'DATA_HASH_KEY',
      'DATA_ENCRYPTION_KEY',
      'N8N_API_KEY',
    ]);

    const aviso = avisoSegredosDeExemplo(nomes);
    expect(aviso).toContain('JWT_ACCESS_SECRET');
    expect(aviso).not.toContain('troque-este');
    expect(aviso).not.toContain('0f1e2d3c');
  });

  it('valores gerados de verdade (e N8N_API_KEY ausente) passam sem aviso', () => {
    expect(
      segredosDeExemplo({
        JWT_ACCESS_SECRET: '9c1d4e7a0b3f6e2d5c8b1a4f7e0d3c6b9a2f5e8d1c4b7a0f3e6d9c2b5a8f1e4d',
        DATA_HASH_KEY: 'k3Jq9vX2mP7tL0wR5yB8nC1fH4gD6sZ',
        DATA_ENCRYPTION_KEY: 'a3f19c0b7d2e4f6a8b1c3d5e7f9a0b2c4d6e8f1a3b5c7d9e0f2a4b6c8d0e1f3a',
        N8N_API_KEY: undefined,
      }),
    ).toEqual([]);
  });

  it('chave de um caractere repetido conta como exemplo', () => {
    expect(
      segredosDeExemplo({ DATA_ENCRYPTION_KEY: '0'.repeat(64), JWT_ACCESS_SECRET: 'a'.repeat(40) }),
    ).toEqual(['JWT_ACCESS_SECRET', 'DATA_ENCRYPTION_KEY']);
  });
});
