import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
  Modal,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../state/AppContext';
import {
  Badge,
  Brand,
  Button,
  Card,
  Chip,
  Divider,
  Empty,
  Field,
  Header,
  Icon,
  IconButton,
  Price,
  ProductCard,
  Progress,
  Screen,
  Section,
  Txt,
  colors,
} from '../components/ui';
import type { Address, Order, OrderStatus, RouteName } from '../lib/types';
import { money, addressText } from '../lib/utils';
import { calculateTotals } from '../lib/pricing';
import { api } from '../lib/api';

const errorText = (e: unknown) =>
  e instanceof Error ? e.message : 'Something went wrong. Please try again.';
const orderTone = (s: OrderStatus) =>
  s === 'Delivered' || s === 'Confirmed'
    ? 'green'
    : s === 'Shipped'
      ? 'blue'
      : s === 'Cancelled'
        ? 'red'
        : 'orange';
const dateLabel = (s: string) =>
  new Date(s).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Dhaka',
  });

const initialAddress = (): Address => ({
  id: 0,
  label: 'Home',
  name: '',
  phone: '',
  line: '',
  city: 'Dhaka',
  postal: '',
  isDefault: true,
});

function Summary({
  subtotal,
  delivery,
  discount,
  total,
}: {
  subtotal: number;
  delivery: number;
  discount: number;
  total: number;
}) {
  return (
    <View style={{ gap: 12 }}>
      <View style={s.between}>
        <Txt color={colors.muted}>Subtotal</Txt>
        <Txt weight="semibold">{money(subtotal)}</Txt>
      </View>
      <View style={s.between}>
        <Txt color={colors.muted}>Delivery</Txt>
        <Txt weight="semibold">{money(delivery)}</Txt>
      </View>
      {discount > 0 && (
        <View style={s.between}>
          <Txt color={colors.green}>Savings</Txt>
          <Txt color={colors.green} weight="semibold">
            −{money(discount)}
          </Txt>
        </View>
      )}
      <Divider />
      <View style={s.between}>
        <Txt size={18} weight="bold">
          Total amount
        </Txt>
        <Price value={total} size={22} />
      </View>
    </View>
  );
}
function ErrorNote({ message }: { message: string }) {
  return message ? (
    <View accessibilityRole="alert" style={s.error}>
      <Icon name="alert-circle-outline" color={colors.red} size={19} />
      <Txt color={colors.red} size={12} style={{ flex: 1 }}>
        {message}
      </Txt>
    </View>
  ) : null;
}
function Confirm({
  visible,
  title,
  body,
  onClose,
  onConfirm,
  busy,
}: {
  visible: boolean;
  title: string;
  body: string;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <View style={s.confirm}>
          <View style={s.warningIcon}>
            <Icon name="alert-circle-outline" size={30} color={colors.orange} />
          </View>
          <Txt size={21} weight="bold">
            {title}
          </Txt>
          <Txt color={colors.muted} style={{ textAlign: 'center', lineHeight: 22 }}>
            {body}
          </Txt>
          <Button title="Keep it" variant="secondary" onPress={onClose} />
          <Button title="Yes, continue" variant="danger" onPress={onConfirm} loading={busy} />
        </View>
      </View>
    </Modal>
  );
}

export function CartScreen() {
  const app = useApp();
  const [clear, setClear] = useState(false);
  const [busy, setBusy] = useState(false);
  const totals = calculateTotals(app.cart, app.products, '', app.mode === 'demo' ? 60 : 0);
  const selected = app.cart.filter((i) => i.selected).length;
  const act = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      app.notify(errorText(e));
    }
  };
  return (
    <View style={{ flex: 1 }}>
      <Header
        title={`My bag (${app.cart.length})`}
        back={false}
        right={
          app.cart.length ? (
            <Pressable accessibilityRole="button" onPress={() => setClear(true)}>
              <Txt size={12} color={colors.orange} weight="semibold">
                Clear all
              </Txt>
            </Pressable>
          ) : undefined
        }
      />
      <Screen>
        <View style={s.content}>
          {app.cart.length ? (
            <>
              <View style={s.between}>
                <View>
                  <Txt size={23} weight="bold">
                    Good choices.
                  </Txt>
                  <Txt color={colors.muted} size={12} style={{ marginTop: 5 }}>
                    Your next upgrade is almost yours.
                  </Txt>
                </View>
                <View style={s.iconTile}>
                  <Icon name="bag-handle-outline" color={colors.orange} />
                </View>
              </View>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected === app.cart.length }}
                onPress={() =>
                  app.cart.forEach((i) => {
                    if (i.selected !== (selected !== app.cart.length)) app.toggleCart(i.productId);
                  })
                }
                style={[s.row, { gap: 9 }]}
              >
                <Icon
                  name={selected === app.cart.length ? 'checkbox' : 'square-outline'}
                  color={selected === app.cart.length ? colors.orange : colors.muted}
                  size={22}
                />
                <Txt size={12} weight="medium">
                  Select all items
                </Txt>
                <Txt color={colors.muted} size={12}>
                  ({selected} selected)
                </Txt>
              </Pressable>
              {app.cart.map((item) => {
                const p = app.products.find((p) => p.id === item.productId);
                if (!p) return null;
                return (
                  <Card key={p.id} style={{ padding: 14 }}>
                    <View style={[s.row, { gap: 10 }]}>
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityLabel={`Select ${p.name}`}
                        accessibilityState={{ checked: item.selected }}
                        onPress={() => app.toggleCart(p.id)}
                      >
                        <Icon
                          name={item.selected ? 'checkbox' : 'square-outline'}
                          size={21}
                          color={item.selected ? colors.orange : colors.muted}
                        />
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`View ${p.name}`}
                        onPress={() => app.navigate('product', { id: p.id })}
                      >
                        <Image source={p.image} style={s.bagImage} resizeMode="contain" />
                      </Pressable>
                      <View style={{ flex: 1, gap: 5 }}>
                        <Txt weight="semibold" size={12} numberOfLines={2}>
                          {p.name}
                        </Txt>
                        <Txt color={colors.muted} size={10}>
                          {Object.values(item.options ?? {}).join(' · ') || p.brand}
                        </Txt>
                        <Price value={item.unitPrice ?? p.price} size={15} />
                      </View>
                      <IconButton
                        name="trash-outline"
                        label={`Remove ${p.name}`}
                        color={colors.muted}
                        size={17}
                        onPress={() => act(() => app.removeCart(p.id))}
                      />
                    </View>
                    <View style={[s.between, { marginTop: 12, paddingLeft: 31 }]}>
                      <Txt size={10} color={p.stock > 0 ? colors.green : colors.red}>
                        {p.stock > 0 ? 'In stock · ready to ship' : 'Currently out of stock'}
                      </Txt>
                      <View style={s.stepper}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Decrease quantity of ${p.name}`}
                          disabled={item.quantity <= 1}
                          onPress={() => act(() => app.updateCart(p.id, item.quantity - 1))}
                          style={s.step}
                        >
                          <Icon
                            name="remove"
                            size={16}
                            color={item.quantity <= 1 ? '#C9C9D3' : colors.ink}
                          />
                        </Pressable>
                        <Txt size={12} weight="semibold">
                          {item.quantity}
                        </Txt>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Increase quantity of ${p.name}`}
                          disabled={item.quantity >= p.stock}
                          onPress={() => act(() => app.updateCart(p.id, item.quantity + 1))}
                          style={s.step}
                        >
                          <Icon
                            name="add"
                            size={16}
                            color={item.quantity >= p.stock ? '#C9C9D3' : colors.ink}
                          />
                        </Pressable>
                      </View>
                    </View>
                  </Card>
                );
              })}
              <Card style={{ padding: 20 }}>
                <Summary {...totals} />
              </Card>
              <Button
                title={`Checkout (${selected} ${selected === 1 ? 'item' : 'items'})`}
                icon="arrow-forward"
                disabled={!selected}
                onPress={() => app.navigate('checkout')}
              />
              <View style={[s.row, { justifyContent: 'center', gap: 7 }]}>
                <Icon name="shield-checkmark-outline" size={14} color={colors.muted} />
                <Txt size={10} color={colors.muted}>
                  Secure checkout · Genuine products
                </Txt>
              </View>
            </>
          ) : (
            <Empty
              icon="bag-handle-outline"
              title="Room for an upgrade"
              message="Your bag is waiting for something brilliant. Find your next favorite piece of tech."
              action="Explore products"
              onAction={() => app.tab('home')}
            />
          )}
        </View>
      </Screen>
      <Confirm
        visible={clear}
        title="Clear your bag?"
        body="All items in your bag will be removed."
        onClose={() => setClear(false)}
        busy={busy}
        onConfirm={async () => {
          setBusy(true);
          await act(app.clearCart);
          setBusy(false);
          setClear(false);
        }}
      />
    </View>
  );
}

