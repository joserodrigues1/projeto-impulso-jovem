import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/auth.decorators';
import { ConfigPublica, Saude, SistemaService } from './sistema.service';

@ApiTags('Sistema')
@Controller()
export class SistemaController {
  constructor(private readonly sistema: SistemaService) {}

  @Public()
  @Get('config/publica')
  @ApiOperation({
    summary: 'Configurações públicas para o frontend (WhatsApp da IA, recursos ativos)',
  })
  configPublica(): ConfigPublica {
    return this.sistema.configPublica();
  }

  @Public()
  @SkipThrottle()
  @Get('saude')
  @ApiOperation({ summary: 'Healthcheck: API no ar + conexão com banco e Redis' })
  saude(): Promise<Saude> {
    return this.sistema.saude();
  }
}
