import { Module } from '@nestjs/common';
import { EntrevistasController, WebhooksWhatsappController } from './entrevistas.controller';
import { EntrevistasService } from './entrevistas.service';
import { SessoesEntrevistaService } from './sessoes.service';

@Module({
  controllers: [EntrevistasController, WebhooksWhatsappController],
  providers: [EntrevistasService, SessoesEntrevistaService],
})
export class EntrevistasModule {}
