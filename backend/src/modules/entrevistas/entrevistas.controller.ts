import {
  BadRequestException,
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
import {
  FinalizarSessaoDto,
  RegistrarEntrevistaDto,
  RegistrarMensagemDto,
  SessoesPendentesQueryDto,
} from './entrevistas.dto';
import { EntrevistasService } from './entrevistas.service';
import { SessoesEntrevistaService } from './sessoes.service';

const uuid = new ParseUUIDPipe({
  exceptionFactory: () => new BadRequestException('Identificador inválido'),
});

/** Simulações de entrevista do usuário logado (painel). */
@ApiTags('Entrevistas')
@ApiCookieAuth()
@Controller('entrevistas')
export class EntrevistasController {
  constructor(
    private readonly entrevistas: EntrevistasService,
    private readonly sessoes: SessoesEntrevistaService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Lista as simulações de entrevista do usuário (mais recentes primeiro)',
  })
  listar(@UsuarioAtual() usuario: UsuarioAutenticado, @Query() paginacao: PaginacaoDto) {
    return this.entrevistas.listar(usuario.id, paginacao);
  }

  // Declarada antes de `:id` para não ser capturada por ela
  @Get('resumo')
  @ApiOperation({
    summary: 'Números do painel: média, evolução das notas e simulação em andamento',
  })
  resumo(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.entrevistas.resumo(usuario.id);
  }

  @Post('sessao-ativa/finalizar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Encerra a simulação em andamento e pede o relatório' })
  finalizarSessaoAtiva(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.sessoes.finalizarAtivaDoUsuario(usuario.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma simulação de entrevista do usuário (com o relatório)' })
  obter(@UsuarioAtual() usuario: UsuarioAutenticado, @Param('id', uuid) id: string) {
    return this.entrevistas.obter(usuario.id, id);
  }
}

/**
 * Webhooks consumidos pelo n8n (IA recrutadora no WhatsApp e gerador de relatórios).
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
  constructor(
    private readonly entrevistas: EntrevistasService,
    private readonly sessoes: SessoesEntrevistaService,
  ) {}

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

  @Post('mensagens')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registra uma mensagem da simulação (cria a sessão se não houver uma em andamento)',
  })
  registrarMensagem(@Body() dto: RegistrarMensagemDto) {
    return this.sessoes.registrarMensagem(dto);
  }

  @Get('sessoes/pendentes')
  @ApiOperation({
    summary: 'Sessões encerradas aguardando relatório (encerra antes as inativas)',
  })
  pendentes(@Query() query: SessoesPendentesQueryDto) {
    return this.sessoes.listarPendentes(query.limite);
  }

  @Get('sessoes/:id/transcricao')
  @ApiOperation({ summary: 'Transcrição e contexto da sessão (conversa e relatório)' })
  transcricao(@Param('id', uuid) id: string) {
    return this.sessoes.transcricao(id);
  }

  @Post('sessoes/:id/finalizar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Encerra a sessão (idempotente) e dispara o relatório' })
  finalizar(@Param('id', uuid) id: string, @Body() dto: FinalizarSessaoDto) {
    return this.sessoes.finalizar(id, dto.motivo ?? 'CONCLUIDA');
  }

  @Post('entrevista')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registra o relatório da IA ao final de uma simulação (idempotente por sessaoId)',
  })
  registrar(@Body() dto: RegistrarEntrevistaDto) {
    return this.entrevistas.registrar(dto);
  }
}
