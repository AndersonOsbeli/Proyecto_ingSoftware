import { createContext, useContext, ReactNode } from 'react';
import { User, UserRole, AuthState } from '../lib/user';
import { createStore } from '../lib/store';

const KEY = 'sg_auth';
const TOKEN_KEY = 'sg_token';

export interface AuthApi {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
  isSuperAdmin: boolean;
}

const authStore = createStore<AuthState>(KEY, () => ({ user: null, token: null }));

function getStoredUser(): User | null {
  return authStore.get().user;
}

export function login(username: string, password: string): boolean {
  if (username === 'superadmin' && password === 'super123') {
    const user: User = { id: '1', username: 'superadmin', role: 'superadmin', name: 'Super Usuario' };
    authStore.set({ user, token: 'fake-jwt-token' });
    localStorage.setItem(TOKEN_KEY, 'fake-jwt-token');
    return true;
  }
  if (username === 'admin' && password === 'admin') {
    const user: User = { id: '2', username: 'admin', role: 'admin', name: 'Administrador' };
    authStore.set({ user, token: 'fake-jwt-token' });
    localStorage.setItem(TOKEN_KEY, 'fake-jwt-token');
    return true;
  }
  if (username === 'rrhh' && password === 'rrhh123') {
    const user: User = { id: '3', username: 'rrhh', role: 'rrhh', name: 'Recursos Humanos' };
    authStore.set({ user, token: 'fake-jwt-token' });
    localStorage.setItem(TOKEN_KEY, 'fake-jwt-token');
    return true;
  }
  return false;
}

export function logout(): void {
  authStore.set({ user: null, token: null });
  localStorage.removeItem(TOKEN_KEY);
}

export function useAuthState(): User | null {
  return authStore.use().user;
}

const AuthContext = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useAuthState();
  const api: AuthApi = {
    currentUser: user,
    isAuthenticated: !!user,
    login,
    logout,
    hasRole: (...roles: UserRole[]) => !!user && roles.includes(user.role),
    isSuperAdmin: user?.role === 'superadmin'
  };
  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function requireAuth(): boolean {
  return getStoredUser() !== null;
}
