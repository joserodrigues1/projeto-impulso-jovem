import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CONTEUDO_MENSAGEM_MAX,
  FinalizarSessaoDto,
  RegistrarEntrevistaDto,
  RegistrarMensagemDto,
  SessoesPendentesQueryDto,
  TEXTO_FEEDBACK_MAX,
} from './entrevistas.dto';

/** Mesmas opções do ValidationPipe global (main.ts). */
async function validar<T extends object>(classe: new () => T, corpo: object) {
  const dto = plainToInstance(classe, corpo);
  const erros = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  return { dto, erros, campos: erros.map((e) => e.property) };
}

const SESSAO_ID = '3f2b8c1e-5d4a-4f6b-9c7d-1e2f3a4b5c6d';

const relatorioValido = {
  notaGeral: 7,
  pontosFortes: [{ titulo: 'Clareza', descricao: 'Respostas diretas' }],
  pontosMelhoria: [{ titulo: 'Exemplos', descricao: 'Use situações reais', comoMelhorar: 'STAR' }],
};

describe('RegistrarEntrevistaDto', () => {
  it('aceita o payload antigo (telefone + cargo + 3 textos)', async () => {
    const { dto, erros } = await validar(RegistrarEntrevistaDto, {
      telefone: '(61) 99999-9999',
      cargoAlvo: 'Jovem Aprendiz Administrativo',
      pontosFortes: 'Comunicação clara',
      pontosMelhoria: ['Dar exemplos', '  ', 'Falar mais devagar'],
      dicasComunicacao: 'Respire antes de responder',
    });
    expect(erros).toEqual([]);
    expect(dto.telefone).toBe('5561999999999');
    expect(dto.pontosMelhoria).toBe('Dar exemplos\nFalar mais devagar');
  });

  it('aceita o payload novo com sessaoId, sem telefone e sem textos', async () => {
    const { erros } = await validar(RegistrarEntrevistaDto, {
      sessaoId: SESSAO_ID,
      notaGeral: 7.5,
      relatorio: relatorioValido,
    });
    expect(erros).toEqual([]);
  });

  it('desembrulha o relatório vindo como string JSON ou { output }', async () => {
    for (const relatorio of [JSON.stringify(relatorioValido), { output: relatorioValido }]) {
      const { dto, erros } = await validar(RegistrarEntrevistaDto, {
        sessaoId: SESSAO_ID,
        relatorio,
      });
      expect(erros).toEqual([]);
      expect(dto.relatorio).toEqual(relatorioValido);
    }
  });

  it('recusa sem relatorio e sem textos', async () => {
    const { campos } = await validar(RegistrarEntrevistaDto, { sessaoId: SESSAO_ID });
    expect(campos).toEqual(
      expect.arrayContaining(['pontosFortes', 'pontosMelhoria', 'dicasComunicacao']),
    );
  });

  it('exige os textos quando o relatorio não é aproveitável', async () => {
    const { campos } = await validar(RegistrarEntrevistaDto, {
      sessaoId: SESSAO_ID,
      relatorio: { resumo: 'sem nota nem pontos' },
    });
    expect(campos).toEqual(expect.arrayContaining(['pontosFortes', 'pontosMelhoria']));

    const comTextos = await validar(RegistrarEntrevistaDto, {
      sessaoId: SESSAO_ID,
      relatorio: { resumo: 'sem nota nem pontos' },
      pontosFortes: 'A',
      pontosMelhoria: 'B',
      dicasComunicacao: 'C',
    });
    expect(comTextos.erros).toEqual([]);
  });

  it('a nota de fora completa um relatório sem nota', async () => {
    const { erros } = await validar(RegistrarEntrevistaDto, {
      sessaoId: SESSAO_ID,
      notaGeral: '6,5',
      relatorio: { ...relatorioValido, notaGeral: undefined },
    });
    expect(erros).toEqual([]);
  });

  it('exige telefone quando não há sessaoId', async () => {
    const { campos } = await validar(RegistrarEntrevistaDto, {
      relatorio: relatorioValido,
    });
    expect(campos).toContain('telefone');
  });

  it('valida telefone, sessaoId, nota e relatorio', async () => {
    const { campos } = await validar(RegistrarEntrevistaDto, {
      sessaoId: 'nao-e-uuid',
      telefone: '123',
      notaGeral: 11,
      relatorio: 'texto qualquer',
      pontosFortes: 'A',
      pontosMelhoria: 'B',
      dicasComunicacao: 'C',
    });
    expect(campos).toEqual(
      expect.arrayContaining(['sessaoId', 'telefone', 'notaGeral', 'relatorio']),
    );
  });

  it('cargo curto demais é ignorado (usa o da sessão) e o longo é cortado', async () => {
    const curto = await validar(RegistrarEntrevistaDto, {
      sessaoId: SESSAO_ID,
      relatorio: relatorioValido,
      cargoAlvo: 'x',
    });
    expect(curto.erros).toEqual([]);
    expect(curto.dto.cargoAlvo).toBeUndefined();

    const longo = await validar(RegistrarEntrevistaDto, {
      sessaoId: SESSAO_ID,
      relatorio: relatorioValido,
      cargoAlvo: 'C'.repeat(300),
    });
    expect(longo.dto.cargoAlvo).toHaveLength(150);
  });

  it('recusa campos desconhecidos', async () => {
    const { campos } = await validar(RegistrarEntrevistaDto, {
      sessaoId: SESSAO_ID,
      relatorio: relatorioValido,
      usuarioId: 'outro',
    });
    expect(campos).toContain('usuarioId');
  });

  it('trata "" e null (expressões vazias do n8n) como campos ausentes', async () => {
    const { dto, erros } = await validar(RegistrarEntrevistaDto, {
      sessaoId: SESSAO_ID,
      telefone: '',
      cargoAlvo: '',
      empresaAlvo: null,
      notaGeral: '',
      relatorio: relatorioValido,
      pontosFortes: '',
      dataRealizacao: '',
    });
    expect(erros).toEqual([]);
    expect(dto.telefone).toBeUndefined();
    expect(dto.cargoAlvo).toBeUndefined();
    expect(dto.notaGeral).toBeUndefined();
    expect(dto.pontosFortes).toBeUndefined();
    expect(dto.dataRealizacao).toBeUndefined();

    const relatorioVazio = await validar(RegistrarEntrevistaDto, {
      telefone: '5561999999999',
      relatorio: '',
      pontosFortes: 'A',
      pontosMelhoria: 'B',
      dicasComunicacao: 'C',
    });
    expect(relatorioVazio.erros).toEqual([]);
    expect(relatorioVazio.dto.relatorio).toBeUndefined();
  });

  it('dataRealizacao: ISO válida vira Date e texto inválido é recusado', async () => {
    const valida = await validar(RegistrarEntrevistaDto, {
      sessaoId: SESSAO_ID,
      relatorio: relatorioValido,
      dataRealizacao: '2026-10-01T10:00:00.000Z',
    });
    expect(valida.erros).toEqual([]);
    expect(valida.dto.dataRealizacao).toEqual(new Date('2026-10-01T10:00:00.000Z'));

    const invalida = await validar(RegistrarEntrevistaDto, {
      sessaoId: SESSAO_ID,
      relatorio: relatorioValido,
      dataRealizacao: 'ontem',
    });
    expect(invalida.campos).toContain('dataRealizacao');
  });

  it('recusa ID do WhatsApp que não é telefone (@lid)', async () => {
    const { campos } = await validar(RegistrarEntrevistaDto, {
      telefone: '5561999999999@lid',
      relatorio: relatorioValido,
    });
    expect(campos).toContain('telefone');
  });

  it('textos acima do limite são recusados', async () => {
    const { campos } = await validar(RegistrarEntrevistaDto, {
      telefone: '5561999999999',
      pontosFortes: 'a'.repeat(TEXTO_FEEDBACK_MAX + 1),
      pontosMelhoria: 'B',
      dicasComunicacao: 'C',
    });
    expect(campos).toEqual(['pontosFortes']);
  });
});