export function CheckoutScreen() {
  const app = useApp();
  const [addressId, setAddressId] = useState(
    app.addresses.find((a) => a.isDefault)?.id ?? app.addresses[0]?.id ?? 0,
  );
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const totals = calculateTotals(
    app.cart,
    app.products,
    app.mode === 'demo' ? promo : '',
    app.mode === 'demo' ? 60 : 0,
  );
  const applyPromo = () => {
    if (app.mode === 'live') {
      setError('Discount codes are validated by the server when you place your order.');
      setPromo(promoInput.trim());
      return;
    }
    if (promoInput.trim().toUpperCase() === 'TECHNEST10') {
      setPromo('TECHNEST10');
      setError('');
      app.notify('10% discount applied, up to ৳2,000.');
    } else {
      setPromo('');
      setError('This code is not valid. Try TECHNEST10 in demo mode.');
    }
  };
  const place = async () => {
    setError('');
    if (!addressId) return setError('Add a delivery address to continue.');
    if (app.mode === 'live' && !app.user) {
      app.navigate('login');
      return;
    }
    setBusy(true);
    try {
      const o = await app.placeOrder(addressId, 'cod', promo);
      app.navigate('orderDetail', { id: o.id, placed: true });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ flex: 1 }}>
      <Header title="Checkout" />
      <Screen>
        <View style={s.content}>
          <View style={s.checkoutSteps}>
            <Badge text="01  Delivery" />
            <Txt color={colors.muted} size={11}>
              02 Payment
            </Txt>
            <Txt color={colors.muted} size={11}>
              03 Confirm
            </Txt>
          </View>
          <Section
            title="Where should we deliver?"
            action={app.mode === 'live' && app.addresses.length ? 'Edit address' : 'Add new'}
            onAction={() => app.navigate('addresses', { checkout: true })}
          />
          {app.addresses.length ? (
            app.addresses.map((a) => (
              <Card
                key={a.id}
                onPress={() => setAddressId(a.id)}
                style={[s.addressCard, addressId === a.id && { borderColor: colors.orange }]}
              >
                <View style={[s.row, { gap: 12 }]}>
                  <View style={s.iconTile}>
                    <Icon
                      name={a.label.toLowerCase() === 'home' ? 'home-outline' : 'location-outline'}
                      color={colors.orange}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 5 }}>
                    <View style={[s.row, { gap: 7 }]}>
                      <Txt weight="bold">{a.label}</Txt>
                      {a.isDefault && <Badge text="Default" tone="neutral" />}
                    </View>
                    <Txt size={12} weight="medium">
                      {a.name}
                    </Txt>
                    <Txt color={colors.muted} size={12} style={{ lineHeight: 19 }}>
                      {addressText(a)}
                    </Txt>
                    <Txt size={12}>{a.phone}</Txt>
                  </View>
                  <Icon
                    name={addressId === a.id ? 'radio-button-on' : 'radio-button-off'}
                    color={addressId === a.id ? colors.orange : colors.muted}
                  />
                </View>
              </Card>
            ))
          ) : (
            <Empty
              icon="location-outline"
              title="Add your first address"
              message="Tell us where your new tech should arrive."
              action="Add address"
              onAction={() => app.navigate('addresses', { checkout: true })}
            />
          )}
          <Section title="Payment method" />
          <Card style={{ padding: 18, gap: 16 }}>
            <View style={[s.row, { gap: 12 }]}>
              <Icon name="radio-button-on" color={colors.orange} />
              <View style={[s.iconTile, { backgroundColor: '#E8F6EF' }]}>
                <Icon name="cash-outline" color={colors.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt weight="semibold">Cash on delivery</Txt>
                <Txt size={11} color={colors.muted} style={{ marginTop: 5 }}>
                  Pay when your order arrives
                </Txt>
              </View>
            </View>
            <Divider />
            <View style={[s.row, { gap: 12, opacity: 0.6 }]}>
              <Icon name="radio-button-off" color={colors.muted} />
              <Icon name="card-outline" color={colors.muted} />
              <View style={{ flex: 1 }}>
                <Txt weight="medium" size={12}>
                  Online payment
                </Txt>
                <Txt size={10} color={colors.muted} style={{ marginTop: 4 }}>
                  Currently unavailable
                </Txt>
              </View>
              <Badge text="Unavailable" tone="neutral" />
            </View>
          </Card>
          <Section title="A little extra savings" />
          <View style={[s.row, { alignItems: 'center', gap: 10 }]}>
            <View style={{ flex: 1 }}>
              <Field
                value={promoInput}
                onChangeText={setPromoInput}
                placeholder="Enter discount code"
                autoCapitalize="characters"
              />
            </View>
            <Button
              title={promo ? 'Applied' : 'Apply'}
              small
              onPress={applyPromo}
              variant="secondary"
            />
          </View>
          {app.mode === 'demo' && (
            <Txt size={11} color={colors.muted}>
              A welcome gift: use TECHNEST10 for 10% off.
            </Txt>
          )}
          <ErrorNote message={error} />
          <Card style={{ padding: 20 }}>
            <Summary {...totals} />
          </Card>
          <Button
            title={app.mode === 'demo' ? 'Place demo order' : 'Place order'}
            icon="lock-closed-outline"
            onPress={place}
            loading={busy}
            disabled={!totals.quantity}
          />
          <Txt color={colors.muted} size={10} style={{ textAlign: 'center', lineHeight: 17 }}>
            {app.mode === 'demo'
              ? 'Demo mode — no payment is charged and no shipment is created.'
              : 'By placing an order you confirm your delivery details and payment method.'}
          </Txt>
        </View>
      </Screen>
    </View>
  );
}

