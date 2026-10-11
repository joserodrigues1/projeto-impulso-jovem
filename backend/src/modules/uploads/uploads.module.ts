import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';

// StorageService e PrismaService vêm do InfraModule (global)
@Module({
  controllers: [UploadsController],
})
export class UploadsModule {}
