import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { env } from '../config/env';

/**
 * Armazenamento de arquivos compatível com S3 (MinIO local, AWS S3 ou Cloudflare R2).
 * Convenção de chaves:
 *   public/usuarios/{usuarioId}/...  → leitura pública (fotos, logos)
 *   public/cursos/...                → capas de cursos
 *   private/usuarios/{usuarioId}/... → acesso apenas via URL assinada (currículos)
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket = env.S3_BUCKET;

  private readonly s3 = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT || undefined,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
  });

  /** Cliente usado só para assinar URLs com o host público (acessível pelo navegador). */
  private readonly s3Publico = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_PUBLIC_URL || env.S3_ENDPOINT || undefined,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
  });

  async enviar(chave: string, conteudo: Buffer, contentType: string): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: chave,
        Body: conteudo,
        ContentType: contentType,
      }),
    );
  }

  urlPublica(chave: string): string {
    return `${env.S3_PUBLIC_URL.replace(/\/$/, '')}/${this.bucket}/${chave}`;
  }

  /** Converte uma URL pública de volta na chave do objeto (para remoção). */
  chaveDaUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    const base = `${env.S3_PUBLIC_URL.replace(/\/$/, '')}/${this.bucket}/`;
    if (url.startsWith(base)) return url.slice(base.length);
    if (url.startsWith('private/') || url.startsWith('public/')) return url;
    return null;
  }

  async urlAssinada(chave: string, expiraSegundos = 600, nomeArquivo?: string): Promise<string> {
    return getSignedUrl(
      this.s3Publico,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: chave,
        ResponseContentDisposition: nomeArquivo
          ? `inline; filename="${nomeArquivo}"`
          : undefined,
      }),
      { expiresIn: expiraSegundos },
    );
  }

  async remover(chave: string | null | undefined): Promise<void> {
    if (!chave) return;
    try {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: chave }));
    } catch (e) {
      this.logger.warn(`Falha ao remover ${chave}: ${(e as Error).message}`);
    }
  }

  async removerPrefixo(prefixo: string): Promise<void> {
    try {
      let token: string | undefined;
      do {
        const lista = await this.s3.send(
          new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: prefixo,
            ContinuationToken: token,
          }),
        );
        const objetos = (lista.Contents ?? []).map((o) => ({ Key: o.Key! }));
        if (objetos.length) {
          await this.s3.send(
            new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: objetos } }),
          );
        }
        token = lista.IsTruncated ? lista.NextContinuationToken : undefined;
      } while (token);
    } catch (e) {
      this.logger.warn(`Falha ao remover prefixo ${prefixo}: ${(e as Error).message}`);
    }
  }
}
