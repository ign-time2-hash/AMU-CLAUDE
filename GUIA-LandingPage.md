# Prompts — Landing / Login AMU

Esta pasta contém prompts em Markdown para **recriar a tela de entrada (landing/login) do sistema AMU** e suas interações. Cada arquivo é independente e pode ser colado em uma ferramenta de IA de design/código (v0, Lovable, Claude, Figma Make, Cursor, etc.).

## Conteúdo

| Arquivo | O que é |
|---|---|
| `01-landing-page.md` | Prompt principal: estrutura, layout, cores e tipografia da tela completa. |
| `02-interacao-tabs-planejador-cliente.md` | Interação + animação fluida na troca entre as abas **Planejador** e **Cliente**. |
| `03-interacao-botao-entrar.md` | Interação + animação do botão **Entrar** (estados de hover, clique e loading). |
| `tokens.md` | Referência rápida de cores, fonte e medidas usadas em todos os prompts. |

## Ordem de uso sugerida
1. Comece pelo `01-landing-page.md` para gerar a tela.
2. Aplique `02-...` e `03-...` por cima, para adicionar as interações.
3. Consulte `tokens.md` sempre que precisar dos valores exatos.

> Observação: embora seja chamada de "landing page", funcionalmente é a **tela de login / porta de entrada** do sistema, com seleção de perfil (Planejador ou Cliente).
# Prompt — Landing / Login AMU (tela principal)

> Cole este prompt em uma ferramenta de IA de design/código para gerar a tela. Ele descreve a **porta de entrada do sistema AMU** (Agenda de Manutenção Unificada): um fundo verde com o logotipo em relevo à esquerda e um **card de login translúcido** à direita, com seleção de perfil (Planejador/Cliente).

---

## Prompt principal (cole isto)

Crie uma **tela de login full-screen (desktop, 1280×873)** para o sistema **AMU — Agenda de Manutenção Unificada**. A tela é dividida visualmente em **duas metades**: à esquerda, a marca em destaque sobre um fundo verde; à direita, um **card de autenticação**. A estética é **natural, corporativa e sofisticada**, com fonte **K2D** em toda a interface.

### Fundo
- Um **gradiente verde diagonal** que vai de um **verde-oliva escuro** (canto superior esquerdo) para um **verde-sálvia mais claro e luminoso** (canto inferior direito). Sensação de superfície orgânica e suave, sem texturas chamativas.

### Lado esquerdo — marca em relevo
- O logotipo **"AMU"** aparece **gigante**, ocupando boa parte da metade esquerda, com efeito de **baixo-relevo / letterpress** (a tipografia é "esculpida" no fundo verde, usando uma sombra interna escura + um leve realce claro nas bordas, na mesma cor do fundo). É um elemento decorativo, não um texto comum.
- A letra **"A"** contém o **símbolo da marca**: a silhueta de uma pessoa dentro de uma forma hexagonal.
- Abaixo do logotipo, o slogan **"AGENDA DE MANUTENÇÃO UNIFICADA"** em maiúsculas, verde um tom mais escuro que o fundo, com **espaçamento entre letras (tracking)** e peso médio/bold.

### Lado direito — card de login
Um **card translúcido (efeito "frosted glass")** centralizado verticalmente, com **fundo branco-esverdeado semitransparente**, **cantos bem arredondados (~24px)**, **leve desfoque de fundo (backdrop-blur)** e **sombra suave**. Largura aproximada de 400px. Dentro dele, de cima para baixo:

1. **Seletor de perfil (abas):** um **segmented control** com dois botões lado a lado dentro de um trilho de fundo claro arredondado:
    - **"PLANEJADOR"** — aba **ativa**: preenchimento verde `#6AA151`, texto branco, cantos arredondados, leve sombra.
    - **"CLIENTE"** — aba **inativa**: fundo transparente, texto verde-escuro `#40493C`.
    - Texto em maiúsculas, ~14px, peso bold.

2. **Campo Usuário:**
    - Label **"USUÁRIO"** (12px, bold, maiúsculas, `#40493C`, com tracking).
    - Input com **ícone de pessoa** à esquerda, placeholder **"seu usuário"** (cinza `#828F7C`), fundo branco/levemente acinzentado, borda fina sálvia `#C2C9B9`, cantos arredondados (~8px).

3. **Checkbox "LEMBRAR USUÁRIO":** uma caixa de seleção pequena (desmarcada) seguida do texto em maiúsculas (12px, `#40493C`).

4. **Campo Senha:**
    - Label **"SENHA"** (mesmo estilo do "USUÁRIO").
    - Input com **ícone de olho** à esquerda (alternar visibilidade da senha), placeholder **"sua senha"**, mesmo estilo visual do campo de usuário.

