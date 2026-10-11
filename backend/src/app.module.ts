import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { configuracaoLogger } from './common/logger/logger.config';
import { configuracaoThrottler } from './common/throttler/throttler.config';
import { isProducao } from './config/env';
import { InfraModule } from './infra/infra.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { CurriculosModule } from './modules/curriculos/curriculos.module';
import { EntrevistasModule } from './modules/entrevistas/entrevistas.module';
import { SistemaModule } from './modules/sistema/sistema.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';

@Module({
  imports: [
    LoggerModule.forRoot(configuracaoLogger(isProducao)),
    // 100 req/min por usuário logado (ou por IP); rotas sensíveis usam @Throttle próprio
    ThrottlerModule.forRootAsync({ useFactory: configuracaoThrottler }),
    InfraModule,
    AuthModule,
    UsuariosModule,
    UploadsModule,
    CurriculosModule,
    EntrevistasModule,
    SistemaModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
