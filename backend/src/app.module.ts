import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';
import { env } from './config/env';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard, RolesGuard } from './common/guards/auth.guards';
import { InfraModule } from './infra/infra.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { CurriculosModule } from './modules/curriculos/curriculos.module';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        // Limit: 100 requests per 60 seconds
        throttlers: [{ ttl: 60000, limit: 100 }],
        storage: new ThrottlerStorageRedisService(new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1 })),
      }),
    }),
    InfraModule,
    AuthModule,
    UsuariosModule,
    UploadsModule,
    CurriculosModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
