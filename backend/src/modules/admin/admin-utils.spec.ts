import { BadRequestException } from '@nestjs/common';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  classificacaoDe,
  diaEmSaoPaulo,
  diasNoIntervalo,
  formatarDataHora,
  formatarDia,
  inicioDaSemana,
  inicioDoDiaSP,
  intervaloDeDatas,
  lerDia,
  maisRecente,
  mascararIp,
  mascararTelefone,
  MAX_DIAS_PERIODO,
  MENSAGENS_PERIODO,
  padraoBusca,
  paraCsv,
  ROTULOS_ACAO,
  rotuloAcao,
  sanitizarDetalhes,
  semanasEntre,
  somarDias,
  validarPeriodo,
} from './admin-utils';

const BOM = String.fromCharCode(0xfeff);
const DIA_MS = 86_400_000;

describe('datas no fuso de São Paulo', () => {
  it('diaEmSaoPaulo usa o relógio de Brasília, não o UTC', () => {
    // 23:30 de sábado em São Paulo = 02:30 de domingo em UTC
    expect(diaEmSaoPaulo(new Date('2026-10-11T02:30:00Z'))).toBe('2026-10-10');
    expect(diaEmSaoPaulo(new Date('2026-10-11T03:00:00Z'))).toBe('2026-10-11');
    expect(diaEmSaoPaulo(new Date('2026-01-01T02:59:59Z'))).toBe('2025-12-31');
  });

  it('lerDia aceita só datas de calendário reais no formato AAAA-MM-DD', () => {
    expect(lerDia('2026-10-10')).toBe('2026-10-10');
    expect(lerDia(' 2026-10-10 ')).toBe('2026-10-10');
    expect(lerDia('2028-02-29')).toBe('2028-02-29'); // ano bissexto
    for (const invalido of [
      '2026-02-29',
      '2026-02-30',
      '2026-13-01',
      '2026-00-10',
      '2026-10-32',
      '10/10/2026',
      '2026-10-10T00:00:00Z',
      '',
      20261010,
      undefined,
      null,
    ]) {
      expect(lerDia(invalido)).toBeNull();
    }
  });

  it('inicioDoDiaSP é a meia-noite de Brasília (03:00 UTC)', () => {
    expect(inicioDoDiaSP('2026-10-10').toISOString()).toBe('2026-10-10T03:00:00.000Z');
    expect(inicioDoDiaSP('2026-01-01').toISOString()).toBe('2026-01-01T03:00:00.000Z');
  });

  it('somarDias e diasNoIntervalo atravessam mês, ano e fevereiro bissexto', () => {
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(somarDias('2028-03-01', -1)).toBe('2028-02-29');
    expect(somarDias('2026-10-10', -29)).toBe('2026-09-11');
    expect(diasNoIntervalo('2026-10-01', '2026-10-01')).toBe(1);
    expect(diasNoIntervalo('2028-01-01', '2028-12-31')).toBe(366);
  });

  describe('inicioDaSemana (segunda-feira)', () => {
    it('a partir de um dia de calendário', () => {
      expect(inicioDaSemana('2026-10-05')).toBe('2026-10-05'); // segunda
      expect(inicioDaSemana('2026-10-07')).toBe('2026-10-05'); // quarta
      expect(inicioDaSemana('2026-10-11')).toBe('2026-10-05'); // domingo fica na semana anterior
      expect(inicioDaSemana('2026-01-01')).toBe('2025-12-29'); // quinta, volta para o ano anterior
      expect(inicioDaSemana('2028-03-01')).toBe('2028-02-28');
    });

    it('a partir de um instante, no fuso de São Paulo', () => {
      // Domingo 23:30 em São Paulo — em UTC já é segunda (outra semana)
      expect(inicioDaSemana(new Date('2026-10-12T02:30:00Z'))).toBe('2026-10-05');
      // Segunda 00:00 em São Paulo
      expect(inicioDaSemana(new Date('2026-10-12T03:00:00Z'))).toBe('2026-10-12');
    });
  });

  describe('semanasEntre', () => {
    it('lista todas as segundas do intervalo, sem buracos', () => {
      expect(semanasEntre('2026-09-11', '2026-10-10')).toEqual([
        '2026-09-07',
        '2026-09-14',
        '2026-09-21',
        '2026-09-28',
        '2026-10-05',
      ]);
    });

    it('um período dentro da mesma semana tem uma semana só', () => {
      expect(semanasEntre('2026-10-06', '2026-10-11')).toEqual(['2026-10-05']);
      expect(semanasEntre('2026-10-10', '2026-10-10')).toEqual(['2026-10-05']);
    });

    it('vira o ano e aceita instantes (no fuso de São Paulo)', () => {
      expect(semanasEntre('2025-12-25', '2026-01-08')).toEqual([
        '2025-12-22',
        '2025-12-29',
        '2026-01-05',
      ]);
      expect(
        semanasEntre(new Date('2026-10-05T03:00:00Z'), new Date('2026-10-12T02:59:59Z')),
      ).toEqual(['2026-10-05']);
    });

    it('vazio quando o início é depois do fim', () => {
      expect(semanasEntre('2026-10-20', '2026-10-01')).toEqual([]);
    });

    it('no período máximo, as semanas são consecutivas (7 em 7 dias)', () => {
      const semanas = semanasEntre('2025-10-11', '2026-10-11');
      expect(semanas[0]).toBe('2025-10-06');
      expect(semanas.at(-1)).toBe('2026-10-05');
      for (let i = 1; i < semanas.length; i++) {
        expect(Date.parse(semanas[i]) - Date.parse(semanas[i - 1])).toBe(7 * DIA_MS);
        expect(new Date(semanas[i]).getUTCDay()).toBe(1); // segunda-feira
      }
    });
  });

  describe('validarPeriodo', () => {
    // 23:00 de 10/10 em São Paulo (já é dia 11 em UTC)
    const agora = new Date('2026-10-11T02:00:00Z');

    it('sem datas: os últimos 30 dias até hoje em São Paulo', () => {
      expect(validarPeriodo(undefined, undefined, agora)).toEqual({
        de: '2026-09-11',
        ate: '2026-10-10',
        inicio: new Date('2026-09-11T03:00:00Z'),
        fim: new Date('2026-10-11T03:00:00Z'), // exclusivo: meia-noite do dia seguinte
      });
    });

    it('só `de`: até hoje; só `ate`: os 30 dias que terminam nele', () => {
      expect(validarPeriodo('2026-10-01', undefined, agora)).toMatchObject({
        de: '2026-10-01',
        ate: '2026-10-10',
      });
      expect(validarPeriodo(undefined, '2026-08-31', agora)).toMatchObject({
        de: '2026-08-02',
        ate: '2026-08-31',
      });
    });

    it('um dia só vale (de = ate)', () => {
      const p = validarPeriodo('2026-10-10', '2026-10-10', agora);
      expect(p.fim.getTime() - p.inicio.getTime()).toBe(DIA_MS);
    });

    it('400 para data inválida', () => {
      for (const [de, ate] of [
        ['2026-02-30', '2026-03-10'],
        ['2026-10-01', '2026-10-32'],
        ['ontem', undefined],
        [undefined, '10/10/2026'],
      ]) {
        expect(() => validarPeriodo(de, ate, agora)).toThrow(BadRequestException);
        expect(() => validarPeriodo(de, ate, agora)).toThrow(MENSAGENS_PERIODO.dataInvalida);
      }
    });

    it('400 quando o início é depois do fim (inclusive `de` no futuro sem `ate`)', () => {
      expect(() => validarPeriodo('2026-10-10', '2026-10-01', agora)).toThrow(
        MENSAGENS_PERIODO.invertido,
      );
      expect(() => validarPeriodo('2026-10-11', undefined, agora)).toThrow(
        MENSAGENS_PERIODO.invertido,
      );
    });

    it(`até ${MAX_DIAS_PERIODO} dias contando os dois extremos; um a mais é 400`, () => {
      expect(validarPeriodo('2025-10-11', '2026-10-11', agora)).toMatchObject({
        de: '2025-10-11',
        ate: '2026-10-11',
      });
      expect(() => validarPeriodo('2025-10-10', '2026-10-11', agora)).toThrow(
        MENSAGENS_PERIODO.longoDemais,
      );
    });
  });

  describe('intervaloDeDatas (filtro opcional da auditoria)', () => {
    it('sem datas não filtra; com datas usa o dia inteiro de São Paulo', () => {
      expect(intervaloDeDatas()).toEqual({});
      expect(intervaloDeDatas('2026-10-01')).toEqual({ inicio: new Date('2026-10-01T03:00:00Z') });
      expect(intervaloDeDatas(undefined, '2026-10-10')).toEqual({
        fim: new Date('2026-10-11T03:00:00Z'),
      });
    });

    it('400 para data inválida ou invertida; sem limite de tamanho', () => {
      expect(() => intervaloDeDatas('2026-02-30')).toThrow(MENSAGENS_PERIODO.dataInvalida);
      expect(() => intervaloDeDatas('2026-10-10', '2026-10-01')).toThrow(
        MENSAGENS_PERIODO.invertido,
      );
      expect(intervaloDeDatas('2020-01-01', '2026-10-10').inicio).toEqual(
        new Date('2020-01-01T03:00:00Z'),
      );
    });
  });

  it('formatarDia, formatarDataHora (relógio de São Paulo) e maisRecente', () => {
    expect(formatarDia('2026-10-05')).toBe('05/10/2026');
    expect(formatarDataHora(new Date('2026-10-10T17:05:00Z'))).toBe('10/10/2026 14:05');
    expect(formatarDataHora(new Date('2026-10-11T02:30:00Z'))).toBe('10/10/2026 23:30');
    expect(formatarDataHora(null)).toBe('');
    const a = new Date('2026-10-01T00:00:00Z');
    const b = new Date('2026-10-02T00:00:00Z');
    expect(maisRecente(a, null, b, undefined)).toBe(b);
    expect(maisRecente(null, undefined)).toBeNull();
  });
});

