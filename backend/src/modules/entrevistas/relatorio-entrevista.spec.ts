import {
  derivarClassificacao,
  LIMITES_RELATORIO,
  normalizarNota,
  normalizarRelatorio,
  relatorioLegado,
  relatorioParaExibicao,
  RelatorioEntrevista,
  textosLegados,
  tituloCurto,
} from './relatorio-entrevista';

/** Relatório completo no formato que o n8n deve enviar. */
function relatorioCompleto(): Record<string, unknown> {
  return {
    versao: 1,
    notaGeral: 7.46,
    classificacao: 'PREPARADO',
    resumo: 'Você se apresentou bem e mostrou interesse pela vaga.',
    recomendacao: 'Seguiria para a próxima etapa.',
    competencias: [
      { nome: 'Comunicação', nota: 8, comentario: 'Respostas claras.' },
      { nome: 'Exemplos práticos (STAR)', nota: 6, comentario: 'Faltaram exemplos.' },
    ],
    pontosFortes: [
      {
        titulo: 'Boa apresentação',
        descricao: 'Você falou da sua rotina com clareza.',
        evidencia: 'Eu estudo de manhã',
      },
    ],
    pontosMelhoria: [
      {
        titulo: 'Use exemplos',
        descricao: 'Conte situações reais.',
        comoMelhorar: 'Use o método STAR.',
      },
    ],
    dicasComunicacao: ['Fale com calma.'],
    planoDeAcao: [{ passo: 'Treinar 3 respostas', prazo: '1 semana' }, 'Pesquisar a empresa'],
    perguntasParaPraticar: ['Por que você quer trabalhar aqui?'],
    exemploResposta: { pergunta: 'Fale sobre você', resposta: 'Sou estudante do 2º ano...' },
  };
}

