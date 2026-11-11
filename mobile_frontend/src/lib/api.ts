import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Always use the Django backend.
export const DATA_MODE = 'live' as 'demo' | 'live';
export const API_BASE_URL = 'http://192.168.0.188:8000';

const TOKEN_KEY = 'technest.session.v1';

type Session = {
  access: string;
  refresh?: string;
  admin?: boolean;
};

let session: Session | null = null;
let refreshing: Promise<string | null> | null = null;

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
    public fields: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const sessionStore = {
  async load() {
    try {
      const raw =
        Platform.OS === 'web'
          ? globalThis.sessionStorage?.getItem(TOKEN_KEY)
          : await SecureStore.getItemAsync(TOKEN_KEY);

      const parsed = raw ? JSON.parse(raw) : null;

      session =
        parsed && typeof parsed.access === 'string'
          ? parsed
          : null;
    } catch {
      session = null;
    }

    return session;
  },

  get: () => session,

  async save(value: Session) {
    if (Platform.OS === 'web') {
      globalThis.sessionStorage?.setItem(
        TOKEN_KEY,
        JSON.stringify(value),
      );
    } else {
      await SecureStore.setItemAsync(
        TOKEN_KEY,
        JSON.stringify(value),
      );
    }

    session = value;
  },

  async clear() {
    session = null;

    if (Platform.OS === 'web') {
      globalThis.sessionStorage?.removeItem(TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  },
};

function messageOf(body: unknown, status: number): string {
  if (typeof body === 'string') {
    return /<html|<!doctype/i.test(body)
      ? `The server returned an error (${status}).`
      : body.slice(0, 400);
  }

  if (!body || typeof body !== 'object') {
    return `Request failed (${status}).`;
  }

  return Object.entries(body)
    .map(([key, value]) => {
      const label =
        key === 'detail' ||
        key === 'message' ||
        key === 'non_field_errors'
          ? ''
          : `${key.replace(/_/g, ' ')}: `;

      const message = Array.isArray(value)
        ? value.join(' ')
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value);

      return `${label}${message}`;
    })
    .join(' · ')
    .slice(0, 500);
}

export async function api<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    auth?: boolean;
    headers?: Record<string, string>;
    signal?: AbortSignal;
    retry?: boolean;
  } = {},
): Promise<T> {
  const url = path.startsWith('http')
    ? path
    : `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;

  if (new URL(url).origin !== new URL(API_BASE_URL).origin) {
    throw new ApiError(
      'The server returned a link outside the configured API origin.',
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  const onAbort = () => controller.abort();

  options.signal?.addEventListener('abort', onAbort);

  if (options.signal?.aborted) {
    controller.abort();
  }

  let response: Response;

  try {
    response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...(options.auth !== false && session
          ? { Authorization: `Bearer ${session.access}` }
          : {}),
        ...options.headers,
      },
      body:
        options.body === undefined
          ? undefined
          : options.body instanceof FormData
            ? options.body
            : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch (error) {
    throw new ApiError(
      error instanceof Error && error.name === 'AbortError'
        ? 'The request was cancelled or timed out. Please try again.'
        : `Cannot reach Django at ${API_BASE_URL}. Check that your backend is running and your phone can reach your PC.`,
    );
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', onAbort);
  }

  if (
    response.status === 401 &&
    options.auth !== false &&
    options.retry !== false &&
    session?.refresh &&
    !session.admin
  ) {
    if (!refreshing) {
      const previousSession = session;

      refreshing = (async () => {
        try {
          const data = await api<{
            access: string;
            refresh?: string;
          }>('/api/v1/accounts/token/refresh/', {
            method: 'POST',
            body: { refresh: previousSession.refresh },
            auth: false,
            retry: false,
          });

          await sessionStore.save({
            ...previousSession,
            access: data.access,
            refresh: data.refresh || previousSession.refresh,
          });

          return data.access;
        } catch {
          await sessionStore.clear();
          return null;
        } finally {
          refreshing = null;
        }
      })();
    }

    if (await refreshing) {
      return api<T>(path, { ...options, retry: false });
    }
  }

  if (response.status === 401 && options.auth !== false) {
    await sessionStore.clear();
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status === 401
        ? 'Your session expired. Please sign in again.'
        : messageOf(body, response.status),
      response.status,
      body && typeof body === 'object' ? body : {},
    );
  }

  return body as T;
}

export const asList = <T>(body: unknown): T[] =>
  Array.isArray(body)
    ? body
    : body &&
        typeof body === 'object' &&
        Array.isArray((body as { results?: unknown }).results)
      ? (body as { results: T[] }).results
      : [];

export async function fetchAll<T>(
  path: string,
  auth = true,
): Promise<T[]> {
  const rows: T[] = [];
  let next: string | null = path;
  const visited = new Set<string>();

  while (next) {
    if (visited.has(next) || visited.size >= 1000) {
      throw new ApiError(
        'The server returned an invalid or excessively long pagination sequence.',
      );
    }

    visited.add(next);

    const body: {
      results?: T[];
      next?: string | null;
    } | T[] = await api(next, { auth });

    rows.push(...asList<T>(body));

    next = Array.isArray(body) ? null : body.next || null;
  }

  return rows;
}

export const endpoints = {
  products: '/api/v1/products/products/',
  categories: '/api/v1/products/categories/',
  images: '/api/v1/products/product-images/',
  variants: '/api/v1/products/variants/',
  cart: '/api/v1/cart/',
  cartItems: '/api/v1/cart/items/',
  orders: '/api/v1/orders/',
  checkout: '/api/v1/orders/checkout/',
  wishlist: '/api/v1/wishlist/',
  addresses: '/api/v1/accounts/address/',
  me: '/api/v1/accounts/me/',
  admin: '/api/v1/admin-panel/',
};