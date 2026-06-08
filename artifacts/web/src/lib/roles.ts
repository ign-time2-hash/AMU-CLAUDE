export type UserRole = 'planejador' | 'cliente' | 'tecnico_externo';

export const ROLE_LABEL: Record<UserRole, string> = {
  planejador: 'Planejador',
  cliente: 'Cliente',
  tecnico_externo: 'Técnico externo',
};

export const ROLE_ACCESS_LABEL: Record<UserRole, string> = {
  planejador: 'Acesso total',
  cliente: 'Acesso restrito',
  tecnico_externo: 'Acesso de execução',
};

export function homePathByRole(role: UserRole): string {
  return role === 'tecnico_externo' ? '/scan' : '/agenda';
}
