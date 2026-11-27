import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Empty, IconButton, Img, Loader, SearchBar, T } from '../../components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDebounced } from '../../lib/hooks';
import { listProducts } from '../../lib/products';
import { useImageIndex, useCategories } from '../../lib/catalog';
import { jsonGet, jsonSet } from '../../lib/storage';
import { money, priceOf } from '../../lib/format';
import { useNav } from '../../navigation/hooks';
import type { Product } from '../../types';

const KEY = 'technest_recent_searches';

export default function Search() {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const images = useImageIndex();
  const { categories } = useCategories();
  const [q, setQ] = useState('');
  const term = useDebounced(q.trim(), 350);
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    void jsonGet<string[]>(KEY, []).then(setRecent);
  }, []);

  useEffect(() => {
    if (term.length < 2) {
      setResults([]);
      return;
    }
    let live = true;
    setLoading(true);
    listProducts({ search: term, limit: 12 })
      .then((r) => live && setResults(r.results))
      .catch(() => live && setResults([]))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [term]);

  const remember = (value: string) => {
    const next = [value, ...recent.filter((r) => r.toLowerCase() !== value.toLowerCase())].slice(0, 8);
    setRecent(next);
    void jsonSet(KEY, next);
  };

  const submit = (value = q) => {
    const v = value.trim();
    if (!v) return;
    remember(v);
    nav.navigate('ProductList', { search: v, title: 'Search results' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <IconButton name="chevron-back" onPress={() => nav.goBack()} bg={colors.bg} border={false} size={38} />
        <SearchBar style={{ flex: 1 }} value={q} onChangeText={setQ} onSubmit={() => submit()} autoFocus placeholder="Search products, brands, codes…" />
      </View>

      {term.length >= 2 ? (
        loading ? (
          <Loader />
        ) : (
          <FlatList
            data={results}
            keyExtractor={(i) => String(i.id)}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, gap: 10 }}
            ListEmptyComponent={<Empty icon="search-outline" title="No matches" message={`Nothing found for “${term}”.`} />}
            ListFooterComponent={results.length ? (
              <Pressable onPress={() => submit(term)} style={{ alignItems: 'center', paddingVertical: 12 }}>
                <T weight="bold" color={colors.primary}>
                  See all results
                </T>
              </Pressable>
            ) : null}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  remember(term);
                  nav.navigate('ProductDetail', { slug: item.slug, id: item.id, name: item.name });
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bg, borderRadius: 14, padding: 10 }}
              >
                <Img uri={images.get(item.id)?.[0]} style={{ width: 54, height: 54, backgroundColor: colors.white, borderRadius: 10 }} />
                <View style={{ flex: 1 }}>
                  <T size={13} weight="medium" numberOfLines={2}>
                    {item.name}
                  </T>
                  <T size={13} weight="bold" color={colors.primary}>
                    {money(priceOf(item))}
                  </T>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </Pressable>
            )}
          />
        )
      ) : (
        <FlatList
          data={[]}
          renderItem={() => null}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={{ padding: 16 }}>
              {recent.length > 0 && (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                    <T weight="bold" size={15}>
                      Recent searches
                    </T>
                    <Pressable
                      onPress={() => {
                        setRecent([]);
                        void jsonSet(KEY, []);
                      }}
                    >
                      <T size={12.5} color={colors.primary} weight="medium">
                        Clear
                      </T>
                    </Pressable>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
                    {recent.map((r) => (
                      <Pressable key={r} onPress={() => submit(r)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.bg, paddingHorizontal: 12, height: 34, borderRadius: 17 }}>
                        <Ionicons name="time-outline" size={14} color={colors.muted} />
                        <T size={12.5}>{r}</T>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
              <T weight="bold" size={15} style={{ marginBottom: 10 }}>
                Browse categories
              </T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {categories.map((c) => (
                  <Pressable key={c.id} onPress={() => nav.navigate('ProductList', { category: c.slug, title: c.name })} style={{ backgroundColor: colors.primarySoft, paddingHorizontal: 14, height: 36, borderRadius: 18, justifyContent: 'center' }}>
                    <T size={12.5} weight="medium" color={colors.primaryDark}>
                      {c.name}
                    </T>
                  </Pressable>
                ))}
              </View>
            </View>
          }
        />
      )}
    </View>
  );
}
