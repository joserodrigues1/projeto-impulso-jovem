import {
  aplicarRespostaIa,
  ConteudoCurriculo,
  DadosCurriculo,
  formatarPeriodo,
  formularioVazio,
  IdentidadeCurriculo,
  montarConteudo,
  normalizarConteudo,
  temConteudoEscrito,
} from './curriculo-conteudo';

const identidade: IdentidadeCurriculo = {
  nomeCompleto: 'Maria Teste',
  email: 'maria@exemplo.com',
  telefone: '(61) 99999-0000',
  cidade: 'Brasília',
  uf: 'DF',
};

const dadosVazios = (): DadosCurriculo => ({
  experiencias: [],
  formacao: [],
  habilidades: [],
  idiomas: [],
  premiacoes: [],
});

describe('formatarPeriodo', () => {
  it.each([
    [['2023-06', '2023-12', false], 'jun/2023 – dez/2023'],
    [['2024-12', undefined, true], 'dez/2024 – atual'],
    [['2024-12', '2025-03', true], 'dez/2024 – atual'],
    [['2021', '2023', false], '2021 – 2023'],
    [['2023-06', undefined, false], 'jun/2023'],
    [[undefined, '2023-12', false], 'dez/2023'],
    [['2023-06', '2023-06', false], 'jun/2023'],
    [['2023-06-15', undefined, false], 'jun/2023'],
    [[undefined, undefined, false], ''],
    [['2023-13', 'abc', false], ''],
  ] as const)('%j → %s', ([inicio, fim, atual], esperado) => {
    expect(formatarPeriodo(inicio, fim, atual)).toBe(esperado);
  });
});

describe('montarConteudo', () => {
  it('usa a identidade da conta e completa cidade/UF quando o formulário não traz', () => {
    const c = montarConteudo(identidade, {
      ...dadosVazios(),
      perfilProfissional: '  Gosto de aprender.  ',
    });
    expect(c).toMatchObject({
      versao: 2,
      nomeCompleto: 'Maria Teste',
      email: 'maria@exemplo.com',
      telefone: '(61) 99999-0000',
      cidade: 'Brasília',
      uf: 'DF',
      perfilProfissional: 'Gosto de aprender.',
    });
  });

  it('formulário tem prioridade sobre o perfil em cidade/UF/LinkedIn', () => {
    const c = montarConteudo(identidade, {
      ...dadosVazios(),
      cidade: 'Goiânia',
      uf: 'go',
      linkedin: 'https://linkedin.com/in/maria',
    });
    expect(c.cidade).toBe('Goiânia');
    expect(c.uf).toBe('GO');
    expect(c.linkedin).toBe('https://linkedin.com/in/maria');
  });

  it('transforma a descrição livre em atividades e calcula o período', () => {
    const c = montarConteudo(identidade, {
      ...dadosVazios(),
      experiencias: [
        {
          empresa: 'Mercado Bom Preço',
          cargo: 'Repositor',
          inicio: '2023-06',
          fim: '2023-12',
          descricao:
            '- Repunha produtos\n• Organizava o estoque; Atendia clientes\n\n1. Fazia inventário',
        },
      ],
    });
    expect(c.experiencias[0]).toEqual({
      empresa: 'Mercado Bom Preço',
      cargo: 'Repositor',
      periodo: 'jun/2023 – dez/2023',
      inicio: '2023-06',
      fim: '2023-12',
      atividades: [
        'Repunha produtos',
        'Organizava o estoque',
        'Atendia clientes',
        'Fazia inventário',
      ],
    });
  });

  it('ordena: atuais primeiro, depois pelo início mais recente; sem data por último', () => {
    const c = montarConteudo(identidade, {
      ...dadosVazios(),
      experiencias: [
        { empresa: 'A', cargo: 'Antiga', inicio: '2020-01', fim: '2020-06' },
        { empresa: 'B', cargo: 'Sem data', periodo: 'verão de 2019' },
        { empresa: 'C', cargo: 'Recente', inicio: '2023-02', fim: '2023-08' },
        { empresa: 'D', cargo: 'Atual', inicio: '2022-01', fim: '2022-05', atual: true },
      ],
    });
    expect(c.experiencias.map((e) => e.cargo)).toEqual(['Atual', 'Recente', 'Antiga', 'Sem data']);
    expect(c.experiencias[0]).toMatchObject({ periodo: 'jan/2022 – atual', atual: true });
    expect(c.experiencias[0].fim).toBeUndefined();
    expect(c.experiencias[3].periodo).toBe('verão de 2019');
  });

  it('formação: período pelos anos e remove habilidades repetidas', () => {
    const c = montarConteudo(identidade, {
      ...dadosVazios(),
      formacao: [
        { instituicao: 'Escola X', curso: 'Ensino Médio', inicio: '2022', situacao: 'CURSANDO' },
      ],
      habilidades: ['Excel', 'excel', 'Comunicação', 'comunicacao'],
    });
    expect(c.formacao).toEqual([
      {
        instituicao: 'Escola X',
        curso: 'Ensino Médio',
        periodo: '2022 – atual',
        situacao: 'CURSANDO',
      },
    ]);
    expect(c.habilidades).toEqual(['Excel', 'Comunicação']);
  });

  it('o resultado já é estável na normalização', () => {
    const c = montarConteudo(identidade, {
      ...dadosVazios(),
      cargoDesejado: 'Jovem Aprendiz',
      experiencias: [
        { empresa: 'X', cargo: 'Y', inicio: '2024-01', atual: true, atividades: ['a'] },
      ],
      idiomas: [{ idioma: 'Inglês', nivel: 'basico' }],
    });
    expect(c.idiomas).toEqual([{ idioma: 'Inglês', nivel: 'Básico' }]);
    expect(normalizarConteudo(c)).toEqual(c);
  });
});

