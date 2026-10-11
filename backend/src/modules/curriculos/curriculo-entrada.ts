/**
 * Entrada de POST /curriculos/gerar: `multipart/form-data` com o campo `dados` (JSON) e os arquivos opcionais
 * `audio` (a história contada em voz) e `curriculoAntigo` (PDF ou foto de um currículo que o jovem já tem).
 * O ValidationPipe global não valida o campo `dados` (chega como texto), então o parse e a validação são feitos aqui,
 * com as mesmas regras do pipe (whitelist + forbidNonWhitelisted).
 */
import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  PayloadTooLargeException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import type { Observable } from 'rxjs';
import { ehObjeto } from './curriculo-conteudo';

export const CAMPO_AUDIO = 'audio';
export const AUDIO_MAX_BYTES = 8 * 1024 * 1024;
export const AUDIO_MIN_BYTES = 1024;
export const CAMPO_CURRICULO_ANTIGO = 'curriculoAntigo';
export const CURRICULO_ANTIGO_MAX_BYTES = 5 * 1024 * 1024;
const CURRICULO_ANTIGO_MIN_BYTES = 100;
/** Tamanho máximo do campo `dados` (o JSON do formulário completo fica bem abaixo disso). */
const DADOS_MAX_BYTES = 256 * 1024;

export const TIPOS_AUDIO = [
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
  'audio/wav',
  'audio/x-wav',
] as const;

export type FormatoAudio = 'webm' | 'ogg' | 'mp3' | 'mp4' | 'wav' | 'aac';

/** Tipo enviado ao n8n: o do conteúdo real do arquivo, não o informado pelo navegador. */
const AUDIO_POR_FORMATO: Record<FormatoAudio, { mimeType: string; extensao: string }> = {
  webm: { mimeType: 'audio/webm', extensao: 'webm' },
  ogg: { mimeType: 'audio/ogg', extensao: 'ogg' },
  mp3: { mimeType: 'audio/mpeg', extensao: 'mp3' },
  mp4: { mimeType: 'audio/mp4', extensao: 'm4a' },
  wav: { mimeType: 'audio/wav', extensao: 'wav' },
  aac: { mimeType: 'audio/aac', extensao: 'aac' },
};

export const MENSAGENS_ENTRADA = {
  audioTipo:
    'Formato de áudio não aceito. Grave pelo botão da página ou envie um arquivo MP3, M4A, OGG, WEBM, AAC ou WAV.',
  audioInvalido:
    'Não conseguimos reconhecer esse arquivo como áudio. Grave de novo ou envie outro arquivo (MP3, M4A, OGG, WEBM, AAC ou WAV).',
  audioCurto:
    'O áudio ficou vazio ou curto demais. Grave de novo falando por pelo menos alguns segundos.',
  audioGrande:
    'O áudio passou do limite de 8 MB. Grave um áudio mais curto ou envie um arquivo menor.',
  envioInvalido:
    'Não foi possível ler o envio. Mande os dados do currículo e, se quiser, um áudio (até 8 MB) e um currículo antigo (até 5 MB).',
  curriculoAntigoTipo:
    'Envie o currículo antigo em PDF ou como foto (JPG ou PNG). Se ele estiver no Word, salve como PDF antes.',
  curriculoAntigoInvalido:
    'Não conseguimos abrir esse arquivo. Confira se é um PDF ou uma foto (JPG ou PNG) e tente de novo.',
  curriculoAntigoGrande: 'O currículo antigo passou do limite de 5 MB. Envie um arquivo menor.',
  arquivoGrande:
    'Um dos arquivos passou do limite (áudio até 8 MB, currículo antigo até 5 MB). Envie um arquivo menor.',
  dadosJson:
    'Os dados do currículo chegaram em um formato inválido. Atualize a página e tente de novo.',
  dadosAusentes: 'Envie os dados do currículo.',
} as const;

// ───────────────────────────── áudio ─────────────────────────────

const comeca = (b: Buffer, assinatura: number[], deslocamento = 0) =>
  b.length >= deslocamento + assinatura.length &&
  assinatura.every((byte, i) => b[deslocamento + i] === byte);
const ascii = (texto: string) => [...texto].map((c) => c.charCodeAt(0));

