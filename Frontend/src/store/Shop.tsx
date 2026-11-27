import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, endpoints } from '../lib/api';
import { asList, errorMessage, num } from '../lib/format';
import { jsonGet, jsonSet } from '../lib/storage';
import type { Cart, Wishlist } from '../types';
import { useAuth } from './Auth';
import { useToast } from './Toast';

type ShopValue = {
  cart: Cart | null;
  cartLoading: boolean;
  cartCount: number;
  cartSubtotal: number;
  reloadCart: () => Promise<void>;
  addToCart: (variant: number, quantity?: number) => Promise<boolean>;
  changeQty: (itemId: number, quantity: number) => Promise<void>;
  removeFromCart: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;

  wishlist: Wishlist | null;
  reloadWishlist: () => Promise<void>;
  isWished: (variantId: number) => boolean;
  isProductWished: (productId: number) => boolean;
  toggleWish: (variantId: number) => Promise<void>;
  removeWish: (itemId: number) => Promise<void>;

  compareIds: number[];
  toggleCompare: (productId: number) => void;
  clearCompare: () => void;
};

const Ctx = createContext<ShopValue | null>(null);
export const useShop = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('ShopProvider missing');
  return v;
};

const COMPARE_KEY = 'technest_compare';

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const toast = useToast();
  const [cart, setCart] = useState<Cart | null>(null);
  const [cartLoading, setCartLoading] = useState(false);
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [compareIds, setCompareIds] = useState<number[]>([]);

  // ---------- Cart ----------
  const reloadCart = useCallback(async () => {
    if (!user) {
      setCart(null);
      return;
    }
    setCartLoading(true);
    try {
      setCart(await api<Cart>(endpoints.cart));
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setCartLoading(false);
    }
  }, [user, toast]);

  const reloadWishlist = useCallback(async () => {
    if (!user) {
      setWishlist(null);
      return;
    }
    try {
      const data = await api<Wishlist | unknown[]>(endpoints.wishlist);
      setWishlist(Array.isArray(data) ? { items: asList(data) } : (data as Wishlist));
    } catch {
      // Wishlist is a convenience: stay quiet if it fails to load.
    }
  }, [user]);

  useEffect(() => {
    if (!ready) return;
    void reloadCart();
    void reloadWishlist();
  }, [ready, reloadCart, reloadWishlist]);

  const addToCart = useCallback(
    async (variant: number, quantity = 1) => {
      if (!user) {
        toast('Please sign in to add items to your cart.', 'info');
        return false;
      }
      try {
        await api(endpoints.cartItems, { method: 'POST', body: { variant, quantity } });
        await reloadCart();
        toast('Added to your cart', 'success');
        return true;
      } catch (e) {
        toast(errorMessage(e), 'error');
        return false;
      }
    },
    [user, reloadCart, toast],
  );

  const changeQty = useCallback(
    async (itemId: number, quantity: number) => {
      try {
        await api(`${endpoints.cartItems}${itemId}/`, { method: 'PATCH', body: { quantity } });
        await reloadCart();
      } catch (e) {
        toast(errorMessage(e), 'error');
      }
    },
    [reloadCart, toast],
  );

  const removeFromCart = useCallback(
    async (itemId: number) => {
      try {
        await api(`${endpoints.cartItems}${itemId}/`, { method: 'DELETE' });
        await reloadCart();
      } catch (e) {
        toast(errorMessage(e), 'error');
      }
    },
    [reloadCart, toast],
  );

  const clearCart = useCallback(async () => {
    if (!cart) return;
    try {
      for (const item of cart.items) {
        await api(`${endpoints.cartItems}${item.id}/`, { method: 'DELETE' });
      }
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      await reloadCart();
    }
  }, [cart, reloadCart, toast]);

  // ---------- Wishlist ----------
  const isWished = useCallback(
    (variantId: number) => Boolean(wishlist?.items.some((i) => i.variant_id === variantId)),
    [wishlist],
  );
  const isProductWished = useCallback(
    (productId: number) => Boolean(wishlist?.items.some((i) => i.product_id === productId)),
    [wishlist],
  );

  const removeWish = useCallback(
    async (itemId: number) => {
      try {
        await api(`${endpoints.wishlistItems}${itemId}/`, { method: 'DELETE' });
        await reloadWishlist();
      } catch (e) {
        toast(errorMessage(e), 'error');
      }
    },
    [reloadWishlist, toast],
  );

  const toggleWish = useCallback(
    async (variantId: number) => {
      if (!user) {
        toast('Please sign in to save items to your wishlist.', 'info');
        return;
      }
      const existing = wishlist?.items.find((i) => i.variant_id === variantId);
      try {
        if (existing) {
          await api(`${endpoints.wishlistItems}${existing.id}/`, { method: 'DELETE' });
          toast('Removed from wishlist', 'info');
        } else {
          await api(endpoints.wishlistItems, { method: 'POST', body: { variant_id: variantId } });
          toast('Saved to wishlist', 'success');
        }
        await reloadWishlist();
      } catch (e) {
        toast(errorMessage(e), 'error');
      }
    },
    [user, wishlist, reloadWishlist, toast],
  );

  // ---------- Compare (local) ----------
  useEffect(() => {
    void jsonGet<number[]>(COMPARE_KEY, []).then((ids) =>
      setCompareIds(Array.isArray(ids) ? ids.filter((n) => typeof n === 'number').slice(0, 4) : []),
    );
  }, []);

  const toggleCompare = useCallback(
    (productId: number) => {
      setCompareIds((prev) => {
        let next: number[];
        if (prev.includes(productId)) next = prev.filter((i) => i !== productId);
        else if (prev.length >= 4) {
          toast('You can compare up to four products.', 'info');
          return prev;
        } else next = [...prev, productId];
        void jsonSet(COMPARE_KEY, next);
        return next;
      });
    },
    [toast],
  );

  const clearCompare = useCallback(() => {
    setCompareIds([]);
    void jsonSet(COMPARE_KEY, []);
  }, []);

  const cartCount = cart?.items.reduce((t, i) => t + i.quantity, 0) ?? 0;
  const cartSubtotal = cart?.items.reduce((t, i) => t + num(i.discounted_price) * i.quantity, 0) ?? 0;

  const value = useMemo<ShopValue>(
    () => ({
      cart,
      cartLoading,
      cartCount,
      cartSubtotal,
      reloadCart,
      addToCart,
      changeQty,
      removeFromCart,
      clearCart,
      wishlist,
      reloadWishlist,
      isWished,
      isProductWished,
      toggleWish,
      removeWish,
      compareIds,
      toggleCompare,
      clearCompare,
    }),
    [
      cart, cartLoading, cartCount, cartSubtotal, reloadCart, addToCart, changeQty, removeFromCart, clearCart,
      wishlist, reloadWishlist, isWished, isProductWished, toggleWish, removeWish,
      compareIds, toggleCompare, clearCompare,
    ],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
