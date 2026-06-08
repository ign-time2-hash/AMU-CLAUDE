# Guia de Recriação — AMU / Kronus

Este documento contém **tudo** o que é necessário para recriar o projeto AMU / Kronus do zero em outra IA (ou time): bibliotecas com versões, estrutura do monorepo, variáveis de ambiente, comandos de execução, convenções obrigatórias, schema do banco e uma sequência de **prompts prontos** para reconstruir cada parte.

> Idioma do produto: **pt-BR** em toda UI, mensagens de erro, seeds e comentários voltados ao usuário. **Sem emojis** em UI, código e commits (exceto onde explicitamente especificado nas mensagens de webhook do Teams).

---

## 1. Visão geral

AMU (Agenda de Manutenção Unificada), também chamado **Kronus**, é um sistema full-stack de gestão de manutenção de laboratórios industriais, com:

- Gestão de **chamados** (tickets de manutenção)
- **Agenda** de manutenção (integração com Google Calendar, com fallback mock)
- Solicitações de **remarcação** (reschedule) com aprovação/recusa transacional
- **Inventário** de equipamentos organizado em árvore Cenpes → Setor → Laboratório
- Integração com **Microsoft Teams** (webhooks + resumo diário)
- **Scanner QR** para navegação rápida de laboratório

### Papéis (roles)

- `planejador`: acesso total (gestão administrativa e operacional)
- `cliente`: abre chamados, vê os próprios, solicita remarcação, vê agenda e inventário do próprio lab
- `tecnico_externo`: fila de chamados (aceitar/recusar/concluir), comentários, histórico por máquina, scanner QR, overview read-only

---

## 2. Stack e bibliotecas (com versões)

### Monorepo / ferramentas

- **Node** >= 20
- **pnpm** 9.15.9 (workspaces)
- **Docker** (PostgreSQL via docker compose)
- **TypeScript** ^5.8.2 (strict, sem `any`, sem `@ts-ignore`)

### Backend — `@amu/api-server`

Dependências:
- `@prisma/client` ^6.5.0
- `bcryptjs` ^3.0.2
- `cors` ^2.8.5
- `dotenv` ^16.4.7
- `express` ^5.1.0
- `node-cron` ^3.0.3
- `pino` ^9.6.0
- `pino-http` ^10.4.0
- `zod` ^3.24.2
- `@amu/db` (workspace)

Dev:
- `@types/cors` ^2.8.17, `@types/bcryptjs` ^2.4.6, `@types/express` ^5.0.1, `@types/node-cron` ^3.0.11, `@types/node` ^22.13.10
- `esbuild` ^0.25.1, `tsx` ^4.19.3, `typescript` ^5.8.2

### Frontend — `@amu/web`

Dependências:
- `react` ^18.3.1, `react-dom` ^18.3.1
- `@tanstack/react-query` ^5.69.0
- `wouter` ^3.6.0 (router)
- `react-hook-form` ^7.54.2 + `@hookform/resolvers` ^4.1.3
- `zod` ^3.24.2
- `@radix-ui/react-alert-dialog` ^1.1.2, `@radix-ui/react-slot` ^1.1.2 (base shadcn/ui)
- `class-variance-authority` ^0.7.1, `clsx` ^2.1.1, `tailwind-merge` ^3.0.2
- `lucide-react` ^0.483.0 (ícones)
- `sonner` ^1.7.1 (toasts)
- `html5-qrcode` ^2.3.8, `qrcode.react` ^4.2.0 (scanner/QR)
- `@amu/api-client-react`, `@amu/api-zod` (workspace)

Dev:
- `@types/react` ^18.3.20, `@types/react-dom` ^18.3.5
- `@vitejs/plugin-react` ^4.3.4, `vite` ^6.2.2
- `tailwindcss` ^3.4.17, `tailwindcss-animate` ^1.0.7, `autoprefixer` ^10.4.21, `postcss` ^8.5.3
- `typescript` ^5.8.2

### Banco — `@amu/db`

