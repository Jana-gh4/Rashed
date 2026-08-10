// @refresh reset
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api, getToken, setToken, clearToken, type UserData } from './api';

interface AuthContextValue {
  user: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, lang?: 'ar' | 'en') => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    // If there's no token, skip the /me call (saves a 401 round-trip)
    if (!getToken()) {
      setUser(null);
      return;
    }
    try {
      const me = await api.auth.me();
      setUser(me);
    } catch {
      clearToken();
      setUser(null);
    }
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { user: u, token } = await api.auth.login({ email, password });
    setToken(token);
    setUser(u);
  };

  const register = async (name: string, email: string, password: string, lang: 'ar' | 'en' = 'ar') => {
    const { user: u, token } = await api.auth.register({ name, email, password, preferredLanguage: lang });
    setToken(token);
    setUser(u);
  };

  const logout = async () => {
    try { await api.auth.logout(); } catch {}
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
