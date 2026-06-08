import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Trash2, Send, Bell } from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../lib/api.js';
import { Button } from '../components/ui/button.js';
import { Input } from '../components/ui/input.js';
import { Label } from '../components/ui/label.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog.js';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog.js';
import { Skeleton } from '../components/ui/skeleton.js';
import { cn } from '../lib/utils.js';

interface Webhook {
  id: number;
  name: string;
  url: string;
  labId: number | null;
  enabled: boolean;
  lab?: { name: string } | null;
}

interface Lab { id: number; name: string; }

const createSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  url: z.string().url('URL inválida'),
  labId: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;

export function TeamsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => apiGet<Webhook[]>('/api/webhooks'),
  });

  const { data: labs } = useQuery({
    queryKey: ['labs'],
    queryFn: () => apiGet<Lab[]>('/api/configuracoes/labs'),
  });

  const { data: settings, refetch: refetchSettings } = useQuery({
    queryKey: ['teams-settings'],
    queryFn: () => apiGet<{ dailySummaryEnabled: boolean }>('/api/teams/settings'),
  });

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateForm) =>
      apiPost('/api/webhooks', { ...data, labId: data.labId ? parseInt(data.labId) : null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook criado');
      setOpen(false);
      reset();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erro'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      apiPatch(`/api/webhooks/${id}`, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhooks'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/webhooks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook removido');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erro'),
  });

  const testMutation = useMutation({
    mutationFn: (id: number) => apiPost(`/api/webhooks/${id}/test`),
    onSuccess: () => toast.success('Mensagem enviada com sucesso'),
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Falha ao enviar'),
  });

  const toggleSummaryMutation = useMutation({
    mutationFn: (enabled: boolean) => apiPatch('/api/teams/settings', { dailySummaryEnabled: enabled }),
    onSuccess: () => { refetchSettings(); toast.success('Configuração salva'); },
  });

  const testSummaryMutation = useMutation({
    mutationFn: () => apiPost('/api/teams/daily-summary/test'),
    onSuccess: () => toast.success('Resumo de teste enviado'),
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erro ao enviar'),
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Teams / Webhooks</h1>
        <p className="text-sm text-muted-foreground">Notificações para o Microsoft Teams</p>
      </div>

      {/* Daily summary */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground text-sm">Resumo diário</p>
            <p className="text-xs text-muted-foreground">Enviado automaticamente às 07h00</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => testSummaryMutation.mutate()} disabled={testSummaryMutation.isPending}>
              Testar
            </Button>
            <Button
              size="sm"
              variant={settings?.dailySummaryEnabled ? 'default' : 'outline'}
              onClick={() => toggleSummaryMutation.mutate(!settings?.dailySummaryEnabled)}
            >
              {settings?.dailySummaryEnabled ? 'Ativado' : 'Desativado'}
            </Button>
          </div>
        </div>
      </div>

      {/* Webhooks */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Webhooks</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo webhook</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo webhook</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input {...register('name')} placeholder="Ex: Notificações Lab A" />
                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>URL do webhook</Label>
                <Input {...register('url')} placeholder="https://..." />
                {errors.url && <p className="text-sm text-red-600">{errors.url.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Laboratório <span className="text-muted-foreground">(opcional)</span></Label>
                <Select onValueChange={(v) => setValue('labId', v === 'none' ? undefined : v)}>
                  <SelectTrigger><SelectValue placeholder="Todos os labs" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Todos os labs</SelectItem>
                    {labs?.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Criando...' : 'Criar webhook'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : webhooks?.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card flex flex-col items-center justify-center py-12 gap-3">
          <Bell className="h-10 w-10 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">Nenhum webhook configurado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks?.map((w) => (
            <div key={w.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm text-foreground">{w.name}</p>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium',
                      w.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500',
                    )}>
                      {w.enabled ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{w.url}</p>
                  {w.lab && <p className="text-xs text-muted-foreground mt-0.5">Lab: {w.lab.name}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => testMutation.mutate(w.id)} disabled={testMutation.isPending} title="Testar">
                    <Send className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleMutation.mutate({ id: w.id, enabled: !w.enabled })}>
                    {w.enabled ? 'Desativar' : 'Ativar'}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="text-red-500 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover webhook</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja remover "{w.name}"? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 text-white hover:bg-red-700"
                          onClick={() => deleteMutation.mutate(w.id)}
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
