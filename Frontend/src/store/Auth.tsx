import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, endpoints, onAuthExpired, tokens } from '../lib/api';
import type { User } from '../types';

type AuthValue = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
  acceptTokens: (access: string, refresh: string) => Promise<void>;
};

const Ctx = createContext<AuthValue | null>(null);
export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('AuthProvider missing');
  return v;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    await tokens.load();
    if (!tokens.hasAny()) {
      setUser(null);
      setReady(true);
      return;
    }
    try {
      setUser(await api<User>(endpoints.me));
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void reload();
    return onAuthExpired(() => setUser(null));
  }, [reload]);

  const acceptTokens = useCallback(async (access: string, refresh: string) => {
    await tokens.save(access, refresh);
    try {
      setUser(await api<User>(endpoints.me));
      setReady(true);
    } catch (e) {
      await tokens.clear();
      setUser(null);
      throw e;
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const pair = await api<{ access: string; refresh: string }>('/api/v1/accounts/token/', {
        method: 'POST',
        auth: false,
        body: { email: email.trim(), password },
      });
      await acceptTokens(pair.access, pair.refresh);
    },
    [acceptTokens],
  );

  const logout = useCallback(async () => {
    await tokens.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, logout, reload, acceptTokens }),
    [user, ready, login, logout, reload, acceptTokens],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
