# Prompt — Interface "Agenda" (Sistema AMU)

> Use este prompt para recriar a tela. Cole-o em uma ferramenta de IA de design/código (v0, Claude, Lovable, Figma Make, etc.). Ele descreve **um único dashboard de gestão de manutenção de laboratórios**, com sidebar fixa, top bar, calendário semanal e card de evento.
 
---

## Prompt principal (cole isto)

Crie uma tela de **dashboard web (desktop, 1280×876)** chamada **Agenda**, de um sistema de gestão de manutenção de laboratórios chamado **AMU**. Layout em três regiões fixas — top bar superior, sidebar à esquerda e área de conteúdo à direita — com um botão flutuante (FAB) no canto inferior direito.

A estética é **clean, corporativa e "natural/verde"**: fundo quase branco, muito espaço em branco, cantos levemente arredondados, sombras sutis e a fonte **K2D** em toda a interface. A cor de destaque é um **verde sálvia (#6AA151)**; os textos usam um **verde-acinzentado escuro (#40493C)** e um **cinza-esverdeado (#828F7C)** para informações secundárias.

### 1. Top bar (altura 65px, fundo branco, borda inferior verde-clara `rgba(199,218,191,0.87)`)
- À esquerda: logotipo **"AMU"** (verde, ~115×36px).
- À direita, alinhados: um botão de texto **"Teams"** com ícone, e um botão pílula verde **"+ Novo evento"** (`#6AA151`, raio 12px, texto branco K2D, com leve sombra interna que dá relevo).
### 2. Sidebar esquerda (largura 250px, fundo branco, borda direita verde-clara)
- **Topo — perfil do usuário:** avatar quadrado arredondado de 64px (fundo cinza `#E9E9E9`, ícone de pessoa), nome **"Carlos Silva"** (20px, SemiBold) e cargo **"Técnico de Manutenção"** (12px, Medium, cinza `#828F7C`).
- **Menu de navegação** (links com ícone + label, 12px Medium, altura 44px, raio 8px):
  1. **Agenda** — item **ativo**: fundo verde `#6AA151`, texto e ícone brancos.
  2. **Laboratórios**
  3. **Inventário**
  4. **Reagendamento** com icone ![ICONE REAGENDAMENTO.svg](../../Downloads/ICONE%20REAGENDAMENTO.svg)
  5. **Configurações**
     Os itens inativos têm fundo transparente e texto `#40493C`.
- **Rodapé da sidebar** (separado por uma linha fina no topo): **Ajuda** e **Sair**, no mesmo estilo dos links.
### 3. Área de conteúdo (à direita da sidebar, padding 32px, espaçamento vertical de 32px entre blocos)

**a) Cabeçalho da seção:**
- Título **"Lab 1"** em 30px Bold `#40493C`.
- Abaixo, na mesma linha: uma **tag de status** "● OPERACIONAL" (texto 10px Bold verde `#6AA151`, maiúsculas, espaçamento entre letras, com bolinha verde, fundo verde 10% e borda verde 30%, raio 4px) e o texto **"Última inspeção: seg., 01 de jun."** (14px, cinza `#828F7C`).
- À direita do cabeçalho, uma **barra de controles** (fundo `#F4F3F3`, raio 12px, leve sombra), contendo, da esquerda p/ direita:
  - **Dropdown "Lab 1 ▾"** (botão branco, raio 12px).
  - **Toggle "Mês / Semana"** — segmento com "Semana" **selecionado** (fundo verde `#6AA151`, texto branco) e "Mês" não selecionado (texto `#40493C`).
  - **Navegador de mês:** seta `‹`, label **"JUNHO DE 2026"** (16px Bold, maiúsculas) e seta `›`, ambas as setas em botões circulares de 32px com borda fina.
    **b) Calendário semanal** (card branco, borda `#C2C9B9`, raio 4px, sombra sutil):
