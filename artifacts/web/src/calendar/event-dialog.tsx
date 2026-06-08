import { useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Trash2 } from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../lib/api.js';
import { useAuth } from '../lib/auth.js';
import { Button } from '../components/ui/button.js';
import { Input } from '../components/ui/input.js';
import { Label } from '../components/ui/label.js';
import { Textarea } from '../components/ui/textarea.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select.js';
import { cn } from '../lib/utils.js';

interface Lab { id: number; name: string; }

interface EventData {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  labId?: number;
  maintenanceType: string;
  status: string;
}

const schema = z.object({
  summary: z.string().min(1, 'Título obrigatório'),
  description: z.string().optional(),
  start: z.string().min(1, 'Data de início obrigatória'),
  end: z.string().min(1, 'Data de fim obrigatória'),
  cenpes: z.enum(['CENPES 1', 'CENPES 2']).optional(),
  labId: z.string().optional(),
  priority: z.enum(['baixa', 'normal', 'alta']),
  maintenanceType: z.enum(['preventiva', 'corretiva']),
  status: z.enum(['agendado', 'em_andamento', 'concluido']).optional(),
}).refine((d) => {
  if (!d.start) return true;
  const day = new Date(d.start).getDay();
  return day !== 0 && day !== 6;
}, { message: 'Não é permitido agendar em fins de semana', path: ['start'] });

type Form = z.infer<typeof schema>;

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr).getDay();
  return d === 0 || d === 6;
}

function composeDescription(base: string, cenpes?: string, criticidade?: string): string {
  const lines = [base.trim()];
  if (cenpes) lines.push(`Unidade: ${cenpes}`);
  if (criticidade) lines.push(`Criticidade: ${criticidade}`);
  return lines.filter(Boolean).join('\n');
}

function parseDescription(desc: string): { base: string; cenpes?: string; criticidade?: string } {
  const lines = desc.split('\n');
  const base = lines.filter((l) => !l.startsWith('Unidade:') && !l.startsWith('Criticidade:')).join('\n');
  const cenpes = lines.find((l) => l.startsWith('Unidade:'))?.replace('Unidade: ', '');
  const criticidade = lines.find((l) => l.startsWith('Criticidade:'))?.replace('Criticidade: ', '');
  return { base, cenpes, criticidade };
}

