import { useRef } from 'react';
import { Switch, Route, Redirect, useLocation } from 'wouter';
import { useAuth } from './lib/auth.js';
import { homePathByRole } from './lib/roles.js';
import { Layout } from './components/layout.js';
import { RoleGate } from './components/role-gate.js';
import { EventDialog } from './calendar/event-dialog.js';
import { LoginPage } from './pages/login.js';
import { AgendaPage } from './pages/agenda.js';
import { ChamadosPage } from './pages/chamados.js';
import { InventarioPage } from './pages/inventario.js';
import { OverviewPage } from './pages/overview.js';
import { TeamsPage } from './pages/teams.js';
import { ConfiguracoesPage } from './pages/configuracoes.js';
import { ReschedulesPage } from './pages/reschedules.js';
import { PerfilPage } from './pages/perfil.js';
import { ScannerPage } from './pages/scanner.js';
import { LabDetailsPage } from './pages/lab-details.js';

const OVERLAY_PATHS = ['/event/new', '/event/'];

function isOverlayPath(path: string): boolean {
  return OVERLAY_PATHS.some((p) => path === p || path.startsWith(p));
}

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();
  const [location] = useLocation();
  const backgroundLocationRef = useRef(location);

  if (!isAuthenticated || !user) {
    return <LoginPage />;
  }

  // Keep background location updated when NOT on an overlay route
  if (!isOverlayPath(location)) {
    backgroundLocationRef.current = location;
  }

  const home = homePathByRole(user.role);
  const showOverlay = isOverlayPath(location);

  return (
    <Layout>
      {/* Background switch — always renders the non-overlay page */}
      <Switch location={showOverlay ? backgroundLocationRef.current : location}>
        <Route path="/" component={() => <Redirect to={home} />} />

        <Route path="/agenda">
          <AgendaPage />
        </Route>

        <Route path="/chamados" component={ChamadosPage} />

        <Route path="/inventario">
          <RoleGate allow={['planejador', 'cliente']}>
            <InventarioPage />
          </RoleGate>
        </Route>

        <Route path="/reschedules">
          <RoleGate allow={['planejador']}>
            <ReschedulesPage />
          </RoleGate>
        </Route>

        <Route path="/overview">
          <RoleGate allow={['planejador']}>
            <OverviewPage />
          </RoleGate>
        </Route>

        <Route path="/teams">
          <RoleGate allow={['planejador']}>
            <TeamsPage />
          </RoleGate>
        </Route>

        <Route path="/configuracoes">
          <RoleGate allow={['planejador']}>
            <ConfiguracoesPage />
          </RoleGate>
        </Route>

        <Route path="/scan">
          <RoleGate allow={['cliente']} fallbackTo="/agenda">
            <ScannerPage />
          </RoleGate>
        </Route>

        <Route path="/lab/:id" component={LabDetailsPage} />
        <Route path="/perfil" component={PerfilPage} />
        <Route component={() => <Redirect to={home} />} />
      </Switch>

      {/* Event overlay — rendered on top of background page */}
      {showOverlay && user.role === 'planejador' && <EventDialog />}
    </Layout>
  );
}

export default function App() {
  return <AppRoutes />;
}
