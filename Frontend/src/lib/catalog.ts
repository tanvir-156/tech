import { useEffect, useState } from 'react';
import { api, endpoints } from './api';
import { asList } from './format';
import type { Brand, Category, ProductImage } from '../types';

let categoriesCache: Category[] | null = null;
let categoriesPromise: Promise<Category[]> | null = null;
let brandsCache: Brand[] | null = null;
let imagesCache: Map<number, string[]> | null = null;
let imagesPromise: Promise<Map<number, string[]>> | null = null;

export async function getCategories(force = false): Promise<Category[]> {
  if (force) categoriesCache = null;
  if (categoriesCache) return categoriesCache;
  if (!categoriesPromise) {
    categoriesPromise = api<unknown>(`${endpoints.categories}?is_active=true`)
      .then((r) => {
        categoriesCache = asList<Category>(r).filter((c) => c.is_active !== false);
        return categoriesCache;
      })
      .finally(() => {
        categoriesPromise = null;
      });
  }
  return categoriesPromise;
}

export async function getBrands(force = false): Promise<Brand[]> {
  if (force) brandsCache = null;
  if (brandsCache) return brandsCache;
  const r = await api<unknown>(endpoints.brands);
  brandsCache = asList<Brand>(r).filter((b) => b.is_active !== false);
  return brandsCache;
}

/** One request loads every product's images; cards look theirs up by id. */
export async function getImageIndex(force = false): Promise<Map<number, string[]>> {
  if (force) imagesCache = null;
  if (imagesCache) return imagesCache;
  if (!imagesPromise) {
    imagesPromise = api<unknown>(endpoints.images)
      .then((r) => {
        const list = asList<ProductImage>(r).slice().sort(
          (a, b) =>
            Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)) ||
            (a.display_order ?? 0) - (b.display_order ?? 0),
        );
        const map = new Map<number, string[]>();
        for (const img of list) {
          if (!img.image) continue;
          const arr = map.get(img.product) ?? [];
          arr.push(img.image);
          map.set(img.product, arr);
        }
        imagesCache = map;
        return map;
      })
      .finally(() => {
        imagesPromise = null;
      });
  }
  return imagesPromise;
}

export function clearCatalogCache() {
  categoriesCache = null;
  brandsCache = null;
  imagesCache = null;
}

export function flattenCategories(list: Category[]): Category[] {
  return list.flatMap((c) => [c, ...flattenCategories(c.sub_categories ?? [])]);
}

export function useCategories() {
  const [data, setData] = useState<Category[]>(categoriesCache ?? []);
  const [loading, setLoading] = useState(!categoriesCache);
  useEffect(() => {
    let live = true;
    getCategories()
      .then((c) => live && setData(c))
      .catch(() => undefined)
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, []);
  return { categories: data, loading };
}

export function useImageIndex() {
  const [index, setIndex] = useState<Map<number, string[]>>(imagesCache ?? new Map());
  useEffect(() => {
    let live = true;
    getImageIndex()
      .then((m) => live && setIndex(m))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return index;
}