function OrderCard({ order }: { order: Order }) {
  const app = useApp();
  return (
    <Card
      onPress={() => app.navigate('orderDetail', { id: order.id })}
      style={{ padding: 17, gap: 14 }}
    >
      <View style={s.between}>
        <View style={{ gap: 5 }}>
          <Txt weight="bold">{order.number}</Txt>
          <Txt color={colors.muted} size={10}>
            {dateLabel(order.date)} · {order.items.reduce((n, i) => n + i.quantity, 0)} items
          </Txt>
        </View>
        <Badge text={order.status} tone={orderTone(order.status)} />
      </View>
      <Divider />
      <View style={s.between}>
        <View style={[s.row, { gap: 7 }]}>
          {order.items.slice(0, 3).map((item, index) => {
            const p = app.products.find((p) => p.id === item.productId);
            return p ? (
              <Image
                key={`${p.id}-${index}`}
                source={p.image}
                style={s.orderThumb}
                resizeMode="contain"
              />
            ) : null;
          })}
        </View>
        <View style={[s.row, { gap: 8 }]}>
          <Txt weight="bold" size={14}>
            {money(order.total)}
          </Txt>
          <Icon name="chevron-forward" size={17} color={colors.muted} />
        </View>
      </View>
    </Card>
  );
}
export function OrdersScreen() {
  const app = useApp();
  const [filter, setFilter] = useState('All');
  const orders = app.orders.filter((o) => filter === 'All' || o.status === filter);
  return (
    <View style={{ flex: 1 }}>
      <Header title="My orders" back={false} />
      <Screen>
        <View style={s.content}>
          <View>
            <Txt size={24} weight="bold">
              Track every upgrade.
            </Txt>
            <Txt color={colors.muted} size={12} style={{ marginTop: 6 }}>
              From our store to your doorstep.
            </Txt>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {['All', 'Processing', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'].map((v) => (
              <Chip key={v} label={v} active={filter === v} onPress={() => setFilter(v)} />
            ))}
          </ScrollView>
          {orders.length ? (
            orders.map((o) => <OrderCard key={o.id} order={o} />)
          ) : (
            <Empty
              icon="receipt-outline"
              title="No orders here yet"
              message={
                filter === 'All'
                  ? 'Your next great upgrade starts with a little discovery.'
                  : `You have no ${filter.toLowerCase()} orders.`
              }
              action="Explore products"
              onAction={() => app.tab('home')}
            />
          )}
        </View>
      </Screen>
    </View>
  );
}
export function OrderDetailScreen() {
  const app = useApp();
  const order = app.orders.find((o) => o.id === Number(app.route.params?.id));
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!order)
    return (
      <View style={{ flex: 1 }}>
        <Header title="Order details" />
        <Empty
          icon="receipt-outline"
          title="Order unavailable"
          message="This order could not be found."
          action="View orders"
          onAction={() => app.tab('orders')}
        />
      </View>
    );
  return (
    <View style={{ flex: 1 }}>
      <Header title="Order details" />
      <Screen>
        <View style={s.content}>
          {app.route.params?.placed && (
            <View style={s.success}>
              <Icon name="checkmark-circle" color={colors.green} size={23} />
              <View style={{ flex: 1 }}>
                <Txt color={colors.green} weight="semibold">
                  Your order is in!
                </Txt>
                <Txt color={colors.green} size={11} style={{ marginTop: 3 }}>
                  {app.mode === 'demo'
                    ? 'Your demo order was saved on this device.'
                    : 'We’ll keep you updated on your delivery.'}
                </Txt>
              </View>
            </View>
          )}
          <View style={s.between}>
            <View>
              <Txt size={23} weight="bold">
                {order.number}
              </Txt>
              <Txt size={11} color={colors.muted} style={{ marginTop: 7 }}>
                Placed {dateLabel(order.date)}
              </Txt>
            </View>
            <Badge text={order.status} tone={orderTone(order.status)} />
          </View>
          {order.status !== 'Cancelled' ? (
            <Card style={{ paddingVertical: 23, paddingHorizontal: 10 }}>
              <Progress status={order.status} />
            </Card>
          ) : (
            <View style={s.error}>
              <Icon name="close-circle-outline" color={colors.red} />
              <Txt color={colors.red}>This order has been cancelled.</Txt>
            </View>
          )}
          <Section title={`Your items (${order.items.length})`} />
          <Card style={{ padding: 16, gap: 15 }}>
            {order.items.map((item, index) => {
              const p = app.products.find((p) => p.id === item.productId);
              return (
                <React.Fragment key={`${item.productId}-${index}`}>
                  {index > 0 && <Divider />}
                  <View style={[s.row, { gap: 12 }]}>
                    {p && <Image source={p.image} style={s.orderItemImage} resizeMode="contain" />}
                    <View style={{ flex: 1, gap: 5 }}>
                      <Txt size={12} weight="semibold">
                        {p?.name ?? item.productName ?? `Product #${item.productId}`}
                      </Txt>
                      <Txt color={colors.muted} size={10}>
                        {Object.values(item.options ?? {}).join(' · ') || p?.brand}
                      </Txt>
                      <Txt size={11}>
                        Qty {item.quantity}
                        {p ? ` × ${money(item.unitPrice ?? p.price)}` : ''}
                      </Txt>
                    </View>
                    {p && (
                      <Txt size={12} weight="bold">
                        {money((item.unitPrice ?? p.price) * item.quantity)}
                      </Txt>
                    )}
                  </View>
                </React.Fragment>
              );
            })}
          </Card>
          <Card style={{ padding: 18, gap: 13 }}>
            <View style={[s.row, { gap: 10 }]}>
              <Icon name="location-outline" color={colors.orange} />
              <Txt weight="bold">Delivering to</Txt>
            </View>
            <Txt size={13} weight="medium">
              {order.address.name}
            </Txt>
            <Txt size={12} color={colors.muted} style={{ lineHeight: 20 }}>
              {addressText(order.address)}
            </Txt>
            <Txt size={12}>{order.address.phone}</Txt>
            <Divider />
            <View style={[s.row, { gap: 10 }]}>
              <Icon name="cash-outline" color={colors.orange} />
              <Txt size={12}>{order.payment === 'cod' ? 'Cash on delivery' : 'Online payment'}</Txt>
            </View>
          </Card>
          <Card style={{ padding: 20 }}>
            <Summary
              subtotal={order.subtotal}
              delivery={order.delivery}
              discount={order.discount}
              total={order.total}
            />
          </Card>
          <ErrorNote message={error} />
          {['Processing', 'Confirmed'].includes(order.status) && (
            <Button
              title="Cancel order"
              variant="outline"
              icon="close-circle-outline"
              onPress={() => setConfirm(true)}
            />
          )}
          <Button
            title="Need help with this order?"
            variant="secondary"
            onPress={() => app.navigate('support')}
          />
        </View>
      </Screen>
      <Confirm
        visible={confirm}
        title="Cancel this order?"
        body="This action cancels all items in this order."
        busy={busy}
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          setBusy(true);
          try {
            await app.cancelOrder(order.id);
            setConfirm(false);
            app.notify('Order cancelled.');
          } catch (e) {
            setError(errorText(e));
            setConfirm(false);
          } finally {
            setBusy(false);
          }
        }}
      />
    </View>
  );
}

