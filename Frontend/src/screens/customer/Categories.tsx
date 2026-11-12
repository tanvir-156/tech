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
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={[styles.head, { paddingTop: insets.top + 10 }]}>
        <T size={20} weight="bold">
          Categories
        </T>
        <IconButton name="search" onPress={() => nav.navigate('Search')} bg={colors.bg} border={false} />
      </View>
      {loading ? (
        <Loader />
      ) : categories.length === 0 ? (
        <Empty icon="grid-outline" title="No categories yet" message="Categories will appear here once they are added." />
      ) : (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <ScrollView style={styles.rail} showsVerticalScrollIndicator={false}>
            {categories.map((c) => {
              const on = c.id === selected;
              return (
                <Pressable key={c.id} onPress={() => setSelected(c.id)} style={[styles.railItem, on && { backgroundColor: colors.white }]}>
                  {on && <View style={styles.railBar} />}
                  <Ionicons name={categoryIcon(c.name)} size={20} color={on ? colors.primary : colors.muted} />
                  <T size={10.5} weight={on ? 'bold' : 'medium'} color={on ? colors.primary : colors.text2} align="center" numberOfLines={2}>
                    {c.name}
                  </T>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            {current && (
              <>
                <Pressable onPress={() => nav.navigate('ProductList', { category: current.slug, title: current.name })} style={shadow.sm}>
                  <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
                    <View style={{ flex: 1 }}>
                      <T size={19} weight="bold" color={colors.white}>
                        {current.name}
                      </T>
                      <T size={11.5} color="#FFD9BD" numberOfLines={2}>
                        {current.description || `Explore the latest ${current.name.toLowerCase()}`}
                      </T>
                    </View>
                    {!!current.image && <Img uri={current.image} fit="cover" style={{ width: 62, height: 62, borderRadius: 14 }} />}
                  </LinearGradient>
                </Pressable>

                {(current.sub_categories?.length ?? 0) > 0 && (
                  <>
                    <T size={15} weight="bold" style={{ marginTop: 18, marginBottom: 10 }}>
                      Subcategories
                    </T>
                    <View style={styles.grid}>
                      {current.sub_categories!.map((s) => (
                        <Pressable key={s.id} onPress={() => nav.navigate('ProductList', { category: s.slug, title: s.name })} style={[styles.sub, shadow.sm]}>
                          {s.image ? <Img uri={s.image} style={{ width: 46, height: 46 }} /> : <Ionicons name={categoryIcon(s.name)} size={32} color={colors.primary} />}
                          <T size={11.5} weight="medium" align="center" numberOfLines={2}>
                            {s.name}
                          </T>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}

                {(current.brands?.length ?? 0) > 0 && (
                  <>
                    <T size={15} weight="bold" style={{ marginTop: 18, marginBottom: 10 }}>
                      Top Brands
                    </T>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {current.brands!.map((b) => (
                        <Pressable key={b.id} onPress={() => nav.navigate('ProductList', { category: current.slug, brand: b.slug, title: `${b.name} ${current.name}` })} style={styles.brand}>
                          <T size={12} weight="bold" color={colors.text2}>
                            {b.name}
                          </T>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}

                <View style={{ marginTop: 22 }}>
                  <Button title={`View all ${current.name}`} variant="soft" onPress={() => nav.navigate('ProductList', { category: current.slug, title: current.name })} small />
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
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10, backgroundColor: colors.white },
  rail: { width: 84, backgroundColor: '#F4F4F8' },
  railItem: { alignItems: 'center', gap: 5, paddingVertical: 14, paddingHorizontal: 4 },
  railBar: { position: 'absolute', left: 0, top: 10, bottom: 10, width: 3.5, borderTopRightRadius: 3, borderBottomRightRadius: 3, backgroundColor: colors.primary },
  banner: { borderRadius: radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 92 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sub: { width: '47.5%', backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 6, minHeight: 100 },
  brand: { paddingHorizontal: 14, height: 38, borderRadius: radius.md, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
});
