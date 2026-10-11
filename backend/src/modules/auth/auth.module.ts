import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { env } from '../../config/env';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/auth.guards';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BloqueioLoginService } from './bloqueio-login.service';

@Module({
  imports: [
    JwtModule.register({
      secret: env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: `${env.JWT_ACCESS_TTL_MIN}m`, algorithm: 'HS256' },
      // Aceita só o algoritmo que a própria API usa para assinar
      verifyOptions: { algorithms: ['HS256'] },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    BloqueioLoginService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
