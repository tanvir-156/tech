import type { Address, CartItem, Category, Order, OrderStatus, Product, User } from './types';
type Raw = Record<string, any>;
const numeric = (value: any) => (Number.isFinite(Number(value)) ? Number(value) : 0);
export const mapUser = (raw: Raw, staff = false): User => ({
  id: numeric(raw.id),
  name:
    raw.name ||
    [raw.first_name, raw.last_name].filter(Boolean).join(' ') ||
    raw.email?.split('@')[0] ||
    'Technest member',
  email: raw.email || '',
  phone: raw.phone || '',
  isStaff: staff || !!raw.is_staff,
});
export function encodeAddress2(address: Pick<Address, 'area' | 'road'>): string {
  const area = (address.area || '').trim(),
    road = (address.road || '').trim();
  return `Area: ${area}\nRoad: ${road}`;
}
export function decodeAddress2(value: string): { area: string; road: string } {
  const text = value.trim();
  const labelled = /^Area:[ \t]*([^\n]*)\nRoad:[ \t]*([\s\S]*)$/i.exec(text);
  if (labelled) return { area: labelled[1].trim(), road: labelled[2].trim() };
  // Earlier app versions wrote "area, road". Split once so a road may
  // contain further comma-separated details without being duplicated.
  const comma = text.indexOf(',');
  return comma >= 0
    ? { area: text.slice(0, comma).trim(), road: text.slice(comma + 1).trim() }
    : { area: text, road: '' };
}
export function mapAddress(raw: Raw, phone = ''): Address {
  const parts = decodeAddress2(String(raw.address2 || ''));
  return {
    id: numeric(raw.id),
    label: raw.company || 'Home',
    name: [raw.first_name, raw.last_name].filter(Boolean).join(' '),
    phone,
    line: raw.address1 || '',
    city: raw.city || '',
    postal: raw.postal_code || '',
    isDefault: true,
    division: (raw.region || '').toLowerCase(),
    district: raw.city || '',
    ...parts,
  };
}
export function mapProduct(raw: Raw, images: Raw[], base: string): Product {
  const variant =
    raw.default_variant ||
    raw.variants?.find((v: Raw) => v.is_default && v.is_active !== false) ||
    raw.variants?.[0] ||
    {};
  const pictures = images
    .filter((i) => Number(i.product) === Number(raw.id))
    .sort(
      (a, b) =>
        Number(b.is_primary) - Number(a.is_primary) ||
        Number(a.display_order || 0) - Number(b.display_order || 0) ||
        Number(b.id || 0) - Number(a.id || 0),
    );
  const imageUrl = (value: string) =>
    /^https?:\/\//.test(value) ? value : `${base}${value.startsWith('/') ? '' : '/'}${value}`;
  const mappedImages = pictures.map((i) => ({ uri: imageUrl(i.image) }));
  const flatten = (obj: any): Record<string, string> =>
    Object.fromEntries(
      Object.entries(obj || {}).map(([k, v]) => [
        k,
        typeof v === 'object' && v !== null
          ? Object.entries(v)
              .map(([a, b]) => `${a}: ${String(b)}`)
              .join(' · ')
          : String(v),
      ]),
    );
  const options: Record<string, string[]> = {};
  if (variant.ram) options.RAM = [variant.ram];
  if (variant.storage) options.Storage = [variant.storage];
  if (variant.color?.name) options.Color = [variant.color.name];
  const category = String(raw.category || 'Others');
  const categoryLower = category.toLowerCase();
  const component =
    categoryLower.includes('processor') || categoryLower === 'cpu'
      ? 'CPU'
      : categoryLower.includes('motherboard')
        ? 'Motherboard'
        : categoryLower.includes('ram') || categoryLower === 'memory'
          ? 'Memory'
          : categoryLower.includes('graphics')
            ? 'Graphics'
            : categoryLower.includes('storage') ||
                categoryLower.includes('ssd') ||
                categoryLower.includes('hard disk')
              ? 'Storage'
              : categoryLower.includes('power supply') || categoryLower === 'psu'
                ? 'Power supply'
                : categoryLower.includes('casing') || categoryLower === 'case'
                  ? 'Case'
                  : undefined;
  return {
    component,
    id: numeric(raw.id),
    name: raw.name || 'Product',
    slug: raw.slug || String(raw.id),
    category: String(raw.category || 'Others'),
    brand: String(raw.brand || 'Technest'),
    price: numeric(variant.discounted_price ?? variant.price),
    oldPrice: numeric(variant.price),
    image: mappedImages[0] || { uri: `${base}/media/products/default.jpg` },
    images: mappedImages,
    stock: numeric(variant.stock),
    rating: 0,
    reviews: 0,
    tag: raw.is_featured ? 'Featured' : undefined,
    description:
      raw.description ||
      'Explore the specifications below. Product details and availability are provided by the store.',
    specs: { ...flatten(raw.key_feature), ...flatten(raw.specification) },
    variantId: numeric(variant.id),
    options,
    active: raw.is_active !== false,
  };
}
export function mapCategory(raw: Raw, products: Product[]): Category {
  const name = String(raw.name || 'Others');
  const lower = name.toLowerCase();
  const icon = lower.includes('laptop')
    ? 'laptop-outline'
    : lower.includes('phone') || lower.includes('mobile')
      ? 'phone-portrait-outline'
      : lower.includes('monitor')
        ? 'desktop-outline'
        : lower.includes('access')
          ? 'headset-outline'
          : lower.includes('network')
            ? 'wifi-outline'
            : lower.includes('component')
              ? 'hardware-chip-outline'
              : 'grid-outline';
  return {
    id: numeric(raw.id),
    name,
    icon,
    count: products.filter((p) => p.category === name).length,
    color: '#FFF0E5',
    description: raw.description || `Explore ${name.toLowerCase()}`,
  };
}
export function mapCartItem(raw: Raw, products: Product[]): CartItem {
  const product = products.find(
    (p) => p.id === Number(raw.product_id) || p.variantId === Number(raw.variant),
  );
  const options: Record<string, string> = {};
  if (raw.ram) options.RAM = raw.ram;
  if (raw.storage) options.Storage = raw.storage;
  if (raw.color?.name) options.Color = raw.color.name;
  return {
    productId: product?.id || numeric(raw.product_id) || -numeric(raw.variant),
    variantId: numeric(raw.variant),
    serverId: numeric(raw.id),
    quantity: numeric(raw.quantity),
    selected: true,
    unitPrice: numeric(raw.discounted_price ?? raw.unit_price),
    productName: raw.product_name,
    options,
  };
}
export const mapStatus = (value: string): OrderStatus =>
  (({
    pending: 'Processing',
    confirmed: 'Confirmed',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    processing: 'Processing',
  })[value?.toLowerCase()] as OrderStatus) || 'Processing';
