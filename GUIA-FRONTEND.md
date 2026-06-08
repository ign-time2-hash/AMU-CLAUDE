# Guia de Frontend e Layout — AMU

Documento detalhado do **design system, layout, navegação, estilo do calendário e de cada tela** do frontend do AMU / Kronus. Serve para recriar a interface pixel-a-pixel em outra IA. Complementa o `GUIA-RECRIACAO.md` (que cobre stack, backend e prompts gerais).

> Idioma: pt-BR em toda a UI. **Sem emojis** na interface (apenas dentro das mensagens enviadas ao Microsoft Teams). Tipografia **Inter**. Cantos arredondados generosos (`rounded-2xl` = 1.5rem). Mobile-first.

---

## 1. Fundamentos do design system

### 1.1 Paleta (Tailwind theme estendido)

Configurada em `tailwind.config.js` (`darkMode: ["class"]`, content `./index.html` e `./src/**/*.{ts,tsx}`):

| Token | Hex | Uso |
|---|---|---|
| `border` | `#E5E7EB` | bordas de cartões, inputs, divisórias |
| `background` | `#F6F8F5` | fundo geral da aplicação (verde levíssimo) |
| `foreground` | `#1F2937` | texto principal |
| `primary.DEFAULT` | `#3F7D3A` | verde da marca (botões, ativo, foco) |
| `primary.foreground` | `#FFFFFF` | texto sobre primário |
| `card.DEFAULT` | `#FFFFFF` | fundo de cartões |
| `card.foreground` | `#1F2937` | texto em cartões |
| `muted.DEFAULT` | `#EEF2EA` | fundos suaves (hover, chips) |
| `muted.foreground` | `#4B5563` | texto secundário |

Border radius estendido: `lg` 1rem, `xl` 1.25rem, `2xl` 1.5rem. Fonte: `sans` = `["Inter","system-ui","sans-serif"]`. Plugin: `tailwindcss-animate`.

### 1.2 Cores semânticas (semáforos)

- **Prioridade (chamados/eventos)**: baixa `#22C55E` (texto branco), normal `#EAB308` (texto preto), alta `bg-red-500` (texto branco). Definidas em `PRIORITY_COLORS` no `maintenance-card.tsx`.
- **Criticidade (inventário)**: baixa = verde, normal = amarelo, alta = vermelho (badge).
- **Tipo de manutenção**: `corretiva` = `bg-red-50 text-red-700 border-red-200`; `preventiva` = `bg-blue-50 text-blue-700 border-blue-200`.
- **Status de evento**: `concluido` = verde (`bg-green-100 text-green-700`); `em_andamento` = âmbar (`bg-amber-100 text-amber-700`); demais = cinza.
- **Badges de remarcação**: pendente = amarelo (`bg-yellow-100 text-yellow-800`); aprovado/remarcado = verde; recusado = vermelho.

### 1.3 `index.css` (base)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground font-sans antialiased; }
  button:focus-visible, input:focus-visible, select:focus-visible,
  textarea:focus-visible, a:focus-visible {
    @apply outline-none ring-2 ring-primary ring-offset-2 ring-offset-background;
  }
}
```

Anel de foco verde (`ring-primary`) com offset em todos os elementos interativos.

### 1.4 Padrões visuais recorrentes

- **Cartão**: `rounded-2xl border border-border bg-card p-4` (às vezes `shadow-sm`).
- **Cabeçalho de seção**: `<h1 className="text-xl font-semibold text-foreground">` + subtítulo `text-sm text-muted-foreground`.
- **Select nativo estilizado**: `h-11 rounded-2xl border border-border bg-card px-3 text-sm`.
- **Textarea**: `min-h-[100px] rounded-2xl border border-border bg-card px-3 py-2 text-sm`.
- **Erros de formulário**: `text-sm text-red-600` por campo; bloco de erro de login: `rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700`.
- **Chips de status (ex.: OPERACIONAL)**: `rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700`.

---

## 2. Providers e bootstrap do app (`main.tsx`)

Árvore de providers (de fora para dentro):

```
StrictMode
└── QueryClientProvider (React Query)
    └── AuthProvider
        ├── App
        └── Toaster (sonner) — richColors, position="top-right"
```

`QueryClient` com `defaultOptions.queries`: `retry: false`, `refetchOnWindowFocus: false`. Renderiza no elemento `#root`.

### Autenticação (`lib/auth.tsx`)

- Contexto `AuthContext` com `{ user, isAuthenticated, login, logout }`.
- **Estado em memória** (`useState`), **sem localStorage** → reload exige novo login.
- `login()` chama `postAuthLogin`, e **no sucesso roda `queryClient.clear()`** antes de setar o usuário (evita vazamento de cache entre usuários). Em erro 401, lança `"Credenciais invalidas"`.
- `logout()` também roda `queryClient.clear()` e zera o usuário.
- `useAuth()` lança erro se usado fora do provider.

---

## 3. Layout global (`components/layout.tsx`)

Estrutura responsiva mobile-first. `AppLayout` envolve todas as telas autenticadas.

### 3.1 Header (fixo no topo)

- `sticky top-0 z-20 h-16 border-b border-border bg-background/90 backdrop-blur`.
- Container `mx-auto max-w-7xl px-4`, flex com `justify-between`.
- **Esquerda**: `AmuLogo` (link para a home do papel via `homePathByRole`).
- **Direita** (apenas planejador): botão ícone **Webhook** (link `/teams`, `variant="outline" size="icon"`) + botão **"Novo evento"** com ícone `Plus` (escondido no mobile: `hidden sm:inline-flex`, link `/event/new?returnTo=<location>`). Sempre: `AvatarButton`.
- `AvatarButton`: círculo `h-10 w-10 rounded-full border bg-card` com as **iniciais** (2 primeiras palavras do nome) ou `"AM"`; link para `/perfil`.

### 3.2 Sidebar (desktop) e Bottom nav (mobile)

- Grid principal: `mx-auto max-w-7xl grid-cols-1 gap-6 px-4 pb-24 pt-4 md:grid-cols-[220px_1fr] md:pb-6`.
- **Sidebar** (`hidden md:block`): `nav` em cartão `rounded-2xl border bg-card p-3`. Cada item é um botão: ativo = `bg-primary text-primary-foreground`; inativo = `text-foreground hover:bg-muted`; `rounded-xl px-3 py-2 text-sm` com ícone lucide à esquerda. Item ativo determinado por `location.startsWith(item.path)`.
- **Bottom nav** (`fixed bottom-0 ... md:hidden`): cartão com os mesmos itens em coluna (ícone + label `text-xs`), `min-w-[90px]`.
- **Badge** (contador) à direita do item: `rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white`. Usado no item "Reagendamento" do planejador.
- **FAB mobile** (apenas planejador): botão circular fixo `fixed bottom-20 right-4 h-14 w-14 rounded-full bg-primary text-white shadow-lg md:hidden` com `Plus`, link para novo evento.

