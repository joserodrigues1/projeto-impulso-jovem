/**
 * Prepara uma URL para o log sem dados pessoais: remove a query string e mascara
 * sequências longas de dígitos (ex.: o telefone em `/webhooks/whatsapp/usuario/5561999999999`).
 */
export function mascararUrl(url: string | undefined): string {
  if (!url) return '';
  const semQuery = url.split('?')[0];
  return semQuery.replace(/\d{8,}/g, '***');
}
