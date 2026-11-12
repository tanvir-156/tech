import React, { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { Button, Card, ErrorState, Header, Img, Loader, StatusBadge, StickyBar, T } from '../../components/ui';
import { api, endpoints } from '../../lib/api';
import { dateTime, errorMessage, money, num, orderCode } from '../../lib/format';
import { useToast } from '../../store/Toast';
import { useNav, useParams } from '../../navigation/hooks';
import { startPayment } from './Checkout';
import type { Order } from '../../types';

const STEPS = [
  { key: 'pending', label: 'Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

export default function OrderDetail() {
  const nav = useNav();
  const toast = useToast();
  const { id = 0 } = useParams<{ id: number }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      try {
        setOrder(await api<Order>(`${endpoints.orders}${id}/`));
        setError('');
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  useEffect(() => {
    void load();
    return nav.addListener('focus', () => void load());
  }, [load, nav]);

  const cancel = () =>
    Alert.alert('Cancel this order?', 'This cannot be undone.', [
      { text: 'Keep order', style: 'cancel' },
      {
        text: 'Cancel order',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await api(`${endpoints.orders}${id}/cancel/`, { method: 'POST' });
            toast('Order cancelled.', 'success');
            await load();
          } catch (e) {
            toast(errorMessage(e), 'error');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);

  const pay = async () => {
    setBusy(true);
    try {
      await startPayment(id);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Shell><Loader /></Shell>;
  if (error || !order) return <Shell><ErrorState message={error || 'Order not found'} onRetry={() => load()} /></Shell>;

  const cancelled = order.status === 'cancelled';
  const stepIndex = Math.max(STEPS.findIndex((s) => s.key === order.status), 0);
  const canCancel = ['pending', 'confirmed'].includes(order.status);
  const canPay = order.payment_method === 'sslcommerz' && order.payment_status === 'pending' && !cancelled;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Order Details" />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <T size={20} weight="bold">
              {orderCode(order.id)}
            </T>
            <T size={11.5} color={colors.muted}>
              Placed on {dateTime(order.created_at)}
            </T>
          </View>
          <StatusBadge status={order.status} />
        </View>

        <Card style={{ marginTop: 16 }}>
          {cancelled ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="close-circle" size={24} color={colors.danger} />
              <T size={13} color={colors.text2} style={{ flex: 1 }}>
                This order was cancelled.
              </T>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              {STEPS.map((s, i) => {
                const done = i <= stepIndex;
                return (
                  <View key={s.key} style={{ flex: 1, alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                      <View style={[styles.line, { opacity: i === 0 ? 0 : 1, backgroundColor: done ? colors.primary : colors.border }]} />
                      <View style={[styles.dot, done && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                        {done && <Ionicons name="checkmark" size={13} color={colors.white} />}
                      </View>
                      <View style={[styles.line, { opacity: i === STEPS.length - 1 ? 0 : 1, backgroundColor: i < stepIndex ? colors.primary : colors.border }]} />
                    </View>
                    <T size={10.5} weight={done ? 'bold' : 'medium'} color={done ? colors.primary : colors.muted} style={{ marginTop: 6 }}>
                      {s.label}
                    </T>
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        <Card style={{ marginTop: 12 }}>
          <Info icon="person-outline" title="Customer" lines={[order.shipping_name, order.shipping_phone]} />
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 12 }} />
          <Info icon="location-outline" title="Shipping address" lines={[order.shipping_address, order.shipping_instructions ? `Note: ${order.shipping_instructions}` : '']} />
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 12 }} />
          <Info icon="card-outline" title="Payment" lines={[`${order.payment_method_display ?? (order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online payment')} · ${order.payment_status}`]} />
        </Card>

        <T size={16} weight="bold" style={{ marginTop: 20, marginBottom: 10 }}>
          Items ({order.items.length})
        </T>
        <View style={{ gap: 10 }}>
          {order.items.map((i) => (
            <Card key={i.id}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Img uri={i.product_image} style={{ width: 62, height: 62, borderRadius: 12, backgroundColor: '#FAFAFC' }} />
                <View style={{ flex: 1 }}>
                  <T size={13} weight="medium" numberOfLines={2}>
                    {i.product_name}
                  </T>
                  <T size={11} color={colors.muted} numberOfLines={1}>
                    {[i.ram, i.storage, i.color_name].filter(Boolean).join(' · ')}
                  </T>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <T size={12} color={colors.text2}>
                      {money(num(i.unit_price))} × {i.quantity}
                    </T>
                    <T size={13} weight="bold">
                      {money(num(i.line_total))}
                    </T>
                  </View>
                </View>
              </View>
            </Card>
          ))}
        </View>

        <Card style={{ marginTop: 14 }}>
          <Line label="Subtotal" value={money(num(order.subtotal))} />
          {num(order.discount_amount) > 0 && <Line label={`Discount${order.discount_code ? ` (${order.discount_code})` : ''}`} value={`-${money(num(order.discount_amount))}`} color={colors.success} />}
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T weight="bold" size={15}>
              Total
            </T>
            <T weight="bold" size={18} color={colors.primary}>
              {money(num(order.total_amount))}
            </T>
          </View>
        </Card>
      </ScrollView>

      {(canCancel || canPay) && (
        <StickyBar>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {canCancel && (
              <View style={{ flex: 1 }}>
                <Button title="Cancel Order" variant="outline" onPress={cancel} disabled={busy} />
              </View>
            )}
            {canPay && (
              <View style={{ flex: 1 }}>
                <Button title="Pay Now" icon="card-outline" onPress={pay} loading={busy} />
              </View>
            )}
          </View>
        </StickyBar>
      )}
    </View>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Order Details" />
      {children}
    </View>
  );
}

function Info({ icon, title, lines }: { icon: keyof typeof Ionicons.glyphMap; title: string; lines: string[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <T weight="bold" size={13}>
          {title}
        </T>
        {lines.filter(Boolean).map((l, i) => (
          <T key={i} size={12.5} color={colors.text2}>
            {l}
          </T>
        ))}
      </View>
    </View>
  );
}

function Line({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
      <T size={12.5} color={colors.muted}>
        {label}
      </T>
      <T size={12.5} weight="medium" color={color}>
        {value}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flex: 1, height: 3, borderRadius: 2 },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.borderStrong, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  infoIcon: { width: 36, height: 36, borderRadius: radius.sm + 2, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
