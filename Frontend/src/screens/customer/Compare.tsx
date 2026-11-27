import React, { useState } from 'react';
import { Pressable, ScrollView, View, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { Button, Card, Empty, ErrorState, Header, Img, Loader, T } from '../../components/ui';
import { api, endpoints, withQuery } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import { errorMessage, money, num, valueText } from '../../lib/format'; // ✅ merged imports
import { listProducts } from '../../lib/products';
import { useImageIndex } from '../../lib/catalog'; // ✅ image index
import { useShop } from '../../store/Shop';
import { useNav } from '../../navigation/hooks';
import type { CompareResult } from '../../types';

const LABEL_W = 108;
const COL_W = 150;

export default function Compare() {
  const nav = useNav();
  const images = useImageIndex(); // ✅ same image source ProductList uses
  const { compareIds, toggleCompare, clearCompare } = useShop();
  const key = compareIds.join(',');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState('');

  // ✅ finds the best available image for a product
  const imageOf = (p: any): string | undefined => {
    const first: any = images.get(p.id)?.[0];
    const fromIndex = typeof first === 'string' ? first : first?.url ?? first?.image;
    return fromIndex ?? p.image ?? p.variant?.image ?? p.default_variant?.image;
  };

  const search = async () => {
    const q = query.trim();
    if (!q) {
      setSearchResults([]);
      setSearched(false);
      setSearchError('');
      return;
    }
    setSearching(true);
    setSearchError('');
    try {
      const res: any = await listProducts({ search: q });
      const list = Array.isArray(res) ? res : res?.results ?? [];
      setSearchResults(list.slice(0, 6));
      setSearched(true);
    } catch (e) {
      console.log('Compare search error:', e);
      setSearchResults([]);
      setSearchError(errorMessage(e));
      setSearched(true);
    } finally {
      setSearching(false);
    }
  };

  const data = useAsync(async () => {
    if (compareIds.length < 2) return null;
    return api<CompareResult>(withQuery(endpoints.compare, { ids: key }), { auth: false });
  }, [key]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        title="Compare"
        subtitle={compareIds.length ? `${compareIds.length} selected — up to 4` : undefined}
        right={
          compareIds.length > 0 ? (
            <Pressable onPress={clearCompare}>
              <T size={13} weight="medium" color={colors.primary}>Clear</T>
            </Pressable>
          ) : undefined
        }
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* SEARCH TO ADD PRODUCTS */}
        <Card style={{ margin: 16, marginBottom: 10 }}>
          <T size={13} weight="bold" style={{ marginBottom: 8 }}>Add product to compare</T>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, height: 44 }}>
              <Ionicons name="search-outline" size={18} color={colors.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Enter product name, e.g. iPhone, Laptop..."
                placeholderTextColor={colors.muted}
                style={{ flex: 1, marginLeft: 8, fontSize: 13, color: colors.text }}
                returnKeyType="search"
                onSubmitEditing={search}
              />
              {query.length > 0 && (
                <Pressable
                  onPress={() => {
                    setQuery('');
                    setSearchResults([]);
                    setSearched(false);
                    setSearchError('');
                  }}
                >
                  <Ionicons name="close-circle" size={18} color={colors.muted} />
                </Pressable>
              )}
            </View>
            <Button title="Search" small onPress={search} loading={searching} full={false} style={{ height: 44, paddingHorizontal: 18 }} />
          </View>

          {searchError !== '' && (
            <T size={12} color="#E5484D" style={{ marginTop: 10 }}>
              Search failed: {searchError}
            </T>
          )}

          {searched && !searching && searchError === '' && searchResults.length === 0 && (
            <T size={12} color={colors.muted} style={{ marginTop: 10 }}>
              No products found for “{query.trim()}”. Try a different name.
            </T>
          )}

          {searchResults.length > 0 && (
            <View style={{ marginTop: 12, gap: 8 }}>
              <T size={11} color={colors.muted}>Tap Compare to add to comparison</T>
              {searchResults.map((p) => {
                const added = compareIds.includes(p.id);
                const categoryName = typeof p.category === 'object' ? p.category?.name : p.category;
                const brandName = typeof p.brand === 'object' ? p.brand?.name : p.brand;
                return (
                  <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderWidth: 1, borderColor: added ? colors.primary : colors.border, borderRadius: radius.md, padding: 10 }}>
                    {/* ✅ image from the image index */}
                    <Img uri={imageOf(p)} style={{ width: 42, height: 42, borderRadius: 8, backgroundColor: '#FAFAFC' }} />
                    <View style={{ flex: 1 }}>
                      <T size={12.5} weight="medium" numberOfLines={1}>{p.name}</T>
                      <T size={11} color={colors.muted} numberOfLines={1}>{categoryName ?? ''} · {brandName ?? ''}</T>
                    </View>
                    <Button
                      title={added ? 'Added' : 'Compare'}
                      small
                      variant={added ? 'soft' : 'primary'}
                      icon={added ? 'checkmark' : 'git-compare-outline'}
                      onPress={() => toggleCompare(p.id)}
                      full={false}
                      style={{ height: 36, paddingHorizontal: 14 }}
                    />
                  </View>
                );
              })}
            </View>
          )}

          {/* Selected chips */}
          {compareIds.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {compareIds.map((id) => (
                <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: '#FFE0C7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill }}>
                  <T size={11.5} weight="bold" color={colors.primary}>#{id}</T>
                  <Pressable onPress={() => toggleCompare(id)} hitSlop={4}>
                    <Ionicons name="close" size={14} color={colors.primary} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Comparison table */}
        {compareIds.length < 2 ? (
          <Empty
            icon="git-compare-outline"
            title={compareIds.length === 0 ? 'Nothing to compare yet' : 'Pick one more product'}
            message="Enter a product name above, then tap Compare. You can compare up to four products."
            action="Browse products"
            onAction={() => nav.navigate('ProductList', { title: 'All products' })}
          />
        ) : data.loading ? (
          <Loader />
        ) : data.error || !data.data ? (
          <ErrorState message={data.error || 'Could not load the comparison.'} onRetry={data.retry} />
        ) : (
          <View style={{ marginTop: 4 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <View>
                <View style={{ flexDirection: 'row' }}>
                  <View style={{ width: LABEL_W }} />
                  {data.data.products.map((p) => (
                    <Card key={p.id} style={{ width: COL_W - 10, marginRight: 10, alignItems: 'center', paddingTop: 18 }}>
                      <Pressable onPress={() => toggleCompare(p.id)} style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }} hitSlop={8}>
                        <Ionicons name="close-circle" size={20} color={colors.muted} />
                      </Pressable>
                      {/* ✅ image from the image index */}
                      <Img uri={imageOf(p)} style={{ width: 90, height: 90 }} />
                      <T size={12} weight="medium" numberOfLines={2} align="center" style={{ marginTop: 6, minHeight: 34 }}>
                        {p.name}
                      </T>
                      <T size={14} weight="bold" color={colors.primary}>
                        {money(num(p.variant?.discounted_price ?? p.default_variant?.discounted_price))}
                      </T>
                      <Button
                        title="View"
                        variant="soft"
                        small
                        onPress={() => nav.navigate('ProductDetail', { slug: p.slug, id: p.id, name: p.name })}
                        style={{ marginTop: 8, alignSelf: 'stretch' }}
                      />
                    </Card>
                  ))}
                </View>
                {data.data.specification_sections.map((s) => (
                  <View key={s.name} style={{ marginTop: 14 }}>
                    <T weight="bold" size={13} color={colors.primary} style={{ marginBottom: 6 }}>
                      {s.name}
                    </T>
                    {s.rows.map((r, ri) => (
                      <View key={r.label + ri} style={{ flexDirection: 'row', backgroundColor: r.different ? colors.primarySofter : ri % 2 ? colors.white : '#FAFAFC', borderRadius: radius.sm, paddingVertical: 8 }}>
                        <T size={11.5} color={colors.muted} style={{ width: LABEL_W, paddingHorizontal: 8 }}>
                          {r.label}
                        </T>
                        {r.values.map((v, vi) => (
                          <T key={vi} size={12} weight={r.different ? 'medium' : 'regular'} style={{ width: COL_W - 10, marginRight: 10, paddingHorizontal: 4 }}>
                            {valueText(v)}
                          </T>
                        ))}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* COMPARISON OPTION BELOW WISHLIST SECTION */}
        <Card style={{ marginHorizontal: 16, marginTop: 18, borderWidth: 1, borderColor: colors.primary, borderStyle: 'dashed', backgroundColor: colors.primarySofter }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="git-compare" size={22} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <T size={13.5} weight="bold">Have a wishlist?</T>
              <T size={11.5} color={colors.muted} numberOfLines={2}>Compare your wishlist items side-by-side to pick the best one.</T>
            </View>
            <Button title="Wishlist" small variant="dark" icon="heart-outline" onPress={() => nav.navigate('Wishlist')} full={false} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <Button title="View Wishlist & Compare" variant="ghost" small icon="arrow-forward" iconRight="arrow-forward" onPress={() => nav.navigate('Wishlist')} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Clear Compare" variant="soft" small onPress={clearCompare} disabled={compareIds.length === 0} />
            </View>
          </View>
        </Card>

        <T size={11} color={colors.muted} align="center" style={{ marginTop: 12, paddingHorizontal: 24 }}>
          Tip: Enter product name → tap Compare → see detailed specs comparison here.
        </T>
      </ScrollView>
    </View>
  );
}