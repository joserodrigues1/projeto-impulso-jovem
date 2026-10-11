import { BadRequestException, HttpException, PayloadTooLargeException } from '@nestjs/common';
import {
  AUDIO_MAX_BYTES,
  CURRICULO_ANTIGO_MAX_BYTES,
  detectarFormatoAudio,
  detectarFormatoCurriculoAntigo,
  extrairDadosDoCorpo,
  MENSAGENS_ENTRADA,
  validarArquivosCurriculo,
  validarAudio,
  validarCurriculoAntigo,
  validarDados,
} from './curriculo-entrada';
import { AtualizarCurriculoDto, GerarCurriculoDto } from './curriculos.dto';

/** Arquivo de teste: assinatura + preenchimento até o tamanho pedido. */
function arquivoComAssinatura(assinatura: number[] | string, tamanho = 4096, deslocamento = 0) {
  const bytes =
    typeof assinatura === 'string' ? [...Buffer.from(assinatura, 'latin1')] : assinatura;
  const buffer = Buffer.alloc(tamanho, 0x11);
  Buffer.from(bytes).copy(buffer, deslocamento);
  return buffer;
}

const ASSINATURAS = {
  webm: arquivoComAssinatura([0x1a, 0x45, 0xdf, 0xa3]),
  ogg: arquivoComAssinatura('OggS'),
  wav: (() => {
    const b = arquivoComAssinatura('RIFF');
    b.write('WAVE', 8, 'latin1');
    return b;
  })(),
  mp4: arquivoComAssinatura('ftypM4A ', 4096, 4),
  mp3Id3: arquivoComAssinatura('ID3'),
  mp3Quadro: arquivoComAssinatura([0xff, 0xfb, 0x90]),
  aac: arquivoComAssinatura([0xff, 0xf1, 0x50]),
};

/** Mensagens (string ou lista) de uma exceção HTTP. */
function mensagens(erro: unknown): string[] {
  if (!(erro instanceof HttpException)) throw erro;
  const corpo = erro.getResponse();
  const msg = typeof corpo === 'string' ? corpo : (corpo as { message: string | string[] }).message;
  return Array.isArray(msg) ? msg : [msg];
}

async function erroDe(promessa: Promise<unknown> | (() => unknown)): Promise<unknown> {
  try {
    await (typeof promessa === 'function' ? promessa() : promessa);
  } catch (e) {
    return e;
  }
  throw new Error('era esperado um erro');
}

describe('detectarFormatoAudio', () => {
  it.each([
    ['webm', ASSINATURAS.webm],
    ['ogg', ASSINATURAS.ogg],
    ['wav', ASSINATURAS.wav],
    ['mp4', ASSINATURAS.mp4],
    ['mp3', ASSINATURAS.mp3Id3],
    ['mp3', ASSINATURAS.mp3Quadro],
    ['aac', ASSINATURAS.aac],
  ])('reconhece %s', (formato, buffer) => {
    expect(detectarFormatoAudio(buffer)).toBe(formato);
  });

  it.each([
    ['PNG', arquivoComAssinatura([0x89, 0x50, 0x4e, 0x47])],
    ['PDF', arquivoComAssinatura('%PDF-1.7')],
    ['texto', Buffer.from('<script>alert(1)</script>'.repeat(100))],
    ['RIFF sem WAVE (AVI)', arquivoComAssinatura('RIFF....AVI ')],
    ['vazio', Buffer.alloc(0)],
  ])('recusa %s', (_nome, buffer) => {
    expect(detectarFormatoAudio(buffer)).toBeNull();
  });
});

