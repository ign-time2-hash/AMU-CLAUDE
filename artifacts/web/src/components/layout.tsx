import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Settings2, UserCircle2, LogOut, RefreshCcw, FlaskConical,
  PackageSearch, Crosshair, Plus, CalendarDays, Webhook,
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
  mobileLabel: string;
  icon: React.ReactNode;
  roles: UserRole[];
  badge?: number;
}

// Rotas de fluxo que ancoram a bolha no primeiro item
const FLOW_ROUTE_PREFIXES = ['/event/'];

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
    { to: '/agenda',       label: 'Agenda',        mobileLabel: 'Agenda',    icon: <CalendarDays className="h-5 w-5" />,       roles: ['planejador', 'cliente'] },
    { to: '/scan',         label: 'Scanner',       mobileLabel: 'Scanner',   icon: <Crosshair className="h-5 w-5" />,           roles: ['cliente'] },
    { to: '/overview',     label: 'Laboratórios',  mobileLabel: 'Labs',      icon: <FlaskConical className="h-5 w-5" />,        roles: ['planejador'] },
    { to: '/reschedules',  label: 'Reagendamento', mobileLabel: 'Remarc.',   icon: <RefreshCcw className="h-5 w-5" />,          roles: ['planejador'], badge: pendingCount ?? 0 },
    { to: '/inventario',   label: 'Inventário',    mobileLabel: 'Invent.',   icon: <PackageSearch className="h-5 w-5" />,       roles: ['planejador', 'cliente'] },
    { to: '/configuracoes',label: 'Configurações', mobileLabel: 'Config.',   icon: <Settings2 className="h-5 w-5" />,           roles: ['planejador'] },
    { to: '/perfil',       label: 'Perfil',        mobileLabel: 'Perfil',    icon: <UserCircle2 className="h-5 w-5" />,         roles: ['planejador', 'cliente'] },
  ];

  return items
    .filter((item) => user && item.roles.includes(user.role))
    .filter((item) => item.to !== '/configuracoes' || (user?.role === 'planejador' && user.isPlannerAdmin));
}

function initials(name: string): string {
  const parts = name.trim().split(' ');
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')).toUpperCase();
}

// ── Barra de navegação inferior (mobile) ──────────────────────────────────────

function MobileBottomNav({ items, location }: { items: NavItem[]; location: string }) {
  const n = items.length;
  if (n === 0) return null;

  const exactIndex = items.findIndex(
    (item) => location === item.to || location.startsWith(item.to + '/'),
  );
  const isFlowRoute = FLOW_ROUTE_PREFIXES.some((p) => location.startsWith(p));
  const bubbleIndex = exactIndex !== -1 ? exactIndex : isFlowRoute ? 0 : -1;

  // Animação de pop: dispara quando o índice ativo muda
  const [popIndex, setPopIndex] = useState<number | null>(null);
  const prevBubble = useRef(bubbleIndex);

  useEffect(() => {
    if (bubbleIndex !== -1 && bubbleIndex !== prevBubble.current) {
      setPopIndex(bubbleIndex);
      prevBubble.current = bubbleIndex;
      const t = setTimeout(() => setPopIndex(null), 420);
      return () => clearTimeout(t);
    }
  }, [bubbleIndex]);

  const slotPct = `${100 / n}%`;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30">
      <div
        className="rounded-t-2xl"
        style={{
          background: '#F2F2F2',
          boxShadow: '0 -6px 24px rgba(0,0,0,0.10)',
        }}
      >
        {/* Área dos itens (bolha + botões) — sem padding horizontal para que % da bolha e dos itens usem a mesma base */}
        <div className="relative flex pt-2 pb-1">
          {/* Bolha verde deslizante */}
          {bubbleIndex !== -1 && (
            <div
              aria-hidden
              className="absolute inset-y-1 rounded-full pointer-events-none"
              style={{
                width: slotPct,
                transform: `translateX(calc(${bubbleIndex} * 100%))`,
                transition: 'transform 800ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                background: 'linear-gradient(135deg, #4A9444 0%, #5A7D58 50%, #1E3A1C 100%)',
                boxShadow: '0 4px 14px rgba(63, 125, 58, 0.40)',
              }}
            />
          )}

          {/* Itens de navegação */}
          {items.map((item, i) => {
            const active = i === bubbleIndex;
            const badge = item.badge ?? 0;
            return (
              <Link
                key={item.to}
                href={item.to}
                style={{ width: slotPct }}
                className="relative z-10 flex flex-col items-center gap-0.5 py-1.5 select-none"
              >
                <div
                  className={cn(
                    'relative flex flex-col items-center gap-0.5',
                    'transition-colors duration-[220ms]',
                    active ? 'text-white' : 'text-[#9E9E9E]',
                    i === popIndex && 'animate-nav-pop',
                  )}
                >
                  {item.icon}
                  <span className="text-[9px] font-semibold uppercase tracking-widest leading-none">
                    {item.mobileLabel}
                  </span>

                  {/* Selo de notificação */}
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-3 min-w-[15px] h-[15px] flex items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white leading-none px-0.5">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Espaço de área segura (iOS home indicator) */}
        <div className="h-1" />
      </div>
    </nav>
  );
}

// ── Layout principal ───────────────────────────────────────────────────────────

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
            <Link
              href="/perfil"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              {initials(user.name) || 'AM'}
            </Link>
          </div>

          {user.role === 'planejador' && (
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 gap-1.5" asChild>
                <Link href={`/event/new?returnTo=${encodeURIComponent(location)}`}>
                  <Plus className="h-4 w-4" />Novo evento
                </Link>
              </Button>
              {user.isPlannerAdmin && (
                <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" asChild>
                  <Link href="/teams" title="Webhooks Teams">
                    <Webhook className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>

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
                {(item.badge ?? 0) > 0 && (
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

        <div className="flex-1 overflow-y-auto pb-24 md:pb-0">
          {children}
        </div>

        {/* Barra de navegação inferior (mobile) */}
        <MobileBottomNav items={navItems} location={location} />

        {/* FAB mobile (planejador) */}
        {user.role === 'planejador' && (
          <Link
            href={`/event/new?returnTo=${encodeURIComponent(location)}`}
            className="md:hidden fixed bottom-24 right-4 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-20"
          >
            <Plus className="h-6 w-6" />
          </Link>
        )}
      </main>
    </div>
  );
}
