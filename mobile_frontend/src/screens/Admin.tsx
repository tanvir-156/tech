import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  Pressable,
  Modal,
  Switch,
  ImageSourcePropType,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../state/AppContext';
import {
  colors,
  Txt,
  Icon,
  Button,
  IconButton,
  Header,
  Card,
  Badge,
  Field,
  Chip,
  Empty,
  Section,
  Price,
  Screen,
  Divider,
  Progress,
  Brand,
} from '../components/ui';
import { money, addressText } from '../lib/utils';
import { api, endpoints } from '../lib/api';
import type { Order, OrderStatus, Product, RouteName } from '../lib/types';

const statuses: OrderStatus[] = ['Processing', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];
const errorText = (e: unknown) =>
  e instanceof Error ? e.message : 'Something went wrong. Please try again.';
const orderTone = (s: OrderStatus): 'orange' | 'green' | 'blue' | 'red' | 'neutral' =>
  s === 'Delivered' || s === 'Confirmed'
    ? 'green'
    : s === 'Shipped'
      ? 'blue'
      : s === 'Cancelled'
        ? 'red'
        : 'orange';
const dateText = (date: string) =>
  Number.isFinite(new Date(date).getTime())
    ? new Date(date).toLocaleDateString('en-GB', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'Asia/Dhaka',
      })
    : 'Open for details';
const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
const isWithin = (order: Order, days: number) =>
  days === 0 || Date.now() - new Date(order.date).getTime() <= days * 86400000;
