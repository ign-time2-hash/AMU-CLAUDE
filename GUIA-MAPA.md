# Implementar Visão Geral com Mapas 3D — Cenpes 1, Cenpes 2 e Cards

## Contexto

O sistema AMU é um app de gestão de manutenção. A página `/overview` (Visão Geral) mostra um mapa interativo das instalações com marcadores nos setores. O usuário pode alternar entre dois cenpes (Cenpes 1 e Cenpes 2) e entre a visualização de mapa e cards.

---

## Estrutura de dados existente

O banco possui três tabelas relevantes:

**mapas** — uma row por cenpes. Campos: `id`, `slug` (`cenpes-1` | `cenpes-2`), `name` (`Cenpes 1` | `Cenpes 2`), `image_path`, timestamps.

**setores** — áreas físicas de cada cenpes. Campos: `id`, `id_mapa` (FK para mapas), `name` (ex: `Setor 1`), `cenpes` (`cenpes_1` | `cenpes_2`), `map_x` (double, 0–100, nullable), `map_y` (double, 0–100, nullable), timestamps. O par `(id_mapa, name)` é único — "Setor 1" pode existir tanto no Cenpes 1 quanto no Cenpes 2 como rows distintas.

**labs** — laboratórios. Campos: `id`, `name`, `id_setor` (FK nullable para setores, onDelete SetNull), `location`, timestamps.

---

## Rotas de API necessárias

### GET /api/mapas

Retorna todos os mapas ordenados por id.

```json
{ "items": [ { "id", "slug", "name", "imagePath", "createdAt", "updatedAt" } ] }
```

### GET /api/setores

Query param opcional: `mapaId` (int). Se informado, filtra setores do mapa. Retorna:

```json
{ "items": [ { "id", "idMapa", "name", "cenpes", "mapX", "mapY", "createdAt", "updatedAt" } ] }
```

### PATCH /api/setores/:id/coords

Body: `{ actorUsername: string, mapX: number | null, mapY: number | null }`. Apenas papel `planejador`. Persiste a posição do marcador no banco (valores 0–100 clamped). Retorna o setor atualizado.

### Seed inicial

Ao inicializar o servidor, garantir que existam as duas rows em `mapas` (`cenpes-1` e `cenpes-2`) e 8 setores por cenpes (Setor 1 a Setor 8), idempotente com advisory lock.

---

## Página `/overview` — Overview.tsx

### Estado e lógica principal

```ts
const [activeMapaSlug, setActiveMapaSlug] = useState<'cenpes-2' | 'cenpes-1'>('cenpes-2')
const [mode, setMode] = useState<'map' | 'cards'>('map')
const [activeSetorId, setActiveSetorId] = useState<number | null>(null)
const [editMode, setEditMode] = useState(false)
const [pendingCoords, setPendingCoords] = useState<
  Record<number, { x: number; y: number } | 'reset' | undefined>
>({})
const mapRef = useRef<HTMLDivElement | null>(null)
const draggingRef = useRef<{ pointerId: number; setorId: number } | null>(null)
```

- Busca todos os mapas com `GET /api/mapas` e todos os setores com `GET /api/setores`.
- Filtra os setores pelo `activeMapa.id` para obter os setores do mapa ativo.
- Busca labs de `GET /api/labs`.
- Agrupa labs por `idSetor` em um `Map<number, Lab[]>` para uso no popover.
- Para estatísticas de manutenção: busca eventos do Google Calendar de hoje até 32 dias à frente, filtra por `event.location` contendo o nome do lab, conta total e detecta se algum é CORRETIVA (tem "corretiva" no summary).

---

## Coordenadas dos marcadores

Defina coordenadas estáticas de fallback para cada mapa/setor como um objeto aninhado, chaveado por `mapa.slug` e depois pelo ordinal numérico do setor (ex: "Setor 3" → 3).

### cenpes-2 (vista 3D aérea)

| Setor | x% | y% |
|-------|----|----|
| 1     | 36 | 10 |
| 2     | 13 | 27 |
| 3     | 23 | 34 |
| 4     | 27 | 40 |
| 5     | 30 | 47 |
| 6     | 33 | 54 |
| 7     | 50 | 22 |
| 8     | 63 | 28 |

### cenpes-1 (edifício radial em perspectiva, sentido horário a partir do topo)

| Setor | x% | y% |
|-------|----|----|
| 1     | 52 | 15 |
| 2     | 66 | 19 |
| 3     | 73 | 32 |
| 4     | 70 | 46 |
| 5     | 60 | 60 |
| 6     | 38 | 60 |
| 7     | 24 | 43 |
| 8     | 32 | 22 |

