import { useState, useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { apiGet } from '../lib/api.js';
import { useAuth } from '../lib/auth.js';
import { Button } from '../components/ui/button.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select.js';
import { Skeleton } from '../components/ui/skeleton.js';
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
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(anchor).toUpperCase();
  }
  const days = buildWeekGrid(anchor);
  const fmt = (d: Date) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(d);
  return `${fmt(days[0]!)} — ${fmt(days[6]!)}`;
}

function formatDatePt(d: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).format(d);
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

function inferPriority(text: string): 'alta' | 'normal' | 'baixa' {
  const t = text.toLowerCase();
  if (t.includes('alta')) return 'alta';
  if (t.includes('baixa')) return 'baixa';
  return 'normal';
}

const PRIORITY_BORDER: Record<string, string> = {
  alta:   '#BA1A1A',
  normal: '#FBBF24',
  baixa:  '#6AA151',
};

const PRIORITY_BADGE: Record<string, string> = {
  alta:   'text-[#B91C1C] border-[#B91C1C] bg-[#FEE2E2]',
  normal: 'text-yellow-700 border-yellow-300 bg-yellow-50',
  baixa:  'text-[#6AA151] border-[#6AA151] bg-green-50',
};

const PRIORITY_LABEL: Record<string, string> = {
  alta:   'Alta',
  normal: 'Média',
  baixa:  'Baixa',
};

const TYPE_BADGE: Record<string, string> = {
  corretiva:  'text-[#6AA151] border-[#6AA151]',
  preventiva: 'text-blue-600 border-blue-300',
};

const STATUS_LABEL: Record<string, string> = {
  agendado:     'Agendado',
  em_andamento: 'Em andamento',
  concluido:    'Concluído',
};

// ── Event detail panel ─────────────────────────────────────────────────────────

