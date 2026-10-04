import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { env } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Segurança Básica
  app.use(helmet());
  app.use(cookieParser());
  
  // CORS flexível para o frontend
  app.enableCors({
    origin: [env.FRONTEND_URL],
    credentials: true,
  });

  // Validadores globais
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Prefixamento global para a API
  app.setGlobalPrefix('api/v1');

  // Swagger (Apenas em Dev)
  if (env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Impulso Jovem API')
      .setDescription('Documentação da API do ecossistema Impulso Jovem')
      .setVersion('1.0')
      .addCookieAuth('ij_access')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(env.PORT);
  console.log(`🚀 Aplicação iniciada em: http://localhost:${env.PORT}/api/v1`);
  if (env.NODE_ENV !== 'production') {
    console.log(`📚 Swagger disponível em: http://localhost:${env.PORT}/api/docs`);
  }
}

bootstrap();
