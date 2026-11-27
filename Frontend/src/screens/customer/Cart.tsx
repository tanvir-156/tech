import React from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';

import {
  Button,
  Card,
  Empty,
  Img,
  Loader,
  Stepper,
  T,
} from '../../components/ui';

import { money, num } from '../../lib/format';
import { useAuth } from '../../store/Auth';
import { useShop } from '../../store/Shop';
import { useNav } from '../../navigation/hooks';

import type { CartItem } from '../../types';

const optionText = (i: CartItem) =>
  [i.ram, i.storage, i.color?.name]
    .filter(Boolean)
    .join(' · ');

export default function Cart() {

  const nav = useNav();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const {
    cart,
    cartLoading,
    cartCount,
    cartSubtotal,
    changeQty,
    removeFromCart,
    clearCart,
    reloadCart,
  } = useShop();

  const items = cart?.items ?? [];

  const savings = items.reduce(
    (t, i) =>
      t +
      Math.max(
        num(i.variant_price) - num(i.discounted_price),
        0
      ) * i.quantity,
    0
  );

  const hasProblem = items.some(
    i =>
      (i.stock ?? 999) < i.quantity ||
      (i.stock ?? 1) <= 0
  );

  // =====================================================
  // OPEN PRODUCT DETAILS
  // =====================================================

  const openProduct = (item: CartItem) => {

    if (!item.product_slug) {
      Alert.alert(
        'Product unavailable',
        'Please refresh your cart and try again.'
      );
      return;
    }

    nav.navigate('ProductDetail', {
      slug: item.product_slug,
    });

  };

  // =====================================================
  // HEADER
  // =====================================================

  const head = (
    <View
      style={[
        styles.head,
        { paddingTop: insets.top + 10 },
      ]}
    >

      <T size={20} weight="bold">
        My Cart{cartCount ? ` (${items.length})` : ''}
      </T>

      {items.length > 0 && (

        <Pressable
          onPress={() =>
            Alert.alert(
              'Clear cart',
              'Remove every item from your cart?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Clear all',
                  style: 'destructive',
                  onPress: () => void clearCart(),
                },
              ]
            )
          }
        >

          <T
            size={13}
            weight="medium"
            color={colors.primary}
          >
            Clear All
          </T>

        </Pressable>

      )}

    </View>
  );

  // =====================================================
  // NOT LOGGED IN
  // =====================================================

  if (!user) {
    return (
      <View style={styles.container}>

        {head}

        <Empty
          icon="cart-outline"
          title="Sign in to see your cart"
          message="Your cart is saved to your account so you can shop on any device."
          action="Sign in"
          onAction={() => nav.navigate('Login')}
          style={{ flex: 1 }}
        />

      </View>
    );
  }

  // =====================================================
  // CART SCREEN
  // =====================================================

  return (
    <View style={styles.container}>

      {head}

      {cartLoading && !cart ? (

        <Loader />

      ) : (

        <FlatList
          data={items}

          keyExtractor={i => String(i.id)}

          contentContainerStyle={{
            padding: 16,
            gap: 12,
            paddingBottom: 24,
            flexGrow: 1,
          }}

          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={reloadCart}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }

          ListEmptyComponent={
            <Empty
              icon="cart-outline"
              title="Your cart is empty"
              message="Browse our catalog and add something you love."
              action="Start shopping"
              onAction={() => nav.navigate('Home')}
              style={{ flex: 1 }}
            />
          }

          renderItem={({ item }) => {

            const limit = item.stock ?? 99;

            return (

              <Card>

                <View style={styles.productRow}>

                  {/* PRODUCT IMAGE */}

                  <Pressable
                    onPress={() => openProduct(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${item.product_name}`}
                  >

                    <Img
                      uri={item.product_image}
                      style={styles.thumb}
                    />

                  </Pressable>

                  <View style={{ flex: 1, minWidth: 0 }}>

                    <View style={styles.productHeader}>

                      {/* PRODUCT NAME AND VARIANT */}

                      <Pressable
                        style={{ flex: 1 }}
                        onPress={() => openProduct(item)}
                        accessibilityRole="button"
                      >

                        <T
                          size={13}
                          weight="medium"
                          numberOfLines={2}
                        >
                          {item.product_name}
                        </T>

                        {!!optionText(item) && (

                          <T
                            size={11}
                            color={colors.muted}
                            numberOfLines={1}
                            style={{ marginTop: 4 }}
                          >
                            {optionText(item)}
                          </T>

                        )}

                      </Pressable>

                      {/* REMOVE PRODUCT */}

                      <Pressable
                        onPress={() =>
                          void removeFromCart(item.id)
                        }
                        hitSlop={10}
                        accessibilityLabel="Remove product"
                      >

                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color={colors.muted}
                        />

                      </Pressable>

                    </View>

                    <View style={styles.priceRow}>

                      {/* PRODUCT PRICE */}

                      <Pressable
                        onPress={() => openProduct(item)}
                        style={{ flexShrink: 1 }}
                      >

                        <T
                          size={15}
                          weight="bold"
                          color={colors.primary}
                        >
                          {money(num(item.discounted_price))}
                        </T>

                        {num(item.variant_price) >
                          num(item.discounted_price) && (

                          <T
                            size={10.5}
                            color={colors.muted}
                            style={{
                              textDecorationLine: 'line-through',
                            }}
                          >
                            {money(num(item.variant_price))}
                          </T>

                        )}

                      </Pressable>

                      {/* QUANTITY CONTROL */}

                      <Stepper
                        small
                        value={item.quantity}
                        max={Math.max(limit, 1)}
                        onChange={q =>
                          void changeQty(item.id, q)
                        }
                      />

                    </View>

                    {/* STOCK WARNING */}

                    {limit < item.quantity && (

                      <T
                        size={11}
                        color={colors.danger}
                        style={{ marginTop: 6 }}
                      >
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

      {/* =================================================
          CART SUMMARY
      ================================================= */}

      {items.length > 0 && (

        <View
          style={[
            styles.summary,
            {
              paddingBottom:
                Math.max(insets.bottom, 12) + 4,
            },
          ]}
        >

          <Row
            label={`Subtotal (${cartCount} item${
              cartCount === 1 ? '' : 's'
            })`}
            value={money(cartSubtotal)}
          />

          {savings > 0 && (

            <Row
              label="You save"
              value={`-${money(savings)}`}
              color={colors.success}
            />

          )}

          <Row
            label="Delivery charge"
            value="Calculated at checkout"
            muted
          />

          <View style={styles.divider} />

          {/* TOTAL AMOUNT */}

          <View style={styles.totalRow}>

            <View>

              <T size={16} weight="bold">
                Total
              </T>

              <T size={10.5} color={colors.muted}>
                Excluding delivery
              </T>

            </View>

            <T
              size={20}
              weight="bold"
              color={colors.primary}
            >
              {money(cartSubtotal)}
            </T>

          </View>

          {/* DELIVERY MESSAGE */}

          <View style={styles.deliveryNotice}>

            <Ionicons
              name="information-circle-outline"
              size={17}
              color={colors.muted}
            />

            <T
              size={11.5}
              color={colors.muted}
              style={{ flex: 1 }}
            >
              Final total may change depending on delivery
              charges.
            </T>

          </View>

          {/* PROCEED TO CHECKOUT */}

          <Button
            title="Proceed to Checkout"
            iconRight="arrow-forward"
            onPress={() => nav.navigate('Checkout')}
            disabled={hasProblem}
            style={{ width: '100%' }}
          />

        </View>

      )}

    </View>
  );
}

// =========================================================
// SUMMARY ROW
// =========================================================

function Row({
  label,
  value,
  color,
  muted,
}: {
  label: string;
  value: string;
  color?: string;
  muted?: boolean;
}) {

  return (

    <View style={styles.summaryRow}>

      <T size={12.5} color={colors.muted}>
        {label}
      </T>

      <T
        size={12.5}
        weight="medium"
        color={
          color ??
          (muted ? colors.muted : colors.text)
        }
      >
        {value}
      </T>

    </View>

  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.white,
  },

  productRow: {
    flexDirection: 'row',
    gap: 12,
  },

  productHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },

  thumb: {
    width: 76,
    height: 76,
    borderRadius: 14,
    backgroundColor: '#FAFAFC',
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },

  summary: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: colors.border,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
    gap: 8,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  deliveryNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bg,
    borderRadius: 8,
    padding: 9,
    marginBottom: 12,
  },

});