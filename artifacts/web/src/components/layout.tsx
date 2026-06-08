import { Link, useLocation } from 'wouter';
import {
  Settings2, UserCircle2, LogOut, RefreshCcw, FlaskConical,
  PackageSearch, MessageSquareWarning, Crosshair, Plus, CalendarDays, Webhook,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AmuLogo, AmuLogoText } from './amu-logo.js';
import { useAuth } from '../lib/auth.js';
import { apiGet } from '../lib/api.js';
import { Button } from './ui/button.js';
import { cn } from '../lib/utils.js';
import { type UserRole, homePathByRole } from '../lib/roles.js';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: UserRole[];
  badge?: number;
}

function useNavItems(): NavItem[] {
  const { user } = useAuth();

  const { data: pendingCount } = useQuery({
    queryKey: ['reschedule-requests', 'pendente'],
    queryFn: () => apiGet<{ id: number; status: string }[]>('/api/reschedule-requests'),
    refetchInterval: 30_000,
    enabled: user?.role === 'planejador',
    select: (data) => data.filter((r) => r.status === 'pendente').length,
  });

  const items: NavItem[] = [
    { to: '/agenda', label: 'Agenda', icon: <CalendarDays className="h-5 w-5" />, roles: ['planejador', 'cliente'] },
    { to: '/scan', label: 'Scanner', icon: <Crosshair className="h-5 w-5" />, roles: ['tecnico_externo'] },
    {
      to: '/reschedules',
      label: 'Reagendamento',
      icon: <RefreshCcw className="h-5 w-5" />,
      roles: ['planejador'],
      badge: pendingCount ?? 0,
    },
    { to: '/overview', label: 'Mapas', icon: <FlaskConical className="h-5 w-5" />, roles: ['planejador'] },
    { to: '/inventario', label: 'Inventário', icon: <PackageSearch className="h-5 w-5" />, roles: ['planejador', 'cliente'] },
    { to: '/chamados', label: 'Chamados', icon: <MessageSquareWarning className="h-5 w-5" />, roles: ['tecnico_externo'] },
    { to: '/configuracoes', label: 'Configurações', icon: <Settings2 className="h-5 w-5" />, roles: ['planejador'] },
    { to: '/perfil', label: 'Perfil', icon: <UserCircle2 className="h-5 w-5" />, roles: ['planejador', 'cliente', 'tecnico_externo'] },
  ];

  return items.filter((item) => user && item.roles.includes(user.role));
}

function initials(name: string): string {
  const parts = name.trim().split(' ');
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')).toUpperCase();
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const navItems = useNavItems();

  if (!user) return null;

  const homePath = homePathByRole(user.role);

  return (
    <div className="flex h-screen bg-background">
      {/* ── Sidebar (desktop) ─────────────────────────── */}
      <aside className="hidden md:flex w-56 flex-col shrink-0 bg-card border-r border-border">
        <div className="px-4 py-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <Link href={homePath} className="flex items-center gap-2">
              <AmuLogo size={30} />
              <AmuLogoText />
            </Link>
            {/* AvatarButton */}
            <Link
              href="/perfil"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              {initials(user.name) || 'AM'}
            </Link>
          </div>

          {/* "Novo evento" — planejador only */}
          {user.role === 'planejador' && (
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 gap-1.5" asChild>
                <Link href={`/event/new?returnTo=${encodeURIComponent(location)}`}>
                  <Plus className="h-4 w-4" />Novo evento
                </Link>
              </Button>
              <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" asChild>
                <Link href="/teams" title="Webhooks Teams">
                  <Webhook className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = location === item.to || location.startsWith(item.to + '/');
            return (
              <Link
                key={item.to}
                href={item.to}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted',
                )}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-2 py-3 border-t border-border">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header mobile */}
        <header className="md:hidden sticky top-0 z-20 h-14 border-b border-border bg-background/90 backdrop-blur flex items-center justify-between px-4">
          <Link href={homePath} className="flex items-center gap-2">
            <AmuLogo size={28} />
            <span className="font-bold text-primary">AMU</span>
          </Link>
          <Link
            href="/perfil"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold text-foreground"
          >
            {initials(user.name) || 'AM'}
          </Link>
        </header>

        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </div>

        {/* Bottom nav (mobile) */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-card border-t border-border flex justify-around items-center px-1 py-2 z-20">
          {navItems.slice(0, 4).map((item) => {
            const active = location === item.to || location.startsWith(item.to + '/');
            return (
              <Link
                key={item.to}
                href={item.to}
                className={cn(
                  'flex flex-col items-center gap-0.5 min-w-[60px] py-1 relative',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {item.icon}
                <span className="text-[10px]">{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="absolute top-0 right-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-semibold text-white leading-none">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* FAB mobile (planejador) */}
        {user.role === 'planejador' && (
          <Link
            href={`/event/new?returnTo=${encodeURIComponent(location)}`}
            className="md:hidden fixed bottom-20 right-4 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-20"
          >
            <Plus className="h-6 w-6" />
          </Link>
        )}
      </main>
    </div>
  );
}
