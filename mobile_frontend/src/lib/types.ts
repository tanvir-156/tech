import type { ImageSourcePropType } from 'react-native';
export type RouteName =
  | 'home'
  | 'categories'
  | 'catalog'
  | 'product'
  | 'cart'
  | 'checkout'
  | 'orders'
  | 'orderDetail'
  | 'account'
  | 'wishlist'
  | 'compare'
  | 'builder'
  | 'addresses'
  | 'profile'
  | 'notifications'
  | 'support'
  | 'about'
  | 'login'
  | 'register'
  | 'adminDashboard'
  | 'adminOrders'
  | 'adminOrderDetail'
  | 'adminProducts'
  | 'adminProductEdit'
  | 'adminCategories'
  | 'adminInventory'
  | 'adminReports'
  | 'adminMore'
  | 'adminCustomers'
  | 'adminDiscounts'
  | 'adminPayments';
export type Route = { name: RouteName; params?: Record<string, any> };
export type Product = {
  id: number;
  name: string;
  slug: string;
  category: string;
  brand: string;
  price: number;
  oldPrice: number;
  image: ImageSourcePropType;
  images?: ImageSourcePropType[];
  stock: number;
  rating: number;
  reviews: number;
  tag?: string;
  description: string;
  specs: Record<string, string>;
  variantId: number;
  options?: Record<string, string[]>;
  component?: string;
  active?: boolean;
};
export type Category = {
  id: number;
  name: string;
  icon: string;
  count: number;
  color: string;
  description: string;
};
export type CartItem = {
  productId: number;
  quantity: number;
  selected: boolean;
  options?: Record<string, string>;
  serverId?: number;
  variantId?: number;
  unitPrice?: number;
  productName?: string;
};
export type Address = {
  id: number;
  label: string;
  name: string;
  phone: string;
  line: string;
  city: string;
  postal: string;
  isDefault: boolean;
  division?: string;
  district?: string;
  area?: string;
  road?: string;
  formatted?: string;
};
export type User = { id: number; name: string; email: string; phone: string; isStaff?: boolean };
export type OrderStatus = 'Processing' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled';
export type Order = {
  id: number;
  number: string;
  date: string;
  status: OrderStatus;
  items: CartItem[];
  subtotal: number;
  delivery: number;
  discount: number;
  total: number;
  address: Address;
  payment: 'cod' | 'sslcommerz';
  customer: string;
  email: string;
  phone: string;
};
export type Notice = { id: number; title: string; body: string; read: boolean; icon: string };
export type ProductDraft = Omit<
  Product,
  'id' | 'slug' | 'variantId' | 'rating' | 'reviews' | 'oldPrice'
> & { id?: number };
