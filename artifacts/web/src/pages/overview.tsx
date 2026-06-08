import { useState, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  Map as MapIcon, LayoutGrid, Move, RotateCcw, Check, MapPin, Activity, AlertTriangle,
} from 'lucide-react';
import { apiGet, apiPatch } from '../lib/api.js';
import { useAuth } from '../lib/auth.js';
import { Button } from '../components/ui/button.js';
import { cn } from '../lib/utils.js';

type ViewMode = 'map' | 'cards';

type Mapa = {
  id: number;
  slug: string;
  name: string;
  imagePath: string;
};

type Setor = {
  id: number;
  idMapa: number;
  name: string;
  cenpes: string;
  mapX: number | null;
  mapY: number | null;
  labs: Lab[];
};

type Lab = {
  id: number;
  name: string;
  location: string;
  idSetor: number | null;
};

type CalendarEvent = {
  id: string;
  summary: string;
  labId?: number;
  maintenanceType: 'preventiva' | 'corretiva';
  start: string;
  end: string;
};

type LabEventStats = { count: number; hasCorretiva: boolean };

type PendingCoord = { x: number; y: number } | 'reset';

const FALLBACK_COORDS: Record<string, Record<number, { x: number; y: number }>> = {
  'cenpes-2': {
    1: { x: 36, y: 10 }, 2: { x: 13, y: 27 }, 3: { x: 23, y: 34 },
    4: { x: 27, y: 40 }, 5: { x: 30, y: 47 }, 6: { x: 33, y: 54 },
    7: { x: 50, y: 22 }, 8: { x: 63, y: 28 },
  },
  'cenpes-1': {
    1: { x: 52, y: 15 }, 2: { x: 66, y: 19 }, 3: { x: 73, y: 32 },
    4: { x: 70, y: 46 }, 5: { x: 60, y: 60 }, 6: { x: 38, y: 60 },
    7: { x: 24, y: 43 }, 8: { x: 32, y: 22 },
  },
  'cenpes-2-2d': {
    1: { x: 58, y: 22 }, 2: { x: 25, y: 16 }, 3: { x: 23, y: 24 },
    4: { x: 24, y: 33 }, 5: { x: 25, y: 42 }, 6: { x: 54, y: 32 },
    7: { x: 54, y: 39 }, 8: { x: 55, y: 50 },
  },
  'cenpes-1-2d': {
    1: { x: 38, y: 13 }, 2: { x: 58, y: 25 }, 3: { x: 65, y: 52 },
    4: { x: 58, y: 75 }, 5: { x: 35, y: 82 }, 6: { x: 22, y: 70 },
    7: { x: 13, y: 45 }, 8: { x: 20, y: 22 },
  },
};

const MAPA_IMAGES: Record<string, string> = {
  'cenpes-1': '/maps/cenpes-1-map-v2-transparent.png',
  'cenpes-2': '/maps/cenpes-1-map-transparent.png',
};

const MAPA_IMAGES_2D: Record<string, string> = {
  'cenpes-1': '/maps/cenpes-1-map-v2.png',
  'cenpes-2': '/maps/cenpes-1-map.png',
};

function getSetorOrdinal(name: string): number {
  const m = name.match(/\d+/);
  return m ? parseInt(m[0]) : 1;
}