### 3.3 Itens de navegação por papel (`getNavItems`)

Item de agenda muda por papel: `tecnico_externo` → **"Scanner"** (`/scan`, ícone `Crosshair`); demais → **"Agenda"** (`/agenda`, ícone `CalendarDays`).

- **planejador**: Agenda, **Reagendamento** (`/reschedules`, `RefreshCcw`, com badge de pendentes), **Mapas** (`/overview`, `FlaskConical`), **Inventário** (`/inventario`, `PackageSearch`), **Configurações** (`/configuracoes`, `Settings2`), **Perfil** (`/perfil`, `UserCircle2`).
- **cliente**: Agenda, Inventário, Perfil.
- **tecnico_externo**: Scanner, **Chamados** (`/chamados`, `MessageSquareWarning`), Perfil.

### 3.4 Badge de reagendamento (planejador)

`useQuery` em `/reschedule-requests?status=pendente` com `refetchInterval: 30_000` e `enabled` só para planejador. Conta os itens com `status === "pendente"`.

---

## 4. Roteamento (`App.tsx`) e proteção por papel

- Router: **wouter**. Se `!isAuthenticated` → renderiza `LoginPage` (sem layout).
- Rotas dentro de `AppLayout` com `<Switch>`. `/` redireciona para `homePathByRole(role)`.
- **Overlay de evento**: as rotas `/event/new` e `/event/:id` NÃO trocam a tela de fundo — o `App` guarda `backgroundLocationRef` (última rota não-overlay) e passa para o `<Switch location={routedLocation}>`. O `EventDialog` é renderizado por cima (modal/sheet). Assim, abrir um evento mantém a agenda visível atrás.
- **`RoleGate`** (`components/role-gate.tsx`): `allow: UserRole[]`, `fallbackTo` (default `/chamados`). Se sem usuário → redireciona `/login`; se papel não permitido → `Redirect` para `fallbackTo`.
  - `/scan`: só `tecnico_externo` (fallback `/agenda`).
  - `/overview`, `/reschedules`, `/teams`, `/configuracoes`: só `planejador`.
  - `/inventario`: `planejador` e `cliente`.
  - `/agenda`, `/chamados`, `/perfil`, `/lab/:id`: abertas (cada página adapta por papel).
- `homePathByRole`: `tecnico_externo` → `/scan`; demais → `/agenda` (`lib/roles.ts`).
- Rótulos de papel: `ROLE_LABEL` (Planejador/Cliente/Técnico externo) e `ROLE_ACCESS_LABEL` (Acesso total/restrito/de execução).

---

## 5. Componentes shadcn/ui (`components/ui`)

Base mínima sob medida (Radix + CVA + `cn`):

- **Button** (`button.tsx`): `cva` com base `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium ... focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50`. Variants: `default` (`bg-primary text-primary-foreground hover:bg-primary/90`), `outline` (`border border-border bg-card text-foreground hover:bg-muted`), `ghost` (`hover:bg-muted`), `destructive` (`bg-red-600 text-white hover:bg-red-700`). Sizes: `default` (h-10 px-4), `lg` (h-12 px-6), `icon` (h-10 w-10). Suporta `asChild` via Radix `Slot`.
- **Input** (`input.tsx`): `h-11 w-full rounded-2xl border border-border bg-card px-4 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary`.
- **Label** (`label.tsx`): label simples estilizada.
- **Skeleton** (`skeleton.tsx`): `animate-pulse rounded-2xl bg-muted`.
- **AlertDialog** (`alert-dialog.tsx`): wrapper Radix. `AlertDialogContent` = Portal + Overlay (`fixed inset-0 z-40 bg-black/40`) + Content (`fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-4 shadow-lg`). Exporta `AlertDialogTrigger/Cancel/Action/Title/Description`. Botões dentro via `asChild` com `Button`.
- `lib/utils.ts`: `cn` = `clsx` + `tailwind-merge`.

> Diálogos seguem o padrão: **Dialog no desktop / Sheet bottom no mobile**. Para confirmações destrutivas (excluir setor/lab/webhook) usa-se `AlertDialog` com botão `variant="destructive"`.

---

## 6. Tela de Login (`pages/login.tsx`)

- Fundo com gradiente: `bg-gradient-to-br from-[#E8F3E6] via-background to-background`, tela cheia.
- Centro: `max-w-md`, coluna. Logo `/logo/amu-logo-full.png` (`w-[220px]`) + legenda "Agenda de Manutenção Unificada".
- Cartão `rounded-2xl border bg-card p-8 shadow-sm` com título "Entrar" e subtítulo.
- Formulário **react-hook-form + zod** (`loginSchema`: username e password obrigatórios, mensagens pt-BR). Campos `Label` + `Input`; erros em `text-sm text-red-600`. Botão "Entrar" (`size="lg"` largura total, mostra "Entrando..." quando submetendo).
- Bloco **"Acesso de demonstração"**: 3 botões `outline` (Planejador, Cliente, Técnico externo) que preenchem usuário + senha `kronus2026` (`fillDemo`).

---

## 7. Estilo do Calendário / Agenda (`pages/agenda.tsx`)

Tela mais elaborada de estilo. Estrutura em `section space-y-4`.

### 7.1 Cartão de cabeçalho (controles)

- Cartão `rounded-2xl border bg-card p-4`, flex `justify-between` com wrap.
- **Esquerda**: `<h1>` com o nome do lab selecionado; abaixo chip verde "OPERACIONAL" + "Última inspeção: {data pt-BR}".
- **Direita** (controles, em linha):
  - **Select de laboratório** (`LAB_OPTIONS`, Lab 1..8) estilizado h-10.
  - **Alternador Mês/Semana**: dois botões dentro de um container `rounded-xl border p-1`; ativo = `variant="default"`, inativo = `variant="ghost"`, `h-8 px-3`.
  - **Navegação**: botão ícone `ChevronLeft`, rótulo central do intervalo (`min-w-[170px] text-center capitalize text-muted-foreground`), botão ícone `ChevronRight`.

### 7.2 Lógica de datas

