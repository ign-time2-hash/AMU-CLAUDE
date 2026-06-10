import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost } from '../lib/api.js';
import { useAuth } from '../lib/auth.js';
import { Button } from '../components/ui/button.js';
import { Label } from '../components/ui/label.js';
import { Input } from '../components/ui/input.js';
import { Textarea } from '../components/ui/textarea.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog.js';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  eventId: string;
  calendarId: string;
  labId?: number | null;
}

const schema = z.object({
  suggestedStart: z.string().optional(),
  reason: z.string().min(1, 'Motivo obrigatório'),
});

type Form = z.infer<typeof schema>;

export function RescheduleRequestDialog({ open, onOpenChange, eventId, calendarId, labId }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (data: Form) =>
      apiPost('/api/reschedule-requests', {
        eventId,
        calendarId,
        labId: labId ?? null,
        requestedByName: user?.name ?? '',
        reason: data.reason,
        suggestedStart: data.suggestedStart || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reschedule-requests'] });
      queryClient.invalidateQueries({ queryKey: ['reschedule-by-event', eventId] });
      toast.success('Pedido de reagendamento enviado.');
      reset();
      onOpenChange(false);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Erro';
      if (msg.includes('409') || msg.toLowerCase().includes('pendente')) {
        toast.error('Já existe um pedido pendente para este evento.');
      } else {
        toast.error(msg);
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar reagendamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Data e horário de início sugeridos <span className="text-muted-foreground">(opcional)</span></Label>
            <Input type="datetime-local" {...register('suggestedStart')} min={new Date().toISOString().slice(0, 16)} />
            <p className="text-xs text-muted-foreground">Sugira quando o técnico poderia iniciar. O horário de término será definido pelo planejador.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Motivo do reagendamento</Label>
            <Textarea {...register('reason')} placeholder="Descreva o motivo..." />
            {errors.reason && <p className="text-sm text-red-600">{errors.reason.message}</p>}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending}>
              {mutation.isPending ? 'Enviando...' : 'Enviar pedido'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}