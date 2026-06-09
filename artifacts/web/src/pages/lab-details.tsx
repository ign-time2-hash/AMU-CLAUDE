import { Link, useRoute, Redirect } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api.js';
import { Skeleton } from '../components/ui/skeleton.js';
import { Button } from '../components/ui/button.js';

interface Equipamento {
  id: number;
  name: string;
  localInstalacao: string | null;
  gerencia: string | null;
  criticidade: 'baixa' | 'normal' | 'alta';
}

interface Lab {
  id: number;
  name: string;
  location: string;
  equipamentos: Equipamento[];
}

interface SetorTree {
  id: number;
  name: string;
  cenpes: string;
  labs: Lab[];
}

const CRITICIDADE_BADGE: Record<string, string> = {
  baixa: 'bg-green-100 text-green-800',
  normal: 'bg-yellow-100 text-yellow-800',
  alta: 'bg-red-100 text-red-800',
};

export function LabDetailsPage() {
  const [, params] = useRoute<{ id: string }>('/lab/:id');
  const id = parseInt(params?.id ?? '');

  const { data: tree, isLoading, isError } = useQuery({
    queryKey: ['lab-details', id],
    queryFn: () => apiGet<SetorTree[]>('/api/inventario/tree', { idLab: id }),
    enabled: !!id && !isNaN(id),
  });

  if (!id || isNaN(id)) return <Redirect to="/agenda" />;

  const setorEntry = tree?.find((s) => s.labs.some((l) => l.id === id));
  const lab = setorEntry?.labs.find((l) => l.id === id);

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !lab) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-sm text-muted-foreground">Lab não encontrado.</p>
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link href="/agenda">Voltar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{lab.name}</h1>
        {lab.location && <p className="text-sm text-muted-foreground mt-0.5">{lab.location}</p>}
        {setorEntry && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {setorEntry.name} · {setorEntry.cenpes.replace('_', ' ')}
          </p>
        )}
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Equipamentos</h2>
        {lab.equipamentos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem equipamentos cadastrados.</p>
        ) : (
          <div className="space-y-2">
            {lab.equipamentos.map((e) => (
              <div key={e.id} className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm text-foreground">{e.name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${CRITICIDADE_BADGE[e.criticidade]}`}>
                    {e.criticidade}
                  </span>
                </div>
                {(e.localInstalacao || e.gerencia) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {[e.localInstalacao, e.gerencia].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Button variant="outline" size="sm" asChild>
        <Link href="/inventario">Ver inventário completo</Link>
      </Button>
    </div>
  );
}