- Semana começa na **segunda** (`startOfWeek`: ajusta domingo para -6). `WEEKDAY_LABELS = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"]`.
- **Mês**: grade fixa de **42 células** (`buildMonthGrid`), com `inCurrentMonth` para esmaecer dias fora do mês (`opacity-50`). **Semana**: 7 células (`buildWeekGrid`).
- `rangeLabel`: no mês usa `Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"})`; na semana, `"{dd mmm} - {dd mmm}"`.
- Datas curtas via `formatDatePt` → `Intl.DateTimeFormat("pt-BR",{weekday:"short",day:"2-digit",month:"short"})`.
- Eventos buscados em `/calendar/events` com `calendarId: "primary"`, `labId`, `timeMin/timeMax` (janela visível). Agrupados por dia em `Map` (`toDayKey` = `YYYY-MM-DD`).
- **Prioridade inferida** do texto do evento (`inferPriority`): contém "alta" → alta; "baixa" → baixa; senão normal.

### 7.3 Grade do calendário

- Cartão com cabeçalho de 7 colunas (`grid grid-cols-7 gap-2`, labels `text-xs font-semibold text-muted-foreground` centralizadas).
- Células: `grid grid-cols-7`, gap `1.5` (mês) ou `2` (semana). Cada célula é um **botão**:
  - Mês: `min-h-[92px] p-1.5`; Semana: `min-h-[120px] p-2`.
  - Selecionada: `border-primary bg-primary/5`; não selecionada: `border-border hover:border-primary/40`.
  - Número do dia em pílula: hoje = `bg-primary text-primary-foreground rounded-full`; senão texto normal.
  - Lista os primeiros eventos (2 no mês, 4 na semana) como chips `truncate rounded bg-muted px-1.5 py-0.5 text-[10px]`. Excedente → `+N mais`.
  - **Cliente**: chips NÃO clicáveis (apenas `div`). **Planejador/técnico**: cada chip é `Link` para `/event/{id}?returnTo=...` (com `stopPropagation` para não selecionar o dia).
- Estados: loading → `Skeleton h-24`; vazio → cartão "Nenhum evento encontrado para o período selecionado."

### 7.4 Lista de eventos do dia selecionado

- Título "Eventos de {data}". Se vazio: cartão "Nenhum evento para o dia selecionado.". Senão, lista de `MaintenanceCard`.

---

## 8. Cartão de manutenção (`calendar/maintenance-card.tsx`)

Cartão `rounded-2xl border bg-card p-4 shadow-sm`.

- Topo: título (`font-medium`) + descrição (`text-sm text-muted-foreground`, "Sem descrição" se vazio). À direita, **badges** (rounded-full, `text-xs`): tipo de manutenção (cor por tipo), status (cor por status, label "Agendado/Em Andamento/Concluído"), prioridade (cores semáforo), e badges de remarcação (pendente/remarcado/recusado) conforme consulta.
- Linha de período: `text-xs text-muted-foreground` com início e fim em `toLocaleString("pt-BR")`.
- Se aprovado: "Nova data: ... até ..." em verde; se recusado: "Motivo da recusa: ..." em vermelho.
- **Ações por papel**:
  - cliente, sem pedido ou com pendente: botão `outline` "Solicitar reagendamento" → abre `RescheduleRequestDialog`.
  - planejador, com pendente: botão `outline` "Revisar pedido" → link `/reschedules`.
- Consulta `/reschedule-requests/by-event/:id` (`enabled` para cliente e planejador) para descobrir o último pedido.
- O cartão inteiro é `Link` para `/event/:id` quando NÃO é cliente (cliente vê o cartão sem link).

---

## 9. Overlay de Evento (`calendar/event-dialog.tsx`)

Modal de criar/editar evento, renderizado fora do `<Switch>` (ver seção 4).

- **Layout responsivo**: backdrop `fixed inset-0 bg-black/40`. Conteúdo: no mobile bottom sheet (`absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-2xl`); no desktop modal central (`md:left-1/2 md:top-1/2 md:w-[min(720px,92vw)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl`).
- Ativado pelas rotas `/event/new` (criar) e `/event/:id` (editar). Resolve o caminho de fechamento por `returnTo` na query, ou fallback. Só planejador cria (cliente é redirecionado ao tentar `/event/new`).
- **Formulário**: Título (Input), Descrição (textarea), Início/Fim (`datetime-local` em grid 2 col), Unidade (select CENPES 1/2), Laboratório (select de `/inventario/labs-allowed`), **Nível de emergência** (3 botões Baixa/Normal/Alta, ativo = `default`), Tipo de manutenção (select Preventiva/Corretiva), e — só na edição — Status (Agendado/Em andamento/Concluído).
- **Validações**: título/início/fim obrigatórios; **proibido fim de semana** (`isWeekendLocalDate`); lab obrigatório ao criar.
- Unidade e criticidade são embutidas na descrição (`composeDescription` / `parseDescription`) no formato `Unidade: CENPES X\nCriticidade: y`.
- Ações: na edição botão **Excluir** (outline); sempre Cancelar + "Criar evento"/"Salvar alterações". Em sucesso invalida `["agenda-events"]` e fecha.

---

## 10. Diálogo de remarcação (`calendar/reschedule-request-dialog.tsx`)

Aberto pelo cliente a partir do `MaintenanceCard`. Cria um pedido em `POST /reschedule-requests` (eventId, calendarId, labId, requestedByName, reason, suggestedStart/End). Tratamento de erro em pt-BR; `409` quando já há pedido pendente para o evento.

---

## 11. Inventário (`pages/inventario.tsx`) — árvore Cenpes → Setor → Lab

- Header em cartão: título "Inventário" + subtítulo "Estrutura por Cenpes, Setor e Laboratório." + botão "Novo equipamento" (`disabled` até cliente escolher lab).
- **Filtros** (cartão):
  - Planejador: **tabs** Geral / Cenpes 1 / Cenpes 2 (botões, ativo = `default`); selects de **Setor** e **Laboratório** (lab desabilitado até escolher setor); grid `md:grid-cols-4`.
  - Cliente: apenas **um select** "Selecione seu laboratório" (de `/inventario/labs-allowed`); grid `md:grid-cols-2`. Nenhuma query até escolher.
  - Campo de **busca** com debounce de 300ms ("Buscar por nome do equipamento").
- **Lista em árvore**: headers visuais por nível (Cenpes → Setor → Laboratório); cada equipamento mostra nome (negrito), local de instalação e gerência (texto secundário) e **badge de criticidade** em semáforo (baixa verde, normal amarelo, alta vermelho).
- **Estados**: vazio → ícone `Archive` + "Nenhum equipamento encontrado"; loading → skeletons.
- **Diálogo de criação**: Dialog no desktop / Sheet bottom no mobile. Planejador escolhe Cenpes (reseta Setor/Lab) → Setor (reseta Lab) → Lab, Nome (obrigatório), Local de instalação (opcional), Gerência (opcional), e 3 chips de criticidade. Cliente: Cenpes/Setor/Lab bloqueados e pré-preenchidos. Validação client-side por campo (máx 120 chars). Sucesso → toast "Equipamento cadastrado.", fecha e invalida a query; erro → mensagem do backend no diálogo.
- Técnico externo é redirecionado (RoleGate). Item "Inventário" aparece só para planejador e cliente.

