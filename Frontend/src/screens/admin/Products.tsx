import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Card, Chip, Empty, ErrorState, FAB, Header, Img, Loader, SearchBar, StatusBadge, T } from '../../components/ui';
import { useCategories, useImageIndex } from '../../lib/catalog';
import { listProducts } from '../../lib/products';
import { useDebounced } from '../../lib/hooks';
import { errorMessage, money, num, variantOf } from '../../lib/format';
import { useAdmin } from '../../store/Admin';
import { useNav } from '../../navigation/hooks';
import type { Product } from '../../types';

export default function AdminProducts() {
  const nav = useNav();
  const { can } = useAdmin();
  const { categories } = useCategories();
  const images = useImageIndex();
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const term = useDebounced(q.trim(), 400);
  const [items, setItems] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const req = useRef(0);

  const load = useCallback(
    async (mode: 'reset' | 'refresh' | 'more') => {
      const id = ++req.current;
      const next = mode === 'more' ? page + 1 : 1;
      if (mode === 'reset') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      if (mode === 'more') setMore(true);
      try {
        const res = await listProducts({ is_active: undefined, category: cat || undefined, search: term || undefined, page: next, limit: 20 });
        if (id !== req.current) return;
        setItems((prev) => (mode === 'more' ? [...prev, ...res.results.filter((r) => !prev.some((p) => p.id === r.id))] : res.results));
        setPage(next);
        setHasMore(Boolean(res.next));
        setCount(res.count);
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
    [cat, term, page],
  );

  useEffect(() => {
    void load('reset');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, term]);

  useEffect(() => nav.addListener('focus', () => void load('refresh')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Products" subtitle={loading ? undefined : `${count} total`} back={false} />
      <View style={{ backgroundColor: colors.white, paddingHorizontal: 16, paddingBottom: 10 }}>
        <SearchBar value={q} onChangeText={setQ} placeholder="Search name, brand or TZ-P code" />
      </View>
      <View style={{ backgroundColor: colors.white, paddingBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          <Chip label="All" active={cat === ''} onPress={() => setCat('')} />
          {categories.map((c) => (
            <Chip key={c.id} label={c.name} active={cat === c.slug} onPress={() => setCat(c.slug)} />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <Loader />
      ) : error && !items.length ? (
        <ErrorState message={error} onRetry={() => load('reset')} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={colors.primary} colors={[colors.primary]} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasMore && !more && !loading) void load('more');
          }}
          ListEmptyComponent={<Empty icon="cube-outline" title="No products found" message="Try another category or search term." style={{ flex: 1 }} />}
          ListFooterComponent={more ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 14 }} /> : null}
          renderItem={({ item: p }) => {
            const v = variantOf(p);
            const stock = v?.stock ?? 0;
            const inactive = p.is_active === false;
            return (
              <Card onPress={() => nav.navigate('AdminProductForm', { id: p.id, slug: p.slug })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Img uri={images.get(p.id)?.[0]} style={{ width: 62, height: 62, borderRadius: 12, backgroundColor: '#FAFAFC' }} />
                  <View style={{ flex: 1 }}>
                    <T size={13} weight="bold" numberOfLines={2}>
                      {p.name}
                    </T>
                    <T size={14} weight="bold" color={colors.primary}>
                      {money(num(v?.discounted_price ?? v?.price))}
                    </T>
                    <T size={11.5} color={stock <= 0 ? colors.danger : stock <= 5 ? '#B45309' : colors.muted}>
                      Stock: {stock}
                    </T>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 8 }}>
                    <StatusBadge status={inactive ? 'inactive' : 'active'} label={inactive ? 'Hidden' : 'Active'} />
                    <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                  </View>
                </View>
              </Card>
            );
          }}
        />
      )}
      {can('products') && <FAB onPress={() => nav.navigate('AdminProductForm', {})} />}
    </View>
  );
}
