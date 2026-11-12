import React, { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients, radius, shadow } from '../../theme';
import { Img, LightStatus, SearchBar, SectionHeader, T, IconButton, Skeleton } from '../../components/ui';
import { Wordmark } from '../../components/Brand';
import { ProductCard } from '../../components/ProductCard';
import { useAsync } from '../../lib/hooks';
import { getBrands, getImageIndex, useCategories } from '../../lib/catalog';
import { categoryIcon, listProducts } from '../../lib/products';
import { api, endpoints } from '../../lib/api';
import { asList, initials, priceOf, money } from '../../lib/format';
import { useAuth } from '../../store/Auth';
import { useNav } from '../../navigation/hooks';
import type { Brand, Notice, Product } from '../../types';

function useCountdown() {
  const [left, setLeft] = useState(() => msToMidnight());
  useEffect(() => {
    const t = setInterval(() => setLeft(msToMidnight()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.floor(left / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}
function msToMidnight() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  return end.getTime() - now.getTime();
}

export default function Home() {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { categories } = useCategories();
  const countdown = useCountdown();

  const feed = useAsync(async () => {
    const [deals, featured, latest, brands, images, notices] = await Promise.all([
      listProducts({ on_sale: true, in_stock: true, limit: 10 }).catch(() => null),
      listProducts({ is_featured: true, limit: 10 }).catch(() => null),
      listProducts({ ordering: '-created_at', limit: 10 }).catch(() => null),
      getBrands().catch(() => [] as Brand[]),
      getImageIndex().catch(() => new Map<number, string[]>()),
      api<unknown>(`${endpoints.notices}?is_active=true&is_featured=true`, { auth: false }).catch(() => []),
    ]);
    return {
      deals: deals?.results ?? [],
      featured: featured?.results ?? [],
      latest: latest?.results ?? [],
      brands,
      images,
      notice: asList<Notice>(notices)[0] ?? null,
    };
  }, []);

  const d = feed.data;
  const open = (p: Product) => nav.navigate('ProductDetail', { slug: p.slug, id: p.id, name: p.name });
  const hero = d?.featured[0] ?? d?.latest[0];
  const quick = categories.slice(0, 3);

  const row = (items: Product[]) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
      {items.map((p) => (
        <ProductCard key={p.id} product={p} image={d?.images.get(p.id)?.[0]} width={160} onPress={() => open(p)} />
      ))}
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LightStatus />
      <View style={[styles.top, { paddingTop: insets.top + 10 }]}>
        <View style={styles.topRow}>
          <Wordmark size={24} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <IconButton name="notifications-outline" onPress={() => nav.navigate('Notifications')} bg="rgba(255,255,255,0.12)" color={colors.white} border={false} />
            <Pressable onPress={() => (user ? nav.navigate('Account') : nav.navigate('Login'))} style={styles.avatar}>
              {user ? (
                <T size={13} weight="bold" color={colors.white}>
                  {initials(user.first_name, user.last_name, user.email)}
                </T>
              ) : (
                <Ionicons name="person" size={18} color={colors.white} />
              )}
            </Pressable>
          </View>
        </View>
        <SearchBar onPress={() => nav.navigate('Search')} style={{ marginTop: 14, backgroundColor: colors.white }} placeholder="Search for products, brands…" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={feed.refreshing} onRefresh={feed.refresh} tintColor={colors.primary} colors={[colors.primary]} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Hero */}
        <Pressable onPress={() => hero && open(hero)} style={[styles.heroWrap, shadow.md]}>
          <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <T size={13} color="#FFD9BD" weight="medium">
                {hero?.category ?? 'New Arrival'}
              </T>
              <T size={22} weight="bold" color={colors.white} numberOfLines={2} style={{ marginTop: 2 }}>
                {hero ? hero.name : 'Next-gen tech, delivered'}
              </T>
              {hero && (
                <T size={14} weight="bold" color="#FFD9BD" style={{ marginTop: 4 }}>
                  From {money(priceOf(hero))}
                </T>
              )}
              <View style={styles.heroBtn}>
                <T size={12} weight="bold" color={colors.white}>
                  Shop Now
                </T>
                <Ionicons name="arrow-forward" size={13} color={colors.white} />
              </View>
            </View>
            <Img uri={hero ? d?.images.get(hero.id)?.[0] : undefined} style={{ width: 130, height: 130 }} />
          </LinearGradient>
        </Pressable>

        {!!d?.notice && (
          <Pressable onPress={() => nav.navigate('Notifications')} style={styles.notice}>
            <Ionicons name="megaphone-outline" size={18} color={colors.primary} />
            <T size={12.5} weight="medium" numberOfLines={1} style={{ flex: 1 }}>
              {d.notice.title}
            </T>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>
        )}

        {/* Quick categories */}
        <View style={styles.quickRow}>
          {quick.map((c) => (
            <QuickItem key={c.id} icon={categoryIcon(c.name)} label={c.name} onPress={() => nav.navigate('ProductList', { category: c.slug, title: c.name })} />
          ))}
          <QuickItem icon="hardware-chip-outline" label="PC Builder" onPress={() => nav.navigate('PCBuilder')} />
          <QuickItem icon="pricetag-outline" label="Deals" onPress={() => nav.navigate('ProductList', { onSale: true, title: 'Deals' })} />
        </View>

        {/* Deals */}
        {(feed.loading || (d?.deals.length ?? 0) > 0) && (
          <View style={{ marginTop: 6 }}>
            <View style={styles.dealsHead}>
              <T size={17} weight="bold">
                Deals of the Day
              </T>
              <View style={styles.timer}>
                <Ionicons name="time-outline" size={13} color={colors.primary} />
                <T size={12} weight="bold" color={colors.primary}>
                  {countdown}
                </T>
              </View>
            </View>
            {feed.loading ? <Loading /> : row(d!.deals)}
          </View>
        )}

        {(d?.featured.length ?? 0) > 0 && (
          <View style={{ marginTop: 22 }}>
            <SectionHeader style={{ paddingHorizontal: 16 }} title="Featured" action="See all" onAction={() => nav.navigate('ProductList', { featured: true, title: 'Featured' })} />
            {row(d!.featured)}
          </View>
        )}

        {(d?.brands.length ?? 0) > 0 && (
          <View style={{ marginTop: 22 }}>
            <SectionHeader style={{ paddingHorizontal: 16 }} title="Top Brands" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
              {d!.brands.slice(0, 14).map((b) => (
                <Pressable key={b.id} onPress={() => nav.navigate('ProductList', { brand: b.slug, title: b.name })} style={styles.brand}>
                  <T size={13} weight="bold" color={colors.text2}>
                    {b.name}
                  </T>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {(d?.latest.length ?? 0) > 0 && (
          <View style={{ marginTop: 22 }}>
            <SectionHeader style={{ paddingHorizontal: 16 }} title="New Arrivals" action="See all" onAction={() => nav.navigate('ProductList', { title: 'New Arrivals' })} />
            <View style={{ paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {d!.latest.slice(0, 6).map((p) => (
                <View key={p.id} style={{ width: '48%' }}>
                  <ProductCard product={p} image={d?.images.get(p.id)?.[0]} onPress={() => open(p)} />
                </View>
              ))}
            </View>
          </View>
        )}

        {feed.error && !d && (
          <View style={{ padding: 24 }}>
            <T color={colors.muted} align="center">
              {feed.error}
            </T>
          </View>
        )}
        <View style={{ height: 8 }} />
      </ScrollView>
    </View>
  );
}

function Loading() {
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16 }}>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} w={160} h={210} r={18} />
      ))}
    </View>
  );
}

function QuickItem({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ alignItems: 'center', width: 62 }}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={24} color={colors.primary} />
      </View>
      <T size={10.5} weight="medium" numberOfLines={1} style={{ marginTop: 6 }} align="center">
        {label}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { backgroundColor: colors.dark, paddingHorizontal: 16, paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  heroWrap: { marginHorizontal: 16, marginTop: 16, borderRadius: 22 },
  hero: { borderRadius: 22, padding: 18, flexDirection: 'row', alignItems: 'center', minHeight: 158, overflow: 'hidden' },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    marginTop: 12,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: colors.primarySofter,
    borderWidth: 1,
    borderColor: '#FFE0C7',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 18 },
  quickIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, ...shadow.sm },
  dealsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primarySoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  brand: { paddingHorizontal: 18, height: 44, borderRadius: radius.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
});