describe('RegistrarMensagemDto', () => {
  it('aceita uma mensagem válida e normaliza telefone e autor', async () => {
    const { dto, erros } = await validar(RegistrarMensagemDto, {
      telefone: '5561999999999@s.whatsapp.net',
      autor: 'candidato',
      conteudo: '  Olá!\r\nTudo bem?  ',
      tipo: 'audio',
      cargoAlvo: 'Jovem Aprendiz',
    });
    expect(erros).toEqual([]);
    expect(dto.telefone).toBe('5561999999999');
    expect(dto.autor).toBe('CANDIDATO');
    expect(dto.tipo).toBe('AUDIO');
    expect(dto.conteudo).toBe('Olá!\nTudo bem?');
  });

  it(`corta o conteúdo em ${CONTEUDO_MENSAGEM_MAX} caracteres e remove \\u0000`, async () => {
    const { dto, erros } = await validar(RegistrarMensagemDto, {
      telefone: '61999999999',
      autor: 'RECRUTADORA',
      conteudo: `a\u0000${'b'.repeat(CONTEUDO_MENSAGEM_MAX + 500)}`,
    });
    expect(erros).toEqual([]);
    expect(dto.conteudo).toHaveLength(CONTEUDO_MENSAGEM_MAX);
    expect(dto.conteudo.includes('\u0000')).toBe(false);
  });

  it('recusa conteúdo vazio, autor/tipo inválidos e telefone inválido', async () => {
    const { campos } = await validar(RegistrarMensagemDto, {
      telefone: 'abc',
      autor: 'ADMIN',
      conteudo: '   ',
      tipo: 'VIDEO',
    });
    expect(campos).toEqual(expect.arrayContaining(['telefone', 'autor', 'conteudo', 'tipo']));
  });

  it('recusa sem telefone', async () => {
    const { campos } = await validar(RegistrarMensagemDto, { autor: 'CANDIDATO', conteudo: 'Oi' });
    expect(campos).toContain('telefone');
  });

  it('aceita o JID com dispositivo e recusa grupos/@lid', async () => {
    const jid = await validar(RegistrarMensagemDto, {
      telefone: '5561999999999:7@s.whatsapp.net',
      autor: 'CANDIDATO',
      conteudo: 'Oi',
    });
    expect(jid.erros).toEqual([]);
    expect(jid.dto.telefone).toBe('5561999999999');

    for (const telefone of ['5561999999999@lid', '120363025246125486@g.us']) {
      const { campos } = await validar(RegistrarMensagemDto, {
        telefone,
        autor: 'CANDIDATO',
        conteudo: 'Oi',
      });
      expect(campos).toContain('telefone');
    }
  });

  it('tipo e cargo vazios são ignorados', async () => {
    const { dto, erros } = await validar(RegistrarMensagemDto, {
      telefone: '5561999999999',
      autor: 'RECRUTADORA',
      conteudo: 'Bem-vinda!',
      tipo: '',
      cargoAlvo: '',
      empresaAlvo: null,
    });
    expect(erros).toEqual([]);
    expect(dto.tipo).toBeUndefined();
    expect(dto.cargoAlvo).toBeUndefined();
    expect(dto.empresaAlvo).toBeUndefined();
  });

  it('sessaoId é opcional: vazio vira ausente e precisa ser UUID', async () => {
    const base = { telefone: '5561999999999', autor: 'RECRUTADORA', conteudo: 'Oi' };
    const vazio = await validar(RegistrarMensagemDto, { ...base, sessaoId: '' });
    expect(vazio.erros).toEqual([]);
    expect(vazio.dto.sessaoId).toBeUndefined();

    const valido = await validar(RegistrarMensagemDto, { ...base, sessaoId: SESSAO_ID });
    expect(valido.erros).toEqual([]);
    expect(valido.dto.sessaoId).toBe(SESSAO_ID);

    expect((await validar(RegistrarMensagemDto, { ...base, sessaoId: 'abc' })).campos).toEqual([
      'sessaoId',
    ]);
  });
});

describe('FinalizarSessaoDto e SessoesPendentesQueryDto', () => {
  it('motivo é opcional e restrito aos valores do contrato', async () => {
    expect((await validar(FinalizarSessaoDto, {})).erros).toEqual([]);
    expect((await validar(FinalizarSessaoDto, { motivo: 'inatividade' })).dto.motivo).toBe(
      'INATIVIDADE',
    );
    expect((await validar(FinalizarSessaoDto, { motivo: 'OUTRO' })).campos).toContain('motivo');
  });

  it('limite padrão 10, de 1 a 50', async () => {
    expect((await validar(SessoesPendentesQueryDto, {})).dto.limite).toBe(10);
    expect((await validar(SessoesPendentesQueryDto, { limite: '25' })).dto.limite).toBe(25);
    expect((await validar(SessoesPendentesQueryDto, { limite: '0' })).campos).toContain('limite');
    expect((await validar(SessoesPendentesQueryDto, { limite: '51' })).campos).toContain('limite');
  });
});