describe('formularioVazio', () => {
  it('só é vazio sem nenhum campo de conteúdo', () => {
    expect(formularioVazio(dadosVazios())).toBe(true);
    expect(
      formularioVazio({ ...dadosVazios(), cargoDesejado: '   ', titulo: 'Meu currículo' }),
    ).toBe(true);
    expect(formularioVazio({ ...dadosVazios(), cargoDesejado: 'Jovem Aprendiz' })).toBe(false);
    expect(formularioVazio({ ...dadosVazios(), premiacoes: ['OBMEP'] })).toBe(false);
    expect(formularioVazio({ ...dadosVazios(), habilidades: ['Excel'] })).toBe(false);
  });
});

describe('temConteudoEscrito', () => {
  it('considera perfil, experiências, formação e habilidades', () => {
    expect(temConteudoEscrito(dadosVazios())).toBe(false);
    expect(temConteudoEscrito({ ...dadosVazios(), perfilProfissional: '   ' })).toBe(false);
    expect(
      temConteudoEscrito({ ...dadosVazios(), idiomas: [{ idioma: 'Inglês', nivel: 'Básico' }] }),
    ).toBe(false);
    expect(temConteudoEscrito({ ...dadosVazios(), habilidades: ['Excel'] })).toBe(true);
    expect(temConteudoEscrito({ ...dadosVazios(), perfilProfissional: 'Olá' })).toBe(true);
  });
});

