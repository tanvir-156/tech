
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadow } from '../theme';
import type { Product, CartItem } from '../types';
import { Img, T } from './ui';
import { money, num, variantOf } from '../lib/format';
import { useShop } from '../store/Shop';
import { useToast } from '../store/Toast';
import { useAuth } from '../store/Auth';

// ======================================================
// DISCOUNT
// ======================================================

export function discountOf(p: Product): number {
  return Math.round(
    num(variantOf(p)?.discount_percentage)
  );
}

// ======================================================
// CART VARIANT HELPER - TS2339 FIXED
// ======================================================

function getCartVariantId(item: CartItem): number {
  const data = item as CartItem & {
    variant_id?: number;
  };

  return Number(data.variant ?? data.variant_id ?? 0);
}

// ======================================================
// PRODUCT CARD
// ======================================================

export function ProductCard({
  product,
  image,
  onPress,
  width,
  showWish = true,
  compactMode,
}: {
  product: Product;
  image?: string;
  onPress: () => void;
  width?: number;
  showWish?: boolean;
  compactMode?: boolean;
}) {
  const {
    cart,
    addToCart,
    changeQty,
    removeFromCart,
    toggleWish,
    isWished,
    compareIds,
    toggleCompare,
  } = useShop();

  const { user } = useAuth();
  const toast = useToast();

  const [cartBusy, setCartBusy] = useState(false);
  const cartBusyRef = useRef(false);

  // ====================================================
  // PRODUCT INFORMATION
  // ====================================================

  const variant = variantOf(product);

  const discount = discountOf(product);

  const price = num(
    variant?.discounted_price ?? variant?.price
  );

  const oldPrice = num(variant?.price);

  const stock = Math.max(
    0,
    Number(variant?.stock ?? 0)
  );

  const outOfStock = !variant || stock <= 0;

  const wished = variant
    ? isWished(variant.id)
    : false;

  const isCompared = compareIds.includes(product.id);

  // ====================================================
  // CART ITEM AND QUANTITY
  // ====================================================

  const cartItem = (cart?.items ?? []).find(
    (item) =>
      variant != null &&
      getCartVariantId(item) === Number(variant.id)
  );

  const cartQuantity = cartItem
    ? Math.max(0, Number(cartItem.quantity) || 0)
    : 0;

  // ====================================================
  // WISHLIST
  // ====================================================

  const handleWishlist = () => {
    if (!variant) return;

    void toggleWish(variant.id);
  };

  // ====================================================
  // COMPARE
  // ====================================================

  const handleCompare = () => {
    if (isCompared) {
      toggleCompare(product.id);

      toast(
        'Removed from compare list',
        'info'
      );

      return;
    }

    if (compareIds.length >= 4) {
      toast(
        'You can compare up to four products.',
        'info'
      );

      return;
    }

    toggleCompare(product.id);

    toast(
      'Added to compare list',
      'success'
    );
  };

  // ====================================================
  // ADD ONE PRODUCT TO CART
  // ====================================================

  const handleAddCart = async () => {
    if (!variant || cartBusyRef.current) return;

    if (!user) {
      toast(
        'Please sign in to add products to cart.',
        'info'
      );
      return;
    }

    if (outOfStock) {
      toast(
        'This product is out of stock.',
        'info'
      );
      return;
    }

    if (cartQuantity >= stock) {
      toast(
        `Only ${stock} item${stock === 1 ? '' : 's'} available.`,
        'info'
      );
      return;
    }

    cartBusyRef.current = true;
    setCartBusy(true);

    try {
      if (cartItem) {
        // Existing cart item: increase quantity.
        await changeQty(
          cartItem.id,
          cartQuantity + 1
        );

        toast(
          `Added 1 item. Quantity: ${cartQuantity + 1}`,
          'success'
        );
      } else {
        // First addition: create cart item.
        const added = await addToCart(
          variant.id,
          1
        );

        if (added) {
          toast(
            'Added 1 item to cart.',
            'success'
          );
        }
      }
    } catch {
      toast(
        'Unable to add product to cart.',
        'error'
      );
    } finally {
      cartBusyRef.current = false;
      setCartBusy(false);
    }
  };

  // ====================================================
  // REMOVE ONE PRODUCT FROM CART
  // ====================================================

  const handleRemoveCart = async () => {
    if (!cartItem || cartBusyRef.current) return;

    if (!user) {
      toast(
        'Please sign in to manage your cart.',
        'info'
      );
      return;
    }

    cartBusyRef.current = true;
    setCartBusy(true);

    try {
      if (cartQuantity <= 1) {
        // Remove cart item completely.
        await removeFromCart(cartItem.id);

        toast(
          'Product removed from cart.',
          'info'
        );
      } else {
        // Reduce quantity by one.
        await changeQty(
          cartItem.id,
          cartQuantity - 1
        );

        toast(
          `Removed 1 item. Quantity: ${cartQuantity - 1}`,
          'info'
        );
      }
    } catch {
      toast(
        'Unable to remove product from cart.',
        'error'
      );
    } finally {
      cartBusyRef.current = false;
      setCartBusy(false);
    }
  };

  // ====================================================
  // UI
  // ====================================================

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        shadow.sm,
        width ? { width } : { flex: 1 },
        pressed && { opacity: 0.93 },
      ]}
    >
      {/* ==============================================
          PRODUCT IMAGE
         ============================================== */}

      <View style={styles.imageWrap}>
        <Img
          uri={image}
          style={styles.image}
        />

        {/* DISCOUNT BADGE */}

        {discount > 0 && (
          <View style={styles.discount}>
            <T
              size={10.5}
              weight="bold"
              color={colors.white}
            >
              -{discount}%
            </T>
          </View>
        )}

        {/* WISHLIST + COMPARE */}

        <View style={styles.actionColumn}>
          {/* WISHLIST */}

          {showWish && variant && (
            <Pressable
              onPress={handleWishlist}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={
                wished
                  ? 'Remove from wishlist'
                  : 'Add to wishlist'
              }
              style={styles.actionButton}
            >
              <Ionicons
                name={
                  wished
                    ? 'heart'
                    : 'heart-outline'
                }
                size={17}
                color={
                  wished
                    ? colors.danger
                    : colors.text2
                }
              />
            </Pressable>
          )}

          {/* COMPARE */}

          <Pressable
            onPress={handleCompare}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              isCompared
                ? 'Remove from compare list'
                : 'Add to compare list'
            }
            style={[
              styles.actionButton,
              isCompared &&
                styles.compareActiveButton,
            ]}
          >
            <Ionicons
              name={
                isCompared
                  ? 'git-compare'
                  : 'git-compare-outline'
              }
              size={17}
              color={
                isCompared
                  ? colors.white
                  : colors.text2
              }
            />
          </Pressable>
        </View>

        {/* OUT OF STOCK */}

        {outOfStock && (
          <View style={styles.outBadge}>
            <T
              size={10}
              weight="bold"
              color={colors.white}
            >
              OUT OF STOCK
            </T>
          </View>
        )}
      </View>

      {/* ==============================================
          PRODUCT INFORMATION
         ============================================== */}

      <View style={styles.productInfo}>
        {/* BRAND */}

        {!!product.brand && !compactMode && (
          <T
            size={10.5}
            color={colors.muted}
            numberOfLines={1}
          >
            {product.brand}
          </T>
        )}

        {/* PRODUCT NAME */}

        <T
          size={12.5}
          weight="medium"
          numberOfLines={2}
          style={styles.productName}
        >
          {product.name}
        </T>

        {/* PRICE */}

        <View style={styles.priceRow}>
          <T
            size={14.5}
            weight="bold"
            color={colors.primary}
          >
            {money(price)}
          </T>

          {discount > 0 && (
            <T
              size={10.5}
              color={colors.muted}
              style={styles.oldPrice}
            >
              {money(oldPrice)}
            </T>
          )}
        </View>

        {/* ==============================================
            FULL-WIDTH CART CONTROLS
           ============================================== */}

        <View style={styles.cartRow}>
          {cartQuantity === 0 ? (
            // INITIAL ADD TO CART BUTTON

            <Pressable
              onPress={() => void handleAddCart()}
              disabled={cartBusy || outOfStock}
              accessibilityRole="button"
              accessibilityLabel="Add to cart"
              style={({ pressed }) => [
                styles.addCartButton,
                (cartBusy || outOfStock) &&
                  styles.disabledButton,
                pressed && styles.pressedButton,
              ]}
            >
              {cartBusy ? (
                <ActivityIndicator
                  size="small"
                  color={colors.primary}
                />
              ) : (
                <>
                  <Ionicons
                    name="cart-outline"
                    size={17}
                    color={colors.primary}
                  />

                  <T
                    size={12}
                    weight="bold"
                    color={colors.primary}
                    numberOfLines={1}
                  >
                    Add to Cart
                  </T>
                </>
              )}
            </Pressable>
          ) : (
            // QUANTITY SELECTOR

            <View style={styles.quantitySelector}>
              {/* MINUS */}

              <Pressable
                onPress={() =>
                  void handleRemoveCart()
                }
                disabled={cartBusy}
                accessibilityRole="button"
                accessibilityLabel="Remove one from cart"
                style={({ pressed }) => [
                  styles.quantityButton,
                  styles.minusButton,
                  cartBusy &&
                    styles.disabledButton,
                  pressed && styles.pressedButton,
                ]}
              >
                <Ionicons
                  name="remove"
                  size={19}
                  color={colors.primary}
                />
              </Pressable>

              {/* QUANTITY */}

              <View style={styles.quantityValue}>
                {cartBusy ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                  />
                ) : (
                  <T
                    size={14}
                    weight="bold"
                    color={colors.text}
                  >
                    {cartQuantity}
                  </T>
                )}
              </View>

              {/* PLUS */}

              <Pressable
                onPress={() =>
                  void handleAddCart()
                }
                disabled={
                  cartBusy ||
                  outOfStock ||
                  cartQuantity >= stock
                }
                accessibilityRole="button"
                accessibilityLabel="Add one to cart"
                style={({ pressed }) => [
                  styles.quantityButton,
                  styles.plusButton,
                  (cartBusy ||
                    outOfStock ||
                    cartQuantity >= stock) &&
                    styles.disabledButton,
                  pressed && styles.pressedButton,
                ]}
              >
                <Ionicons
                  name="add"
                  size={19}
                  color={colors.white}
                />
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({
  // ====================================================
  // MAIN CARD
  // ====================================================

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  // ====================================================
  // PRODUCT IMAGE
  // ====================================================

  imageWrap: {
    backgroundColor: '#FAFAFC',
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },

  image: {
    width: '100%',
    height: '100%',
  },

  // ====================================================
  // DISCOUNT BADGE
  // ====================================================

  discount: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },

  // ====================================================
  // WISHLIST + COMPARE
  // ====================================================

  actionColumn: {
    position: 'absolute',
    top: 8,
    right: 8,
    alignItems: 'center',
    gap: 7,
  },

  actionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },

  compareActiveButton: {
    backgroundColor: colors.primary,
  },

  // ====================================================
  // OUT OF STOCK
  // ====================================================

  outBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(20,16,13,0.78)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },

  // ====================================================
  // PRODUCT INFORMATION
  // ====================================================

  productInfo: {
    padding: 10,
    paddingTop: 8,
  },

  productName: {
    minHeight: 36,
  },

  // ====================================================
  // PRICE
  // ====================================================

  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
    flexWrap: 'wrap',
  },

  oldPrice: {
    textDecorationLine: 'line-through',
  },

  // ====================================================
  // FULL-WIDTH CART ROW
  // ====================================================

  cartRow: {
    marginTop: 12,
    width: '100%',
    height: 40,
    alignItems: 'stretch',
    justifyContent: 'center',
  },

  // ====================================================
  // ADD TO CART BUTTON
  // ====================================================

  addCartButton: {
    width: '100%',
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF0E4',
    borderWidth: 1,
    borderColor: '#FFD3B0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 8,
  },

  // ====================================================
  // QUANTITY SELECTOR
  // ====================================================

  quantitySelector: {
    width: '100%',
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8F8FA',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    gap: 3,
  },

  // MINUS AND PLUS BUTTONS

  quantityButton: {
    flex: 1,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  minusButton: {
    backgroundColor: '#FFF0E4',
  },

  plusButton: {
    backgroundColor: colors.primary,
  },

  // QUANTITY NUMBER

  quantityValue: {
    flex: 1,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ====================================================
  // BUTTON STATES
  // ====================================================

  disabledButton: {
    opacity: 0.4,
  },

  pressedButton: {
    opacity: 0.75,
  },
});