### cenpes-2-2d (planta baixa mobile)

| Setor | x% | y% |
|-------|----|----|
| 1     | 58 | 22 |
| 2     | 25 | 16 |
| 3     | 23 | 24 |
| 4     | 24 | 33 |
| 5     | 25 | 42 |
| 6     | 54 | 32 |
| 7     | 54 | 39 |
| 8     | 55 | 50 |

### cenpes-1-2d (planta baixa mobile — radial top-down)

| Setor | x% | y% |
|-------|----|----|
| 1     | 38 | 13 |
| 2     | 58 | 25 |
| 3     | 65 | 52 |
| 4     | 58 | 75 |
| 5     | 35 | 82 |
| 6     | 22 | 70 |
| 7     | 13 | 45 |
| 8     | 20 | 22 |

### Função resolveCoord(setor, index, total)

Precedência:
1. Override local `pendingCoords[setor.id]` se não for `'reset'` → usa o override.
2. `pendingCoords[setor.id] === 'reset'` → usa o fallback estático.
3. `setor.mapX` e `setor.mapY` não são null → usa os valores do banco.
4. Caso contrário → usa o fallback estático.

---

## Imagens dos mapas

Importe as imagens como assets estáticos. No desktop sempre usa a 3D; no mobile usa a 2D quando disponível.

```ts
const MAPA_IMAGES: Record<string, string> = {
  'cenpes-2': cenpes2MapImage,   // foto 3D aérea
  'cenpes-1': cenpes1MapImage,
}
const MAPA_IMAGES_2D: Record<string, string> = {
  'cenpes-2': cenpes2PlanImage,  // planta baixa
  'cenpes-1': cenpes1PlanImage,
}
```

As duas imagens fornecidas são:
- **Cenpes 2** — a primeira imagem anexada ao projeto.
- **Cenpes 1** — a segunda imagem anexada ao projeto.

Salve-as em `src/assets/` com os nomes `cenpes2-map.png` e `cenpes1-map.png`.

---

## Header da página

**Esquerda:** título "Visão Geral" + subtítulo "Selecione um setor para ver os laboratórios".

**Direita:** dois grupos de pills (`role="tablist"` / `role="tab"`):

### Grupo 1 — seletor de mapa
Visível quando há mais de um mapa. Um pill por mapa. Selecionado: fundo branco + sombra. Não selecionado: texto muted. Cada pill exibe o ícone/logo do cenpes correspondente. Ao clicar: `setActiveMapaSlug(mapa.slug)` e reseta `activeSetorId` para null.

### Grupo 2 — seletor de modo
Visível no desktop sempre; no mobile apenas quando há imagem 2D disponível para o mapa ativo.
- Pill **"Mapa"** com ícone `Map`.
- Pill **"Cards"** com ícone `LayoutGrid`.

### Botões de edição (apenas papel `planejador`)
- `editMode = false` → botão outline com ícone `Move` e texto "Reposicionar".
- `editMode = true` → botão "Restaurar padrão" (ícone `RotateCcw`) + botão primário "Concluir" (ícone `Check`). "Restaurar padrão" só aparece quando `activeMapaHasOverrides` for true.

---

## Strip de resumo

Três métricas em linha abaixo do header, separadas por divisórias verticais:

| Métrica | Valor |
|---------|-------|
| Setores | contagem dos setores do mapa ativo |
| Laboratórios | labs com `idSetor` pertencente ao mapa ativo |
| Manutenções | soma de eventos de manutenção de todos os labs do mapa ativo (próximos 32 dias) |

---

## Modo Mapa

### Container

- `aspect-ratio: 16/9` no desktop.
- `aspect-ratio: 3/4` no mobile 2D do Cenpes 2; `5/4` no mobile 2D do Cenpes 1.
- Fundo: `linear-gradient(135deg, #f8fafc 0%, #eef2f7 50%, #e6ecf5 100%)`.
- `rounded-3xl`, sombra suave.
- Em `editMode`: `ring-2 ring-primary/20` + faixa flutuante "Arraste os pontos para reposicioná-los".

### Imagem

`object-contain`, `pointer-events-none`, `select-none`, ocupa todo o container.

### Marcador por setor

Um `<button>` absoluto para cada setor, posicionado com:

```css
left: x%;
top: y%;
transform: translate(-50%, -50%);
z-index: 30 (ativo) | 1 (inativo);
```

**Camadas visuais (de fora para dentro):**

