import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { MetaRequisicao } from '../../common/decorators/auth.decorators';
import { PaginacaoDto, Paginado, paginar, skipTake } from '../../common/dto/paginacao.dto';
import { N8N_API_KEY_HEADER } from '../../common/guards/n8n-api-key.guard';
import { formatarTelefone } from '../../common/validators/telefone';
import { env } from '../../config/env';
import { AuditoriaService } from '../../infra/auditoria.service';
import { PrismaService } from '../../infra/prisma.service';
import {
  aplicarRespostaIa,
  cargoDesejadoDe,
  ConteudoCurriculo,
  formularioVazio,
  IdentidadeCurriculo,
  LIMITES,
  linha,
  montarConteudo,
  normalizarConteudo,
  ordenarConteudo,
  ResultadoIa,
  temConteudoEscrito,
} from './curriculo-conteudo';
import { type ArquivosCurriculo, CAMPO_AUDIO, CAMPO_CURRICULO_ANTIGO } from './curriculo-entrada';
import { AtualizarCurriculoDto, GerarCurriculoDto } from './curriculos.dto';

export interface CurriculoResumo {
  id: string;
  titulo: string | null;
  cargoDesejado: string | null;
  refinadoPorIa: boolean;
  geradoEm: Date;
  atualizadoEm: Date;
}

export interface CurriculoDetalhe extends CurriculoResumo {
  conteudo: ConteudoCurriculo;
}

export interface CurriculoGeradoResposta extends CurriculoDetalhe {
  transcricao?: string;
  avisos: string[];
}

export const MENSAGENS_CURRICULO = {
  naoEncontrado: 'Currículo não encontrado',
  contaNaoEncontrada: 'Conta não encontrada',
  semConteudo:
    'Conte um pouco sobre você: preencha o formulário, grave um áudio ou envie um currículo que você já tenha.',
  audioSemIa:
    'Para usar o áudio ou o currículo antigo, deixe a ajuda da IA ligada ou preencha o formulário.',
  audioIndisponivel:
    'Não conseguimos processar seus arquivos agora. Tente de novo em alguns minutos ou escreva sua história no formulário.',
  iaIndisponivel:
    'A IA está indisponível no momento, então montamos o currículo só com o que você preencheu. Você pode revisar e editar quando quiser.',
  iaIndisponivelComAudio:
    'A IA está indisponível no momento e seus arquivos não puderam ser processados, então montamos o currículo só com o que você escreveu. Você pode editar ou tentar de novo em alguns minutos.',
  audioIgnorado:
    'O áudio e o currículo antigo só são usados com a ajuda da IA ligada, por isso não entraram desta vez.',
  audioNaoEntendido:
    'Não conseguimos entender bem o seu áudio. Confira se ficou faltando alguma informação no currículo.',
} as const;

const TITULO_PADRAO = 'Meu currículo';
/** Resposta do n8n acima disso é descartada (o currículo completo tem poucas dezenas de KB). */
const MAX_RESPOSTA_IA = 1024 * 1024;

const SELECAO_CURRICULO = {
  id: true,
  titulo: true,
  refinadoPorIa: true,
  geradoEm: true,
  atualizadoEm: true,
  conteudo: true,
} satisfies Prisma.CurriculoGeradoSelect;

type RegistroCurriculo = Prisma.CurriculoGeradoGetPayload<{ select: typeof SELECAO_CURRICULO }>;

/** O conteúdo já está normalizado (sem `undefined`); o round-trip garante JSON puro para o Prisma. */
const paraJson = (conteudo: ConteudoCurriculo) =>
  JSON.parse(JSON.stringify(conteudo)) as Prisma.InputJsonObject;