describe('normalizarNota', () => {
  it('limita a 0–10 com uma casa decimal', () => {
    expect(normalizarNota(7.46)).toBe(7.5);
    expect(normalizarNota(15)).toBe(10);
    expect(normalizarNota(-2)).toBe(0);
    expect(normalizarNota('6,25')).toBe(6.3);
    expect(normalizarNota('8')).toBe(8);
  });

  it('devolve null para valores não numéricos', () => {
    expect(normalizarNota('abc')).toBeNull();
    expect(normalizarNota('')).toBeNull();
    expect(normalizarNota(null)).toBeNull();
    expect(normalizarNota(undefined)).toBeNull();
    expect(normalizarNota(Number.NaN)).toBeNull();
    expect(normalizarNota(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('derivarClassificacao', () => {
  it.each([
    [0, 'INICIANTE'],
    [3.9, 'INICIANTE'],
    [4, 'EM_DESENVOLVIMENTO'],
    [6.4, 'EM_DESENVOLVIMENTO'],
    [6.5, 'PREPARADO'],
    [8.4, 'PREPARADO'],
    [8.5, 'DESTAQUE'],
    [10, 'DESTAQUE'],
  ])('nota %s → %s', (nota, esperado) => {
    expect(derivarClassificacao(nota)).toBe(esperado);
  });
});

describe('normalizarRelatorio', () => {
  it('normaliza um relatório completo', () => {
    const r = normalizarRelatorio(relatorioCompleto());
    expect(r).not.toBeNull();
    expect(r?.versao).toBe(1);
    expect(r?.notaGeral).toBe(7.5);
    expect(r?.classificacao).toBe('PREPARADO');
    expect(r?.competencias).toHaveLength(2);
    expect(r?.pontosFortes[0]).toEqual({
      titulo: 'Boa apresentação',
      descricao: 'Você falou da sua rotina com clareza.',
      evidencia: 'Eu estudo de manhã',
    });
    expect(r?.pontosMelhoria[0].comoMelhorar).toBe('Use o método STAR.');
    expect(r?.planoDeAcao).toEqual([
      { passo: 'Treinar 3 respostas', prazo: '1 semana' },
      { passo: 'Pesquisar a empresa' },
    ]);
    expect(r?.exemploResposta?.pergunta).toBe('Fale sobre você');
  });

  it('é idempotente (normalizar o já normalizado não muda nada)', () => {
    const r = normalizarRelatorio(relatorioCompleto());
    expect(normalizarRelatorio(r)).toEqual(r);
  });

  it('aceita string JSON, bloco ```json, { output }, { relatorio } e array com 1 item', () => {
    const base = normalizarRelatorio(relatorioCompleto());
    const json = JSON.stringify(relatorioCompleto());
    expect(normalizarRelatorio(json)).toEqual(base);
    expect(normalizarRelatorio('```json\n' + json + '\n```')).toEqual(base);
    expect(normalizarRelatorio({ output: relatorioCompleto() })).toEqual(base);
    expect(normalizarRelatorio({ output: json })).toEqual(base);
    expect(normalizarRelatorio({ relatorio: relatorioCompleto() })).toEqual(base);
    expect(normalizarRelatorio([relatorioCompleto()])).toEqual(base);
    expect(normalizarRelatorio([{ output: json }])).toEqual(base);
  });

  it('desembrulha { output } mesmo quando a nota vem por fora', () => {
    const semNota = { ...relatorioCompleto(), notaGeral: undefined };
    expect(normalizarRelatorio({ output: semNota }, { notaGeral: 6 })?.notaGeral).toBe(6);
    // Um relatório com um campo "output" qualquer não é tratado como envelope
    const comOutput = { ...relatorioCompleto(), output: 'lixo' };
    expect(normalizarRelatorio(comOutput)?.notaGeral).toBe(7.5);
  });

  it('texto enorme e malformado é recusado rápido (sem regex quadrática)', () => {
    const inicio = Date.now();
    expect(normalizarRelatorio(`{"a":1${' '.repeat(300_000)}x`)).toBeNull();
    expect(normalizarRelatorio(`\`\`\`json${' '.repeat(300_000)}x`)).toBeNull();
    expect(Date.now() - inicio).toBeLessThan(1500);
  });

  it('devolve null para entradas inaproveitáveis', () => {
    expect(normalizarRelatorio(undefined)).toBeNull();
    expect(normalizarRelatorio(null)).toBeNull();
    expect(normalizarRelatorio('não é json')).toBeNull();
    expect(normalizarRelatorio([])).toBeNull();
    expect(normalizarRelatorio({})).toBeNull();
    expect(normalizarRelatorio(42)).toBeNull();
  });

  it('devolve null sem nenhum ponto forte ou de melhoria válido', () => {
    const dados = {
      ...relatorioCompleto(),
      pontosFortes: [],
      pontosMelhoria: [{ titulo: 'Só título' }],
    };
    expect(normalizarRelatorio(dados)).toBeNull();
  });

  it('usa a nota padrão ou a média das competências quando falta a nota', () => {
    const semNota = { ...relatorioCompleto(), notaGeral: undefined };
    expect(normalizarRelatorio(semNota, { notaGeral: 9.04 })?.notaGeral).toBe(9);
    expect(normalizarRelatorio(semNota)?.notaGeral).toBe(7); // média de 8 e 6
    expect(normalizarRelatorio({ ...semNota, competencias: [] })).toBeNull();
  });

  it('a nota do próprio relatório tem prioridade sobre a padrão', () => {
    expect(normalizarRelatorio(relatorioCompleto(), { notaGeral: 2 })?.notaGeral).toBe(7.5);
  });

  it('limita notas das competências e da nota geral a 0–10', () => {
    const r = normalizarRelatorio({
      ...relatorioCompleto(),
      notaGeral: 42,
      competencias: [
        { nome: 'A', nota: -3, comentario: '' },
        { nome: 'B', nota: '9,96' },
        { nome: 'C', nota: 'sem nota' },
        { nota: 5 },
      ],
    });
    expect(r?.notaGeral).toBe(10);
    expect(r?.competencias).toEqual([
      { nome: 'A', nota: 0, comentario: '' },
      { nome: 'B', nota: 10, comentario: '' },
    ]);
  });

  it('deriva a classificação quando ausente ou inválida e aceita variações de escrita', () => {
    expect(
      normalizarRelatorio({ ...relatorioCompleto(), classificacao: undefined })?.classificacao,
    ).toBe('PREPARADO');
    expect(
      normalizarRelatorio({ ...relatorioCompleto(), classificacao: 'ÓTIMO' })?.classificacao,
    ).toBe('PREPARADO');
    expect(
      normalizarRelatorio({ ...relatorioCompleto(), notaGeral: 2, classificacao: 123 })
        ?.classificacao,
    ).toBe('INICIANTE');
    expect(
      normalizarRelatorio({ ...relatorioCompleto(), classificacao: 'Em desenvolvimento' })
        ?.classificacao,
    ).toBe('EM_DESENVOLVIMENTO');
    expect(
      normalizarRelatorio({
        ...relatorioCompleto(),
        notaGeral: 2,
        classificacao: 'preparado'.repeat(1000),
      })?.classificacao,
    ).toBe('INICIANTE');
  });

  it('descarta itens sem título ou descrição e converte itens em texto', () => {
    const r = normalizarRelatorio({
      ...relatorioCompleto(),
      pontosFortes: [
        { titulo: 'Sem descrição' },
        { descricao: 'Sem título' },
        { titulo: '   ', descricao: 'Título em branco' },
        42,
        null,
        'Pontualidade: chegou no horário combinado.',
        { titulo: 'Válido', descricao: 'Descrição válida' },
      ],
    });
    expect(r?.pontosFortes).toEqual([
      { titulo: 'Pontualidade', descricao: 'chegou no horário combinado.' },
      { titulo: 'Válido', descricao: 'Descrição válida' },
    ]);
  });

  it('limita a quantidade de itens das listas', () => {
    const muitos = Array.from({ length: 20 }, (_, i) => ({ titulo: `T${i}`, descricao: `D${i}` }));
    const r = normalizarRelatorio({
      ...relatorioCompleto(),
      pontosFortes: muitos,
      dicasComunicacao: Array.from({ length: 20 }, (_, i) => `Dica ${i}`),
      perguntasParaPraticar: Array.from({ length: 20 }, (_, i) => `Pergunta ${i}?`),
    });
    expect(r?.pontosFortes).toHaveLength(LIMITES_RELATORIO.itens);
    expect(r?.dicasComunicacao).toHaveLength(LIMITES_RELATORIO.itens);
    expect(r?.perguntasParaPraticar).toHaveLength(LIMITES_RELATORIO.itens);
  });

  it('corta textos longos e remove caracteres que o banco recusa', () => {
    const r = normalizarRelatorio({
      ...relatorioCompleto(),
      resumo: 'a'.repeat(5000),
      recomendacao: 'b'.repeat(5000),
      pontosFortes: [
        { titulo: 'T'.repeat(500), descricao: `Antes\u0000depois ${'x'.repeat(2000)}` },
      ],
    });
    expect(r?.resumo).toHaveLength(LIMITES_RELATORIO.resumo);
    expect(r?.recomendacao).toHaveLength(LIMITES_RELATORIO.recomendacao);
    expect(r?.pontosFortes[0].titulo).toHaveLength(LIMITES_RELATORIO.titulo);
    expect(r?.pontosFortes[0].descricao.length).toBeLessThanOrEqual(LIMITES_RELATORIO.texto);
    expect(r?.pontosFortes[0].descricao.startsWith('Antesdepois')).toBe(true);
  });

  it('não deixa metade de um emoji ao cortar', () => {
    const r = normalizarRelatorio({
      ...relatorioCompleto(),
      recomendacao: `${'a'.repeat(LIMITES_RELATORIO.recomendacao - 1)}😀`,
    });
    expect(r?.recomendacao).toBe('a'.repeat(LIMITES_RELATORIO.recomendacao - 1));
  });

  it('omite exemploResposta incompleto e evidência vazia', () => {
    const r = normalizarRelatorio({
      ...relatorioCompleto(),
      exemploResposta: { pergunta: 'Só pergunta' },
      pontosFortes: [{ titulo: 'A', descricao: 'B', evidencia: '  ' }],
    });
    expect(r?.exemploResposta).toBeUndefined();
    expect(r?.pontosFortes[0]).toEqual({ titulo: 'A', descricao: 'B' });
  });
});

describe('relatorioLegado', () => {
  const legado = {
    pontosFortes:
      '- Comunicação: falou com clareza\n\n• Demonstrou interesse pela vaga. Pesquisou a empresa.',
    pontosMelhoria:
      '1. Dê exemplos concretos das suas experiências na escola e em projetos voluntários da comunidade',
    dicasComunicacao: 'Fale devagar\n**Olhe** para a câmera',
  };

  it('monta a versão 0 com uma linha por item', () => {
    const r = relatorioLegado({ ...legado, notaGeral: null });
    expect(r.versao).toBe(0);
    expect(r.notaGeral).toBeNull();
    expect(r.classificacao).toBeNull();
    expect(r.pontosFortes).toEqual([
      { titulo: 'Comunicação', descricao: 'falou com clareza' },
      {
        titulo: 'Demonstrou interesse pela vaga',
        descricao: 'Demonstrou interesse pela vaga. Pesquisou a empresa.',
      },
    ]);
    expect(r.pontosMelhoria).toHaveLength(1);
    expect(r.pontosMelhoria[0].titulo.length).toBeLessThanOrEqual(61);
    expect(r.pontosMelhoria[0].titulo.endsWith('…')).toBe(true);
    expect(r.pontosMelhoria[0].comoMelhorar).toBe('');
    expect(r.dicasComunicacao).toEqual(['Fale devagar', 'Olhe para a câmera']);
    expect(r.competencias).toEqual([]);
    expect(r.planoDeAcao).toEqual([]);
  });

  it('deriva a classificação quando há nota', () => {
    const r = relatorioLegado({ ...legado, notaGeral: 8.7 });
    expect(r.notaGeral).toBe(8.7);
    expect(r.classificacao).toBe('DESTAQUE');
  });

  it('lida com textos vazios', () => {
    const r = relatorioLegado({ pontosFortes: '', pontosMelhoria: '\n\n', dicasComunicacao: '-' });
    expect(r.pontosFortes).toEqual([]);
    expect(r.pontosMelhoria).toEqual([]);
    expect(r.dicasComunicacao).toEqual([]);
  });
});

describe('relatorioParaExibicao', () => {
  it('usa o relatório v1 quando existe e o legado quando não', () => {
    const textos = { pontosFortes: 'A', pontosMelhoria: 'B', dicasComunicacao: 'C' };
    expect(
      relatorioParaExibicao({ ...textos, notaGeral: 7, relatorio: relatorioCompleto() }).versao,
    ).toBe(1);
    expect(relatorioParaExibicao({ ...textos, notaGeral: 7, relatorio: null }).versao).toBe(0);
    expect(
      relatorioParaExibicao({ ...textos, notaGeral: 7, relatorio: { lixo: true } }).versao,
    ).toBe(0);
  });
});

describe('textosLegados', () => {
  it('gera uma linha por item no formato "Título: descrição"', () => {
    const r = normalizarRelatorio({
      ...relatorioCompleto(),
      pontosFortes: [
        { titulo: 'Clareza', descricao: 'Respostas\ndiretas' },
        'Boa postura durante toda a conversa.',
      ],
      dicasComunicacao: ['Respire', 'Sorria'],
    }) as RelatorioEntrevista;
    const textos = textosLegados(r);
    expect(textos.pontosFortes).toBe(
      'Clareza: Respostas diretas\nBoa postura durante toda a conversa.',
    );
    expect(textos.pontosMelhoria).toBe('Use exemplos: Conte situações reais.');
    expect(textos.dicasComunicacao).toBe('Respire\nSorria');
  });

  it('só omite o título quando ele é o começo da própria descrição', () => {
    const r = normalizarRelatorio({
      ...relatorioCompleto(),
      pontosFortes: [
        // Título que é prefixo da descrição, mas não a primeira frase: mantém
        { titulo: 'Clareza', descricao: 'Clareza nas respostas.' },
        // Título igual à primeira frase: não repete
        { titulo: 'Boa postura', descricao: 'Boa postura. Sentou-se de forma adequada.' },
      ],
    }) as RelatorioEntrevista;
    expect(textosLegados(r).pontosFortes).toBe(
      'Clareza: Clareza nas respostas.\nBoa postura. Sentou-se de forma adequada.',
    );
    const legado = relatorioLegado({ ...textosLegados(r), notaGeral: r.notaGeral });
    expect(legado.pontosFortes.map((p) => p.titulo)).toEqual(['Clareza', 'Boa postura']);
  });

  it('volta para os mesmos itens quando lido como legado', () => {
    const r = normalizarRelatorio(relatorioCompleto()) as RelatorioEntrevista;
    const legado = relatorioLegado({ ...textosLegados(r), notaGeral: r.notaGeral });
    expect(legado.pontosMelhoria.map((p) => p.titulo)).toEqual(
      r.pontosMelhoria.map((p) => p.titulo),
    );
    expect(legado.classificacao).toBe(r.classificacao);
  });
});

describe('tituloCurto', () => {
  it('usa a primeira frase e corta textos longos em palavra inteira', () => {
    expect(tituloCurto('Boa comunicação. Depois falou de outra coisa.')).toBe('Boa comunicação');
    const longo = tituloCurto('Palavra '.repeat(20));
    expect(longo.length).toBeLessThanOrEqual(61);
    expect(longo.endsWith('Palavra…')).toBe(true);
  });
});