---

## 12. Demais telas (resumo de layout)

- **/reschedules** (planejador): lista de pedidos pendentes/históricos; aprovar (define nova data/hora) ou recusar (com motivo). Dispara notificação Teams. Badge na nav reflete pendentes.
- **/overview** ("Mapas", planejador): visão read-only com **mapas dos Cenpes** (`public/maps/cenpes-1-*.png`) e pontos/radar de setores interativos (coordenadas `mapX/mapY` dos setores).
- **/teams** (planejador): gestão de webhooks (criar com select de lab, ativar/desativar, **testar disparo** com toast, **excluir** com AlertDialog) + resumo diário (ligar/desligar, testar).
- **/configuracoes** (planejador): CRUD de setores e labs com diálogos e confirmação de exclusão (AlertDialog destrutivo).
- **/chamados**: lista/abertura de chamados; fila para técnico (aceitar/recusar/concluir), comentários e histórico; prioridade em semáforo.
- **/scan** (técnico): leitor de QR (`html5-qrcode`) para abrir `/lab/:id`.
- **/lab/:id**: detalhes do laboratório (equipamentos, histórico por máquina).
- **/perfil**: dados do usuário, papel (`ROLE_LABEL`/`ROLE_ACCESS_LABEL`) e logout (limpa cache).

---

## 13. PROMPTS para recriar o frontend

Use após o backend pronto (ver `GUIA-RECRIACAO.md`). Em ordem.

### Prompt F0 — Setup Vite + Tailwind + design tokens

```
Configure o pacote @amu/web (React 18 + Vite 6 + TS strict). Instale: @tanstack/react-query, wouter,
react-hook-form, @hookform/resolvers, zod, @radix-ui/react-alert-dialog, @radix-ui/react-slot,
class-variance-authority, clsx, tailwind-merge, lucide-react, sonner, html5-qrcode, qrcode.react;
dev: tailwindcss 3, tailwindcss-animate, autoprefixer, postcss, @vitejs/plugin-react.
Configure tailwind.config.js com darkMode class e o theme.extend EXATO desta paleta:
border #E5E7EB, background #F6F8F5, foreground #1F2937, primary #3F7D3A (fg #fff),
card #FFFFFF (fg #1F2937), muted #EEF2EA (fg #4B5563); borderRadius lg/xl/2xl = 1/1.25/1.5rem;
fontFamily sans = Inter; plugin tailwindcss-animate.
Crie index.css com @tailwind base/components/utilities e a @layer base (border-border em *,
body bg-background text-foreground font-sans antialiased, e ring-2 ring-primary ring-offset-2 no focus-visible).
Configure vite.config.ts com proxy /api -> http://localhost:3001. Crie lib/utils.ts (cn = clsx + tailwind-merge).
```

### Prompt F1 — Providers, auth e API client

```
Crie main.tsx com StrictMode > QueryClientProvider > AuthProvider > App + Toaster (sonner, richColors,
position top-right). QueryClient com queries { retry: false, refetchOnWindowFocus: false }.
Crie lib/api.ts com apiGet/apiPost/apiPatch/apiDelete que injetam actorUsername (GET/DELETE na query,
POST/PATCH no body) e tratam erro JSON com mensagem pt-BR.
Crie lib/auth.tsx: AuthContext { user, isAuthenticated, login, logout }; estado em memória (sem localStorage);
login chama o endpoint e roda queryClient.clear() no sucesso; 401 vira "Credenciais invalidas";
logout roda queryClient.clear(). Crie lib/roles.ts (ROLE_LABEL, ROLE_ACCESS_LABEL, homePathByRole:
tecnico_externo -> /scan, senão /agenda).
```

### Prompt F2 — Componentes ui (shadcn enxuto)

```
Crie components/ui:
- button.tsx com cva: base "inline-flex items-center justify-center gap-2 rounded-2xl text-sm font-medium
  ... focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"; variants default
  (bg-primary text-primary-foreground hover:bg-primary/90), outline (border border-border bg-card hover:bg-muted),
  ghost (hover:bg-muted), destructive (bg-red-600 text-white hover:bg-red-700); sizes default (h-10 px-4),
  lg (h-12 px-6), icon (h-10 w-10); suporta asChild via Radix Slot.
- input.tsx: h-11 w-full rounded-2xl border bg-card px-4 py-2 text-sm shadow-sm focus-visible:ring-2 ring-primary.
- label.tsx, skeleton.tsx (animate-pulse rounded-2xl bg-muted).
- alert-dialog.tsx (Radix): Overlay fixed inset-0 z-40 bg-black/40; Content centralizado rounded-2xl border
  bg-card p-4 shadow-lg max-w-md; exporta Trigger/Cancel/Action/Title/Description.
Padrao de dialogos: Dialog no desktop, Sheet bottom no mobile.
```

### Prompt F3 — Layout (header, sidebar, bottom nav)

```
Crie components/amu-logo.tsx (img /logo/amu-logo-header.png, h-9) e components/layout.tsx (AppLayout):
- Header sticky top-0 z-20 h-16 border-b bg-background/90 backdrop-blur; logo à esquerda (link para home do papel);
  à direita (só planejador) botão ícone Webhook (link /teams) e botão "Novo evento" (Plus, hidden sm:inline-flex,
  link /event/new?returnTo=<location>); sempre AvatarButton (iniciais do nome, link /perfil).
- Grid md:grid-cols-[220px_1fr]; sidebar (hidden md:block) em cartão rounded-2xl; item ativo
  bg-primary text-primary-foreground (via location.startsWith), inativo hover:bg-muted; badge vermelho
  rounded-full para contadores.
- Bottom nav fixed bottom-0 md:hidden com os mesmos itens (ícone + label text-xs).
- FAB mobile (só planejador): botão circular fixed bottom-20 right-4 h-14 w-14 rounded-full bg-primary, Plus.
Itens por papel (getNavItems): tecnico_externo usa Scanner (/scan, Crosshair); demais Agenda (/agenda, CalendarDays).
planejador: Agenda, Reagendamento (/reschedules, RefreshCcw, badge pendentes), Mapas (/overview, FlaskConical),
Inventário (/inventario, PackageSearch), Configurações (/configuracoes, Settings2), Perfil (/perfil, UserCircle2).
cliente: Agenda, Inventário, Perfil. tecnico_externo: Scanner, Chamados (MessageSquareWarning), Perfil.
Badge: useQuery em /reschedule-requests?status=pendente, refetchInterval 30s, enabled só planejador.
```