describe('validarAudio', () => {
  it('aceita o áudio do navegador com parâmetros no tipo e usa o tipo real do arquivo', () => {
    const audio = validarAudio({ buffer: ASSINATURAS.webm, mimetype: 'audio/webm;codecs=opus' });
    expect(audio).toEqual({
      buffer: ASSINATURAS.webm,
      mimeType: 'audio/webm',
      nomeArquivo: 'historia.webm',
    });
  });

  it('usa o formato detectado mesmo se o navegador informar outro tipo da lista', () => {
    const audio = validarAudio({ buffer: ASSINATURAS.mp4, mimetype: 'audio/x-m4a' });
    expect(audio).toMatchObject({ mimeType: 'audio/mp4', nomeArquivo: 'historia.m4a' });
  });

  it.each(['image/png', 'audio/flac', 'application/octet-stream', '', 'video/webm'])(
    'recusa o tipo "%s"',
    (mimetype) => {
      const erro = (() => {
        try {
          validarAudio({ buffer: ASSINATURAS.webm, mimetype });
        } catch (e) {
          return e;
        }
      })();
      expect(erro).toBeInstanceOf(BadRequestException);
      expect(mensagens(erro)).toEqual([MENSAGENS_ENTRADA.audioTipo]);
    },
  );

  it('recusa arquivo com tipo permitido mas conteúdo que não é áudio', async () => {
    const erro = await erroDe(() =>
      validarAudio({
        buffer: arquivoComAssinatura([0x89, 0x50, 0x4e, 0x47]),
        mimetype: 'audio/mpeg',
      }),
    );
    expect(erro).toBeInstanceOf(BadRequestException);
    expect(mensagens(erro)).toEqual([MENSAGENS_ENTRADA.audioInvalido]);
  });

  it('recusa áudio menor que 1 KB', async () => {
    const erro = await erroDe(() =>
      validarAudio({ buffer: arquivoComAssinatura('OggS', 500), mimetype: 'audio/ogg' }),
    );
    expect(erro).toBeInstanceOf(BadRequestException);
    expect(mensagens(erro)).toEqual([MENSAGENS_ENTRADA.audioCurto]);
  });

  it('recusa áudio acima de 8 MB com 413', async () => {
    const erro = await erroDe(() =>
      validarAudio({
        buffer: arquivoComAssinatura('OggS', AUDIO_MAX_BYTES + 1),
        mimetype: 'audio/ogg',
      }),
    );
    expect(erro).toBeInstanceOf(PayloadTooLargeException);
  });
});

describe('extrairDadosDoCorpo', () => {
  it('lê o JSON do campo "dados" (multipart)', () => {
    expect(extrairDadosDoCorpo({ dados: '{"habilidades":["Excel"]}' })).toEqual({
      habilidades: ['Excel'],
    });
  });

  it('aceita "dados" já como objeto e o corpo inteiro como DTO', () => {
    expect(extrairDadosDoCorpo({ dados: { habilidades: [] } })).toEqual({ habilidades: [] });
    expect(extrairDadosDoCorpo({ habilidades: ['A'] })).toEqual({ habilidades: ['A'] });
    expect(extrairDadosDoCorpo(undefined)).toEqual({});
  });

  it('funciona com o corpo sem protótipo criado pelo multer', () => {
    const corpo = Object.assign(Object.create(null) as Record<string, unknown>, {
      dados: '{"premiacoes":[]}',
    });
    expect(extrairDadosDoCorpo(corpo)).toEqual({ premiacoes: [] });
  });

  it('JSON inválido → 400 amigável', async () => {
    const erro = await erroDe(() => extrairDadosDoCorpo({ dados: '{habilidades:' }));
    expect(erro).toBeInstanceOf(BadRequestException);
    expect(mensagens(erro)).toEqual([MENSAGENS_ENTRADA.dadosJson]);
  });
});