describe('mascararTelefone', () => {
  it('celular e fixo: DDD, primeiro dígito e os 4 últimos', () => {
    expect(mascararTelefone('5561999999999')).toBe('(61) 9••••-9999');
    expect(mascararTelefone('556133334444')).toBe('(61) 3•••-4444');
    // Celular antigo sem o 9º dígito e número ainda formatado
    expect(mascararTelefone('556198887777')).toBe('(61) 9•••-7777');
    expect(mascararTelefone('(11) 98765-4321')).toBe('(11) 9••••-4321');
  });

  it('o miolo do número nunca aparece', () => {
    const mascarado = mascararTelefone('5561987654321');
    expect(mascarado).toBe('(61) 9••••-4321');
    expect(mascarado).not.toMatch(/8765/);
  });

  it('cadastro antigo fora do padrão: só os 4 últimos dígitos; vazio continua vazio', () => {
    expect(mascararTelefone('12345678901234')).toBe('••••-1234');
    expect(mascararTelefone('123')).toBe('••••');
    expect(mascararTelefone('')).toBe('');
    expect(mascararTelefone(null)).toBe('');
    expect(mascararTelefone(undefined)).toBe('');
  });
});

describe('mascararIp', () => {
  it('IPv4: só os dois primeiros blocos (também na forma IPv4 dentro de IPv6)', () => {
    expect(mascararIp('177.37.10.20')).toBe('177.37.•••.•••');
    expect(mascararIp('::ffff:177.37.10.20')).toBe('177.37.•••.•••');
    expect(mascararIp(' 10.0.0.1 ')).toBe('10.0.•••.•••');
  });

  it('IPv6: só os 3 primeiros grupos (prefixo do provedor), normalizados', () => {
    expect(mascararIp('2804:14c:5b:1234:abcd:ef01:2345:6789')).toBe('2804:14c:5b:•••');
    expect(mascararIp('2804:14C:5B::1')).toBe('2804:14c:5b:•••');
    expect(mascararIp('2804:014c:005b::1')).toBe('2804:14c:5b:•••');
    expect(mascararIp('::1')).toBe('0:0:0:•••');
    expect(mascararIp('fe80::1%eth0')).toBe('fe80:0:0:•••');
  });

  it('vazio → null; formato desconhecido → só a máscara (nada do valor original)', () => {
    expect(mascararIp(null)).toBeNull();
    expect(mascararIp(undefined)).toBeNull();
    expect(mascararIp('   ')).toBeNull();
    for (const lixo of ['lixo', 'abc', '1::2::3', '1:2:3:4:5:6:7:8:9', '12345:1::1']) {
      expect(mascararIp(lixo)).toBe('•••');
    }
  });
});

