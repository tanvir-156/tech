import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients, radius, shadow } from '../../theme';
import { Button, Empty, IconButton, Img, Loader, T } from '../../components/ui';
import { useCategories } from '../../lib/catalog';
import { categoryIcon } from '../../lib/products';
import { useNav } from '../../navigation/hooks';

export default function Categories() {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const { categories, loading } = useCategories();
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (selected === null && categories.length) setSelected(categories[0].id);
  }, [categories, selected]);

  const current = categories.find((c) => c.id === selected);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.head, { paddingTop: insets.top + 10 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={styles.headIcon}>
            <Ionicons name="grid" size={18} color={colors.white} />
          </View>
          <T size={20} weight="bold">Categories</T>
        </View>
        <IconButton name="search" onPress={() => nav.navigate('Search')} bg={colors.white} border />
      </View>
      {loading ? (
        <Loader />
      ) : categories.length === 0 ? (
        <Empty icon="grid-outline" title="No categories yet" message="Categories will appear here once they are added." />
      ) : (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {/* LEFT RAIL - FIXED: Better spacing, selected state now obvious */}
          <View style={styles.railWrap}>
            <ScrollView style={styles.rail} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8, gap: 4 }}>
              {categories.map((c) => {
                const on = c.id === selected;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setSelected(c.id)}
                    style={[styles.railItem, on && styles.railItemActive]}
                  >
                    {on && <View style={styles.railBar} />}
                    <View style={[styles.railIconWrap, on && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                      <Ionicons name={categoryIcon(c.name)} size={18} color={on ? colors.white : colors.primary} />
                    </View>
                    <T size={10.5} weight={on ? 'bold' : 'medium'} color={on ? colors.primary : colors.text2} align="center" numberOfLines={2} style={{ marginTop: 4 }}>
                      {c.name}
                    </T>
                    {/* Count badge for subcategories */}
                    {(c.sub_categories?.length ?? 0) > 0 && (
                      <View style={[styles.countBadge, on && { backgroundColor: colors.primarySoft, borderColor: '#FFE0C7' }]}>
                        <T size={9} weight="bold" color={on ? colors.primary : colors.muted}>{c.sub_categories!.length}</T>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView style={{ flex: 1, backgroundColor: colors.white }} contentContainerStyle={{ padding: 14, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
            {current && (
              <>
                <Pressable onPress={() => nav.navigate('ProductList', { category: current.slug, title: current.name })} style={[shadow.sm, { borderRadius: radius.lg }]} >
                  <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
                    <View style={{ flex: 1, zIndex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
                          <T size={10} weight="bold" color={colors.white}>{current.sub_categories?.length ?? 0} subcategories</T>
                        </View>
                      </View>
                      <T size={19} weight="bold" color={colors.white} numberOfLines={1}>
                        {current.name}
                      </T>
                      <T size={11.5} color="#FFD9BD" numberOfLines={2} style={{ marginTop: 2, lineHeight: 16 }}>
                        {current.description || `Discover premium ${current.name.toLowerCase()} curated for you`}
                      </T>
                      <View style={styles.bannerBtn}>
                        <T size={11} weight="bold" color={colors.white}>Explore</T>
                        <Ionicons name="arrow-forward" size={12} color={colors.white} />
                      </View>
                    </View>
                    <View style={styles.bannerImageWrap}>
                      {!!current.image ? (
                        <Img uri={current.image} fit="cover" style={{ width: 68, height: 68, borderRadius: 16 }} />
                      ) : (
                        <View style={styles.bannerIconFallback}>
                          <Ionicons name={categoryIcon(current.name)} size={30} color={colors.white} />
                        </View>
                      )}
                    </View>
                    {/* Decorative glow */}
                    <View style={styles.bannerGlow} />
                  </LinearGradient>
                </Pressable>

                {/* SUBCATEGORIES - FIXED LAYOUT BUG: Proper grid with consistent card heights */}
                <View style={styles.sectionHeader}>
                  <T size={15} weight="bold">Subcategories</T>
                  <T size={12} color={colors.muted}>{current.sub_categories?.length ?? 0} items</T>
                </View>

                {(current.sub_categories?.length ?? 0) > 0 ? (
                  <View style={styles.grid}>
                    {current.sub_categories!.map((s) => (
                      <Pressable
                        key={s.id}
                        onPress={() => nav.navigate('ProductList', { category: s.slug, title: s.name })}
                        style={({ pressed }) => [styles.sub, shadow.sm, pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}
                      >
                        <View style={styles.subImageWrap}>
                          {s.image ? (
                            <Img uri={s.image} style={{ width: 52, height: 52, borderRadius: 12 }} />
                          ) : (
                            <View style={styles.subIconCircle}>
                              <Ionicons name={categoryIcon(s.name)} size={24} color={colors.primary} />
                            </View>
                          )}
                        </View>
                        <T size={12} weight="medium" align="center" numberOfLines={2} style={{ marginTop: 8, minHeight: 32 }}>
                          {s.name}
                        </T>
                        <View style={styles.subArrow}>
                          <Ionicons name="chevron-forward" size={12} color={colors.muted} />
                        </View>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptySub}>
                    <View style={styles.emptySubIcon}>
                      <Ionicons name="apps-outline" size={22} color={colors.muted} />
                    </View>
                    <T size={12.5} color={colors.muted} align="center">No subcategories yet — tap View all to see products in {current.name}.</T>
                  </View>
                )}

                {(current.brands?.length ?? 0) > 0 && (
                  <>
                    <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                      <T size={15} weight="bold">Top Brands</T>
                      <T size={12} color={colors.muted}>{current.brands!.length} brands</T>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {current.brands!.map((b) => (
                        <Pressable
                          key={b.id}
                          onPress={() => nav.navigate('ProductList', { category: current.slug, brand: b.slug, title: `${b.name} ${current.name}` })}
                          style={({ pressed }) => [styles.brand, pressed && { opacity: 0.8 }]}
                        >
                          <T size={12.5} weight="bold" color={colors.text2}>{b.name}</T>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}

                <View style={{ marginTop: 22 }}>
                  <Button title={`View all ${current.name}`} variant="soft" onPress={() => nav.navigate('ProductList', { category: current.slug, title: current.name })} small iconRight="arrow-forward" />
                </View>
              </>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  headIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  railWrap: { width: 92, backgroundColor: '#F8F8FB', borderRightWidth: 1, borderColor: colors.border },
  rail: { flex: 1 },
  railItem: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: 12,
    paddingHorizontal: 6,
    marginHorizontal: 6,
    borderRadius: 16,
    position: 'relative',
  },
  railItemActive: { backgroundColor: colors.white, ...shadow.sm as any, borderWidth: 1, borderColor: colors.border },
  railBar: { position: 'absolute', left: -6, top: 14, bottom: 14, width: 3.5, borderRadius: 3, backgroundColor: colors.primary },
  railIconWrap: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  countBadge: { marginTop: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  banner: { borderRadius: radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 110, overflow: 'hidden' },
  bannerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, marginTop: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  bannerImageWrap: { width: 74, height: 74, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  bannerIconFallback: { width: 54, height: 54, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  bannerGlow: { position: 'absolute', right: -18, top: -18, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.06)' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sub: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 16,
    paddingHorizontal: 8,
    minHeight: 118,
    overflow: 'hidden',
  },
  subImageWrap: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#FFF5EE', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFE9D6' },
  subIconCircle: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  subArrow: { position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  emptySub: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 18, alignItems: 'center', gap: 8 },
  emptySubIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  brand: {
    paddingHorizontal: 14,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm as any,
  },
});
