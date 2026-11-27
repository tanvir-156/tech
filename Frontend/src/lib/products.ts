import { api, endpoints, withQuery } from './api';
import type { Page, Product } from '../types';
import type { IconName } from '../components/ui';

export type ProductQuery = {
  category?: string;
  brand?: string;
  search?: string;
  ordering?: string;
  min_price?: string | number;
  max_price?: string | number;
  in_stock?: boolean;
  on_sale?: boolean;
  is_featured?: boolean;
  is_active?: boolean;
  limit?: number;
  page?: number;
};

export async function listProducts(q: ProductQuery): Promise<Page<Product>> {
  const res = await api<Page<Product> | Product[]>(
    withQuery(endpoints.products, { is_active: true, limit: 20, ...q } as Record<string, string | number | boolean>),
    { auth: false },
  );
  if (Array.isArray(res)) return { count: res.length, next: null, previous: null, results: res };
  return res;
}

export function categoryIcon(name: string): IconName {
  const n = name.toLowerCase();
  if (/laptop|notebook/.test(n)) return 'laptop-outline';
  if (/mobile|phone|tablet/.test(n)) return 'phone-portrait-outline';
  if (/desktop|pc|computer/.test(n)) return 'desktop-outline';
  if (/component|processor|ram|motherboard/.test(n)) return 'hardware-chip-outline';
  if (/monitor|display|screen/.test(n)) return 'tv-outline';
  if (/accessor|headphone|audio|speaker/.test(n)) return 'headset-outline';
  if (/network|router|wifi/.test(n)) return 'wifi-outline';
  if (/storage|ssd|hdd|drive/.test(n)) return 'server-outline';
  if (/gaming|game/.test(n)) return 'game-controller-outline';
  if (/tv|home|appliance|ac\b|fridge|refriger/.test(n)) return 'home-outline';
  if (/watch/.test(n)) return 'watch-outline';
  if (/camera/.test(n)) return 'camera-outline';
  if (/print/.test(n)) return 'print-outline';
  return 'apps-outline';
}
