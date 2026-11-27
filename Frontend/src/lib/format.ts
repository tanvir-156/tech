import type { Page, Product, Variant } from '../types';

export const money = (value: unknown): string => {
  const n = Number(value ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  const rounded = Math.round(safe * 100) / 100;
  const [int, dec] = Math.abs(rounded).toFixed(2).split('.');
  // South-Asian digit grouping: 12,45,000
  let out = int;
  if (int.length > 3) {
    const last3 = int.slice(-3);
    const rest = int.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    out = `${rest},${last3}`;
  }
  const sign = rounded < 0 ? '-' : '';
  return `${sign}৳${out}${dec !== '00' ? `.${dec}` : ''}`;
};

export const num = (value: unknown): number => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export const compact = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `${(value / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(Math.round(value));
};

export const asList = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object' && Array.isArray((value as Page<T>).results)) {
    return (value as Page<T>).results;
  }
  return [];
};

export const variantOf = (p: Product): Variant | undefined =>
  p.default_variant ??
  p.variants?.find((v) => v.is_active !== false && v.is_default) ??
  p.variants?.find((v) => v.is_active !== false);

export const priceOf = (p: Product): number => num(variantOf(p)?.discounted_price ?? variantOf(p)?.price);

export const orderCode = (id: number | string) => `#TN-${String(id).padStart(5, '0')}`;

export const shortDate = (value?: string | null): string => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const dateTime = (value?: string | null): string => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${date}, ${time}`;
};

export const errorMessage = (error: unknown): string =>
  error instanceof Error && error.message
    ? error.message
    : 'Something went wrong. Please try again.';

export const initials = (first?: string, last?: string, fallback = 'TN') => {
  const a = (first || '').trim().charAt(0);
  const b = (last || '').trim().charAt(0);
  const out = `${a}${b}`.toUpperCase();
  return out || fallback.slice(0, 2).toUpperCase();
};

export const titleCase = (value: string) =>
  value
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const valueText = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.map(valueText).join(', ');
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${valueText(v)}`)
      .join(' · ');
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
};

export const pcLabels: Record<string, string> = {
  cpu: 'Processor',
  cpu_cooler: 'CPU Cooler',
  motherboard: 'Motherboard',
  ram: 'Memory (RAM)',
  storage: 'Storage',
  gpu: 'Graphics Card',
  psu: 'Power Supply',
  case: 'PC Case',
  monitor: 'Monitor',
  case_cooler: 'Case Fan',
  keyboard: 'Keyboard',
  mouse: 'Mouse',
  speaker: 'Speakers',
  headphone: 'Headphones',
  network: 'Network Adapter',
  ups: 'UPS',
};

export const pcRequired = ['cpu', 'motherboard', 'ram', 'storage', 'psu', 'case'];

export const divisions: { value: string; label: string }[] = [
  { value: 'dhaka', label: 'Dhaka' },
  { value: 'chattogram', label: 'Chattogram' },
  { value: 'rajshahi', label: 'Rajshahi' },
  { value: 'khulna', label: 'Khulna' },
  { value: 'barishal', label: 'Barishal' },
  { value: 'sylhet', label: 'Sylhet' },
  { value: 'rangpur', label: 'Rangpur' },
  { value: 'mymensingh', label: 'Mymensingh' },
];

/** Product specs are stored flat; a key equal to its value starts a section. */
export function specSections(spec?: Record<string, unknown>) {
  const sections: { title: string; rows: [string, string][] }[] = [];
  if (!spec) return sections;
  let current: { title: string; rows: [string, string][] } | null = null;
  for (const [k, v] of Object.entries(spec)) {
    if (typeof v === 'string' && v === k) {
      current = { title: k, rows: [] };
      sections.push(current);
      continue;
    }
    if (!current) {
      current = { title: 'General', rows: [] };
      sections.push(current);
    }
    current.rows.push([k, valueText(v)]);
  }
  return sections.filter((s) => s.rows.length > 0);
}