- `@prisma/client` ^6.5.0
- Dev: `prisma` ^6.5.0, `dotenv-cli` ^8.0.0, `typescript` ^5.8.2
- Exporta `./src/index.ts` (re-export de `@prisma/client`)
- `postinstall`: `prisma generate`

### Contrato de API — `@amu/api-spec`, `@amu/api-zod`, `@amu/api-client-react`

- `orval` ^7.8.0 (gera hooks React Query + schemas Zod a partir do `openapi.yaml`)
- `@amu/api-zod`: schemas Zod gerados (usa `zod`)
- `@amu/api-client-react`: hooks React Query gerados (usa `@tanstack/react-query`)

---

## 3. Estrutura do monorepo

```
.
├── package.json                 # scripts raiz (dev, build, db:*, codegen)
├── pnpm-workspace.yaml
├── docker-compose.yml           # postgres:16-alpine na porta 5433
├── tsconfig.base.json
├── .env / .env.example
├── artifacts/
│   ├── api-server/              # @amu/api-server (Express 5 + Prisma)
│   │   └── src/
│   │       ├── index.ts         # entrypoint; bootstrap + registro de rotas
│   │       ├── bootstrap.ts     # db push + seed
│   │       ├── bootstrap-cli.ts
│   │       ├── db.ts            # PrismaClient singleton
│   │       ├── load-env.ts
│   │       ├── logger.ts        # pino
│   │       ├── verify-seed.ts
│   │       ├── middleware/      # actor.ts, require-role.ts
│   │       ├── routes/          # auth, chamados, reschedule-requests, webhooks,
│   │       │                    # teams, calendar, setores, inventario,
│   │       │                    # equipamentos, configuracoes, system
│   │       ├── services/        # calendar-service, daily-summary-job,
│   │       │                    # teams-notifier, teams-settings
│   │       └── types/express.d.ts
│   └── web/                     # @amu/web (React + Vite)
│       └── src/
│           ├── main.tsx, App.tsx
│           ├── index.css
│           ├── pages/           # login, agenda, chamados, reschedules, overview,
│           │                    # inventario, teams, configuracoes, perfil,
│           │                    # scanner, lab-details, event-new, event-details
│           ├── calendar/        # componentes de agenda/evento/remarcação
│           ├── components/      # layout, role-gate, amu-logo, ui/ (shadcn)
│           └── lib/             # api.ts, auth.tsx, roles.ts, utils.ts
└── lib/
    ├── db/                      # @amu/db (Prisma schema + client)
    │   └── prisma/schema.prisma
    ├── api-spec/                # @amu/api-spec (openapi.yaml + orval)
    ├── api-zod/                 # @amu/api-zod (schemas Zod gerados)
    └── api-client-react/        # @amu/api-client-react (hooks React Query gerados)
```

---

## 4. Variáveis de ambiente (`.env`)

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/amu
SESSION_SECRET=change-me-in-production
TEAMS_WEBHOOK_URL=
TEAMS_WEBHOOK_URL_2=
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
GOOGLE_CALENDAR_REFRESH_TOKEN=
```

> Sem credenciais do Google Calendar, o serviço de calendário usa dados **mock/seed**.

---

## 5. Comandos de execução

```bash
cp .env.example .env
pnpm install
pnpm db:up          # sobe o PostgreSQL no Docker (porta 5433)
pnpm db:push        # aplica o schema Prisma no banco
pnpm db:bootstrap   # cria/seed de usuários, setores, labs, equipamentos
pnpm dev            # sobe API (3001) + web (5173) em paralelo
```

Outros scripts (raiz `package.json`):
- `pnpm typecheck` — `tsc --noEmit` em todos os pacotes
- `pnpm build` — vite build (web) + esbuild CJS (server)
- `pnpm db:verify-seed` — valida os seeds
- `pnpm db:reset` — `docker compose down -v && up` (zera o volume do banco)
- `pnpm db:down` — derruba o Postgres
- `pnpm codegen` — roda Orval (lê `openapi.yaml`)

Portas: **API** `http://localhost:3001`, **Web** `http://localhost:5173`.

### Credenciais seed

