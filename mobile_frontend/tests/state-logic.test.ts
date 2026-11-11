/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateTotals, validQuantity } from '../src/lib/pricing';
import {
  checkoutPayload,
  encodeAddress2,
  mapAddress,
  mapProduct,
  mapOrder,
  mapStatus,
} from '../src/lib/mapping';
import { addressText } from '../src/lib/utils';
import { formValues, relationId } from '../src/lib/adminForms';
import type { Product, Address } from '../src/lib/types';
const products = [
  { id: 1, price: 10000, stock: 4 },
  { id: 2, price: 50000, stock: 1 },
] as Product[];
const address: Address = {
  id: 1,
  label: 'Home',
  name: 'Test Person',
  phone: '01712345678',
  line: 'House 12',
  road: 'Road 5',
  city: 'Dhaka',
  division: 'dhaka',
  district: 'Dhaka',
  area: 'Mirpur',
  postal: '1216',
  isDefault: true,
};

test('checkout totals exclude unchecked products and apply capped discount before delivery', () => {
  const cart = [
    { productId: 1, quantity: 3, selected: true },
    { productId: 2, quantity: 1, selected: false },
  ];
  assert.deepEqual(calculateTotals(cart, products, 'technest10'), {
    subtotal: 30000,
    delivery: 60,
    discount: 2000,
    total: 28060,
    quantity: 3,
  });
  assert.deepEqual(calculateTotals([], products), {
    subtotal: 0,
    delivery: 0,
    discount: 0,
    total: 0,
    quantity: 0,
  });
});
test('live checkout has no delivery charge in the supplied Django backend', () => {
  assert.equal(
    calculateTotals([{ productId: 1, quantity: 1, selected: true }], products, '', 0).total,
    10000,
  );
});
test('server cart prices and order snapshots are independent of subsequent catalog prices', () => {
  assert.equal(
    calculateTotals([{ productId: 1, quantity: 2, selected: true, unitPrice: 8000 }], products)
      .subtotal,
    16000,
  );
});
test('quantity validation rejects decimals, negatives, zero and stock overflow', () => {
  for (const n of [-1, 0, 1.5, NaN, 5]) assert.throws(() => validQuantity(n, 4));
  assert.equal(validQuantity(4, 4), 4);
});
test('Django checkout gets required structured fields and normalized coupon', () => {
  const data = checkoutPayload(address, ' hello ');
  assert.equal(data.shipping_division, 'dhaka');
  assert.equal(data.shipping_house, 'House 12');
  assert.equal(data.shipping_upazila, 'Mirpur');
  assert.equal(data.discount_code, 'HELLO');
  assert.throws(() => checkoutPayload({ ...address, area: undefined }));
  assert.throws(() => checkoutPayload({ ...address, postal: '12' }));
});
test('product adapter retains discounted price, primary imagery and PC component aliases', () => {
  const product = mapProduct(
    {
      id: 4,
      name: 'Test processor',
      slug: 'test',
      category: 'Processor',
      default_variant: { id: 12, price: '15000.00', discounted_price: '12000.00', stock: 3 },
    },
    [
      { product: 4, image: '/media/secondary.jpg', is_primary: false },
      { product: 4, image: '/media/primary.jpg', is_primary: true },
    ],
    'https://api.example.com',
  );
  assert.equal(product.price, 12000);
  assert.equal(product.oldPrice, 15000);
  assert.equal(product.variantId, 12);
  assert.equal(product.component, 'CPU');
  assert.deepEqual(product.image, { uri: 'https://api.example.com/media/primary.jpg' });
});
test('order adapter maps the server lifecycle and preserves purchased amount', () => {
  const product = { ...products[0], variantId: 23, name: 'Test item' } as Product;
  const order = mapOrder(
    {
      id: 4,
      status: 'confirmed',
      subtotal: '123.00',
      total_amount: '120.00',
      discount_amount: '3.00',
      items: [{ id: 5, variant: 23, unit_price: '123.00', quantity: 1 }],
      created_at: '2026-11-10T10:00:00Z',
    },
    [product],
    null,
  );
  assert.equal(order.status, 'Confirmed');
  assert.equal(order.total, 120);
  assert.equal(order.items[0].unitPrice, 123);
  assert.equal(order.items[0].productId, product.id);
  assert.equal(mapStatus('pending'), 'Processing');
});
test('native admin form adapter preserves selected foreign keys and booleans', () => {
  const html =
    '<input type="text" name="name" value="A &amp; B"><input type="checkbox" name="is_active" checked><input type="checkbox" name="is_featured"><textarea name="specification">{&quot;CPU&quot;:&quot;M4&quot;}</textarea><select name="category"><option value="">---</option><option value="8" selected>Laptops</option><option value="9">Processor</option></select>';
  assert.deepEqual(formValues(html), {
    name: 'A & B',
    is_active: true,
    is_featured: false,
    specification: '{"CPU":"M4"}',
    category: '8',
  });
  assert.equal(relationId(html, 'category', 'Processor'), '9');
  assert.equal(
    relationId(
      '<select name="category"><option value="3">Desktop → Gaming pc</option></select>',
      'category',
      'Gaming pc',
    ),
    '3',
  );
  assert.throws(() => relationId(html, 'category', 'Missing'));
});

test('saved address area and road round-trip without duplication, including commas', () => {
  const original = { ...address, area: 'Mirpur', road: 'Road 5, Section 7' };
  const raw = {
    id: 1,
    first_name: 'Test',
    last_name: 'Person',
    address1: original.line,
    address2: encodeAddress2(original),
    city: 'Dhaka',
    postal_code: '1216',
    region: 'dhaka',
  };
  const restored = mapAddress(raw);
  assert.equal(restored.area, original.area);
  assert.equal(restored.road, original.road);
  assert.equal(encodeAddress2(restored), raw.address2);
  assert.equal(mapAddress({ ...raw, address2: 'Mirpur, Road 5' }).area, 'Mirpur');
  assert.equal(mapAddress({ ...raw, address2: 'Mirpur, Road 5' }).road, 'Road 5');
});
test('order address keeps structured house and displays server formatted snapshot once', () => {
  const order = mapOrder(
    {
      id: 1,
      shipping_house: 'House 12',
      shipping_road: 'Road 5',
      shipping_upazila: 'Mirpur',
      shipping_district: 'Dhaka',
      shipping_postal_code: '1216',
      shipping_address: 'House 12, Road 5, Mirpur, Dhaka, 1216, Bangladesh',
    },
    [],
    null,
  );
  assert.equal(order.address.line, 'House 12');
  assert.equal(addressText(order.address), 'House 12, Road 5, Mirpur, Dhaka, 1216, Bangladesh');
  assert.equal(
    addressText({ ...address, formatted: undefined }),
    'House 12, Road 5, Mirpur, Dhaka, 1216',
  );
});