describe('validarDados', () => {
  const valido = {
    titulo: '  Meu currículo  ',
    cargoDesejado: 'Jovem Aprendiz',
    cidade: '',
    uf: 'df',
    linkedin: 'www.linkedin.com/in/maria-teste',
    perfilProfissional: 'Sou dedicada',
    experiencias: [
      { empresa: 'Loja', cargo: 'Atendente', inicio: '2023-01', fim: '', atual: true },
    ],
    formacao: [
      {
        instituicao: 'Escola',
        curso: 'Ensino Médio',
        inicio: 2021,
        fim: '2023',
        situacao: 'CONCLUIDO',
      },
    ],
    habilidades: [' Excel ', 'excel', 'Comunicação', ''],
    idiomas: [{ idioma: 'Inglês', nivel: 'Básico' }],
    premiacoes: [],
    usarIa: true,
  };

  it('converte e normaliza um corpo válido', async () => {
    const dto = await validarDados(GerarCurriculoDto, valido);
    expect(dto).toBeInstanceOf(GerarCurriculoDto);
    expect(dto).toMatchObject({
      titulo: 'Meu currículo',
      uf: 'DF',
      linkedin: 'https://www.linkedin.com/in/maria-teste',
      habilidades: ['Excel', 'Comunicação'],
      usarIa: true,
    });
    expect(dto.cidade).toBeUndefined();
    expect(dto.experiencias[0].fim).toBeUndefined();
    expect(dto.formacao[0].inicio).toBe('2021');
  });

  it('listas ausentes viram listas vazias', async () => {
    const dto = await validarDados(GerarCurriculoDto, { perfilProfissional: 'Oi', idiomas: null });
    expect(dto).toMatchObject({
      experiencias: [],
      formacao: [],
      habilidades: [],
      idiomas: [],
      premiacoes: [],
    });
  });

  it('PUT aceita os mesmos campos (usarIa é ignorado depois)', async () => {
    await expect(validarDados(AtualizarCurriculoDto, valido)).resolves.toBeInstanceOf(
      AtualizarCurriculoDto,
    );
  });

  it('recusa campos desconhecidos (inclusive dentro das listas)', async () => {
    const erro = await erroDe(
      validarDados(GerarCurriculoDto, {
        ...valido,
        nomeCompleto: 'Outra pessoa',
        experiencias: [{ empresa: 'Loja', cargo: 'Atendente', salario: 1000 }],
      }),
    );
    expect(mensagens(erro)).toEqual(
      expect.arrayContaining([
        'O campo "nomeCompleto" não é permitido',
        'Experiência 1: O campo "salario" não é permitido',
      ]),
    );
  });

  it('mensagens em português indicando o item com problema', async () => {
    const erro = await erroDe(
      validarDados(GerarCurriculoDto, {
        uf: 'XX',
        linkedin: 'javascript:alert(1)',
        experiencias: [
          { empresa: 'Loja', cargo: 'Atendente' },
          { empresa: 'Loja 2', cargo: '', inicio: '2023-05', fim: '2023-01' },
          { empresa: 'Loja 3', cargo: 'Caixa', inicio: '05/2023' },
        ],
        formacao: [{ instituicao: 'Escola', curso: 'EM', situacao: 'FORMADO' }],
        habilidades: ['h'.repeat(61)],
        idiomas: [{ idioma: 'Inglês' }],
        usarIa: 'sim',
      }),
    );
    expect(erro).toBeInstanceOf(BadRequestException);
    expect(mensagens(erro)).toEqual(
      expect.arrayContaining([
        'Informe a UF com 2 letras (ex.: SP)',
        'Informe um link válido do LinkedIn (ex.: linkedin.com/in/seu-nome)',
        'Experiência 2: Informe o cargo (até 150 caracteres)',
        'Experiência 2: A data de término não pode ser antes da data de início',
        'Experiência 3: Use o formato AAAA-MM nas datas da experiência',
        'Formação 1: Situação da formação inválida (concluído, cursando ou trancado)',
        'Cada habilidade deve ter até 60 caracteres',
        'Idioma 1: Informe o nível do idioma',
        'O campo "usarIa" deve ser verdadeiro ou falso',
      ]),
    );
  });

  it('com "trabalho atual" marcado, um fim antigo esquecido no formulário não gera erro', async () => {
    const dto = await validarDados(GerarCurriculoDto, {
      experiencias: [
        { empresa: 'Loja', cargo: 'Atendente', inicio: '2024-03', fim: '2023-01', atual: true },
      ],
    });
    expect(dto.experiencias[0]).toMatchObject({ inicio: '2024-03', atual: true });
  });

  it('textos com tipo errado recebem mensagem em português', async () => {
    const erro = await erroDe(
      validarDados(GerarCurriculoDto, { titulo: 10, cidade: ['x'], perfilProfissional: { a: 1 } }),
    );
    expect(mensagens(erro)).toEqual(
      expect.arrayContaining([
        'O título deve ser um texto',
        'A cidade deve ser um texto',
        'O campo "sobre você" deve ser um texto',
      ]),
    );
  });

  it('aplica os limites de quantidade e tamanho do contrato', async () => {
    const erro = await erroDe(
      validarDados(GerarCurriculoDto, {
        perfilProfissional: 'x'.repeat(1201),
        experiencias: Array.from({ length: 16 }, (_, i) => ({ empresa: `E${i}`, cargo: 'C' })),
        habilidades: Array.from({ length: 31 }, (_, i) => `H${i}`),
        premiacoes: ['p'.repeat(201)],
      }),
    );
    expect(mensagens(erro)).toEqual(
      expect.arrayContaining([
        'O texto sobre você deve ter até 1200 caracteres. Se quiser contar mais, grave um áudio.',
        'Informe no máximo 15 experiências',
        'Informe no máximo 30 habilidades',
        'Cada premiação ou curso deve ter até 200 caracteres',
      ]),
    );
  });

  it.each([null, 'texto', 42, [1, 2]])('recusa corpo que não é objeto (%p)', async (corpo) => {
    const erro = await erroDe(validarDados(GerarCurriculoDto, corpo));
    expect(mensagens(erro)).toEqual([MENSAGENS_ENTRADA.dadosAusentes]);
  });

  it('ignora a chave __proto__ (sem poluir o protótipo)', async () => {
    const dto = await validarDados(
      GerarCurriculoDto,
      JSON.parse('{"__proto__": {"admin": true}, "habilidades": ["A"]}'),
    );
    expect((dto as unknown as { admin?: boolean }).admin).toBeUndefined();
    expect(({} as { admin?: boolean }).admin).toBeUndefined();
  });
});

