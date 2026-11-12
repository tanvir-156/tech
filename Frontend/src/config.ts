import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'technest_api_base';

function guess(): string {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env && env.trim()) return env.trim().replace(/\/+$/, '');

  // When running through Expo on a phone, the dev machine's LAN IP is
  // the host Expo serves from. Django normally runs on the same machine.
  const hostUri = (Constants.expoConfig as { hostUri?: string } | null)?.hostUri;
  const host = hostUri ? hostUri.split(':')[0] : '';
  if (host && /^\d{1,3}(\.\d{1,3}){3}$/.test(host) && !host.startsWith('127.')) {
    return `http://${host}:8000`;
  }
  return Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://127.0.0.1:8000';
}

let current = guess();
const listeners = new Set<() => void>();

export const getBaseUrl = () => current;

export const defaultBaseUrl = () => guess();

export function normalizeBaseUrl(value: string): string {
  let v = value.trim();
  if (!v) return guess();
  if (!/^https?:\/\//i.test(v)) v = `http://${v}`;
  return v.replace(/\/+$/, '');
}

export async function loadBaseUrl(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(KEY);
    if (saved) current = normalizeBaseUrl(saved);
  } catch {
    /* keep default */
  }
}

export async function setBaseUrl(value: string): Promise<string> {
  current = normalizeBaseUrl(value);
  try {
    await AsyncStorage.setItem(KEY, current);
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn());
  return current;
}

export async function resetBaseUrl(): Promise<string> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  current = guess();
  listeners.forEach((fn) => fn());
  return current;
}

export const onBaseUrlChange = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

/** Turns a media path/URL from Django into a URL this device can reach. */
export function mediaUrl(value?: string | null): string {
  if (!value) return '';
  // Local picker previews and inline data are already usable as-is.
  if (/^(file|content|data|ph|assets-library):/i.test(value)) return value;
  const base = current;
  const abs = /^https?:\/\/([^/:?#]+)(?::\d+)?([^]*)$/i.exec(value);
  if (abs) {
    const host = abs[1].toLowerCase();
    if (['localhost', '127.0.0.1', '10.0.2.2', '0.0.0.0'].includes(host)) return base + (abs[2] || '');
    return value;
  }
  if (value.startsWith('/')) return base + value;
  return `${base}/media/${value}`;
}
