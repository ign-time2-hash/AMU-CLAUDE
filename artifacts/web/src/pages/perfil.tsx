import { useAuth } from '../lib/auth.js';
import { Button } from '../components/ui/button.js';
import { ROLE_LABEL, ROLE_ACCESS_LABEL } from '../lib/roles.js';

export function PerfilPage() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const initials = user.name.trim().split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  return (
    <div className="p-4 md:p-6 max-w-md">
      <h1 className="text-xl font-semibold text-foreground mb-6">Perfil</h1>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
            {initials || 'AM'}
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.username}</p>
          </div>
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Cargo</span>
            <span className="font-medium text-foreground">{user.jobTitle}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Papel</span>
            <span className="font-medium text-foreground">{ROLE_LABEL[user.role]}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Acesso</span>
            <span className="font-medium text-foreground">
              {user.role === 'planejador'
                ? user.isPlannerAdmin ? 'Acesso total' : 'Acesso operacional'
                : ROLE_ACCESS_LABEL[user.role]}
            </span>
          </div>
        </div>

        <Button variant="destructive" className="w-full" onClick={logout}>
          Sair do sistema
        </Button>
      </div>
    </div>
  );
}