describe('currículo antigo (PDF/JPG/PNG)', () => {
  const pdf = arquivoComAssinatura('%PDF-1.7', 2048);
  const pdfComLixoAntes = arquivoComAssinatura('%PDF-1.4', 2048, 300);
  const jpg = arquivoComAssinatura([0xff, 0xd8, 0xff, 0xe0], 2048);
  const png = arquivoComAssinatura([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 2048);

  it('detecta o formato pela assinatura (PDF aceita bytes antes do cabeçalho)', () => {
    expect(detectarFormatoCurriculoAntigo(pdf)).toBe('pdf');
    expect(detectarFormatoCurriculoAntigo(pdfComLixoAntes)).toBe('pdf');
    expect(detectarFormatoCurriculoAntigo(jpg)).toBe('jpg');
    expect(detectarFormatoCurriculoAntigo(png)).toBe('png');
    expect(detectarFormatoCurriculoAntigo(arquivoComAssinatura('PK\x03\x04', 2048))).toBeNull(); // .docx
  });

  it('aceita PDF e fotos, com nome genérico (o nome original pode ter o nome da pessoa)', () => {
    expect(validarCurriculoAntigo({ buffer: pdf, mimetype: 'application/pdf' })).toEqual({
      buffer: pdf,
      mimeType: 'application/pdf',
      nomeArquivo: 'curriculo-antigo.pdf',
    });
    expect(validarCurriculoAntigo({ buffer: jpg, mimetype: 'image/jpeg' }).nomeArquivo).toBe(
      'curriculo-antigo.jpg',
    );
    expect(validarCurriculoAntigo({ buffer: png, mimetype: 'image/png' }).mimeType).toBe(
      'image/png',
    );
  });

  it('recusa Word, tipo trocado, arquivo vazio e acima de 5 MB', () => {
    expect(() =>
      validarCurriculoAntigo({
        buffer: arquivoComAssinatura('PK\x03\x04', 2048),
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    ).toThrow(MENSAGENS_ENTRADA.curriculoAntigoTipo);
    // Diz que é PDF, mas o conteúdo é outra coisa
    expect(() =>
      validarCurriculoAntigo({
        buffer: arquivoComAssinatura('GIF89a', 2048),
        mimetype: 'application/pdf',
      }),
    ).toThrow(MENSAGENS_ENTRADA.curriculoAntigoInvalido);
    expect(() =>
      validarCurriculoAntigo({ buffer: Buffer.alloc(10), mimetype: 'application/pdf' }),
    ).toThrow(BadRequestException);
    expect(() =>
      validarCurriculoAntigo({
        buffer: arquivoComAssinatura('%PDF-1.7', CURRICULO_ANTIGO_MAX_BYTES + 1),
        mimetype: 'application/pdf',
      }),
    ).toThrow(PayloadTooLargeException);
  });

  it('valida os dois arquivos juntos ou nenhum', () => {
    expect(validarArquivosCurriculo(undefined)).toEqual({});
    const r = validarArquivosCurriculo({
      audio: [{ buffer: arquivoComAssinatura('OggS'), mimetype: 'audio/ogg' }],
      curriculoAntigo: [{ buffer: pdf, mimetype: 'application/pdf' }],
    });
    expect(r.audio?.mimeType).toBe('audio/ogg');
    expect(r.curriculoAntigo?.mimeType).toBe('application/pdf');
  });
});