describe('rotuloAcao', () => {
  it('rótulos em português das ações conhecidas', () => {
    expect(rotuloAcao('CADASTRO_USUARIO')).toBe('Cadastro');
    expect(rotuloAcao('LOGIN_SUCESSO')).toBe('Login');
    expect(rotuloAcao('LOGIN_FALHA')).toBe('Login com senha errada');
    expect(rotuloAcao('CURRICULO_GERADO')).toBe('Currículo gerado');
    expect(rotuloAcao('ADMIN_VISUALIZOU')).toMatch(/Administrador/);
    expect(rotuloAcao('ADMIN_EXPORTOU')).toMatch(/Administrador/);
  });

  it('ação desconhecida aparece como veio (inclusive nomes de propriedades do JS)', () => {
    expect(rotuloAcao('ACAO_NOVA')).toBe('ACAO_NOVA');
    expect(rotuloAcao('toString')).toBe('toString');
    expect(rotuloAcao('constructor')).toBe('constructor');
    expect(rotuloAcao('__proto__')).toBe('__proto__');
  });

  it('toda ação registrada pelo código tem rótulo', () => {
    const raiz = resolve(__dirname, '../..');
    const arquivos = readdirSync(raiz, { recursive: true, encoding: 'utf8' }).filter(
      (f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'),
    );
    const acoes = new Set<string>();
    for (const arquivo of arquivos) {
      const fonte = readFileSync(join(raiz, arquivo), 'utf8');
      for (const m of fonte.matchAll(/\bacao: '([A-Z][A-Z0-9_]+)'/g)) acoes.add(m[1]);
    }
    expect(acoes.size).toBeGreaterThanOrEqual(15);
    expect([...acoes].filter((a) => !Object.hasOwn(ROTULOS_ACAO, a))).toEqual([]);
  });
});

describe('sanitizarDetalhes', () => {
  it('mantém os detalhes que o código grava hoje (booleanos, números, ids e códigos)', () => {
    const sessaoId = '3f2b8c1e-5d4a-4f6b-9c7d-1e2f3a4b5c6d';
    expect(
      sanitizarDetalhes({
        refinadoPorIa: true,
        usouIa: true,
        comAudio: false,
        comCurriculoAntigo: false,
      }),
    ).toEqual({ refinadoPorIa: true, usouIa: true, comAudio: false, comCurriculoAntigo: false });
    expect(sanitizarDetalhes({ sessaoId, versaoRelatorio: 1 })).toEqual({
      sessaoId,
      versaoRelatorio: 1,
    });
    expect(sanitizarDetalhes({ motivo: 'CONCLUIDA', status: 'FINALIZADA' })).toEqual({
      motivo: 'CONCLUIDA',
      status: 'FINALIZADA',
    });
    expect(sanitizarDetalhes({ participanteId: sessaoId, recurso: 'ficha' })).toEqual({
      participanteId: sessaoId,
      recurso: 'ficha',
    });
  });

  it('tira a busca (texto digitado) dos filtros da exportação, mantendo o resto', () => {
    expect(
      sanitizarDetalhes({
        tipo: 'participantes',
        filtros: { busca: 'Maria Souza', uf: 'DF', status: 'ATIVO', de: '2026-10-01' },
        linhas: 3,
      }),
    ).toEqual({
      tipo: 'participantes',
      filtros: { uf: 'DF', status: 'ATIVO', de: '2026-10-01' },
      linhas: 3,
    });
  });

  it('remove chaves de conteúdo, dado pessoal, segredo e IP (em qualquer grafia)', () => {
    const sensiveis = [
      'conteudo',
      'texto',
      'mensagens',
      'transcricao',
      'email',
      'e-mail',
      'emailNovo',
      'telefone',
      'telefoneAnterior',
      'whatsapp',
      'senha',
      'password',
      'token',
      'refreshToken',
      'cpf',
      'nome',
      'nomeCompleto',
      'userAgent',
      'user_agent',
      'relatorio',
      'curriculo',
      'ip',
      'IP',
      'Ip',
      'ipOrigem',
      'ip_origem',
      'IP_ORIGEM',
      'enderecoIp',
      'clientIP',
      'IPAddress',
      'ipv6',
      'remoteAddr',
      'xForwardedFor',
    ];
    const entrada = Object.fromEntries(sensiveis.map((k) => [k, 'VALOR_X']));
    expect(sanitizarDetalhes({ ...entrada, ok: true })).toEqual({ ok: true });
  });

  it('não confunde "tipo", "participanteId", "versaoRelatorio" ou "comCurriculoAntigo" com dados sensíveis', () => {
    const detalhes = {
      tipo: 'uso',
      participanteId: 'p-1',
      versaoRelatorio: 1,
      comCurriculoAntigo: true,
    };
    expect(sanitizarDetalhes(detalhes)).toEqual(detalhes);
  });

  it('tira texto livre e valores com cara de dado pessoal sob chaves inocentes', () => {
    expect(
      sanitizarDetalhes({
        motivo: 'o candidato disse que mora na rua tal',
        acento: 'Não',
        destino: '5561999999999',
        documento2: '123.456.789-09',
        origem: '177.37.10.20',
        rede: '2804:14c:5b::1',
        dia: '2026-10-10',
        hora: '14:05',
        recurso: 'conversa',
      }),
    ).toEqual({ dia: '2026-10-10', hora: '14:05', recurso: 'conversa' });
  });

  it('listas: só os itens permitidos, até 20; objetos aninhados até 3 níveis', () => {
    const r = sanitizarDetalhes({
      ids: [...Array.from({ length: 25 }, (_, i) => `id-${i}`), 'texto com espaço'],
      a: { b: { c: { d: 1, e: { f: 2 } } } },
    });
    expect(r?.ids).toHaveLength(20);
    expect(r?.a).toEqual({ b: { c: { d: 1 } } });
  });

  it('números não finitos saem; null e booleanos ficam', () => {
    expect(sanitizarDetalhes({ a: Number.NaN, b: Infinity, c: null, d: false, e: 0 })).toEqual({
      c: null,
      d: false,
      e: 0,
    });
  });

  it('null quando não é objeto ou quando não sobra nada', () => {
    expect(sanitizarDetalhes(null)).toBeNull();
    expect(sanitizarDetalhes(undefined)).toBeNull();
    expect(sanitizarDetalhes('texto')).toBeNull();
    expect(sanitizarDetalhes(42)).toBeNull();
    expect(sanitizarDetalhes([1, 2])).toBeNull();
    expect(sanitizarDetalhes({})).toBeNull();
    expect(sanitizarDetalhes({ email: 'a@b.com', texto: 'oi' })).toBeNull();
  });

  it('ignora "__proto__" vindo do JSON e não altera o objeto original', () => {
    const entrada = JSON.parse('{"__proto__": {"admin": true}, "ok": true}') as Record<
      string,
      unknown
    >;
    const r = sanitizarDetalhes(entrada);
    expect(r).toEqual({ ok: true });
    expect(Object.getPrototypeOf(r)).toBe(Object.prototype);
    expect((r as Record<string, unknown>).admin).toBeUndefined();

    const original = { email: 'a@b.com', ok: true };
    sanitizarDetalhes(original);
    expect(original).toEqual({ email: 'a@b.com', ok: true });
  });
});

describe('classificacaoDe e padraoBusca', () => {
  it('classificação gravada vale; senão deriva da nota; sem as duas, null', () => {
    expect(classificacaoDe('PREPARADO', 9.5)).toBe('PREPARADO');
    expect(classificacaoDe('qualquer', 9.5)).toBe('DESTAQUE');
    expect(classificacaoDe(undefined, 3)).toBe('INICIANTE');
    expect(classificacaoDe(null, null)).toBeNull();
  });

  it('busca sem acento nem maiúsculas, com os curingas do LIKE escapados', () => {
    expect(padraoBusca('  João ')).toBe('%joao%');
    expect(padraoBusca('ÁLVARO Ñ')).toBe('%alvaro n%');
    expect(padraoBusca('50%_off\\')).toBe('%50\\%\\_off\\\\%');
  });
});

describe('paraCsv', () => {
  const linhas = (csv: string) => csv.slice(1).split('\r\n');

  it('BOM UTF-8, separador ";", CRLF e todas as células entre aspas', () => {
    const csv = paraCsv(['Nome', 'Cidade'], [['Ana', 'Brasília']]);
    expect(csv.startsWith(BOM)).toBe(true);
    expect(linhas(csv)).toEqual(['"Nome";"Cidade"', '"Ana";"Brasília"', '']);
  });

  it('escapa aspas duplas e mantém ";" e quebras de linha dentro da célula', () => {
    const csv = paraCsv(['a'], [['Ana "Aninha" Souza'], ['x;y\nz']]);
    expect(csv).toContain('"Ana ""Aninha"" Souza"');
    expect(csv).toContain('"x;y\nz"');
  });

  it('protege contra injeção de fórmula: = + - @ TAB e CR ganham um apóstrofo', () => {
    const perigosos = ['=1+1', '+5561999', '-2+3', '@SUM(A1:A9)', '\t=1', '\r=1', '＝1+1'];
    const csv = paraCsv(
      ['c'],
      perigosos.map((v) => [v]),
    );
    const celulas = linhas(csv).slice(1, -1);
    expect(celulas).toEqual(perigosos.map((v) => `"'${v}"`));
  });

  it('fórmula com aspas: apóstrofo na frente e aspas escapadas', () => {
    const csv = paraCsv(['c'], [['=HYPERLINK("http://mal.exemplo","clique")']]);
    expect(linhas(csv)[1]).toBe('"\'=HYPERLINK(""http://mal.exemplo"",""clique"")"');
  });

  it('não mexe em texto comum que só contém esses sinais no meio', () => {
    const csv = paraCsv(['c'], [['a=b'], ['Maria-José'], ['x@y.com']]);
    expect(linhas(csv).slice(1, -1)).toEqual(['"a=b"', '"Maria-José"', '"x@y.com"']);
  });

  it('números com vírgula decimal (negativo não vira texto), booleanos e vazios', () => {
    const csv = paraCsv(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
      [[6.8, 0, -3, Number.NaN, true, false, null]],
    );
    expect(linhas(csv)[1]).toBe('"6,8";"0";"-3";"";"Sim";"Não";""');
    expect(linhas(paraCsv(['a'], [[undefined]]))[1]).toBe('""');
  });

  it('o cabeçalho também é protegido e a planilha vazia tem só o cabeçalho', () => {
    expect(linhas(paraCsv(['=x'], []))).toEqual(['"\'=x"', '']);
  });
});
