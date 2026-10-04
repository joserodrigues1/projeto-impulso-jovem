/** Gera um slug a partir de um texto (remove acentos e caracteres especiais). */
export function slugify(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140);
}

/** Remove chaves com valor undefined (útil para updates parciais). */
export function semUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

export function inicioDoDia(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function diasAtras(n: number): Date {
  const d = inicioDoDia(new Date());
  d.setDate(d.getDate() - n);
  return d;
}

export function mesesAtras(n: number): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() - n);
  return d;
}

export function chaveMes(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Agrupa datas por mês (YYYY-MM) nos últimos N meses, preenchendo meses vazios com 0. */
export function serieMensal(datas: Date[], meses: number): { mes: string; total: number }[] {
  const mapa = new Map<string, number>();
  for (let i = meses - 1; i >= 0; i--) mapa.set(chaveMes(mesesAtras(i)), 0);
  for (const d of datas) {
    const k = chaveMes(d);
    if (mapa.has(k)) mapa.set(k, (mapa.get(k) ?? 0) + 1);
  }
  return [...mapa.entries()].map(([mes, total]) => ({ mes, total }));
}

/** Agrupa datas por dia (YYYY-MM-DD) nos últimos N dias. */
export function serieDiaria(datas: Date[], dias: number): { dia: string; total: number }[] {
  const mapa = new Map<string, number>();
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  for (let i = dias - 1; i >= 0; i--) mapa.set(fmt(diasAtras(i)), 0);
  for (const d of datas) {
    const k = fmt(d);
    if (mapa.has(k)) mapa.set(k, (mapa.get(k) ?? 0) + 1);
  }
  return [...mapa.entries()].map(([dia, total]) => ({ dia, total }));
}

export function contarPor<T, K extends string>(itens: T[], chave: (i: T) => K): Record<K, number> {
  return itens.reduce(
    (acc, i) => {
      const k = chave(i);
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    },
    {} as Record<K, number>,
  );
}
