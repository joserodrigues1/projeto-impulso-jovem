import { Global, Module } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';
import { MailService } from './mail.service';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';
import { StorageService } from './storage.service';

@Global()
@Module({
  providers: [PrismaService, RedisService, StorageService, MailService, AuditoriaService],
  exports: [PrismaService, RedisService, StorageService, MailService, AuditoriaService],
})
export class InfraModule {}
