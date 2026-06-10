import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth.js';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { RefreshCcw } from 'lucide-react';
import { apiGet, apiPost } from '../lib/api.js';
import { Button } from '../components/ui/button.js';
import { Input } from '../components/ui/input.js';
import { Label } from '../components/ui/label.js';
import { Textarea } from '../components/ui/textarea.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog.js';
import { Skeleton } from '../components/ui/skeleton.js';
import { cn } from '../lib/utils.js';
import { formatDateTime } from '../lib/utils.js';

interface RescheduleRequest {
  id: number;
  eventId: string;
  requestedByName: string;
  reason: string;
  suggestedStart?: string | null;
  suggestedEnd?: string | null;
  status: 'pendente' | 'aprovado' | 'recusado';
  decisionReason?: string | null;
  newStart?: string | null;
  newEnd?: string | null;
  lab?: { name: string } | null;
  createdAt: string;
}

const STATUS_BADGE: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  aprovado: 'bg-green-100 text-green-800',
  recusado: 'bg-red-100 text-red-800',
};

const approveSchema = z.object({
  decisionReason: z.string().optional(),
  newStart: z.string().optional(),
  newEnd: z.string().optional(),
});

const rejectSchema = z.object({
  decisionReason: z.string().min(1, 'Informe o motivo da recusa'),
});

type ApproveForm = z.infer<typeof approveSchema>;
type RejectForm = z.infer<typeof rejectSchema>;

export function ReschedulesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<RescheduleRequest | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const canDecide = user?.role === 'planejador';

  const { data: requests, isLoading } = useQuery({
    queryKey: ['reschedule-requests'],
    queryFn: () => apiGet<RescheduleRequest[]>('/api/reschedule-requests'),
  });

  const approveForm = useForm<ApproveForm>({ resolver: zodResolver(approveSchema) });
  const rejectForm = useForm<RejectForm>({ resolver: zodResolver(rejectSchema) });

  const approveMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ApproveForm }) =>
      apiPost(`/api/reschedule-requests/${id}/approve`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reschedule-requests'] });
      toast.success('Remarcação aprovada');
      setSelected(null); setAction(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erro'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: RejectForm }) =>
      apiPost(`/api/reschedule-requests/${id}/reject`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reschedule-requests'] });
      toast.success('Remarcação recusada');
      setSelected(null); setAction(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erro'),
  });

  const pending = requests?.filter((r) => r.status === 'pendente') ?? [];
  const history = requests?.filter((r) => r.status !== 'pendente') ?? [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Reagendamento</h1>
        <p className="text-sm text-muted-foreground">Pedidos de remarcação de manutenção</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : (
        <>
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Pendentes ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card flex flex-col items-center justify-center py-10 gap-2">
                <RefreshCcw className="h-8 w-8 text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">Nenhum pedido pendente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map((r) => (
                  <RequestCard
                    key={r.id}
                    request={r}
                    canDecide={canDecide}
                    onApprove={() => { setSelected(r); setAction('approve'); }}
                    onReject={() => { setSelected(r); setAction('reject'); }}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Histórico ({history.length})
            </h2>
            <div className="space-y-3">
              {history.map((r) => <RequestCard key={r.id} request={r} />)}
            </div>
          </section>
        </>
      )}

      {/* Approve dialog */}
      <Dialog open={action === 'approve'} onOpenChange={(o) => { if (!o) { setAction(null); setSelected(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Aprovar remarcação</DialogTitle></DialogHeader>
          {selected && (
            <form onSubmit={approveForm.handleSubmit((d) => approveMutation.mutate({ id: selected.id, data: d }))} className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">Motivo solicitado: {selected.reason}</p>
              {selected.suggestedStart && (
                <p className="text-sm text-muted-foreground">
                  Sugerido: {formatDateTime(selected.suggestedStart)} — {selected.suggestedEnd ? formatDateTime(selected.suggestedEnd) : ''}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nova data/hora início</Label>
                  <Input type="datetime-local" {...approveForm.register('newStart')} defaultValue={selected.suggestedStart?.slice(0, 16) ?? ''} />
                </div>
                <div className="space-y-1.5">
                  <Label>Nova data/hora fim</Label>
                  <Input type="datetime-local" {...approveForm.register('newEnd')} defaultValue={selected.suggestedEnd?.slice(0, 16) ?? ''} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Observação <span className="text-muted-foreground">(opcional)</span></Label>
                <Textarea {...approveForm.register('decisionReason')} placeholder="Comentário ao solicitante..." />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => { setAction(null); setSelected(null); }}>Cancelar</Button>
                <Button type="submit" className="flex-1" disabled={approveMutation.isPending}>
                  {approveMutation.isPending ? 'Aprovando...' : 'Aprovar'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={action === 'reject'} onOpenChange={(o) => { if (!o) { setAction(null); setSelected(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Recusar remarcação</DialogTitle></DialogHeader>
          {selected && (
            <form onSubmit={rejectForm.handleSubmit((d) => rejectMutation.mutate({ id: selected.id, data: d }))} className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">Motivo solicitado: {selected.reason}</p>
              <div className="space-y-1.5">
                <Label>Motivo da recusa</Label>
                <Textarea {...rejectForm.register('decisionReason')} placeholder="Explique o motivo da recusa..." />
                {rejectForm.formState.errors.decisionReason && (
                  <p className="text-sm text-red-600">{rejectForm.formState.errors.decisionReason.message}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => { setAction(null); setSelected(null); }}>Cancelar</Button>
                <Button type="submit" variant="destructive" className="flex-1" disabled={rejectMutation.isPending}>
                  {rejectMutation.isPending ? 'Recusando...' : 'Recusar'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RequestCard({
  request: r,
  canDecide = false,
  onApprove,
  onReject,
}: {
  request: RescheduleRequest;
  canDecide?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE[r.status])}>
              {r.status}
            </span>
            {r.lab && <span className="text-xs text-muted-foreground">{r.lab.name}</span>}
          </div>
          <p className="text-sm font-medium text-foreground">Evento: {r.eventId}</p>
          <p className="text-sm text-muted-foreground mt-0.5">Motivo: {r.reason}</p>
          <p className="text-xs text-muted-foreground mt-1">Por: {r.requestedByName} · {formatDateTime(r.createdAt)}</p>
          {r.status === 'aprovado' && r.newStart && (
            <p className="text-xs text-green-700 mt-1 font-medium">
              Nova data: {formatDateTime(r.newStart)} até {r.newEnd ? formatDateTime(r.newEnd) : '—'}
            </p>
          )}
          {r.status === 'recusado' && r.decisionReason && (
            <p className="text-xs text-red-700 mt-1 font-medium">Motivo da recusa: {r.decisionReason}</p>
          )}
        </div>
        {r.status === 'pendente' && canDecide && (
          <div className="flex flex-col gap-1.5 shrink-0">
            <Button size="sm" onClick={onApprove}>Aprovar</Button>
            <Button size="sm" variant="destructive" onClick={onReject}>Recusar</Button>
          </div>
        )}
      </div>
    </div>
  );
}
