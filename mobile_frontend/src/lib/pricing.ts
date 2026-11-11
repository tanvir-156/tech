import type { CartItem, Product } from './types';
export const DEMO_PROMO = 'TECHNEST10';
export function calculateTotals(
  cart: CartItem[],
  products: Product[],
  promo = '',
  deliveryFee = 60,
) {
  const selected = cart.filter(
    (item) => item.selected && products.some((p) => p.id === item.productId),
  );
  const subtotal = selected.reduce(
    (sum, item) =>
      sum +
      (item.unitPrice ?? products.find((p) => p.id === item.productId)?.price ?? 0) * item.quantity,
    0,
  );
  const delivery = selected.length ? deliveryFee : 0;
  const discount =
    promo.trim().toUpperCase() === DEMO_PROMO ? Math.min(Math.round(subtotal * 0.1), 2000) : 0;
  return {
    subtotal,
    delivery,
    discount,
    total: Math.max(0, subtotal + delivery - discount),
    quantity: selected.reduce((n, i) => n + i.quantity, 0),
  };
}
export function validQuantity(value: number, stock: number) {
  if (!Number.isInteger(value) || value < 1)
    throw new Error('Quantity must be a whole number greater than zero.');
  if (value > stock)
    throw new Error(`Only ${stock} item${stock === 1 ? '' : 's'} available in stock.`);
  return value;
}