const accountLinks: { name: string; icon: string; route: RouteName; caption?: string }[] = [
  { name: 'My orders', icon: 'receipt-outline', route: 'orders' },
  { name: 'Wishlist', icon: 'heart-outline', route: 'wishlist' },
  { name: 'Compare products', icon: 'git-compare-outline', route: 'compare' },
  { name: 'Saved addresses', icon: 'location-outline', route: 'addresses' },
  { name: 'Account information', icon: 'person-outline', route: 'profile' },
  { name: 'Notifications', icon: 'notifications-outline', route: 'notifications' },
  { name: 'Help & support', icon: 'help-buoy-outline', route: 'support' },
  { name: 'About Technest', icon: 'information-circle-outline', route: 'about' },
];
export function AccountScreen() {
  const app = useApp();
  const [confirm, setConfirm] = useState(false);
  return (
    <Screen>
      <LinearGradient
        colors={['#31201D', '#151522', '#69320B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.profileHero}
      >
        <View style={s.heroOrb} />
        <View style={s.between}>
          <Brand light />
          <Badge text={app.mode === 'demo' ? 'DEMO WORKSPACE' : 'YOUR ACCOUNT'} tone="orange" />
        </View>
        <View style={[s.row, { gap: 14, marginTop: 30 }]}>
          <View style={s.avatar}>
            <Txt size={25} weight="bold" color={colors.orange}>
              {(app.user?.name ?? 'Tech enthusiast')
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </Txt>
          </View>
          <View style={{ flex: 1, gap: 7 }}>
            <Txt color="#FFFFFF" weight="bold" size={21}>
              {app.user?.name ?? 'Hello, tech enthusiast'}
            </Txt>
            <Txt color="#CDCCD6" size={11}>
              {app.user?.email ?? 'Your next upgrade starts here'}
            </Txt>
          </View>
          {app.user && (
            <IconButton
              name="create-outline"
              color="#FFFFFF"
              label="Edit profile"
              onPress={() => app.navigate('profile')}
            />
          )}
        </View>
        {!app.user && (
          <Button
            title="Sign in to your account"
            onPress={() => app.navigate('login')}
            style={{ marginTop: 22 }}
          />
        )}
      </LinearGradient>
      <View style={s.content}>
        <View style={[s.row, { gap: 12 }]}>
          {[
            { value: app.orders.length, label: 'Orders', route: 'orders' as RouteName },
            { value: app.wishlist.length, label: 'Saved', route: 'wishlist' as RouteName },
            { value: app.addresses.length, label: 'Addresses', route: 'addresses' as RouteName },
          ].map((v) => (
            <Card
              key={v.label}
              onPress={() => app.navigate(v.route)}
              style={{ flex: 1, paddingVertical: 18, alignItems: 'center', gap: 7 }}
            >
              <Txt size={24} weight="bold">
                {v.value}
              </Txt>
              <Txt color={colors.muted} size={10}>
                {v.label}
              </Txt>
            </Card>
          ))}
        </View>
        <Card style={{ paddingHorizontal: 17 }}>
          {accountLinks.map((v, i) => (
            <React.Fragment key={v.name}>
              {i > 0 && <Divider />}
              <Pressable
                accessibilityRole="button"
                onPress={() => app.navigate(v.route)}
                style={[s.between, { paddingVertical: 17 }]}
              >
                <View style={[s.row, { gap: 13 }]}>
                  <Icon name={v.icon} size={20} />
                  <Txt size={12} weight="medium">
                    {v.name}
                  </Txt>
                </View>
                <View style={[s.row, { gap: 8 }]}>
                  {v.route === 'wishlist' && app.wishlist.length > 0 && (
                    <Txt size={11} color={colors.muted}>
                      {app.wishlist.length}
                    </Txt>
                  )}
                  <Icon name="chevron-forward" size={16} color={colors.muted} />
                </View>
              </Pressable>
            </React.Fragment>
          ))}
        </Card>
        {(app.mode === 'demo' || app.user?.isStaff) && (
          <Card
            onPress={() => app.setWorkspace('admin')}
            style={{ padding: 19, backgroundColor: '#FFF3E9', borderColor: '#FFDEC3' }}
          >
            <View style={[s.row, { gap: 13 }]}>
              <View style={[s.iconTile, { backgroundColor: '#FFFFFF' }]}>
                <Icon name="grid-outline" color={colors.orange} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Txt weight="bold">Technest Admin</Txt>
                <Txt size={10} color={colors.muted}>
                  Manage your store, beautifully.
                </Txt>
              </View>
              <Icon name="arrow-forward" size={20} color={colors.orange} />
            </View>
          </Card>
        )}
        {app.mode === 'live' && !app.user?.isStaff && (
          <Button
            title="Staff sign in"
            variant="secondary"
            onPress={() => app.navigate('login', { admin: true })}
          />
        )}
        {app.user && (
          <Button
            title="Sign out"
            variant="secondary"
            icon="log-out-outline"
            onPress={() => setConfirm(true)}
          />
        )}
        <Txt size={10} color={colors.muted} style={{ textAlign: 'center' }}>
          TECHNEST · VERSION 1.0.0
        </Txt>
      </View>
      <Confirm
        visible={confirm}
        title="Sign out?"
        body="Your saved wishlist and bag will be here when you return."
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          try {
            await app.logout();
            setConfirm(false);
          } catch (e) {
            app.notify(errorText(e));
          }
        }}
      />
    </Screen>
  );
}
export function WishlistScreen() {
  const app = useApp();
  const items = app.products.filter((p) => app.wishlist.includes(p.id));
  return (
    <View style={{ flex: 1 }}>
      <Header title={`Wishlist (${items.length})`} />
      <Screen>
        <View style={s.content}>
          <View>
            <Txt size={24} weight="bold">
              Worth coming back for.
            </Txt>
            <Txt size={12} color={colors.muted} style={{ marginTop: 6 }}>
              All your favorites, one beautiful place.
            </Txt>
          </View>
          {items.length ? (
            <View style={s.grid}>
              {items.map((p) => (
                <View key={p.id} style={{ width: '48%' }}>
                  <ProductCard product={p} />
                </View>
              ))}
            </View>
          ) : (
            <Empty
              icon="heart-outline"
              title="Start your wish list"
              message="Tap the heart on anything you love. We’ll keep it here for you."
              action="Discover products"
              onAction={() => app.tab('home')}
            />
          )}
        </View>
      </Screen>
    </View>
  );
}

export function AddressesScreen() {
  const app = useApp();
  const [editing, setEditing] = useState<Address | null>(
    app.addresses.length ? null : initialAddress(),
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const save = async () => {
    if (!editing) return;
    setError('');
    if (
      !editing.name.trim() ||
      !editing.line.trim() ||
      !editing.city.trim() ||
      !editing.postal.trim()
    )
      return setError('Please complete the name, address, city and postal code.');
    if (!/^\+?[\d\s-]{8,18}$/.test(editing.phone))
      return setError('Enter a valid contact phone number.');
    if (
      app.mode === 'live' &&
      (!editing.division?.trim() ||
        !editing.district?.trim() ||
        !editing.area?.trim() ||
        !editing.road?.trim())
    )
      return setError('Complete your division, district, area and road for delivery.');
    setBusy(true);
    try {
      await app.saveAddress({ ...editing, name: editing.name.trim(), line: editing.line.trim() });
      setEditing(null);
      app.notify('Address saved.');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const update = (k: keyof Address, v: string | boolean) =>
    setEditing((a) => (a ? { ...a, [k]: v } : a));
  return (
    <View style={{ flex: 1 }}>
      <Header
        title="Delivery addresses"
        right={
          !editing && (app.mode === 'demo' || !app.addresses.length) ? (
            <IconButton
              name="add"
              label="Add address"
              color={colors.orange}
              onPress={() => {
                setEditing({ ...initialAddress(), isDefault: !app.addresses.length });
                setError('');
              }}
            />
          ) : undefined
        }
      />
      <Screen>
        <View style={s.content}>
          {editing ? (
            <>
              <Txt size={24} weight="bold">
                {editing.id ? 'Edit address' : 'Make yourself at home.'}
              </Txt>
              <Txt size={12} color={colors.muted}>
                A few details for a smooth delivery.
              </Txt>
              <View style={[s.row, { gap: 8 }]}>
                {['Home', 'Office', 'Other'].map((v) => (
                  <Chip
                    key={v}
                    label={v}
                    active={editing.label === v}
                    onPress={() => update('label', v)}
                  />
                ))}
              </View>
              <Field
                label="Full name"
                value={editing.name}
                onChangeText={(v) => update('name', v)}
                placeholder="Recipient name"
                autoComplete="name"
              />
              <Field
                label="Phone number"
                value={editing.phone}
                onChangeText={(v) => update('phone', v)}
                keyboardType="phone-pad"
                placeholder="+880 1XXXXXXXXX"
              />
              <Field
                label="Street address"
                value={editing.line}
                onChangeText={(v) => update('line', v)}
                placeholder="House, road, area"
                multiline
              />
              <View style={[s.row, { gap: 12 }]}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="City / district"
                    value={editing.city}
                    onChangeText={(v) => update('city', v)}
                    placeholder="Dhaka"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Postal code"
                    value={editing.postal}
                    onChangeText={(v) => update('postal', v)}
                    placeholder="1216"
                    keyboardType="number-pad"
                  />
                </View>
              </View>
              {app.mode === 'live' && (
                <>
                  <Field
                    label="Division"
                    value={editing.division ?? ''}
                    onChangeText={(v) => update('division', v.toLowerCase())}
                    placeholder="dhaka"
                    autoCapitalize="none"
                  />
                  <Field
                    label="District"
                    value={editing.district ?? ''}
                    onChangeText={(v) => update('district', v)}
                    placeholder="Dhaka"
                  />
                  <Field
                    label="Area / upazila"
                    value={editing.area ?? ''}
                    onChangeText={(v) => update('area', v)}
                    placeholder="Mirpur"
                  />
                  <Field
                    label="Road"
                    value={editing.road ?? ''}
                    onChangeText={(v) => update('road', v)}
                    placeholder="Road 5"
                  />
                </>
              )}
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: editing.isDefault }}
                onPress={() => update('isDefault', !editing.isDefault)}
                style={[s.row, { gap: 10 }]}
              >
                <Icon
                  name={editing.isDefault ? 'checkbox' : 'square-outline'}
                  color={editing.isDefault ? colors.orange : colors.muted}
                />
                <Txt size={12}>Use as my default address</Txt>
              </Pressable>
              <ErrorNote message={error} />
              <Button title="Save address" onPress={save} loading={busy} icon="checkmark" />
              <Button title="Cancel" variant="secondary" onPress={() => setEditing(null)} />
            </>
          ) : (
            <>
              {app.addresses.length ? (
                <>
                  <Txt size={23} weight="bold">
                    Your familiar places.
                  </Txt>
                  {app.addresses.map((a) => (
                    <Card key={a.id} style={{ padding: 20, gap: 12 }}>
                      <View style={s.between}>
                        <View style={[s.row, { gap: 9 }]}>
                          <Icon
                            name={a.label === 'Home' ? 'home-outline' : 'location-outline'}
                            color={colors.orange}
                          />
                          <Txt weight="bold">{a.label}</Txt>
                          {a.isDefault && <Badge text="Default" tone="neutral" />}
                        </View>
                        <View style={s.row}>
                          <IconButton
                            name="create-outline"
                            label={`Edit ${a.label} address`}
                            size={19}
                            onPress={() => {
                              setEditing(a);
                              setError('');
                            }}
                          />
                          <IconButton
                            name="trash-outline"
                            label={`Delete ${a.label} address`}
                            size={18}
                            color={colors.red}
                            onPress={() => setDeleting(a.id)}
                          />
                        </View>
                      </View>
                      <Txt weight="semibold" size={13}>
                        {a.name}
                      </Txt>
                      <Txt color={colors.muted} size={12} style={{ lineHeight: 20 }}>
                        {addressText(a)}
                      </Txt>
                      <Txt size={12}>{a.phone}</Txt>
                    </Card>
                  ))}
                  {app.mode === 'demo' && (
                    <Button
                      title="Add new address"
                      icon="add"
                      variant="outline"
                      onPress={() => {
                        setEditing({ ...initialAddress(), isDefault: false });
                        setError('');
                      }}
                    />
                  )}
                  {app.mode === 'live' && (
                    <Txt size={11} color={colors.muted}>
                      Your store account supports one delivery address. Edit this address to change
                      your delivery details.
                    </Txt>
                  )}
                  {app.route.params?.checkout && (
                    <Button
                      title="Continue to checkout"
                      icon="arrow-forward"
                      onPress={() => app.back()}
                    />
                  )}
                </>
              ) : (
                <Empty
                  icon="location-outline"
                  title="No saved addresses"
                  message="Add your delivery details once and check out faster next time."
                  action="Add an address"
                  onAction={() => setEditing(initialAddress())}
                />
              )}
            </>
          )}
        </View>
      </Screen>
      <Confirm
        visible={deleting !== null}
        title="Delete this address?"
        body="You can add a new delivery address at any time."
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting === null) return;
          try {
            await app.deleteAddress(deleting);
            setDeleting(null);
          } catch (e) {
            app.notify(errorText(e));
          }
        }}
      />
    </View>
  );
}

