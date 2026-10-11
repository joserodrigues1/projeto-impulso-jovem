/**
 * Dados de demonstração para desenvolvimento local.
 *
 *   npm run db:seed      (ou: npx tsx prisma/seed.ts)
 *
 * - Idempotente: pode rodar quantas vezes quiser — usa ids fixos e não duplica nada.
 * - Contas de teste (senha "Senha123"): admin@impulso.gov.br (ADMIN) e jovem@teste.com (USUARIO).
 *   Se a conta já existir, a senha é redefinida; o telefone é mantido se já estiver normalizado
 *   (senão vira um fictício livre: 5561900000001, 5561900000002, ...).
 * - Recusa rodar com NODE_ENV=production (a menos que SEED_FORCAR=true).
 * - Todos os dados são fictícios.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  AutorMensagem,
  Prisma,
  PrismaClient,
  StatusConta,
  StatusSessaoEntrevista,
  TipoMensagem,
  TipoUsuario,
} from '@prisma/client';
import { hashSenha } from '../src/common/crypto/senha';
import {
  formatarTelefone,
  TELEFONE_NORMALIZADO_REGEX,
  variantesTelefone,
} from '../src/common/validators/telefone';

// Mesmo comportamento do src/config/env.ts: o .env local não sobrescreve o ambiente
const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) process.loadEnvFile(envPath);

if (process.env.NODE_ENV === 'production' && process.env.SEED_FORCAR !== 'true') {
  console.error(
    'Seed bloqueado: NODE_ENV=production. Se tiver certeza, rode com SEED_FORCAR=true.',
  );
  process.exit(1);
}

const prisma = new PrismaClient();

const SENHA_TESTE = 'Senha123';
const TERMO_VERSAO = process.env.LGPD_TERMO_VERSAO || '2026.1';

/** Ids fixos dos dados de demonstração (é o que torna o seed idempotente). */
const IDS = {
  experienciaCaixa: 'd3e0a000-0000-4000-8000-000000000001',
  experienciaMonitor: 'd3e0a000-0000-4000-8000-000000000002',
  curriculo: 'd3e0a000-0000-4000-8000-000000000101',
  sessao: 'd3e0a000-0000-4000-8000-000000000201',
  entrevistaAntiga: 'd3e0a000-0000-4000-8000-000000000301',
  entrevistaRecente: 'd3e0a000-0000-4000-8000-000000000302',
} as const;

// ─────────────────────────── Tipos (espelham docs/ARQUITETURA.md) ───────────────────────────
// `type` (e não `interface`) para o Prisma aceitar os objetos como JSON.

type ConteudoCurriculo = {
  versao: 2;
  nomeCompleto: string;
  email: string;
  telefone: string;
  cidade?: string;
  uf?: string;
  cargoDesejado?: string;
  perfilProfissional: string;
  experiencias: Array<{
    empresa: string;
    cargo: string;
    periodo: string;
    inicio?: string;
    fim?: string;
    atual?: boolean;
    atividades: string[];
  }>;
  formacao: Array<{
    instituicao: string;
    curso: string;
    periodo: string;
    situacao?: 'CONCLUIDO' | 'CURSANDO' | 'TRANCADO';
  }>;
  habilidades: string[];
  idiomas: Array<{ idioma: string; nivel: string }>;
  premiacoes: string[];
};

type Ponto = { titulo: string; descricao: string; evidencia?: string };

type RelatorioEntrevista = {
  versao: 1;
  notaGeral: number;
  classificacao: 'INICIANTE' | 'EM_DESENVOLVIMENTO' | 'PREPARADO' | 'DESTAQUE';
  resumo: string;
  recomendacao: string;
  competencias: Array<{ nome: string; nota: number; comentario: string }>;
  pontosFortes: Ponto[];
  pontosMelhoria: Array<Ponto & { comoMelhorar: string }>;
  dicasComunicacao: string[];
  planoDeAcao: Array<{ passo: string; prazo?: string }>;
  perguntasParaPraticar: string[];
  exemploResposta?: { pergunta: string; resposta: string };
};

