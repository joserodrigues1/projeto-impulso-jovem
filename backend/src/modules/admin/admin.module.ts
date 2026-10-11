import { ForbiddenException, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { CurriculosModule } from '../curriculos/curriculos.module';
import { AdminController } from './admin.controller';
import { AdminAtivoGuard } from './admin.guard';
import { AdminService, MENSAGENS_ADMIN } from './admin.service';

/** Nenhuma resposta do painel (nem as de erro) fica guardada em cache de navegador ou proxy. */
export function semCache(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'no-store');
  next();
}

/** Valores de `Sec-Fetch-Site` de uma requisição que nasceu em outro site (ou subdomínio). */
const ORIGENS_EXTERNAS = new Set(['cross-site', 'same-site']);

/**
 * As rotas GET do painel têm efeito (registram o acesso na auditoria e entregam dados pessoais)
 * e o cookie da sessão é SameSite=Lax: um link vindo de outro site (e-mail, WhatsApp Web) abriria
 * a ficha ou baixaria a planilha com a sessão do administrador, sem ele querer. Por isso o
 * painel recusa (403) o que o navegador marca como vindo de fora (`cross-site`/`same-site`).
 * Passam `same-origin` (o fetch do site e o Ctrl+clique no link do CSV — o proxy do Next repassa
 * o cabeçalho), `none` (endereço digitado ou favorito) e a ausência do cabeçalho (navegador
 * antigo, chamadas fora do navegador e testes).
 */
export function somenteDoProprioSite(req: Request, _res: Response, next: NextFunction) {
  const origem = req.headers['sec-fetch-site'];
  if (typeof origem === 'string' && ORIGENS_EXTERNAS.has(origem.trim().toLowerCase())) {
    throw new ForbiddenException(MENSAGENS_ADMIN.origemExterna);
  }
  next();
}

/**
 * Painel do administrador. Ninguém vira ADMIN pelo site (não há rota para isso): a promoção é
 * feita direto no banco do servidor —
 *
 *   docker exec ij-postgres sh -c "psql -U \$POSTGRES_USER -d \$POSTGRES_DB -c \"update usuarios set tipo_usuario='ADMIN' where email='EMAIL'\""
 *
 * e, para rebaixar, o mesmo comando com `tipo_usuario='USUARIO'`. O acesso à API muda na hora
 * (AdminAtivoGuard confere o banco a cada requisição); o menu do site só aparece/some depois que
 * a pessoa sai e entra de novo (ou quando o token de acesso é renovado).
 */
@Module({
  imports: [CurriculosModule],
  controllers: [AdminController],
  providers: [AdminService, AdminAtivoGuard],
})
export class AdminModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Middlewares rodam antes dos guards: o "sem cache" vale também para 401/403, e a
    // requisição vinda de outro site é recusada antes de olhar a sessão
    consumer.apply(semCache, somenteDoProprioSite).forRoutes(AdminController);
  }
}
