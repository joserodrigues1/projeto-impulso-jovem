import { Body, Controller, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsuarioAtual } from '../../common/decorators/auth.decorators';
import { UsuarioSessao } from '../auth/auth.service';
import { CurriculosService } from './curriculos.service';

export class GerarCurriculoDto {
  habilidades: string[];
  experiencias: { cargo: string; empresa: string; descricao?: string; dataInicio: string; dataFim?: string }[];
  resumoProfissional?: string;
  nivelEscolaridade?: string;
}

@ApiTags('Curriculos')
@ApiCookieAuth()
@Controller('curriculos')
export class CurriculosController {
  constructor(private readonly curriculos: CurriculosService) {}

  @Post('gerar')
  @ApiOperation({ summary: 'Envia os dados do usuário para o n8n gerar o currículo em PDF' })
  async gerarCurriculo(@Body() dto: GerarCurriculoDto, @UsuarioAtual() usuario: UsuarioSessao) {
    return this.curriculos.gerarCurriculo(usuario.id, dto);
  }
}
