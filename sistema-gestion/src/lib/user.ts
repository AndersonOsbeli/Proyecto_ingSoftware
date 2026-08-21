export type UserRole = 'superadmin' | 'admin' | 'rrhh';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
}

export const USERS: User[] = [
  { id: '1', username: 'superadmin', role: 'superadmin', name: 'Super Usuario' },
  { id: '2', username: 'admin', role: 'admin', name: 'Administrador' },
  { id: '3', username: 'rrhh', role: 'rrhh', name: 'Recursos Humanos' }
];

export const ROLE_PERMISSIONS = {
  superadmin: ['view_all', 'manage_users', 'system_config', 'view_logs', 'manage_inventory'],
  admin: ['view_logs', 'manage_inventory', 'manage_entries'],
  rrhh: ['view_logs', 'manage_inventory', 'manage_entries']
};
