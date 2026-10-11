import { AutorMensagem, TipoMensagem } from '@prisma/client';
import {
  conferirComConversa,
  contarParticipacao,
  dialogoRecente,
  evidenciaDoCandidato,
  formatarDialogo,
  NOTA_MAXIMA_CONVERSA_CURTA,
  RESPOSTAS_PARA_NOTA_CHEIA,
  resumoDoResultado,
  textoContexto,
  type MensagemDialogo,
} from './dialogo';
import type { RelatorioEntrevista } from './relatorio-entrevista';

const helena = (conteudo: string): MensagemDialogo => ({
  autor: AutorMensagem.RECRUTADORA,
  tipo: TipoMensagem.TEXTO,
  conteudo,
});
const jovem = (conteudo: string, tipo: TipoMensagem = TipoMensagem.TEXTO): MensagemDialogo => ({
  autor: AutorMensagem.CANDIDATO,
  tipo,
  conteudo,
});

describe('formatarDialogo / dialogoRecente / contarParticipacao', () => {
  const conversa = [
    helena('Oi! Qual vaga você quer treinar?'),
    jovem('Jovem aprendiz   administrativo'),
    helena('Me conte sobre você.'),
    jovem('Tenho 17 anos e organizo o estoque da loja da minha tia.', TipoMensagem.AUDIO),
  ];

  it('numera as falas, identifica áudio e junta espaços', () => {
    expect(formatarDialogo(conversa)).toBe(
      [
        '[01] Helena: Oi! Qual vaga você quer treinar?',
        '[02] Candidato: Jovem aprendiz administrativo',
        '[03] Helena: Me conte sobre você.',
        '[04] Candidato (áudio transcrito): Tenho 17 anos e organizo o estoque da loja da minha tia.',
      ].join('\n'),
    );
  });

  it('o trecho recente mantém a numeração original', () => {
    expect(dialogoRecente(conversa, 2).split('\n')[0]).toMatch(/^\[03\] Helena/);
    expect(dialogoRecente(conversa, 10)).toBe(formatarDialogo(conversa));
  });

  it('conta respostas do candidato e falas da Helena', () => {
    expect(contarParticipacao(conversa)).toEqual({ respostasCandidato: 2, perguntasHelena: 2 });
  });
});

describe('textoContexto', () => {
  it('resume currículo e treinos anteriores em texto para o prompt', () => {
    const texto = textoContexto({
      primeiroNome: 'Ana',
      curriculo: {
        cargoDesejado: 'Jovem Aprendiz',
        perfilProfissional: null,
        experiencias: [{ cargo: 'Ajudante', empresa: 'Loja da família', periodo: '2024 – atual' }],
        formacao: [{ curso: 'Ensino Médio', instituicao: 'Escola Estadual', periodo: '' }],
        habilidades: ['Excel'],
        idiomas: [],
      },
      historico: [
        { cargoAlvo: 'Vendedor', notaGeral: 6.5, principaisMelhorias: ['Exemplos concretos'] },
      ],
    });
    expect(texto).toContain('Nome: Ana');
    expect(texto).toContain('Experiências: Ajudante em Loja da família (2024 – atual)');
    expect(texto).toContain('Formação: Ensino Médio — Escola Estadual');
    expect(texto).toContain('Vendedor (nota 6,5) — precisava melhorar: Exemplos concretos');
  });

  it('sem currículo nem histórico: diz que é a primeira vez', () => {
    const texto = textoContexto({ primeiroNome: 'Bia', curriculo: null, historico: [] });
    expect(texto).toContain('ainda não montou um currículo');
    expect(texto).toContain('nenhum (é a primeira simulação)');
  });
});

