import { useQuery } from '@tanstack/react-query';
import { FlaskConical } from 'lucide-react';
import { apiGet } from '../lib/api.js';
import { Skeleton } from '../components/ui/skeleton.js';

interface Chamado { status: string; priority: string; }
interface Setor { id: number; name: string; cenpes: string; labs: { id: number; name: string }[]; }

export function OverviewPage() {
  const { data: chamados, isLoading: loadingC } = useQuery({
    queryKey: ['chamados'],
    queryFn: () => apiGet<Chamado[]>('/api/chamados'),
  });
  const { data: setores, isLoading: loadingS } = useQuery({
    queryKey: ['setores'],
    queryFn: () => apiGet<Setor[]>('/api/setores'),
  });

  const stats = {
    emEspera: chamados?.filter((c) => c.status === 'em_espera').length ?? 0,
    emProgresso: chamados?.filter((c) => c.status === 'em_progresso').length ?? 0,
    concluidos: chamados?.filter((c) => c.status === 'concluido').length ?? 0,
    alta: chamados?.filter((c) => c.priority === 'alta').length ?? 0,
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Mapas</h1>
        <p className="text-sm text-muted-foreground">Visão geral das operações</p>
      </div>

      {/* Stats */}
      {loadingC ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Em espera', value: stats.emEspera, color: 'text-yellow-600' },
            { label: 'Em progresso', value: stats.emProgresso, color: 'text-blue-600' },
            { label: 'Concluídos', value: stats.concluidos, color: 'text-green-600' },
            { label: 'Alta prioridade', value: stats.alta, color: 'text-red-600' },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Setores */}
      <h2 className="text-base font-semibold text-foreground">Setores</h2>
      {loadingS ? (
        <div className="space-y-3">{[1,2].map((i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : (
        <div className="space-y-3">
          {setores?.map((s) => (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <FlaskConical className="h-4 w-4 text-primary" />
                <p className="font-medium text-foreground">{s.name}</p>
                <span className="text-xs text-muted-foreground">({s.cenpes.replace('_', ' ')})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {s.labs.map((l) => (
                  <span key={l.id} className="text-xs bg-muted border border-border px-2 py-0.5 rounded-full text-muted-foreground">
                    {l.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