### Prompt F4 — Roteamento e RoleGate

```
Crie components/role-gate.tsx (allow: UserRole[], fallbackTo default /chamados; sem user -> /login;
papel não permitido -> Redirect fallbackTo) e App.tsx com wouter:
- Se não autenticado, renderiza LoginPage (sem layout).
- Dentro de AppLayout, um Switch. Implemente "overlay de evento": guarde a última rota não-overlay em um ref
  e passe como location do Switch quando a rota for /event/new ou /event/:id, renderizando <EventDialog> por cima.
- Rotas: / -> redirect home do papel; /agenda; /scan (RoleGate tecnico_externo, fallback /agenda);
  /chamados; /perfil; /overview, /reschedules, /teams, /configuracoes (RoleGate planejador);
  /inventario (RoleGate planejador+cliente); /lab/:id; catch-all -> home do papel.
```

### Prompt F5 — Login

```
Crie pages/login.tsx: fundo bg-gradient-to-br from-[#E8F3E6] via-background to-background, tela cheia,
conteúdo centralizado max-w-md. Logo /logo/amu-logo-full.png (w-220) + legenda "Agenda de Manutenção Unificada".
Cartão rounded-2xl border bg-card p-8 shadow-sm com título "Entrar". Form react-hook-form + zod
(username/password obrigatórios, mensagens pt-BR), erros text-sm text-red-600, botão "Entrar" size lg largura total
("Entrando..." ao submeter). Bloco "Acesso de demonstração" com 3 botões outline (Planejador/Cliente/Técnico externo)
que preenchem usuário e a senha kronus2026.
```

### Prompt F6 — Agenda / Calendário

```
Crie pages/agenda.tsx com o estilo de calendário descrito:
- Cabeçalho em cartão: nome do lab, chip verde "OPERACIONAL" + "Última inspeção", select de lab (Lab 1..8),
  alternador Mês/Semana (botões default/ghost dentro de container rounded-xl), navegação ChevronLeft/Right
  com rótulo central capitalize.
- Semana começando na segunda; WEEKDAY_LABELS Seg..Dom; mês = grade de 42 células (esmaece dias fora do mês),
  semana = 7 células. rangeLabel via Intl pt-BR. Datas curtas via Intl weekday short/day 2-digit/month short.
- Busca /calendar/events com calendarId primary, labId, timeMin/timeMax da janela. Agrupa por dia (YYYY-MM-DD).
  Prioridade inferida do texto (alta/baixa/normal).
- Grade: cartão com header 7 colunas; células botão (mês min-h-92 p-1.5, semana min-h-120 p-2);
  selecionada border-primary bg-primary/5; hoje em pílula bg-primary; chips de evento truncate bg-muted text-[10px]
  (2 no mês, 4 na semana, "+N mais"). Cliente: chips não clicáveis; demais: Link /event/{id}?returnTo (stopPropagation).
- Abaixo, "Eventos de {data}" com MaintenanceCard (ou vazio). Loading com Skeleton.
```

### Prompt F7 — MaintenanceCard e overlay de evento

```
Crie calendar/maintenance-card.tsx: cartão rounded-2xl border bg-card p-4 shadow-sm com título + descrição,
badges (tipo de manutenção corretiva vermelho / preventiva azul; status concluido verde / em_andamento âmbar /
agendado cinza; prioridade semáforo baixa #22C55E, normal #EAB308, alta red-500; badges de remarcação
pendente amarelo / aprovado verde / recusado vermelho), período em toLocaleString pt-BR, e ações por papel
(cliente: "Solicitar reagendamento" abre dialog; planejador com pendente: "Revisar pedido" -> /reschedules).
Consulta /reschedule-requests/by-event/:id. Cartão é Link para /event/:id quando não-cliente.
Crie calendar/event-dialog.tsx: modal/sheet (mobile bottom sheet rounded-t-2xl, desktop central md:w-[min(720px,92vw)]),
ativado por /event/new e /event/:id, com backdrop bg-black/40. Form: Título, Descrição (textarea),
Início/Fim (datetime-local), Unidade (CENPES 1/2), Laboratório (de /inventario/labs-allowed), Nível de emergência
(3 botões), Tipo (Preventiva/Corretiva), Status (só edição). Proíbe fim de semana. Unidade+criticidade embutidos
na descrição. Excluir na edição. Sucesso invalida ["agenda-events"] e fecha.
Crie calendar/reschedule-request-dialog.tsx para o cliente criar pedido (POST /reschedule-requests; 409 se já pendente).
```

### Prompt F8 — Inventário, Teams, Configurações, Overview, Scanner, Lab, Perfil, Chamados

```
Crie pages/inventario.tsx (árvore Cenpes->Setor->Lab; ver seção 11: tabs do planejador, select do cliente,
busca debounce 300ms, badges de criticidade em semáforo, estado vazio com ícone Archive, dialog de criação
Dialog/Sheet, toasts). Crie pages/teams.tsx (CRUD de webhooks com select de lab, ativar/desativar, testar disparo
com toast, excluir com AlertDialog destrutivo; resumo diário ligar/desligar e testar). Crie pages/configuracoes.tsx
(CRUD de setores e labs com AlertDialog de exclusão). Crie pages/overview.tsx (mapas dos Cenpes em public/maps +
radar de setores por mapX/mapY). Crie pages/scanner.tsx (html5-qrcode -> /lab/:id). Crie pages/lab-details.tsx,
pages/perfil.tsx (dados + papel via ROLE_LABEL/ROLE_ACCESS_LABEL + logout) e pages/chamados.tsx
(lista/abertura, fila do técnico aceitar/recusar/concluir, comentários e histórico, prioridade semáforo).
Garanta pnpm typecheck limpo.
```

---

## 14. Checklist visual de aceitação

- [ ] Header verde com logo AMU; sidebar no desktop, bottom nav + FAB no mobile.
- [ ] Item de nav ativo em verde (`bg-primary`); badge vermelho de pendências no "Reagendamento".
- [ ] Login com gradiente verde claro, logo grande e 3 botões de demonstração.
- [ ] Calendário: alternar Mês/Semana, navegar, selecionar dia, chips de evento (cliente não clica).
- [ ] Cartão de manutenção com badges coloridos (tipo, status, prioridade, remarcação).
- [ ] Overlay de evento abre por cima da agenda (fundo preservado), bottom sheet no mobile.
- [ ] Inventário em árvore com badges de criticidade em semáforo e estados vazio/loading.
- [ ] Cantos `rounded-2xl`, fonte Inter, foco com anel verde, sem emojis na UI.