@Injectable()
export class CurriculosService {
  private readonly logger = new Logger(CurriculosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  /**
   * Monta o currículo com o formulário e, se possível, refina com a IA (n8n), que também transcreve o áudio e
   * lê o currículo antigo. Sem IA (desligada, não configurada ou com falha) salva só o formulário e avisa —
   * exceto quando o usuário mandou só arquivos: aí não há o que salvar e a resposta é 503.
   */
  async gerar(
    usuarioId: string,
    dto: GerarCurriculoDto,
    arquivos: ArquivosCurriculo = {},
    meta: MetaRequisicao = {},
  ): Promise<CurriculoGeradoResposta> {
    const { audio, curriculoAntigo } = arquivos;
    const temArquivo = Boolean(audio || curriculoAntigo);
    if (!temArquivo && formularioVazio(dto)) {
      throw new BadRequestException(MENSAGENS_CURRICULO.semConteudo);
    }
    // "Só arquivos" (seção 5.4): sem perfil, experiências, formação e habilidades escritos
    const soArquivos = !temConteudoEscrito(dto);

    const usarIa = dto.usarIa !== false;
    if (!usarIa && temArquivo && soArquivos)
      throw new BadRequestException(MENSAGENS_CURRICULO.audioSemIa);

    const identidade = await this.buscarIdentidade(usuarioId, true);
    // Na ordem do formulário — a mesma que a IA recebe — para casar os itens da resposta por posição
    const doFormulario = montarConteudo(identidade, dto, { manterOrdem: true });
    let conteudo = ordenarConteudo(doFormulario);
    let refinado = false;
    let transcricao: string | undefined;
    const avisos: string[] = [];

    if (!usarIa) {
      if (temArquivo) avisos.push(MENSAGENS_CURRICULO.audioIgnorado);
    } else {
      const resultado = await this.refinarComIa(doFormulario, dto, arquivos);
      if (resultado?.refinado) {
        conteudo = resultado.conteudo;
        refinado = true;
        if (audio) {
          transcricao = resultado.transcricao;
          if (!transcricao) avisos.push(MENSAGENS_CURRICULO.audioNaoEntendido);
        }
        avisos.push(...resultado.observacoes);
      } else if (soArquivos && temArquivo) {
        throw new ServiceUnavailableException(MENSAGENS_CURRICULO.audioIndisponivel);
      } else {
        avisos.push(
          temArquivo
            ? MENSAGENS_CURRICULO.iaIndisponivelComAudio
            : MENSAGENS_CURRICULO.iaIndisponivel,
        );
      }
    }

    const titulo =
      linha(dto.titulo, LIMITES.titulo) ||
      linha(conteudo.cargoDesejado, LIMITES.titulo) ||
      TITULO_PADRAO;
    const registro = await this.prisma.curriculoGerado.create({
      data: { usuarioId, titulo, refinadoPorIa: refinado, conteudo: paraJson(conteudo) },
      select: SELECAO_CURRICULO,
    });

    await this.auditoria.registrar({
      usuarioId,
      acao: 'CURRICULO_GERADO',
      entidade: 'CurriculoGerado',
      entidadeId: registro.id,
      detalhes: {
        refinadoPorIa: refinado,
        usouIa: usarIa,
        comAudio: Boolean(audio),
        comCurriculoAntigo: Boolean(curriculoAntigo),
      },
      ip: meta.ip,
    });

    return {
      ...this.paraDetalhe(registro),
      ...(transcricao ? { transcricao } : {}),
      avisos,
    };
  }

  async listar(usuarioId: string, p: PaginacaoDto): Promise<Paginado<CurriculoResumo>> {
    const where = { usuarioId };
    const [registros, total] = await Promise.all([
      this.prisma.curriculoGerado.findMany({
        where,
        orderBy: [{ geradoEm: 'desc' }, { id: 'desc' }],
        select: SELECAO_CURRICULO,
        ...skipTake(p),
      }),
      this.prisma.curriculoGerado.count({ where }),
    ]);
    return paginar(
      registros.map((r) => this.paraResumo(r, cargoDesejadoDe(r.conteudo))),
      total,
      p,
    );
  }

  async obter(usuarioId: string, id: string): Promise<CurriculoDetalhe> {
    // Sempre filtrando pelo dono: o id de outro usuário responde 404
    const registro = await this.prisma.curriculoGerado.findFirst({
      where: { id, usuarioId },
      select: SELECAO_CURRICULO,
    });
    if (!registro) throw new NotFoundException(MENSAGENS_CURRICULO.naoEncontrado);
    const detalhe = this.paraDetalhe(registro);
    // A identificação sempre vem da conta (seção 4.1): registros v1 não tinham nome, e-mail nem
    // telefone no JSON, e quem trocou o telefone no perfil vê o número atual no currículo
    const conta = await this.buscarIdentidade(usuarioId, false);
    detalhe.conteudo = {
      ...detalhe.conteudo,
      nomeCompleto: linha(conta.nomeCompleto, LIMITES.nomeCompleto),
      email: linha(conta.email, LIMITES.email),
      telefone: linha(conta.telefone, LIMITES.telefone),
    };
    return detalhe;
  }

  /** Edição manual (sem IA). A identificação é a atual da conta; `refinadoPorIa` não muda. */
  async atualizar(
    usuarioId: string,
    id: string,
    dto: AtualizarCurriculoDto,
    meta: MetaRequisicao = {},
  ): Promise<CurriculoDetalhe> {
    const atual = await this.prisma.curriculoGerado.findFirst({
      where: { id, usuarioId },
      select: { id: true, titulo: true },
    });
    if (!atual) throw new NotFoundException(MENSAGENS_CURRICULO.naoEncontrado);

    // Sem completar com o perfil: o que o usuário apagou na edição (cidade, LinkedIn...) continua apagado
    const identidade = await this.buscarIdentidade(usuarioId, false);
    const conteudo = montarConteudo(identidade, dto);
    const titulo =
      linha(dto.titulo, LIMITES.titulo) ||
      atual.titulo ||
      linha(conteudo.cargoDesejado, LIMITES.titulo) ||
      TITULO_PADRAO;

    const registro = await this.prisma.curriculoGerado.update({
      where: { id: atual.id, usuarioId },
      data: { titulo, conteudo: paraJson(conteudo) },
      select: SELECAO_CURRICULO,
    });

    await this.auditoria.registrar({
      usuarioId,
      acao: 'CURRICULO_ATUALIZADO',
      entidade: 'CurriculoGerado',
      entidadeId: registro.id,
      ip: meta.ip,
    });
    return this.paraDetalhe(registro);
  }

  async excluir(usuarioId: string, id: string, meta: MetaRequisicao = {}): Promise<void> {
    const { count } = await this.prisma.curriculoGerado.deleteMany({ where: { id, usuarioId } });
    if (!count) throw new NotFoundException(MENSAGENS_CURRICULO.naoEncontrado);
    await this.auditoria.registrar({
      usuarioId,
      acao: 'CURRICULO_EXCLUIDO',
      entidade: 'CurriculoGerado',
      entidadeId: id,
      ip: meta.ip,
    });
  }

  // ───────────────────────────── internos ─────────────────────────────

  /** Nome, e-mail e telefone sempre da conta. Com `comPerfil`, cidade/UF/LinkedIn do perfil completam o formulário. */
  private async buscarIdentidade(
    usuarioId: string,
    comPerfil: boolean,
  ): Promise<IdentidadeCurriculo> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        nomeCompleto: true,
        email: true,
        telefone: true,
        perfil: { select: { cidade: true, uf: true, linkLinkedin: true } },
      },
    });
    if (!usuario) throw new NotFoundException(MENSAGENS_CURRICULO.contaNaoEncontrada);

    const identidade: IdentidadeCurriculo = {
      nomeCompleto: usuario.nomeCompleto,
      email: usuario.email,
      // Cadastro antigo com telefone fora do padrão: formatarTelefone devolve o valor original
      telefone: formatarTelefone(usuario.telefone),
    };
    if (comPerfil && usuario.perfil) {
      identidade.cidade = usuario.perfil.cidade ?? undefined;
      identidade.uf = usuario.perfil.uf ?? undefined;
      identidade.linkedin = usuario.perfil.linkLinkedin ?? undefined;
    }
    return identidade;
  }

  /**
   * Chama o fluxo "Construtor de Currículo" do n8n (seção 6.1) em `multipart/form-data`: o campo `dados`
   * (JSON) e os arquivos `audio` e `curriculoAntigo` como arquivos de verdade (sem base64), que o n8n já recebe
   * prontos para transcrever/ler. Não vão dados de contato: a identidade do currículo vem sempre da conta.
   * Devolve `null` se a IA não estiver configurada ou falhar (rede, tempo esgotado, status != 2xx,
   * resposta vazia/grande demais). O log registra só status e tempo — nunca arquivos nem dados pessoais.
   */
  private async refinarComIa(
    base: ConteudoCurriculo,
    dto: GerarCurriculoDto,
    arquivos: ArquivosCurriculo,
  ): Promise<ResultadoIa | null> {
    const url = env.N8N_CURRICULO_WEBHOOK_URL;
    if (!url) return null;

    const dados = {
      versao: 3,
      formulario: {
        titulo: dto.titulo,
        cargoDesejado: dto.cargoDesejado,
        cidade: dto.cidade ?? base.cidade,
        uf: dto.uf ?? base.uf,
        perfilProfissional: dto.perfilProfissional,
        experiencias: dto.experiencias,
        formacao: dto.formacao,
        habilidades: dto.habilidades,
        idiomas: dto.idiomas,
        premiacoes: dto.premiacoes,
      },
      temAudio: Boolean(arquivos.audio),
      temCurriculoAntigo: Boolean(arquivos.curriculoAntigo),
      // O fluxo só chama a IA se houver o que aproveitar: texto escrito, fala transcrita ou currículo lido
      temConteudoEscrito: temConteudoEscrito(dto),
    };
    const corpo = new FormData();
    corpo.append('dados', JSON.stringify(dados));
    for (const [campo, arquivo] of [
      [CAMPO_AUDIO, arquivos.audio],
      [CAMPO_CURRICULO_ANTIGO, arquivos.curriculoAntigo],
    ] as const) {
      if (arquivo) {
        // Cópia em Uint8Array "pura": o Blob não aceita o Buffer compartilhado do Node
        corpo.append(
          campo,
          new Blob([new Uint8Array(arquivo.buffer)], { type: arquivo.mimeType }),
          arquivo.nomeArquivo,
        );
      }
    }

    // Sem Content-Type: o fetch define o multipart com o boundary
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (env.N8N_API_KEY) headers[N8N_API_KEY_HEADER] = env.N8N_API_KEY;

    const controlador = new AbortController();
    const timer = setTimeout(() => controlador.abort(), env.N8N_CURRICULO_TIMEOUT_MS);
    const inicio = Date.now();
    const falhar = (motivo: string) => {
      this.logger.warn(`IA de currículo indisponível: ${motivo} (${Date.now() - inicio} ms)`);
      return null;
    };

    try {
      const resposta = await fetch(url, {
        method: 'POST',
        headers,
        body: corpo,
        signal: controlador.signal,
        // Redirecionamento poderia levar a chave de API para outro host
        redirect: 'error',
      });
      if (!resposta.ok) {
        await resposta.body?.cancel().catch(() => undefined);
        return falhar(`status ${resposta.status}`);
      }
      if (Number(resposta.headers.get('content-length') ?? 0) > MAX_RESPOSTA_IA) {
        await resposta.body?.cancel().catch(() => undefined);
        return falhar('resposta grande demais');
      }

      // Limite vale também sem content-length (resposta em partes)
      const texto = await lerCorpoLimitado(resposta, MAX_RESPOSTA_IA);
      if (texto === null) return falhar('resposta grande demais');
      if (!texto.trim()) return falhar('resposta vazia');

      const resultado = aplicarRespostaIa(base, lerJson(texto));
      if (!resultado.refinado) return falhar('resposta sem conteúdo aproveitável');
      this.logger.log(`IA de currículo respondeu ${resposta.status} em ${Date.now() - inicio} ms`);
      return resultado;
    } catch {
      return falhar(controlador.signal.aborted ? 'tempo esgotado' : 'falha de rede');
    } finally {
      clearTimeout(timer);
    }
  }

  private paraResumo(r: RegistroCurriculo, cargoDesejado: string | null): CurriculoResumo {
    return {
      id: r.id,
      titulo: r.titulo,
      cargoDesejado,
      refinadoPorIa: r.refinadoPorIa,
      geradoEm: r.geradoEm,
      atualizadoEm: r.atualizadoEm,
    };
  }

  private paraDetalhe(r: RegistroCurriculo): CurriculoDetalhe {
    const conteudo = normalizarConteudo(r.conteudo);
    return { ...this.paraResumo(r, conteudo.cargoDesejado ?? null), conteudo };
  }
}

/** Lê o corpo até `max` bytes; acima disso cancela a leitura e devolve `null`. */
async function lerCorpoLimitado(resposta: Response, max: number): Promise<string | null> {
  if (!resposta.body) return '';
  const leitor = resposta.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await leitor.cancel().catch(() => undefined);
      return null;
    }
    partes.push(value);
  }
  return Buffer.concat(partes).toString('utf8');
}

/** JSON quando possível; senão o texto bruto (a extração tolerante procura JSON em blocos markdown). */
function lerJson(texto: string): unknown {
  try {
    return JSON.parse(texto) as unknown;
  } catch {
    return texto;
  }
}
