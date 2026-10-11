import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AtualizarContaDto } from './usuarios.dto';

async function validar(corpo: object) {
  const dto = plainToInstance(AtualizarContaDto, corpo);
  const erros = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  return { dto, campos: erros.map((e) => e.property) };
}

describe('AtualizarContaDto (PATCH /me)', () => {
  it('campos ausentes não mudam nada', async () => {
    expect((await validar({})).campos).toEqual([]);
  });

  it('null em nome ou telefone é recusado (400), em vez de chegar ao banco (500)', async () => {
    expect((await validar({ nomeCompleto: null })).campos).toEqual(['nomeCompleto']);
    expect((await validar({ telefone: null })).campos).toEqual(['telefone']);
  });

  it('normaliza nome e telefone válidos', async () => {
    const { dto, campos } = await validar({
      nomeCompleto: '  Ana   Souza ',
      telefone: '(61) 99999-0000',
    });
    expect(campos).toEqual([]);
    expect(dto.nomeCompleto).toBe('Ana Souza');
    expect(dto.telefone).toBe('5561999990000');
  });
});
