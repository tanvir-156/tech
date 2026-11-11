import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Address,
  CartItem,
  Category,
  Notice,
  Order,
  OrderStatus,
  Product,
  ProductDraft,
  Route,
  RouteName,
  User,
} from '../lib/types';
import {
  demoProducts,
  demoCategories,
  demoOrders,
  demoAddresses,
  demoUser,
  demoNotifications,
} from '../lib/data';
import {
  api,
  asList,
  DATA_MODE,
  API_BASE_URL,
  endpoints,
  fetchAll,
  sessionStore,
} from '../lib/api';
import {
  encodeAddress2,
  mapAddress,
  mapCartItem,
  mapCategory,
  mapOrder,
  mapProduct,
  mapUser,
  statusToApi,
  checkoutPayload,
} from '../lib/mapping';
import { formValues, relationId } from '../lib/adminForms';
import { calculateTotals, DEMO_PROMO, validQuantity } from '../lib/pricing';
import { errorMessage, slugify } from '../lib/utils';

type State = {
  products: Product[];
  categories: Category[];
  cart: CartItem[];
  wishlist: number[];
  compare: number[];
  orders: Order[];
  addresses: Address[];
  user: User | null;
  notifications: Notice[];
  builder: Record<string, number>;
};
type Workspace = 'store' | 'admin';
type Context = State & {
  adminStats: any | null;
  adminCustomers: any[];
  adminPayments: any[];
  route: Route;
  navigate: (name: RouteName, params?: Record<string, any>) => void;
  back: () => void;
  tab: (name: RouteName) => void;
  mode: 'demo' | 'live';
  workspace: Workspace;
  setWorkspace: (workspace: Workspace) => void;
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  toast: string | null;
  notify: (message: string) => void;
  dismissToast: () => void;
  clearError: () => void;
  refresh: () => Promise<void>;
  addToCart: (id: number, quantity?: number, options?: Record<string, string>) => Promise<void>;
  updateCart: (id: number, quantity: number) => Promise<void>;
  toggleCart: (id: number) => void;
  removeCart: (id: number) => Promise<void>;
  clearCart: () => Promise<void>;
  toggleWishlist: (id: number) => Promise<void>;
  toggleCompare: (id: number) => void;
  placeOrder: (addressId: number, payment: 'cod' | 'sslcommerz', promo: string) => Promise<Order>;
  cancelOrder: (id: number) => Promise<void>;
  updateOrderStatus: (id: number, status: OrderStatus) => Promise<void>;
  saveAddress: (address: Address) => Promise<void>;
  deleteAddress: (id: number) => Promise<void>;
  updateProfile: (data: { name: string; phone: string }) => Promise<void>;
  login: (email: string, password: string, admin?: boolean) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  verifyEmail: (email: string, otp: string) => Promise<void>;
  resendOTP: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (old: string, next: string) => Promise<void>;
  saveProduct: (draft: ProductDraft) => Promise<void>;
  updateStock: (id: number, stock: number) => Promise<void>;
  markNotificationsRead: () => void;
  setBuildComponent: (slot: string, id: number) => void;
  clearBuild: () => void;
};
const AppContext = createContext<Context | null>(null);
const STORAGE_KEY = `technest.${DATA_MODE}.v1`;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const initialState = (): State =>
  DATA_MODE === 'demo'
    ? {
        products: clone(demoProducts),
        categories: clone(demoCategories),
        cart: [
          { productId: 1, quantity: 1, selected: true },
          { productId: 5, quantity: 1, selected: true },
        ],
        wishlist: [2, 3, 4, 6],
        compare: [],
        orders: clone(demoOrders),
        addresses: clone(demoAddresses),
        user: clone(demoUser),
        notifications: clone(demoNotifications),
        builder: {},
      }
    : {
        products: [],
        categories: [],
        cart: [],
        wishlist: [],
        compare: [],
        orders: [],
        addresses: [],
        user: null,
        notifications: [],
        builder: {},
      };
const emailValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const requirePassword = (password: string) => {
  if (password.length < 8) throw new Error('Use a password with at least 8 characters.');
};
const splitName = (name: string) => {
  const [first_name, ...rest] = name.trim().split(/\s+/);
  return { first_name, last_name: rest.join(' ') };
};
async function adminRows(key: string): Promise<any[]> {
  const rows: any[] = [];
  let page = 1,
    pages = 1;
  do {
    const body: any = await api(`${endpoints.admin}resources/${key}/?page_size=100&page=${page}`);
    rows.push(...(body.rows || []));
    pages = Number(body.pages) || 1;
    page++;
  } while (page <= pages && page <= 1000);
  if (page <= pages) throw new Error('The administration result is too large to load completely.');
  return rows;
}
async function adminRecord(key: string, id: number) {
  return api<any>(`${endpoints.admin}resources/${key}/${id}/`);
}
async function saveAdminRecord(
  key: string,
  id: number | undefined,
  values: Record<string, any>,
  detail?: any,
) {
  const current =
    detail || (await api<any>(`${endpoints.admin}resources/${key}/${id ? `${id}/` : 'new/'}`));
  return api<{ id: number }>(`${endpoints.admin}resources/${key}/${id ? `${id}/` : 'new/'}`, {
    method: 'POST',
    body: { ...formValues(current.form || ''), ...values },
    headers: id ? { 'X-Record-Version': current.version } : {},
  });
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  const stateRef = useRef(state);
  const [adminStats, setAdminStats] = useState<any | null>(null),
    [adminCustomers, setAdminCustomers] = useState<any[]>([]),
    [adminPayments, setAdminPayments] = useState<any[]>([]);
  const [history, setHistory] = useState<Route[]>([{ name: 'home' }]);
  const [workspace, setWorkspaceValue] = useState<Workspace>('store');
  const [hydrated, setHydrated] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState<string | null>(null),
    [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    queue = useRef<Promise<any>>(Promise.resolve());
  const patch = (value: Partial<State> | ((prev: State) => Partial<State>)) => {
    const partial = typeof value === 'function' ? value(stateRef.current) : value;
    stateRef.current = { ...stateRef.current, ...partial };
    setState(stateRef.current);
  };
  const notify = (message: string) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(message);
    timer.current = setTimeout(() => setToast(null), 3500);
  };
  const serialized = <T,>(job: () => Promise<T>): Promise<T> => {
    const next = queue.current.then(job, job);
    queue.current = next.catch(() => undefined);
    return next;
  };
  const requireAuth = () => {
    if (!stateRef.current.user || !sessionStore.get())
      throw new Error('Please sign in to continue.');
  };
  const requireAdmin = () => {
    if (DATA_MODE === 'live' && (!stateRef.current.user?.isStaff || !sessionStore.get()?.admin))
      throw new Error('Sign in with an authorized staff account to use the admin workspace.');
  };
  const getProduct = (id: number) => {
    const product = stateRef.current.products.find((p) => p.id === id);
    if (!product) throw new Error('This product is no longer available.');
    return product;
  };
  const loadCustomer = async (products: Product[], knownUser?: User) => {
    const rawUser = knownUser || mapUser(await api<any>(endpoints.me));
    const [rawCart, rawOrders, rawWishlist, rawAddresses] = await Promise.all([
      api<any>(endpoints.cart),
      fetchAll<any>(endpoints.orders),
      api<any>(endpoints.wishlist),
      fetchAll<any>(endpoints.addresses),
    ]);
    const oldAddresses = stateRef.current.addresses;
    patch({
      user: rawUser,
      cart: (rawCart.items || []).map((i: any) => mapCartItem(i, products)),
      orders: rawOrders.map((o) => mapOrder(o, products, rawUser)),
      wishlist: (rawWishlist.items || []).map((i: any) => Number(i.product_id)),
      addresses: rawAddresses.map((a) => {
        const old = oldAddresses.find((saved) => saved.id === a.id);
        return { ...mapAddress(a, old?.phone || rawUser.phone), isDefault: old?.isDefault ?? true };
      }),
    });
  };
  const refresh = async () => {
    if (DATA_MODE === 'demo') return;
    setLoading(true);
    setError(null);
    try {
      const [rawProducts, rawImages, rawCategories] = await Promise.all([
        fetchAll<any>(endpoints.products, false),
        fetchAll<any>(endpoints.images, false),
        fetchAll<any>(endpoints.categories, false),
      ]);
      const products = rawProducts.map((p) => mapProduct(p, rawImages, API_BASE_URL));
      const categories = rawCategories.map((c) => mapCategory(c, products));
      patch({ products, categories });
      if (sessionStore.get()?.admin) {
        const [work, rows] = await Promise.all([
          api<any>(`${endpoints.admin}workspace/`),
          adminRows('orders'),
        ]);
        const user = mapUser(work, true);
        patch({ user, orders: rows.map((o) => mapOrder(o, products, user)) });
        const [stats, customers, payments] = await Promise.allSettled([
          api<any>(`${endpoints.admin}overview/?days=30`),
          adminRows('customers'),
          adminRows('payments'),
        ]);
        setAdminStats(stats.status === 'fulfilled' ? stats.value : null);
        setAdminCustomers(customers.status === 'fulfilled' ? customers.value : []);
        setAdminPayments(payments.status === 'fulfilled' ? payments.value : []);
      } else if (sessionStore.get()) await loadCustomer(products);
    } catch (err) {
      setError(errorMessage(err));
      if ((err as any)?.status === 401) {
        await sessionStore.clear();
        patch({ user: null, cart: [], orders: [], wishlist: [], addresses: [] });
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!active) return;
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved && typeof saved === 'object') {
            const base = initialState();
            const next: State = { ...base };
            for (const key of [
              'cart',
              'wishlist',
              'compare',
              'orders',
              'addresses',
              'notifications',
            ] as const)
              if (Array.isArray(saved[key])) (next as any)[key] = saved[key];
            if (saved.builder && typeof saved.builder === 'object') next.builder = saved.builder;
            if (DATA_MODE === 'demo') {
              if (Array.isArray(saved.products))
                next.products = saved.products.map((product: Product) => {
                  const seed = demoProducts.find((p) => p.id === product.id);
                  if (!seed) return product;
                  // Native Metro asset IDs can change between builds. Rebind bundled
                  // photos to this build, while retaining custom image-picker URIs.
                  return {
                    ...product,
                    image: typeof product.image === 'number' ? seed.image : product.image,
                    images: product.images?.map((image, index) =>
                      typeof image === 'number' ? seed.images?.[index] || seed.image : image,
                    ),
                  };
                });
              if (saved.user === null || saved.user?.email) next.user = saved.user;
            }
            patch(next);
          }
        }
        if (DATA_MODE === 'live') await sessionStore.load();
      } catch {
        if (active) setError('Saved session could not be restored. Your catalog is ready to use.');
      } finally {
        if (active) {
          setHydrated(true);
          if (DATA_MODE === 'live') void refresh();
        }
      }
    })();
    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        DATA_MODE === 'demo'
          ? state
          : { addresses: state.addresses, compare: state.compare, builder: state.builder },
      ),
    ).catch(() => setError('Your changes could not be saved on this device.'));
  }, [state, hydrated]);
  const navigate = (name: RouteName, params?: Record<string, any>) => {
    setHistory((prev) => [...prev, { name, params }]);
    if (DATA_MODE === 'live' && name === 'adminOrderDetail' && params?.id)
      void adminRecord('orders', Number(params.id))
        .then((detail) => {
          const order = mapOrder(
            { ...detail.data, items: detail.items },
            stateRef.current.products,
            stateRef.current.user,
          );
          patch({ orders: stateRef.current.orders.map((o) => (o.id === order.id ? order : o)) });
        })
        .catch((err) => setError(errorMessage(err)));
  };
  const tab = (name: RouteName) => setHistory([{ name }]);
  const setWorkspace = (next: Workspace) => {
    if (next === 'admin' && DATA_MODE === 'live' && !stateRef.current.user?.isStaff) {
      navigate('login', { admin: true });
      return;
    }
    setWorkspaceValue(next);
    tab(next === 'admin' ? 'adminDashboard' : 'home');
  };
  const syncCart = async () => {
    const raw: any = await api(endpoints.cart);
    patch({ cart: (raw.items || []).map((i: any) => mapCartItem(i, stateRef.current.products)) });
  };
  const addToCart = (id: number, quantity = 1, options?: Record<string, string>) =>
    serialized(async () => {
      const product = getProduct(id);
      if (product.active === false) throw new Error('This product is unavailable.');
      validQuantity(quantity, product.stock);
      const existing = stateRef.current.cart.find((i) => i.productId === id);
      validQuantity(quantity + (existing?.quantity || 0), product.stock);
      if (DATA_MODE === 'live') {
        requireAuth();
        await api(endpoints.cartItems, {
          method: 'POST',
          body: { variant: product.variantId, quantity },
        });
        await syncCart();
      } else
        patch({
          cart: existing
            ? stateRef.current.cart.map((i) =>
                i.productId === id
                  ? {
                      ...i,
                      quantity: i.quantity + quantity,
                      selected: true,
                      options: options || i.options,
                    }
                  : i,
              )
            : [...stateRef.current.cart, { productId: id, quantity, selected: true, options }],
        });
      notify('Added to your cart');
    });
  const updateCart = (id: number, quantity: number) =>
    serialized(async () => {
      const product = getProduct(id);
      validQuantity(quantity, product.stock);
      const item = stateRef.current.cart.find((i) => i.productId === id);
      if (!item) throw new Error('This item is no longer in your cart.');
      if (DATA_MODE === 'live') {
        requireAuth();
        await api(`${endpoints.cartItems}${item.serverId}/`, {
          method: 'PATCH',
          body: { quantity },
        });
      }
      patch({
        cart: stateRef.current.cart.map((i) => (i.productId === id ? { ...i, quantity } : i)),
      });
    });
  const removeCart = (id: number) =>
    serialized(async () => {
      const items = stateRef.current.cart.filter((i) => i.productId === id);
      if (DATA_MODE === 'live') {
        requireAuth();
        for (const item of items)
          await api(`${endpoints.cartItems}${item.serverId}/`, { method: 'DELETE' });
      }
      patch({ cart: stateRef.current.cart.filter((i) => i.productId !== id) });
    });
  const clearCart = () =>
    serialized(async () => {
      if (DATA_MODE === 'live') {
        requireAuth();
        for (const item of stateRef.current.cart)
          await api(`${endpoints.cartItems}${item.serverId}/`, { method: 'DELETE' });
      }
      patch({ cart: [] });
    });
  const toggleWishlist = (id: number) =>
    serialized(async () => {
      const product = getProduct(id);
      const exists = stateRef.current.wishlist.includes(id);
      if (DATA_MODE === 'live') {
        requireAuth();
        if (exists) {
          const raw: any = await api(endpoints.wishlist);
          const items = (raw.items || []).filter((i: any) => Number(i.product_id) === id);
          for (const item of items)
            await api(`${endpoints.wishlist}items/${item.id}/`, { method: 'DELETE' });
        } else
          await api(`${endpoints.wishlist}items/`, {
            method: 'POST',
            body: { variant_id: product.variantId },
          });
      }
      patch({
        wishlist: exists
          ? stateRef.current.wishlist.filter((i) => i !== id)
          : [...stateRef.current.wishlist, id],
      });
      notify(exists ? 'Removed from wishlist' : 'Saved to your wishlist');
    });
  const placeOrder = (addressId: number, payment: 'cod' | 'sslcommerz', promo: string) =>
    serialized(async () => {
      const current = stateRef.current;
      const address = current.addresses.find((a) => a.id === addressId);
      if (!address) throw new Error('Choose a delivery address.');
      const selected = current.cart.filter((i) => i.selected);
      if (!selected.length) throw new Error('Select at least one item to order.');
      for (const item of selected) {
        const product = getProduct(item.productId);
        if (product.active === false) throw new Error(`${product.name} is no longer available.`);
        validQuantity(item.quantity, product.stock);
      }
      if (payment !== 'cod')
        throw new Error(
          'Online payment is not enabled in this mobile frontend. Please choose cash on delivery.',
        );
      let order: Order;
      if (DATA_MODE === 'live') {
        requireAuth();
        if (current.cart.some((i) => !i.selected))
          throw new Error(
            'The Django checkout purchases the whole cart. Remove unselected items before checking out.',
          );
        const raw: any = await api(endpoints.checkout, {
          method: 'POST',
          body: checkoutPayload(address, promo),
        });
        order = mapOrder(raw.order || raw, current.products, current.user);
      } else {
        if (promo.trim() && promo.trim().toUpperCase() !== DEMO_PROMO)
          throw new Error('This discount code is invalid. Try TECHNEST10.');
        const totals = calculateTotals(current.cart, current.products, promo);
        const id = Math.max(10056, ...current.orders.map((o) => o.id)) + 1;
        order = {
          id,
          number: `TN-${id}`,
          date: new Date().toISOString(),
          status: 'Processing',
          items: selected.map((i) => ({
            ...i,
            unitPrice: getProduct(i.productId).price,
            productName: getProduct(i.productId).name,
          })),
          ...totals,
          address: clone(address),
          payment,
          customer: address.name,
          email: current.user?.email || 'guest@technest.demo',
          phone: address.phone,
        };
        patch({
          products: current.products.map((p) => ({
            ...p,
            stock: p.stock - (selected.find((i) => i.productId === p.id)?.quantity || 0),
          })),
        });
      }
      patch({
        orders: [order, ...stateRef.current.orders],
        cart: current.cart.filter((i) => !i.selected),
        notifications: [
          {
            id: Date.now(),
            title: 'Your order is placed',
            body: `${order.number} is being prepared. Follow its journey in My orders.`,
            read: false,
            icon: 'bag-check-outline',
          },
          ...stateRef.current.notifications,
        ],
      });
      notify('Order placed successfully');
      return order;
    });
  const cancelOrder = (id: number) =>
    serialized(async () => {
      const order = stateRef.current.orders.find((o) => o.id === id);
      if (!order) throw new Error('Order not found.');
      if (!['Processing', 'Confirmed'].includes(order.status))
        throw new Error('This order can no longer be cancelled.');
      if (DATA_MODE === 'live') {
        requireAuth();
        await api(`${endpoints.orders}${id}/cancel/`, { method: 'POST' });
      } else
        patch({
          products: stateRef.current.products.map((p) => ({
            ...p,
            stock: p.stock + (order.items.find((i) => i.productId === p.id)?.quantity || 0),
          })),
        });
      patch({
        orders: stateRef.current.orders.map((o) =>
          o.id === id ? { ...o, status: 'Cancelled' } : o,
        ),
      });
      notify('Order cancelled');
    });
  const updateOrderStatus = (id: number, status: OrderStatus) =>
    serialized(async () => {
      requireAdmin();
      const order = stateRef.current.orders.find((o) => o.id === id);
      if (!order) throw new Error('Order not found.');
      const allowed: Record<OrderStatus, OrderStatus[]> = {
        Processing: ['Confirmed', 'Cancelled'],
        Confirmed: ['Shipped', 'Cancelled'],
        Shipped: ['Delivered'],
        Delivered: [],
        Cancelled: [],
      };
      if (!allowed[order.status].includes(status))
        throw new Error('This status change is not available for the current order.');
      if (DATA_MODE === 'live') {
        const detail = await adminRecord('orders', id);
        await api(`${endpoints.admin}resources/orders/${id}/action/`, {
          method: 'POST',
          body: { action: statusToApi(status) },
          headers: { 'X-Record-Version': detail.version },
        });
      } else if (status === 'Cancelled')
        patch({
          products: stateRef.current.products.map((p) => ({
            ...p,
            stock: p.stock + (order.items.find((i) => i.productId === p.id)?.quantity || 0),
          })),
        });
      patch({ orders: stateRef.current.orders.map((o) => (o.id === id ? { ...o, status } : o)) });
      notify('Order status updated');
    });
  const saveAddress = (address: Address) =>
    serialized(async () => {
      if (
        !address.name.trim() ||
        !address.phone.trim() ||
        !address.line.trim() ||
        !address.city.trim()
      )
        throw new Error('Complete your name, phone, address, and city.');
      if (!/^\d{4}$/.test(address.postal)) throw new Error('Enter a four-digit postal code.');
      const exists = stateRef.current.addresses.some((a) => a.id === address.id);
      let next = { ...address, id: exists ? address.id : Date.now() };
      if (DATA_MODE === 'live') {
        requireAuth();
        if (!exists && stateRef.current.addresses.length)
          throw new Error(
            'Your server supports one saved address per account. Edit your existing address instead.',
          );
        const raw: any = await api(`${endpoints.addresses}${exists ? `${address.id}/` : ''}`, {
          method: exists ? 'PATCH' : 'POST',
          body: {
            ...splitName(address.name),
            company: address.label,
            address1: address.line,
            address2: encodeAddress2(address),
            city: address.district || address.city,
            postal_code: address.postal,
            country: 'Bangladesh',
            region: address.division || 'dhaka',
          },
        });
        next = { ...address, id: raw.id };
      }
      patch({
        addresses: [
          ...stateRef.current.addresses
            .filter((a) => a.id !== next.id)
            .map((a) => (next.isDefault ? { ...a, isDefault: false } : a)),
          next,
        ],
      });
      notify('Delivery address saved');
    });
  const deleteAddress = (id: number) =>
    serialized(async () => {
      if (DATA_MODE === 'live') {
        requireAuth();
        await api(`${endpoints.addresses}${id}/`, { method: 'DELETE' });
      }
      const addresses = stateRef.current.addresses.filter((a) => a.id !== id);
      if (addresses.length && !addresses.some((a) => a.isDefault))
        addresses[0] = { ...addresses[0], isDefault: true };
      patch({ addresses });
      notify('Address removed');
    });
  const updateProfile = (data: { name: string; phone: string }) =>
    serialized(async () => {
      if (!data.name.trim()) throw new Error('Enter your full name.');
      const user = stateRef.current.user;
      if (!user) throw new Error('Please sign in first.');
      if (DATA_MODE === 'live') {
        requireAuth();
        await api(endpoints.me, {
          method: 'PATCH',
          body: { ...splitName(data.name), phone: data.phone },
        });
      }
      patch({ user: { ...user, ...data } });
      notify('Profile updated');
    });
  const login = async (email: string, password: string, admin = false) => {
    email = email.trim().toLowerCase();
    if (!emailValid(email)) throw new Error('Enter a valid email address.');
    if (!password) throw new Error('Enter your password.');
    if (DATA_MODE === 'demo') {
      patch({
        user: {
          ...demoUser,
          name: admin ? 'Technest Admin' : demoUser.name,
          email,
          isStaff: admin,
        },
      });
      if (admin) {
        setWorkspaceValue('admin');
        tab('adminDashboard');
      } else tab('account');
      notify('Welcome to Technest');
      return;
    }
    setLoading(true);
    try {
      if (admin) {
        const raw: any = await api(`${endpoints.admin}login/`, {
          method: 'POST',
          body: { email, password },
          auth: false,
        });
        await sessionStore.save({ access: raw.token, admin: true });
        const work: any = await api(`${endpoints.admin}workspace/`);
        patch({ user: mapUser(work, true), cart: [], wishlist: [], addresses: [] });
        setWorkspaceValue('admin');
        tab('adminDashboard');
      } else {
        const raw: any = await api('/api/v1/accounts/token/', {
          method: 'POST',
          body: { email, password },
          auth: false,
        });
        await sessionStore.save({ access: raw.access, refresh: raw.refresh });
        await loadCustomer(stateRef.current.products);
        setWorkspaceValue('store');
        tab('account');
      }
      await refresh();
      notify('Signed in successfully');
    } catch (err) {
      await sessionStore.clear();
      patch({ user: null });
      throw err;
    } finally {
      setLoading(false);
    }
  };
  const register = async (name: string, email: string, password: string, phone = '') => {
    if (name.trim().length < 2) throw new Error('Enter your full name.');
    if (!emailValid(email.trim())) throw new Error('Enter a valid email address.');
    requirePassword(password);
    if (DATA_MODE === 'demo') {
      patch({
        user: {
          id: Date.now(),
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone,
          isStaff: false,
        },
      });
      tab('account');
      notify('Your demo account is ready');
      return;
    }
    if (!phone.trim()) throw new Error('Enter your Bangladesh mobile number.');
    await api('/api/v1/accounts/register/', {
      method: 'POST',
      auth: false,
      body: {
        ...splitName(name),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        password2: password,
      },
    });
  };
  const verifyEmail = async (email: string, otp: string) => {
    if (DATA_MODE === 'live')
      await api('/api/v1/accounts/verify-email/', {
        method: 'POST',
        auth: false,
        body: { email: email.trim().toLowerCase(), otp: otp.trim() },
      });
  };
  const resendOTP = async (email: string) => {
    if (DATA_MODE === 'live')
      await api('/api/v1/accounts/resend-email-otp/', {
        method: 'POST',
        auth: false,
        body: { email: email.trim().toLowerCase() },
      });
  };
  const logout = async () => {
    await sessionStore.clear();
    patch({
      user: null,
      ...(DATA_MODE === 'live'
        ? {
            cart: [],
            orders: [],
            wishlist: [],
            addresses: [],
            notifications: [],
            builder: {},
            compare: [],
          }
        : {}),
    });
    setWorkspaceValue('store');
    tab('home');
    notify('Signed out');
  };
  const changePassword = async (old: string, next: string) => {
    if (!old) throw new Error('Enter your current password.');
    requirePassword(next);
    if (DATA_MODE === 'live') {
      requireAuth();
      await api('/api/v1/accounts/change-password/', {
        method: 'POST',
        body: { current_password: old, new_password: next, new_password2: next },
      });
    }
    notify(
      DATA_MODE === 'demo'
        ? 'Demo password form validated. No account password was changed.'
        : 'Password updated',
    );
  };
  const updateStock = (id: number, stock: number) =>
    serialized(async () => {
      requireAdmin();
      if (!Number.isInteger(stock) || stock < 0)
        throw new Error('Stock must be a nonnegative whole number.');
      const product = getProduct(id);
      if (DATA_MODE === 'live') await saveAdminRecord('variants', product.variantId, { stock });
      patch({
        products: stateRef.current.products.map((p) => (p.id === id ? { ...p, stock } : p)),
      });
      notify('Inventory updated');
    });
  const saveProduct = (draft: ProductDraft) =>
    serialized(async () => {
      requireAdmin();
      if (!draft.name.trim() || !draft.category.trim() || !draft.brand.trim())
        throw new Error('Complete the product name, category, and brand.');
      if (!Number.isFinite(draft.price) || draft.price <= 0)
        throw new Error('Enter a price greater than zero.');
      if (!Number.isInteger(draft.stock) || draft.stock < 0)
        throw new Error('Stock must be a nonnegative whole number.');
      if (DATA_MODE === 'demo') {
        const old = stateRef.current.products.find((p) => p.id === draft.id);
        const id = old?.id || Math.max(0, ...stateRef.current.products.map((p) => p.id)) + 1;
        const product: Product = {
          ...draft,
          id,
          slug: slugify(draft.name),
          variantId: old?.variantId || id,
          oldPrice: old?.oldPrice || draft.price,
          rating: old?.rating || 0,
          reviews: old?.reviews || 0,
          active: draft.active !== false,
        };
        patch({
          products: old
            ? stateRef.current.products.map((p) => (p.id === id ? product : p))
            : [product, ...stateRef.current.products],
        });
        notify('Product saved');
        return;
      }
      const old = draft.id ? getProduct(draft.id) : null;
      const detail: any = await api(
        `${endpoints.admin}resources/products/${old ? `${old.id}/` : 'new/'}`,
      );
      const values = {
        name: draft.name,
        category: relationId(detail.form, 'category', draft.category),
        brand: relationId(detail.form, 'brand', draft.brand),
        description: draft.description,
        specification: JSON.stringify(draft.specs),
        key_feature: JSON.stringify(draft.specs),
        is_active: draft.active !== false,
        availability: draft.stock > 0 ? 'in_stock' : 'out_of_stock',
      };
      const saved = await saveAdminRecord('products', old?.id, values, detail);
      try {
        if (old?.variantId)
          await saveAdminRecord('variants', old.variantId, {
            price: draft.price,
            discount_percentage: 0,
            stock: draft.stock,
            is_active: draft.active !== false,
          });
        else
          await saveAdminRecord('variants', undefined, {
            product: saved.id,
            price: draft.price,
            stock: draft.stock,
            discount_percentage: 0,
            is_default: true,
            is_active: true,
          });
        const image = draft.image as any;
        const oldImage = old?.image as any;
        if (image?.uri && image.uri !== oldImage?.uri && !/^https?:\/\//.test(image.uri)) {
          const form = new FormData();
          form.append('product', String(saved.id));
          form.append('alt_text', draft.name);
          form.append('is_primary', 'true');
          form.append('display_order', '0');
          if (Platform.OS === 'web') {
            const blob = await fetch(image.uri).then((res) => res.blob());
            form.append('image', blob, `product.${blob.type.split('/')[1] || 'jpg'}`);
          } else
            form.append('image', {
              uri: image.uri,
              name: 'product.jpg',
              type: 'image/jpeg',
            } as any);
          const previousImages = await fetchAll<any>(
            `${endpoints.images}?product=${saved.id}`,
            false,
          );
          await api(`${endpoints.admin}resources/images/new/`, { method: 'POST', body: form });
          // Django does not enforce a unique primary image; explicitly retire former primaries.
          for (const previous of previousImages.filter((picture: any) => picture.is_primary))
            await saveAdminRecord('images', previous.id, { is_primary: false });
        }
      } catch (err) {
        await refresh();
        throw new Error(
          `Product details were saved, but inventory or image upload needs attention: ${errorMessage(err)}`,
        );
      }
      await refresh();
      notify('Product saved');
    });
  const value: Context = {
    ...state,
    adminStats,
    adminCustomers,
    adminPayments,
    route: history[history.length - 1],
    navigate,
    back: () =>
      setHistory((prev) =>
        prev.length > 1
          ? prev.slice(0, -1)
          : [{ name: workspace === 'admin' ? 'adminDashboard' : 'home' }],
      ),
    tab,
    mode: DATA_MODE,
    workspace,
    setWorkspace,
    hydrated,
    loading,
    error,
    toast,
    notify,
    dismissToast: () => setToast(null),
    clearError: () => setError(null),
    refresh,
    addToCart,
    updateCart,
    toggleCart: (id) =>
      patch({
        cart: stateRef.current.cart.map((i) =>
          i.productId === id ? { ...i, selected: !i.selected } : i,
        ),
      }),
    removeCart,
    clearCart,
    toggleWishlist,
    toggleCompare: (id) => {
      const current = stateRef.current.compare;
      if (!current.includes(id) && current.length >= 3) {
        notify('Compare up to 3 products at a time');
        return;
      }
      patch({ compare: current.includes(id) ? current.filter((p) => p !== id) : [...current, id] });
    },
    placeOrder,
    cancelOrder,
    updateOrderStatus,
    saveAddress,
    deleteAddress,
    updateProfile,
    login,
    register,
    verifyEmail,
    resendOTP,
    logout,
    changePassword,
    saveProduct,
    updateStock,
    markNotificationsRead: () =>
      patch({ notifications: stateRef.current.notifications.map((n) => ({ ...n, read: true })) }),
    setBuildComponent: (slot, id) => {
      getProduct(id);
      patch({ builder: { ...stateRef.current.builder, [slot]: id } });
    },
    clearBuild: () => patch({ builder: {} }),
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
