import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { InfraModule } from '../../infra/infra.module';

@Module({
  imports: [InfraModule],
  controllers: [UploadsController],
})
export class UploadsModule {}
