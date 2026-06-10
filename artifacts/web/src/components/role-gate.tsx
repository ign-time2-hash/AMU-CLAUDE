import { Redirect } from 'wouter';
import { type UserRole } from '../lib/roles.js';
import { useAuth } from '../lib/auth.js';

interface RoleGateProps {
  allow: UserRole[];
  fallbackTo?: string;
  children: React.ReactNode;
}

export function RoleGate({ allow, fallbackTo = '/agenda', children }: RoleGateProps) {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (!user || !allow.includes(user.role)) return <Redirect to={fallbackTo} />;
  return <>{children}</>;
}
