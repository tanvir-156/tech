import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { Card, Empty, ErrorState, Header, Loader, SearchBar, StatusBadge, T } from '../../components/ui';
import { adminApi, buildQuery, ListResponse, Row } from '../../lib/adminApi';
import { useDebounced } from '../../lib/hooks';
import { errorMessage, money, num } from '../../lib/format';
import { useNav } from '../../navigation/hooks';

type Mode = '' | 'low' | 'out';

export default function Inventory() {
  const nav = useNav();
  const [mode, setMode] = useState<Mode>('');
  const [q, setQ] = useState('');
  const term = useDebounced(q.trim(), 400);
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [totals, setTotals] = useState<{ all: number; low: number; out: number } | null>(null);
  const req = useRef(0);

  const loadTotals = useCallback(async () => {
    try {
      const [all, low, out] = await Promise.all(
        ['', 'low', 'out'].map((m) => adminApi<ListResponse>(`resources/variants/${buildQuery({ inventory: m, page_size: 20 })}`).then((r) => r.count)),
      );
      setTotals({ all, low, out });
    } catch {
      /* decorative */
    }
  }, []);

  const load = useCallback(
    async (m: 'reset' | 'refresh' | 'more') => {
      const id = ++req.current;
      const next = m === 'more' ? page + 1 : 1;
      if (m === 'reset') setLoading(true);
      if (m === 'refresh') setRefreshing(true);
      if (m === 'more') setMore(true);
      try {
        const res = await adminApi<ListResponse>(`resources/variants/${buildQuery({ inventory: mode, q: term, page: next, page_size: 20, ordering: 'stock' })}`);
        if (id !== req.current) return;
        setRows((prev) => (m === 'more' ? [...prev, ...res.rows.filter((r) => !prev.some((p) => p.id === r.id))] : res.rows));
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
    [mode, term, page],
  );

  useEffect(() => {
    void load('reset');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, term]);

  useEffect(() => {
    void loadTotals();
    return nav.addListener('focus', () => {
      void loadTotals();
      void load('refresh');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadTotals]);

  const inStock = totals ? Math.max(totals.all - totals.low - totals.out, 0) : null;
  const tiles: { key: Mode; label: string; value: number | null; icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string }[] = [
    { key: '', label: 'All variants', value: totals?.all ?? null, icon: 'cube-outline', bg: '#DCFCE7', fg: '#15803D' },
    { key: 'low', label: 'Low Stock', value: totals?.low ?? null, icon: 'warning-outline', bg: '#FFEDD5', fg: '#EA580C' },
    { key: 'out', label: 'Out of Stock', value: totals?.out ?? null, icon: 'close-circle-outline', bg: '#FFE4E9', fg: '#E11D48' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Inventory" subtitle={inStock !== null ? `${inStock} healthy · ${totals!.low} low · ${totals!.out} out` : undefined} />
      <View style={{ flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 8 }}>
        {tiles.map((t) => (
          <Pressable key={t.label} onPress={() => setMode(t.key)} style={{ flex: 1, backgroundColor: t.bg, borderRadius: radius.lg, padding: 12, alignItems: 'center', borderWidth: 2, borderColor: mode === t.key ? t.fg : 'transparent' }}>
            <Ionicons name={t.icon} size={22} color={t.fg} />
            <T size={20} weight="bold" color={t.fg}>
              {t.value ?? '–'}
            </T>
            <T size={10.5} weight="medium" color={t.fg}>
              {t.label}
            </T>
          </Pressable>
        ))}
      </View>
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <SearchBar value={q} onChangeText={setQ} placeholder="Search SKU or product" />
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void loadTotals(); void load('refresh'); }} tintColor={colors.primary} colors={[colors.primary]} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (page < pages && !more && !loading) void load('more');
          }}
          ListEmptyComponent={<Empty icon="cube-outline" title="No variants" message="Nothing matches this filter." style={{ flex: 1 }} />}
          ListFooterComponent={more ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 14 }} /> : null}
          renderItem={({ item: r }) => {
            const stock = num(r.stock);
            const label = stock <= 0 ? 'Out of stock' : stock <= 5 ? 'Low stock' : 'In stock';
            return (
              <Card onPress={() => nav.navigate('AdminRecord', { resource: 'variants', id: r.id, title: 'Edit stock' })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <T size={12.5} weight="bold" numberOfLines={2}>
                      {String(r.sku)}
                    </T>
                    <T size={11.5} color={colors.muted}>
                      {money(num(r.price))} · Stock: {stock}
                    </T>
                  </View>
                  <StatusBadge status={stock <= 0 ? 'cancelled' : stock <= 5 ? 'pending' : 'confirmed'} label={label} />
                </View>
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}
