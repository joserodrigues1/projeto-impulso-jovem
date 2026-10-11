import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

interface ColunaRodape {
  titulo: string;
  links: Array<{ href: string; rotulo: string }>;
}

// As âncoras começam com "/" para funcionarem também fora da landing (termos, privacidade)
const COLUNAS: ColunaRodape[] = [
  {
    titulo: "Guia",
    links: [
      { href: "/#jornada", rotulo: "IA no processo seletivo" },
      { href: "/#anatomia", rotulo: "Monte um bom prompt" },
      { href: "/#prompts", rotulo: "Prompts prontos" },
      { href: "/#estudar", rotulo: "Estudar com IA" },
      { href: "/#cuidados", rotulo: "Cuidados ao usar IA" },
    ],
  },
  {
    titulo: "Plataforma",
    links: [
      { href: "/#plataforma", rotulo: "Como funciona" },
      { href: "/#duvidas", rotulo: "Perguntas frequentes" },
      { href: "/login", rotulo: "Entrar" },
      { href: "/registro", rotulo: "Criar conta" },
    ],
  },
  {
    titulo: "Legal",
    links: [
      { href: "/termos", rotulo: "Termos de uso" },
      { href: "/privacidade", rotulo: "Política de privacidade" },
    ],
  },
];

const classeLink = cn(
  "inline-flex min-h-8 items-center rounded-md text-sm text-muted-foreground transition-colors",
  "hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none",
);

/** Rodapé das páginas públicas: colunas Guia / Plataforma / Legal e a marca em tamanho grande ao fundo. */
export function RodapePublico() {
  const ano = new Date().getFullYear();

  return (
    <footer className="relative isolate mt-auto overflow-hidden border-t border-border bg-background">
      {/* Linha de luz no topo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-marca/50 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-80 w-[48rem] max-w-full -translate-x-1/2 rounded-full bg-marca/10 blur-[100px] dark:bg-marca/15"
      />

      <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 md:pt-20">
        <div className="grid gap-12 md:grid-cols-12 md:gap-8">
          <div className="max-w-sm md:col-span-5">
            <Logo tamanho="sm" className="focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none" />
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Um guia gratuito para usar a IA a seu favor no processo seletivo — e uma plataforma para treinar até a
              entrevista de verdade.
            </p>
            <p className="mt-5 inline-flex items-start gap-2 rounded-2xl border border-border bg-card/60 px-3 py-1.5 text-xs leading-relaxed font-medium text-muted-foreground min-[420px]:items-center min-[420px]:rounded-full">
              <span
                aria-hidden="true"
                className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-lima ring-2 ring-lima/30 min-[420px]:mt-0"
              />
              Para jovens de 14 a 24 anos em busca do primeiro emprego
            </p>
          </div>

          <nav aria-label="Rodapé" className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 md:col-span-7">
            {COLUNAS.map((coluna) => (
              <div key={coluna.titulo}>
                <h2 className="font-sans text-xs font-semibold tracking-[0.14em] text-foreground uppercase">
                  {coluna.titulo}
                </h2>
                <ul className="mt-4 space-y-1.5">
                  {coluna.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className={classeLink}>
                        {link.rotulo}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {ano} Impulso Jovem.</p>
          <p>A IA ajuda — quem conquista a vaga é você.</p>
        </div>
      </div>

      {/* Marca gigante ao fundo, só decorativa */}
      <div
        aria-hidden="true"
        className="pointer-events-none -mt-2 select-none [mask-image:linear-gradient(to_bottom,black_20%,transparent_95%)] sm:-mt-8 md:-mt-14"
      >
        <p
          className={cn(
            "translate-y-[14%] text-center font-display leading-[0.8] font-extrabold tracking-[-0.05em] whitespace-nowrap",
            "text-[clamp(3rem,15.5vw,14rem)] text-transparent",
            // Degradê da marca bem apagado — só textura, nunca compete com o conteúdo
            "bg-gradient-to-r from-marca/[0.2] via-ciano/[0.16] to-lima/[0.22] bg-clip-text",
            "dark:from-marca-clara/[0.14] dark:via-ciano/[0.1] dark:to-lima/[0.1]",
          )}
        >
          Impulso Jovem
        </p>
      </div>
    </footer>
  );
}
