import type { Address } from './types';
export const money = (value: number) =>
  `৳ ${Number(value || 0).toLocaleString('en-BD', { maximumFractionDigits: 0 })}`;
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.';
export const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Dhaka',
  });
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function addressText(address: Address): string {
  if (address.formatted?.trim()) return address.formatted.trim();
  const pieces = [
    address.line,
    address.road,
    address.area,
    address.district || address.city,
    address.postal,
  ].filter((value): value is string => !!value?.trim());
  const seen = new Set<string>();
  return pieces
    .filter((value) => {
      const key = value.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((value) => value.trim())
    .join(', ');
}