export function ProfileScreen() {
  const app = useApp();
  const [name, setName] = useState(app.user?.name ?? '');
  const [phone, setPhone] = useState(app.user?.phone ?? '');
  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [editingPassword, setEditingPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!app.user)
    return (
      <View style={{ flex: 1 }}>
        <Header title="Account information" />
        <Empty
          icon="person-circle-outline"
          title="Make it yours"
          message="Sign in to update your profile and account details."
          action="Sign in"
          onAction={() => app.navigate('login')}
        />
      </View>
    );
  const submit = async () => {
    setError('');
    if (editingPassword) {
      if (password.length < 8) return setError('Use at least 8 characters for your new password.');
      if (password !== confirmPassword) return setError('The new passwords do not match.');
      if (!oldPassword) return setError('Enter your current password.');
    } else if (!name.trim()) return setError('Your name is required.');
    setBusy(true);
    try {
      if (editingPassword) {
        await app.changePassword(oldPassword, password);
        setOldPassword('');
        setPassword('');
        setConfirmPassword('');
        setEditingPassword(false);
      } else await app.updateProfile({ name: name.trim(), phone });
      app.notify(editingPassword ? 'Password updated.' : 'Profile updated.');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ flex: 1 }}>
      <Header title="Account information" />
      <Screen>
        <View style={s.content}>
          <View
            style={[
              s.avatar,
              {
                alignSelf: 'center',
                width: 82,
                height: 82,
                backgroundColor: '#FFF0E5',
                marginVertical: 10,
              },
            ]}
          >
            <Txt size={29} color={colors.orange} weight="bold">
              {(app.user.name || 'T')
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </Txt>
          </View>
          <View style={[s.row, { gap: 8 }]}>
            <Chip
              label="Personal details"
              active={!editingPassword}
              onPress={() => {
                setEditingPassword(false);
                setError('');
              }}
            />
            <Chip
              label="Password"
              active={editingPassword}
              onPress={() => {
                setEditingPassword(true);
                setError('');
              }}
            />
          </View>
          {editingPassword ? (
            <>
              <Field
                label="Current password"
                value={oldPassword}
                onChangeText={setOldPassword}
                secureTextEntry
                placeholder="Enter your current password"
              />
              <Field
                label="New password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="At least 8 characters"
              />
              <Field
                label="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Re-enter your new password"
              />
            </>
          ) : (
            <>
              <Field
                label="Full name"
                value={name}
                onChangeText={setName}
                placeholder="Your name"
              />
              <View style={{ gap: 8 }}>
                <Txt size={12} weight="semibold">
                  Email address
                </Txt>
                <View style={s.disabledField}>
                  <Txt color={colors.muted}>{app.user.email}</Txt>
                  <Icon name="lock-closed-outline" color={colors.muted} size={16} />
                </View>
                <Txt size={10} color={colors.muted}>
                  Contact support to change your verified email.
                </Txt>
              </View>
              <Field
                label="Phone number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+880 1XXXXXXXXX"
              />
            </>
          )}
          <ErrorNote message={error} />
          <Button
            title={editingPassword ? 'Update password' : 'Save changes'}
            icon="checkmark"
            onPress={submit}
            loading={busy}
          />
        </View>
      </Screen>
    </View>
  );
}

