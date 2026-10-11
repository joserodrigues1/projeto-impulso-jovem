import { resumirCurriculo } from './resumo-curriculo';

describe('resumirCurriculo', () => {
  it('lê o formato v2 sem dados de contato', () => {
    const r = resumirCurriculo({
      versao: 2,
      nomeCompleto: 'Fulano de Tal',
      email: 'fulano@exemplo.com',
      telefone: '(61) 99999-9999',
      cargoDesejado: 'Jovem Aprendiz Administrativo',
      perfilProfissional: 'Estudante do ensino médio.',
      experiencias: [
        {
          empresa: 'Mercado',
          cargo: 'Repositor',
          periodo: 'jun/2023 – dez/2023',
          atividades: ['Repor'],
        },
      ],
      formacao: [{ instituicao: 'Escola X', curso: 'Ensino Médio', periodo: '2022 – 2024' }],
      habilidades: ['Excel', '', 42],
      idiomas: [{ idioma: 'Inglês', nivel: 'Básico' }, { nivel: 'sem idioma' }],
      premiacoes: ['Olimpíada'],
    });
    expect(r).toEqual({
      cargoDesejado: 'Jovem Aprendiz Administrativo',
      perfilProfissional: 'Estudante do ensino médio.',
      experiencias: [{ cargo: 'Repositor', empresa: 'Mercado', periodo: 'jun/2023 – dez/2023' }],
      formacao: [{ curso: 'Ensino Médio', instituicao: 'Escola X', periodo: '2022 – 2024' }],
      habilidades: ['Excel'],
      idiomas: [{ idioma: 'Inglês', nivel: 'Básico' }],
    });
    expect(JSON.stringify(r)).not.toContain('fulano@exemplo.com');
  });

  it('lê o formato v1 antigo (datas, resumo e nível de escolaridade)', () => {
    const r = resumirCurriculo({
      versao: 1,
      resumoProfissional: 'Gosto de aprender.',
      nivelEscolaridade: 'Ensino Médio Completo',
      habilidades: ['Atendimento'],
      experiencias: [
        { cargo: 'Atendente', empresa: 'Loja', dataInicio: '2023-06', dataFim: '2023-12' },
        { cargo: 'Auxiliar', empresa: 'Escritório', dataInicio: '2024-02' },
      ],
    });
    expect(r?.perfilProfissional).toBe('Gosto de aprender.');
    expect(r?.formacao).toEqual([{ curso: 'Ensino Médio Completo', instituicao: '', periodo: '' }]);
    expect(r?.experiencias).toEqual([
      { cargo: 'Atendente', empresa: 'Loja', periodo: 'jun/2023 – dez/2023' },
      { cargo: 'Auxiliar', empresa: 'Escritório', periodo: 'fev/2024 – atual' },
    ]);
    expect(r?.cargoDesejado).toBeNull();
  });

  it('devolve null para conteúdo vazio ou inválido', () => {
    expect(resumirCurriculo(null)).toBeNull();
    expect(resumirCurriculo('texto')).toBeNull();
    expect(resumirCurriculo({ versao: 2, experiencias: [], habilidades: [] })).toBeNull();
  });
});
