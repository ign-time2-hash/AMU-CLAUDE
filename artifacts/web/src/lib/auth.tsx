import React, { createContext, useContext, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { setCurrentUsername } from './api.js';
import { type UserRole } from './roles.js';

export interface AuthUser {
  username: string;
  name: string;
  jobTitle: string;
  role: UserRole;
  isPlannerAdmin: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const queryClient = useQueryClient();

  const login = useCallback(async (username: string, password: string) => {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!resp.ok) {
      if (resp.status === 401) throw new Error('Credenciais invalidas');
      const json = (await resp.json()) as { error?: string };
      throw new Error(json.error ?? 'Falha ao autenticar');
    }

    const userData = (await resp.json()) as AuthUser;
    queryClient.clear();
    setCurrentUsername(userData.username);
    setUser(userData);
  }, [queryClient]);

  const logout = useCallback(() => {
    queryClient.clear();
    setCurrentUsername(null);
    setUser(null);
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
