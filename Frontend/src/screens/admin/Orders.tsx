import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { colors } from '../../theme';
import { Card, Chip, Empty, ErrorState, Header, Loader, SearchBar, StatusBadge, T } from '../../components/ui';
import { adminApi, buildQuery, ListResponse, Row } from '../../lib/adminApi';
import { useDebounced } from '../../lib/hooks';
import { dateTime, errorMessage, money, num, orderCode } from '../../lib/format';
import { useNav } from '../../navigation/hooks';

const TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function AdminOrders() {
  const nav = useNav();
  const [tab, setTab] = useState('');
  const [q, setQ] = useState('');
  const term = useDebounced(q.trim(), 400);
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const req = useRef(0);

  const loadCounts = useCallback(async () => {
    try {
      const entries = await Promise.all(
        TABS.map(async (t) => {
          const r = await adminApi<ListResponse>(`resources/orders/${buildQuery({ status: t.key, page_size: 20 })}`);
          return [t.key, r.count] as const;
        }),
      );
      setCounts(Object.fromEntries(entries));
    } catch {
      /* counts are decorative */
    }
  }, []);

  const load = useCallback(
    async (mode: 'reset' | 'refresh' | 'more') => {
      const id = ++req.current;
      const next = mode === 'more' ? page + 1 : 1;
      if (mode === 'reset') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      if (mode === 'more') setMore(true);
      try {
        const res = await adminApi<ListResponse>(`resources/orders/${buildQuery({ status: tab, q: term, page: next, page_size: 20 })}`);
        if (id !== req.current) return;
        setRows((prev) => (mode === 'more' ? [...prev, ...res.rows.filter((r) => !prev.some((p) => p.id === r.id))] : res.rows));
        setPage(res.page);
        setPages(res.pages);
        setError('');
      } catch (e) {
        if (id === req.current) setError(errorMessage(e));
      } finally {
        if (id === req.current) {
          setLoading(false);
          setRefreshing(false);
          setMore(false);
        }
      }
    },
    [tab, term, page],
  );

  useEffect(() => {
    void load('reset');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, term]);

  useEffect(() => {
    void loadCounts();
    return nav.addListener('focus', () => {
      void loadCounts();
      void load('refresh');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadCounts]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Orders" back={false} />
      <View style={{ backgroundColor: colors.white, paddingHorizontal: 16, paddingBottom: 10 }}>
        <SearchBar value={q} onChangeText={setQ} placeholder="Search by customer, phone, email or ID" />
      </View>
      <View style={{ backgroundColor: colors.white, paddingBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {TABS.map((t) => (
            <Chip key={t.key || 'all'} label={t.label} count={counts[t.key]} active={tab === t.key} onPress={() => setTab(t.key)} />
          ))}
        </ScrollView>
      </View>
      {loading ? (
        <Loader />
      ) : error && !rows.length ? (
        <ErrorState message={error} onRetry={() => load('reset')} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void loadCounts(); void load('refresh'); }} tintColor={colors.primary} colors={[colors.primary]} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (page < pages && !more && !loading) void load('more');
          }}
          ListEmptyComponent={<Empty icon="bag-handle-outline" title="No orders found" message="Orders matching this filter will show up here." style={{ flex: 1 }} />}
          ListFooterComponent={more ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 14 }} /> : null}
          renderItem={({ item: o }) => (
            <Card onPress={() => nav.navigate('AdminOrderDetail', { id: o.id })}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <T weight="bold" size={14}>
                    {orderCode(o.id)}
                  </T>
                  <T size={12} color={colors.text2} numberOfLines={1}>
                    {String(o.shipping_name ?? '')}
                  </T>
                  {!!o.created_at && (
                    <T size={11} color={colors.muted}>
                      {dateTime(String(o.created_at))}
                    </T>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 5 }}>
                  <T weight="bold" size={15}>
                    {money(num(o.total_amount))}
                  </T>
                  <StatusBadge status={String(o.status)} />
                </View>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}
