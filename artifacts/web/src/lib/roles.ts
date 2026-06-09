export type UserRole = 'planejador' | 'cliente';

export const ROLE_LABEL: Record<UserRole, string> = {
  planejador: 'Planejador',
  cliente: 'Cliente',
};

export const ROLE_ACCESS_LABEL: Record<UserRole, string> = {
  planejador: 'Acesso total',
  cliente: 'Acesso restrito',
};

export function homePathByRole(_role: UserRole): string {
  return '/agenda';
}