/** Identifica o formato pelos primeiros bytes (assinatura), sem confiar na extensão ou no mimetype. */
export function detectarFormatoAudio(b: Buffer): FormatoAudio | null {
  if (comeca(b, [0x1a, 0x45, 0xdf, 0xa3])) return 'webm'; // EBML (webm/mkv)
  if (comeca(b, ascii('OggS'))) return 'ogg';
  if (comeca(b, ascii('RIFF')) && comeca(b, ascii('WAVE'), 8)) return 'wav';
  if (comeca(b, ascii('ftyp'), 4)) return 'mp4'; // mp4/m4a
  if (comeca(b, ascii('ID3'))) return 'mp3';
  if (b.length >= 2 && b[0] === 0xff) {
    // ADTS (AAC): sincronismo de 12 bits e camada "00"
    if ((b[1] & 0xf6) === 0xf0) return 'aac';
    // Quadro MPEG (MP3): sincronismo de 11 bits, versão e camada válidas
    if ((b[1] & 0xe0) === 0xe0 && (b[1] & 0x18) !== 0x08 && (b[1] & 0x06) !== 0) return 'mp3';
  }
  return null;
}

export interface ArquivoAudio {
  buffer: Buffer;
  mimetype: string;
}

export interface AudioValidado {
  buffer: Buffer;
  mimeType: string;
  nomeArquivo: string;
}

/** Valida tamanho, tipo declarado (lista do contrato) e assinatura binária. */
export function validarAudio(arquivo: ArquivoAudio): AudioValidado {
  const tamanho = arquivo.buffer?.length ?? 0;
  if (tamanho < AUDIO_MIN_BYTES) throw new BadRequestException(MENSAGENS_ENTRADA.audioCurto);
  if (tamanho > AUDIO_MAX_BYTES) throw new PayloadTooLargeException(MENSAGENS_ENTRADA.audioGrande);

  // "audio/webm;codecs=opus" → "audio/webm"
  const tipo = (arquivo.mimetype ?? '').split(';')[0].trim().toLowerCase();
  if (!(TIPOS_AUDIO as readonly string[]).includes(tipo)) {
    throw new BadRequestException(MENSAGENS_ENTRADA.audioTipo);
  }

  const formato = detectarFormatoAudio(arquivo.buffer);
  if (!formato) throw new BadRequestException(MENSAGENS_ENTRADA.audioInvalido);

  const { mimeType, extensao } = AUDIO_POR_FORMATO[formato];
  // Nome genérico: o nome original do arquivo pode conter dados pessoais
  return { buffer: arquivo.buffer, mimeType, nomeArquivo: `historia.${extensao}` };
}

// ───────────────────────────── currículo antigo ─────────────────────────────

export type FormatoCurriculoAntigo = 'pdf' | 'jpg' | 'png';

const CURRICULO_ANTIGO_POR_FORMATO: Record<
  FormatoCurriculoAntigo,
  { mimeType: string; extensao: string }
> = {
  pdf: { mimeType: 'application/pdf', extensao: 'pdf' },
  jpg: { mimeType: 'image/jpeg', extensao: 'jpg' },
  png: { mimeType: 'image/png', extensao: 'png' },
};

