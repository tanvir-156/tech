import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { colors } from '../../theme';
import { Card, Chip, Empty, ErrorState, Header, Img, Loader, StatusBadge, T } from '../../components/ui';
import { api, endpoints } from '../../lib/api';
import { asList, dateTime, errorMessage, money, num, orderCode } from '../../lib/format';
import { useAuth } from '../../store/Auth';
import { useNav } from '../../navigation/hooks';
import type { Order } from '../../types';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function Orders() {
  const nav = useNav();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (refresh = false) => {
      if (!user) {
        setLoading(false);
        return;
      }
      if (refresh) setRefreshing(true);
      try {
        const res = await api<unknown>(endpoints.orders);
        setOrders(asList<Order>(res).slice().sort((a, b) => b.id - a.id));
        setError('');
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user],
  );

  useEffect(() => {
    void load();
    return nav.addListener('focus', () => void load());
  }, [load, nav]);

  const shown = tab === 'all' ? orders : orders.filter((o) => o.status === tab);
  const count = (k: string) => (k === 'all' ? orders.length : orders.filter((o) => o.status === k).length);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="My Orders" />
      <View style={{ backgroundColor: colors.white, paddingBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {TABS.map((t) => (
            <Chip key={t.key} label={t.label} count={orders.length ? count(t.key) : undefined} active={tab === t.key} onPress={() => setTab(t.key)} />
          ))}
        </ScrollView>
      </View>
      {!user ? (
        <Empty icon="receipt-outline" title="Sign in to view orders" action="Sign in" onAction={() => nav.navigate('Login')} />
      ) : loading ? (
        <Loader />
      ) : error && !orders.length ? (
        <ErrorState message={error} onRetry={() => load()} />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(o) => String(o.id)}
          contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} colors={[colors.primary]} />}
          ListEmptyComponent={<Empty icon="receipt-outline" title="No orders here" message={tab === 'all' ? "You haven't placed any orders yet." : `You have no ${tab} orders.`} style={{ flex: 1 }} />}
          renderItem={({ item: o }) => (
            <Card onPress={() => nav.navigate('OrderDetail', { id: o.id })}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View>
                  <T weight="bold" size={14.5}>
                    {orderCode(o.id)}
                  </T>
                  <T size={11.5} color={colors.muted}>
                    {dateTime(o.created_at)} · {o.items.length} item{o.items.length === 1 ? '' : 's'}
                  </T>
                </View>
                <StatusBadge status={o.status} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 }}>
                {o.items.slice(0, 3).map((i) => (
                  <Img key={i.id} uri={i.product_image} style={{ width: 46, height: 46, borderRadius: 10, backgroundColor: '#FAFAFC' }} />
                ))}
                {o.items.length > 3 && (
                  <T size={12} color={colors.muted}>
                    +{o.items.length - 3}
                  </T>
                )}
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <T size={11} color={colors.muted}>
                    Total
                  </T>
                  <T size={16} weight="bold" color={colors.primary}>
                    {money(num(o.total_amount))}
                  </T>
                </View>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}