1. **Halo pulsante** — `animate-ping`, opacity 70%, `rounded-full`. Vermelho se o setor tem CORRETIVA, azul-primário caso contrário.
2. **Glow difuso** — `blur-md`, mesma cor, `-m-2`.
3. **Ponto central** — `h-4 w-4 rounded-full border-2 border-white`. Ao hover/focus: `scale-[1.35]`. Ativo: `scale-[1.35]` + ring.

**Interações:**

- **Hover (desktop):** abre o popover do setor.
- **Click:** toggle do popover.
- **editMode:** cursor `grab`. `onPointerDown` inicia drag com `setPointerCapture`. `onPointerMove` atualiza `pendingCoords` sem chamar a API. `onPointerUp` / `onPointerCancel` finaliza e chama `PATCH /api/setores/:id/coords`. Usar `writeSeqRef` por setor para ignorar respostas fora de ordem.

### Popover do setor

Card flutuante absoluto, `min-w-[180px] max-w-[220px]`.

**Posição vertical:**
- `y < 55%` → renderiza abaixo do marcador.
- `y >= 55%` → renderiza acima.

**Alinhamento horizontal:**
- `x < 28%` → alinha à esquerda.
- `x > 72%` → alinha à direita.
- Caso contrário → centralizado.

**Conteúdo:**
- Nome do setor em negrito.
- Lista de labs: ícone `MapPin` + nome + badge de contagem de manutenções (se > 0). Cada item clicável → navega para `/lab/:id`.
- Se nenhum lab: "Nenhum laboratório neste setor" em texto muted.
- Mantém aberto enquanto o mouse está sobre o popover.

**Clicar no fundo do mapa (fora de marcadores):** `setActiveSetorId(null)`.

---

## Modo Cards

Grid de cards, um por setor.

- Desktop: `grid-cols-3 lg:grid-cols-4`.
- Mobile: `grid-cols-1 sm:grid-cols-2`.

### Card de setor

- **Header:** nome do setor + badge total de manutenções.
- **Alerta CORRETIVA:** se algum lab do setor tem manutenção CORRETIVA → borda `border-red-200` + ícone `AlertTriangle` vermelho.
- **Lista de labs:** ícone `Activity` + nome + badge de manutenções. Clicável → `/lab/:id`.
- **Rodapé:** texto muted "N laboratório(s)".
- **Estado vazio:** "Nenhum laboratório" em itálico muted.

---

## Resetar posições — função resetCoordsForMapa(mapaId)

1. Filtra setores do mapa ativo com `mapX` ou `mapY` não nulos.
2. Marca todos otimisticamente como `'reset'` em `pendingCoords`.
3. Para cada um, chama `PATCH /api/setores/:id/coords` com `{ mapX: null, mapY: null }`.
4. Em sucesso: invalida a query de setores e remove o override de `pendingCoords`.
5. Em erro: remove o override (reverte o visual).

`activeMapaHasOverrides` é true quando ao menos um setor do mapa ativo tem `mapX`/`mapY` persistidos no banco.

---

## Tipagem TypeScript

```ts
type ViewMode = 'map' | 'cards'

type Mapa = {
  id: number
  slug: string
  name: string
  imagePath: string
}

type Setor = {
  id: number
  idMapa: number
  name: string
  cenpes: string
  mapX: number | null
  mapY: number | null
}

type Lab = {
  id: number
  name: string
  location: string
  idSetor: number | null
}

type LabEventStats = {
  count: number
  hasCorretiva: boolean
}
```

---

## Critério de aceitação

- [ ] Acessar `/overview` como planejador → ver mapa 3D do Cenpes 2 com 8 marcadores pulsantes sobre os corredores.
- [ ] Hover em um marcador → popover com lista de labs e contagem de manutenções.
- [ ] Clicar num lab no popover → navega para `/lab/:id`.
- [ ] Alternar para Cenpes 1 → mapa muda para o edifício radial com 8 marcadores reposicionados nos spokes.
- [ ] Alternar para Cards → grid com labs agrupados por setor e badges de manutenção.
- [ ] Ativar "Reposicionar" → arrastar marcador → soltar → coordenadas persistidas no banco → ao recarregar, marcador aparece na posição salva.
- [ ] "Restaurar padrão" → todos os marcadores voltam às posições estáticas de fallback.
- [ ] No mobile → mapa exibe a planta baixa 2D em vez da imagem 3D aérea.
- [ ] Setor com manutenção CORRETIVA → halo vermelho no marcador e borda vermelha no card.
- [ ] `typecheck` sem erros.


