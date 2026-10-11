# Design — Impulso Jovem

Guia do sistema visual e da experiência. Vale para a landing e para o painel.
Código-fonte das peças: `frontend/src/app/globals.css`, `frontend/src/components/movimento/`, `frontend/src/components/landing/`.

## 1. Conceito

**"Impulso"**: energia de quem está começando, com a seriedade de um processo seletivo de verdade.
A landing é, antes de tudo, um **guia gratuito de IA para o processo seletivo** — o conteúdo vale por si só.
A plataforma (currículo com IA, simulação de entrevista no WhatsApp, relatório) aparece depois, como o próximo
passo natural: *do estudo à prática*.

Referências de linguagem visual: interfaces de produto modernas (fundos escuros profundos com luz em degradê,
grades "bento", cartões com holofote, tipografia de display expressiva, movimento discreto e com propósito).

## 2. Cores

Tokens em OKLCH no `globals.css` (claro em `:root`, escuro em `.dark`). Use sempre as classes do Tailwind
geradas pelos tokens — nunca cores soltas como `indigo-600`/`zinc-900` em código novo.

| Token | Classe | Uso |
|---|---|---|
| `--marca` violeta elétrico | `bg-marca`, `text-primary` | Ação principal, links, destaques. Texto branco por cima ≥ 4,5:1 |
| `--marca-forte` | `bg-marca-forte`, `text-marca-forte` | Hover de botões, texto da marca sobre fundo claro |
| `--marca-clara` | `text-marca-clara` | Texto da marca sobre fundo escuro |
| `--marca-suave` | `bg-marca-suave` | Fundos de destaque leves (tema claro) |
| `--ciano` | `text-ciano`, `from-ciano` | Segunda cor dos degradês, detalhes |
| `--lima` | `bg-lima` (texto escuro por cima), `text-lima` (só sobre fundo escuro) | Faíscas de destaque: badges, "copiado", indicadores. Pouco e com intenção |
| `--tinta`, `--tinta-2`, `--tinta-3` | `bg-tinta`… | Fundo escuro da marca (quase preto violeta). Faixas sempre escuras (abertura e chamada final) |
| neutros (`background`, `card`, `muted`, `border`…) | `bg-background`, `bg-card`, `text-muted-foreground`… | Todo o resto |

Utilitários: `texto-gradiente` (título sobre fundo escuro), `texto-gradiente-claro` (sobre fundo claro),
`fundo-grade`, `vidro` (superfícies flutuantes), `.granulado` (textura), `.holofote` (brilho que segue o cursor),
`.borda-gradiente`.

O modelo do **currículo** (azul-marinho e azul-claro, A4) é um design à parte e **não** muda com o tema do site.

## 3. Tipografia

- **Títulos**: Bricolage Grotesque (`font-display`, já aplicada a h1–h3), pesos 600–800, `tracking-tight`,
  entrelinha curta (1.0–1.1). Títulos grandes: `text-5xl`–`text-7xl` na abertura, `text-4xl`/`text-5xl` nas seções.
- **Texto**: Geist (`font-sans`), 16–18 px, `leading-relaxed`, largura de leitura de 60–75 caracteres.
- **Prompts e código**: Geist Mono (`font-mono`).
- `text-wrap: balance` nos títulos e `pretty` nos parágrafos (já no CSS base).

## 4. Movimento

Princípios: **rápido para entrar, suave para assentar** (curva `CURVA_IMPULSO`), 0,4–0,8 s; cada animação
precisa explicar algo (sequência, relação, estado) — nada de enfeite que atrapalha a leitura.

- Respeito total a "reduzir movimento": `ProvedorMovimento` (motion `reducedMotion="user"`) e regra global no CSS.
- Sem sequestro de rolagem, sem conteúdo que só aparece com animação longa, sem layout que pula.
- Componentes (`@/components/movimento`): `Revelar` (aparece ao entrar na tela), `RevelarGrupo` + `RevelarItem`
  (sequência), `CartaoHolofote`, `FundoAurora`, `FaixaRolante` (marquee), `TextoDigitado`.
- Animações CSS prontas: `animate-aurora`, `animate-faixa`, `animate-brilho`, `animate-flutuar`, `animate-cursor`,
  `animate-pulso-suave`.
- Biblioteca: `motion` (import de `motion/react`, só em componentes `"use client"`). Para trocas de lista use
  `layout` + `AnimatePresence`; para abas, um indicador com `layoutId`.

## 5. Componentes e padrões