Senha padrão de todos: `kronus2026`
- `planejador` (Carlos Silva)
- `cliente` (Funcionário de Laboratório)
- `tecnico_externo` (Técnico Externo)

---

## 6. Convenções obrigatórias

- **Idioma/marca**: todo texto de UI, erros, seeds e comentários ao usuário em pt-BR. Sem emojis (exceto nos cards de notificação do Teams, onde são parte da mensagem).
- **Paleta**: primário `#3F7D3A` (verde), fundo `#F6F8F5`, cartões brancos, borda `#E5E7EB`, `rounded-2xl`. Fonte Inter. Ícones lucide.
- **Logo "AMU"** verde com cadeado dentro do "A".
- **Prioridade em semáforo**: baixa = `#22C55E`, normal = `#EAB308`, alta = vermelho.
- **Criticidade (inventário)**: baixa = verde, normal = amarelo, alta = vermelho.
- **Datas em pt-BR** ("seg, 25 de mai").
- **Mobile-first**: bottom sheet substitui modal no mobile; bottom nav substitui sidebar.
- **Cache React Query** é LIMPO no login e no logout (evita vazamento entre usuários).
- **Auth state em memória** (sem localStorage) — reload exige novo login.
- **TODA rota backend** exige `actorUsername` no body/query e valida o papel via lookup em `users` → `403` se não autorizado.
- **Transições de chamado atômicas**: `WHERE id=? AND status=<esperado>` → `409` em corrida.
- **Aprovação de remarcação** em transação com `SELECT ... FOR UPDATE`, chama Google Calendar dentro do lock, rollback se Calendar falhar.
- **TypeScript estrito**: `strict: true`, sem `any`, sem `@ts-ignore`.
- **Nomes**: pt-BR no domínio (`Chamado`, `Setor`, `Equipamento`); inglês em infra (`UserRole`, `requireRole`).
- **Componentes shadcn** em `src/components/ui`; componentes de feature em `src/calendar`, `src/pages`, etc.
- **Logs** com pino (`req.log` em handlers, `logger` singleton fora).

---

## 7. Schema do banco (Prisma + PostgreSQL)

Provider `postgresql`, mapeamentos `snake_case` via `@map`/`@@map`. Enums: `UserRole` (planejador, cliente, tecnico_externo), `Cenpes` (cenpes_1, cenpes_2), `Prioridade` (baixa, normal, alta), `ChamadoStatus` (em_espera, em_progresso, concluido, recusado), `Criticidade` (baixa, normal, alta), `RescheduleStatus` (pendente, aprovado, recusado).

Modelos principais:
- **User** (`users`): username único, passwordHash (bcrypt), name, jobTitle, role, timestamps.
- **Setor** (`setores`): name único, cenpes (default cenpes_2), mapX/mapY opcionais, relação labs.
- **Lab** (`labs`): name único, location, idSetor opcional (onDelete SetNull), relações equipamentos/chamados/webhooks/rescheduleRequests.
- **Equipamento** (`equipamentos`): name, idLab (FK onDelete Cascade), localInstalacao?, gerencia?, criticidade (default normal), createdByUsername?, timestamps; `@@unique([name, idLab])`.
- **Chamado** (`chamados`): labId (FK), openedBy, machineName, description, priority, status, rejectionReason?, assignedToUsername?, comments.
- **ChamadoComment** (`chamado_comments`): chamadoId (FK onDelete Cascade), authorUsername, authorName, body, createdAt.
- **RescheduleRequest** (`reschedule_requests`): eventId, calendarId, labId?, requestedByName, reason, suggestedStart?/suggestedEnd?, status, decisionReason?, newStart?/newEnd?, decidedByUsername?, decidedAt?, timestamps.
- **Webhook** (`webhooks`): name, url, labId? (FK), enabled (default true), lastSentAt?.

> O schema completo está em `lib/db/prisma/schema.prisma` (copie-o integralmente; ele é a fonte da verdade).

---

## 8. Endpoints da API

Base: `http://localhost:3001/api`. Toda rota exige `actorUsername` e valida o papel.

