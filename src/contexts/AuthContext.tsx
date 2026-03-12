import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import { tokenStorage } from '../services/tokenStorage';
import type { AuthUser, RegisterPayload, UserRole } from '../types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => void;
  refreshMe: () => Promise<void>;
  updateMe: (payload: Partial<Pick<AuthUser, 'full_name' | 'email'>>) => Promise<AuthUser>;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshMe = async () => {
    if (!tokenStorage.getAccessToken()) {
      setUser(null);
      return;
    }
    try {
      const me = await authService.getMe();
      setUser(me);
    } catch {
      tokenStorage.clearTokens();
      setUser(null);
    }
  };

  useEffect(() => {
    refreshMe().finally(() => setIsLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login: async (email: string, password: string) => {
        const me = await authService.login(email, password);
        setUser(me);
        return me;
      },
      register: async (payload: RegisterPayload) => {
        const me = await authService.register(payload);
        setUser(me);
        return me;
      },
      logout: () => {
        authService.logout();
        setUser(null);
      },
      refreshMe,
      updateMe: async (payload) => {
        const me = await authService.updateMe(payload);
        setUser(me);
        return me;
      },
      hasRole: (roles: UserRole[]) => !!user && roles.includes(user.role),
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
