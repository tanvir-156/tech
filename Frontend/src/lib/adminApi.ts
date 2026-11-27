import { getBaseUrl } from '../config';
import { ApiError, toApiError } from './api';
import { secureDelete, secureGet, secureSet } from './storage';
import { titleCase } from './format';

const KEY = 'technest_admin_token';
let token: string | null = null;
let loaded = false;

const listeners = new Set<() => void>();
export const onAdminExpired = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const adminToken = {
  async load() {
    token = await secureGet(KEY);
    loaded = true;
    return token;
  },
  async save(value: string) {
    token = value;
    loaded = true;
    await secureSet(KEY, value);
  },
  async clear() {
    token = null;
    await secureDelete(KEY);
  },
  get: () => token,
};

export type Row = Record<string, unknown> & { id: number };

export type ListResponse = {
  columns: string[];
  filters: Record<string, [string, string][]>;
  rows: Row[];
  page: number;
  pages: number;
  count: number;
  page_size?: number;
  create: boolean;
  summary?: Record<string, number>;
  ordering?: string;
  sortable?: string[];
};

export type DetailResponse = {
  data: Row;
  form: string;
  version: string;
  items: Row[];
  actions: string[];
  delete: boolean;
  deletion: { changes: string[]; blockers: string[]; token: string } | null;
  access?: {
    groups: { id: number; name: string }[];
    direct_permissions: number[];
    effective_permissions: string[];
    last_login: string | null;
    date_joined: string;
  };
  members?: { id: number; email: string; is_active: boolean; is_staff: boolean }[];
};

export type Stats = {
  sellers: { product_name: string; units: number }[];
  revenue: number;
  orders: number;
  average: number;
  pending: number;
  states: Record<string, number>;
  series: { date: string; value: number }[];
  recent: Row[];
  alerts?: { key: string; title: string; count: number; filter?: string }[];
  summary?: Record<string, number>;
};

export type Workspace = {
  email: string;
  name: string;
  is_superuser: boolean;
  role: string;
  can_overview: boolean;
  sections: { key: string; title: string; group: string }[];
  alerts?: { key: string; title: string; count: number; filter?: string }[];
  summary?: Record<string, number>;
};

const fieldLabel = (k: string) => (k === 'detail' || k === '__all__' ? '' : `${titleCase(k)} — `);

export async function adminApi<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; headers?: Record<string, string>; login?: boolean } = {},
): Promise<T> {
  if (!loaded) await adminToken.load();
  const headers: Record<string, string> = { Accept: 'application/json', ...(opts.headers ?? {}) };
  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    if (typeof FormData !== 'undefined' && opts.body instanceof FormData) {
      body = opts.body as unknown as BodyInit;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.body);
    }
  }
  if (token && !opts.login) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  let res: Response;
  try {
    res = await fetch(`${getBaseUrl()}/api/v1/admin-panel/${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(
      `Can't reach the server at ${getBaseUrl()}. Check the server address in Server settings.`,
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401 && token && !opts.login) {
    await adminToken.clear();
    listeners.forEach((fn) => fn());
    throw new ApiError('Your staff session expired. Please sign in again.', 401);
  }
  if (res.status === 204) return undefined as T;

  let data: unknown;
  const type = res.headers.get('content-type') ?? '';
  if (type.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = { detail: 'The server sent an invalid response.' };
    }
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const entries = Object.entries(data as Record<string, unknown>);
      const msg = entries
        .map(([k, v]) => `${fieldLabel(k)}${Array.isArray(v) ? v.join(' ') : typeof v === 'string' ? v : JSON.stringify(v)}`)
        .join(' · ');
      const err = toApiError(data, res.status);
      throw new ApiError(msg || err.message, res.status, err.fields);
    }
    throw toApiError(data, res.status);
  }
  return data as T;
}

export function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}