const IconTile = ({
  name,
  color = colors.orange,
  bg = '#FFF0E5',
  size = 42,
}: {
  name: string;
  color?: string;
  bg?: string;
  size?: number;
}) => (
  <View
    style={[
      s.iconTile,
      { backgroundColor: bg, width: size, height: size, borderRadius: size * 0.3 },
    ]}
  >
    <Icon name={name} color={color} size={size * 0.5} />
  </View>
);
function DemoNote() {
  const { mode } = useApp();
  return (
    <View style={s.demo}>
      <View style={[s.dot, { backgroundColor: mode === 'demo' ? colors.orange : colors.green }]} />
      <Txt size={11} color={colors.muted}>
        {mode === 'demo'
          ? 'DEMO WORKSPACE · CHANGES SAVED ON THIS DEVICE'
          : 'CONNECTED WORKSPACE · LIVE STORE DATA'}
      </Txt>
    </View>
  );
}
function Metric({
  icon,
  label,
  value,
  detail,
  tone = 'orange',
}: {
  icon: string;
  label: string;
  value: string;
  detail?: string;
  tone?: 'orange' | 'green' | 'blue' | 'red';
}) {
  const color =
    tone === 'green'
      ? colors.green
      : tone === 'red'
        ? colors.red
        : tone === 'blue'
          ? '#4778E8'
          : colors.orange;
  return (
    <Card style={s.metric}>
      <IconTile
        name={icon}
        color={color}
        bg={
          tone === 'green'
            ? '#E9F7F1'
            : tone === 'red'
              ? '#FFF0F2'
              : tone === 'blue'
                ? '#EDF2FF'
                : '#FFF0E5'
        }
      />
      <Txt size={value.length > 10 ? 18 : 23} weight="bold" style={{ marginTop: 15 }}>
        {value}
      </Txt>
      <Txt size={12} color={colors.muted} style={{ marginTop: 5 }}>
        {label}
      </Txt>
      {detail ? (
        <Txt size={10} weight="medium" color={colors.green} style={{ marginTop: 9 }}>
          {detail}
        </Txt>
      ) : null}
    </Card>
  );
}
function MenuRow({
  icon,
  title,
  subtitle,
  onPress,
  badge,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  badge?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [s.menuRow, { opacity: pressed ? 0.65 : 1 }]}
    >
      <IconTile name={icon} size={40} />
      <View style={{ flex: 1, gap: 4 }}>
        <Txt size={14} weight="semibold">
          {title}
        </Txt>
        {subtitle ? (
          <Txt size={11} color={colors.muted}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {badge ? <Badge text={badge} /> : null}
      <Icon name="chevron-forward" size={17} color={colors.muted} />
    </Pressable>
  );
}
function OrderRow({ order }: { order: Order }) {
  const { products, navigate } = useApp();
  const product = products.find((p) => p.id === order.items[0]?.productId);
  return (
    <Card onPress={() => navigate('adminOrderDetail', { id: order.id })} style={{ padding: 13 }}>
      <View style={s.row}>
        {product ? (
          <View style={s.orderImage}>
            <Image source={product.image} style={{ width: 49, height: 45 }} resizeMode="contain" />
          </View>
        ) : (
          <IconTile name="bag-handle-outline" />
        )}
        <View style={{ flex: 1, gap: 6 }}>
          <Txt size={13} weight="bold">
            {order.number}
          </Txt>
          <Txt size={10} color={colors.muted}>
            {order.date ? dateText(order.date) : 'Details on open'}
            {order.items.length ? ` · ${order.items.length} items` : ''}
          </Txt>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 7 }}>
          <Txt size={13} weight="bold">
            {money(order.total)}
          </Txt>
          <Badge text={order.status} tone={orderTone(order.status)} />
        </View>
        <Icon name="chevron-forward" color={colors.muted} size={14} />
      </View>
    </Card>
  );
}
function RevenueChart({ orders, days = 7 }: { orders: Order[]; days?: number }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const earliest = Math.min(
    today.getTime(),
    ...orders.map((o) => new Date(o.date).getTime()).filter(Number.isFinite),
  );
  const span = days || Math.max(7, Math.ceil((today.getTime() - earliest) / 86400000) + 1);
  const start = new Date(today);
  start.setDate(start.getDate() - span + 1);
  const series = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + Math.floor((i * span) / 7));
    const end = new Date(start);
    end.setDate(end.getDate() + Math.floor(((i + 1) * span) / 7));
    return {
      day: d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        timeZone: 'Asia/Dhaka',
      }),
      total: orders
        .filter((o) => o.status !== 'Cancelled' && new Date(o.date) >= d && new Date(o.date) < end)
        .reduce((a, o) => a + o.total, 0),
    };
  });
  const max = Math.max(...series.map((d) => d.total), 1);
  return (
    <View accessibilityLabel="Order value chart for selected period" style={{ gap: 10 }}>
      <View style={s.chart}>
        <View style={s.chartGrid} />
        <View style={[s.chartGrid, { bottom: 48 }]} />
        <View style={[s.chartGrid, { bottom: 96 }]} />
        {series.map((item, i) => (
          <View
            key={i}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 140 }}
          >
            <LinearGradient
              colors={['#FF7E2E', '#FF5D05']}
              style={[
                s.chartBar,
                {
                  height: Math.max(5, (item.total / max) * 126),
                  opacity: item.total === 0 ? 0.15 : 1,
                },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={s.row}>
        {series.map((item, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Txt size={8} color={colors.muted}>
              {item.day}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

export function AdminDashboardScreen() {
  const app = useApp();
  const [days, setDays] = useState(30);
  if (app.mode === 'live') return <LiveSummary />;
  const selected = app.orders.filter((o) => isWithin(o, days));
  const active = selected.filter((o) => o.status !== 'Cancelled');
  const revenue = active.reduce((n, o) => n + o.total, 0);
  const customers = new Set(selected.map((o) => o.email)).size;
  const low = app.products.filter((p) => p.stock > 0 && p.stock < 10).length;
  return (
    <Screen>
      <View style={s.dashboardHeader}>
        <Brand admin size={22} />
        <View style={s.row}>
          <IconButton
            name="notifications-outline"
            onPress={() => app.navigate('notifications')}
            label="Notifications"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Admin menu"
            onPress={() => app.navigate('adminMore')}
            style={s.avatarSmall}
          >
            <Txt size={12} weight="bold" color={colors.orange}>
              {initials(app.user?.name || 'Store Admin')}
            </Txt>
          </Pressable>
        </View>
      </View>
      <View style={s.content}>
        <DemoNote />
        <View style={s.between}>
          <View style={{ gap: 5 }}>
            <Txt size={27} weight="bold">
              Dashboard
            </Txt>
            <Txt size={12} color={colors.muted}>
              Your store, at a glance.
            </Txt>
          </View>
          <IconButton
            name="refresh-outline"
            onPress={() => app.refresh().catch((e) => app.notify(errorText(e)))}
            label="Refresh dashboard"
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {[7, 30, 0].map((v) => (
            <Chip
              key={v}
              label={v ? `Last ${v} days` : 'All time'}
              active={days === v}
              onPress={() => setDays(v)}
            />
          ))}
        </ScrollView>
        <View style={s.metricGrid}>
          <Metric
            icon="wallet-outline"
            label="Order value"
            value={money(revenue)}
            detail={`${active.length} active orders`}
          />
          <Metric
            icon="bag-handle-outline"
            label="Total orders"
            value={String(selected.length)}
            detail={`${selected.filter((o) => o.status === 'Processing').length} need attention`}
          />
          <Metric
            icon="people-outline"
            label="Customers"
            value={String(customers)}
            detail="Unique order customers"
            tone="blue"
          />
          <Metric
            icon="cube-outline"
            label="Products"
            value={String(app.products.length)}
            detail={`${low} running low`}
            tone="green"
          />
        </View>
        <Card style={{ gap: 20 }}>
          <View style={s.between}>
            <View style={{ gap: 5 }}>
              <Txt weight="bold" size={16}>
                Sales overview
              </Txt>
              <Txt size={11} color={colors.muted}>
                Order value · excluding cancelled
              </Txt>
            </View>
            <View style={s.legend}>
              <View style={s.dot} />
              <Txt size={10} color={colors.muted}>
                BDT
              </Txt>
            </View>
          </View>
          <Txt size={26} weight="bold">
            {money(revenue)}
          </Txt>
          <RevenueChart orders={selected} days={days} />
        </Card>
        <Section title="Quick actions">
          <View style={s.quickGrid}>
            {(
              [
                { icon: 'add-circle-outline', title: 'Add product', route: 'adminProductEdit' },
                { icon: 'file-tray-stacked-outline', title: 'Inventory', route: 'adminInventory' },
                { icon: 'bar-chart-outline', title: 'Reports', route: 'adminReports' },
              ] as const
            ).map((item) => (
              <Pressable
                key={item.title}
                onPress={() => app.navigate(item.route)}
                accessibilityRole="button"
                style={s.quickAction}
              >
                <IconTile name={item.icon} />
                <Txt size={11} weight="semibold" style={{ marginTop: 10 }}>
                  {item.title}
                </Txt>
              </Pressable>
            ))}
          </View>
        </Section>
        <Section
          title="Recent orders"
          action="View all"
          onAction={() => app.navigate('adminOrders')}
        >
          {app.orders.length ? (
            app.orders.slice(0, 3).map((o) => <OrderRow key={o.id} order={o} />)
          ) : (
            <Empty
              icon="bag-outline"
              title="No orders yet"
              message="New orders will appear here."
            />
          )}
        </Section>
        <Card
          style={s.alertCard}
          onPress={() => app.navigate('adminInventory', { filter: 'Low stock' })}
        >
          <Icon name="alert-circle-outline" color={colors.orange} size={25} />
          <View style={{ flex: 1, gap: 5 }}>
            <Txt size={13} weight="semibold">
              Keep your shelves ready
            </Txt>
            <Txt size={11} color={colors.muted}>
              {low} products are running low on stock.
            </Txt>
          </View>
          <Icon name="arrow-forward" size={18} color={colors.orange} />
        </Card>
      </View>
    </Screen>
  );
}

export function AdminOrdersScreen() {
  const { orders, navigate } = useApp();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const list = orders.filter(
    (o) =>
      (filter === 'All' || o.status === filter) &&
      `${o.number} ${o.customer} ${o.email}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Screen>
      <Header title="Orders" subtitle={`${orders.length} orders in your store`} />
      <View style={s.content}>
        <Field value={query} onChangeText={setQuery} placeholder="Search order or customer" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {['All', ...statuses].map((v) => (
            <Chip
              key={v}
              label={`${v} (${v === 'All' ? orders.length : orders.filter((o) => o.status === v).length})`}
              active={filter === v}
              onPress={() => setFilter(v)}
            />
          ))}
        </ScrollView>
        <View style={s.between}>
          <Txt size={11} weight="medium" color={colors.muted}>
            {list.length} RESULTS
          </Txt>
          <Txt size={11} color={colors.muted}>
            Newest first
          </Txt>
        </View>
        {list.map((o) => (
          <OrderRow key={o.id} order={o} />
        ))}
        {!list.length ? (
          <Empty
            icon="receipt-outline"
            title="No matching orders"
            message="Try another status or search term."
            action="Reset filters"
            onAction={() => {
              setFilter('All');
              setQuery('');
            }}
          />
        ) : null}
      </View>
    </Screen>
  );
}

export function AdminOrderDetailScreen() {
  const app = useApp();
  const order = app.orders.find((o) => o.id === app.route.params?.id);
  const [pending, setPending] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  if (!order)
    return (
      <Screen>
        <Header title="Order details" />
        <Empty
          icon="receipt-outline"
          title="Order unavailable"
          message="This order could not be found."
          action="View orders"
          onAction={() => app.navigate('adminOrders')}
        />
      </Screen>
    );
  const next: Partial<Record<OrderStatus, OrderStatus>> = {
    Processing: 'Confirmed',
    Confirmed: 'Shipped',
    Shipped: 'Delivered',
  };
  const update = async (status: OrderStatus) => {
    setPending(true);
    try {
      await app.updateOrderStatus(order.id, status);
      setConfirmCancel(false);
      app.notify(`Order ${status.toLowerCase()}`);
    } catch (e) {
      app.notify(errorText(e));
    } finally {
      setPending(false);
    }
  };
  return (
    <Screen>
      <Header title="Order details" />
      <View style={s.content}>
        <View style={s.between}>
          <View style={{ gap: 6 }}>
            <Txt size={22} weight="bold">
              {order.number}
            </Txt>
            <Txt size={11} color={colors.muted}>
              {order.date ? `Placed ${dateText(order.date)}` : 'Loading order details…'}
            </Txt>
          </View>
          <Badge text={order.status} tone={orderTone(order.status)} />
        </View>
        <Progress status={order.status} />
        <Card style={{ gap: 18 }}>
          <View style={s.row}>
            <IconTile name="person-outline" bg="#F1EFFA" color="#686080" />
            <View style={{ gap: 4, flex: 1 }}>
              <Txt size={10} color={colors.muted}>
                CUSTOMER
              </Txt>
              <Txt size={14} weight="semibold">
                {order.customer}
              </Txt>
              <Txt size={11} color={colors.muted}>
                {order.phone}
              </Txt>
              <Txt size={11} color={colors.muted}>
                {order.email}
              </Txt>
            </View>
          </View>
          <Divider />
          <View style={[s.row, { alignItems: 'flex-start' }]}>
            <IconTile name="location-outline" bg="#F1EFFA" color="#686080" />
            <View style={{ gap: 5, flex: 1 }}>
              <Txt size={10} color={colors.muted}>
                SHIPPING ADDRESS
              </Txt>
              <Txt size={12}>{addressText(order.address)}</Txt>
            </View>
          </View>
        </Card>
        <Section title={`Items (${order.items.length})`}>
          {order.items.map((item, i) => {
            const product = app.products.find((p) => p.id === item.productId);
            return (
              <Card key={i} style={{ padding: 12 }}>
                <View style={s.row}>
                  {product ? (
                    <Image
                      source={product.image}
                      style={{ width: 63, height: 64 }}
                      resizeMode="contain"
                    />
                  ) : (
                    <IconTile name="cube-outline" />
                  )}
                  <View style={{ flex: 1, gap: 6 }}>
                    <Txt size={12} weight="semibold">
                      {item.productName || product?.name || 'Product unavailable'}
                    </Txt>
                    <Txt size={10} color={colors.muted}>
                      Qty {item.quantity}
                      {item.options ? ` · ${Object.values(item.options).join(' / ')}` : ''}
                    </Txt>
                    <Txt size={12} weight="bold">
                      {money((item.unitPrice ?? product?.price ?? 0) * item.quantity)}
                    </Txt>
                  </View>
                </View>
              </Card>
            );
          })}
        </Section>
        <Card style={{ gap: 14 }}>
          <AmountRow label="Subtotal" amount={order.subtotal} />
          <AmountRow label="Delivery" amount={order.delivery} />
          {order.discount > 0 ? <AmountRow label="Discount" amount={-order.discount} /> : null}
          <Divider />
          <View style={s.between}>
            <Txt weight="bold">Total</Txt>
            <Price value={order.total} size={21} />
          </View>
          <View style={s.paymentNote}>
            <Icon
              name={order.payment === 'cod' ? 'cash-outline' : 'card-outline'}
              size={17}
              color={colors.muted}
            />
            <Txt size={11} color={colors.muted}>
              {order.payment === 'cod' ? 'Cash on delivery' : 'Online payment'} ·{' '}
              {order.status === 'Delivered' ? 'Order delivered' : 'Payment tracked by the server'}
            </Txt>
          </View>
        </Card>
        {next[order.status] ? (
          <Button
            title={`Mark as ${next[order.status]}`}
            icon="checkmark-circle-outline"
            loading={pending}
            onPress={() => update(next[order.status]!)}
          />
        ) : null}
        {['Processing', 'Confirmed'].includes(order.status) ? (
          <Button
            title="Cancel order"
            variant="outline"
            icon="close-circle-outline"
            disabled={pending}
            onPress={() => setConfirmCancel(true)}
          />
        ) : null}
      </View>
      <Modal
        visible={confirmCancel}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmCancel(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <IconTile name="alert-circle-outline" />
            <Txt size={20} weight="bold">
              Cancel this order?
            </Txt>
            <Txt color={colors.muted}>The customer order will be marked as cancelled.</Txt>
            <Button
              title="Cancel order"
              variant="danger"
              loading={pending}
              onPress={() => update('Cancelled')}
            />
            <Button
              title="Keep order"
              variant="secondary"
              onPress={() => setConfirmCancel(false)}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
function AmountRow({ label, amount }: { label: string; amount: number }) {
  return (
    <View style={s.between}>
      <Txt size={12} color={colors.muted}>
        {label}
      </Txt>
      <Txt size={12} weight="medium">
        {money(amount)}
      </Txt>
    </View>
  );
}

export function AdminProductsScreen() {
  const app = useApp();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string>(app.route.params?.category || 'All');
  const names = ['All', ...Array.from(new Set(app.products.map((p) => p.category)))];
  const list = app.products.filter(
    (p) =>
      (filter === 'All' || p.category === filter) &&
      `${p.name} ${p.brand}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Screen>
      <Header
        title="Products"
        subtitle={`${app.products.length} products in your catalog`}
        right={
          <IconButton
            name="add"
            label="Add product"
            color={colors.orange}
            onPress={() => app.navigate('adminProductEdit')}
          />
        }
      />
      <View style={s.content}>
        <Field value={query} onChangeText={setQuery} placeholder="Search products or brands" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {names.map((v) => (
            <Chip key={v} label={v} active={filter === v} onPress={() => setFilter(v)} />
          ))}
        </ScrollView>
        <View style={s.between}>
          <Txt size={11} color={colors.muted}>
            {list.length} PRODUCTS
          </Txt>
          <Txt size={11} color={colors.muted}>
            Tap to manage
          </Txt>
        </View>
        {list.map((p) => (
          <Card
            key={p.id}
            onPress={() => app.navigate('adminProductEdit', { id: p.id })}
            style={{ padding: 13 }}
          >
            <View style={s.row}>
              <View style={s.productThumb}>
                <Image source={p.image} style={{ width: 64, height: 64 }} resizeMode="contain" />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Txt size={13} weight="semibold" numberOfLines={2}>
                  {p.name}
                </Txt>
                <Txt size={13} weight="bold">
                  {money(p.price)}
                </Txt>
                <Txt size={10} color={colors.muted}>
                  Stock: {p.stock} · {p.brand}
                </Txt>
              </View>
              <View style={{ gap: 15, alignItems: 'flex-end' }}>
                <Icon name="chevron-forward" size={16} color={colors.muted} />
                <Badge
                  text={p.active === false ? 'Hidden' : 'Active'}
                  tone={p.active === false ? 'neutral' : 'green'}
                />
              </View>
            </View>
          </Card>
        ))}
        {!list.length ? (
          <Empty
            icon="cube-outline"
            title="No products found"
            message="Try a different search or add a new product."
            action="Add product"
            onAction={() => app.navigate('adminProductEdit')}
          />
        ) : null}
        <Button title="Add a product" icon="add" onPress={() => app.navigate('adminProductEdit')} />
      </View>
    </Screen>
  );
}

export function AdminProductEditScreen() {
  const app = useApp();
  const product = app.products.find((p) => p.id === app.route.params?.id);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(product?.name || '');
  const [brand, setBrand] = useState(product?.brand || '');
  const [category, setCategory] = useState(
    product?.category || app.categories[0]?.name || 'Laptops',
  );
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [stock, setStock] = useState(product ? String(product.stock) : '');
  const [description, setDescription] = useState(product?.description || '');
  const [specs, setSpecs] = useState<[string, string][]>(
    Object.entries(product?.specs || {}).length
      ? Object.entries(product!.specs)
      : [
          ['Processor', ''],
          ['Memory', ''],
          ['Storage', ''],
        ],
  );
  const [image, setImage] = useState<ImageSourcePropType | null>(product?.image || null);
  const [active, setActive] = useState(product?.active !== false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const validate = () => {
    if (name.trim().length < 3) return 'Enter a product name with at least 3 characters.';
    if (!brand.trim()) return 'Enter the product brand.';
    if (!category) return 'Choose a category.';
    if (!Number.isFinite(Number(price)) || Number(price) <= 0)
      return 'Enter a valid price greater than zero.';
    if (!/^\d+$/.test(stock) || Number(stock) > 999999)
      return 'Stock must be a whole number from 0 to 999,999.';
    return '';
  };
  const pick = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Allow photo access to choose a product image.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        setImage({ uri: result.assets[0].uri });
        setError('');
      }
    } catch (e) {
      setError(errorText(e));
    }
  };
  const save = async () => {
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      setStep(0);
      return;
    }
    if (!image) {
      setError('Add a product image before saving.');
      return;
    }
    setPending(true);
    setError('');
    try {
      await app.saveProduct({
        id: product?.id,
        name: name.trim(),
        brand: brand.trim(),
        category,
        price: Number(price),
        stock: Number(stock),
        description: description.trim(),
        specs: Object.fromEntries(
          specs.filter(([k, v]) => k.trim() && v.trim()).map(([k, v]) => [k.trim(), v.trim()]),
        ),
        image,
        active,
        options: product?.options,
        component: product?.component,
        tag: product?.tag,
      });
      app.notify(product ? 'Product updated' : 'Product added');
      app.navigate('adminProducts');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setPending(false);
    }
  };
  return (
    <Screen>
      <Header title={product ? 'Edit product' : 'Add product'} />
      <View style={s.content}>
        <View style={s.stepRow}>
          {['Basic', 'Specs', 'Images'].map((label, i) => (
            <Pressable
              key={label}
              onPress={() => {
                if (i > 0) {
                  const e = validate();
                  if (e) {
                    setError(e);
                    return;
                  }
                }
                setStep(i);
                setError('');
              }}
              accessibilityRole="button"
              style={{ flex: 1, alignItems: 'center', gap: 8 }}
            >
              <View
                style={[s.stepCircle, { backgroundColor: i <= step ? colors.orange : '#E9E8F1' }]}
              >
                <Txt size={11} weight="bold" color={i <= step ? '#FFFFFF' : colors.muted}>
                  {i < step ? '✓' : String(i + 1)}
                </Txt>
              </View>
              <Txt
                size={11}
                weight={i === step ? 'semibold' : 'regular'}
                color={i === step ? colors.orange : colors.muted}
              >
                {label}
              </Txt>
            </Pressable>
          ))}
        </View>
        {error ? (
          <View style={s.errorBox}>
            <Icon name="alert-circle-outline" color={colors.red} size={18} />
            <Txt size={12} color={colors.red} style={{ flex: 1 }}>
              {error}
            </Txt>
          </View>
        ) : null}
        {step === 0 ? (
          <>
            <Field
              label="Product name *"
              value={name}
              onChangeText={setName}
              placeholder="e.g. ASUS ROG Strix G16"
            />
            <Field label="Brand *" value={brand} onChangeText={setBrand} placeholder="e.g. ASUS" />
            <View style={{ gap: 10 }}>
              <Txt size={12} weight="semibold">
                Category *
              </Txt>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {app.categories.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.name}
                    active={category === c.name}
                    onPress={() => setCategory(c.name)}
                  />
                ))}
              </ScrollView>
            </View>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Price (BDT) *"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
                {app.mode === 'live' ? (
                  <Txt size={9} color={colors.muted} style={{ marginTop: 6 }}>
                    Sets the selling price and clears the variant percentage discount.
                  </Txt>
                ) : null}
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Stock *"
                  value={stock}
                  onChangeText={setStock}
                  keyboardType="number-pad"
                  placeholder="0"
                />
              </View>
            </View>
            <Field
              label="Description"
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="What makes this product special?"
            />
            <Card style={s.between}>
              <View style={{ gap: 4 }}>
                <Txt size={13} weight="semibold">
                  Visible in store
                </Txt>
                <Txt size={11} color={colors.muted}>
                  Customers can discover this product
                </Txt>
              </View>
              <Switch
                value={active}
                onValueChange={setActive}
                trackColor={{ false: '#DADAE5', true: '#FFD6BB' }}
                thumbColor={active ? colors.orange : '#FFFFFF'}
              />
            </Card>
          </>
        ) : null}
        {step === 1 ? (
          <>
            <View style={{ gap: 7 }}>
              <Txt size={21} weight="bold">
                The finer details.
              </Txt>
              <Txt size={12} color={colors.muted}>
                Add clear specifications so customers can choose confidently.
              </Txt>
            </View>
            {specs.map(([key, value], i) => (
              <Card key={i} style={{ gap: 12 }}>
                <View style={s.between}>
                  <Txt size={10} color={colors.muted}>
                    SPECIFICATION {i + 1}
                  </Txt>
                  <IconButton
                    name="close-outline"
                    size={17}
                    label={`Remove specification ${i + 1}`}
                    onPress={() => setSpecs(specs.filter((_, n) => n !== i))}
                  />
                </View>
                <Field
                  value={key}
                  onChangeText={(v) => setSpecs(specs.map((x, n) => (n === i ? [v, x[1]] : x)))}
                  placeholder="Label, e.g. Display"
                />
                <Field
                  value={value}
                  onChangeText={(v) => setSpecs(specs.map((x, n) => (n === i ? [x[0], v] : x)))}
                  placeholder="Value, e.g. 16 inch QHD+"
                />
              </Card>
            ))}
            <Button
              title="Add specification"
              icon="add"
              variant="secondary"
              onPress={() => setSpecs([...specs, ['', '']])}
            />
          </>
        ) : null}
        {step === 2 ? (
          <>
            <View style={{ gap: 7 }}>
              <Txt size={21} weight="bold">
                Make it stand out.
              </Txt>
              <Txt size={12} color={colors.muted}>
                Choose a square product photo with a clean background.
              </Txt>
            </View>
            <Pressable
              onPress={pick}
              accessibilityRole="button"
              accessibilityLabel="Choose product image"
              style={s.imageUpload}
            >
              {image ? (
                <Image source={image} style={{ width: '100%', height: 220 }} resizeMode="contain" />
              ) : (
                <>
                  <Icon name="images-outline" size={40} color={colors.orange} />
                  <Txt weight="semibold" style={{ marginTop: 14 }}>
                    Upload product image
                  </Txt>
                  <Txt size={11} color={colors.muted} style={{ marginTop: 7 }}>
                    Tap to choose from your photos
                  </Txt>
                </>
              )}
            </Pressable>
            {image ? (
              <Button
                title="Choose a different image"
                icon="image-outline"
                variant="secondary"
                onPress={pick}
              />
            ) : null}
            <Card style={{ gap: 14 }}>
              <Txt size={11} color={colors.muted}>
                READY TO PUBLISH
              </Txt>
              <Txt size={17} weight="bold">
                {name}
              </Txt>
              <Txt size={12} color={colors.muted}>
                {brand} · {category} · {stock} in stock
              </Txt>
              <Price value={Number(price) || 0} />
            </Card>
          </>
        ) : null}
        {step < 2 ? (
          <Button
            title="Next"
            icon="arrow-forward"
            onPress={() => {
              const e = validate();
              if (e) {
                setError(e);
                return;
              }
              setError('');
              setStep(step + 1);
            }}
          />
        ) : (
          <Button
            title={product ? 'Save changes' : 'Publish product'}
            icon="checkmark"
            loading={pending}
            onPress={save}
          />
        )}
        <Txt size={10} color={colors.muted} style={{ textAlign: 'center' }}>
          {app.mode === 'demo'
            ? 'Demo edits are stored on this device.'
            : 'Changes are saved to your connected backend.'}
        </Txt>
      </View>
    </Screen>
  );
}

export function AdminCategoriesScreen() {
  const app = useApp();
  return (
    <Screen>
      <Header title="Categories" subtitle="A well-organized catalog starts here" />
      <View style={s.content}>
        <DemoNote />
        {app.categories.map((category) => {
          const count = app.products.filter((p) => p.category === category.name).length;
          return (
            <Card
              key={category.id}
              onPress={() => app.navigate('adminProducts', { category: category.name })}
              style={{ padding: 16 }}
            >
              <View style={s.row}>
                <IconTile name={category.icon} bg={category.color || '#FFF0E5'} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Txt size={14} weight="semibold">
                    {category.name}
                  </Txt>
                  <Txt size={11} color={colors.muted}>
                    {category.description}
                  </Txt>
                </View>
                <Txt size={16} weight="bold">
                  {count}
                </Txt>
                <Icon name="chevron-forward" color={colors.muted} size={16} />
              </View>
            </Card>
          );
        })}
        <View style={s.infoBox}>
          <Icon name="information-circle-outline" color={colors.muted} size={20} />
          <Txt size={11} color={colors.muted} style={{ flex: 1 }}>
            Tap a category to manage its products. Category structure is managed in the existing
            Django admin.
          </Txt>
        </View>
      </View>
    </Screen>
  );
}

export function AdminInventoryScreen() {
  const app = useApp();
  const [filter, setFilter] = useState<string>(app.route.params?.filter || 'All');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [stock, setStock] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const inStock = app.products.filter((p) => p.stock >= 10).length;
  const low = app.products.filter((p) => p.stock > 0 && p.stock < 10).length;
  const out = app.products.filter((p) => p.stock === 0).length;
  const list = app.products.filter(
    (p) =>
      (filter === 'All' ||
        (filter === 'In stock' && p.stock >= 10) ||
        (filter === 'Low stock' && p.stock > 0 && p.stock < 10) ||
        (filter === 'Out of stock' && p.stock === 0)) &&
      `${p.name} ${p.brand}`.toLowerCase().includes(query.toLowerCase()),
  );
  const save = async () => {
    if (!editing) return;
    if (!/^\d+$/.test(stock) || Number(stock) > 999999) {
      setError('Enter a whole number from 0 to 999,999.');
      return;
    }
    setPending(true);
    try {
      await app.updateStock(editing.id, Number(stock));
      setEditing(null);
      app.notify('Inventory updated');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setPending(false);
    }
  };
  return (
    <Screen>
      <Header title="Inventory" subtitle="Every unit, accounted for" />
      <View style={s.content}>
        <View style={s.stockGrid}>
          {[
            {
              title: 'In stock',
              value: inStock,
              icon: 'cube-outline',
              color: colors.green,
              bg: '#E9F8F2',
            },
            {
              title: 'Low stock',
              value: low,
              icon: 'warning-outline',
              color: colors.orange,
              bg: '#FFF2E7',
            },
            {
              title: 'Out of stock',
              value: out,
              icon: 'close-circle-outline',
              color: colors.red,
              bg: '#FFF0F2',
            },
          ].map((v) => (
            <Pressable
              key={v.title}
              onPress={() => setFilter(filter === v.title ? 'All' : v.title)}
              accessibilityRole="button"
              style={[
                s.stockMetric,
                {
                  backgroundColor: v.bg,
                  borderColor: filter === v.title ? v.color : 'transparent',
                },
              ]}
            >
              <Icon name={v.icon} color={v.color} size={25} />
              <Txt size={23} weight="bold" color={v.color} style={{ marginTop: 12 }}>
                {String(v.value)}
              </Txt>
              <Txt size={10} color={v.color} style={{ marginTop: 5 }}>
                {v.title}
              </Txt>
            </Pressable>
          ))}
        </View>
        <Field value={query} onChangeText={setQuery} placeholder="Search inventory" />
        <View style={s.between}>
          <Txt size={11} color={colors.muted}>
            {filter.toUpperCase()} · {list.length} PRODUCTS
          </Txt>
          {filter !== 'All' ? (
            <Pressable accessibilityRole="button" onPress={() => setFilter('All')}>
              <Txt size={11} color={colors.orange}>
                Show all
              </Txt>
            </Pressable>
          ) : null}
        </View>
        {list.map((product) => (
          <Card
            key={product.id}
            onPress={() => {
              setEditing(product);
              setStock(String(product.stock));
              setError('');
            }}
            style={{ padding: 13 }}
          >
            <View style={s.row}>
              <Image
                source={product.image}
                style={{ width: 63, height: 62 }}
                resizeMode="contain"
              />
              <View style={{ flex: 1, gap: 6 }}>
                <Txt size={12} weight="semibold" numberOfLines={2}>
                  {product.name}
                </Txt>
                <Txt size={10} color={colors.muted}>
                  {product.category} · {product.brand}
                </Txt>
                <View style={s.between}>
                  <Txt size={12} weight="medium">
                    Stock: {product.stock}
                  </Txt>
                  <Badge
                    text={
                      product.stock === 0
                        ? 'Out of stock'
                        : product.stock < 10
                          ? 'Low stock'
                          : 'In stock'
                    }
                    tone={product.stock === 0 ? 'red' : product.stock < 10 ? 'orange' : 'green'}
                  />
                </View>
              </View>
              <Icon name="create-outline" color={colors.muted} size={17} />
            </View>
          </Card>
        ))}
        {!list.length ? (
          <Empty
            icon="layers-outline"
            title="Inventory looks clear"
            message="No products match this stock filter."
            action="Show all stock"
            onAction={() => setFilter('All')}
          />
        ) : null}
      </View>
      <Modal
        visible={!!editing}
        transparent
        animationType="fade"
        onRequestClose={() => setEditing(null)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.between}>
              <Txt size={21} weight="bold">
                Adjust stock
              </Txt>
              <IconButton
                name="close"
                onPress={() => setEditing(null)}
                label="Close inventory editor"
              />
            </View>
            <Txt size={13} color={colors.muted}>
              {editing?.name}
            </Txt>
            <Field
              label="Units available"
              value={stock}
              onChangeText={setStock}
              keyboardType="number-pad"
              error={error}
            />
            <Button title="Save inventory" loading={pending} icon="checkmark" onPress={save} />
            <Button title="Cancel" variant="secondary" onPress={() => setEditing(null)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

export function AdminReportsScreen() {
  const app = useApp();
  const [days, setDays] = useState(30);
  const [panel, setPanel] = useState('products');
  if (app.mode === 'live') return <LiveSummary reports />;
  const selected = app.orders.filter((o) => isWithin(o, days));
  const active = selected.filter((o) => o.status !== 'Cancelled');
  const total = active.reduce((n, o) => n + o.total, 0);
  const productTotals = app.products
    .map((p) => ({
      product: p,
      quantity: active.reduce(
        (n, o) =>
          n + o.items.filter((i) => i.productId === p.id).reduce((a, i) => a + i.quantity, 0),
        0,
      ),
      amount: active.reduce(
        (n, o) =>
          n +
          o.items
            .filter((i) => i.productId === p.id)
            .reduce((a, i) => a + (i.unitPrice ?? p.price) * i.quantity, 0),
        0,
      ),
    }))
    .filter((p) => p.quantity > 0)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
  const categoryTotals = app.categories
    .map((c) => ({
      name: c.name,
      total: active.reduce(
        (n, o) =>
          n +
          o.items.reduce((a, i) => {
            const p = app.products.find((p) => p.id === i.productId);
            return a + (p?.category === c.name ? (i.unitPrice ?? p.price) * i.quantity : 0);
          }, 0),
        0,
      ),
    }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
  const gross = categoryTotals.reduce((n, c) => n + c.total, 0);
  return (
    <Screen>
      <Header title="Reports" subtitle="Clarity for your next decision" />
      <View style={s.content}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {[7, 30, 0].map((v) => (
            <Chip
              key={v}
              label={v ? `Last ${v} days` : 'All time'}
              active={days === v}
              onPress={() => setDays(v)}
            />
          ))}
        </ScrollView>
        <Card style={{ gap: 18 }}>
          <View style={s.between}>
            <View style={{ gap: 8 }}>
              <Txt size={12} color={colors.muted}>
                ORDER VALUE
              </Txt>
              <Txt size={28} weight="bold">
                {money(total)}
              </Txt>
            </View>
            <IconTile name="analytics-outline" />
          </View>
          <Txt size={11} color={colors.muted}>
            {active.length} active orders · cancelled orders excluded
          </Txt>
          <RevenueChart orders={selected} days={days} />
        </Card>
        <View style={s.metricGrid}>
          <Card style={{ flex: 1, gap: 9 }}>
            <Txt size={11} color={colors.muted}>
              Average order
            </Txt>
            <Txt size={19} weight="bold">
              {money(active.length ? total / active.length : 0)}
            </Txt>
          </Card>
          <Card style={{ flex: 1, gap: 9 }}>
            <Txt size={11} color={colors.muted}>
              Delivered
            </Txt>
            <Txt size={19} weight="bold" color={colors.green}>
              {selected.filter((o) => o.status === 'Delivered').length} orders
            </Txt>
          </Card>
        </View>
        <View style={{ gap: 10 }}>
          {[
            { id: 'products', icon: 'trophy-outline', title: 'Top selling products' },
            { id: 'categories', icon: 'pie-chart-outline', title: 'Sales by category' },
            { id: 'status', icon: 'bar-chart-outline', title: 'Orders by status' },
            { id: 'payment', icon: 'card-outline', title: 'Payment summary' },
          ].map((item) => (
            <View key={item.id}>
              <Card
                onPress={() => setPanel(panel === item.id ? '' : item.id)}
                style={{ padding: 16 }}
              >
                <View style={s.row}>
                  <IconTile name={item.icon} size={32} />
                  <Txt size={13} weight="semibold" style={{ flex: 1 }}>
                    {item.title}
                  </Txt>
                  <Icon
                    name={panel === item.id ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.muted}
                  />
                </View>
              </Card>
              {panel === item.id ? (
                <View style={s.reportPanel}>
                  {item.id === 'products' ? (
                    productTotals.length ? (
                      productTotals.map(({ product, quantity, amount }, i) => (
                        <View key={product.id} style={s.row}>
                          <Txt size={12} weight="bold" color={colors.orange}>
                            0{i + 1}
                          </Txt>
                          <Image
                            source={product.image}
                            style={{ width: 42, height: 42 }}
                            resizeMode="contain"
                          />
                          <View style={{ flex: 1, gap: 5 }}>
                            <Txt size={11} weight="medium" numberOfLines={2}>
                              {product.name}
                            </Txt>
                            <Txt size={10} color={colors.muted}>
                              {quantity} units ordered
                            </Txt>
                          </View>
                          <Txt size={11} weight="semibold">
                            {money(amount)}
                          </Txt>
                        </View>
                      ))
                    ) : (
                      <Txt size={12} color={colors.muted}>
                        No product sales in this period.
                      </Txt>
                    )
                  ) : null}
                  {item.id === 'categories' ? (
                    categoryTotals.length ? (
                      categoryTotals.map((c) => (
                        <View key={c.name} style={{ gap: 9 }}>
                          <View style={s.between}>
                            <Txt size={12}>{c.name}</Txt>
                            <Txt size={12} weight="semibold">
                              {money(c.total)}
                            </Txt>
                          </View>
                          <View style={s.track}>
                            <View
                              style={[
                                s.trackFill,
                                { width: `${gross ? (c.total / gross) * 100 : 0}%` },
                              ]}
                            />
                          </View>
                        </View>
                      ))
                    ) : (
                      <Txt size={12} color={colors.muted}>
                        No category sales in this period.
                      </Txt>
                    )
                  ) : null}
                  {item.id === 'status'
                    ? statuses.map((status) => (
                        <View key={status} style={s.between}>
                          <Badge text={status} tone={orderTone(status)} />
                          <Txt size={14} weight="bold">
                            {selected.filter((o) => o.status === status).length}
                          </Txt>
                        </View>
                      ))
                    : null}
                  {item.id === 'payment' ? (
                    <>
                      <AmountRow
                        label="Cash on delivery orders"
                        amount={active
                          .filter((o) => o.payment === 'cod')
                          .reduce((n, o) => n + o.total, 0)}
                      />
                      <AmountRow
                        label="Online payment orders"
                        amount={active
                          .filter((o) => o.payment === 'sslcommerz')
                          .reduce((n, o) => n + o.total, 0)}
                      />
                      <Txt size={10} color={colors.muted}>
                        Order values are grouped by chosen payment method. Settlement and refund
                        status remain in your payment provider.
                      </Txt>
                    </>
                  ) : null}
                </View>
              ) : null}
            </View>
          ))}
        </View>
        <Txt size={10} color={colors.muted} style={{ textAlign: 'center' }}>
          Figures reflect loaded orders. Product groups use the current catalog.
        </Txt>
      </View>
    </Screen>
  );
}

export function AdminMoreScreen() {
  const app = useApp();
  const entries: { icon: string; title: string; subtitle: string; route: RouteName }[] = [
    {
      icon: 'grid-outline',
      title: 'Dashboard',
      subtitle: 'Your store at a glance',
      route: 'adminDashboard',
    },
    {
      icon: 'bag-handle-outline',
      title: 'Orders',
      subtitle: 'Fulfil and manage customer orders',
      route: 'adminOrders',
    },
    {
      icon: 'card-outline',
      title: 'Payments',
      subtitle: 'View order payment methods',
      route: 'adminPayments',
    },
    {
      icon: 'cube-outline',
      title: 'Products',
      subtitle: 'Curate your catalog',
      route: 'adminProducts',
    },
    {
      icon: 'albums-outline',
      title: 'Categories',
      subtitle: 'Browse product collections',
      route: 'adminCategories',
    },
    {
      icon: 'layers-outline',
      title: 'Inventory',
      subtitle: 'Monitor and adjust stock',
      route: 'adminInventory',
    },
    {
      icon: 'people-outline',
      title: 'Customers',
      subtitle: 'Your customer community',
      route: 'adminCustomers',
    },
    {
      icon: 'pricetags-outline',
      title: 'Discounts',
      subtitle: 'Available promotion rules',
      route: 'adminDiscounts',
    },
    {
      icon: 'bar-chart-outline',
      title: 'Reports',
      subtitle: 'Explore store performance',
      route: 'adminReports',
    },
  ];
  return (
    <Screen>
      <LinearGradient
        colors={['#201A22', '#5F2B11', '#D75309']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.adminProfile}
      >
        <View style={s.between}>
          <Brand light admin size={22} />
          <IconButton
            name="close"
            color="#FFFFFF"
            label="Back to dashboard"
            onPress={() => app.tab('adminDashboard')}
          />
        </View>
        <View style={[s.row, { marginTop: 27 }]}>
          <View style={s.adminAvatar}>
            <Txt size={21} weight="bold" color={colors.orange}>
              {initials(app.user?.name || 'Store Admin')}
            </Txt>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Txt color="#FFFFFF" size={18} weight="bold">
              {app.user?.name || 'Store administrator'}
            </Txt>
            <Txt color="#FFFFFFB3" size={11}>
              {app.user?.email || 'Technest management workspace'}
            </Txt>
          </View>
        </View>
      </LinearGradient>
      <View style={s.content}>
        <DemoNote />
        <Card style={{ paddingVertical: 3 }}>
          {entries.map((e, i) => (
            <React.Fragment key={e.route}>
              <MenuRow
                icon={e.icon}
                title={e.title}
                subtitle={e.subtitle}
                onPress={() => app.navigate(e.route)}
              />
              {i < entries.length - 1 ? <Divider /> : null}
            </React.Fragment>
          ))}
        </Card>
        <Button
          title="Return to storefront"
          icon="storefront-outline"
          variant="dark"
          onPress={() => app.setWorkspace('store')}
        />
        <Txt size={10} color={colors.muted} style={{ textAlign: 'center' }}>
          TECHNEST ADMIN · BUILT FOR BETTER COMMERCE
        </Txt>
      </View>
    </Screen>
  );
}

export function AdminCustomersScreen() {
  const app = useApp();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState('');
  const customers = useMemo(() => {
    const map = new Map<
      string,
      { name: string; email: string; phone: string; orders: Order[]; total: number }
    >();
    for (const order of app.orders) {
      const key = order.email || order.phone;
      const current = map.get(key) || {
        name: order.customer,
        email: order.email,
        phone: order.phone,
        orders: [],
        total: 0,
      };
      current.orders.push(order);
      if (order.status !== 'Cancelled') current.total += order.total;
      map.set(key, current);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [app.orders]);
  const list = customers.filter((c) =>
    `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(query.toLowerCase()),
  );
  if (app.mode === 'live') return <LiveCustomers />;
  return (
    <Screen>
      <Header title="Customers" subtitle={`${customers.length} customers from your orders`} />
      <View style={s.content}>
        <Field value={query} onChangeText={setQuery} placeholder="Search name, email or phone" />
        {list.map((c) => (
          <Card key={c.email || c.phone} style={{ gap: 17 }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setExpanded(expanded === c.email ? '' : c.email)}
              style={s.row}
            >
              <View style={s.customerAvatar}>
                <Txt weight="semibold" color={colors.purple}>
                  {initials(c.name)}
                </Txt>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Txt size={14} weight="semibold">
                  {c.name}
                </Txt>
                <Txt size={10} color={colors.muted}>
                  {c.email}
                </Txt>
              </View>
              <View style={{ gap: 6, alignItems: 'flex-end' }}>
                <Txt size={12} weight="bold">
                  {money(c.total)}
                </Txt>
                <Txt size={10} color={colors.muted}>
                  {c.orders.length} orders
                </Txt>
              </View>
            </Pressable>
            {expanded === c.email ? (
              <>
                <Divider />
                <Txt size={12} color={colors.muted}>
                  {c.phone}
                </Txt>
                {c.orders.map((order) => (
                  <Pressable
                    key={order.id}
                    onPress={() => app.navigate('adminOrderDetail', { id: order.id })}
                    style={s.between}
                  >
                    <Txt size={12} weight="medium">
                      {order.number}
                    </Txt>
                    <Badge text={order.status} tone={orderTone(order.status)} />
                    <Icon name="chevron-forward" size={15} color={colors.muted} />
                  </Pressable>
                ))}
              </>
            ) : null}
          </Card>
        ))}
        {!list.length ? (
          <Empty
            icon="people-outline"
            title="No customers found"
            message="Customer details appear when orders are placed."
          />
        ) : null}
        <Txt size={10} color={colors.muted}>
          This view groups customers from loaded orders by their contact details.
        </Txt>
      </View>
    </Screen>
  );
}

export function AdminDiscountsScreen() {
  const { mode, navigate, setWorkspace } = useApp();
  const [expanded, setExpanded] = useState(false);
  return (
    <Screen>
      <Header title="Discounts" subtitle="A little extra, for your customers" />
      <View style={s.content}>
        {mode === 'demo' ? (
          <>
            <LinearGradient colors={['#211925', '#4F2B1D']} style={s.promoCard}>
              <View style={s.between}>
                <Badge text="DEMO PROMOTION" />
                <Icon name="ticket-outline" color="#FF914A" size={30} />
              </View>
              <Txt size={32} weight="bold" color="#FFFFFF" style={{ marginTop: 27 }}>
                10% off.
              </Txt>
              <Txt size={13} color="#DBCFCC" style={{ marginTop: 9 }}>
                A warm welcome to Technest.
              </Txt>
              <View style={s.promoCode}>
                <Txt size={22} weight="bold" color="#FFFFFF">
                  TECHNEST10
                </Txt>
                <Icon name="pricetag-outline" color="#FF914A" size={22} />
              </View>
              <Txt size={11} color="#DBCFCC">
                Save up to ৳2,000 on the product subtotal.
              </Txt>
            </LinearGradient>
            <Card style={{ gap: 16 }}>
              <View style={s.between}>
                <Txt weight="semibold">Promotion details</Txt>
                <Badge text="Available" tone="green" />
              </View>
              <Divider />
              <View style={s.between}>
                <Txt size={12} color={colors.muted}>
                  Discount type
                </Txt>
                <Txt size={12}>Percentage · 10%</Txt>
              </View>
              <View style={s.between}>
                <Txt size={12} color={colors.muted}>
                  Maximum discount
                </Txt>
                <Txt size={12}>{money(2000)}</Txt>
              </View>
              <View style={s.between}>
                <Txt size={12} color={colors.muted}>
                  Applies to
                </Txt>
                <Txt size={12}>Selected cart subtotal</Txt>
              </View>
              <Txt size={11} color={colors.muted}>
                This built-in demo promotion is applied at checkout. It does not create a discount
                on your connected server.
              </Txt>
            </Card>
            <Button
              title="Preview customer checkout"
              icon="storefront-outline"
              variant="outline"
              onPress={() => {
                setWorkspace('store');
                navigate('cart');
              }}
            />
          </>
        ) : (
          <Card style={{ gap: 17 }}>
            <IconTile name="pricetags-outline" />
            <Txt size={21} weight="bold">
              Your server sets the offer.
            </Txt>
            <Txt size={13} color={colors.muted}>
              Connected checkout validates discount codes against the Django discounts API. Manage
              promotion amounts, dates, and usage limits in your existing Django admin.
            </Txt>
            <Txt size={11} color={colors.muted}>
              Mobile promotion editing is not available in this frontend.
            </Txt>
          </Card>
        )}
        <Card onPress={() => setExpanded(!expanded)} style={{ gap: 14 }}>
          <View style={s.between}>
            <Txt size={13} weight="semibold">
              How discounts are calculated
            </Txt>
            <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={17} color={colors.muted} />
          </View>
          {expanded ? (
            <Txt size={12} color={colors.muted}>
              A valid discount is deducted from the product subtotal before delivery. Only selected
              cart items are included. The final connected order total always comes from the
              backend.
            </Txt>
          ) : null}
        </Card>
      </View>
    </Screen>
  );
}

export function AdminPaymentsScreen() {
  const app = useApp();
  const [method, setMethod] = useState('All');
  if (app.mode === 'live') return <LivePayments />;
  const list = app.orders.filter(
    (o) =>
      method === 'All' ||
      (method === 'Cash on delivery' ? o.payment === 'cod' : o.payment === 'sslcommerz'),
  );
  const cod = app.orders
    .filter((o) => o.payment === 'cod' && o.status !== 'Cancelled')
    .reduce((n, o) => n + o.total, 0);
  const online = app.orders
    .filter((o) => o.payment === 'sslcommerz' && o.status !== 'Cancelled')
    .reduce((n, o) => n + o.total, 0);
  return (
    <Screen>
      <Header title="Payments" subtitle="Order payment overview" />
      <View style={s.content}>
        <View style={s.metricGrid}>
          <Metric icon="cash-outline" label="Cash on delivery" value={money(cod)} tone="green" />
          <Metric icon="card-outline" label="Online orders" value={money(online)} />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {['All', 'Cash on delivery', 'Online'].map((v) => (
            <Chip key={v} label={v} active={v === method} onPress={() => setMethod(v)} />
          ))}
        </ScrollView>
        <View style={s.infoBox}>
          <Icon name="information-circle-outline" size={21} color={colors.muted} />
          <Txt size={11} color={colors.muted} style={{ flex: 1 }}>
            This shows order values by payment method. Payment settlement, gateway status, and
            refunds are managed by your payment provider and backend.
          </Txt>
        </View>
        {list.map((order) => (
          <Card
            key={order.id}
            onPress={() => app.navigate('adminOrderDetail', { id: order.id })}
            style={{ gap: 14 }}
          >
            <View style={s.between}>
              <View style={s.row}>
                <IconTile
                  name={order.payment === 'cod' ? 'cash-outline' : 'card-outline'}
                  size={36}
                />
                <View style={{ gap: 5 }}>
                  <Txt size={13} weight="semibold">
                    {order.number}
                  </Txt>
                  <Txt size={10} color={colors.muted}>
                    {order.customer}
                  </Txt>
                </View>
              </View>
              <Txt size={15} weight="bold">
                {money(order.total)}
              </Txt>
            </View>
            <Divider />
            <View style={s.between}>
              <Txt size={11} color={colors.muted}>
                {order.payment === 'cod' ? 'Cash on delivery' : 'Online payment'}
              </Txt>
              <Badge text={order.status} tone={orderTone(order.status)} />
            </View>
          </Card>
        ))}
        {!list.length ? (
          <Empty
            icon="card-outline"
            title="No payments to show"
            message="Orders with this payment method will appear here."
          />
        ) : null}
      </View>
    </Screen>
  );
}

function ApiChart({ series }: { series: { date: string; value: number | string }[] }) {
  const grouped = Array.from({ length: 7 }, (_, i) => {
    const chunk = series.slice(
      Math.floor((i * series.length) / 7),
      Math.floor(((i + 1) * series.length) / 7),
    );
    return {
      label: chunk.length
        ? new Date(chunk[0].date).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            timeZone: 'Asia/Dhaka',
          })
        : '',
      total: chunk.reduce((n, item) => n + Number(item.value || 0), 0),
    };
  });
  const max = Math.max(1, ...grouped.map((d) => d.total));
  return (
    <View style={{ gap: 11 }}>
      <View style={s.chart}>
        <View style={s.chartGrid} />
        <View style={[s.chartGrid, { bottom: 48 }]} />
        <View style={[s.chartGrid, { bottom: 96 }]} />
        {grouped.map((d, i) => (
          <View
            key={i}
            style={{ flex: 1, height: 140, alignItems: 'center', justifyContent: 'flex-end' }}
          >
            <LinearGradient
              colors={['#FF8533', '#FF5D05']}
              style={[
                s.chartBar,
                { height: Math.max(5, (d.total / max) * 126), opacity: d.total ? 1 : 0.15 },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={s.row}>
        {grouped.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Txt size={8} color={colors.muted}>
              {d.label}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}
function LiveSummary({ reports = false }: { reports?: boolean }) {
  const app = useApp();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<any>(app.adminStats);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setPending(true);
    setError('');
    setData(null);
    api<any>(`${endpoints.admin}overview/?days=${days}`)
      .then((value) => {
        if (active) setData(value);
      })
      .catch((e) => {
        if (active) setError(errorText(e));
      })
      .finally(() => {
        if (active) setPending(false);
      });
    return () => {
      active = false;
    };
  }, [days]);
  const rawRecent = data?.recent || [];
  const recent = rawRecent
    .map((raw: any) => {
      const order = app.orders.find((o) => o.id === raw.id);
      return order ? { ...order, date: raw.created_at || order.date } : null;
    })
    .filter(Boolean) as Order[];
  return (
    <Screen>
      {reports ? (
        <Header title="Reports" subtitle="Your store performance, from the server" />
      ) : (
        <View style={s.dashboardHeader}>
          <Brand admin size={22} />
          <IconButton
            name="menu-outline"
            label="Admin menu"
            onPress={() => app.navigate('adminMore')}
          />
        </View>
      )}
      <View style={s.content}>
        <DemoNote />
        {!reports ? (
          <View style={{ gap: 6 }}>
            <Txt size={27} weight="bold">
              Dashboard
            </Txt>
            <Txt size={12} color={colors.muted}>
              A clear view of your connected store.
            </Txt>
          </View>
        ) : null}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {[7, 30, 90].map((v) => (
            <Chip key={v} label={`Last ${v} days`} active={v === days} onPress={() => setDays(v)} />
          ))}
        </ScrollView>
        {pending ? (
          <Txt size={12} color={colors.muted}>
            Loading store performance…
          </Txt>
        ) : null}
        {error ? (
          <Card style={{ gap: 10 }}>
            <Txt weight="semibold">Performance unavailable</Txt>
            <Txt size={12} color={colors.muted}>
              {error}
            </Txt>
          </Card>
        ) : null}
        {data ? (
          <>
            <View style={s.metricGrid}>
              <Metric
                icon="wallet-outline"
                label="Paid revenue"
                value={money(Number(data.revenue || 0))}
                detail="Cancelled orders excluded"
              />
              <Metric
                icon="bag-handle-outline"
                label="Total orders"
                value={String(data.orders || 0)}
                detail={`${data.pending || 0} awaiting confirmation`}
              />
              <Metric
                icon="receipt-outline"
                label="Average paid order"
                value={money(Number(data.average || 0))}
                tone="green"
              />
              <Metric
                icon="cube-outline"
                label="Loaded products"
                value={String(app.products.length)}
                detail="Current visible catalog"
                tone="blue"
              />
            </View>
            <Card style={{ gap: 20 }}>
              <View style={s.between}>
                <View style={{ gap: 5 }}>
                  <Txt weight="bold" size={16}>
                    Sales overview
                  </Txt>
                  <Txt size={11} color={colors.muted}>
                    Paid revenue · Bangladesh taka
                  </Txt>
                </View>
                <IconTile name="analytics-outline" size={34} />
              </View>
              <Txt size={27} weight="bold">
                {money(Number(data.revenue || 0))}
              </Txt>
              <ApiChart series={data.series || []} />
            </Card>
            {reports ? (
              <>
                <Card style={{ gap: 18 }}>
                  <Txt size={16} weight="bold">
                    Top selling products
                  </Txt>
                  {data.sellers?.length ? (
                    data.sellers.map((seller: any, i: number) => (
                      <View key={seller.product_name} style={s.row}>
                        <Txt color={colors.orange} weight="bold" size={12}>
                          0{i + 1}
                        </Txt>
                        <Txt size={12} weight="medium" style={{ flex: 1 }}>
                          {seller.product_name}
                        </Txt>
                        <Badge text={`${seller.units} units`} tone="neutral" />
                      </View>
                    ))
                  ) : (
                    <Txt size={12} color={colors.muted}>
                      No paid product sales in this period.
                    </Txt>
                  )}
                </Card>
                <Card style={{ gap: 17 }}>
                  <Txt size={16} weight="bold">
                    Orders by status
                  </Txt>
                  {statuses.map((status) => {
                    const key = status === 'Processing' ? 'pending' : status.toLowerCase();
                    return (
                      <View key={status} style={s.between}>
                        <Badge text={status} tone={orderTone(status)} />
                        <Txt weight="bold">{Number(data.states?.[key] || 0)}</Txt>
                      </View>
                    );
                  })}
                </Card>
                <Card onPress={() => app.navigate('adminPayments')}>
                  <View style={s.row}>
                    <IconTile name="card-outline" />
                    <View style={{ flex: 1, gap: 5 }}>
                      <Txt weight="semibold">Payment records</Txt>
                      <Txt color={colors.muted} size={11}>
                        View gateway payment statuses
                      </Txt>
                    </View>
                    <Icon name="chevron-forward" size={17} color={colors.muted} />
                  </View>
                </Card>
              </>
            ) : (
              <>
                <Section title="Quick actions">
                  <View style={s.quickGrid}>
                    {(
                      [
                        {
                          icon: 'add-circle-outline',
                          title: 'Add product',
                          route: 'adminProductEdit',
                        },
                        {
                          icon: 'file-tray-stacked-outline',
                          title: 'Inventory',
                          route: 'adminInventory',
                        },
                        { icon: 'bar-chart-outline', title: 'Reports', route: 'adminReports' },
                      ] as const
                    ).map((item) => (
                      <Pressable
                        key={item.title}
                        onPress={() => app.navigate(item.route)}
                        accessibilityRole="button"
                        style={s.quickAction}
                      >
                        <IconTile name={item.icon} />
                        <Txt size={11} weight="semibold" style={{ marginTop: 10 }}>
                          {item.title}
                        </Txt>
                      </Pressable>
                    ))}
                  </View>
                </Section>
                <Section
                  title="Recent orders"
                  action="View all"
                  onAction={() => app.navigate('adminOrders')}
                >
                  {recent.map((order) => (
                    <OrderRow key={order.id} order={order} />
                  ))}
                  {!recent.length ? (
                    <Txt color={colors.muted} size={12}>
                      No orders in the selected period.
                    </Txt>
                  ) : null}
                </Section>
              </>
            )}
          </>
        ) : null}
        <Txt size={10} color={colors.muted}>
          Revenue, trends, and status counts come directly from the Django reporting API.
        </Txt>
      </View>
    </Screen>
  );
}
function LiveCustomers() {
  const app = useApp();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const list = app.adminCustomers.filter((c: any) =>
    `${c.first_name || ''} ${c.email || ''}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Screen>
      <Header title="Customers" subtitle={`${app.adminCustomers.length} customer accounts`} />
      <View style={s.content}>
        <Field value={query} onChangeText={setQuery} placeholder="Search name or email" />
        {list.map((c: any) => (
          <Card
            key={c.id}
            style={{ gap: 16 }}
            onPress={() => setExpanded(expanded === c.id ? null : c.id)}
          >
            <View style={s.row}>
              <View style={s.customerAvatar}>
                <Txt color={colors.purple} weight="semibold">
                  {initials(c.first_name || c.email || 'Customer')}
                </Txt>
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                <Txt size={14} weight="semibold">
                  {c.first_name || 'Customer'}
                </Txt>
                <Txt color={colors.muted} size={11}>
                  {c.email}
                </Txt>
              </View>
              <Badge
                text={c.is_active ? 'Active' : 'Inactive'}
                tone={c.is_active ? 'green' : 'neutral'}
              />
            </View>
            {expanded === c.id ? (
              <>
                <Divider />
                <View style={s.between}>
                  <Txt size={12} color={colors.muted}>
                    Joined
                  </Txt>
                  <Txt size={12}>{dateText(c.date_joined)}</Txt>
                </View>
                <View style={s.between}>
                  <Txt size={12} color={colors.muted}>
                    Customer ID
                  </Txt>
                  <Txt size={12}>#{c.id}</Txt>
                </View>
              </>
            ) : null}
          </Card>
        ))}
        {!list.length ? (
          <Empty
            icon="people-outline"
            title="No customer records"
            message="No matching customers are available to your staff account."
          />
        ) : null}
        <Txt color={colors.muted} size={10}>
          Customer records are read from the backend. Account permissions are managed in your Django
          admin.
        </Txt>
      </View>
    </Screen>
  );
}
function LivePayments() {
  const app = useApp();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const records = app.adminPayments;
  const list = records.filter(
    (r: any) =>
      (status === 'All' || r.status === status) &&
      `${r.transaction_id || ''} ${r.order || ''}`.toLowerCase().includes(query.toLowerCase()),
  );
  const paid = records
    .filter((r: any) => r.status === 'paid')
    .reduce((n: number, r: any) => n + Number(r.amount || 0), 0);
  const pending = records
    .filter((r: any) => ['pending', 'initiating', 'review'].includes(r.status))
    .reduce((n: number, r: any) => n + Number(r.amount || 0), 0);
  return (
    <Screen>
      <Header title="Payments" subtitle="Gateway transactions from your backend" />
      <View style={s.content}>
        <View style={s.metricGrid}>
          <Metric
            icon="checkmark-circle-outline"
            label="Paid payments"
            value={money(paid)}
            tone="green"
          />
          <Metric icon="time-outline" label="Pending / review" value={money(pending)} />
        </View>
        <Field value={query} onChangeText={setQuery} placeholder="Search transaction or order" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {['All', 'paid', 'pending', 'review', 'failed', 'cancelled', 'refunded'].map((value) => (
            <Chip
              key={value}
              label={value === 'All' ? 'All' : value[0].toUpperCase() + value.slice(1)}
              active={value === status}
              onPress={() => setStatus(value)}
            />
          ))}
        </ScrollView>
        {list.map((payment: any) => (
          <Card key={payment.id} style={{ gap: 14 }}>
            <View style={s.row}>
              <IconTile name="card-outline" size={36} />
              <View style={{ flex: 1, gap: 5 }}>
                <Txt size={12} weight="semibold">
                  {payment.transaction_id || `Payment #${payment.id}`}
                </Txt>
                <Txt size={10} color={colors.muted}>
                  {String(payment.order || 'Order reference unavailable')}
                </Txt>
              </View>
              <Txt size={14} weight="bold">
                {money(Number(payment.amount || 0))}
              </Txt>
            </View>
            <Divider />
            <View style={s.between}>
              <Txt size={10} color={colors.muted}>
                Transaction #{payment.id}
              </Txt>
              <Badge
                text={String(payment.status || 'unknown').replace('_', ' ')}
                tone={
                  payment.status === 'paid'
                    ? 'green'
                    : ['failed', 'cancelled'].includes(payment.status)
                      ? 'red'
                      : 'orange'
                }
              />
            </View>
          </Card>
        ))}
        {!list.length ? (
          <Empty
            icon="card-outline"
            title="No matching payments"
            message="Payment records available to your staff account will appear here."
          />
        ) : null}
        <View style={s.infoBox}>
          <Icon name="information-circle-outline" color={colors.muted} size={19} />
          <Txt color={colors.muted} size={11} style={{ flex: 1 }}>
            Refund and gateway operations remain in the existing backend. These figures summarize
            the loaded payment records.
          </Txt>
        </View>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 32, gap: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  dashboardHeader: {
    paddingHorizontal: 22,
    paddingTop: 17,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  avatarSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF0E5',
    borderWidth: 1,
    borderColor: '#FFDBC5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  demo: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.orange },
  iconTile: { alignItems: 'center', justifyContent: 'center' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metric: { width: '48%', flexGrow: 1, padding: 17, minWidth: 140 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chart: {
    height: 144,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 7,
  },
  chartBar: { width: '66%', borderTopLeftRadius: 5, borderTopRightRadius: 5, minWidth: 10 },
  chartGrid: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: colors.line,
  },
  quickGrid: { flexDirection: 'row', gap: 10 },
  quickAction: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 17,
    paddingVertical: 17,
    alignItems: 'center',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF8F2',
    borderColor: '#FFE4CF',
  },
  orderImage: {
    width: 53,
    height: 55,
    borderRadius: 12,
    backgroundColor: '#F7F7FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productThumb: {
    width: 67,
    height: 69,
    borderRadius: 12,
    backgroundColor: '#F8F8FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#F7F7FC',
    padding: 10,
    borderRadius: 10,
  },
  stepRow: { flexDirection: 'row', marginBottom: 5, paddingVertical: 5 },
  stepCircle: {
    width: 29,
    height: 29,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageUpload: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#C8C3DB',
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    minHeight: 248,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF0F2',
    padding: 13,
    borderRadius: 12,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#F0F0F8',
    padding: 15,
    borderRadius: 14,
  },
  stockGrid: { flexDirection: 'row', gap: 9 },
  stockMetric: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 11,
    borderRadius: 17,
    borderWidth: 1.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#0E112477',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    padding: 24,
    gap: 19,
  },
  reportPanel: {
    padding: 18,
    paddingTop: 22,
    gap: 20,
    backgroundColor: '#FFFFFF',
    marginTop: -7,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.line,
  },
  track: { height: 6, backgroundColor: '#F1EFF8', borderRadius: 3, overflow: 'hidden' },
  trackFill: { height: 6, backgroundColor: colors.orange, borderRadius: 3 },
  adminProfile: {
    padding: 22,
    paddingTop: 19,
    paddingBottom: 30,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  adminAvatar: {
    width: 58,
    height: 58,
    borderRadius: 21,
    backgroundColor: '#FFF4EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 15 },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1EDFC',
  },
  promoCard: { borderRadius: 24, padding: 25, overflow: 'hidden' },
  promoCode: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#B47745',
    padding: 17,
    borderRadius: 13,
    marginTop: 25,
    marginBottom: 17,
  },
});