describe('normalizarConteudo', () => {
  it('converte registros v1 para v2', () => {
    const v1 = {
      versao: 1,
      nomeCompleto: 'João',
      email: 'joao@exemplo.com',
      telefone: '(11) 98888-7777',
      resumoProfissional: 'Sou dedicado.',
      nivelEscolaridade: 'Ensino Médio Completo',
      habilidades: ['Excel'],
      experiencias: [
        {
          cargo: 'Atendente',
          empresa: 'Loja',
          descricao: 'Atendia clientes\nOrganizava vitrine',
          dataInicio: '2022-03',
          dataFim: '2022-09',
        },
        { cargo: 'Auxiliar', empresa: 'Padaria', dataInicio: '2023-01' },
      ],
    };
    const c = normalizarConteudo(v1);
    expect(c.versao).toBe(2);
    expect(c.perfilProfissional).toBe('Sou dedicado.');
    expect(c.formacao).toEqual([
      { instituicao: '', curso: 'Ensino Médio Completo', periodo: '', situacao: 'CONCLUIDO' },
    ]);
    expect(c.experiencias[0]).toEqual({
      empresa: 'Loja',
      cargo: 'Atendente',
      periodo: 'mar/2022 – set/2022',
      inicio: '2022-03',
      fim: '2022-09',
      atividades: ['Atendia clientes', 'Organizava vitrine'],
    });
    // v1: sem dataFim = emprego atual
    expect(c.experiencias[1]).toMatchObject({ periodo: 'jan/2023 – atual', atual: true });
    expect(c.idiomas).toEqual([]);
    expect(c.premiacoes).toEqual([]);
  });

  it('converte o formato antigo salvo sem versão (dados crus do formulário)', () => {
    const c = normalizarConteudo({
      resumoProfissional: 'Texto antigo',
      habilidades: ['A'],
      experiencias: [],
    });
    expect(c.perfilProfissional).toBe('Texto antigo');
    expect(c.habilidades).toEqual(['A']);
  });

  it.each([null, undefined, 'texto', 42, [], [1, 2]])(
    'tolera lixo (%p) e devolve estrutura vazia',
    (lixo) => {
      expect(normalizarConteudo(lixo)).toEqual({
        versao: 2,
        nomeCompleto: '',
        email: '',
        telefone: '',
        perfilProfissional: '',
        experiencias: [],
        formacao: [],
        habilidades: [],
        idiomas: [],
        premiacoes: [],
      });
    },
  );

  it('descarta itens e campos com tipo errado e aplica os limites', () => {
    const c = normalizarConteudo({
      versao: 2,
      nomeCompleto: 123,
      perfilProfissional: 'x'.repeat(5000),
      cidade: { nome: 'x' },
      uf: 'XX',
      linkedin: 'javascript:alert(1)',
      experiencias: [
        'texto',
        null,
        { empresa: '', cargo: '' },
        ...Array.from({ length: 20 }, (_, i) => ({
          empresa: `E${i}`,
          cargo: 'C',
          atividades: Array.from({ length: 12 }, (_, j) => `atividade ${j} ${'y'.repeat(400)}`),
        })),
      ],
      habilidades: [...Array.from({ length: 40 }, (_, i) => `H${i}`), 7, null],
      idiomas: [
        'Inglês - Intermediário',
        { idioma: 'Espanhol', nivel: 'FLUENTE' },
        { nivel: 'Básico' },
      ],
      premiacoes: 'Prêmio A; Prêmio B',
    });
    expect(c.nomeCompleto).toBe('');
    expect(c.perfilProfissional).toHaveLength(1200);
    expect(c.cidade).toBeUndefined();
    expect(c.uf).toBeUndefined();
    expect(c.linkedin).toBeUndefined();
    expect(c.experiencias).toHaveLength(15);
    expect(c.experiencias[0].atividades).toHaveLength(8);
    expect(c.experiencias[0].atividades[0].length).toBeLessThanOrEqual(300);
    expect(c.habilidades).toHaveLength(30);
    expect(c.idiomas).toEqual([
      { idioma: 'Inglês', nivel: 'Intermediário' },
      { idioma: 'Espanhol', nivel: 'Fluente' },
    ]);
    expect(c.premiacoes).toEqual(['Prêmio A', 'Prêmio B']);
  });

  it('aceita LinkedIn http(s) e remove caracteres invisíveis', () => {
    const c = normalizarConteudo({
      versao: 2,
      linkedin: 'linkedin.com/in/maria',
      cargoDesejado: `Jovem${String.fromCharCode(0x200b)} Aprendiz${String.fromCharCode(0)}`,
    });
    expect(c.linkedin).toBe('https://linkedin.com/in/maria');
    expect(c.cargoDesejado).toBe('Jovem Aprendiz');
  });

  it('LinkedIn com porta e sem esquema ganha https://; outros esquemas são descartados', () => {
    expect(normalizarConteudo({ linkedin: 'linkedin.com:443/in/maria' }).linkedin).toBe(
      'https://linkedin.com:443/in/maria',
    );
    for (const link of [
      'ftp://linkedin.com/in/maria',
      'data:text/html,oi',
      'javascript:1',
      'mailto:a@b.com',
    ]) {
      expect(normalizarConteudo({ linkedin: link }).linkedin).toBeUndefined();
    }
  });

  it('remove metades de emoji soltas e o caractere nulo (o PostgreSQL recusaria no jsonb)', () => {
    const c = normalizarConteudo({
      versao: 2,
      perfilProfissional: `Oi\uD83D tudo bem\u0000? 😀`,
      habilidades: ['\uDE00Excel'],
    });
    expect(c.perfilProfissional).toBe('Oi tudo bem ? 😀');
    expect(c.habilidades).toEqual(['Excel']);
    expect(() => JSON.parse(JSON.stringify(c))).not.toThrow();
  });

  it('textos e listas enormes são processados rápido e cortados', () => {
    // Espaços repetidos antes de um ")" no meio faziam a regex de idioma ter custo cúbico
    const idiomaPatologico = `Inglês -${' '.repeat(50_000)})x`;
    const inicio = Date.now();
    const c = normalizarConteudo({
      versao: 2,
      idiomas: Array.from({ length: 200 }, () => idiomaPatologico),
      habilidades: Array.from({ length: 100_000 }, (_, i) => `H${i}`),
      experiencias: [{ empresa: 'E', cargo: 'C', descricao: 'Atividade longa. '.repeat(100_000) }],
    });
    expect(Date.now() - inicio).toBeLessThan(2000);
    expect(c.idiomas).toEqual([]); // texto malformado é descartado
    expect(c.habilidades).toHaveLength(30);
    expect(c.experiencias[0].atividades.length).toBeLessThanOrEqual(8);
    expect(c.experiencias[0].atividades[0]).toBe('Atividade longa.');
  });
});

