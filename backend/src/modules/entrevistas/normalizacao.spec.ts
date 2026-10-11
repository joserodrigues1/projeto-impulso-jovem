import {
  cortar,
  itensValidos,
  primeiroNome,
  sanitizarTexto,
  telefoneDoWhatsapp,
  textoLimpo,
} from './normalizacao';

describe('telefoneDoWhatsapp', () => {
  it('aceita número em qualquer formato e o JID do WhatsApp', () => {
    expect(telefoneDoWhatsapp('(61) 99999-9999')).toBe('5561999999999');
    expect(telefoneDoWhatsapp('+55 61 99999-9999')).toBe('5561999999999');
    expect(telefoneDoWhatsapp('5561999999999@s.whatsapp.net')).toBe('5561999999999');
    expect(telefoneDoWhatsapp('5561999999999:12@s.whatsapp.net')).toBe('5561999999999');
    expect(telefoneDoWhatsapp('5561999999999@c.us')).toBe('5561999999999');
  });

  it('recusa IDs que não são telefone (grupos e @lid) e números inválidos', () => {
    expect(telefoneDoWhatsapp('5561999999999@lid')).toBeNull();
    expect(telefoneDoWhatsapp('120363025246125486@g.us')).toBeNull();
    expect(telefoneDoWhatsapp('abc')).toBeNull();
    expect(telefoneDoWhatsapp('123')).toBeNull();
    expect(telefoneDoWhatsapp('')).toBeNull();
  });
});

describe('sanitizarTexto e textoLimpo', () => {
  it('remove caracteres que o PostgreSQL recusa e metades de emoji', () => {
    expect(sanitizarTexto('a\u0000b\u0007c')).toBe('abc');
    expect(sanitizarTexto('x\uD83Dy')).toBe('xy');
    expect(sanitizarTexto('ok 😀')).toBe('ok 😀');
  });

  it('normaliza espaços e quebras de linha', () => {
    expect(sanitizarTexto('  a \r\n\r\n\r\n\r\n  b\t\tc  ')).toBe('a\n\nb c');
    expect(sanitizarTexto('a\nb', false)).toBe('a b');
  });

  it('textoLimpo devolve "" para o que não é texto e corta no limite', () => {
    expect(textoLimpo(42, 10)).toBe('');
    expect(textoLimpo(null, 10)).toBe('');
    expect(textoLimpo('  abcdefghijkl  ', 5)).toBe('abcde');
  });
});

describe('cortar', () => {
  it('não deixa metade de um emoji no final', () => {
    expect(cortar('ab😀', 3)).toBe('ab');
    expect(cortar('abc', 10)).toBe('abc');
  });
});

describe('itensValidos', () => {
  it('converte, descarta os inválidos e para no máximo', () => {
    const dobro = (v: unknown) => (typeof v === 'number' ? v * 2 : null);
    expect(itensValidos([1, 'x', 2, null, 3, 4], 3, dobro)).toEqual([2, 4, 6]);
    expect(itensValidos('não é lista', 3, dobro)).toEqual([]);
  });

  it('olha só o começo de listas enormes', () => {
    const lista = [...Array.from({ length: 1000 }, () => 'x'), 1];
    expect(itensValidos(lista, 3, (v) => (typeof v === 'number' ? v : null))).toEqual([]);
  });
});

describe('primeiroNome', () => {
  it('pega a primeira palavra do nome', () => {
    expect(primeiroNome('  Maria   Souza ')).toBe('Maria');
    expect(primeiroNome('')).toBe('');
  });
});
