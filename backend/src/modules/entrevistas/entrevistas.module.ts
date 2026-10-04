import { Module } from '@nestjs/common';
import { EntrevistasController, WebhooksWhatsappController } from './entrevistas.controller';
import { EntrevistasService } from './entrevistas.service';

@Module({
  controllers: [EntrevistasController, WebhooksWhatsappController],
  providers: [EntrevistasService],
})
export class EntrevistasModule {}
