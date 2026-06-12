import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Archive } from 'lucide-react';
import { apiGet, apiPost } from '../lib/api.js';
import { useAuth } from '../lib/auth.js';
import { Button } from '../components/ui/button.js';
import { Input } from '../components/ui/input.js';
import { Label } from '../components/ui/label.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog.js';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet.js';
import { Skeleton } from '../components/ui/skeleton.js';
import { cn } from '../lib/utils.js';

interface Equipamento {
  id: number;
  name: string;
  criticidade: 'baixa' | 'normal' | 'alta';
  localInstalacao?: string | null;
  gerencia?: string | null;
}

interface LabTree {
  id: number;
  name: string;
  equipamentos: Equipamento[];
}

interface SetorTree {
  id: number;
  name: string;
  cenpes: string;
  labs: LabTree[];
}

interface Lab { id: number; name: string; }

const CRITICIDADE_BADGE: Record<string, string> = {
  baixa: 'bg-green-100 text-green-700',
  normal: 'bg-yellow-100 text-yellow-800',
  alta: 'bg-red-100 text-red-700',
};

const CRITICIDADE_LABEL: Record<string, string> = {
  baixa:  'Baixa',
  normal: 'Média',
  alta:   'Alta',
};

const createSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(120, 'Máx 120 caracteres'),
  idLab: z.string().min(1, 'Selecione um laboratório'),
  criticidade: z.enum(['baixa', 'normal', 'alta']),
  localInstalacao: z.string().max(120).optional(),
  gerencia: z.string().max(120).optional(),
});

type CreateForm = z.infer<typeof createSchema>;

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debouncedValue;
}

