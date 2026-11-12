import React from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import { Button, Card, Empty, Img, Loader, Stepper, T } from '../../components/ui';
import { money, num } from '../../lib/format';
import { useAuth } from '../../store/Auth';
import { useShop } from '../../store/Shop';
import { useNav } from '../../navigation/hooks';
import type { CartItem } from '../../types';

const optionText = (i: CartItem) => [i.ram, i.storage, i.color?.name].filter(Boolean).join(' · ');

export default function Cart() {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { cart, cartLoading, cartCount, cartSubtotal, changeQty, removeFromCart, clearCart, reloadCart } = useShop();
  const items = cart?.items ?? [];
  const savings = items.reduce((t, i) => t + Math.max(num(i.variant_price) - num(i.discounted_price), 0) * i.quantity, 0);
  const hasProblem = items.some((i) => (i.stock ?? 999) < i.quantity || (i.stock ?? 1) <= 0);

  const head = (
    <View style={[styles.head, { paddingTop: insets.top + 10 }]}>
      <T size={20} weight="bold">
        My Cart{cartCount ? ` (${items.length})` : ''}
      </T>
      {items.length > 0 && (
        <Pressable
          onPress={() =>
            Alert.alert('Clear cart', 'Remove every item from your cart?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear all', style: 'destructive', onPress: () => void clearCart() },
            ])
          }
        >
          <T size={13} weight="medium" color={colors.primary}>
            Clear All
          </T>
        </Pressable>
      )}
    </View>
  );

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {head}
        <Empty icon="cart-outline" title="Sign in to see your cart" message="Your cart is saved to your account so you can shop on any device." action="Sign in" onAction={() => nav.navigate('Login')} style={{ flex: 1 }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {head}
      {cartLoading && !cart ? (
        <Loader />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={reloadCart} tintColor={colors.primary} colors={[colors.primary]} />}
          ListEmptyComponent={<Empty icon="cart-outline" title="Your cart is empty" message="Browse our catalog and add something you love." action="Start shopping" onAction={() => nav.navigate('Home')} style={{ flex: 1 }} />}
          renderItem={({ item }) => {
            const limit = item.stock ?? 99;
            return (
              <Card>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Img uri={item.product_image} style={styles.thumb} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <T size={13} weight="medium" numberOfLines={2} style={{ flex: 1 }}>
                        {item.product_name}
                      </T>
                      <Pressable onPress={() => void removeFromCart(item.id)} hitSlop={10}>
                        <Ionicons name="trash-outline" size={18} color={colors.muted} />
                      </Pressable>
                    </View>
                    {!!optionText(item) && (
                      <T size={11} color={colors.muted} numberOfLines={1}>
                        {optionText(item)}
                      </T>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                      <View>
                        <T size={15} weight="bold" color={colors.primary}>
                          {money(num(item.discounted_price))}
                        </T>
                        {num(item.variant_price) > num(item.discounted_price) && (
                          <T size={10.5} color={colors.muted} style={{ textDecorationLine: 'line-through' }}>
                            {money(num(item.variant_price))}
                          </T>
                        )}
                      </View>
                      <Stepper small value={item.quantity} max={Math.max(limit, 1)} onChange={(q) => void changeQty(item.id, q)} />
                    </View>
                    {limit < item.quantity && (
                      <T size={11} color={colors.danger} style={{ marginTop: 6 }}>
                        Only {limit} available — reduce the quantity.
                      </T>
                    )}
                  </View>
                </View>
              </Card>
            );
          }}
        />
      )}

      {items.length > 0 && (
        <View style={[styles.summary, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
          <Row label={`Subtotal (${cartCount} item${cartCount === 1 ? '' : 's'})`} value={money(cartSubtotal)} />
          {savings > 0 && <Row label="You save" value={`-${money(savings)}`} color={colors.success} />}
          <Row label="Delivery" value="Calculated at checkout" muted />
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <T size={16} weight="bold">
              Total
            </T>
            <T size={20} weight="bold" color={colors.primary}>
              {money(cartSubtotal)}
            </T>
          </View>
          <Button title="Proceed to Checkout" iconRight="arrow-forward" onPress={() => nav.navigate('Checkout')} disabled={hasProblem} />
        </View>
      )}
    </View>
  );
}

function Row({ label, value, color, muted }: { label: string; value: string; color?: string; muted?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
      <T size={12.5} color={colors.muted}>
        {label}
      </T>
      <T size={12.5} weight="medium" color={color ?? (muted ? colors.muted : colors.text)}>
        {value}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.white },
  thumb: { width: 76, height: 76, borderRadius: 14, backgroundColor: '#FAFAFC' },
  summary: { backgroundColor: colors.white, paddingHorizontal: 16, paddingTop: 14, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: colors.border },
});
