import { Injectable } from '@nestjs/common';
import { normalizeIp } from '@nestjs/throttler';
import type Redis from 'ioredis';
import { sha256 } from '../../common/crypto/crypto.util';
import { env } from '../../config/env';
import { RedisService } from '../../infra/redis.service';

/** O teto por e-mail (vindo de qualquer IP) é este múltiplo de LOGIN_MAX_TENTATIVAS. */
export const MULTIPLO_TETO_POR_EMAIL = 3;

/**
 * Bloqueio temporário de login (contra tentativa e erro de senha), em dois níveis:
 *
 * - **e-mail + IP**: após LOGIN_MAX_TENTATIVAS senhas erradas para um e-mail vindas do mesmo
 *   IP, aquele IP fica bloqueado para aquele e-mail. Quem erra a senha de um colega não
 *   tranca o dono da conta, que entra de outro lugar.
 * - **só e-mail** (teto = MULTIPLO_TETO_POR_EMAIL × o limite): contra ataque distribuído,
 *   vindo de muitos IPs. Ao atingir o teto, o e-mail fica bloqueado para todos — inclusive
 *   para a senha correta — até a janela expirar (ou a senha ser redefinida).
 *
 * Cada contador expira em LOGIN_BLOQUEIO_MIN. As chaves usam hash do e-mail e do IP
 * (nada de dado pessoal em claro no Redis). Redis fora do ar → ninguém é bloqueado.
 */
@Injectable()
export class BloqueioLoginService {
  constructor(private readonly redis: RedisService) {}

  private chaveEmail(email: string): string {
    return `login:falhas:${sha256(email.trim().toLowerCase())}`;
  }

  private chaveEmailIp(email: string, ip: string | undefined): string {
    const origem = ip ? normalizeIp(ip) : 'desconhecido';
    return `${this.chaveEmail(email)}:ip:${sha256(origem)}`;
  }

  private get duracaoSegundos(): number {
    return env.LOGIN_BLOQUEIO_MIN * 60;
  }

  static get tetoPorEmail(): number {
    return env.LOGIN_MAX_TENTATIVAS * MULTIPLO_TETO_POR_EMAIL;
  }

  /** Segundos restantes de bloqueio da chave (0 = abaixo do limite). */
  private async restante(c: Redis, chave: string, limite: number): Promise<number> {
    const [falhas, ttl] = await Promise.all([c.get(chave), c.ttl(chave)]);
    if (Number(falhas ?? 0) < limite) return 0;
    return ttl > 0 ? ttl : this.duracaoSegundos;
  }

  /** Segundos restantes de bloqueio para este e-mail vindo deste IP (0 = liberado). */
  async segundosBloqueado(email: string, ip?: string): Promise<number> {
    return this.redis.tentar(async (c) => {
      const [porIp, porEmail] = await Promise.all([
        this.restante(c, this.chaveEmailIp(email, ip), env.LOGIN_MAX_TENTATIVAS),
        this.restante(c, this.chaveEmail(email), BloqueioLoginService.tetoPorEmail),
      ]);
      return Math.max(porIp, porEmail);
    }, 0);
  }

  /** Soma uma falha na chave; ao atingir o limite, o bloqueio vale pelo período inteiro. */
  private async somar(c: Redis, chave: string, limite: number): Promise<number> {
    // SET NX + INCR na mesma transação: a chave nunca fica sem expiração
    const resultado = await c
      .multi()
      .set(chave, '0', 'EX', this.duracaoSegundos, 'NX')
      .incr(chave)
      .exec();
    const falhas = Number(resultado?.[1]?.[1] ?? 0);
    if (falhas === limite) await c.expire(chave, this.duracaoSegundos);
    return falhas;
  }

  /**
   * Registra uma senha errada. Devolve `true` quando esta falha atingiu um dos limites
   * (e-mail + IP ou o teto do e-mail) — o login já responde com o bloqueio.
   */
  async registrarFalha(email: string, ip?: string): Promise<boolean> {
    return this.redis.tentar(async (c) => {
      const [porIp, porEmail] = await Promise.all([
        this.somar(c, this.chaveEmailIp(email, ip), env.LOGIN_MAX_TENTATIVAS),
        this.somar(c, this.chaveEmail(email), BloqueioLoginService.tetoPorEmail),
      ]);
      return porIp >= env.LOGIN_MAX_TENTATIVAS || porEmail >= BloqueioLoginService.tetoPorEmail;
    }, false);
  }

  /**
   * Login certo: zera as falhas deste e-mail vindas deste IP. O contador do e-mail (teto)
   * continua — senão um ataque distribuído ganharia tentativas novas a cada login do dono.
   */
  async limparIp(email: string, ip?: string): Promise<void> {
    const chave = this.chaveEmailIp(email, ip);
    await this.redis.tentar((c) => c.del(chave), 0);
  }

  /** Senha redefinida: libera o e-mail (teto) e o IP de quem redefiniu. */
  async limpar(email: string, ip?: string): Promise<void> {
    const chaves = [this.chaveEmail(email), this.chaveEmailIp(email, ip)];
    await this.redis.tentar((c) => c.del(...chaves), 0);
  }

  /** Mensagem amigável para quem foi bloqueado. */
  static mensagem(segundos: number): string {
    const minutos = Math.max(1, Math.ceil(segundos / 60));
    return `Muitas tentativas de login sem sucesso. Por segurança, aguarde ${minutos} ${
      minutos === 1 ? 'minuto' : 'minutos'
    } e tente de novo — ou use "Esqueci minha senha".`;
  }
}