---

## 15. Camada de API do frontend (`lib/api.ts`)

Todas as telas falam com o backend por 4 helpers que **injetam `actorUsername`** automaticamente e tratam erro em pt-BR. Base: `fetch("/api" + path)` com `Content-Type: application/json`. Resposta `204` → `undefined`; resposta não-ok → lança `Error` com a mensagem do campo `error` do JSON (ou `"Erro na requisição"`).

| Helper | Método | Onde injeta `actorUsername` | Assinatura |
|---|---|---|---|
| `apiGet<T>(path, actorUsername, query?)` | GET | na **query string** | retorna `T` |
| `apiDelete(path, actorUsername)` | DELETE | na **query string** | retorna `void` |
| `apiPost<T>(path, actorUsername, body)` | POST | no **body** JSON | retorna `T` |
| `apiPatch<T>(path, actorUsername, body)` | PATCH | no **body** JSON | retorna `T` |

`toQueryString` ignora valores `null`/`undefined`. Sempre que uma mutação altera dados, a tela faz `queryClient.invalidateQueries` das chaves afetadas. Toasts (`sonner`) confirmam sucesso/erro nas ações relevantes.

---

## 16. Funcionalidades e botões por tela

Mapa completo de **cada botão, campo, ação, query, mutação e regra** do frontend. Use como checklist funcional ao recriar.

### 16.1 Login (`/` quando deslogado)

- **Campos**: Usuário, Senha (react-hook-form + zod, ambos obrigatórios).
- **Botão "Entrar"** (`submit`, `size="lg"`, largura total): chama `login(username, password)`; mostra "Entrando..." enquanto `isSubmitting`; em 401 exibe "Credenciais invalidas"; outros erros exibem a mensagem.
- **Botões de demonstração** (3, `variant="outline"`): "Planejador" / "Cliente" / "Técnico externo" → `fillDemo` preenche o usuário e a senha `kronus2026` (não envia, só preenche).
- Pós-login: `queryClient.clear()` e redireciona para a home do papel.

### 16.2 Header / Navegação (global)

- **Logo AMU** (link): vai para `homePathByRole(role)`.
- **Botão ícone Webhook** (só planejador, `outline size="icon"`): abre `/teams`.
- **Botão "Novo evento"** (só planejador, escondido no mobile): abre overlay `/event/new?returnTo=<rota atual>`.
- **FAB "+"** (só planejador, só mobile): mesmo destino do "Novo evento".
- **AvatarButton** (iniciais): abre `/perfil`.
- **Itens da sidebar/bottom nav**: navegam por papel (seção 3.3); item ativo destacado por `location.startsWith`. **Badge vermelho** no "Reagendamento" = nº de pendentes (polling 30s).

### 16.3 Agenda (`/agenda`)

- **Select de laboratório** (Lab 1..8): troca `selectedLabId` e refaz a query de eventos.
- **Botões "Mês" / "Semana"**: alternam `viewMode` e re-ancoram em `selectedDate`.
- **Botões ◀ / ▶** (`ChevronLeft`/`ChevronRight`): no modo mês andam ±1 mês; no modo semana ±7 dias.
- **Clique numa célula de dia**: seleciona o dia (`setSelectedDate`) e atualiza a lista "Eventos de {data}".
- **Chip de evento na célula**:
  - **cliente**: não clicável (apenas texto).
  - **planejador/técnico**: `Link` para `/event/{id}?returnTo=...` (com `stopPropagation` para não selecionar o dia ao mesmo tempo).
- **MaintenanceCard** (lista do dia): ver 16.4.
- Estados: loading (`Skeleton`), vazio (mensagem em cartão). Query: `GET /calendar/events` com `calendarId`, `labId`, `timeMin/timeMax`.

### 16.4 Cartão de manutenção (`MaintenanceCard`)

- Consulta `GET /reschedule-requests/by-event/:id` (cliente e planejador) para descobrir o último pedido e exibir badges (pendente/remarcado/recusado) e textos (nova data / motivo da recusa).
- **Botão "Solicitar reagendamento"** (cliente, quando não há pedido ou há pendente, `outline`): abre o `RescheduleRequestDialog`.
- **Botão "Revisar pedido"** (planejador, quando há pendente, `outline`): link para `/reschedules`.
- Cartão inteiro vira **link para `/event/:id`** quando o usuário NÃO é cliente.

### 16.5 Overlay de Evento (`/event/new` e `/event/:id`)

Renderizado por cima da rota de fundo (a agenda continua atrás). Só planejador (cliente é redirecionado ao abrir `/event/new`).

- **Campos**: Título (obrigatório), Descrição (textarea), Início/Fim (`datetime-local`, obrigatórios), Unidade (select CENPES 1/2), Laboratório (select de `GET /inventario/labs-allowed`), **Nível de emergência** (3 botões Baixa/Normal/Alta — ativo = `default`, demais = `outline`), Tipo (Preventiva/Corretiva). **Na edição** aparece também Status (Agendado/Em andamento/Concluído).
- **Validações no submit**: título+início+fim presentes; **proíbe fim de semana** (`isWeekendLocalDate`); ao criar, lab obrigatório. Unidade e criticidade são serializadas dentro da descrição (`composeDescription`/`parseDescription`).
- **Botões**:
  - **"Criar evento"** (`submit`, criar) → `POST /calendar/events`; sucesso invalida `["agenda-events"]` e fecha.
  - **"Salvar alterações"** (`submit`, editar) → `PATCH /calendar/events/:id`.
  - **"Excluir"** (só edição, `outline`) → `DELETE /calendar/events/:id`.
  - **"Cancelar"** e **"Fechar"** (`outline`) → fecham retornando para `returnTo`.
- Mensagens de erro do backend e do form aparecem em `text-sm text-red-600`.

### 16.6 Diálogo de solicitação de reagendamento (`RescheduleRequestDialog`, cliente)

- Modal/bottom sheet (hook `useIsMobile` via `matchMedia (max-width: 767px)`).
- Consulta `GET /reschedule-requests/by-event/:id`. Comportamento condicional:
  - **Pendente**: mostra aviso amarelo "Já existe um pedido pendente." e **não** mostra o form.
  - **Aprovado**: aviso verde com a nova data.
  - **Recusado**: aviso vermelho com o motivo.
  - **Sem pedido**: mostra o form.