5. **Botão "Entrar":** botão de **largura total**, preenchimento verde `#6AA151`, texto branco "Entrar" centralizado (~16px, bold) seguido de um **ícone de seta para a direita (→)**, cantos arredondados (~8px).

6. **Rodapé do card:** texto pequeno **"© 2026 AMU Sistemas"** alinhado à direita, cinza `#828F7C`.

### Comportamento geral
- Card **verticalmente centralizado** e posicionado na metade direita da tela.
- Tudo em **português do Brasil**.
- Pensado para **desktop**; em telas menores, o logotipo em relevo pode reduzir/ocultar e o card ocupar a largura central.

---

## Tokens rápidos
- **Fonte:** K2D (Bold, SemiBold, Medium).
- **Verde primário:** `#6AA151` · **Texto escuro:** `#40493C` · **Texto secundário:** `#828F7C` · **Borda sálvia:** `#C2C9B9`.
- **Raio:** card ~24px · inputs/botões ~8px · abas ~10–12px.
- Veja `tokens.md` para a lista completa.

> Para as animações de troca de aba e do botão Entrar, use os prompts `02-interacao-tabs-planejador-cliente.md` e `03-interacao-botao-entrar.md`.
# Prompt — Interação das abas "Planejador" / "Cliente" (com animação fluida)

> Adicione esta interação ao seletor de perfil do card de login. O objetivo é uma **troca suave e fluida** entre os dois modos, com um indicador deslizante.

---

## Prompt (cole isto)

No card de login, transforme o seletor de perfil **"PLANEJADOR" / "CLIENTE"** em um **toggle de abas animado**, com a seguinte interação e animação:

### Comportamento
- Só **uma aba fica ativa por vez**. Ao clicar na aba inativa, ela passa a ser a ativa e a outra volta ao estado inativo.
- A aba **ativa** tem preenchimento verde `#6AA151` e texto branco; a **inativa** tem fundo transparente e texto verde-escuro `#40493C`.
- Trocar de aba **atualiza o conteúdo do formulário** conforme o perfil (ex.: o modo Cliente pode mostrar campos/labels diferentes, como "CPF / E-mail" no lugar de "USUÁRIO", ou um texto auxiliar distinto). Mantenha a estrutura, mude apenas o que for pertinente ao perfil.

### Animação — indicador deslizante (estilo "pill")
- Em vez de simplesmente trocar a cor de fundo das abas, use um **"pílula" verde que desliza** horizontalmente de uma aba para a outra, posicionada atrás do texto.
- Ao clicar, a pílula **desliza** da posição atual para a nova: duração **~280–320ms**, easing **`cubic-bezier(0.22, 1, 0.36, 1)`** (efeito suave com leve "assentar" no fim).
- A **cor do texto** de cada aba faz uma transição suave (~200ms) entre branco (ativa) e verde-escuro (inativa), acompanhando a pílula.

### Animação — troca do conteúdo do formulário
- Quando o conteúdo do formulário muda entre Planejador e Cliente, faça uma **transição cross-fade com leve deslocamento horizontal**:
    - Conteúdo que sai: fade-out + `translateX` de ~8px (na direção oposta à aba escolhida), ~150ms.
    - Conteúdo que entra: fade-in + `translateX` de ~8px → 0, ~220ms, ease-out.
- A altura do card deve **animar suavemente** caso o conteúdo dos dois perfis tenha alturas diferentes (transição de `height`/`max-height` ~250ms), para não haver "pulo".

### Acessibilidade
- O toggle deve ser navegável por teclado (Tab/Setas) e ter `aria-selected` na aba ativa.
- Respeite **`prefers-reduced-motion`**: se ativo, troque o deslize e o cross-fade por uma **mudança instantânea ou um fade simples**.

### Implementação sugerida (adaptável)
- **React + Framer Motion:** use um `motion.div` como pílula com `layout` e `layoutId="tab-pill"` (anima a posição automaticamente entre as abas); envolva o conteúdo do formulário em `<AnimatePresence mode="wait">` com `initial/animate/exit` para o cross-fade.
- **CSS puro:** posicione a pílula com `transform: translateX(...)` e anime via `transition: transform 300ms cubic-bezier(0.22,1,0.36,1)`; alterne uma classe `.is-active` por aba.
# Prompt — Interação e animação do botão "Entrar"

> Adicione microinterações e uma animação fluida ao botão **"Entrar"** do card de login, cobrindo hover, clique e o estado de carregamento.

---

## Prompt (cole isto)

Dê ao botão **"Entrar"** (verde `#6AA151`, largura total, texto branco + seta →) um conjunto de **microinterações fluidas** para os estados a seguir. Todas as transições devem ser suaves e respeitar `prefers-reduced-motion`.