- **Sistema**: `GET /healthz`, `GET /demo`
- **Auth**: `POST /auth/login`, `GET /auth/me`
- **Chamados**: `GET/POST /chamados`, `GET/PATCH/DELETE /chamados/:id`, `POST /chamados/:id/accept`, `/reject`, `/complete`, `GET/POST /chamados/:id/comments`, `GET /chamados/:id/history`
- **Remarcações**: `GET/POST /reschedule-requests`, `GET/PATCH/DELETE /reschedule-requests/:id`, `POST /reschedule-requests/:id/approve`, `/reject`, `GET /reschedule-requests/by-event/:eventId`
- **Webhooks/Teams**: `GET/POST /webhooks`, `GET/PATCH/DELETE /webhooks/:id`, `POST /webhooks/:id/test`, `GET/PATCH /teams/settings`, `POST /teams/daily-summary/test`
- **Calendar**: `GET/POST /calendar/events`, `PATCH/DELETE /calendar/events/:eventId`
- **Setores**: `GET /setores`, `PATCH /setores/:id/coords`
- **Inventário**: `GET /inventario/tree`, `GET /inventario/labs-allowed`, `POST /inventario/equipamentos` (e/ou `GET/POST /equipamentos`)
- **Configurações**: `GET/POST /configuracoes/setores`, `PATCH/DELETE /configuracoes/setores/:id`, `GET/POST /configuracoes/labs`, `GET/PATCH/DELETE /configuracoes/labs/:id`

---

## 9. Sequência de PROMPTS para recriar o projeto

Use os prompts abaixo **em ordem** com outra IA. Cada um assume que os anteriores foram concluídos. Sempre exija ao final: `pnpm typecheck` limpo.

### Prompt 0 — Bootstrap do monorepo

```
Crie um monorepo pnpm workspaces chamado "amu-kronus" (Node 20, pnpm 9.15.9, TypeScript 5.8 strict).
Estrutura: artifacts/api-server (@amu/api-server), artifacts/web (@amu/web),
lib/db (@amu/db), lib/api-spec (@amu/api-spec), lib/api-zod (@amu/api-zod),
lib/api-client-react (@amu/api-client-react).
Crie pnpm-workspace.yaml, tsconfig.base.json (strict: true), e o package.json raiz com os scripts:
dev (pnpm --parallel --filter @amu/api-server --filter @amu/web dev), typecheck (pnpm -r typecheck),
build, db:up (docker compose up -d postgres), db:down, db:reset, db:push, db:bootstrap, db:verify-seed, codegen.
Crie docker-compose.yml com postgres:16-alpine (container amu-postgres, porta 5433:5432,
user/password postgres, db amu, healthcheck pg_isready, volume nomeado).
Crie .env.example com DATABASE_URL=postgresql://postgres:postgres@localhost:5433/amu,
SESSION_SECRET, TEAMS_WEBHOOK_URL, TEAMS_WEBHOOK_URL_2, GOOGLE_CALENDAR_CLIENT_ID/SECRET/REFRESH_TOKEN.
```

### Prompt 1 — Pacote de banco (@amu/db) com Prisma

```
No pacote lib/db (@amu/db), configure Prisma (prisma ^6.5.0, @prisma/client ^6.5.0, dotenv-cli ^8).
Crie prisma/schema.prisma com provider postgresql (url = env DATABASE_URL), generator prisma-client-js,
e mapeamentos snake_case (@map/@@map). Defina os enums UserRole(planejador, cliente, tecnico_externo),
Cenpes(cenpes_1, cenpes_2), Prioridade(baixa, normal, alta),
ChamadoStatus(em_espera, em_progresso, concluido, recusado), Criticidade(baixa, normal, alta),
RescheduleStatus(pendente, aprovado, recusado).
Defina os modelos User, Setor, Lab, Equipamento, Chamado, ChamadoComment, RescheduleRequest, Webhook
exatamente como na seção "Schema do banco" deste guia (incluindo FKs, onDelete, @@unique e timestamps Timestamptz(6)).
Configure scripts: db:generate (prisma generate), db:push (dotenv -e ../../.env -- prisma db push),
postinstall (prisma generate). O src/index.ts deve reexportar @prisma/client.
```