- **Campos do form**: Seu nome (pré-preenchido com `user.name`), Motivo (textarea, obrigatório), Sugestão de início e Até (`datetime-local`, opcionais).
- **Botão "Enviar pedido"** (`submit`): habilitado só com nome+motivo e sem pendência (`canSubmit`); `POST /reschedule-requests`; sucesso → toast "Pedido de reagendamento enviado.", invalida `reschedule-by-event`, `agenda-events`, `reschedules`, `reschedules-badge` e fecha. Erro → toast com a mensagem (ex.: 409 já pendente).
- **Botão "Fechar"** (`outline`): fecha sem enviar.

### 16.7 Reagendamento (`/reschedules`, planejador)

- **Abas**: "Pendentes" (com badge de contagem), "Aprovados", "Recusados" — alternam `tab` e a query (`GET /reschedule-requests?status=<tab>`; pendentes com polling 30s).
- Cada cartão mostra título do evento (resolvido por `GET /calendar/events`), motivo, solicitante, datas sugeridas, e (conforme status) nova data aprovada ou motivo de recusa.
- Na aba "Pendentes", cada cartão tem:
  - **Botão "Aprovar"** (`default`): abre o modal de aprovação **pré-preenchendo** início/fim com os do evento.
  - **Botão "Recusar"** (`outline`): abre o modal de recusa.
- **Modal Aprovar**: campos "Nova data de início" e "Nova data de término" (`datetime-local`). **Botão "Confirmar"** (desabilitado sem ambas as datas) → `POST /reschedule-requests/:id/approve`; sucesso → toast "Reagendamento aprovado", invalida `reschedules`, `reschedules-badge`, `agenda-events`, fecha. **"Cancelar"** fecha.
- **Modal Recusar**: textarea "Motivo da recusa". **Botão "Confirmar recusa"** (desabilitado se motivo < 5 chars) → `POST /reschedule-requests/:id/reject`; sucesso → toast "Reagendamento recusado". **"Cancelar"** fecha.
- Ambas as decisões disparam a notificação Teams no backend.

### 16.8 Inventário (`/inventario`, planejador e cliente)

- **Botão "Novo equipamento"** (no header): desabilitado até `canCreate` (cliente precisa ter escolhido um lab); abre o diálogo de criação.
- **Planejador**: abas **Geral / Cenpes 1 / Cenpes 2** (resetam Setor e Lab ao trocar); **select Setor**; **select Lab** (desabilitado até escolher setor); **busca** (debounce 300ms). Query só dispara conforme filtros.
- **Cliente**: **select "Selecione seu laboratório"** (de `GET /inventario/labs-allowed`); **busca**. Nenhuma query até escolher o lab.
- **Árvore de resultados**: Cenpes → Setor → Lab → itens. Cada item: nome (negrito), "local · gerência" (com fallback "não informado"), **badge de criticidade** (`baixa` verde / `normal` amarelo / `alta` vermelho, `capitalize`).
- Estados: loading (3 skeletons), vazio (ícone `Archive` + "Nenhum equipamento encontrado").
- **Diálogo de criação** (Dialog desktop / bottom sheet mobile):
  - **Planejador**: selects Cenpes (reseta Setor/Lab) → Setor (reseta Lab) → Lab (desabilitado sem setor).
  - **Cliente**: 3 inputs **desabilitados** pré-preenchidos (Cenpes, Setor, Lab do lab selecionado).
  - Inputs: Nome (`maxLength 120`), Local de instalação (opcional, 120), Gerência (opcional, 120).
  - **Chips de criticidade** (3 botões `baixa/normal/alta`): selecionado ganha `ring-2 ring-primary`.
  - Validação client-side por campo (erros `text-xs text-red-600`); erro do backend em bloco vermelho.
  - **Botão "Cadastrar equipamento"** (`submit`): `POST /equipamentos`; sucesso → toast "Equipamento cadastrado.", fecha e invalida a lista. **"Cancelar"** fecha.

### 16.9 Painel Teams (`/teams`, planejador)

- **Seção Resumo diário**:
  - **Botão toggle "Resumo ativo/inativo"** (`default` quando ativo): `PATCH /teams/settings` invertendo `dailySummaryEnabled`.
  - **Botão "Testar resumo"** (`outline`): `POST /teams/daily-summary/test`.
- **Seção Novo webhook** (form): inputs **Nome** e **URL** (obrigatórios) + **select de laboratório** ("Sem laboratorio (global)" ou um lab de `GET /configuracoes/labs`). **Botão "Adicionar"** (`submit`): `POST /webhooks` (`enabled: true`, `labId` ou `null`); limpa o form e invalida a lista.
- **Lista de webhooks** — cada cartão mostra nome, URL e alvo (`Lab #id` ou "Global (todos os labs)") e 3 botões:
  - **Botão "Ativo/Inativo"** (`default` se ativo): `PATCH /webhooks/:id { enabled }` (toggle).
  - **Botão "Testar disparo"** (`outline`): `POST /webhooks/:id/test`; sucesso → toast "Mensagem de teste enviada ao Teams."; erro → toast com a mensagem do backend (ex.: 403/401 URL revogada).
  - **Botão "Excluir"** (`destructive`): abre `AlertDialog` de confirmação.
- **AlertDialog "Excluir webhook"**: **"Cancelar"** (`outline`) e **"Excluir"** (`destructive`) → `DELETE /webhooks/:id`; sucesso → toast "Webhook excluido.".

### 16.10 Configurações (`/configuracoes`, planejador)

- **Coluna Setores** — form: Input "Nome do setor" + select Cenpes 1/2. **Botão "Adicionar setor"** → `POST /configuracoes/setores`, toast "Setor criado". Cada setor da lista tem:
  - **Botão "Excluir"** (`outline`) → abre `AlertDialog` ("Excluir setor"); confirmar → `DELETE /configuracoes/setores/:id`, toast "Setor removido".
  - **Botão "Editar"** (`outline`) → `window.prompt` para novo nome → `PATCH /configuracoes/setores/:id`, toast "Setor atualizado".
- **Coluna Labs** — form: Inputs "Nome do lab" e "Localização" + select de setor. **Botão "Adicionar lab"** → `POST /configuracoes/labs`, toast "Lab criado". Cada lab tem:
  - **Botão "QR"** (`outline`) → mostra o painel de QR Code do lab.
  - **Botão "Editar"** (`outline`) → `window.prompt` → `PATCH /configuracoes/labs/:id`, toast "Lab atualizado".
  - **Botão "Excluir"** (`outline`) → `AlertDialog` ("Excluir lab") → `DELETE /configuracoes/labs/:id`, toast "Lab removido".
