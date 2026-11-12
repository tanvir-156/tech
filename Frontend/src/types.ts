export type AnyRecord = Record<string, unknown>;

export interface Color {
  id: number;
  name: string;
  hex_code: string;
}

export interface Variant {
  id: number;
  product: number;
  sku: string;
  price: string | number;
  ram?: string | null;
  storage?: string | null;
  color?: Color | null;
  discount_percentage?: string | number;
  discounted_price: string | number;
  saved_price?: string | number;
  stock: number;
  is_default?: boolean;
  is_active?: boolean;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  category?: string;
  brand?: string | null;
  description?: string;
  key_feature?: Record<string, unknown>;
  specification?: Record<string, unknown>;
  is_active?: boolean;
  is_featured?: boolean;
  default_variant?: Variant | null;
  variants?: Variant[];
  availability?: string;
  created_at?: string;
}

export interface ProductImage {
  id: number;
  product: number;
  image: string;
  alt_text?: string;
  is_primary?: boolean;
  display_order?: number;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  description?: string;
  is_active?: boolean;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  image?: string | null;
  description?: string;
  filters?: Record<string, string[]>;
  brands?: Brand[];
  sub_categories?: Category[];
  is_featured?: boolean;
  is_active?: boolean;
}

export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  date_joined?: string;
}

export interface Address {
  id?: number;
  first_name: string;
  last_name: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  postal_code: string;
  country: string;
  region: string;
}

export interface CartItem {
  id: number;
  variant: number;
  product_id?: number;
  product_name: string;
  product_image?: string | null;
  sku?: string;
  ram?: string | null;
  storage?: string | null;
  color?: Color | null;
  variant_price: string;
  discount_percentage?: string;
  discounted_price: string;
  stock?: number;
  quantity: number;
  subtotal?: string;
}

export interface Cart {
  id: number;
  items: CartItem[];
}

export interface OrderItem {
  id: number;
  variant: number;
  product_name: string;
  product_image: string | null;
  sku: string;
  ram?: string | null;
  storage?: string | null;
  color_name?: string | null;
  unit_price: string;
  quantity: number;
  line_total: string;
}

export interface Order {
  id: number;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_instructions?: string;
  items: OrderItem[];
  subtotal: string;
  discount_amount?: string;
  discount_code?: string;
  total_amount: string;
  status: string;
  payment_status: string;
  payment_method: 'sslcommerz' | 'cod';
  payment_method_display?: string;
  created_at: string;
}

export interface WishlistItem {
  id: number;
  variant_id: number;
  product_id: number;
  product_name: string;
  product_slug: string;
  category: string;
  image?: string | null;
  price: string;
  discounted_price: string;
  stock: number;
  is_available: boolean;
}

export interface Wishlist {
  count?: number;
  is_public?: boolean;
  items: WishlistItem[];
}

export interface PcVariant {
  id: number;
  product_id: number;
  product_name: string;
  brand?: string | null;
  category?: string;
  sku: string;
  ram?: string | null;
  storage?: string | null;
  price: string;
  discounted_price: string;
  stock: number;
  image?: string | null;
}

export interface PcBuildItem {
  id: number;
  component_type: string;
  variant: PcVariant;
  quantity: number;
  subtotal: string;
}

export interface PcBuild {
  id: number;
  name: string;
  items: PcBuildItem[];
  total_price: string;
}

export interface Compatibility {
  status: string;
  issues: string[];
  warnings: string[];
  missing_required: string[];
  note?: string;
}

export interface CompareResult {
  count: number;
  products: (Product & { image?: string; variant?: Variant; rating?: number; review_count?: number })[];
  specification_sections: {
    name: string;
    rows: { label: string; values: unknown[]; different: boolean }[];
  }[];
}

export interface ProductQuestion {
  id: number;
  product: number;
  question: string;
  answer: string;
  is_approved: boolean;
  created_at: string;
  user_name?: string;
}

export interface ProductReview {
  id: number;
  product: number;
  rating: number;
  review: string;
  created_at: string;
  user_name?: string;
  is_approved: boolean;
}

export interface Notice {
  id: number;
  title: string;
  message: string;
  notice_type: string;
  is_active: boolean;
  is_featured?: boolean;
  start_at?: string | null;
  end_at?: string | null;
  created_at: string;
}