### Prompt 2 — Servidor base (@amu/api-server)

```
No pacote artifacts/api-server (@amu/api-server, ESM, type: module), configure Express 5 + Prisma + pino.
Dependências: @prisma/client, bcryptjs, cors, dotenv, express ^5, node-cron, pino, pino-http, zod, @amu/db.
Dev: tsx, esbuild, typescript, @types/*.
Scripts: dev (tsx watch src/index.ts), build (esbuild CJS para dist/index.cjs, external pg-native),
typecheck, start, verify-seed (tsx src/verify-seed.ts), bootstrap (tsx src/bootstrap-cli.ts).
Crie: load-env.ts (carrega .env da raiz), db.ts (PrismaClient singleton, valida DATABASE_URL),
logger.ts (pino singleton), index.ts (entrypoint: roda bootstrap do banco e sobe Express na porta 3001 com cors e pino-http),
bootstrap.ts (aplica schema via prisma db push e roda os seeds), bootstrap-cli.ts.
Crie o middleware actor.ts (resolve actorUsername do body/query e popula req.actor com {username, name, role} via lookup em users)
e require-role.ts (requireRole(...roles) que retorna 403 se o papel não for permitido; 400 se faltar actorUsername).
Toda rota DEVE exigir actorUsername e validar papel. Use req.log nos handlers.
```

### Prompt 3 — Seeds e bootstrap

```
Implemente o seed em bootstrap.ts: senha padrão "kronus2026" (bcrypt). Crie 3 usuários:
planejador (Carlos Silva), cliente (Funcionário de Laboratório), tecnico_externo (Técnico Externo).
Crie setores distribuídos entre Cenpes 1 e Cenpes 2, e labs vinculados a setores.
Após criar os labs, insira ~40 equipamentos fictícios distribuídos entre labs de Cenpes 1 e Cenpes 2,
com criticidades variadas (use createMany com skipDuplicates). Exemplos de nomes: Autoclave 1, Centrífuga,
Estufa de Secagem, Compressor de Ar, Microscópio Óptico, Balança Analítica, Câmara Fria, Agitador Magnético,
Mesa Cirúrgica. Crie verify-seed.ts que consulta via Prisma e imprime contagens.
```

### Prompt 4 — Auth + papéis

```
Implemente routes/auth.ts: POST /auth/login (valida username/senha com bcrypt; em sucesso retorna o usuário
sem hash) e GET /auth/me (recebe actorUsername e retorna o usuário). Não use sessão/JWT persistente:
o estado de auth fica em memória no frontend. Garanta mensagens de erro em pt-BR.
```

### Prompt 5 — Chamados (tickets)

```
Implemente routes/chamados.ts (Prisma + Zod): 
GET /chamados (filtros por papel: cliente vê os próprios; tecnico_externo vê a fila; planejador vê tudo),
POST /chamados, GET/PATCH/DELETE /chamados/:id,
POST /chamados/:id/accept, /reject (com motivo), /complete — transições ATÔMICAS
(UPDATE ... WHERE id=? AND status=<esperado>, retornando 409 em corrida),
GET/POST /chamados/:id/comments e GET /chamados/:id/history.
Prioridade em semáforo (baixa/normal/alta). Dispare notificação Teams nas mudanças de status (ver Prompt 9).
```

### Prompt 6 — Calendar + Agenda

```
Implemente services/calendar-service.ts com integração Google Calendar (googleapis OU fetch),
com FALLBACK para dados mock/seed quando não houver credenciais (eventos por lab, com summary
"Lab {id} - {descrição}", maintenanceType preventiva|corretiva, status). 
Implemente routes/calendar.ts: GET/POST /calendar/events, PATCH/DELETE /calendar/events/:eventId.
No frontend, crie a página /agenda (planejador edita; cliente vê cards não clicáveis) com seletor de
laboratório (Lab 1..N), visões mês/semana, datas em pt-BR.
```

### Prompt 7 — Remarcações (reschedule)