export function NotificationsScreen() {
  const app = useApp();
  return (
    <View style={{ flex: 1 }}>
      <Header
        title="Notifications"
        right={
          <Pressable accessibilityRole="button" onPress={app.markNotificationsRead}>
            <Txt size={11} color={colors.orange} weight="semibold">
              Mark all read
            </Txt>
          </Pressable>
        }
      />
      <Screen>
        <View style={s.content}>
          {app.notifications.length ? (
            app.notifications.map((n) => (
              <Card
                key={n.id}
                style={{ padding: 18, borderColor: n.read ? colors.line : '#FFE0C7' }}
              >
                <View style={[s.row, { gap: 13, alignItems: 'flex-start' }]}>
                  <View style={s.iconTile}>
                    <Icon name={n.icon} color={colors.orange} />
                  </View>
                  <View style={{ flex: 1, gap: 8 }}>
                    <View style={s.between}>
                      <Txt size={13} weight="bold" style={{ flex: 1 }}>
                        {n.title}
                      </Txt>
                      {!n.read && <View style={s.unreadDot} />}
                    </View>
                    <Txt color={colors.muted} size={12} style={{ lineHeight: 20 }}>
                      {n.body}
                    </Txt>
                  </View>
                </View>
              </Card>
            ))
          ) : (
            <Empty
              icon="notifications-outline"
              title="All caught up"
              message="Order updates and useful store news will appear here."
            />
          )}
          <View style={s.note}>
            <Icon name="information-circle-outline" size={17} color={colors.muted} />
            <Txt size={10} color={colors.muted} style={{ flex: 1, lineHeight: 17 }}>
              Your latest store and order updates appear here. Check My orders for the current
              status of a delivery.
            </Txt>
          </View>
        </View>
      </Screen>
    </View>
  );
}
const faqs = [
  {
    q: 'How long does delivery take?',
    a: 'Delivery times depend on your location and product availability. Contact the store before ordering to confirm the current delivery estimate for your area.',
  },
  {
    q: 'Are the products genuine?',
    a: 'Technest is built to showcase genuine products with clear specifications. Check the product listing and confirm the seller’s warranty coverage before purchase.',
  },
  {
    q: 'How do I cancel an order?',
    a: 'Open My orders, select your order and choose Cancel order. Cancellation is available while the order is processing or confirmed. Contact support once it has shipped.',
  },
  {
    q: 'How does the demo work?',
    a: 'Demo mode runs locally on your device. Your bag, wishlist, profile and demo orders are saved on this device. Demo orders do not charge money or create shipments.',
  },
  {
    q: 'What is the warranty policy?',
    a: 'Warranty terms vary by brand and product. Review the product specifications and contact the store for manufacturer warranty and return eligibility before ordering.',
  },
];
export function SupportScreen() {
  const app = useApp();
  const [open, setOpen] = useState<number | null>(0);
  const [contact, setContact] = useState(false);
  return (
    <View style={{ flex: 1 }}>
      <Header title="Help & support" />
      <Screen>
        <View style={s.content}>
          <LinearGradient colors={['#FFF0E3', '#FFFFFF']} style={s.supportHero}>
            <View style={[s.iconTile, { width: 54, height: 54, backgroundColor: '#FFFFFF' }]}>
              <Icon name="help-buoy-outline" size={30} color={colors.orange} />
            </View>
            <Txt size={27} weight="bold">
              We’re here to help.
            </Txt>
            <Txt color={colors.muted} size={12} style={{ lineHeight: 20 }}>
              A little guidance for a smoother tech journey.
            </Txt>
          </LinearGradient>
          <Section title="Frequently asked" />
          {faqs.map((f, i) => (
            <Card key={f.q} style={{ padding: 18 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: open === i }}
                onPress={() => setOpen(open === i ? null : i)}
                style={[s.between, { gap: 12 }]}
              >
                <Txt weight="semibold" size={12} style={{ flex: 1 }}>
                  {f.q}
                </Txt>
                <Icon name={open === i ? 'remove' : 'add'} size={20} color={colors.orange} />
              </Pressable>
              {open === i && (
                <Txt color={colors.muted} size={12} style={{ marginTop: 13, lineHeight: 21 }}>
                  {f.a}
                </Txt>
              )}
            </Card>
          ))}
          <Card style={{ padding: 20, gap: 12 }}>
            <Txt size={18} weight="bold">
              Need a human?
            </Txt>
            <Txt size={12} color={colors.muted} style={{ lineHeight: 20 }}>
              For order changes, returns or warranty questions, contact your store’s support team.
              Keep your order number handy for faster help.
            </Txt>
            <Button
              title="What to include in your request"
              icon="chatbubbles-outline"
              variant="secondary"
              onPress={() => setContact(!contact)}
            />
            {contact && (
              <View style={s.note}>
                <Icon name="information-circle-outline" size={20} color={colors.orange} />
                <Txt size={12} style={{ flex: 1, lineHeight: 20 }}>
                  Include your order number, the product name, a short description of your question
                  and any helpful photos. Never share your password or payment card details.
                </Txt>
              </View>
            )}
          </Card>
        </View>
      </Screen>
    </View>
  );
}
export function AboutScreen() {
  const app = useApp();
  return (
    <View style={{ flex: 1 }}>
      <Header title="About Technest" />
      <Screen>
        <View style={s.content}>
          <LinearGradient
            colors={['#171824', '#302028']}
            style={[s.supportHero, { alignItems: 'center', paddingVertical: 42 }]}
          >
            <Brand light size={32} />
            <Txt color="#B8B7C6" size={11} style={{ letterSpacing: 3, marginTop: 8 }}>
              YOUR NEXT UPGRADE
            </Txt>
          </LinearGradient>
          <Txt size={28} weight="bold">
            A better home for tech.
          </Txt>
          <Txt size={13} color={colors.muted} style={{ lineHeight: 23 }}>
            Technest brings the joy of discovering your next upgrade to a thoughtfully crafted
            mobile experience. Explore technology, compare your options, build your setup and keep
            every order within reach.
          </Txt>
          <View style={{ gap: 12 }}>
            {[
              {
                icon: 'shield-checkmark-outline',
                title: 'Buy with clarity',
                text: 'Useful specifications and transparent prices.',
              },
              {
                icon: 'layers-outline',
                title: 'Made for your setup',
                text: 'From daily essentials to your dream PC.',
              },
              {
                icon: 'heart-outline',
                title: 'Keep what inspires you',
                text: 'Save, compare and come back when you’re ready.',
              },
            ].map((i) => (
              <Card key={i.title} style={{ padding: 20 }}>
                <View style={[s.row, { gap: 14 }]}>
                  <View style={s.iconTile}>
                    <Icon name={i.icon} color={colors.orange} />
                  </View>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Txt weight="bold">{i.title}</Txt>
                    <Txt color={colors.muted} size={11}>
                      {i.text}
                    </Txt>
                  </View>
                </View>
              </Card>
            ))}
          </View>
          <Card style={{ padding: 20, gap: 10 }}>
            <View style={s.between}>
              <Txt color={colors.muted} size={12}>
                Version
              </Txt>
              <Txt size={12} weight="semibold">
                1.0.0
              </Txt>
            </View>
            <View style={s.between}>
              <Txt color={colors.muted} size={12}>
                Data environment
              </Txt>
              <Badge
                text={app.mode === 'demo' ? 'Local demo' : 'Connected API'}
                tone={app.mode === 'demo' ? 'orange' : 'green'}
              />
            </View>
            <Txt size={11} color={colors.muted} style={{ lineHeight: 19 }}>
              Built with React Native and Expo. This application is the mobile frontend for the
              TechZone commerce project.
            </Txt>
          </Card>
        </View>
      </Screen>
    </View>
  );
}