describe('aplicarRespostaIa', () => {
  const base = (): ConteudoCurriculo =>
    montarConteudo(identidade, {
      ...dadosVazios(),
      perfilProfissional: 'eu sou legal e trabalhei no mercado',
      experiencias: [
        { empresa: 'Mercado Bom Preço', cargo: 'ajudante', inicio: '2023-06', fim: '2023-12' },
      ],
      habilidades: ['excel'],
      idiomas: [
        { idioma: 'Inglês', nivel: 'Básico' },
        { idioma: 'Espanhol', nivel: 'Básico' },
      ],
      premiacoes: ['Medalha OBMEP'],
    });

  const conteudoIa = {
    cargoDesejado: 'Jovem Aprendiz em Varejo',
    perfilProfissional: 'Jovem proativo com experiência em atendimento.',
    experiencias: [
      {
        empresa: 'Mercado Bom Preço',
        cargo: 'Auxiliar de Loja',
        periodo: '2023',
        atividades: ['Reposição de mercadorias', 'Atendimento ao cliente'],
      },
    ],
    formacao: [
      {
        instituicao: 'Escola X',
        curso: 'Ensino Médio',
        periodo: '2021 – 2023',
        situacao: 'CONCLUIDO',
      },
    ],
    habilidades: ['Excel', 'Comunicação'],
    idiomas: [],
    premiacoes: [],
  };

  it.each([
    [
      'objeto com envelope',
      { conteudo: conteudoIa, transcricao: 'oi', observacoes: ['Inclua seu LinkedIn'] },
    ],
    ['array', [{ conteudo: conteudoIa, transcricao: 'oi', observacoes: ['Inclua seu LinkedIn'] }]],
    [
      'output objeto',
      { output: { conteudo: conteudoIa, transcricao: 'oi', observacoes: ['Inclua seu LinkedIn'] } },
    ],
    [
      'output string',
      [
        {
          output: JSON.stringify({
            conteudo: conteudoIa,
            transcricao: 'oi',
            observacoes: ['Inclua seu LinkedIn'],
          }),
        },
      ],
    ],
    [
      'string JSON',
      JSON.stringify({
        conteudo: conteudoIa,
        transcricao: 'oi',
        observacoes: 'Inclua seu LinkedIn',
      }),
    ],
    [
      'markdown',
      'Aqui está:\n```json\n' +
        JSON.stringify({
          conteudo: JSON.stringify(conteudoIa),
          transcricao: 'oi',
          observacoes: ['Inclua seu LinkedIn'],
        }) +
        '\n```',
    ],
  ])('aceita %s', (_formato, resposta) => {
    const r = aplicarRespostaIa(base(), resposta);
    expect(r.refinado).toBe(true);
    expect(r.transcricao).toBe('oi');
    expect(r.observacoes).toEqual(['Inclua seu LinkedIn']);
    expect(r.conteudo.cargoDesejado).toBe('Jovem Aprendiz em Varejo');
    expect(r.conteudo.perfilProfissional).toBe('Jovem proativo com experiência em atendimento.');
    expect(r.conteudo.formacao).toHaveLength(1);
  });

  it('aceita o conteúdo sem envelope', () => {
    const r = aplicarRespostaIa(base(), conteudoIa);
    expect(r.refinado).toBe(true);
    expect(r.transcricao).toBeUndefined();
    expect(r.conteudo.habilidades).toEqual(['Excel', 'Comunicação']);
  });

  it('nunca altera a identificação', () => {
    const r = aplicarRespostaIa(base(), {
      conteudo: {
        ...conteudoIa,
        nomeCompleto: 'Outra Pessoa',
        email: 'hacker@exemplo.com',
        telefone: '000',
        cidade: 'Outra',
        uf: 'SP',
        linkedin: 'https://evil.example.com',
      },
    });
    expect(r.conteudo).toMatchObject({
      nomeCompleto: 'Maria Teste',
      email: 'maria@exemplo.com',
      telefone: '(61) 99999-0000',
      cidade: 'Brasília',
      uf: 'DF',
    });
    expect(r.conteudo.linkedin).toBeUndefined();
  });

  it('lista vazia da IA não apaga o que o usuário digitou', () => {
    const r = aplicarRespostaIa(base(), { conteudo: conteudoIa });
    expect(r.conteudo.idiomas).toEqual([
      { idioma: 'Inglês', nivel: 'Básico' },
      { idioma: 'Espanhol', nivel: 'Básico' },
    ]);
    expect(r.conteudo.premiacoes).toEqual(['Medalha OBMEP']);
  });

  it('mantém as datas digitadas pelo usuário na experiência reescrita', () => {
    const r = aplicarRespostaIa(base(), { conteudo: conteudoIa });
    expect(r.conteudo.experiencias).toEqual([
      {
        empresa: 'Mercado Bom Preço',
        cargo: 'Auxiliar de Loja',
        periodo: 'jun/2023 – dez/2023',
        inicio: '2023-06',
        fim: '2023-12',
        atividades: ['Reposição de mercadorias', 'Atendimento ao cliente'],
      },
    ]);
  });

  it('experiência reescrita sem atividades ou período mantém o que o usuário digitou', () => {
    const original = montarConteudo(identidade, {
      ...dadosVazios(),
      experiencias: [
        {
          empresa: 'Lanchonete do Zé',
          cargo: 'atendente',
          periodo: 'verão de 2022',
          atividades: ['Atendia no balcão'],
        },
      ],
    });
    const r = aplicarRespostaIa(original, {
      conteudo: {
        experiencias: [
          { empresa: 'Lanchonete do Zé', cargo: 'Atendente', periodo: '', atividades: [] },
        ],
      },
    });
    expect(r.conteudo.experiencias).toEqual([
      {
        empresa: 'Lanchonete do Zé',
        cargo: 'Atendente',
        periodo: 'verão de 2022',
        atividades: ['Atendia no balcão'],
      },
    ]);
  });

  it('reconhece a mesma empresa com nome ajustado pela IA e mantém as datas do usuário', () => {
    const r = aplicarRespostaIa(base(), {
      conteudo: {
        experiencias: [
          {
            empresa: 'Padaria Pão Quente',
            cargo: 'Balconista',
            periodo: '2022',
            atividades: ['Atendimento'],
          },
          {
            empresa: 'Supermercado Bom Preço',
            cargo: 'Auxiliar de Loja',
            periodo: '2023',
            atividades: ['Reposição'],
          },
        ],
      },
    });
    expect(r.conteudo.experiencias[0]).toMatchObject({
      empresa: 'Supermercado Bom Preço',
      periodo: 'jun/2023 – dez/2023',
      inicio: '2023-06',
      fim: '2023-12',
    });
    expect(r.conteudo.experiencias[1]).toMatchObject({
      empresa: 'Padaria Pão Quente',
      periodo: '2022',
    });
  });

  it('aceita experiências novas (vindas do áudio) e descarta itens sem empresa ou cargo', () => {
    const r = aplicarRespostaIa(base(), {
      conteudo: {
        experiencias: [
          { empresa: 'Mercado Bom Preço', cargo: 'Auxiliar de Loja', atividades: ['Reposição'] },
          {
            empresa: 'Lanchonete do Zé',
            cargo: 'Atendente',
            periodo: '2022',
            descricao: 'Atendia no balcão. Fazia lanches.',
          },
          { empresa: 'Sem cargo', cargo: '' },
          { cargo: 'Sem empresa' },
          'lixo',
        ],
      },
    });
    expect(r.conteudo.experiencias.map((e) => e.empresa)).toEqual([
      'Mercado Bom Preço',
      'Lanchonete do Zé',
    ]);
    expect(r.conteudo.experiencias[1]).toMatchObject({
      periodo: '2022',
      atividades: ['Atendia no balcão. Fazia lanches.'],
    });
  });

  it('aplica limites e remove duplicatas', () => {
    const r = aplicarRespostaIa(base(), {
      conteudo: {
        perfilProfissional: 'p'.repeat(3000),
        cargoDesejado: 'c'.repeat(500),
        habilidades: [
          ...Array.from({ length: 50 }, (_, i) => `Habilidade ${i}`),
          'Habilidade 1',
          'h'.repeat(100),
        ],
        premiacoes: ['Curso A', 'curso a', 'Curso B'],
      },
      observacoes: Array.from({ length: 10 }, (_, i) => `Dica ${i}`),
      transcricao: 't'.repeat(20000),
    });
    expect(r.conteudo.perfilProfissional).toHaveLength(1200);
    expect(r.conteudo.cargoDesejado).toHaveLength(120);
    expect(r.conteudo.habilidades).toHaveLength(30);
    // A premiação que o usuário digitou (e a IA não devolveu) continua no fim
    expect(r.conteudo.premiacoes).toEqual(['Curso A', 'Curso B', 'Medalha OBMEP']);
    expect(r.observacoes).toHaveLength(5);
    expect(r.transcricao).toHaveLength(10000);
  });

  it.each([
    ['nulo', null],
    ['texto sem JSON', 'Desculpe, não consegui.'],
    ['JSON quebrado', '{"conteudo": {'],
    ['objeto desconhecido', { foo: 'bar' }],
    ['array vazio', []],
    [
      'tipos errados',
      { conteudo: { perfilProfissional: 42, habilidades: 'x'.repeat(0), experiencias: {} } },
    ],
  ])('não refina com resposta inválida (%s)', (_caso, resposta) => {
    const original = base();
    const r = aplicarRespostaIa(original, resposta);
    expect(r.refinado).toBe(false);
    expect(r.conteudo).toEqual(original);
  });

  it('não modifica o objeto base', () => {
    const original = base();
    const copia = structuredClone(original);
    aplicarRespostaIa(original, { conteudo: conteudoIa });
    expect(original).toEqual(copia);
  });

  describe('itens que o usuário digitou e a IA deixou de fora', () => {
    const exp = (empresa: string, inicio: string, fim?: string, atual?: boolean) => ({
      empresa,
      cargo: 'Atendente',
      inicio,
      ...(fim ? { fim } : {}),
      ...(atual ? { atual: true } : {}),
    });

    it('experiência omitida pela IA continua no currículo, com aviso', () => {
      const original = montarConteudo(
        identidade,
        {
          ...dadosVazios(),
          experiencias: [
            exp('Mercadinho do Bairro', '2024-12', undefined, true),
            exp('Igreja Central', '2023-01', '2023-06'),
            exp('Lanchonete Sabor', '2022-01', '2022-06'),
          ],
        },
        { manterOrdem: true },
      );
      const r = aplicarRespostaIa(original, {
        conteudo: {
          experiencias: [
            { empresa: 'Mercadinho do Bairro', cargo: 'Operador de Caixa', atividades: ['Caixa'] },
            { empresa: 'Lanchonete Sabor', cargo: 'Atendente', atividades: ['Balcão'] },
          ],
        },
      });
      expect(r.conteudo.experiencias.map((e) => `${e.empresa} | ${e.periodo}`)).toEqual([
        'Mercadinho do Bairro | dez/2024 – atual',
        'Igreja Central | jan/2023 – jun/2023',
        'Lanchonete Sabor | jan/2022 – jun/2022',
      ]);
      expect(r.observacoes).toEqual([
        'Mantivemos 1 experiência que você preencheu e a IA não reescreveu. Confira se está tudo certo.',
      ]);
    });

    it('habilidades além das que a IA devolveu (o prompt limita a 12) não somem', () => {
      const doUsuario = Array.from({ length: 14 }, (_, i) => `Habilidade ${i + 1}`);
      const original = montarConteudo(identidade, { ...dadosVazios(), habilidades: doUsuario });
      const r = aplicarRespostaIa(original, {
        conteudo: { habilidades: [...doUsuario.slice(0, 12), 'Comunicação'] },
      });
      expect(r.conteudo.habilidades).toHaveLength(15);
      expect(r.conteudo.habilidades).toEqual(expect.arrayContaining(doUsuario));
    });

    it('habilidade reescrita pela IA não é duplicada ("excel" × "Pacote Office (Word, Excel)")', () => {
      const original = montarConteudo(identidade, {
        ...dadosVazios(),
        habilidades: ['excel', 'trabalho em equipe'],
      });
      const r = aplicarRespostaIa(original, {
        conteudo: { habilidades: ['Pacote Office (Word, Excel)', 'Trabalho em equipe'] },
      });
      expect(r.conteudo.habilidades).toEqual(['Pacote Office (Word, Excel)', 'Trabalho em equipe']);
    });

    it('idioma omitido pela IA é mantido', () => {
      const r = aplicarRespostaIa(base(), {
        conteudo: { idiomas: [{ idioma: 'Inglês', nivel: 'Intermediário' }] },
      });
      expect(r.conteudo.idiomas).toEqual([
        { idioma: 'Inglês', nivel: 'Intermediário' },
        { idioma: 'Espanhol', nivel: 'Básico' },
      ]);
    });
  });

  describe('formação sem o nome da escola', () => {
    it('a IA devolve só o curso (instituição vazia): a formação é salva', () => {
      const original = montarConteudo(identidade, { ...dadosVazios(), habilidades: ['Excel'] });
      const r = aplicarRespostaIa(original, {
        conteudo: {
          formacao: [{ instituicao: '', curso: 'Ensino Médio', periodo: '', situacao: 'CURSANDO' }],
        },
        observacoes: ['Inclua o nome da sua escola'],
      });
      expect(r.refinado).toBe(true);
      expect(r.conteudo.formacao).toEqual([
        { instituicao: '', curso: 'Ensino Médio', periodo: '', situacao: 'CURSANDO' },
      ]);
    });

    it('instituição vazia da IA não apaga a que o usuário digitou', () => {
      const original = montarConteudo(identidade, {
        ...dadosVazios(),
        formacao: [
          { instituicao: 'EE Professor Silva', curso: 'ensino medio', situacao: 'CURSANDO' },
        ],
      });
      const r = aplicarRespostaIa(original, {
        conteudo: { formacao: [{ instituicao: '', curso: 'Ensino Médio', periodo: '' }] },
      });
      expect(r.conteudo.formacao).toEqual([
        {
          instituicao: 'EE Professor Silva',
          curso: 'Ensino Médio',
          periodo: '',
          situacao: 'CURSANDO',
        },
      ]);
      expect(r.observacoes).toEqual([]);
    });
  });

  describe('casamento das experiências com a resposta da IA', () => {
    // O jovem cadastra primeiro o emprego antigo e depois o atual (fora da ordem cronológica)
    const formulario = (): DadosCurriculo => ({
      ...dadosVazios(),
      experiencias: [
        { empresa: 'lanch sb', cargo: 'atendente', inicio: '2023-01', fim: '2023-06' },
        { empresa: 'merc bairo', cargo: 'caixa', inicio: '2024-12', atual: true },
      ],
    });
    const respostaRenomeada = {
      conteudo: {
        experiencias: [
          { empresa: 'Lanchonete Sabor Bom', cargo: 'Atendente', atividades: ['Balcão'] },
          { empresa: 'Mercadinho do Bairro', cargo: 'Operador de Caixa', atividades: ['Caixa'] },
        ],
      },
    };

    it('por posição, na ordem do formulário: cada período fica na experiência certa', () => {
      const original = montarConteudo(identidade, formulario(), { manterOrdem: true });
      const r = aplicarRespostaIa(original, respostaRenomeada);
      expect(
        r.conteudo.experiencias.map((e) => `${e.empresa} | ${e.periodo} | ${e.atual ?? false}`),
      ).toEqual([
        'Mercadinho do Bairro | dez/2024 – atual | true',
        'Lanchonete Sabor Bom | jan/2023 – jun/2023 | false',
      ]);
      expect(r.observacoes).toEqual([]);
    });

    it('nome com erro de digitação corrigido pela IA casa mesmo com uma experiência nova do áudio', () => {
      const original = montarConteudo(
        identidade,
        {
          ...dadosVazios(),
          experiencias: [
            {
              empresa: 'lanchonete sabr bom',
              cargo: 'atendente',
              inicio: '2023-01',
              fim: '2023-06',
            },
            { empresa: 'mercadinho bairo', cargo: 'caixa', inicio: '2024-12', atual: true },
          ],
        },
        { manterOrdem: true },
      );
      const r = aplicarRespostaIa(original, {
        conteudo: {
          experiencias: [
            {
              empresa: 'Feira do Tio João',
              cargo: 'Ajudante',
              periodo: '2021',
              atividades: ['Vendas'],
            },
            { empresa: 'Mercadinho do Bairro', cargo: 'Operador de Caixa', atividades: ['Caixa'] },
            { empresa: 'Lanchonete Sabor Bom', cargo: 'Atendente', atividades: ['Balcão'] },
          ],
        },
      });
      expect(r.conteudo.experiencias.map((e) => `${e.empresa} | ${e.periodo}`)).toEqual([
        'Mercadinho do Bairro | dez/2024 – atual',
        'Lanchonete Sabor Bom | jan/2023 – jun/2023',
        'Feira do Tio João | 2021',
      ]);
    });

    it('nomes diferentes de verdade não são casados por semelhança ("Loja A" × "Loja B")', () => {
      const original = montarConteudo(
        identidade,
        {
          ...dadosVazios(),
          experiencias: [{ empresa: 'Loja A', cargo: 'vendedor', inicio: '2023-01' }],
        },
        { manterOrdem: true },
      );
      const r = aplicarRespostaIa(original, {
        conteudo: {
          experiencias: [
            { empresa: 'Loja B', cargo: 'Vendedor', periodo: '2022' },
            { empresa: 'Loja A', cargo: 'Vendedor' },
          ],
        },
      });
      expect(r.conteudo.experiencias.map((e) => `${e.empresa} | ${e.periodo}`)).toEqual([
        'Loja A | jan/2023',
        'Loja B | 2022',
      ]);
    });
  });
});