```
Implemente routes/reschedule-requests.ts (Prisma + Zod):
GET/POST /reschedule-requests, GET/PATCH/DELETE /:id, GET /by-event/:eventId,
POST /:id/approve e POST /:id/reject.
A APROVAÇÃO deve rodar em transação com SELECT ... FOR UPDATE no registro; chamar o Google Calendar
DENTRO do lock; se o Calendar falhar, rollback (retornar 502). Use status atômico (pendente -> aprovado/recusado),
409 se não estiver pendente. Ao aprovar/recusar, dispare notificação Teams para o webhook do lab_id (ver Prompt 9).
No frontend crie /reschedules (planejador) e o diálogo de solicitação (cliente).
```

### Prompt 8 — Inventário de equipamentos

```
Implemente o módulo de Inventário. Backend (routes/inventario.ts e/ou equipamentos.ts):
GET /inventario/tree (árvore Cenpes -> Setor -> Lab com equipamentos; planejador vê tudo com filtros
cenpes/idSetor/idLab/q; cliente é obrigado a passar idLab, senão 400; tecnico_externo 403),
GET /inventario/labs-allowed, POST /inventario/equipamentos (ou GET/POST /equipamentos):
valida Zod (name obrigatório máx 120, idLab inteiro positivo, criticidade enum default normal,
localInstalacao/gerencia opcionais máx 120), 400 se lab não existe, 201 com o item criado.
Frontend /inventario: React Query; planejador com tabs Geral/Cenpes 1/Cenpes 2, selects de setor/lab
filtrados e busca com debounce 300ms; cliente só escolhe o próprio lab. Lista agrupada em árvore com
headers; badge de criticidade em semáforo (baixa verde, normal amarelo, alta vermelho); estado vazio
com ícone Archive; loading com skeletons; diálogo de criação (Dialog no desktop, Sheet bottom no mobile).
Tecnico externo é redirecionado. Item "Inventário" só aparece para planejador e cliente.
```

### Prompt 9 — Teams: webhooks e notificações

```
Implemente services/teams-notifier.ts, teams-settings.ts, daily-summary-job.ts e routes/webhooks.ts + teams.ts.
- Webhooks (CRUD): GET/POST /webhooks, GET/PATCH/DELETE /webhooks/:id, POST /webhooks/:id/test.
  Ao criar/editar, validar que labId existe (400 se não). Permitir vincular webhook a um lab_id específico.
- Envio dual-format: detectar a URL. Para connector clássico (webhook.office.com) enviar MessageCard
  (com themeColor); para Workflows/Power Automate (logic.azure.com) enviar Adaptive Card (type message).
  Tratar erros do Teams: 403/401 -> mensagem orientando gerar nova URL no app Workflows; 429 -> throttling.
- Notificação de remarcação (aprovada/recusada) deve ir para o webhook do lab_id. Formato da mensagem:
  aprovado: titulo "✅ Remarcação aprovada", "Um pedido de remarcação foi aprovado.",
            "📍 Setor: {lab}", "🔧 Manutenção {Corretiva|Preventiva} - {equipamento}", "Motivo:", "{motivo}",
            "📅 Data: {data por extenso pt-BR}", "🕐 Horário: {HH}h{MM} às {HH}h{MM}".
  recusado: titulo "❌ Remarcação recusada", "Um pedido de remarcação foi recusado.",
            "📍 Setor: {lab}", "🔧 Manutenção {tipo} - {equipamento}", "Motivo:", "{motivo}",
            "⚠️ Recusado", "Pesquisador: {motivo da recusa}".
- Resumo diário (node-cron, 07:00): GET/PATCH /teams/settings (liga/desliga) e POST /teams/daily-summary/test.
- Frontend /teams: criar webhook (com select de lab), ativar/desativar, testar disparo (toast de sucesso/erro),
  e EXCLUIR webhook (com diálogo de confirmação AlertDialog). Adicionar variant "destructive" no Button.
```

### Prompt 10 — Setores e Configurações