function RecoveryModal({ initialEmail, onClose }: { initialEmail: string; onClose: () => void }) {
  const app = useApp();
  const [step, setStep] = useState<'email' | 'code' | 'password' | 'complete'>('email');
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      request.current?.abort();
    },
    [],
  );
  const dismiss = () => {
    request.current?.abort();
    onClose();
  };
  const sendCode = async () => {
    setError('');
    setStatus('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    try {
      if (app.mode === 'live')
        await api('/api/v1/accounts/forgot-password/', {
          method: 'POST',
          body: { email: email.trim() },
          auth: false,
          signal: controller.signal,
        });
      if (controller.signal.aborted) return;
      setOtp('');
      setResetToken('');
      setStep('code');
      setStatus(
        app.mode === 'demo'
          ? 'Demo code ready: 123456. No email is sent.'
          : 'If the account exists, a verification code has been sent. Check your inbox.',
      );
    } catch (e) {
      if (!controller.signal.aborted) setError(errorText(e));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  const submit = async () => {
    if (step === 'email') {
      await sendCode();
      return;
    }
    setError('');
    setStatus('');
    if (step === 'code' && !/^\d{6}$/.test(otp.trim())) {
      setError('Enter the 6-digit verification code.');
      return;
    }
    if (step === 'password' && password.length < 8) {
      setError('Use at least 8 characters for your new password.');
      return;
    }
    if (step === 'password' && password !== confirmation) {
      setError('The new passwords do not match.');
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    try {
      if (step === 'code') {
        if (app.mode === 'demo') {
          if (otp.trim() !== '123456')
            throw new Error('Invalid verification code. Use 123456 in demo mode.');
        } else {
          const result = await api<{ reset_token: string }>(
            '/api/v1/accounts/verify-password-otp/',
            {
              method: 'POST',
              body: { email: email.trim(), otp: otp.trim() },
              auth: false,
              signal: controller.signal,
            },
          );
          if (!result.reset_token)
            throw new Error('Verification could not be completed. Request a new code.');
          if (controller.signal.aborted) return;
          setResetToken(result.reset_token);
        }
        if (!controller.signal.aborted) {
          setOtp('');
          setStep('password');
        }
      } else if (step === 'password') {
        if (app.mode === 'live')
          await api('/api/v1/accounts/reset-password/', {
            method: 'POST',
            body: { reset_token: resetToken, password, password2: confirmation },
            auth: false,
            signal: controller.signal,
          });
        if (!controller.signal.aborted) {
          setPassword('');
          setConfirmation('');
          setResetToken('');
          setStep('complete');
        }
      }
    } catch (e) {
      if (!controller.signal.aborted) setError(errorText(e));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  const goBack = () => {
    setError('');
    setStatus('');
    setOtp('');
    setPassword('');
    setConfirmation('');
    setResetToken('');
    setStep(step === 'password' ? 'code' : 'email');
  };
  return (
    <Modal transparent animationType="fade" onRequestClose={dismiss} visible>
      <KeyboardAvoidingView
        style={s.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          accessibilityViewIsModal
          testID="password-recovery-modal"
          style={[s.confirm, { maxHeight: '92%', maxWidth: 400, padding: 23 }]}
        >
          <View style={s.between}>
            <View style={s.iconTile}>
              <Icon
                name={step === 'complete' ? 'checkmark-circle-outline' : 'key-outline'}
                color={colors.orange}
              />
            </View>
            <IconButton name="close" label="Close password recovery" onPress={dismiss} />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 18 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ gap: 8 }}>
              <Txt weight="bold" size={25}>
                {step === 'email'
                  ? 'Let’s get you back in.'
                  : step === 'code'
                    ? 'Check your inbox.'
                    : step === 'password'
                      ? 'A fresh start.'
                      : app.mode === 'demo'
                        ? 'Demo reset complete.'
                        : 'Password updated.'}
              </Txt>
              <Txt color={colors.muted} size={12} style={{ lineHeight: 21 }}>
                {step === 'email'
                  ? 'Enter your account email to receive a password recovery code.'
                  : step === 'code'
                    ? `Enter the 6-digit code for ${email.trim()}.`
                    : step === 'password'
                      ? 'Choose a strong new password that you haven’t used before.'
                      : app.mode === 'demo'
                        ? 'You completed the demo recovery flow. Your account password has not changed.'
                        : 'Your new password is ready. Return to sign in and use it to access your account.'}
              </Txt>
            </View>
            {app.mode === 'demo' && step !== 'complete' && (
              <Badge text="DEMO RECOVERY · CODE 123456" />
            )}
            {step === 'email' && (
              <Field
                label="Recovery email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            )}
            {step === 'code' && (
              <Field
                label="Recovery code"
                value={otp}
                onChangeText={setOtp}
                placeholder="6-digit code"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                maxLength={6}
              />
            )}
            {step === 'password' && (
              <>
                <Field
                  label="New recovery password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 8 characters"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                />
                <Field
                  label="Confirm recovery password"
                  value={confirmation}
                  onChangeText={setConfirmation}
                  placeholder="Re-enter your new password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                />
              </>
            )}
            <ErrorNote message={error} />
            {status ? (
              <View style={s.note}>
                <Icon name="information-circle-outline" size={18} color={colors.orange} />
                <Txt color={colors.muted} size={11} style={{ flex: 1, lineHeight: 18 }}>
                  {status}
                </Txt>
              </View>
            ) : null}
            {step === 'complete' ? (
              <Button title="Back to sign in" onPress={dismiss} />
            ) : (
              <>
                <Button
                  title={
                    step === 'email'
                      ? 'Send recovery code'
                      : step === 'code'
                        ? 'Verify recovery code'
                        : 'Reset password'
                  }
                  onPress={submit}
                  loading={busy}
                  icon="arrow-forward"
                />
                {step === 'code' && (
                  <Button
                    title="Resend recovery code"
                    onPress={sendCode}
                    disabled={busy}
                    variant="secondary"
                  />
                )}
                {step !== 'email' && (
                  <Button
                    title="Go back a step"
                    variant="secondary"
                    disabled={busy}
                    onPress={goBack}
                  />
                )}
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function LoginScreen() {
  const app = useApp();
  const admin = Boolean(app.route.params?.admin);
  const [email, setEmail] = useState(
    app.mode === 'demo' ? (admin ? 'admin@technest.demo' : 'hello@technest.demo') : '',
  );
  const [password, setPassword] = useState(app.mode === 'demo' ? 'Technest123!' : '');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [forgot, setForgot] = useState(false);
  const submit = async () => {
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setError('Enter a valid email address.');
    if (!password) return setError('Enter your password.');
    setBusy(true);
    try {
      await app.login(email.trim(), password, admin);
      if (admin) app.setWorkspace('admin');
      else app.tab('account');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header title={admin ? 'Staff sign in' : ''} />
      <Screen>
        <View style={[s.content, { gap: 23 }]}>
          <Brand />
          <View style={{ gap: 11, marginTop: 18 }}>
            <Badge text={admin ? 'TECHNEST ADMIN' : 'WELCOME BACK'} />
            <Txt size={33} weight="bold">
              {admin ? 'Your store.\nYour command center.' : 'Your next upgrade\nstarts here.'}
            </Txt>
            <Txt size={12} color={colors.muted} style={{ lineHeight: 21 }}>
              {admin
                ? 'Sign in with an authorized staff account.'
                : 'Sign in to make your Technest experience your own.'}
            </Txt>
          </View>
          {app.mode === 'demo' && (
            <View style={s.note}>
              <Icon name="flask-outline" size={20} color={colors.orange} />
              <Txt size={11} color={colors.muted} style={{ flex: 1, lineHeight: 18 }}>
                Demo mode. The credentials below open a local demo account. No real authentication
                request is sent.
              </Txt>
            </View>
          )}
          <Field
            label="Email address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <View>
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry={!show}
              autoCapitalize="none"
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => setShow(!show)}
              style={{ position: 'absolute', right: 14, bottom: 15 }}
            >
              <Icon
                name={show ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.muted}
              />
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setForgot(true)}
            style={{ alignSelf: 'flex-end' }}
          >
            <Txt color={colors.orange} size={12} weight="semibold">
              Forgot password?
            </Txt>
          </Pressable>
          <ErrorNote message={error} />
          <Button
            title={admin ? 'Sign in to admin' : 'Sign in'}
            icon="arrow-forward"
            onPress={submit}
            loading={busy}
          />
          {!admin && (
            <View style={[s.row, { gap: 5, justifyContent: 'center' }]}>
              <Txt size={12} color={colors.muted}>
                New to the nest?
              </Txt>
              <Pressable accessibilityRole="button" onPress={() => app.navigate('register')}>
                <Txt size={12} weight="bold" color={colors.orange}>
                  Create account
                </Txt>
              </Pressable>
            </View>
          )}
          <Txt color={colors.muted} size={10} style={{ textAlign: 'center', lineHeight: 17 }}>
            Your personal details stay with your account. Demo data is stored on this device.
          </Txt>
        </View>
      </Screen>
      {forgot && <RecoveryModal initialEmail={email} onClose={() => setForgot(false)} />}
    </KeyboardAvoidingView>
  );
}

export function RegisterScreen() {
  const app = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    setError('');
    if (verifying) {
      if (!otp.trim()) return setError('Enter the verification code sent to your email.');
      setBusy(true);
      try {
        await app.verifyEmail(email.trim(), otp.trim());
        await app.login(email.trim(), password);
        app.tab('account');
      } catch (e) {
        setError(errorText(e));
      } finally {
        setBusy(false);
      }
      return;
    }
    if (name.trim().length < 2) return setError('Enter your full name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setError('Enter a valid email address.');
    if (app.mode === 'live' && !/^\+?[\d\s-]{8,18}$/.test(phone))
      return setError('Enter a valid phone number.');
    if (password.length < 8) return setError('Choose a password with at least 8 characters.');
    if (password !== confirm) return setError('The passwords do not match.');
    setBusy(true);
    try {
      await app.register(name.trim(), email.trim(), password, phone.trim());
      if (app.mode === 'live') setVerifying(true);
      else app.tab('account');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header title={verifying ? 'Verify email' : 'Create account'} />
      <Screen>
        <View style={s.content}>
          <Brand />
          <View style={{ gap: 10, marginTop: 12 }}>
            <Txt size={32} weight="bold">
              {verifying ? 'One last step.' : 'Find your place\nin the nest.'}
            </Txt>
            <Txt size={12} color={colors.muted}>
              {verifying
                ? `Enter the verification code sent to ${email}.`
                : 'A smarter way to shop for the tech you love.'}
            </Txt>
          </View>
          {verifying ? (
            <>
              <Field
                label="Email verification code"
                value={otp}
                onChangeText={setOtp}
                placeholder="Enter your code"
                keyboardType="number-pad"
                autoComplete="one-time-code"
              />
              <Button
                title="Resend verification code"
                variant="secondary"
                disabled={busy}
                onPress={async () => {
                  setBusy(true);
                  try {
                    await app.resendOTP(email.trim());
                    app.notify('Verification code sent.');
                  } catch (e) {
                    setError(errorText(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </>
          ) : (
            <>
              <Field
                label="Full name"
                value={name}
                onChangeText={setName}
                placeholder="Your full name"
                autoComplete="name"
              />
              <Field
                label="Email address"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {app.mode === 'live' && (
                <Field
                  label="Phone number"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+880 1XXXXXXXXX"
                  keyboardType="phone-pad"
                />
              )}
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                secureTextEntry
                autoCapitalize="none"
              />
              <Field
                label="Confirm password"
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Re-enter your password"
                secureTextEntry
                autoCapitalize="none"
              />
            </>
          )}
          <ErrorNote message={error} />
          <Button
            title={
              verifying
                ? 'Verify & sign in'
                : app.mode === 'demo'
                  ? 'Create demo account'
                  : 'Create account'
            }
            onPress={submit}
            loading={busy}
            icon="arrow-forward"
          />
          <View style={[s.row, { justifyContent: 'center', gap: 5 }]}>
            <Txt color={colors.muted} size={12}>
              Already part of the nest?
            </Txt>
            <Pressable accessibilityRole="button" onPress={() => app.navigate('login')}>
              <Txt color={colors.orange} weight="bold" size={12}>
                Sign in
              </Txt>
            </Pressable>
          </View>
          <Txt color={colors.muted} size={10} style={{ textAlign: 'center', lineHeight: 18 }}>
            {app.mode === 'demo'
              ? 'Your demo account is saved on this device only.'
              : 'Verify your email to activate your account.'}
          </Txt>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  content: { padding: 22, gap: 20 },
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bagImage: { width: 65, height: 65, borderRadius: 12, backgroundColor: '#FAFAFD' },
  iconTile: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#FFF1E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 9,
    gap: 9,
    backgroundColor: colors.bg,
  },
  step: { padding: 7 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 13,
    backgroundColor: '#FFF0F2',
    borderRadius: 12,
  },
  success: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 16,
    backgroundColor: '#EAF8F0',
    borderRadius: 14,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 15,
    backgroundColor: '#F0F0F7',
    borderRadius: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#10111E99',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
  },
  confirm: {
    width: '100%',
    maxWidth: 360,
    padding: 26,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    gap: 17,
  },
  warningIcon: {
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#FFF1E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutSteps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addressCard: { padding: 17, borderWidth: 1.5 },
  orderThumb: { width: 43, height: 42, borderRadius: 9, backgroundColor: '#F7F7FB' },
  orderItemImage: { width: 65, height: 62, borderRadius: 10, backgroundColor: '#F7F7FB' },
  profileHero: {
    padding: 24,
    paddingTop: 30,
    paddingBottom: 33,
    overflow: 'hidden',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroOrb: {
    position: 'absolute',
    width: 270,
    height: 270,
    borderRadius: 140,
    backgroundColor: '#FF660015',
    right: -125,
    bottom: -120,
    borderWidth: 1,
    borderColor: '#FF880044',
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledField: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#EEEEF5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.orange,
    marginLeft: 10,
  },
  supportHero: { padding: 25, borderRadius: 23, gap: 15 },
});
