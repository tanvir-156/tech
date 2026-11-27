import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { colors } from '../../theme';
import { Button, Chip, Empty, ErrorState, Header, IconButton, Input, Loader, SearchBar, Sheet, T, Toggle } from '../../components/ui';
import { ProductCard } from '../../components/ProductCard';
import { flattenCategories, getBrands, getCategories, useImageIndex } from '../../lib/catalog';
import { listProducts, ProductQuery } from '../../lib/products';
import { errorMessage } from '../../lib/format';
import { useNav, useParams } from '../../navigation/hooks';
import type { Brand, Product } from '../../types';

const SORTS = [
  { value: '-created_at', label: 'Newest' },
  { value: 'price', label: 'Price: Low → High' },
  { value: '-price', label: 'Price: High → Low' },
  { value: 'name', label: 'Name A–Z' },
];

export default function ProductList() {
  const nav = useNav();
  const p = useParams<{ category: string; brand: string; search: string; featured: boolean; onSale: boolean; title: string }>();
  const images = useImageIndex();

  const [items, setItems] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [ordering, setOrdering] = useState('-created_at');
  const [filterOpen, setFilterOpen] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [inStock, setInStock] = useState(false);
  const [onSale, setOnSale] = useState(Boolean(p.onSale));
  const [brands, setBrands] = useState<string[]>(p.brand ? [p.brand] : []);
  const [brandOptions, setBrandOptions] = useState<Brand[]>([]);
  const [query, setQuery] = useState(p.search ?? '');
  const [applied, setApplied] = useState(p.search ?? '');
  const reqId = useRef(0);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        if (p.category) {
          const cat = flattenCategories(await getCategories()).find((c) => c.slug === p.category);
          if (cat?.brands?.length && live) {
            setBrandOptions(cat.brands);
            return;
          }
        }
        const all = await getBrands();
        if (live) setBrandOptions(all);
      } catch {
        /* filters stay empty */
      }
    })();
    return () => {
      live = false;
    };
  }, [p.category]);

  const build = useCallback(
    (pg: number): ProductQuery => ({
      category: p.category,
      brand: brands.length ? brands.join(',') : undefined,
      search: applied.trim() || undefined,
      ordering,
      min_price: minPrice || undefined,
      max_price: maxPrice || undefined,
      in_stock: inStock || undefined,
      on_sale: onSale || undefined,
      is_featured: p.featured || undefined,
      page: pg,
    }),
    [p.category, p.featured, brands, applied, ordering, minPrice, maxPrice, inStock, onSale],
  );

  const load = useCallback(
    async (mode: 'reset' | 'refresh' | 'more') => {
      const id = ++reqId.current;
      const next = mode === 'more' ? page + 1 : 1;
      if (mode === 'reset') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      if (mode === 'more') setMore(true);
      try {
        const res = await listProducts(build(next));
        if (id !== reqId.current) return;
        setItems((prev) => (mode === 'more' ? [...prev, ...res.results.filter((r) => !prev.some((x) => x.id === r.id))] : res.results));
        setPage(next);
        setHasMore(Boolean(res.next));
        setCount(res.count);
        setError('');
      } catch (e) {
        if (id === reqId.current) setError(errorMessage(e));
      } finally {
        if (id === reqId.current) {
          setLoading(false);
          setRefreshing(false);
          setMore(false);
        }
      }
    },
    [build, page],
  );

  useEffect(() => {
    void load('reset');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.category, p.featured, brands, applied, ordering, minPrice, maxPrice, inStock, onSale]);

  const activeFilters = (minPrice ? 1 : 0) + (maxPrice ? 1 : 0) + (inStock ? 1 : 0) + (onSale ? 1 : 0) + brands.length;

  const reset = () => {
    setMinPrice('');
    setMaxPrice('');
    setInStock(false);
    setOnSale(false);
    setBrands([]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        title={p.title ?? (applied ? `“${applied}”` : 'All products')}
        subtitle={loading ? undefined : `${count} product${count === 1 ? '' : 's'}`}
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <IconButton name="options-outline" onPress={() => setFilterOpen(true)} bg={activeFilters ? colors.primary : colors.bg} color={activeFilters ? colors.white : colors.text} border={false} size={38} badge={activeFilters || undefined} />
          </View>
        }
      />
      <View style={{ backgroundColor: colors.white, paddingHorizontal: 16, paddingBottom: 10 }}>
        <SearchBar value={query} onChangeText={setQuery} onSubmit={() => setApplied(query)} placeholder="Search in results…" />
      </View>
      <View style={{ backgroundColor: colors.white, paddingBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {SORTS.map((s) => (
            <Chip key={s.value} label={s.label} active={ordering === s.value} onPress={() => setOrdering(s.value)} />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <Loader />
      ) : error && items.length === 0 ? (
        <ErrorState message={error} onRetry={() => load('reset')} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingTop: 14, paddingBottom: 30, gap: 12 }}
          renderItem={({ item }) => (
            <ProductCard product={item} image={images.get(item.id)?.[0]} onPress={() => nav.navigate('ProductDetail', { slug: item.slug, id: item.id, name: item.name })} />
          )}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasMore && !more && !loading) void load('more');
          }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={colors.primary} colors={[colors.primary]} />}
          ListEmptyComponent={<Empty icon="search-outline" title="No products found" message="Try changing your filters or search term." action={activeFilters ? 'Clear filters' : undefined} onAction={reset} />}
          ListFooterComponent={more ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null}
        />
      )}

      <Sheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filters"
        footer={
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10 }}>
            <View style={{ flex: 1 }}>
              <Button title="Reset" variant="ghost" onPress={reset} />
            </View>
            <View style={{ flex: 2 }}>
              <Button title="Show results" onPress={() => setFilterOpen(false)} />
            </View>
          </View>
        }
      >
        <View style={{ padding: 16 }}>
          <T weight="bold" style={{ marginBottom: 8 }}>
            Price range (৳)
          </T>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Input style={{ flex: 1 }} placeholder="Min" keyboardType="number-pad" value={minPrice} onChangeText={(t) => setMinPrice(t.replace(/\D/g, ''))} />
            <Input style={{ flex: 1 }} placeholder="Max" keyboardType="number-pad" value={maxPrice} onChangeText={(t) => setMaxPrice(t.replace(/\D/g, ''))} />
          </View>
          <Toggle label="In stock only" value={inStock} onChange={setInStock} />
          <Toggle label="On sale" value={onSale} onChange={setOnSale} />
          {brandOptions.length > 0 && (
            <>
              <T weight="bold" style={{ marginTop: 10, marginBottom: 10 }}>
                Brands
              </T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {brandOptions.map((b) => {
                  const on = brands.includes(b.slug);
                  return <Chip key={b.id} label={b.name} active={on} onPress={() => setBrands(on ? brands.filter((x) => x !== b.slug) : [...brands, b.slug])} />;
                })}
              </View>
            </>
          )}
        </View>
      </Sheet>
    </View>
  );
}