// ─────────────────────────────────────── Utilitários ───────────────────────────────────────

const diasAtras = (dias: number, hora = 14, minuto = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(hora, minuto, 0, 0);
  return d;
};

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0];

/** Colunas de texto legadas de EntrevistaBot: uma linha por item ("Título: descrição"). */
function textosLegados(r: RelatorioEntrevista) {
  const linha = (p: Ponto) => `${p.titulo}: ${p.descricao}`;
  return {
    pontosFortes: r.pontosFortes.map(linha).join('\n'),
    pontosMelhoria: r.pontosMelhoria.map(linha).join('\n'),
    dicasComunicacao: r.dicasComunicacao.join('\n'),
  };
}

/** Primeiro telefone fictício (5561900000001, 5561900000002, ...) livre para esta conta. */
async function telefoneFicticioLivre(preferido: number, email: string): Promise<string> {
  for (let n = preferido; n < preferido + 100; n++) {
    const telefone = `55619${String(n).padStart(8, '0')}`;
    const ocupado = await prisma.usuario.findFirst({
      where: { telefone: { in: variantesTelefone(telefone) }, email: { not: email } },
      select: { id: true },
    });
    if (!ocupado) return telefone;
  }
  throw new Error('Nenhum telefone fictício livre encontrado para o seed.');
}

async function contaDeTeste(dados: {
  email: string;
  nomeCompleto: string;
  tipoUsuario: TipoUsuario;
  telefonePreferido: number;
  senhaHash: string;
}) {
  const existente = await prisma.usuario.findUnique({
    where: { email: dados.email },
    select: { id: true, telefone: true },
  });
  if (existente) {
    // Conta já existe: garante acesso (senha, tipo e status). Telefone já normalizado fica
    // como está (não quebra testes do WhatsApp feitos com ela); fora do padrão — que o bot
    // nem encontra — vira um fictício livre.
    const telefoneValido = TELEFONE_NORMALIZADO_REGEX.test(existente.telefone);
    return prisma.usuario.update({
      where: { email: dados.email },
      data: {
        senhaHash: dados.senhaHash,
        tipoUsuario: dados.tipoUsuario,
        statusConta: StatusConta.ATIVO,
        ...(telefoneValido
          ? {}
          : { telefone: await telefoneFicticioLivre(dados.telefonePreferido, dados.email) }),
      },
    });
  }
  return prisma.usuario.create({
    data: {
      email: dados.email,
      nomeCompleto: dados.nomeCompleto,
      senhaHash: dados.senhaHash,
      tipoUsuario: dados.tipoUsuario,
      statusConta: StatusConta.ATIVO,
      telefone: await telefoneFicticioLivre(dados.telefonePreferido, dados.email),
      perfil: { create: {} },
      consentimentos: { create: { versaoTermo: TERMO_VERSAO, userAgent: 'seed' } },
    },
  });
}

// ───────────────────────────────────────── Seed ─────────────────────────────────────────

