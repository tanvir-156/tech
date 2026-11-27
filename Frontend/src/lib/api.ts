import { getBaseUrl } from '../config';
import { secureDelete, secureGet, secureSet } from './storage';
import type { AnyRecord } from '../types';

const ACCESS = 'technest_access';
const REFRESH = 'technest_refresh';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let loaded = false;

const expiredListeners = new Set<() => void>();
export const onAuthExpired = (fn: () => void) => {
  expiredListeners.add(fn);
  return () => {
    expiredListeners.delete(fn);
  };
};

export const tokens = {
  async load() {
    accessToken = await secureGet(ACCESS);
    refreshToken = await secureGet(REFRESH);
    loaded = true;
  },
  hasAny: () => Boolean(accessToken || refreshToken),
  async save(access: string, refresh: string) {
    accessToken = access;
    refreshToken = refresh;
    loaded = true;
    await secureSet(ACCESS, access);
    await secureSet(REFRESH, refresh);
  },
  async clear() {
    accessToken = null;
    refreshToken = null;
    await secureDelete(ACCESS);
    await secureDelete(REFRESH);
  },
};

export class ApiError extends Error {
  status: number;
  fields: AnyRecord;
  constructor(message: string, status: number, fields: AnyRecord = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

const clip = (s: string) => (s.length > 400 ? `${s.slice(0, 400)}…` : s);

function flattenMessage(value: unknown): string {
  if (Array.isArray(value)) return value.map(flattenMessage).join(' ');
  if (value && typeof value === 'object') {
    return Object.entries(value as AnyRecord)
      .map(([k, v]) => `${k === 'detail' || k === 'non_field_errors' ? '' : `${k.replace(/_/g, ' ')}: `}${flattenMessage(v)}`)
      .join(' ');
  }
  return String(value ?? '');
}

export function toApiError(data: unknown, status: number): ApiError {
  if (typeof data === 'string') {
    if (/<html|<!doctype/i.test(data)) {
      return new ApiError(`Server error (${status}). Please check the Django server log.`, status);
    }
    return new ApiError(clip(data.trim()) || `Request failed (${status})`, status);
  }
  if (!data || typeof data !== 'object') {
    return new ApiError(`Request failed (${status})`, status);
  }
  const fields = data as AnyRecord;
  const first = fields.detail ?? fields.message ?? fields.non_field_errors ?? Object.values(fields)[0];
  let message = flattenMessage(first ?? fields).trim();
  // Prefix field name for single-field validation errors that lack context.
  if (!fields.detail && !fields.message && !fields.non_field_errors) {
    const key = Object.keys(fields)[0];
    if (key) message = `${key.replace(/_/g, ' ')}: ${message}`;
  }
  return new ApiError(clip(message) || `Request failed (${status})`, status, fields);
}

let refreshing: Promise<string | null> | null = null;

async function refreshAccess(): Promise<string | null> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    if (!refreshToken) return null;
    try {
      const res = await fetch(`${getBaseUrl()}/api/v1/accounts/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });
      if (!res.ok) throw new Error('expired');
      const json = (await res.json()) as { access?: string; refresh?: string };
      if (!json.access) throw new Error('invalid');
      await tokens.save(json.access, json.refresh ?? (refreshToken as string));
      return json.access;
    } catch {
      await tokens.clear();
      expiredListeners.forEach((fn) => fn());
      return null;
    }
  })();
  try {
    return await refreshing;
  } finally {
    refreshing = null;
  }
}

export type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

async function doFetch(url: string, opts: RequestOptions, access: string | null): Promise<Response> {
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
  if (opts.auth !== false && access) headers.Authorization = `Bearer ${access}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  if (opts.signal) opts.signal.addEventListener('abort', () => controller.abort());
  try {
    return await fetch(url, { method: opts.method ?? 'GET', headers, body, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function api<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  if (!loaded) await tokens.load();
  const url = /^https?:\/\//i.test(path) ? path : `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;

  let res: Response;
  try {
    res = await doFetch(url, opts, accessToken);
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError' && opts.signal?.aborted) throw e;
    throw new ApiError(
      `Can't reach the server at ${getBaseUrl()}. Check your connection and the server address (Account → Server settings).`,
      0,
    );
  }

  if (res.status === 401 && opts.auth !== false && refreshToken) {
    const fresh = await refreshAccess();
    if (fresh) {
      try {
        res = await doFetch(url, opts, fresh);
      } catch {
        throw new ApiError('Unable to reach the server.', 0);
      }
    }
  }

  if (res.status === 204) return undefined as T;

  const type = res.headers.get('content-type') ?? '';
  let data: unknown;
  if (type.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      throw new ApiError('The server sent an invalid response.', res.status);
    }
  } else {
    const text = await res.text();
    if (!res.ok) {
      throw new ApiError(
        res.status >= 500
          ? `Server error (${res.status}). Check the Django server log.`
          : `Request failed (${res.status}).`,
        res.status,
      );
    }
    data = text;
  }
  if (!res.ok) throw toApiError(data, res.status);
  return data as T;
}

export const endpoints = {
  products: '/api/v1/products/products/',
  images: '/api/v1/products/product-images/',
  categories: '/api/v1/products/categories/',
  brands: '/api/v1/products/brands/',
  questions: '/api/v1/products/questions/',
  reviews: '/api/v1/products/reviews/',
  compare: '/api/v1/products/products/compare/',
  notices: '/api/v1/core/notices/',
  cart: '/api/v1/cart/',
  cartItems: '/api/v1/cart/items/',
  orders: '/api/v1/orders/',
  checkout: '/api/v1/orders/checkout/',
  wishlist: '/api/v1/wishlist/',
  wishlistItems: '/api/v1/wishlist/items/',
  paymentInitiate: '/api/v1/payments/initiate/',
  pcBuilds: '/api/v1/pc-builder/builds/',
  pcComponents: '/api/v1/pc-builder/components/',
  me: '/api/v1/accounts/me/',
  address: '/api/v1/accounts/address/',
  validateDiscount: '/api/v1/discounts/discounts/validate/',
};

export function withQuery(
  path: string,
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `${path}?${parts.join('&')}` : path;
}