```
Implemente routes/setores.ts (GET /setores, PATCH /setores/:id/coords para mapX/mapY) e
routes/configuracoes.ts (CRUD de setores e labs: GET/POST /configuracoes/setores,
PATCH/DELETE /configuracoes/setores/:id, GET/POST /configuracoes/labs, GET/PATCH/DELETE /configuracoes/labs/:id).
Apenas planejador. Frontend /configuracoes com listas e diálogos de criação/edição/remoção (AlertDialog).
```

### Prompt 11 — Frontend base (shell, auth, roteamento)

```
No pacote artifacts/web (@amu/web), configure React 18 + Vite 6 + TypeScript + Tailwind 3 + shadcn/ui.
Dependências conforme a seção "Stack". Configure Tailwind com a paleta (primário #3F7D3A, fundo #F6F8F5,
borda #E5E7EB, rounded-2xl, fonte Inter) e tailwindcss-animate. Proxy /api -> http://localhost:3001 no vite.config.
Crie lib/api.ts (apiGet/apiPost/apiPatch/apiDelete que injetam actorUsername; tratam erro JSON em pt-BR),
lib/auth.tsx (estado em memória, sem localStorage; limpa o cache do React Query no login e logout),
lib/roles.ts, components/role-gate.tsx (proteção por papel), components/layout.tsx (sidebar no desktop,
bottom nav no mobile; itens por papel), components/amu-logo.tsx (logo AMU verde com cadeado no "A"),
e os componentes shadcn em components/ui (button com variant destructive, input, label, skeleton,
alert-dialog, dialog, sheet). Toasts via sonner.
Crie as páginas e o roteamento (wouter) conforme "Telas por papel". Login em /login. Reload exige novo login.
```

### Prompt 12 — Contrato de API (OpenAPI + Orval) [opcional]

```
No lib/api-spec, crie openapi.yaml (title "AMU / Kronus API") cobrindo todos os endpoints e schemas.
Configure orval.config.ts para gerar: schemas Zod em @amu/api-zod e hooks React Query em @amu/api-client-react
(com custom-fetch). Script codegen: orval --config orval.config.ts && node fix-orval-imports.mjs.
```

### Prompt 13 — Scanner QR e telas restantes

```
Implemente /scan (tecnico_externo) usando html5-qrcode para ler QR de lab e navegar para /lab/:id.
Use qrcode.react onde for necessário gerar QR. Implemente /lab/:id (detalhes do lab + equipamentos + histórico),
/overview (planejador, read-only com mapa/radar de setores), /perfil, /event/new e /event/:id.
```

### Prompt 14 — Verificação final

```
Rode pnpm typecheck (deve passar limpo em todos os pacotes). Rode o fluxo completo:
pnpm db:up && pnpm db:push && pnpm db:bootstrap && pnpm dev.
Valide: login com os 3 papéis (senha kronus2026); planejador vê inventário com ~40 itens agrupados em árvore,
filtra por Cenpes 2, busca "Autoclave", cria equipamento com criticidade Alta; cliente abre chamado e
solicita remarcação; planejador aprova/recusa e a notificação Teams é disparada para o webhook do lab.
Critérios de erro: GET sem actorUsername -> 400; papel não autorizado -> 403; transições em corrida -> 409.
```

---

## 10. Observações importantes (lições do projeto)

- **Webhooks do Teams**: URLs de **connector clássico** (`webhook.office.com/.../IncomingWebhook/...`) foram
  aposentadas pela Microsoft e retornam **403** mesmo bem formadas. Use o app **Workflows (Power Automate)**
  → modelo "Post to a channel when a webhook request is received" → URL `*.logic.azure.com/.../workflows/...`.
  O backend detecta o formato e envia MessageCard (clássico) ou Adaptive Card (Workflows).
- **Prisma + merges**: após mudar `schema.prisma`, rode `prisma generate` (e `db push`) — o servidor TS do
  editor pode manter cache antigo dos tipos do Prisma; confie no `tsc --noEmit` por linha de comando.
- **db push e dados existentes**: tornar uma coluna NOT NULL com linhas NULL existentes falha; mantenha campos
  opcionais (`String?`) quando o seed/admin puder deixá-los vazios.
- **Portas**: API 3001, Web 5173 (Vite pode subir em 5174/5175 se ocupada — force 5173 se necessário).
```