export function EventDialog() {
  const [location, setLocation] = useLocation();
  const [, paramsNew] = useRoute('/event/new');
  const [matchEdit, paramsEdit] = useRoute<{ id: string }>('/event/:id');
  const isNew = !!paramsNew;
  const eventId = matchEdit ? paramsEdit?.id : undefined;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const returnTo = new URLSearchParams(location.split('?')[1] ?? '').get('returnTo') ?? '/agenda';

  const close = () => setLocation(returnTo);

  const { data: labs } = useQuery({
    queryKey: ['labs-allowed'],
    queryFn: () => apiGet<Lab[]>('/api/inventario/labs-allowed'),
  });

  const { data: existing } = useQuery({
    queryKey: ['calendar-event', eventId],
    queryFn: () => apiGet<EventData[]>('/api/calendar/events').then(
      (events) => events.find((e) => e.id === eventId)
    ),
    enabled: !!eventId,
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'normal', maintenanceType: 'preventiva', status: 'agendado' },
  });

  const priority = watch('priority');

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  });

  useEffect(() => {
    if (existing) {
      const parsed = parseDescription(existing.description ?? '');
      reset({
        summary: existing.summary,
        description: parsed.base,
        start: existing.start.slice(0, 16),
        end: existing.end.slice(0, 16),
        cenpes: (parsed.cenpes as 'CENPES 1' | 'CENPES 2') ?? undefined,
        labId: existing.labId ? String(existing.labId) : undefined,
        maintenanceType: (existing.maintenanceType as 'preventiva' | 'corretiva') ?? 'preventiva',
        status: (existing.status as 'agendado' | 'em_andamento' | 'concluido') ?? 'agendado',
        priority: 'normal',
      });
    }
  }, [existing, reset]);

  const createMutation = useMutation({
    mutationFn: (data: Form) => {
      const description = composeDescription(data.description ?? '', data.cenpes, data.priority);
      return apiPost('/api/calendar/events', {
        summary: data.summary,
        description,
        start: new Date(data.start).toISOString(),
        end: new Date(data.end).toISOString(),
        labId: data.labId ? parseInt(data.labId) : undefined,
        maintenanceType: data.maintenanceType,
        status: 'agendado',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
      toast.success('Evento criado com sucesso.');
      close();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erro ao criar evento'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Form) => {
      const description = composeDescription(data.description ?? '', data.cenpes, data.priority);
      return apiPatch(`/api/calendar/events/${eventId}`, {
        summary: data.summary,
        description,
        start: new Date(data.start).toISOString(),
        end: new Date(data.end).toISOString(),
        labId: data.labId ? parseInt(data.labId) : undefined,
        maintenanceType: data.maintenanceType,
        status: data.status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
      toast.success('Evento atualizado.');
      close();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erro ao atualizar evento'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiDelete(`/api/calendar/events/${eventId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
      toast.success('Evento excluído.');
      close();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erro ao excluir evento'),
  });

  const onSubmit = (data: Form) => {
    if (isWeekend(data.start)) { toast.error('Não é permitido agendar em fins de semana.'); return; }
    if (isNew) createMutation.mutate(data);
    else updateMutation.mutate(data);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (!isNew && !eventId) return null;
  if (!isNew && !existing && !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={close}
        aria-hidden
      />

      {/* Content — bottom sheet on mobile, centered modal on desktop */}
      <div className={cn(
        'relative bg-card shadow-xl overflow-y-auto',
        /* mobile */ 'w-full max-h-[92vh] rounded-t-2xl',
        /* desktop */ 'md:w-[92vw] md:max-w-[720px] md:max-h-[90vh] md:rounded-2xl',
      )}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {isNew ? 'Novo evento' : 'Editar evento'}
          </h2>
          <button onClick={close} className="rounded-xl p-1.5 hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {/* Título */}
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input {...register('summary')} placeholder="Ex: Manutenção preventiva — Lab de Sensores" />
            {errors.summary && <p className="text-sm text-red-600">{errors.summary.message}</p>}
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label>Descrição <span className="text-muted-foreground">(opcional)</span></Label>
            <Textarea {...register('description')} placeholder="Detalhes do evento..." />
          </div>

          {/* Início / Fim */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Início</Label>
              <Input type="datetime-local" {...register('start')} />
              {errors.start && <p className="text-sm text-red-600">{errors.start.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Fim</Label>
              <Input type="datetime-local" {...register('end')} />
              {errors.end && <p className="text-sm text-red-600">{errors.end.message}</p>}
            </div>
          </div>

          {/* Unidade + Lab */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Unidade</Label>
              <Select onValueChange={(v) => setValue('cenpes', v as 'CENPES 1' | 'CENPES 2')}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CENPES 1">CENPES 1</SelectItem>
                  <SelectItem value="CENPES 2">CENPES 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Laboratório</Label>
              <Select onValueChange={(v) => setValue('labId', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {labs?.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Nível de emergência */}
          <div className="space-y-1.5">
            <Label>Nível de emergência</Label>
            <div className="flex gap-2">
              {(['baixa', 'normal', 'alta'] as const).map((p) => (
                <Button
                  key={p}
                  type="button"
                  variant={priority === p ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 capitalize"
                  onClick={() => setValue('priority', p)}
                >
                  {p}
                </Button>
              ))}
            </div>
          </div>

          {/* Tipo de manutenção */}
          <div className="space-y-1.5">
            <Label>Tipo de manutenção</Label>
            <Select defaultValue="preventiva" onValueChange={(v) => setValue('maintenanceType', v as 'preventiva' | 'corretiva')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="preventiva">Preventiva</SelectItem>
                <SelectItem value="corretiva">Corretiva</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status (edição apenas) */}
          {!isNew && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select defaultValue="agendado" onValueChange={(v) => setValue('status', v as 'agendado' | 'em_andamento' | 'concluido')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agendado">Agendado</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2 pt-2">
            {!isNew && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                title="Excluir evento"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            )}
            <Button type="button" variant="outline" className="flex-1" onClick={close}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? 'Salvando...' : isNew ? 'Criar evento' : 'Salvar alterações'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
