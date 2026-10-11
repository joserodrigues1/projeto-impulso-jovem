import {
  decidirTentativaRelatorio,
  esperaEntreTentativasMs,
  limiteInatividade,
  mensagemDeCuidado,
  momentoEncerramento,
  sessaoInativa,
  statusAoEncerrar,
} from './regras-sessao';

const agora = new Date('2026-10-08T12:00:00.000Z');
const minutosAtras = (min: number) => new Date(agora.getTime() - min * 60_000);

describe('regras de sessão', () => {
  it('limiteInatividade subtrai os minutos', () => {
    expect(limiteInatividade(agora, 120)).toEqual(minutosAtras(120));
  });

  it('sessão só fica inativa depois de MAIS que o limite', () => {
    expect(sessaoInativa(minutosAtras(119), agora, 120)).toBe(false);
    expect(sessaoInativa(minutosAtras(120), agora, 120)).toBe(false);
    expect(sessaoInativa(new Date(minutosAtras(120).getTime() - 1), agora, 120)).toBe(true);
    expect(sessaoInativa(minutosAtras(600), agora, 120)).toBe(true);
  });

  it('com o mínimo de respostas do candidato vai para relatório; abaixo, é cancelada', () => {
    expect(statusAoEncerrar(0, 3)).toBe('CANCELADA');
    expect(statusAoEncerrar(2, 3)).toBe('CANCELADA');
    expect(statusAoEncerrar(3, 3)).toBe('FINALIZADA');
    expect(statusAoEncerrar(10, 3)).toBe('FINALIZADA');
  });

  it('por inatividade, a conversa termina na última mensagem', () => {
    const ultima = minutosAtras(300);
    expect(momentoEncerramento('INATIVIDADE', ultima, agora)).toBe(ultima);
    expect(momentoEncerramento('CONCLUIDA', ultima, agora)).toBe(agora);
    expect(momentoEncerramento('SOLICITADA_USUARIO', ultima, agora)).toBe(agora);
  });
});

describe('statusAoEncerrar — pausa por cuidado', () => {
  it('motivo CUIDADO cancela a sessão (sem relatório com nota), mesmo com muitas respostas', () => {
    expect(statusAoEncerrar(10, 3, 'CUIDADO')).toBe('CANCELADA');
    expect(statusAoEncerrar(10, 3, 'CONCLUIDA')).toBe('FINALIZADA');
  });
});

describe('cuidado: menção ao CVV', () => {
  it('reconhece a mensagem de acolhimento e cancela a sessão no encerramento', () => {
    expect(mensagemDeCuidado('O CVV atende 24 horas pelo 188 ou em cvv.org.br')).toBe(true);
    expect(mensagemDeCuidado('Conte uma situação em que você resolveu um problema.')).toBe(false);
    expect(statusAoEncerrar(10, 3, 'CONCLUIDA', true)).toBe('CANCELADA');
    expect(statusAoEncerrar(10, 3, 'INATIVIDADE', false)).toBe('FINALIZADA');
  });
});

describe('tentativas do relatório', () => {
  const minutos = (m: number) => m * 60_000;

  it('espera cresce de 10 min até 6 h', () => {
    expect(esperaEntreTentativasMs(0)).toBe(0);
    expect(esperaEntreTentativasMs(1)).toBe(minutos(9));
    expect(esperaEntreTentativasMs(2)).toBe(minutos(19));
    expect(esperaEntreTentativasMs(3)).toBe(minutos(39));
    expect(esperaEntreTentativasMs(7)).toBe(minutos(359));
  });

  it('sessão nova tenta; dentro da espera aguarda; no limite desiste', () => {
    expect(decidirTentativaRelatorio(null, agora)).toBe('TENTAR');
    const tentouHa = (min: number, tentativas: number) => ({
      tentativas,
      ultimaEm: agora.getTime() - minutos(min),
    });
    expect(decidirTentativaRelatorio(tentouHa(5, 1), agora)).toBe('ESPERAR');
    expect(decidirTentativaRelatorio(tentouHa(10, 1), agora)).toBe('TENTAR');
    expect(decidirTentativaRelatorio(tentouHa(30, 3), agora)).toBe('ESPERAR');
    expect(decidirTentativaRelatorio(tentouHa(600, 8), agora)).toBe('DESISTIR');
  });
});