const TIPOS_CURRICULO_ANTIGO = [
  'application/pdf',
  'application/x-pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

/** PDF pode ter bytes antes do cabeçalho (até ~1 KB, pela especificação); imagens começam pela assinatura. */
export function detectarFormatoCurriculoAntigo(b: Buffer): FormatoCurriculoAntigo | null {
  if (b.subarray(0, 1024).includes('%PDF-')) return 'pdf';
  if (comeca(b, [0xff, 0xd8, 0xff])) return 'jpg';
  if (comeca(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  return null;
}

export interface ArquivoCurriculoAntigoValidado {
  buffer: Buffer;
  mimeType: string;
  nomeArquivo: string;
}

/** Valida tamanho, tipo declarado e assinatura do currículo antigo (PDF, JPG ou PNG). */
export function validarCurriculoAntigo(arquivo: ArquivoAudio): ArquivoCurriculoAntigoValidado {
  const tamanho = arquivo.buffer?.length ?? 0;
  if (tamanho > CURRICULO_ANTIGO_MAX_BYTES) {
    throw new PayloadTooLargeException(MENSAGENS_ENTRADA.curriculoAntigoGrande);
  }
  if (tamanho < CURRICULO_ANTIGO_MIN_BYTES) {
    throw new BadRequestException(MENSAGENS_ENTRADA.curriculoAntigoInvalido);
  }
  const tipo = (arquivo.mimetype ?? '').split(';')[0].trim().toLowerCase();
  if (!TIPOS_CURRICULO_ANTIGO.includes(tipo)) {
    throw new BadRequestException(MENSAGENS_ENTRADA.curriculoAntigoTipo);
  }
  const formato = detectarFormatoCurriculoAntigo(arquivo.buffer);
  if (!formato) throw new BadRequestException(MENSAGENS_ENTRADA.curriculoAntigoInvalido);

  const { mimeType, extensao } = CURRICULO_ANTIGO_POR_FORMATO[formato];
  // Nome genérico: o nome original costuma ter o nome da pessoa
  return { buffer: arquivo.buffer, mimeType, nomeArquivo: `curriculo-antigo.${extensao}` };
}

// ───────────────────────────── upload ─────────────────────────────

/** Arquivos recebidos pelo multer, por campo (cada campo aceita um arquivo). */
export interface ArquivosRecebidos {
  [CAMPO_AUDIO]?: ArquivoAudio[];
  [CAMPO_CURRICULO_ANTIGO]?: ArquivoAudio[];
}

/** Arquivos já validados que seguem para a IA. */
export interface ArquivosCurriculo {
  audio?: AudioValidado;
  curriculoAntigo?: ArquivoCurriculoAntigoValidado;
}

/** Valida os arquivos recebidos (cada um com as suas regras). */
export function validarArquivosCurriculo(
  recebidos: ArquivosRecebidos | undefined,
): ArquivosCurriculo {
  const audio = recebidos?.[CAMPO_AUDIO]?.[0];
  const antigo = recebidos?.[CAMPO_CURRICULO_ANTIGO]?.[0];
  return {
    ...(audio ? { audio: validarAudio(audio) } : {}),
    ...(antigo ? { curriculoAntigo: validarCurriculoAntigo(antigo) } : {}),
  };
}

const InterceptorMulter = FileFieldsInterceptor(
  [
    { name: CAMPO_AUDIO, maxCount: 1 },
    { name: CAMPO_CURRICULO_ANTIGO, maxCount: 1 },
  ],
  {
    // Sem `storage`/`dest`: os arquivos ficam em memória (nada é gravado em disco).
    // O limite por arquivo é o do maior (áudio); o do currículo antigo é conferido na validação.
    limits: {
      fileSize: AUDIO_MAX_BYTES,
      files: 2,
      fields: 5,
      parts: 7,
      fieldSize: DADOS_MAX_BYTES,
    },
  },
);

/**
 * Recebe `audio` e `curriculoAntigo` em memória e troca as mensagens do multer (em inglês) por mensagens
 * amigáveis. Requisições `application/json` passam direto.
 */
@Injectable()
export class ArquivosCurriculoInterceptor implements NestInterceptor {
  private readonly multer = new InterceptorMulter();

  async intercept(ctx: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    try {
      return await this.multer.intercept(ctx, next);
    } catch (erro) {
      throw erro instanceof PayloadTooLargeException
        ? new PayloadTooLargeException(MENSAGENS_ENTRADA.arquivoGrande)
        : new BadRequestException(MENSAGENS_ENTRADA.envioInvalido);
    }
  }
}

// ───────────────────────────── campo `dados` ─────────────────────────────

/**
 * No multipart, os dados vêm como texto JSON no campo `dados`. Sem `dados` (requisição JSON),
 * o corpo inteiro é o DTO.
 */
export function extrairDadosDoCorpo(corpo: unknown): unknown {
  if (!ehObjeto(corpo) || !Object.hasOwn(corpo, 'dados')) return corpo ?? {};
  const dados = corpo.dados;
  if (typeof dados !== 'string') return dados;
  try {
    return JSON.parse(dados) as unknown;
  } catch {
    throw new BadRequestException([MENSAGENS_ENTRADA.dadosJson]);
  }
}

const ROTULOS_LISTA: Record<string, string> = {
  experiencias: 'Experiência',
  formacao: 'Formação',
  idiomas: 'Idioma',
};

/** Mensagens legíveis: "Experiência 2: Informe o cargo (até 150 caracteres)". */
export function mensagensDeValidacao(erros: ValidationError[]): string[] {
  const mensagens: string[] = [];
  const visitar = (erro: ValidationError, prefixo: string) => {
    for (const [tipo, mensagem] of Object.entries(erro.constraints ?? {})) {
      mensagens.push(
        prefixo +
          (tipo === 'whitelistValidation'
            ? `O campo "${erro.property.slice(0, 40)}" não é permitido`
            : mensagem),
      );
    }
    for (const filho of erro.children ?? []) {
      const rotulo = ROTULOS_LISTA[erro.property];
      const indice = /^\d+$/.test(filho.property) ? Number(filho.property) : null;
      visitar(filho, rotulo && indice !== null ? `${prefixo}${rotulo} ${indice + 1}: ` : prefixo);
    }
  };
  erros.forEach((e) => visitar(e, ''));
  return [...new Set(mensagens)];
}

/** Converte e valida um objeto qualquer contra o DTO. Lança 400 com a lista de mensagens. */
export async function validarDados<T extends object>(
  classe: new () => T,
  valor: unknown,
): Promise<T> {
  if (!ehObjeto(valor)) throw new BadRequestException([MENSAGENS_ENTRADA.dadosAusentes]);
  const instancia = plainToInstance(classe, valor);
  const erros = await validate(instancia, {
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: false,
  });
  if (erros.length) throw new BadRequestException(mensagensDeValidacao(erros));
  return instancia;
}
