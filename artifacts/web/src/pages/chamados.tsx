import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, MessageSquareWarning, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { apiGet, apiPost } from '../lib/api.js';
import { useAuth } from '../lib/auth.js';
import { Button } from '../components/ui/button.js';
import { Input } from '../components/ui/input.js';
import { Label } from '../components/ui/label.js';
import { Textarea } from '../components/ui/textarea.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog.js';
import { Skeleton } from '../components/ui/skeleton.js';
import { cn } from '../lib/utils.js';
import { formatDateTime } from '../lib/utils.js';

interface Comment {
  id: number;
  authorName: string;
  body: string;
  createdAt: string;
}

interface Chamado {
  id: number;
  machineName: string;
  description: string;
  priority: 'baixa' | 'normal' | 'alta';
  status: 'em_espera' | 'em_progresso' | 'concluido' | 'recusado';
  openedBy: string;
  labId: number;
  lab?: { name: string };
  createdAt: string;
}

interface Lab { id: number; name: string; }

const PRIORITY_BADGE: Record<string, string> = {
  baixa: 'bg-green-100 text-green-800',
  normal: 'bg-yellow-100 text-yellow-800',
  alta: 'bg-red-100 text-red-800',
};

const STATUS_LABEL: Record<string, string> = {
  em_espera: 'Em espera',
  em_progresso: 'Em progresso',
  concluido: 'Concluído',
  recusado: 'Recusado',
};

const STATUS_BADGE: Record<string, string> = {
  em_espera: 'bg-yellow-100 text-yellow-800',
  em_progresso: 'bg-blue-100 text-blue-800',
  concluido: 'bg-green-100 text-green-800',
  recusado: 'bg-red-100 text-red-800',
};

const createSchema = z.object({
  labId: z.string().min(1, 'Selecione um laboratório'),
  machineName: z.string().min(1, 'Nome da máquina obrigatório'),
  description: z.string().min(1, 'Descrição obrigatória'),
  priority: z.enum(['baixa', 'normal', 'alta']),
});

type CreateForm = z.infer<typeof createSchema>;

export function ChamadosPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: chamados, isLoading } = useQuery({
    queryKey: ['chamados'],
    queryFn: () => apiGet<Chamado[]>('/api/chamados'),
  });

  const { data: labs } = useQuery({
    queryKey: ['labs'],
    queryFn: () => apiGet<Lab[]>('/api/configuracoes/labs'),
  });

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { priority: 'normal' },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateForm) => apiPost('/api/chamados', { ...data, labId: parseInt(data.labId) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chamados'] });
      toast.success('Chamado aberto com sucesso');
      setOpen(false);
      reset();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erro ao abrir chamado'),
  });

  const acceptMutation = useMutation({
    mutationFn: (id: number) => apiPost(`/api/chamados/${id}/accept`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['chamados'] }); toast.success('Chamado aceito'); },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erro'),
  });

  const completeMutation = useMutation({
    mutationFn: (id: number) => apiPost(`/api/chamados/${id}/complete`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['chamados'] }); toast.success('Chamado concluído'); },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erro'),
  });

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Chamados</h1>
          <p className="text-sm text-muted-foreground">Todos os chamados</p>
        </div>
        {(user?.role === 'cliente' || user?.role === 'planejador') && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo chamado</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo chamado</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label>Laboratório</Label>
                  <Select onValueChange={(v) => setValue('labId', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {labs?.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.labId && <p className="text-sm text-red-600">{errors.labId.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Máquina / equipamento</Label>
                  <Input {...register('machineName')} placeholder="Nome da máquina" />
                  {errors.machineName && <p className="text-sm text-red-600">{errors.machineName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Descrição do problema</Label>
                  <Textarea {...register('description')} placeholder="Descreva o problema..." />
                  {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Prioridade</Label>
                  <Select defaultValue="normal" onValueChange={(v) => setValue('priority', v as 'baixa' | 'normal' | 'alta')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Abrindo...' : 'Abrir chamado'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : chamados?.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card flex flex-col items-center justify-center py-16 gap-3">
          <MessageSquareWarning className="h-10 w-10 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">Nenhum chamado encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {chamados?.map((c) => (
            <ChamadoCard
              key={c.id}
              chamado={c}
              userRole={user?.role}
              onAccept={() => acceptMutation.mutate(c.id)}
              onComplete={() => completeMutation.mutate(c.id)}
              acceptPending={acceptMutation.isPending}
              completePending={completeMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ChamadoCard with inline comments ───────────────────────────────────────

interface ChamadoCardProps {
  chamado: Chamado;
  userRole?: string;
  onAccept: () => void;
  onComplete: () => void;
  acceptPending: boolean;
  completePending: boolean;
}

function ChamadoCard({ chamado: c, userRole, onAccept, onComplete, acceptPending, completePending }: ChamadoCardProps) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [commentBody, setCommentBody] = useState('');

  const { data: comments } = useQuery({
    queryKey: ['chamado-comments', c.id],
    queryFn: () => apiGet<Comment[]>(`/api/chamados/${c.id}/comments`),
    enabled: expanded,
  });

  const commentMutation = useMutation({
    mutationFn: (body: string) => apiPost(`/api/chamados/${c.id}/comments`, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chamado-comments', c.id] });
      setCommentBody('');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erro ao comentar'),
  });

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span className="text-xs text-muted-foreground">#{c.id}</span>
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', PRIORITY_BADGE[c.priority])}>
                {c.priority}
              </span>
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE[c.status])}>
                {STATUS_LABEL[c.status]}
              </span>
            </div>
            <p className="font-medium text-sm text-foreground truncate">{c.machineName}</p>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{c.description}</p>
            {c.lab && <p className="text-xs text-muted-foreground mt-1">{c.lab.name}</p>}
            <p className="text-xs text-muted-foreground mt-1">{formatDateTime(c.createdAt)}</p>
          </div>
          <div className="flex flex-col gap-1.5 shrink-0 items-end">
            {userRole === 'planejador' && c.status === 'em_espera' && (
              <Button size="sm" onClick={onAccept} disabled={acceptPending}>Aceitar</Button>
            )}
            {userRole === 'planejador' && c.status === 'em_progresso' && (
              <Button size="sm" variant="outline" onClick={onComplete} disabled={completePending}>Concluir</Button>
            )}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              Comentários
            </button>
          </div>
        </div>
      </div>

      {/* Comments panel */}
      {expanded && (
        <div className="border-t border-border bg-muted/30 p-4 space-y-3">
          {comments?.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">Nenhum comentário ainda.</p>
          )}
          {comments?.map((cm) => (
            <div key={cm.id} className="text-sm">
              <span className="font-medium text-foreground">{cm.authorName}</span>
              <span className="text-muted-foreground text-xs ml-2">{formatDateTime(cm.createdAt)}</span>
              <p className="text-foreground mt-0.5">{cm.body}</p>
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <input
              className="flex-1 h-9 rounded-xl border border-border bg-card px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Escreva um comentário..."
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && commentBody.trim()) {
                  commentMutation.mutate(commentBody.trim());
                }
              }}
            />
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9"
              disabled={!commentBody.trim() || commentMutation.isPending}
              onClick={() => commentMutation.mutate(commentBody.trim())}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
