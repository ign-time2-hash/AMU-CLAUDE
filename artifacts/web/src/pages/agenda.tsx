import { useState, useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { apiGet } from '../lib/api.js';
import { useAuth } from '../lib/auth.js';
import { Button } from '../components/ui/button.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select.js';
import { Skeleton } from '../components/ui/skeleton.js';
import { MaintenanceCard } from '../calendar/maintenance-card.js';
import { cn } from '../lib/utils.js';

interface CalendarEvent {
  id: string;
  calendarId: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  labId?: number | null;
  maintenanceType: 'preventiva' | 'corretiva';
  status: 'agendado' | 'em_andamento' | 'concluido';
}

interface Lab { id: number; name: string; }

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function toDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function startOfWeekMon(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildMonthGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const start = startOfWeekMon(firstDay);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }
  return cells;
}

function buildWeekGrid(anchor: Date): Date[] {
  const start = startOfWeekMon(anchor);
  return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

function rangeLabel(view: 'month' | 'week', anchor: Date): string {
  if (view === 'month') {
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(anchor);
  }
  const days = buildWeekGrid(anchor);
  const fmt = (d: Date) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(d);
  return `${fmt(days[0]!)} - ${fmt(days[6]!)}`;
}

function formatDatePt(d: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).format(d);
}

function inferPriority(text: string): 'alta' | 'normal' | 'baixa' {
  const t = text.toLowerCase();
  if (t.includes('alta')) return 'alta';
  if (t.includes('baixa')) return 'baixa';
  return 'normal';
}


export function AgendaPage() {
  const { user } = useAuth();
  const [currentLocation] = useLocation();
  const today = new Date();
  const [view, setView] = useState<'month' | 'week'>('month');
  const [anchor, setAnchor] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<Date>(today);
  const initialLabId = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    const v = p.get('labId');
    return v ? parseInt(v) : undefined;
  }, []);
  const [selectedLabId, setSelectedLabId] = useState<number | undefined>(initialLabId);

  const { data: labs } = useQuery({
    queryKey: ['labs'],
    queryFn: () => apiGet<Lab[]>('/api/configuracoes/labs'),
  });

  const gridDays = useMemo(() =>
    view === 'month' ? buildMonthGrid(anchor.getFullYear(), anchor.getMonth()) : buildWeekGrid(anchor),
    [view, anchor]);

  const timeMin = gridDays[0]!.toISOString();
  const timeMax = new Date(gridDays[gridDays.length - 1]!.getTime() + 86400000).toISOString();

  const { data: events, isLoading } = useQuery({
    queryKey: ['agenda-events', selectedLabId, timeMin, timeMax],
    queryFn: () => apiGet<CalendarEvent[]>('/api/calendar/events', selectedLabId ? { labId: selectedLabId } : undefined),
  });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events ?? []) {
      const key = toDayKey(new Date(ev.start));
      map.set(key, [...(map.get(key) ?? []), ev]);
    }
    return map;
  }, [events]);

  const selectedKey = toDayKey(selectedDay);
  const selectedEvents = eventsByDay.get(selectedKey) ?? [];

  function navigate(dir: 1 | -1) {
    const d = new Date(anchor);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir * 7);
    setAnchor(d);
  }

  const maxChips = view === 'month' ? 2 : 4;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {labs?.find((l) => l.id === selectedLabId)?.name ?? 'Todos os laboratórios'}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">OPERACIONAL</span>
            <span className="text-xs text-muted-foreground">Última inspeção: {formatDatePt(today)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            onValueChange={(v) => setSelectedLabId(v === 'all' ? undefined : parseInt(v))}
          >
            <SelectTrigger className="h-10 w-48">
              <SelectValue placeholder="Todos os labs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os labs</SelectItem>
              {labs?.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* View toggle */}
          <div className="flex rounded-xl border border-border p-1 gap-1">
            <Button size="sm" variant={view === 'month' ? 'default' : 'ghost'} className="h-8 px-3" onClick={() => setView('month')}>Mês</Button>
            <Button size="sm" variant={view === 'week' ? 'default' : 'ghost'} className="h-8 px-3" onClick={() => setView('week')}>Semana</Button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[160px] text-center text-sm text-muted-foreground capitalize">
              {rangeLabel(view, anchor)}
            </span>
            <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => navigate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-7 gap-1.5 p-2">
            {Array.from({ length: 42 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : (
          <div className={cn('grid grid-cols-7', view === 'month' ? 'gap-px' : 'gap-px')}>
            {gridDays.map((day) => {
              const key = toDayKey(day);
              const dayEvents = eventsByDay.get(key) ?? [];
              const isToday = key === toDayKey(today);
              const inMonth = view === 'week' || day.getMonth() === anchor.getMonth();
              const isSelected = key === selectedKey;

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    'text-left p-1.5 transition-colors border-0',
                    view === 'month' ? 'min-h-[92px]' : 'min-h-[120px]',
                    isSelected ? 'bg-primary/5 ring-1 ring-inset ring-primary' : 'hover:bg-muted/50',
                    !inMonth && 'opacity-40',
                  )}
                >
                  <span className={cn(
                    'inline-flex h-6 w-6 items-center justify-center text-xs font-medium mb-1',
                    isToday ? 'rounded-full bg-primary text-primary-foreground' : 'text-foreground',
                  )}>
                    {day.getDate()}
                  </span>

                  <div className="space-y-0.5">
                    {dayEvents.slice(0, maxChips).map((ev) =>
                      user?.role === 'cliente' ? (
                        <div
                          key={ev.id}
                          className="truncate rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {ev.summary}
                        </div>
                      ) : (
                        <Link
                          key={ev.id}
                          href={`/event/${ev.id}?returnTo=${encodeURIComponent(currentLocation)}`}
                          className="block truncate rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                          {ev.summary}
                        </Link>
                      )
                    )}
                    {dayEvents.length > maxChips && (
                      <p className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - maxChips} mais</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected day events */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">
          Eventos de {formatDatePt(selectedDay)}
        </h2>
        {selectedEvents.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Nenhum evento para o dia selecionado.
          </div>
        ) : (
          <div className="space-y-3">
            {selectedEvents.map((ev) => (
              <MaintenanceCard key={ev.id} event={ev} returnTo={currentLocation} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
