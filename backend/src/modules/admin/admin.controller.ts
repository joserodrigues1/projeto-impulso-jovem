import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { TipoUsuario } from '@prisma/client';
import { Meta, Roles, UsuarioAtual } from '../../common/decorators/auth.decorators';
import type { MetaRequisicao, UsuarioAutenticado } from '../../common/decorators/auth.decorators';
import { MENSAGENS_CURRICULO } from '../curriculos/curriculos.service';
import { AdminAtivoGuard } from './admin.guard';
import { ListarAuditoriaDto, ListarParticipantesDto, PeriodoQueryDto } from './admin.dto';
import { AdminService, ArquivoCsv, MENSAGENS_ADMIN } from './admin.service';

/** Id inválido responde como inexistente (404), sem detalhes. */
const id404 = (mensagem: string) =>
  new ParseUUIDPipe({ exceptionFactory: () => new NotFoundException(mensagem) });

const POR_MINUTO = 60_000;

/** Planilha para download (o nome do arquivo é montado pela API, sem texto do usuário). */
function arquivoCsv({ nomeArquivo, conteudo }: ArquivoCsv): StreamableFile {
  return new StreamableFile(Buffer.from(conteudo, 'utf8'), {
    type: 'text/csv; charset=utf-8',
    disposition: `attachment; filename="${nomeArquivo}"`,
  });
}

/**
 * Painel do administrador. Duas travas: `@Roles(ADMIN)` (token) e `AdminAtivoGuard` (confere no
 * banco a cada requisição). Respostas sem cache (`Cache-Control: no-store`, ver AdminModule).
 * Abrir a ficha ou o conteúdo de um participante e exportar planilhas fica na auditoria.
 */
@ApiTags('Admin')
@ApiCookieAuth()
@Roles(TipoUsuario.ADMIN)
@UseGuards(AdminAtivoGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('resumo')
  @ApiOperation({
    summary: 'Números de uso do período (padrão: últimos 30 dias; até 366 dias; fuso de São Paulo)',
  })
  resumo(@Query() q: PeriodoQueryDto) {
    return this.admin.resumo(q);
  }

  @Get('participantes')
  @ApiOperation({ summary: 'Lista os participantes (sem contas ADMIN), com busca e filtros' })
  listarParticipantes(@Query() q: ListarParticipantesDto) {
    return this.admin.listarParticipantes(q);
  }

  @Get('participantes/:id')
  @ApiOperation({ summary: 'Ficha do participante (o acesso fica registrado na auditoria)' })
  @ApiResponse({ status: 404, description: 'Participante não encontrado' })
  obterParticipante(
    @UsuarioAtual() admin: UsuarioAutenticado,
    @Param('id', id404(MENSAGENS_ADMIN.participanteNaoEncontrado)) id: string,
    @Meta() meta: MetaRequisicao,
  ) {
    return this.admin.obterParticipante(admin.id, id, meta);
  }

  @Get('participantes/:id/curriculos/:curriculoId')
  @ApiOperation({
    summary: 'Currículo do participante, como ele vê (o acesso fica registrado na auditoria)',
  })
  obterCurriculo(
    @UsuarioAtual() admin: UsuarioAutenticado,
    @Param('id', id404(MENSAGENS_ADMIN.participanteNaoEncontrado)) id: string,
    @Param('curriculoId', id404(MENSAGENS_CURRICULO.naoEncontrado)) curriculoId: string,
    @Meta() meta: MetaRequisicao,
  ) {
    return this.admin.obterCurriculo(admin.id, id, curriculoId, meta);
  }

  @Get('participantes/:id/simulacoes/:sessaoId')
  @ApiOperation({
    summary: 'Conversa da simulação e relatório (o acesso fica registrado na auditoria)',
  })
  obterSimulacao(
    @UsuarioAtual() admin: UsuarioAutenticado,
    @Param('id', id404(MENSAGENS_ADMIN.participanteNaoEncontrado)) id: string,
    @Param('sessaoId', id404(MENSAGENS_ADMIN.simulacaoNaoEncontrada)) sessaoId: string,
    @Meta() meta: MetaRequisicao,
  ) {
    return this.admin.obterSimulacao(admin.id, id, sessaoId, meta);
  }

  @Get('auditoria')
  @ApiOperation({ summary: 'Histórico de auditoria (IP mascarado, sem conteúdo nos detalhes)' })
  listarAuditoria(@Query() q: ListarAuditoriaDto) {
    return this.admin.listarAuditoria(q);
  }

  @Get('auditoria/acoes')
  @ApiOperation({ summary: 'Ações já registradas na auditoria, com rótulo e total' })
  acoesAuditoria() {
    return this.admin.acoesAuditoria();
  }

  @Get('exportar/participantes.csv')
  @Throttle({ default: { limit: 10, ttl: POR_MINUTO } })
  @ApiProduces('text/csv')
  @ApiOperation({ summary: 'Planilha dos participantes (mesmos filtros da lista, sem paginação)' })
  async exportarParticipantes(
    @UsuarioAtual() admin: UsuarioAutenticado,
    @Query() filtros: ListarParticipantesDto,
    @Meta() meta: MetaRequisicao,
  ) {
    return arquivoCsv(await this.admin.exportarParticipantes(admin.id, filtros, meta));
  }

  @Get('exportar/uso.csv')
  @Throttle({ default: { limit: 10, ttl: POR_MINUTO } })
  @ApiProduces('text/csv')
  @ApiOperation({ summary: 'Planilha de uso: uma linha por semana do período' })
  async exportarUso(
    @UsuarioAtual() admin: UsuarioAutenticado,
    @Query() q: PeriodoQueryDto,
    @Meta() meta: MetaRequisicao,
  ) {
    return arquivoCsv(await this.admin.exportarUso(admin.id, q, meta));
  }
}
