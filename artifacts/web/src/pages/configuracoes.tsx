import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Trash2, QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { apiGet, apiPost, apiDelete, apiPatch } from '../lib/api.js';
import { Button } from '../components/ui/button.js';
import { Switch } from '../components/ui/switch.js';
import { Input } from '../components/ui/input.js';
import { Label } from '../components/ui/label.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog.js';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog.js';
import { Skeleton } from '../components/ui/skeleton.js';

interface Setor { id: number; name: string; cenpes: string; }
interface Lab { id: number; name: string; location: string; setor?: Setor | null; }
interface User { username: string; name: string; jobTitle: string; role: string; active: boolean; }

function SetorList() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const schema = z.object({ name: z.string().min(1, 'Nome obrigatório'), cenpes: z.enum(['cenpes_1', 'cenpes_2']) });
  type Form = z.infer<typeof schema>;

  const { data: setores, isLoading } = useQuery({ queryKey: ['conf-setores'], queryFn: () => apiGet<Setor[]>('/api/configuracoes/setores') });
  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { cenpes: 'cenpes_2' } });

  const createMut = useMutation({
    mutationFn: (d: Form) => apiPost('/api/configuracoes/setores', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['conf-setores'] }); queryClient.invalidateQueries({ queryKey: ['setores'] }); toast.success('Setor criado'); setOpen(false); reset(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erro'),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/configuracoes/setores/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['conf-setores'] }); queryClient.invalidateQueries({ queryKey: ['setores'] }); toast.success('Setor removido'); },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erro'),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-foreground">Setores</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo setor</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit((d) => createMut.mutate(d))} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input {...register('name')} placeholder="Ex: Setor de Química" />
                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Cenpes</Label>
                <Select defaultValue="cenpes_2" onValueChange={(v) => setValue('cenpes', v as 'cenpes_1' | 'cenpes_2')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cenpes_1">Cenpes 1</SelectItem>
                    <SelectItem value="cenpes_2">Cenpes 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createMut.isPending}>Criar setor</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? <Skeleton className="h-32 w-full" /> : (
        <div className="space-y-2">
          {setores?.map((s) => (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-foreground">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.cenpes.replace('_', ' ')}</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="text-red-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover setor</AlertDialogTitle>
                    <AlertDialogDescription>Remover "{s.name}"? Esta ação não pode ser desfeita.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" onClick={() => deleteMut.mutate(s.id)}>Remover</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
          {setores?.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Nenhum setor cadastrado</p>}
        </div>
      )}
    </div>
  );
}

function downloadQrPng(labId: number) {
  const canvas = document.querySelector<HTMLCanvasElement>('#amu-qr-canvas canvas');
  if (!canvas) return;
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `lab-${labId}.png`;
  a.click();
}

function LabList() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [qrLabId, setQrLabId] = useState<number | null>(null);
  const schema = z.object({ name: z.string().min(1, 'Nome obrigatório'), location: z.string().optional(), idSetor: z.string().optional() });
  type Form = z.infer<typeof schema>;

  const { data: labs, isLoading } = useQuery({ queryKey: ['conf-labs'], queryFn: () => apiGet<Lab[]>('/api/configuracoes/labs') });
  const { data: setores } = useQuery({ queryKey: ['conf-setores'], queryFn: () => apiGet<Setor[]>('/api/configuracoes/setores') });
  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  const createMut = useMutation({
    mutationFn: (d: Form) => apiPost('/api/configuracoes/labs', { ...d, idSetor: d.idSetor ? parseInt(d.idSetor) : null }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['conf-labs'] }); queryClient.invalidateQueries({ queryKey: ['labs'] }); toast.success('Lab criado'); setOpen(false); reset(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erro'),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/configuracoes/labs/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['conf-labs'] }); queryClient.invalidateQueries({ queryKey: ['labs'] }); toast.success('Lab removido'); },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erro'),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-foreground">Laboratórios</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo laboratório</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit((d) => createMut.mutate(d))} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input {...register('name')} placeholder="Ex: Lab de Síntese" />
                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Localização</Label>
                <Input {...register('location')} placeholder="Ex: Bloco A, Sala 101" />
              </div>
              <div className="space-y-1.5">
                <Label>Setor <span className="text-muted-foreground">(opcional)</span></Label>
                <Select onValueChange={(v) => setValue('idSetor', v === 'none' ? undefined : v)}>
                  <SelectTrigger><SelectValue placeholder="Sem setor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem setor</SelectItem>
                    {setores?.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createMut.isPending}>Criar laboratório</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? <Skeleton className="h-32 w-full" /> : (
        <div className="space-y-2">
          {labs?.map((l) => (
            <div key={l.id} className="rounded-2xl border border-border bg-card p-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-foreground">{l.name}</p>
                <p className="text-xs text-muted-foreground">{l.setor?.name ?? 'Sem setor'} {l.location ? `· ${l.location}` : ''}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={() => setQrLabId(qrLabId === l.id ? null : l.id)} title="Gerar QR Code">
                  <QrCode className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="text-red-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover laboratório</AlertDialogTitle>
                      <AlertDialogDescription>Remover "{l.name}"? Esta ação não pode ser desfeita.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" onClick={() => deleteMut.mutate(l.id)}>Remover</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
          {labs?.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Nenhum laboratório cadastrado</p>}
        </div>
      )}

      {qrLabId !== null && (
        <div className="rounded-2xl border border-border bg-card p-4 mt-4">
          <p className="font-semibold text-sm text-foreground">QR do Lab #{qrLabId}</p>
          <p className="text-xs text-muted-foreground mt-0.5 break-all">
            {typeof window !== 'undefined' ? `${window.location.origin}/lab/${qrLabId}` : ''}
          </p>
          <div id="amu-qr-canvas" className="mt-4 inline-block rounded-2xl border bg-white p-4">
            <QRCodeCanvas value={`${window.location.origin}/lab/${qrLabId}`} size={220} />
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => window.print()}>Imprimir</Button>
            <Button variant="outline" size="sm" onClick={() => downloadQrPng(qrLabId)}>Baixar PNG</Button>
            <Button size="sm" onClick={() => setQrLabId(null)}>Fechar</Button>
          </div>
        </div>
      )}
    </div>
  );
}

const roleLabel: Record<string, string> = {
  planejador: 'Planejador',
  cliente: 'Cliente',
};

function UserList() {
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useQuery({ queryKey: ['conf-usuarios'], queryFn: () => apiGet<User[]>('/api/configuracoes/usuarios') });

  const toggleMut = useMutation({
    mutationFn: ({ username, active }: { username: string; active: boolean }) =>
      apiPatch(`/api/configuracoes/usuarios/${username}`, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conf-usuarios'] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erro'),
  });

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-base font-semibold text-foreground">Usuários</h2>
        <p className="text-xs text-muted-foreground">Habilite ou desabilite o acesso de cada conta</p>
      </div>
      {isLoading ? <Skeleton className="h-32 w-full" /> : (
        <div className="space-y-2">
          {users?.map((u) => (
            <div key={u.username} className="rounded-2xl border border-border bg-card p-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-foreground">{u.name}</p>
                <p className="text-xs text-muted-foreground">{roleLabel[u.role] ?? u.role} · {u.username}</p>
              </div>
              <Switch
                checked={u.active}
                disabled={u.role === 'planejador' || toggleMut.isPending}
                onCheckedChange={(checked) => toggleMut.mutate({ username: u.username, active: checked })}
                title={u.role === 'planejador' ? 'Conta do planejador não pode ser desabilitada' : undefined}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ConfiguracoesPage() {
  return (
    <div className="p-4 md:p-6 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie usuários, setores e laboratórios</p>
      </div>
      <UserList />
      <SetorList />
      <LabList />
    </div>
  );
}
