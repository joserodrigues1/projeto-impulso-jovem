import { Logger as LoggerNest, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import {
  interpretarTrustProxy,
  TRUST_PROXY_PADRAO,
  trustProxyInvalido,
} from './common/http/trust-proxy';
import { env, isProducao } from './config/env';
import { avisoSegredosDeExemplo, segredosDeExemplo } from './config/segredos-exemplo';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);

  // Segredos copiados do .env.example: só avisa (não impede a subida, para não derrubar o site
  // num deploy), sem imprimir os valores.
  if (isProducao) {
    const deExemplo = segredosDeExemplo(env);
    if (deExemplo.length) logger.warn(avisoSegredosDeExemplo(deExemplo), 'Seguranca');
  }

  // A API fica atrás do proxy do Next: o `trust proxy` faz `req.ip` usar o X-Forwarded-For
  // que o Next repassa. O IP real só chega se quem está na frente do Next SOBRESCREVER esse
  // cabeçalho com o IP de quem conectou (ver docs/ARQUITETURA.md, seção 7).
  if (trustProxyInvalido(env.TRUST_PROXY)) {
    logger.warn(`TRUST_PROXY inválido; usando o padrão "${TRUST_PROXY_PADRAO}"`, 'Bootstrap');
  }
  app.set('trust proxy', interpretarTrustProxy(env.TRUST_PROXY));

  // Corpos JSON grandes (relatórios do n8n) cabem com folga; acima disso → 413
  app.useBodyParser('json', { limit: '1mb' });

  app.use(helmet());
  app.use(cookieParser());

  // O navegador usa o proxy do Next (mesma origem); CORS só para chamadas diretas do frontend
  app.enableCors({
    origin: [env.FRONTEND_URL.replace(/\/+$/, '')],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix('api/v1');
  // Fecha conexões (banco, Redis) com calma quando o container é parado/atualizado
  app.enableShutdownHooks();

  // Swagger só fora de produção
  if (!isProducao) {
    const config = new DocumentBuilder()
      .setTitle('Impulso Jovem API')
      .setDescription('Documentação da API do Impulso Jovem')
      .setVersion('1.0')
      .addCookieAuth('ij_access')
      .addApiKey({ type: 'apiKey', in: 'header', name: 'x-api-key' }, 'n8n-api-key')
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }

  await app.listen(env.PORT);
  logger.log(`API no ar na porta ${env.PORT} (prefixo /api/v1)`, 'Bootstrap');
  if (!isProducao) logger.log(`Swagger em http://localhost:${env.PORT}/api/docs`, 'Bootstrap');
}

bootstrap().catch((e: unknown) => {
  const motivo = `Falha ao iniciar a API: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`;
  new LoggerNest('Bootstrap').error(motivo);
  // O logger pode não escrever antes do exit: o motivo vai também direto para o stderr (docker logs)
  process.stderr.write(`${motivo}\n`);
  process.exit(1);
});
