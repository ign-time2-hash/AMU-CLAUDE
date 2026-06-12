import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api.js';
import { useAuth } from '../lib/auth.js';
import { Button } from '../components/ui/button.js';
import { RescheduleRequestDialog } from './reschedule-request-dialog.js';
import { cn } from '../lib/utils.js';

export interface CalendarEvent {
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

interface RescheduleRequest {
  id: number;
  status: 'pendente' | 'aprovado' | 'recusado';
  suggestedStart?: string | null;
  counterSuggestedDate?: string | null;
  newStart?: string | null;
  newEnd?: string | null;
  decisionReason?: string | null;
}
function formatDatePtBr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

interface Props {
  event: CalendarEvent;
  returnTo?: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  alta:   'bg-red-500 text-white',
  normal: 'bg-yellow-400 text-black',
  baixa:  'bg-green-500 text-white',
};

const PRIORITY_LABEL: Record<string, string> = {
  alta:   'Alta',
  normal: 'Média',
  baixa:  'Baixa',
};

function inferPriority(text: string): 'alta' | 'normal' | 'baixa' {
  const t = text.toLowerCase();
  if (t.includes('alta')) return 'alta';
  if (t.includes('baixa')) return 'baixa';
  return 'normal';
}

const TYPE_BADGE: Record<string, string> = {
  corretiva:  'bg-red-50 text-red-700 border-red-200',
  preventiva: 'bg-blue-50 text-blue-700 border-blue-200',
};

const STATUS_BADGE: Record<string, string> = {
  concluido:    'bg-green-100 text-green-700',
  em_andamento: 'bg-amber-100 text-amber-700',
  agendado:     'bg-gray-100 text-gray-600',
};

const STATUS_LABEL: Record<string, string> = {
  concluido:    'Concluído',
  em_andamento: 'Em Andamento',
  agendado:     'Agendado',
};

const RESCHEDULE_BADGE: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  aprovado: 'bg-green-100 text-green-800',
  recusado: 'bg-red-100 text-red-800',
};

const RESCHEDULE_LABEL: Record<string, string> = {
  pendente: 'Reagendamento Pendente',
  aprovado: 'Aprovado',
  recusado: 'Reagendamento Recusado',
};

export function MaintenanceCard({ event, returnTo = '/agenda' }: Props) {
  const { user } = useAuth();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const isCliente = user?.role === 'cliente';

  const { data: rescheduleRequests } = useQuery({
    queryKey: ['reschedule-by-event', event.id],
    queryFn: () => apiGet<RescheduleRequest[]>(`/api/reschedule-requests/by-event/${event.id}`),
    enabled: user?.role === 'cliente' || user?.role === 'planejador',
  });

  const lastRequest = rescheduleRequests?.[0] ?? null;
  const priority = inferPriority(event.summary + ' ' + (event.description ?? ''));

  const cardInner = (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      {/* Top: title + badges */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground">{event.summary}</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {event.description ?? 'Sem descrição'}
          </p>
        </div>
        <div className="flex flex-wrap gap-1 justify-end shrink-0 max-w-[180px]">
          {/* Tipo */}
          <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', TYPE_BADGE[event.maintenanceType])}>
            {event.maintenanceType}
          </span>
          {/* Status */}
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE[event.status])}>
            {STATUS_LABEL[event.status]}
          </span>
          {/* Prioridade */}
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', PRIORITY_COLORS[priority])}>
            {PRIORITY_LABEL[priority] ?? priority}
          </span>
          {/* Badge de remarcação */}
          {lastRequest && (
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', RESCHEDULE_BADGE[lastRequest.status])}>
              {RESCHEDULE_LABEL[lastRequest.status]}
            </span>
          )}
        </div>
      </div>

      {/* Período */}
      <p className="text-xs text-muted-foreground mt-2">
        {new Date(event.start).toLocaleString('pt-BR')} — {new Date(event.end).toLocaleString('pt-BR')}
      </p>

      {/* Nova data se aprovado */}
      {lastRequest?.status === 'aprovado' && lastRequest.newStart && (
        <p className="text-xs text-green-700 mt-1 font-medium">
          Nova data: {new Date(lastRequest.newStart).toLocaleString('pt-BR')}
          {lastRequest.newEnd ? ` até ${new Date(lastRequest.newEnd).toLocaleString('pt-BR')}` : ''}
        </p>
      )}
      {/* Motivo da recusa */}
      {lastRequest?.status === 'recusado' && lastRequest.decisionReason && (
        <p className="text-xs text-red-700 mt-1 font-medium">
          Motivo da recusa: {lastRequest.decisionReason}
        </p>
      )}

      {/* Ações por papel */}
      {isCliente && lastRequest?.status === 'pendente' && (
        <div className="mt-2 rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2 text-xs text-yellow-800">
          Já existe um pedido pendente.
          {lastRequest.suggestedStart && (
            <> Início sugerido: {new Date(lastRequest.suggestedStart).toLocaleString('pt-BR')}.</>
          )}
        </div>
      )}
      {isCliente && lastRequest?.status === 'recusado' && lastRequest.counterSuggestedDate && (
        <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800">
          O planejador sugeriu outra data: {formatDatePtBr(lastRequest.counterSuggestedDate)}.
        </div>
      )}
      {isCliente && (!lastRequest || lastRequest.status === 'pendente') && (
        <div className="mt-3 pt-3 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => { e.preventDefault(); setRescheduleOpen(true); }}
            disabled={lastRequest?.status === 'pendente'}
          >
            {lastRequest?.status === 'pendente' ? 'Pedido pendente' : 'Solicitar reagendamento'}
          </Button>
        </div>
      )}
      {user?.role === 'planejador' && lastRequest?.status === 'pendente' && (
        <div className="mt-3 pt-3 border-t border-border">
          <Link href="/reschedules" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <Button variant="outline" size="sm" asChild>
              <span>Revisar pedido</span>
            </Button>
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <>
      {isCliente ? (
        cardInner
      ) : (
        <Link
          href={`/event/${event.id}?returnTo=${encodeURIComponent(returnTo)}`}
          className="block hover:opacity-90 transition-opacity"
        >
          {cardInner}
        </Link>
      )}

      <RescheduleRequestDialog
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        eventId={event.id}
        calendarId={event.calendarId}
        labId={event.labId}
      />
    </>
  );
}