- Cabeçalho de seção: `TituloSecao` (sobretítulo em pílula com ponto lima + título display + descrição).
- Copiar texto: `BotaoCopiar` (confirma visualmente e para leitor de tela).
- Cartões: `rounded-3xl`, borda `border-border`, fundo `bg-card`, sombra leve; em destaque, `.holofote` e/ou
  `.borda-gradiente`.
- Botões: pílula (`rounded-full`), primário `bg-marca` com `hover:bg-marca-forte`; secundário com borda.
  Altura mínima de 44 px para toque.
- Espaçamento das seções: `py-24 md:py-32`, contêiner `max-w-7xl px-4 sm:px-6`.
- Ícones: `lucide-react`, `aria-hidden`.

## 6. Acessibilidade e desempenho (inegociáveis)

- Contraste AA (4,5:1 texto normal) nos dois temas; foco visível; navegação por teclado em tudo que é interativo;
  `aria-*` corretos em abas, acordeões e menus; textos alternativos nos gráficos/mocks (ou `aria-hidden` se forem
  só ilustração e a informação estiver no texto).
- A landing é um Server Component; interatividade em ilhas `"use client"` pequenas. Sem imagens pesadas: mocks
  e ilustrações em HTML/CSS/SVG. Sem novas dependências além de `motion`.
- Todo o texto em português do Brasil, linguagem de jovem para jovem, direta e acolhedora. **Nada de números ou
  depoimentos inventados** (sem "+10 mil jovens", sem empresas parceiras fictícias).

## 7. Landing — roteiro das seções

| # | Seção (`components/landing/`) | id | Conteúdo |
|---|---|---|---|
| 1 | `secao-abertura` | — | Faixa sempre escura (`bg-tinta` + `FundoAurora`). Promessa: usar a IA a seu favor no primeiro emprego. CTA "Começar o guia" (#jornada) e "Criar conta". Demonstração animada de um prompt sendo digitado e a resposta da IA. Faixa rolante de exemplos de pedidos |
| 2 | `secao-jornada` | `jornada` | Como a IA ajuda em cada etapa do processo seletivo (6 etapas: entender a vaga e a empresa → currículo sob medida → mensagem de candidatura → testes e provas → entrevista → depois da entrevista). Para cada uma: o que a IA faz, prompt pronto para copiar e um cuidado |
| 3 | `secao-anatomia-prompt` | `anatomia` | "Monte um prompt que funciona": ingredientes (papel, contexto, tarefa, formato, tom/limites) ligáveis, prévia montando o prompt com cores por ingrediente, medidor de qualidade, modelos prontos e comparação antes × depois |
| 4 | `secao-biblioteca-prompts` | `prompts` | Biblioteca de prompts por categoria (currículo, entrevista, estudos, comunicação, carreira, inglês) com filtro, busca e copiar; `[colchetes]` marcam o que trocar |
| 5 | `secao-estudar` | `estudar` | IA como professora particular: técnicas de estudo (explicar de outro jeito, me testar, flashcards, plano de estudos, corrigir redação, praticar inglês, método Feynman) em grade bento |
| 6 | `secao-cuidados` | `cuidados` | Usar com responsabilidade: a IA erra, não inventar experiências, proteger dados pessoais, manter a própria voz, regras de provas/entrevistas ao vivo |
| 7 | `secao-plataforma` | `plataforma` | "Do estudo à prática": currículo com IA (fala ou digita → IA organiza → PDF), simulação no WhatsApp com a Helena, relatório com nota e plano — com demonstrações animadas em HTML/CSS |
| 8 | `secao-perguntas` | `duvidas` | Perguntas frequentes (acordeão acessível) + dados estruturados FAQ (JSON-LD) |
| 9 | `secao-chamada-final` | — | Faixa escura com chamada para criar conta e voltar ao guia |

Cabeçalho (`cabecalho-publico`): pílula flutuante de vidro, seção ativa destacada, barra de progresso de leitura,
menu móvel animado. Rodapé (`rodape-publico`): colunas Guia / Plataforma / Legal.

## 8. Painel e telas de conta

Mesma identidade, mais sóbria: fundo `bg-background`, cartões `bg-card`, títulos em `font-display`, cor da marca
só onde há ação ou destaque. Entradas de página com `Revelar` curto (0,3–0,5 s), micro-interações nos botões e
cartões. As funcionalidades e os contratos com a API não mudam.

## 9. Ideias para as próximas versões

Ver a seção "Sugestões" no README.