- **Cabeçalho dos dias:** linha com fundo levemente acinzentado e borda inferior, 7 colunas iguais: **SEG, TER, QUA, QUI, SEX, SÁB, DOM** (12px Bold, cinza `#828F7C`, maiúsculas, centralizado, com tracking).
- **Grade:** 7 colunas × 1 linha de 120px de altura, células com bordas finas `rgba(194,201,185,0.2)`. Números dos dias **1 a 7** no canto superior esquerdo de cada célula (12px Bold).
  - **Dia 1 — destacado:** fundo verde 5% e contorno verde sutil; o número "1" fica dentro de um **selo quadrado verde** (`#6AA151`, texto branco); há uma **bolinha vermelha** (`#BA1A1A`) no canto indicando alerta; e um **chip de evento** (fundo branco, **borda esquerda verde de 4px**, raio 4px, leve sombra) com o texto **"Lab 1 - Manutenção Corretiva..."** (10px Bold `#40493C`) e o horário **"14:00 - 16:00"** (9px, cinza).
  - **Dia 2:** um **chip esmaecido** (opacidade ~60%, fundo cinza `#EEE`, borda esquerda cinza de 2px) com o texto **"Preventiva de..."**.
  - **Dias 3 a 7:** vazios (apenas o número).
    **c) Seção "Próximo evento":**
- Um **título centralizado entre duas linhas divisórias** finas: **"PRÓXIMO EVENTO"** (14px Bold `#40493C`, maiúsculas, com tracking).
- **Card de evento** (fundo branco, borda `#C2C9B9`, raio 4px, padding 25px) com uma **barra vermelha vertical de 6px** (`#BA1A1A`) na borda esquerda, contendo:
  - **Título:** "Lab 1 - Manutenção corretiva em Espectrômetro de massa" (20px Bold `#40493C`).
  - **Subtítulo entre aspas:** "Equipamento mostra falha no monitor" (14px, cinza `#828F7C`).
  - **Três badges** à direita do título: **"ALTA"** (texto e borda vermelhos `#B91C1C`, fundo vermelho-claro `#FEE2E2`), **"CORRETIVA"** (contorno e texto verdes `#6AA151`, fundo transparente) e **"REMARCADO"** (texto branco, fundo verde-acinzentado escuro semitransparente, borda `#40493C`). Todos com raio 2px e texto em maiúsculas.
  - Abaixo, separado por uma linha fina: ícone de relógio/recarga + **"Nova data: 01/06/2026, 14:00 até 16:00"** em verde forte `#15803D`, Bold.
  - No rodapé do card: um **botão com contorno** "✎ EDITAR CHAMADO" (borda `#C2C9B9`, texto 12px Bold `#40493C` maiúsculas, raio 4px).
### 4. Botão flutuante (FAB)
- No canto inferior direito: **quadrado verde de 64px** (`#6AA151`, raio 4px, sombra elevada) com um **ícone "+"** branco. Ao passar o mouse, exibe um tooltip escuro **"AGENDAR MANUTENÇÃO"**.
---

## Tokens de design (referência)

### Cores
| Uso | Hex |
|---|---|
| Verde primário / destaque | `#6AA151` |
| Texto principal (escuro) | `#40493C` |
| Texto secundário / cinza | `#828F7C` |
| Borda sálvia (cards) | `#C2C9B9` |
| Bordas/separadores claros | `rgba(194,201,185,0.2–0.5)` |
| Borda da top bar / sidebar | `rgba(199,218,191,0.87)` |
| Fundo da página | `#F9F9F9` (quase branco) |
| Fundo de card | `#FFFFFF` |
| Fundo da barra de controles | `#F4F3F3` |
| Fundo do toggle | `#EEEEEE` |
| Fundo do avatar | `#E9E9E9` |
| Alerta / barra do card / bolinha | `#BA1A1A` |
| Badge ALTA (texto/borda) | `#B91C1C` · fundo `#FEE2E2` |
| Texto "Nova data" (verde forte) | `#15803D` |
| Célula do dia destacado | verde a 5% (`rgba(106,161,81,0.05)`) |

### Tipografia — fonte **K2D** (Google Fonts)
| Elemento | Tamanho / peso |
|---|---|
| Título de página ("Lab 1") | 30px · Bold |
| Título do evento | 20px · Bold |
| Nome do usuário | 20px · SemiBold |
| Label do navegador de mês | 16px · Bold (maiúsculas) |
| Botões principais ("Novo evento", "Teams") | 16px · Medium |
| Texto base / subtítulos | 14px · Medium |
| Heading de seção ("PRÓXIMO EVENTO") | 14px · Bold (maiúsculas, tracking) |
| Toggle Mês/Semana | 14px · Bold / SemiBold |
| Links da sidebar | 12px · Medium |
| Cabeçalho dos dias, números, badges | 10–12px · Bold (maiúsculas) |
| Horário no chip do calendário | 9px · Medium |