async function main() {
  console.log('Iniciando o seed de demonstração...');
  const senhaHash = await hashSenha(SENHA_TESTE);

  const admin = await contaDeTeste({
    email: 'admin@impulso.gov.br',
    nomeCompleto: 'Administração Impulso Jovem',
    tipoUsuario: TipoUsuario.ADMIN,
    telefonePreferido: 1,
    senhaHash,
  });
  await prisma.perfil.upsert({
    where: { usuarioId: admin.id },
    update: {},
    create: { usuarioId: admin.id },
  });
  console.log(`Conta ADMIN pronta: ${admin.email}`);

  const jovem = await contaDeTeste({
    email: 'jovem@teste.com',
    nomeCompleto: 'João Exemplo da Silva',
    tipoUsuario: TipoUsuario.USUARIO,
    telefonePreferido: 2,
    senhaHash,
  });
  const nome = primeiroNome(jovem.nomeCompleto);
  console.log(`Conta USUARIO pronta: ${jovem.email}`);

  // ── Perfil
  const habilidades = [
    'Atendimento ao público',
    'Pacote Office',
    'Organização',
    'Trabalho em equipe',
    'Comunicação',
  ];
  const perfilDados = {
    resumoProfissional:
      'Jovem de 17 anos em busca do primeiro emprego formal como aprendiz. Tenho experiência com atendimento ao público e gosto de organizar processos.',
    nivelEscolaridade: 'Ensino Médio completo',
    habilidades,
    cidade: 'Brasília',
    uf: 'DF',
  };
  const perfil = await prisma.perfil.upsert({
    where: { usuarioId: jovem.id },
    update: perfilDados,
    create: { usuarioId: jovem.id, ...perfilDados },
  });

  const experiencias = [
    {
      id: IDS.experienciaCaixa,
      cargo: 'Auxiliar de caixa (temporário)',
      empresa: 'Mercadinho Exemplo',
      descricao:
        'Atendimento no caixa, conferência de troco e organização das gôndolas no fim de ano.',
      dataInicio: new Date('2024-12-01'),
      dataFim: new Date('2025-02-28'),
      atual: false,
    },
    {
      id: IDS.experienciaMonitor,
      cargo: 'Monitor voluntário',
      empresa: 'Projeto Social Exemplo',
      descricao: 'Apoio em aulas de informática básica para crianças, aos sábados.',
      dataInicio: new Date('2024-03-01'),
      dataFim: null,
      atual: true,
    },
  ];
  for (const { id, ...exp } of experiencias) {
    await prisma.experiencia.upsert({
      where: { id },
      update: { ...exp, perfilId: perfil.id },
      create: { id, ...exp, perfilId: perfil.id },
    });
  }

  // ── Currículo (ConteudoCurriculo v2)
  const conteudo: ConteudoCurriculo = {
    versao: 2,
    nomeCompleto: jovem.nomeCompleto,
    email: jovem.email,
    telefone: formatarTelefone(jovem.telefone),
    cidade: 'Brasília',
    uf: 'DF',
    cargoDesejado: 'Jovem Aprendiz Administrativo',
    perfilProfissional:
      'Jovem comunicativo e organizado, com experiência em atendimento ao público no varejo e em trabalho voluntário. ' +
      'Cursando Técnico em Administração, busco minha primeira oportunidade como Jovem Aprendiz para aprender as rotinas ' +
      'administrativas e contribuir com responsabilidade, pontualidade e vontade de crescer.',
    experiencias: [
      {
        empresa: 'Mercadinho Exemplo',
        cargo: 'Auxiliar de caixa (temporário)',
        periodo: 'dez/2024 – fev/2025',
        inicio: '2024-12',
        fim: '2025-02',
        atividades: [
          'Atendi em média 80 clientes por dia no caixa, com conferência de troco e cupom fiscal.',
          'Ajudei a reorganizar as gôndolas, o que facilitou a reposição de produtos.',
          'Mantive a calma e o bom atendimento em dias de movimento intenso.',
        ],
      },
      {
        empresa: 'Projeto Social Exemplo',
        cargo: 'Monitor voluntário',
        periodo: 'mar/2024 – atual',
        inicio: '2024-03',
        atual: true,
        atividades: [
          'Apoio em aulas de informática básica para turmas de até 15 crianças.',
          'Preparo listas de presença e materiais das aulas no Excel e no Word.',
        ],
      },
    ],
    formacao: [
      {
        instituicao: 'Escola Técnica Exemplo',
        curso: 'Técnico em Administração',
        periodo: '2025 – atual',
        situacao: 'CURSANDO',
      },
      {
        instituicao: 'Centro de Ensino Médio Exemplo',
        curso: 'Ensino Médio',
        periodo: '2022 – 2024',
        situacao: 'CONCLUIDO',
      },
    ],
    habilidades,
    idiomas: [
      { idioma: 'Português', nivel: 'Nativo' },
      { idioma: 'Inglês', nivel: 'Básico' },
    ],
    premiacoes: [
      'Certificado de Excel Básico — 20 h (2024)',
      'Menção honrosa na feira de ciências da escola (2023)',
    ],
  };
  const dadosCurriculo = {
    usuarioId: jovem.id,
    titulo: 'Currículo — Jovem Aprendiz Administrativo',
    conteudo,
    refinadoPorIa: true,
  };
  await prisma.curriculoGerado.upsert({
    where: { id: IDS.curriculo },
    update: dadosCurriculo,
    create: { id: IDS.curriculo, ...dadosCurriculo, geradoEm: diasAtras(12) },
  });

  // ── Simulação de entrevista no WhatsApp (já analisada)
  const cargoAlvo = 'Jovem Aprendiz Administrativo';
  const inicioSessao = diasAtras(2, 14, 0);
  const mensagens: Array<{ autor: AutorMensagem; tipo?: TipoMensagem; conteudo: string }> = [
    {
      autor: AutorMensagem.CANDIDATO,
      conteudo: 'Oi! Quero treinar para uma entrevista de jovem aprendiz.',
    },
    {
      autor: AutorMensagem.RECRUTADORA,
      conteudo: `Olá, ${nome}! Eu sou a Helena, recrutadora virtual do Impulso Jovem. Vamos simular uma entrevista para ${cargoAlvo}. Para começar, me conta um pouco sobre você.`,
    },
    {
      autor: AutorMensagem.CANDIDATO,
      conteudo:
        'Tenho 17 anos, terminei o ensino médio e estou fazendo técnico em administração. Nas férias trabalhei no caixa de um mercadinho.',
    },
    {
      autor: AutorMensagem.RECRUTADORA,
      conteudo: 'Que legal! Me conta uma situação difícil que você viveu no caixa e como resolveu.',
    },
    {
      autor: AutorMensagem.CANDIDATO,
      tipo: TipoMensagem.AUDIO,
      conteudo:
        'Teve um dia que o sistema caiu e a fila ficou enorme. Eu chamei a gerente, anotei as compras no papel e fui explicando para os clientes o que estava acontecendo. Ninguém foi embora sem pagar.',
    },
    {
      autor: AutorMensagem.RECRUTADORA,
      conteudo: 'Ótimo exemplo! E por que você quer ser jovem aprendiz na área administrativa?',
    },
    {
      autor: AutorMensagem.CANDIDATO,
      conteudo:
        'Porque eu gosto de organizar as coisas e quero aprender como funciona uma empresa por dentro.',
    },
    {
      autor: AutorMensagem.RECRUTADORA,
      conteudo: `Obrigada, ${nome}! Encerramos por aqui. Em instantes você recebe o seu relatório com os pontos fortes e o que dá para melhorar.`,
    },
  ];
  const fimSessao = new Date(inicioSessao.getTime() + mensagens.length * 90_000);
  const dadosSessao = {
    usuarioId: jovem.id,
    status: StatusSessaoEntrevista.ANALISADA,
    cargoAlvo,
    empresaAlvo: null,
    motivoFinalizacao: 'CONCLUIDA',
    iniciadaEm: inicioSessao,
    ultimaMensagemEm: fimSessao,
    finalizadaEm: fimSessao,
  };
  await prisma.sessaoEntrevista.upsert({
    where: { id: IDS.sessao },
    update: dadosSessao,
    create: { id: IDS.sessao, ...dadosSessao },
  });
  await prisma.$transaction([
    prisma.mensagemEntrevista.deleteMany({ where: { sessaoId: IDS.sessao } }),
    prisma.mensagemEntrevista.createMany({
      data: mensagens.map((m, i) => ({
        sessaoId: IDS.sessao,
        autor: m.autor,
        tipo: m.tipo ?? TipoMensagem.TEXTO,
        conteudo: m.conteudo,
        criadoEm: new Date(inicioSessao.getTime() + i * 90_000),
      })),
    }),
  ]);

  // ── Relatórios (RelatorioEntrevista v1) — duas notas para o dashboard mostrar evolução
  const relatorioAntigo: RelatorioEntrevista = {
    versao: 1,
    notaGeral: 5.5,
    classificacao: 'EM_DESENVOLVIMENTO',
    resumo:
      'Você foi educado e mostrou interesse pela vaga, mas as respostas ficaram curtas e sem exemplos. ' +
      'Com um pouco de preparo, dá para mostrar muito mais do que você já sabe fazer.',
    recomendacao:
      'Ainda não seguiria para a próxima etapa: faltaram exemplos concretos nas respostas.',
    competencias: [
      {
        nome: 'Comunicação',
        nota: 6,
        comentario: 'Linguagem educada e clara, mas respostas muito curtas.',
      },
      {
        nome: 'Clareza e objetividade',
        nota: 6,
        comentario: 'Foi direto, porém sem explicar o contexto.',
      },
      {
        nome: 'Exemplos práticos (STAR)',
        nota: 4,
        comentario: 'Não trouxe situações reais para comprovar o que disse.',
      },
      {
        nome: 'Interesse pela vaga',
        nota: 6,
        comentario: 'Demonstrou vontade, mas sem dizer por que essa área.',
      },
    ],
    pontosFortes: [
      {
        titulo: 'Educação e cordialidade',
        descricao: 'Cumprimentou e agradeceu, o que passa uma boa primeira impressão.',
      },
      {
        titulo: 'Disponibilidade',
        descricao: 'Deixou claro que tem horário livre para conciliar estudo e trabalho.',
      },
    ],
    pontosMelhoria: [
      {
        titulo: 'Respostas muito curtas',
        descricao: 'Várias respostas tiveram uma frase só, o que dificulta conhecer você.',
        evidencia: 'Sou esforçado.',
        comoMelhorar:
          'Depois de cada afirmação, conte um exemplo real que mostre aquilo na prática.',
      },
      {
        titulo: 'Pouco conhecimento sobre a vaga',
        descricao: 'Não ficou claro o que você sabe sobre as atividades de um jovem aprendiz.',
        comoMelhorar: 'Antes da entrevista, pesquise a empresa e as tarefas comuns da função.',
      },
    ],
    dicasComunicacao: [
      'Use o método STAR: situação, tarefa, ação e resultado.',
      'Evite respostas de uma palavra — explique o porquê.',
    ],
    planoDeAcao: [
      {
        passo: 'Escreva 3 situações reais em que você ajudou alguém ou resolveu um problema.',
        prazo: 'Esta semana',
      },
      {
        passo: 'Treine em voz alta a resposta "Fale sobre você" em até 1 minuto.',
        prazo: 'Próximos 3 dias',
      },
      { passo: 'Faça uma nova simulação com a Helena.', prazo: 'Próxima semana' },
    ],
    perguntasParaPraticar: [
      'Fale um pouco sobre você.',
      'Quais são seus pontos fortes?',
      'Onde você se vê daqui a 2 anos?',
    ],
    exemploResposta: {
      pergunta: 'Quais são seus pontos fortes?',
      resposta:
        'Sou organizado e responsável. No projeto social onde sou voluntário, eu preparo as listas de presença e os materiais das aulas, e nunca deixei uma turma sem material.',
    },
  };

  const relatorioRecente: RelatorioEntrevista = {
    versao: 1,
    notaGeral: 7.8,
    classificacao: 'PREPARADO',
    resumo:
      'Boa evolução! Você se apresentou com clareza e trouxe um exemplo real e bem contado da sua experiência no caixa. ' +
      'Falta só detalhar melhor sua motivação para a área administrativa.',
    recomendacao: 'Seguiria para a próxima etapa: mostrou responsabilidade e calma sob pressão.',
    competencias: [
      { nome: 'Comunicação', nota: 8, comentario: 'Respostas claras e com bom vocabulário.' },
      {
        nome: 'Exemplos práticos (STAR)',
        nota: 8.5,
        comentario: 'O exemplo do sistema fora do ar teve situação, ação e resultado.',
      },
      {
        nome: 'Autoconhecimento',
        nota: 7,
        comentario: 'Falou de si com segurança, mas pode citar mais qualidades.',
      },
      {
        nome: 'Postura profissional',
        nota: 8,
        comentario: 'Tom respeitoso e objetivo do início ao fim.',
      },
      {
        nome: 'Interesse pela vaga',
        nota: 7,
        comentario: 'Mostrou interesse, mas a motivação ficou genérica.',
      },
    ],
    pontosFortes: [
      {
        titulo: 'Calma sob pressão',
        descricao:
          'Mostrou que sabe agir quando algo dá errado, sem deixar o cliente sem resposta.',
        evidencia:
          'Eu chamei a gerente, anotei as compras no papel e fui explicando para os clientes',
      },
      {
        titulo: 'Exemplo com resultado',
        descricao: 'Fechou a história com um resultado concreto, o que dá credibilidade.',
        evidencia: 'Ninguém foi embora sem pagar.',
      },
      {
        titulo: 'Apresentação objetiva',
        descricao:
          'Em poucas linhas contou idade, estudos e experiência — tudo que o recrutador precisa.',
      },
    ],
    pontosMelhoria: [
      {
        titulo: 'Motivação genérica',
        descricao:
          'A resposta sobre por que a área administrativa poderia servir para qualquer vaga.',
        evidencia: 'quero aprender como funciona uma empresa por dentro',
        comoMelhorar:
          'Ligue sua motivação a algo que você já fez, como organizar as listas no projeto social.',
      },
      {
        titulo: 'Poucas habilidades citadas',
        descricao: 'Você tem Excel e experiência com atendimento, mas quase não mencionou isso.',
        comoMelhorar: 'Prepare uma frase que conecte suas habilidades às tarefas da vaga.',
      },
    ],
    dicasComunicacao: [
      'Continue usando exemplos reais — esse é o seu ponto mais forte.',
      'Termine as respostas com o que você aprendeu na situação.',
      'Cite números quando puder (ex.: quantos clientes atendia por dia).',
    ],
    planoDeAcao: [
      {
        passo: 'Reescreva a resposta "Por que esta vaga?" ligando-a a uma experiência sua.',
        prazo: 'Hoje',
      },
      { passo: 'Liste 3 habilidades e um exemplo prático para cada uma.', prazo: 'Esta semana' },
      {
        passo: 'Pesquise 2 empresas com vagas de aprendiz e anote o que elas valorizam.',
        prazo: 'Esta semana',
      },
      {
        passo: 'Faça uma nova simulação focando na pergunta de motivação.',
        prazo: 'Próxima semana',
      },
    ],
    perguntasParaPraticar: [
      'Por que você quer trabalhar na nossa empresa?',
      'Conte sobre uma vez em que você trabalhou em equipe.',
      'Como você organiza seus estudos e compromissos?',
    ],
    exemploResposta: {
      pergunta: 'Por que você quer ser jovem aprendiz na área administrativa?',
      resposta:
        'Porque eu já gosto de organizar as coisas: no projeto social, sou eu que preparo as listas de presença e os materiais no Excel. ' +
        'Quero aprender as rotinas de uma empresa de verdade e crescer na área enquanto termino o curso técnico.',
    },
  };

  const entrevistas = [
    {
      id: IDS.entrevistaAntiga,
      sessaoId: null,
      cargoAlvo: 'Jovem Aprendiz em Atendimento',
      relatorio: relatorioAntigo,
      dataRealizacao: diasAtras(10, 19, 30),
    },
    {
      id: IDS.entrevistaRecente,
      sessaoId: IDS.sessao,
      cargoAlvo,
      relatorio: relatorioRecente,
      dataRealizacao: fimSessao,
    },
  ];
  for (const { id, relatorio, ...resto } of entrevistas) {
    const dados = {
      ...resto,
      usuarioId: jovem.id,
      empresaAlvo: null,
      notaGeral: relatorio.notaGeral,
      relatorio: relatorio as Prisma.InputJsonValue,
      ...textosLegados(relatorio),
    };
    await prisma.entrevistaBot.upsert({ where: { id }, update: dados, create: { id, ...dados } });
  }

  console.log(
    `Dados de demonstração prontos: 1 currículo, 1 simulação com ${mensagens.length} mensagens e 2 relatórios.`,
  );
  console.log(`Senha das contas de teste: ${SENHA_TESTE}`);
}

main()
  .catch((e: unknown) => {
    console.error('Falha no seed:', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
