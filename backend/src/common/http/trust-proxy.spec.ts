import { mascararUrl } from '../logger/mascarar-url';
import { interpretarTrustProxy, TRUST_PROXY_PADRAO, trustProxyInvalido } from './trust-proxy';

describe('interpretarTrustProxy', () => {
  it.each([
    ['true', true],
    ['false', false],
    ['1', 1],
    [' 2 ', 2],
    ['loopback, linklocal, uniquelocal', 'loopback, linklocal, uniquelocal'],
    ['10.0.0.0/8', '10.0.0.0/8'],
    ['172.18.0.0/255.255.0.0, ::1', '172.18.0.0/255.255.0.0, ::1'],
    // Aspas que o `docker run --env-file` não remove
    ['"loopback, linklocal, uniquelocal"', 'loopback, linklocal, uniquelocal'],
    ["'true'", true],
  ])('%p → %p', (entrada, esperado) => {
    expect(interpretarTrustProxy(entrada)).toEqual(esperado);
  });

  it.each(['loopbak', '10.0.0.0/40', '"loopback', 'nginx, uniquelocal'])(
    'valor inválido %p cai no padrão seguro em vez de derrubar a API',
    (entrada) => {
      expect(trustProxyInvalido(entrada)).toBe(true);
      expect(interpretarTrustProxy(entrada)).toBe(TRUST_PROXY_PADRAO);
    },
  );
});

describe('mascararUrl', () => {
  it('remove query string e mascara números longos (telefones)', () => {
    expect(mascararUrl('/api/v1/webhooks/whatsapp/usuario/5561999999999?x=1')).toBe(
      '/api/v1/webhooks/whatsapp/usuario/***',
    );
    expect(mascararUrl('/api/v1/curriculos?pagina=2')).toBe('/api/v1/curriculos');
    expect(mascararUrl(undefined)).toBe('');
  });
});