### Forma e espaçamento
- Raio dos cards/células: **4px** · Raio de botões/pílulas/inputs: **8–12px** · Badges: **2px**.
- Padding da área de conteúdo: **32px**, com **32px** entre blocos.
- Sombras suaves: `0 1px 2px rgba(0,0,0,0.05)` em cards; sombra mais elevada no FAB.
### Idioma e dados de exemplo
- Toda a UI em **português do Brasil**.
- Usuário: **Carlos Silva** — *Técnico de Manutenção*. Mês: **Junho de 2026**. Laboratório: **Lab 1**.
---

## Interação — clique no dia → painel de detalhes (com animação)

A seção **"Próximo evento"** descrita acima **não é fixa**: ela funciona como um **painel de detalhes que reage ao clique nos dias do calendário**.

### Comportamento
- Ao **clicar em um dia que tem evento** (ex.: dia 1), a célula entra em **estado selecionado** (destaque verde mais forte / contorno verde) e o **painel de detalhes aparece na parte inferior**, logo abaixo do calendário, com a estrutura completa do card: título do evento, badges de **prioridade** (ALTA), **tipo** (CORRETIVA) e **situação** (REMARCADO), a linha **"Nova data"** e o botão **"Editar chamado"** — exatamente como no card já especificado, com a barra vermelha vertical à esquerda.
- Ao **clicar em outro dia que também tem evento**, o painel **atualiza o conteúdo** para o evento daquele dia (com uma transição suave de troca de conteúdo, não some e reaparece bruscamente).
- Ao **clicar em um dia sem evento**, o painel **fica oculto** OU exibe um **estado vazio** discreto (ex.: card com texto centralizado em cinza `#828F7C`: *"Nenhum evento agendado para este dia."*). Escolha um dos dois comportamentos e mantenha-o consistente.
- Apenas **um dia** pode estar selecionado por vez. O cabeçalho da seção **"PRÓXIMO EVENTO"** pode mudar para algo como **"DETALHES DO EVENTO"** quando um dia é selecionado (opcional).
### Animação de entrada (fluida)
Quando o painel aparece, anime-o de forma suave e natural:
- **Entrada:** fade-in (`opacity` 0 → 1) combinado com um leve **slide para cima** (`translateY` de ~12–16px → 0). Duração **~280–350ms**, easing **ease-out** (ou `cubic-bezier(0.16, 1, 0.3, 1)` para um efeito mais "macio").
- **Saída / ocultar:** o inverso, um pouco mais rápido (**~180–220ms**, ease-in), com fade-out e leve slide para baixo.
- **Troca de evento** (clicar de um dia com evento para outro): faça um **cross-fade rápido** do conteúdo (~150ms) em vez de animar o container inteiro de novo, para a transição parecer contínua.
- **Estado selecionado da célula:** anime a cor de fundo/contorno do dia com `transition` de ~150ms para acompanhar o clique sem "piscar".
- Respeite **`prefers-reduced-motion`**: se o usuário preferir menos movimento, troque os slides por um fade simples (ou desligue a animação).
### Implementação sugerida (adaptável ao stack)
- Estado: guardar o **dia selecionado** (ex.: `selectedDay`) e derivar o evento correspondente; o painel renderiza condicionalmente com base nisso.
- Em **React + Framer Motion**: envolver o painel em `<AnimatePresence>` e usar `motion.div` com `initial={{ opacity: 0, y: 16 }}`, `animate={{ opacity: 1, y: 0 }}`, `exit={{ opacity: 0, y: 16 }}` e `transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}`.
- Em **CSS puro**: alternar uma classe (ex.: `.is-visible`) que controla `opacity` e `transform`, com `transition` definida no elemento; usar `@media (prefers-reduced-motion: reduce)` para simplificar.
---

## Observações de implementação (opcional)
- Sidebar e top bar **fixas**; apenas a área de conteúdo rola.
- Estados dos badges/tags são **semânticos** (prioridade ALTA = vermelho; tipo CORRETIVA = verde; situação REMARCADO = neutro escuro) — vale parametrizar por cor.
- O chip do calendário tem **borda colorida à esquerda** indicando o tipo da manutenção (verde = corretiva agendada; cinza = preventiva esmaecida/rascunho).
- Layout pensado para **desktop**; se precisar de responsividade, a sidebar pode virar um menu retrátil em telas menores.