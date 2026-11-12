import { DependencyList, useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from './format';

export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList, initial: T | null = null) {
  const [data, setData] = useState<T | null>(initial);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const alive = useRef(true);
  const runId = useRef(0);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const run = useCallback(
    async (mode: 'initial' | 'refresh' | 'silent' = 'initial') => {
      const id = ++runId.current;
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      try {
        const result = await fn();
        if (alive.current && id === runId.current) {
          setData(result);
          setError('');
        }
      } catch (e) {
        if (alive.current && id === runId.current) setError(errorMessage(e));
      } finally {
        if (alive.current && id === runId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );

  useEffect(() => {
    void run('initial');
  }, [run]);

  return {
    data,
    loading,
    refreshing,
    error,
    setData,
    reload: () => run('silent'),
    refresh: () => run('refresh'),
    retry: () => run('initial'),
  };
}

export function useDebounced<T>(value: T, delay = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