function EquipamentoForm({ labs, onSuccess }: { labs: Lab[] | undefined; onSuccess: () => void }) {
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { criticidade: 'normal' },
  });

  const criticidade = watch('criticidade');

  const createMutation = useMutation({
    mutationFn: (data: CreateForm) =>
      apiPost('/api/inventario/equipamentos', { ...data, idLab: parseInt(data.idLab) }),
    onSuccess: () => {
      toast.success('Equipamento cadastrado.');
      reset();
      onSuccess();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erro ao cadastrar equipamento'),
  });

  return (
    <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4 mt-2">
      <div className="space-y-1.5">
        <Label>Laboratório</Label>
        <Select onValueChange={(v) => setValue('idLab', v)}>
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            {labs?.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors.idLab && <p className="text-sm text-red-600">{errors.idLab.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Nome do equipamento</Label>
        <Input {...register('name')} placeholder="Ex: Autoclave 1" />
        {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Criticidade</Label>
        <div className="flex gap-2">
          {(['baixa', 'normal', 'alta'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setValue('criticidade', c)}
              className={cn(
                'flex-1 rounded-2xl border px-3 py-2 text-sm font-medium capitalize transition-colors',
                criticidade === c
                  ? c === 'baixa' ? 'bg-green-100 border-green-300 text-green-800'
                    : c === 'normal' ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
                    : 'bg-red-100 border-red-300 text-red-800'
                  : 'border-border text-muted-foreground hover:bg-muted',
              )}
            >
              {CRITICIDADE_LABEL[c]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Local de instalação <span className="text-muted-foreground">(opcional)</span></Label>
        <Input {...register('localInstalacao')} placeholder="Ex: Bancada 1" />
      </div>

      <div className="space-y-1.5">
        <Label>Gerência <span className="text-muted-foreground">(opcional)</span></Label>
        <Input {...register('gerencia')} placeholder="Ex: Gerência de Química" />
      </div>

      <Button type="submit" className="w-full" disabled={createMutation.isPending}>
        {createMutation.isPending ? 'Cadastrando...' : 'Cadastrar equipamento'}
      </Button>
    </form>
  );
}

export function InventarioPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rawQuery, setRawQuery] = useState('');
  const [selectedCenpes, setSelectedCenpes] = useState<string | undefined>(undefined);
  const [selectedSetorId, setSelectedSetorId] = useState<number | undefined>(undefined);
  const [selectedLabId, setSelectedLabId] = useState<number | undefined>(undefined);
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
  const q = useDebounce(rawQuery, 300);

  const { data: labs } = useQuery({
    queryKey: ['labs-allowed'],
    queryFn: () => apiGet<Lab[]>('/api/inventario/labs-allowed'),
  });

  const { data: setores } = useQuery({
    queryKey: ['setores'],
    queryFn: () => apiGet<{ id: number; name: string }[]>('/api/setores'),
    enabled: user?.role === 'planejador',
  });

  const { data: tree, isLoading } = useQuery({
    queryKey: ['inventario-tree', selectedCenpes, selectedSetorId, selectedLabId, q],
    queryFn: () => apiGet<SetorTree[]>('/api/inventario/tree', {
      cenpes: selectedCenpes,
      idSetor: selectedSetorId,
      idLab: selectedLabId,
      q: q || undefined,
    }),
    // cliente só consulta após selecionar lab
    enabled: user?.role === 'planejador' || (user?.role === 'cliente' && !!selectedLabId),
  });

  const onSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['inventario-tree'] });
    setOpen(false);
  }, [queryClient]);

  const isEmpty = tree?.every((s) => s.labs.every((l) => l.equipamentos.length === 0));

  const FormWrapper = ({ children }: { children: React.ReactNode }) =>
    isDesktop ? (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo equipamento</DialogTitle></DialogHeader>
          <EquipamentoForm labs={labs} onSuccess={onSuccess} />
        </DialogContent>
      </Dialog>
    ) : (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{children}</SheetTrigger>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader><SheetTitle>Novo equipamento</SheetTitle></SheetHeader>
          <EquipamentoForm labs={labs} onSuccess={onSuccess} />
        </SheetContent>
      </Sheet>
    );

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Inventário</h1>
          <p className="text-sm text-muted-foreground">Estrutura por Cenpes, Setor e Laboratório.</p>
        </div>
        {user?.role === 'planejador' && (
          <FormWrapper>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo equipamento</Button>
          </FormWrapper>
        )}
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        {user?.role === 'planejador' && (
          <>
            {/* Tabs Cenpes */}
            <div className="flex gap-2">
              {[
                { label: 'Geral', value: undefined },
                { label: 'Cenpes 1', value: 'cenpes_1' },
                { label: 'Cenpes 2', value: 'cenpes_2' },
              ].map((t) => (
                <Button
                  key={t.label}
                  size="sm"
                  variant={selectedCenpes === t.value ? 'default' : 'outline'}
                  onClick={() => { setSelectedCenpes(t.value); setSelectedSetorId(undefined); setSelectedLabId(undefined); }}
                >
                  {t.label}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Select
                onValueChange={(v) => {
                  setSelectedSetorId(v === 'all' ? undefined : parseInt(v));
                  setSelectedLabId(undefined); // reset lab on setor change
                }}
              >
                <SelectTrigger><SelectValue placeholder="Todos os setores" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os setores</SelectItem>
                  {setores?.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select
                disabled={!selectedSetorId}
                onValueChange={(v) => setSelectedLabId(v === 'all' ? undefined : parseInt(v))}
                key={selectedSetorId}  // reset select when setor changes
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedSetorId ? 'Todos os labs' : 'Selecione um setor'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os labs</SelectItem>
                  {labs?.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Input
                placeholder="Buscar por nome do equipamento"
                value={rawQuery}
                onChange={(e) => setRawQuery(e.target.value)}
                className="md:col-span-2"
              />
            </div>
          </>
        )}

        {user?.role === 'cliente' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select onValueChange={(v) => setSelectedLabId(v === 'none' ? undefined : parseInt(v))}>
              <SelectTrigger><SelectValue placeholder="Selecione seu laboratório" /></SelectTrigger>
              <SelectContent>
                {labs?.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Buscar por nome do equipamento" value={rawQuery} onChange={(e) => setRawQuery(e.target.value)} />
          </div>
        )}
      </div>

      {/* Cliente: aviso antes de selecionar lab */}
      {user?.role === 'cliente' && !selectedLabId && (
        <div className="rounded-2xl border border-border bg-card flex flex-col items-center justify-center py-16 gap-3">
          <Archive className="h-10 w-10 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">Selecione seu laboratório para ver os equipamentos</p>
        </div>
      )}

      {/* Lista */}
      {(user?.role === 'planejador' || (user?.role === 'cliente' && !!selectedLabId)) && isLoading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : (user?.role === 'planejador' || (user?.role === 'cliente' && !!selectedLabId)) && isEmpty ? (
        <div className="rounded-2xl border border-border bg-card flex flex-col items-center justify-center py-16 gap-3">
          <Archive className="h-10 w-10 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">Nenhum equipamento encontrado</p>
        </div>
      ) : (user?.role === 'planejador' || (user?.role === 'cliente' && !!selectedLabId)) ? (
        <div className="space-y-5">
          {tree?.map((setor) => (
            <div key={setor.id}>
              {/* Setor header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{setor.name}</span>
                <span className="text-xs text-muted-foreground">({setor.cenpes.replace('_', ' ')})</span>
              </div>

              {setor.labs.map((lab) => lab.equipamentos.length > 0 && (
                <div key={lab.id} className="rounded-2xl border border-border bg-card mb-3 overflow-hidden">
                  <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
                    <h3 className="font-medium text-sm text-foreground">{lab.name}</h3>
                    <span className="text-xs text-muted-foreground">{lab.equipamentos.length} equipamento(s)</span>
                  </div>
                  <div className="divide-y divide-border">
                    {lab.equipamentos.map((eq) => (
                      <div key={eq.id} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{eq.name}</p>
                          {(eq.localInstalacao || eq.gerencia) && (
                            <p className="text-xs text-muted-foreground">
                              {[eq.localInstalacao, eq.gerencia].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', CRITICIDADE_BADGE[eq.criticidade])}>
                          {CRITICIDADE_LABEL[eq.criticidade] ?? eq.criticidade}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