function EventDetailPanel({ event, returnTo }: { event: CalendarEvent; returnTo: string }) {
  const { user } = useAuth();
  const priority = inferPriority(event.summary + ' ' + (event.description ?? ''));
  const borderColor = PRIORITY_BORDER[priority] ?? '#C2C9B9';
  const isPlanejador = user?.role === 'planejador';

  return (
    <div
      className="animate-panel-enter rounded-[4px] border border-[#C2C9B9] bg-card shadow-sm overflow-hidden"
      style={{ borderLeft: `6px solid ${borderColor}` }}
    >
      <div className="p-6">
        {/* Title + badges */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[20px] font-bold text-foreground leading-tight">{event.summary}</p>
            {event.description && (
              <p className="text-sm text-muted-foreground mt-1">"{event.description}"</p>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 shrink-0 justify-end">
            <span className={cn('rounded-[2px] border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', PRIORITY_BADGE[priority])}>
              {PRIORITY_LABEL[priority] ?? priority}
            </span>
            <span className={cn('rounded-[2px] border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-transparent', TYPE_BADGE[event.maintenanceType])}>
              {event.maintenanceType}
            </span>
            <span className="rounded-[2px] border border-[#C2C9B9] bg-[#F4F3F3] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-foreground">
              {STATUS_LABEL[event.status]}
            </span>
          </div>
        </div>

        {/* Time */}
        <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-[rgba(194,201,185,0.4)]">
          <Clock className="h-3.5 w-3.5 text-[#6AA151]" />
          <p className="text-sm font-bold text-[#15803D]">
            {formatTime(event.start)} até {formatTime(event.end)}
          </p>
        </div>

        {/* Action */}
        {isPlanejador && (
          <div className="mt-4">
            <Button variant="outline" size="sm" className="rounded-[4px] border-[#C2C9B9] text-[12px] font-bold uppercase tracking-wide" asChild>
              <Link href={`/event/${event.id}?returnTo=${encodeURIComponent(returnTo)}`}>
                ✎ Editar chamado
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function AgendaPage() {
  const { user } = useAuth();
  const [currentLocation] = useLocation();
  const today = new Date();
  const [view, setView] = useState<'month' | 'week'>('month');
  const [anchor, setAnchor] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

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

  const { data: events, isLoading } = useQuery({
    queryKey: ['agenda-events', selectedLabId, anchor.getFullYear(), anchor.getMonth(), view],
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

  const selectedKey = selectedDay ? toDayKey(selectedDay) : null;
  const selectedEvents = selectedKey ? (eventsByDay.get(selectedKey) ?? []) : [];

  function navigate(dir: 1 | -1) {
    const d = new Date(anchor);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir * 7);
    setAnchor(d);
  }

  const maxChips = view === 'month' ? 2 : 4;
  const currentLabName = labs?.find((l) => l.id === selectedLabId)?.name ?? 'Todos os laboratórios';

  return (
    <div className="p-4 md:p-8 space-y-5">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-bold text-foreground leading-tight">{currentLabName}</h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-[4px] border border-[rgba(106,161,81,0.3)] bg-[rgba(106,161,81,0.1)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Operacional
            </span>
            <span className="text-sm text-muted-foreground">Última inspeção: {formatDatePt(today)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 rounded-xl bg-[#F4F3F3] px-3 py-2 shadow-sm flex-wrap">
          <Select onValueChange={(v) => setSelectedLabId(v === 'all' ? undefined : parseInt(v))}>
            <SelectTrigger className="h-9 w-44 rounded-xl bg-card border-[#C2C9B9] text-sm">
              <SelectValue placeholder="Todos os labs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os labs</SelectItem>
              {labs?.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* View toggle */}
          <div className="relative flex rounded-full border border-[#C2C9B9] bg-[#EEEEEE] p-[3px] gap-[2px]">
            <div
              className="absolute top-[3px] bottom-[3px] w-[72px] rounded-full bg-primary shadow-sm pointer-events-none"
              style={{
                transition: 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
                transform: view === 'week' ? 'translateX(74px)' : 'translateX(0)',
              }}
            />
            <button
              onClick={() => setView('month')}
              className={cn('relative z-10 w-[72px] py-1 text-sm font-bold text-center transition-colors duration-200', view === 'month' ? 'text-white' : 'text-foreground')}
            >Mês</button>
            <button
              onClick={() => setView('week')}
              className={cn('relative z-10 w-[72px] py-1 text-sm font-bold text-center transition-colors duration-200', view === 'week' ? 'text-white' : 'text-foreground')}
            >Semana</button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(-1)}
              className="h-8 w-8 rounded-full border border-[#C2C9B9] flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-foreground" />
            </button>
            <span className="min-w-[160px] text-center text-[16px] font-bold text-foreground tracking-wide">
              {rangeLabel(view, anchor)}
            </span>
            <button
              onClick={() => navigate(1)}
              className="h-8 w-8 rounded-full border border-[#C2C9B9] flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Calendar grid ───────────────────────────────────────── */}
      <div className="rounded-[4px] border border-[#C2C9B9] bg-card shadow-sm overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-[rgba(194,201,185,0.5)] bg-[#FAFAFA]">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} className="py-2.5 text-center text-[12px] font-bold text-muted-foreground uppercase tracking-widest">
              {d}
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-7 gap-1 p-2">
            {Array.from({ length: 42 }).map((_, i) => <Skeleton key={i} className="h-[92px]" />)}
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {gridDays.map((day) => {
              const key = toDayKey(day);
              const dayEvents = eventsByDay.get(key) ?? [];
              const isToday = key === toDayKey(today);
              const inMonth = view === 'week' || day.getMonth() === anchor.getMonth();
              const isSelected = selectedKey === key;
              const hasEvents = dayEvents.length > 0;

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={cn(
                    'text-left p-1.5 border-[rgba(194,201,185,0.2)] border transition-colors',
                    view === 'month' ? 'min-h-[92px]' : 'min-h-[120px]',
                    isSelected
                      ? 'bg-[rgba(106,161,81,0.05)] outline outline-1 outline-primary/40'
                      : hasEvents ? 'hover:bg-[rgba(106,161,81,0.04)]' : 'hover:bg-muted/30',
                    !inMonth && 'opacity-40',
                  )}
                >
                  <div className="flex items-start justify-between">
                    <span className={cn(
                      'inline-flex h-6 w-6 items-center justify-center text-[12px] font-bold mb-1',
                      isToday
                        ? 'rounded-[4px] bg-primary text-primary-foreground'
                        : 'text-foreground',
                    )}>
                      {day.getDate()}
                    </span>
                    {hasEvents && !isToday && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#BA1A1A] mt-1 mr-0.5" />
                    )}
                  </div>

                  <div className="space-y-0.5">
                    {dayEvents.slice(0, maxChips).map((ev) => (
                      user?.role === 'cliente' ? (
                        <div
                          key={ev.id}
                          className="truncate rounded-[4px] px-1.5 py-0.5 text-[10px] font-bold text-foreground bg-white shadow-sm"
                          style={{ borderLeft: `4px solid ${PRIORITY_BORDER[inferPriority(ev.summary + ' ' + (ev.description ?? ''))] ?? '#C2C9B9'}` }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {ev.summary}
                        </div>
                      ) : (
                        <Link
                          key={ev.id}
                          href={`/event/${ev.id}?returnTo=${encodeURIComponent(currentLocation)}`}
                          className="block truncate rounded-[4px] px-1.5 py-0.5 text-[10px] font-bold text-foreground bg-white shadow-sm hover:brightness-95 transition-all"
                          style={{ borderLeft: `4px solid ${PRIORITY_BORDER[inferPriority(ev.summary + ' ' + (ev.description ?? ''))] ?? '#C2C9B9'}` }}
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                          {ev.summary}
                          <span className="block text-[9px] text-muted-foreground font-normal">
                            {formatTime(ev.start)} - {formatTime(ev.end)}
                          </span>
                        </Link>
                      )
                    ))}
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

      {/* ── Event detail panel ─────────────────────────────────── */}
      {selectedDay && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-[rgba(194,201,185,0.5)]" />
            <span className="text-[14px] font-bold text-foreground uppercase tracking-widest">
              {selectedEvents.length > 0 ? 'Detalhes do evento' : 'Próximo evento'}
            </span>
            <div className="flex-1 h-px bg-[rgba(194,201,185,0.5)]" />
          </div>

          {selectedEvents.length === 0 ? (
            <div
              key={selectedKey ?? ''}
              className="animate-panel-enter rounded-[4px] border border-[#C2C9B9] bg-card p-6 text-center text-sm text-muted-foreground"
            >
              Nenhum evento agendado para este dia.
            </div>
          ) : (
            <div key={selectedKey ?? ''} className="space-y-3">
              {selectedEvents.map((ev) => (
                <EventDetailPanel key={ev.id} event={ev} returnTo={currentLocation} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
