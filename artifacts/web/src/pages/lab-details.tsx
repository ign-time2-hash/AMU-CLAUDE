import { useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api.js';
import { Skeleton } from '../components/ui/skeleton.js';

interface Lab { id: number; name: string; location: string; equipamentos?: { id: number; name: string; criticidade: string }[] }

export function LabDetailsPage() {
  const [, params] = useRoute<{ id: string }>('/lab/:id');
  const id = parseInt(params?.id ?? '0');

  const { data: tree, isLoading } = useQuery({
    queryKey: ['inventario-tree', id],
    queryFn: () => apiGet<Array<{ labs: Lab[] }>>('/api/inventario/tree', { idLab: id }),
    enabled: !!id,
  });

  const lab = tree?.flatMap((s) => s.labs).find((l) => l.id === id);

  if (isLoading) return <div className="p-6"><Skeleton className="h-40 w-full" /></div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">{lab?.name ?? `Lab ${id}`}</h1>
      {lab?.location && <p className="text-gray-500 text-sm mb-4">{lab.location}</p>}
      <h2 className="text-lg font-semibold mb-3">Equipamentos</h2>
      <div className="space-y-2">
        {lab?.equipamentos?.map((e) => (
          <div key={e.id} className="bg-white rounded-2xl border border-[#E5E7EB] p-3">
            <p className="font-medium text-sm">{e.name}</p>
            <p className="text-xs text-gray-400">{e.criticidade}</p>
          </div>
        ))}
        {(!lab?.equipamentos || lab.equipamentos.length === 0) && (
          <p className="text-gray-400 text-sm">Nenhum equipamento cadastrado</p>
        )}
      </div>
    </div>
  );
}
