import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { adminApi, adminToken, onAdminExpired, Workspace } from '../lib/adminApi';

type AdminValue = {
  ready: boolean;
  workspace: Workspace | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshWorkspace: () => Promise<void>;
  can: (key: string) => boolean;
};

const Ctx = createContext<AdminValue | null>(null);
export const useAdmin = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('AdminProvider missing');
  return v;
};

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [ready, setReady] = useState(false);

  const refreshWorkspace = useCallback(async () => {
    const ws = await adminApi<Workspace>('workspace/');
    setWorkspace(ws);
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      const saved = await adminToken.load();
      if (saved) {
        try {
          await refreshWorkspace();
        } catch {
          await adminToken.clear();
          if (live) setWorkspace(null);
        }
      }
      if (live) setReady(true);
    })();
    const off = onAdminExpired(() => setWorkspace(null));
    return () => {
      live = false;
      off();
    };
  }, [refreshWorkspace]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const res = await adminApi<{ token: string }>('login/', {
        method: 'POST',
        body: { email: email.trim(), password },
        login: true,
      });
      await adminToken.save(res.token);
      try {
        await refreshWorkspace();
      } catch (e) {
        await adminToken.clear();
        throw e;
      }
    },
    [refreshWorkspace],
  );

  const signOut = useCallback(async () => {
    await adminToken.clear();
    setWorkspace(null);
  }, []);

  const can = useCallback(
    (key: string) => Boolean(workspace?.sections.some((s) => s.key === key)),
    [workspace],
  );

  const value = useMemo(
    () => ({ ready, workspace, signIn, signOut, refreshWorkspace, can }),
    [ready, workspace, signIn, signOut, refreshWorkspace, can],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
