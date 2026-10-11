import { formatarTelefone, normalizarTelefone, variantesTelefone } from './telefone';

describe('telefone', () => {
  describe('normalizarTelefone', () => {
    it.each([
      ['(61) 99999-9999', '5561999999999'],
      ['+55 (61) 99999-9999', '5561999999999'],
      ['061 99999-9999', '5561999999999'],
      ['5561999999999', '5561999999999'],
      ['61 3333-4444', '556133334444'],
      ['556199999999', '556199999999'],
    ])('%s → %s', (entrada, esperado) => {
      expect(normalizarTelefone(entrada)).toBe(esperado);
    });

    it.each(['', '12345', '5501999999999', '(00) 99999-9999', '55619999999999999', 'abc'])(
      'recusa %p',
      (entrada) => {
        expect(normalizarTelefone(entrada)).toBeNull();
      },
    );
  });

  describe('variantesTelefone', () => {
    it('celular com 9º dígito inclui a versão sem ele', () => {
      expect(variantesTelefone('5561999999999')).toEqual(['5561999999999', '556199999999']);
    });

    it('celular sem 9º dígito inclui a versão com ele', () => {
      expect(variantesTelefone('556199999999')).toEqual(['556199999999', '5561999999999']);
    });

    it('telefone fixo não tem variante', () => {
      expect(variantesTelefone('556133334444')).toEqual(['556133334444']);
    });
  });

  describe('formatarTelefone', () => {
    it('formata celular e fixo', () => {
      expect(formatarTelefone('5561999999999')).toBe('(61) 99999-9999');
      expect(formatarTelefone('556133334444')).toBe('(61) 3333-4444');
    });

    it('formata números antigos ainda sem o 55', () => {
      expect(formatarTelefone('61999999999')).toBe('(61) 99999-9999');
    });

    it('devolve o valor original quando não é um telefone válido', () => {
      expect(formatarTelefone('123')).toBe('123');
    });
  });
});
