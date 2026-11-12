import React, { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, Card, ErrorState, Header, Loader, MenuRow, Sheet, StatusBadge, StickyBar, T } from '../../components/ui';
import { adminApi, DetailResponse } from '../../lib/adminApi';
import { dateTime, errorMessage, money, num, orderCode, titleCase } from '../../lib/format';
import { useToast } from '../../store/Toast';
import { useParams } from '../../navigation/hooks';

const STEPS = [
  { key: 'pending', label: 'Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

const ACTION_LABEL: Record<string, string> = {
  confirmed: 'Confirm order',
  shipped: 'Mark as shipped',
  delivered: 'Mark as delivered',
  cancelled: 'Cancel order',
  collect_cod: 'Confirm COD collection',
};
const ACTION_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  confirmed: 'checkmark-circle-outline',
  shipped: 'bicycle-outline',
  delivered: 'cube-outline',
  collect_cod: 'cash-outline',
};

export default function AdminOrderDetail() {
  const toast = useToast();
  const { id = 0 } = useParams<{ id: number }>();
  const [d, setD] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      try {
        setD(await adminApi<DetailResponse>(`resources/orders/${id}/`));
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
  }, [load]);

  const run = async (action: string) => {
    if (!d) return;
    setSheet(false);
    setBusy(true);
    try {
      await adminApi(`resources/orders/${id}/action/`, { method: 'POST', body: { action }, headers: { 'X-Record-Version': d.version } });
      toast(`${ACTION_LABEL[action] ?? titleCase(action)} — done.`, 'success');
      await load();
    } catch (e) {
      toast(errorMessage(e), 'error');
      await load();
    } finally {
      setBusy(false);
    }
  };

  const confirmCancel = () =>
    Alert.alert('Cancel this order?', 'The customer will be notified and stock is restored.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel order', style: 'destructive', onPress: () => void run('cancelled') },
    ]);

  if (loading) return <Shell><Loader /></Shell>;
  if (error || !d) return <Shell><ErrorState message={error || 'Order not found'} onRetry={() => load()} /></Shell>;

  const o = d.data;
  const status = String(o.status);
  const cancelled = status === 'cancelled';
  const idx = Math.max(STEPS.findIndex((s) => s.key === status), 0);
  const canCancel = d.actions.includes('cancelled');
  const others = d.actions.filter((a) => a !== 'cancelled');

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
              {orderCode(id)}
            </T>
            <T size={11.5} color={colors.muted}>
              Placed on {dateTime(String(o.created_at ?? ''))}
            </T>
          </View>
          <StatusBadge status={status} />
        </View>

        <Card style={{ marginTop: 16 }}>
          {cancelled ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="close-circle" size={24} color={colors.danger} />
              <T size={13} color={colors.text2}>
                This order was cancelled.
              </T>
            </View>
          ) : (
            <View style={{ flexDirection: 'row' }}>
              {STEPS.map((s, i) => {
                const done = i <= idx;
                return (
                  <View key={s.key} style={{ flex: 1, alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                      <View style={[styles.line, { opacity: i === 0 ? 0 : 1, backgroundColor: done ? colors.primary : colors.border }]} />
                      <View style={[styles.dot, done && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                        {done && <Ionicons name="checkmark" size={13} color={colors.white} />}
                      </View>
                      <View style={[styles.line, { opacity: i === STEPS.length - 1 ? 0 : 1, backgroundColor: i < idx ? colors.primary : colors.border }]} />
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
          <Block icon="person-outline" title="Customer" lines={[String(o.shipping_name ?? ''), String(o.shipping_phone ?? ''), String(o.user ?? '')]} />
          <View style={styles.sep} />
          <Block icon="location-outline" title="Shipping address" lines={[String(o.shipping_address ?? ''), o.shipping_instructions ? `Note: ${o.shipping_instructions}` : '']} />
          <View style={styles.sep} />
          <Block icon="card-outline" title="Payment" lines={[`${o.payment_method === 'cod' ? 'Cash on Delivery' : 'Online (SSLCommerz)'} · ${titleCase(String(o.payment_status))}`]} />
        </Card>

        <T size={16} weight="bold" style={{ marginTop: 20, marginBottom: 10 }}>
          Items ({d.items.length})
        </T>
        <View style={{ gap: 10 }}>
          {d.items.map((i) => (
            <Card key={i.id}>
              <T size={13} weight="medium" numberOfLines={2}>
                {String(i.product_name)}
              </T>
              <T size={11} color={colors.muted}>
                {[i.ram, i.storage, i.color_name].filter(Boolean).join(' · ') || String(i.sku ?? '')}
              </T>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <T size={12} color={colors.text2}>
                  {money(num(i.unit_price))} × {String(i.quantity)}
                </T>
                <T size={13} weight="bold">
                  {money(num(i.line_total))}
                </T>
              </View>
            </Card>
          ))}
        </View>

        <Card style={{ marginTop: 14 }}>
          <Row label="Subtotal" value={money(num(o.subtotal))} />
          {num(o.discount_amount) > 0 && <Row label={`Discount${o.discount_code ? ` (${o.discount_code})` : ''}`} value={`-${money(num(o.discount_amount))}`} color={colors.success} />}
          <View style={styles.sep} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T weight="bold" size={15}>
              Total
            </T>
            <T weight="bold" size={18} color={colors.primary}>
              {money(num(o.total_amount))}
            </T>
          </View>
        </Card>
      </ScrollView>

      {(canCancel || others.length > 0) && (
        <StickyBar>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {canCancel && (
              <View style={{ flex: 1 }}>
                <Button title="Cancel Order" variant="outline" onPress={confirmCancel} disabled={busy} />
              </View>
            )}
            {others.length > 0 && (
              <View style={{ flex: 1 }}>
                <Button title="Update Status" iconRight="chevron-down" onPress={() => setSheet(true)} loading={busy} />
              </View>
            )}
          </View>
        </StickyBar>
      )}

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Update status">
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          {others.map((a, i) => (
            <MenuRow key={a} icon={ACTION_ICON[a] ?? 'checkmark-circle-outline'} title={ACTION_LABEL[a] ?? titleCase(a)} onPress={() => void run(a)} last={i === others.length - 1} />
          ))}
        </View>
      </Sheet>
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

function Block({ icon, title, lines }: { icon: keyof typeof Ionicons.glyphMap; title: string; lines: string[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={styles.icon}>
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

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
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
  icon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  sep: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
});