### 1. Hover (passar o mouse)
- O fundo escurece levemente (ex.: para um verde um tom mais escuro, `#5C8F47`) e o botão **eleva-se sutilmente** (`translateY(-1px)`) com uma **sombra suave** aparecendo embaixo.
- A **seta "→" desliza ~4px para a direita** (`translateX`), dando sensação de avanço.
- Duração ~180ms, ease-out.

### 2. Active / clique (pressionar)
- O botão **afunda** levemente: `scale(0.98)` + `translateY(0)`, removendo a sombra, por ~120ms — feedback tátil de "press".

### 3. Loading (após clicar, enquanto autentica)
- Ao clicar, o botão entra em **estado de carregamento**:
    - O texto "Entrar →" faz **fade-out** e é substituído por um **spinner circular** girando (borda branca, ~18px), centralizado, com **cross-fade** suave (~200ms).
    - O botão fica **desabilitado** e levemente menos vibrante (ex.: opacidade ~0.9) para indicar que a ação está em andamento.
    - Opcional: o botão pode **encolher para um formato mais quadrado/circular** durante o loading (animação de `width`/`border-radius`, ~250ms) e voltar ao normal ao terminar — um efeito "morph" elegante.

### 4. Sucesso (opcional)
- Ao autenticar com sucesso, o spinner pode dar lugar a um **ícone de check (✓)** com um leve "pop" (`scale` 0.6 → 1, ~250ms, ease-out) antes de redirecionar.

### 5. Erro (opcional)
- Em caso de credenciais inválidas, o botão (ou o card) faz um **"shake" horizontal** curto (`translateX` ±6px, 3 oscilações, ~300ms) e volta ao estado normal, sinalizando a falha sem trocar de tela.

### Acessibilidade
- Manter `aria-busy="true"` durante o loading e desabilitar cliques repetidos.
- Com **`prefers-reduced-motion`**, substituir morph/shake/slide por mudanças instantâneas ou um fade simples; manter apenas o feedback essencial (texto → spinner).

### Implementação sugerida (adaptável)
- **CSS:** usar `transition` em `transform`, `background-color` e `box-shadow`; spinner via `@keyframes spin`; shake via `@keyframes shake`.
- **React + Framer Motion:** controlar os estados `idle | loading | success | error`; usar `whileHover`, `whileTap` no botão e `AnimatePresence` para alternar entre texto, spinner e check; aplicar `animate` com keyframes para o shake no erro.
# Tokens de design — Landing / Login AMU

Referência rápida de valores usados nos prompts. Mesmo design system das demais telas do AMU.

## Cores
| Uso | Valor |
|---|---|
| Verde primário (botões, aba ativa) | `#6AA151` |
| Verde primário — hover (sugestão) | `#5C8F47` |
| Texto principal (escuro) | `#40493C` |
| Texto secundário / placeholder | `#828F7C` |
| Borda dos inputs (sálvia) | `#C2C9B9` |
| Card de login (frosted) | branco semitransparente, ex.: `rgba(255,255,255,0.82)` + `backdrop-filter: blur(...)` |
| Trilho do toggle de abas | claro/translúcido, ex.: `rgba(255,255,255,0.6)` |
| Fundo da tela | **gradiente diagonal** verde-oliva escuro → verde-sálvia claro |

> Sugestão de gradiente de fundo (ajuste a gosto):
> `linear-gradient(135deg, #4E6B3D 0%, #6E8C57 45%, #A8BD92 100%)`

## Tipografia — fonte **K2D**
| Elemento | Tamanho / peso |
|---|---|
| Logotipo "AMU" (relevo) | display, gigante, Bold |
| Slogan "AGENDA DE MANUTENÇÃO UNIFICADA" | ~16–18px, Medium/Bold, maiúsculas, com tracking |
| Abas (PLANEJADOR/CLIENTE) | ~14px, Bold, maiúsculas |
| Labels (USUÁRIO/SENHA) | ~12px, Bold, maiúsculas, com tracking |
| Placeholders / textos auxiliares | ~14px, Medium |
| Botão "Entrar" | ~16px, Bold |
| Rodapé "© 2026 AMU Sistemas" | ~12px, Medium |

## Forma e espaçamento
- Raio: **card ~24px** · inputs/botão ~8px · abas ~10–12px · badges/checkbox ~4px.
- Card: largura ~400px, padding interno generoso (~28–32px), sombra suave.
- Efeito **frosted glass** no card (fundo translúcido + blur + borda clara sutil).
- Logotipo em **baixo-relevo (letterpress)**: sombra interna escura + realce claro, na cor do fundo.

## Idioma e dados de exemplo
- UI em **português do Brasil**.
- Perfis: **Planejador** (padrão/ativo) e **Cliente**.
- Placeholders: "seu usuário", "sua senha". Rodapé: "© 2026 AMU Sistemas".![logoamu3.svg](../../Downloads/logoamu3.svg)