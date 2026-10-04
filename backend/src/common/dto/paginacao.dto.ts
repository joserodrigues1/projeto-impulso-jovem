import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginacaoDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite: number = 12;
}

export interface Paginado<T> {
  dados: T[];
  meta: { total: number; pagina: number; limite: number; totalPaginas: number };
}

export function skipTake(p: PaginacaoDto) {
  return { skip: (p.pagina - 1) * p.limite, take: p.limite };
}

export function paginar<T>(dados: T[], total: number, p: PaginacaoDto): Paginado<T> {
  return {
    dados,
    meta: {
      total,
      pagina: p.pagina,
      limite: p.limite,
      totalPaginas: Math.max(1, Math.ceil(total / p.limite)),
    },
  };
}