function SetorPopover({
  setor,
  labs,
  eventStatsByLabId,
  coord,
  onMouseEnter,
  onMouseLeave,
}: {
  setor: Setor;
  labs: Lab[];
  eventStatsByLabId: Map<number, LabEventStats>;
  coord: { x: number; y: number };
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const above = coord.y >= 55;
  const alignLeft = coord.x < 28;
  const alignRight = coord.x > 72;

  return (
    <div
      className={cn(
        'absolute z-40 min-w-[180px] max-w-[220px] rounded-xl border border-border bg-card shadow-lg p-3 space-y-2',
        above ? 'bottom-full mb-3' : 'top-full mt-3',
        alignLeft ? 'left-0' : alignRight ? 'right-0' : 'left-1/2 -translate-x-1/2',
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <p className="font-semibold text-sm text-foreground">{setor.name}</p>
      {labs.length > 0 ? (
        <div className="space-y-1">
          {labs.map((l) => {
            const stats = eventStatsByLabId.get(l.id);
            return (
              <Link
                key={l.id}
                href={`/agenda?labId=${l.id}`}
                className="flex items-center gap-2 text-xs hover:text-primary transition-colors"
              >
                <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{l.name}</span>
                {stats && stats.count > 0 && (
                  <span className="rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[10px]">
                    {stats.count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Nenhum laboratório neste setor</p>
      )}
    </div>
  );
}

export function OverviewPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeMapaSlug, setActiveMapaSlug] = useState('cenpes-2');
  const [mode, setMode] = useState<ViewMode>('map');
  const [activeSetorId, setActiveSetorId] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<Record<number, PendingCoord | undefined>>({});
  const mapRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<{ pointerId: number; setorId: number } | null>(null);
  const writeSeqRef = useRef<Record<number, number>>({});
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openSetor(id: number) {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setActiveSetorId(id);
  }

  function scheduleCloseSetor() {
    closeTimerRef.current = setTimeout(() => setActiveSetorId(null), 180);
  }

  function cancelCloseSetor() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Queries
  const { data: mapas } = useQuery({
    queryKey: ['mapas'],
    queryFn: () => apiGet<Mapa[]>('/api/mapas'),
  });

  const { data: allSetores } = useQuery({
    queryKey: ['setores'],
    queryFn: () => apiGet<Setor[]>('/api/setores'),
  });

  const { data: events } = useQuery({
    queryKey: ['calendar-events'],
    queryFn: () => apiGet<CalendarEvent[]>('/api/calendar/events'),
  });

  // Derived
  const activeMapa = mapas?.find((m) => m.slug === activeMapaSlug);

  const activeSetores = useMemo(
    () => allSetores?.filter((s) => s.idMapa === activeMapa?.id) ?? [],
    [allSetores, activeMapa],
  );

  const labsBySetorId = useMemo(() => {
    const map = new Map<number, Lab[]>();
    activeSetores.forEach((s) => {
      if (s.labs.length > 0) map.set(s.id, s.labs);
    });
    return map;
  }, [activeSetores]);

  const now = Date.now();
  const horizon = now + 32 * 86400000;

  const eventStatsByLabId = useMemo((): Map<number, LabEventStats> => {
    const map = new Map<number, LabEventStats>();
    events?.forEach((ev) => {
      const t = new Date(ev.start).getTime();
      if (t < now || t > horizon || ev.labId == null) return;
      const prev = map.get(ev.labId) ?? { count: 0, hasCorretiva: false };
      map.set(ev.labId, {
        count: prev.count + 1,
        hasCorretiva: prev.hasCorretiva || ev.maintenanceType === 'corretiva',
      });
    });
    return map;
  }, [events]);

  const activeLabIds = useMemo(() => {
    const ids = new Set<number>();
    activeSetores.forEach((s) => s.labs.forEach((l) => ids.add(l.id)));
    return ids;
  }, [activeSetores]);

  const totalManutencoes = useMemo(() => {
    let count = 0;
    activeLabIds.forEach((id) => { count += eventStatsByLabId.get(id)?.count ?? 0; });
    return count;
  }, [activeLabIds, eventStatsByLabId]);

  const activeMapaHasOverrides = activeSetores.some((s) => s.mapX != null || s.mapY != null);

  // Image & aspect
  const has2D = !!MAPA_IMAGES_2D[activeMapaSlug];
  const mapImage = isMobile && has2D
    ? MAPA_IMAGES_2D[activeMapaSlug]
    : MAPA_IMAGES[activeMapaSlug];
  const fallbackKey = isMobile && has2D ? `${activeMapaSlug}-2d` : activeMapaSlug;
  const aspectClass = isMobile
    ? activeMapaSlug === 'cenpes-2' ? 'aspect-[3/4]' : 'aspect-[5/4]'
    : 'aspect-video';

  // Coord resolution
  function resolveCoord(setor: Setor): { x: number; y: number } {
    const pending = pendingCoords[setor.id];
    const fallback = FALLBACK_COORDS[fallbackKey]?.[getSetorOrdinal(setor.name)] ?? { x: 50, y: 50 };
    if (pending !== undefined && pending !== 'reset') return pending;
    if (pending === 'reset') return fallback;
    if (setor.mapX != null && setor.mapY != null) return { x: setor.mapX, y: setor.mapY };
    return fallback;
  }

  // Drag handlers
  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>, setorId: number) {
    if (!editMode) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = { pointerId: e.pointerId, setorId };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>, setorId: number) {
    if (!editMode || !draggingRef.current || draggingRef.current.setorId !== setorId) return;
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setPendingCoords((p) => ({ ...p, [setorId]: { x, y } }));
  }

  async function handlePointerUp(setorId: number) {
    if (!draggingRef.current || draggingRef.current.setorId !== setorId) return;
    draggingRef.current = null;
    const pending = pendingCoords[setorId];
    if (!pending || pending === 'reset') return;
    const seq = (writeSeqRef.current[setorId] ?? 0) + 1;
    writeSeqRef.current[setorId] = seq;
    try {
      await apiPatch(`/api/setores/${setorId}/coords`, { mapX: pending.x, mapY: pending.y });
      if (writeSeqRef.current[setorId] === seq) {
        queryClient.invalidateQueries({ queryKey: ['setores'] });
        setPendingCoords((p) => { const n = { ...p }; delete n[setorId]; return n; });
      }
    } catch { /* optimistic — silent fail */ }
  }

  async function resetCoordsForMapa() {
    const toReset = activeSetores.filter((s) => s.mapX != null || s.mapY != null);
    setPendingCoords((p) => ({
      ...p,
      ...Object.fromEntries(toReset.map((s) => [s.id, 'reset' as const])),
    }));

    await Promise.all(
      toReset.map((s) =>
        apiPatch(`/api/setores/${s.id}/coords`, { mapX: null, mapY: null })
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['setores'] });
            setPendingCoords((p) => { const n = { ...p }; delete n[s.id]; return n; });
          })
          .catch(() => {
            setPendingCoords((p) => { const n = { ...p }; delete n[s.id]; return n; });
          }),
      ),
    );
  }

  function getSetorStats(setor: Setor) {
    let totalCount = 0;
    let hasCorretiva = false;
    setor.labs.forEach((l) => {
      const stats = eventStatsByLabId.get(l.id);
      if (stats) { totalCount += stats.count; hasCorretiva = hasCorretiva || stats.hasCorretiva; }
    });
    return { labs: setor.labs, totalCount, hasCorretiva };
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Visão Geral</h1>
          <p className="text-sm text-muted-foreground">Selecione um setor para ver os laboratórios.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Mapa selector */}
          {mapas && mapas.length > 1 && (
            <div role="tablist" className="flex rounded-xl border border-border bg-muted p-0.5 gap-0.5">
              {mapas.map((mapa) => (
                <button
                  key={mapa.slug}
                  role="tab"
                  aria-selected={activeMapaSlug === mapa.slug}
                  onClick={() => {
                    setActiveMapaSlug(mapa.slug);
                    setActiveSetorId(null);
                    setEditMode(false);
                    setPendingCoords({});
                  }}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    activeMapaSlug === mapa.slug
                      ? 'bg-white dark:bg-card shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {mapa.name}
                </button>
              ))}
            </div>
          )}

          {/* Mode selector — sempre no desktop; no mobile só se tiver 2D */}
          {(!isMobile || has2D) && (
            <div role="tablist" className="flex rounded-xl border border-border bg-muted p-0.5 gap-0.5">
              {(
                [
                  { value: 'map' as ViewMode, icon: <MapIcon className="h-3.5 w-3.5" />, label: 'Mapa' },
                  { value: 'cards' as ViewMode, icon: <LayoutGrid className="h-3.5 w-3.5" />, label: 'Cards' },
                ]
              ).map((m) => (
                <button
                  key={m.value}
                  role="tab"
                  aria-selected={mode === m.value}
                  onClick={() => setMode(m.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    mode === m.value
                      ? 'bg-white dark:bg-card shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {m.icon}{m.label}
                </button>
              ))}
            </div>
          )}

          {/* Edição de posição — planejador, modo mapa */}
          {user?.role === 'planejador' && mode === 'map' && (
            editMode ? (
              <div className="flex gap-2">
                {activeMapaHasOverrides && (
                  <Button size="sm" variant="outline" onClick={resetCoordsForMapa}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />Restaurar padrão
                  </Button>
                )}
                <Button size="sm" onClick={() => { setEditMode(false); setPendingCoords({}); }}>
                  <Check className="h-3.5 w-3.5 mr-1" />Concluir
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
                <Move className="h-3.5 w-3.5 mr-1" />Reposicionar
              </Button>
            )
          )}
        </div>
      </div>

      {/* Strip de resumo */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex divide-x divide-border">
          {[
            { label: 'Setores', value: activeSetores.length },
            { label: 'Laboratórios', value: activeLabIds.size },
            { label: 'Manutenções', value: totalManutencoes },
          ].map((s) => (
            <div key={s.label} className="flex-1 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Modo Mapa */}
      {mode === 'map' && (
        <div
          ref={mapRef}
          className={cn(
            'relative rounded-3xl overflow-hidden shadow-sm',
            aspectClass,
            editMode && 'ring-2 ring-primary/20',
          )}
          style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #eef2f7 50%, #e6ecf5 100%)' }}
          onClick={() => setActiveSetorId(null)}
        >
          {editMode && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-primary/90 text-primary-foreground text-xs px-3 py-1.5 rounded-full pointer-events-none whitespace-nowrap">
              Arraste os pontos para reposicioná-los
            </div>
          )}

          <img
            src={mapImage}
            alt={activeMapa?.name ?? 'Mapa'}
            className="w-full h-full object-contain pointer-events-none select-none"
            draggable={false}
          />

          {activeSetores.map((setor) => {
            const coord = resolveCoord(setor);
            const hasCorretiva = setor.labs.some((l) => eventStatsByLabId.get(l.id)?.hasCorretiva);
            const isActive = activeSetorId === setor.id;
            const dotColor = hasCorretiva ? 'bg-red-500' : 'bg-primary';

            return (
              <div
                key={setor.id}
                className="absolute"
                style={{
                  left: `${coord.x}%`,
                  top: `${coord.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: isActive ? 30 : 10,
                }}
                onMouseEnter={() => { if (!editMode) openSetor(setor.id); }}
                onMouseLeave={() => { if (!editMode) scheduleCloseSetor(); }}
              >
                {isActive && !editMode && (
                  <SetorPopover
                    setor={setor}
                    labs={labsBySetorId.get(setor.id) ?? []}
                    eventStatsByLabId={eventStatsByLabId}
                    coord={coord}
                    onMouseEnter={cancelCloseSetor}
                    onMouseLeave={scheduleCloseSetor}
                  />
                )}

                <button
                  className={cn(
                    'relative focus:outline-none group',
                    editMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!editMode) setActiveSetorId(isActive ? null : setor.id);
                  }}
                  onPointerDown={(e) => handlePointerDown(e, setor.id)}
                  onPointerMove={(e) => handlePointerMove(e, setor.id)}
                  onPointerUp={() => handlePointerUp(setor.id)}
                  onPointerCancel={() => { draggingRef.current = null; }}
                >
                  <span className={cn('absolute inset-0 rounded-full animate-ping opacity-70', dotColor)} />
                  <span className={cn('absolute -m-2 inset-0 rounded-full blur-md opacity-30', dotColor)} />
                  <span
                    className={cn(
                      'relative block h-4 w-4 rounded-full border-2 border-white transition-transform',
                      dotColor,
                      isActive ? 'scale-[1.35] ring-2 ring-white/60' : 'group-hover:scale-[1.35]',
                    )}
                  />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modo Cards */}
      {mode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {activeSetores.map((setor) => {
            const { labs, totalCount, hasCorretiva } = getSetorStats(setor);
            return (
              <div
                key={setor.id}
                className={cn(
                  'rounded-2xl border bg-card p-4 space-y-3',
                  hasCorretiva ? 'border-red-200' : 'border-border',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-foreground text-sm truncate">{setor.name}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    {hasCorretiva && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                    {totalCount > 0 && (
                      <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
                        {totalCount}
                      </span>
                    )}
                  </div>
                </div>

                {labs.length > 0 ? (
                  <div className="space-y-1">
                    {labs.map((l) => {
                      const stats = eventStatsByLabId.get(l.id);
                      return (
                        <Link
                          key={l.id}
                          href={`/agenda?labId=${l.id}`}
                          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Activity className="h-3 w-3 shrink-0" />
                          <span className="flex-1 truncate">{l.name}</span>
                          {stats && stats.count > 0 && (
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                              {stats.count}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Nenhum laboratório</p>
                )}

                <p className="text-xs text-muted-foreground">{labs.length} laboratório(s)</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}