describe('evidenciaDoCandidato / conferirComConversa', () => {
  const falas = [
    'Eu chamei a gerente, anotei as compras no papel e fui explicando para os clientes.',
    'Quero aprender como funciona uma empresa por dentro',
    'Sou bem organizado',
    'Gosto de atender pessoas',
  ];

  it('aceita a citação com outra pontuação/acento e recusa o que ele não disse', () => {
    expect(evidenciaDoCandidato('"anotei as compras no papel"', falas.join('\n'))).toBe(true);
    expect(evidenciaDoCandidato('Quero aprender como funciona uma empresa', falas.join(' '))).toBe(
      true,
    );
    expect(evidenciaDoCandidato('Sempre lidero a equipe', falas.join(' '))).toBe(false);
    expect(evidenciaDoCandidato('sou', falas.join(' '))).toBe(false); // curto demais para ser prova
  });

  const relatorio = (nota: number): RelatorioEntrevista => ({
    versao: 1,
    notaGeral: nota,
    classificacao: 'DESTAQUE',
    resumo: 'Bom',
    recomendacao: 'Segue',
    competencias: [],
    pontosFortes: [
      { titulo: 'Calma', descricao: 'Resolveu', evidencia: 'anotei as compras no papel' },
      { titulo: 'Liderança', descricao: 'Liderou', evidencia: 'Sempre lidero a equipe' },
    ],
    pontosMelhoria: [
      {
        titulo: 'Motivação',
        descricao: 'Genérica',
        comoMelhorar: 'Conecte',
        evidencia: 'inventado',
      },
    ],
    dicasComunicacao: [],
    planoDeAcao: [],
    perguntasParaPraticar: [],
  });

  it('retira só as evidências que o candidato não disse', () => {
    const r = conferirComConversa(relatorio(9), falas);
    expect(r.pontosFortes[0].evidencia).toBe('anotei as compras no papel');
    expect(r.pontosFortes[1]).not.toHaveProperty('evidencia');
    expect(r.pontosMelhoria[0]).not.toHaveProperty('evidencia');
    expect(r.notaGeral).toBe(9); // conversa com respostas suficientes: nota mantida
    expect(r.classificacao).toBe('DESTAQUE');
  });

  it('conversa curta: nota limitada e classificação recalculada', () => {
    const curtas = falas.slice(0, RESPOSTAS_PARA_NOTA_CHEIA - 1);
    const r = conferirComConversa(relatorio(9.2), curtas);
    expect(r.notaGeral).toBe(NOTA_MAXIMA_CONVERSA_CURTA);
    expect(r.classificacao).toBe('EM_DESENVOLVIMENTO');
    // Nota já baixa não muda
    expect(conferirComConversa(relatorio(4), curtas).notaGeral).toBe(4);
  });
});

describe('conferirComConversa — notas coerentes', () => {
  const base = {
    versao: 1 as const,
    notaGeral: 9.5,
    classificacao: 'DESTAQUE' as const,
    resumo: 'Resumo.',
    recomendacao: 'Seguiria.',
    competencias: [
      { nome: 'Comunicação', nota: 6, comentario: 'ok' },
      { nome: 'Postura profissional', nota: 7, comentario: 'ok' },
    ],
    pontosFortes: [{ titulo: 'Cordialidade', descricao: 'Foi educado.' }],
    pontosMelhoria: [
      { titulo: 'Exemplos', descricao: 'Faltou exemplo.', comoMelhorar: 'Use o método STAR.' },
    ],
    dicasComunicacao: ['Dica'],
    planoDeAcao: [{ passo: 'Treinar' }],
    perguntasParaPraticar: [],
  };
  const falas = Array.from({ length: 6 }, (_, i) => `Resposta completa número ${i + 1}`);

  it('nota geral fica no máximo 1 ponto acima da média das competências', () => {
    const r = conferirComConversa(base, falas);
    expect(r.notaGeral).toBe(7.5);
    expect(r.classificacao).toBe('PREPARADO');
  });

  it('conversa curta limita também as competências', () => {
    const r = conferirComConversa(
      { ...base, competencias: [{ nome: 'Comunicação', nota: 9, comentario: 'ok' }] },
      falas.slice(0, 2),
    );
    expect(r.competencias[0].nota).toBe(6);
    expect(r.notaGeral).toBeLessThanOrEqual(6);
  });

  it('resumo do resultado traz nota em texto, classificação legível e a melhoria principal', () => {
    const r = resumoDoResultado(conferirComConversa(base, falas));
    expect(r).toEqual({
      notaGeral: 7.5,
      notaTexto: '7,5',
      classificacao: 'PREPARADO',
      classificacaoTexto: 'Preparado(a)',
      destaques: ['Cordialidade'],
      melhoria: { titulo: 'Exemplos', comoMelhorar: 'Use o método STAR.' },
    });
  });
});