export const statusToApi = (value: OrderStatus) =>
  value === 'Processing' ? 'pending' : value.toLowerCase();
export function mapOrder(raw: Raw, products: Product[], user: User | null): Order {
  const items = (raw.items || []).map((i: Raw) => ({
    ...mapCartItem(i, products),
    unitPrice: numeric(i.unit_price),
    productId:
      products.find((p) => p.variantId === Number(i.variant) || p.name === i.product_name)?.id ||
      -numeric(i.variant || i.id),
  }));
  const address: Address = {
    id: 0,
    label: 'Delivery',
    name: raw.shipping_name || '',
    phone: raw.shipping_phone || '',
    line: raw.shipping_house || raw.shipping_address || '',
    formatted: raw.shipping_address || undefined,
    city: raw.shipping_district || '',
    postal: raw.shipping_postal_code || '',
    isDefault: true,
    division: raw.shipping_division,
    area: raw.shipping_upazila,
    road: raw.shipping_road,
  };
  return {
    id: numeric(raw.id),
    number: `TN-${String(raw.id).padStart(5, '0')}`,
    date: raw.created_at || '',
    status: mapStatus(raw.status),
    items,
    subtotal: numeric(raw.subtotal),
    delivery: 0,
    discount: numeric(raw.discount_amount),
    total: numeric(raw.total_amount),
    address,
    payment: raw.payment_method === 'sslcommerz' ? 'sslcommerz' : 'cod',
    customer: raw.shipping_name || (!user?.isStaff ? user?.name : '') || '',
    email:
      typeof raw.user === 'string' && raw.user.includes('@')
        ? raw.user
        : (!user?.isStaff ? user?.email : '') || '',
    phone: raw.shipping_phone || '',
  };
}
export function checkoutPayload(address: Address, promo = '') {
  if (!address.name.trim() || !address.line.trim() || !address.phone.trim())
    throw new Error('Complete your recipient name, phone number, and street address.');
  if (!address.division || !address.district || !address.area || !address.road)
    throw new Error(
      'Complete division, district, area/upazila, and road in your delivery address.',
    );
  if (!/^\d{4}$/.test(address.postal))
    throw new Error('Enter a four-digit Bangladesh postal code.');
  return {
    shipping_name: address.name.trim(),
    shipping_phone: address.phone.trim(),
    shipping_house: address.line.trim(),
    shipping_road: address.road.trim(),
    shipping_division: address.division.toLowerCase(),
    shipping_district: address.district.trim(),
    shipping_upazila: address.area.trim(),
    shipping_postal_code: address.postal,
    payment_method: 'cod',
    ...(promo.trim() ? { discount_type: 'promo', discount_code: promo.trim().toUpperCase() } : {}),
  };
}