- **Painel QR Code** (`QRCodeCanvas`, valor `${origin}/lab/:id`, 220px): **"Imprimir"** (`window.print()`), **"Baixar PNG"** (exporta o canvas como `lab-<id>.png`), **"Fechar"** (`default`).

### 16.11 Overview / Mapas (`/overview`, planejador)

- **Botões "Cenpes 1" / "Cenpes 2"** (`default` no ativo): trocam o mapa de fundo e os pontos exibidos.
- **Botão "Restaurar"** (`outline`): volta as coordenadas ao último snapshot e reseta os pontos extras.
- **Mapa** (`/maps/cenpes-1-map-v2-transparent.png` ou `cenpes-1-map-transparent.png`) com **marcadores de radar** arrastáveis:
  - Cada `RadarPoint` (ponto verde com halo `animate-ping`) é **arrastável com o mouse**; ao soltar, persiste via `PATCH /setores/:id/coords { mapX, mapY }`.
  - Persistência **encadeada por setor** (fila de promises) com **rollback** visual em caso de erro; ponto em gravação fica `animate-pulse`.
  - Coordenadas em **porcentagem** (0–100) relativas ao container. Até 8 pontos reais + pontos "extras" de preenchimento (não persistidos).
- Query: `GET /setores`.

### 16.12 Scanner (`/scan`, técnico externo)

- Tela cheia preta com a câmera (`html5-qrcode`, `facingMode: environment`, `fps 10`, `qrbox 260`).
- Ao ler um QR: extrai o `labId` (de `/lab/<n>` ou número puro). Se inválido → toast "QR inválido...". Se válido → para o scanner e navega para `/lab/:id`.
- **Botão "Fechar"** (`outline`, topo): volta para `/chamados`.
- Estados: "Iniciando câmera..."; em falha mostra cartão branco com erro + **botão "Voltar"** (`/chamados`).

### 16.13 Detalhes do Lab (`/lab/:id`)

- Cabeçalho com nome, localização e setor do lab (`GET /configuracoes/labs/:id`).
- Lista de equipamentos do lab (derivada de `GET /inventario/tree`): nome + "local · gerência". Vazio → "Sem equipamentos cadastrados.".
- **Botão "Ver inventário"** (`outline`): link para `/inventario`.
- Loading com skeletons; lab inexistente → "Lab não encontrado.".

### 16.14 Chamados (`/chamados`)

- **Seletor "Identidade do cliente"** (3 botões: Funcionário/Operador/Supervisor de Laboratório — ativo = `default`): define `openedBy` e filtra "Meus chamados".
- **Abas** (oculto para técnico): "Abrir", "Meus chamados", "Para o técnico".
- **Aba "Abrir"** (form): Input "Máquina" (obrigatório), select de prioridade (baixa/normal/alta), textarea "Descreva o problema" (obrigatório). **Botão "Abrir chamado"** (`submit`, `labId: 1`): `POST /chamados`; mostra "Enviando..." enquanto pendente; limpa o form e invalida a lista.
- **Cartão de chamado** (`ChamadoCard`): título (máquina), descrição, status colorido (concluido verde / em_progresso âmbar / recusado vermelho / espera cinza). Ações só para planejador e técnico (`canActOnChamados`):
  - Status `em_espera`: **"Aceitar"** (`POST /chamados/:id/accept`) e **"Recusar"** (`outline`, desabilitado sem motivo) + Input "Motivo da recusa" (`POST /chamados/:id/reject` com `rejectionReason`).
  - Status `em_progresso`: **"Concluir"** (`POST /chamados/:id/complete`).
  - **Botão "Ver comentários e histórico"** (link `text-primary` com chevron): expande/colapsa; ao expandir carrega `GET /chamados/:id/comments` e `GET /chamados/:id/history`.
  - Na seção expandida: lista de comentários; **form de comentário** (Input + **botão "Enviar"**, `POST /chamados/:id/comments`) visível para quem pode agir; e "Histórico da máquina".
- Para `tecnico_externo` a tela mostra apenas a **fila** (`status === "em_espera"`), sem abas nem form.

### 16.15 Perfil (`/perfil`, todos)

- Cartão com Nome, Cargo (`jobTitle`) e **Nível de acesso** (pílula `ROLE_LABEL - ROLE_ACCESS_LABEL`).
- **Botão "Sair"** (`outline` com borda/texto vermelho): `logout()` → `queryClient.clear()` e zera o usuário (volta ao login).

---

## 17. Resumo de toasts (sonner)

| Ação | Toast de sucesso | Toast de erro |
|---|---|---|
| Solicitar reagendamento | "Pedido de reagendamento enviado." | mensagem do backend |
| Aprovar reagendamento | "Reagendamento aprovado" | "Erro ao aprovar reagendamento" |
| Recusar reagendamento | "Reagendamento recusado" | "Erro ao recusar reagendamento" |
| Cadastrar equipamento | "Equipamento cadastrado." | mensagem no diálogo (não toast) |
| Testar webhook | "Mensagem de teste enviada ao Teams." | mensagem do backend |
| Excluir webhook | "Webhook excluido." | "Erro ao excluir webhook." |
| Criar/editar/excluir setor | "Setor criado/atualizado/removido" | mensagem do backend |
| Criar/editar/excluir lab | "Lab criado/atualizado/removido" | mensagem do backend |
| Scanner: QR inválido | — | "QR inválido. Use um código de laboratório." |

`Toaster` global: `richColors`, `position="top-right"`.

---

## 18. Matriz de funcionalidades por papel

| Funcionalidade | Planejador | Cliente | Técnico externo |
|---|-----|----|---|
| Ver agenda / calendário | sim | sim (chips não clicáveis) | sim |
| Criar/editar/excluir evento | sim | não | não |
| Solicitar reagendamento | não | sim | não |
| Aprovar/recusar reagendamento | sim | não | não |
| Inventário (ver) | tudo, com filtros | só o próprio lab | bloqueado |
| Inventário (criar equipamento) | sim | sim (campos travados) | não |
| Painel Teams (webhooks/resumo) | sim | não | não |
| Configurações (setores/labs/QR) | sim | não | não |
| Overview / Mapas | sim | não | não |
| Chamados (abrir) | sim | sim | não (só fila) |
| Chamados (aceitar/recusar/concluir/comentar) | sim | não | sim |
| Scanner QR | sim | sim| sim |
| Perfil / Sair | sim | sim | sim |

> Proteção de rotas via `RoleGate` (seção 4); a navegação (`getNavItems`) só mostra os itens permitidos a cada papel.