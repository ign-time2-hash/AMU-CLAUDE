import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Settings2, UserCircle2, LogOut, FlaskConical,
  PackageSearch, Crosshair, Plus, CalendarDays, Webhook,
} from 'lucide-react';
import { IconReagendamento } from './icons/icon-reagendamento.js';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../lib/auth.js';
import { apiGet } from '../lib/api.js';
import { Button } from './ui/button.js';
import { cn } from '../lib/utils.js';
import { type UserRole, homePathByRole } from '../lib/roles.js';

const SIDEBAR_BORDER = 'rgba(199,218,191,0.87)';

interface NavItem {
  to: string;
  label: string;
  mobileLabel: string;
  icon: React.ReactNode;
  roles: UserRole[];
  badge?: number;
}

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
    { to: '/agenda',        label: 'Agenda',         mobileLabel: 'Agenda',   icon: <CalendarDays className="h-5 w-5" />,        roles: ['planejador', 'cliente'] },
    { to: '/scan',          label: 'Scanner',        mobileLabel: 'Scanner',  icon: <Crosshair className="h-5 w-5" />,            roles: ['cliente'] },
    { to: '/overview',      label: 'Laboratórios',   mobileLabel: 'Labs',     icon: <FlaskConical className="h-5 w-5" />,         roles: ['planejador'] },
    { to: '/reschedules',   label: 'Reagendamento',  mobileLabel: 'Remarc.',  icon: <IconReagendamento className="h-5 w-5" />,    roles: ['planejador'], badge: pendingCount ?? 0 },
    { to: '/inventario',    label: 'Inventário',     mobileLabel: 'Invent.',  icon: <PackageSearch className="h-5 w-5" />,        roles: ['planejador', 'cliente'] },
    { to: '/configuracoes', label: 'Configurações',  mobileLabel: 'Config.',  icon: <Settings2 className="h-5 w-5" />,            roles: ['planejador'] },
    { to: '/perfil',        label: 'Perfil',         mobileLabel: 'Perfil',   icon: <UserCircle2 className="h-5 w-5" />,          roles: ['planejador', 'cliente'] },
  ];

  return items
    .filter((item) => user && item.roles.includes(user.role))
    .filter((item) => item.to !== '/configuracoes' || (user?.role === 'planejador' && user.isPlannerAdmin));
}

function initials(name: string): string {
  const parts = name.trim().split(' ');
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')).toUpperCase();
}

// ── Mobile bottom nav ──────────────────────────────────────────────────────────

function MobileBottomNav({ items, location }: { items: NavItem[]; location: string }) {
  const n = items.length;
  if (n === 0) return null;

  const exactIndex = items.findIndex(
    (item) => location === item.to || location.startsWith(item.to + '/'),
  );
  const isFlowRoute = FLOW_ROUTE_PREFIXES.some((p) => location.startsWith(p));
  const bubbleIndex = exactIndex !== -1 ? exactIndex : isFlowRoute ? 0 : -1;

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
      <div className="rounded-t-2xl" style={{ background: '#F2F2F2', boxShadow: '0 -6px 24px rgba(0,0,0,0.10)' }}>
        <div className="relative flex pt-2 pb-1">
          {bubbleIndex !== -1 && (
            <div
              aria-hidden
              className="absolute inset-y-1 rounded-full pointer-events-none"
              style={{
                width: slotPct,
                transform: `translateX(calc(${bubbleIndex} * 100%))`,
                transition: 'transform 800ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                background: 'linear-gradient(135deg, #6AA151 0%, #5A7D58 50%, #1E3A1C 100%)',
                boxShadow: '0 4px 14px rgba(106,161,81,0.40)',
              }}
            />
          )}
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
                <div className={cn(
                  'relative flex flex-col items-center gap-0.5 transition-colors duration-[220ms]',
                  active ? 'text-white' : 'text-[#9E9E9E]',
                  i === popIndex && 'animate-nav-pop',
                )}>
                  {item.icon}
                  <span className="text-[9px] font-semibold uppercase tracking-widest leading-none">
                    {item.mobileLabel}
                  </span>
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
        <div className="h-1" />
      </div>
    </nav>
  );
}

// ── Layout principal ────────────────────────────────────────────────────────────

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const navItems = useNavItems();

  if (!user) return null;

  const homePath = homePathByRole(user.role);
  const showNewEvent = user.role === 'planejador';
  const showTeams = user.role === 'planejador' && user.isPlannerAdmin;

  return (
    <div className="flex flex-col h-screen bg-background">

      {/* ── Desktop top bar ────────────────────────────────────── */}
      <header
        className="hidden md:flex h-[65px] shrink-0 items-center justify-between px-6 bg-card z-20"
        style={{ borderBottom: `1px solid ${SIDEBAR_BORDER}` }}
      >
        <Link href={homePath} className="flex items-center">
          <img src="/logo/amu-logo-header.png" alt="AMU" className="h-9 w-auto object-contain" />
        </Link>

        <div className="flex items-center gap-2">
          {showTeams && (
            <Button variant="ghost" size="sm" className="text-foreground" asChild>
              <Link href="/teams">
                <Webhook className="h-4 w-4 mr-1.5" />Teams
              </Link>
            </Button>
          )}
          {showNewEvent && (
            <Button size="sm" className="rounded-xl shadow-inner" asChild>
              <Link href={`/event/new?returnTo=${encodeURIComponent(location)}`}>
                <Plus className="h-4 w-4 mr-1" />Novo evento
              </Link>
            </Button>
          )}
        </div>
      </header>

      {/* ── Below top bar ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Desktop sidebar ───────────────────────────────────── */}
        <aside
          className="hidden md:flex w-[250px] shrink-0 flex-col bg-card"
          style={{ borderRight: `1px solid ${SIDEBAR_BORDER}` }}
        >
          {/* User profile */}
          <div className="px-5 py-5" style={{ borderBottom: `1px solid ${SIDEBAR_BORDER}` }}>
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-xl bg-[#E9E9E9] flex items-center justify-center text-xl font-semibold text-[#828F7C] shrink-0">
                {initials(user.name) || 'AM'}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-[17px] leading-tight text-foreground truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{user.jobTitle}</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => {
              const active = location === item.to || location.startsWith(item.to + '/');
              return (
                <Link
                  key={item.to}
                  href={item.to}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12px] font-medium transition-colors',
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

          {/* Logout */}
          <div className="px-2 py-3" style={{ borderTop: `1px solid ${SIDEBAR_BORDER}` }}>
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-red-600 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Sair
            </button>
          </div>
        </aside>

        {/* ── Main ──────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile header */}
          <header className="md:hidden sticky top-0 z-20 h-14 border-b border-border bg-background/90 backdrop-blur flex items-center justify-between px-4">
            <Link href={homePath} className="flex items-center">
              <img src="/logo/amu-logo-header.png" alt="AMU" className="h-8 w-auto object-contain" />
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

          <MobileBottomNav items={navItems} location={location} />

          {/* FAB mobile */}
          {user.role === 'planejador' && (
            <Link
              href={`/event/new?returnTo=${encodeURIComponent(location)}`}
              className="md:hidden fixed bottom-24 right-4 h-14 w-14 rounded-[4px] bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-20"
              title="Agendar manutenção"
            >
              <Plus className="h-6 w-6" />
            </Link>
          )}
        </main>
      </div>
    </div>
  );
}
