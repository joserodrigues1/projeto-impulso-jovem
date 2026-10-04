import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public, UsuarioAtual } from '../../common/decorators/auth.decorators';
import type { UsuarioAutenticado } from '../../common/decorators/auth.decorators';
import { PaginacaoDto } from '../../common/dto/paginacao.dto';
import { N8nApiKeyGuard } from '../../common/guards/n8n-api-key.guard';
import { RegistrarEntrevistaDto } from './entrevistas.dto';
import { EntrevistasService } from './entrevistas.service';

/** Relatórios de simulação do usuário logado (painel). */
@ApiTags('Entrevistas')
@ApiCookieAuth()
@Controller('entrevistas')
export class EntrevistasController {
  constructor(private readonly entrevistas: EntrevistasService) {}

  @Get()
  @ApiOperation({ summary: 'Lista as simulações de entrevista do usuário (mais recentes primeiro)' })
  listar(@UsuarioAtual() usuario: UsuarioAutenticado, @Query() paginacao: PaginacaoDto) {
    return this.entrevistas.listar(usuario.id, paginacao);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma simulação de entrevista do usuário' })
  obter(@UsuarioAtual() usuario: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.entrevistas.obter(usuario.id, id);
  }
}

/**
 * Webhooks consumidos pelo n8n (IA recrutadora no WhatsApp).
 * Autenticação servidor→servidor via header `x-api-key` (N8N_API_KEY).
 */
@ApiTags('Webhooks n8n')
@ApiSecurity('n8n-api-key')
@Public()
@UseGuards(N8nApiKeyGuard)
// O n8n chama de um único IP para todos os usuários — limite maior que o padrão (100/min)
@Throttle({ default: { limit: 600, ttl: 60_000 } })
@Controller('webhooks/whatsapp')
export class WebhooksWhatsappController {
  constructor(private readonly entrevistas: EntrevistasService) {}

  @Get('usuario/:telefone')
  @ApiOperation({
    summary: 'Identifica o usuário pelo WhatsApp e retorna o contexto para a IA',
    description:
      'Sempre responde 200. Use `encontrado` para decidir o fluxo no n8n; ' +
      'quando `false`, envie `linkCadastro` ao usuário.',
  })
  identificar(@Param('telefone') telefone: string) {
    return this.entrevistas.contextoParaBot(telefone);
  }

  @Post('entrevista')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registra o feedback da IA ao final de uma simulação de entrevista' })
  registrar(@Body() dto: RegistrarEntrevistaDto) {
    return this.entrevistas.registrar(dto);
  }
}
