import { createContext, useContext, ReactNode } from 'react';
import { User, UserRole, AuthState } from '../lib/user';
import { createStore } from '../lib/store';

const KEY = 'sg_auth';
const TOKEN_KEY = 'sg_token';

export interface AuthApi {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
  isSuperAdmin: boolean;
}

const authStore = createStore<AuthState>(KEY, () => ({ user: null, token: null }));

function getStoredUser(): User | null {
  return authStore.get().user;
}

// Login asíncrono consultando SQL Server
export async function login(username: string, password: string): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) return false;

    const data = await res.json();
    if (data.success && data.user) {
      const user: User = data.user;
      authStore.set({ user, token: data.token });
      localStorage.setItem(TOKEN_KEY, data.token);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error al conectar con el servidor de autenticación:', err);
    return false;
  }
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