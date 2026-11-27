import React from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow } from '../../theme';
import { Button, Card, Empty, Header, Img, T } from '../../components/ui';
import { money, num } from '../../lib/format';
import { useAuth } from '../../store/Auth';
import { useShop } from '../../store/Shop';
import { useNav } from '../../navigation/hooks';

export default function Wishlist() {
  const nav = useNav();
  const { user } = useAuth();
  const { wishlist, reloadWishlist, removeWish, addToCart, compareIds } = useShop();
  const items = wishlist?.items ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title={`My Wishlist${items.length ? ` (${items.length})` : ''}`} />
      {!user ? (
        <Empty icon="heart-outline" title="Sign in to use your wishlist" action="Sign in" onAction={() => nav.navigate('Login')} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={reloadWishlist} tintColor={colors.primary} colors={[colors.primary]} />}
          ListEmptyComponent={<Empty icon="heart-outline" title="Nothing saved yet" message="Tap the heart on any product to save it here." action="Discover products" onAction={() => nav.navigate('ProductList', { title: 'All products' })} style={{ flex: 1 }} />}
          ListFooterComponent={
            items.length > 0 ? (
              <View style={{ marginTop: 8 }}>
                {/* COMPARISON OPTION BELOW WISHLIST - as requested */}
                <Card style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, ...shadow.sm as any }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="git-compare-outline" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <T size={13} weight="bold">Compare your favourites</T>
                      <T size={11.5} color={colors.muted}>
                        {compareIds.length ? `${compareIds.length} product(s) selected for compare` : 'Add products to compare specs side-by-side'}
                      </T>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                    <View style={{ flex: 1 }}>
                      <Button title="Go to Compare" icon="git-compare" small onPress={() => nav.navigate('Compare')} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button title="Browse Products" variant="ghost" small onPress={() => nav.navigate('ProductList', { title: 'All products' })} />
                    </View>
                  </View>
                  {items.length > 1 && (
                    <T size={11} color={colors.muted} align="center" style={{ marginTop: 8 }}>
                      Tip: Open any product → tap Compare → then view here
                    </T>
                  )}
                </Card>

                {/* Quick add to compare from wishlist */}
                <Card style={{ marginTop: 12, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' }}>
                  <T size={12} weight="bold" color={colors.muted} align="center">Wishlist items are not auto-compared. Use the product page's Compare button to add them.</T>
                </Card>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <Card onPress={() => nav.navigate('ProductDetail', { slug: item.product_slug, id: item.product_id, name: item.product_name })}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Img uri={item.image} style={{ width: 80, height: 80, borderRadius: 14, backgroundColor: '#FAFAFC' }} />
                <View style={{ flex: 1 }}>
                  <T size={13} weight="medium" numberOfLines={2}>
                    {item.product_name}
                  </T>
                  <T size={11} color={colors.muted}>
                    {item.category}
                  </T>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                    <View style={{ flex: 1 }}>
                      <T size={15} weight="bold" color={colors.primary}>
                        {money(num(item.discounted_price))}
                      </T>
                      {!item.is_available && (
                        <T size={11} color={colors.danger}>
                          Out of stock
                        </T>
                      )}
                    </View>
                    <Pressable
                      onPress={() => item.is_available && void addToCart(item.variant_id, 1)}
                      style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: item.is_available ? colors.primary : colors.borderStrong, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Ionicons name="cart-outline" size={19} color={colors.white} />
                    </Pressable>
                  </View>
                </View>
                <Pressable onPress={() => void removeWish(item.id)} hitSlop={10} style={{ alignSelf: 'flex-start' }}>
                  <Ionicons name="heart" size={22} color={colors.danger} />
                </Pressable>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}
