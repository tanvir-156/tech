import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow } from '../theme';
import type { Product } from '../types';
import { Img, T } from './ui';
import { money, num, variantOf } from '../lib/format';
import { useShop } from '../store/Shop';

export function discountOf(p: Product): number {
  return Math.round(num(variantOf(p)?.discount_percentage));
}

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
  const { toggleWish, isWished } = useShop();
  const v = variantOf(product);
  const discount = discountOf(product);
  const price = num(v?.discounted_price ?? v?.price);
  const old = num(v?.price);
  const out = !v || v.stock <= 0;
  const wished = v ? isWished(v.id) : false;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, shadow.sm, width ? { width } : { flex: 1 }, pressed && { opacity: 0.93 }]}
    >
      <View style={styles.imageWrap}>
        <Img uri={image} style={styles.image} />
        {discount > 0 && (
          <View style={styles.discount}>
            <T size={10.5} weight="bold" color={colors.white}>
              -{discount}%
            </T>
          </View>
        )}
        {showWish && v && (
          <Pressable onPress={() => void toggleWish(v.id)} hitSlop={8} style={styles.heart}>
            <Ionicons name={wished ? 'heart' : 'heart-outline'} size={17} color={wished ? colors.danger : colors.text2} />
          </Pressable>
        )}
        {out && (
          <View style={styles.outBadge}>
            <T size={10} weight="bold" color={colors.white}>
              OUT OF STOCK
            </T>
          </View>
        )}
      </View>
      <View style={{ padding: 10, paddingTop: 8 }}>
        {!!product.brand && !compactMode && (
          <T size={10.5} color={colors.muted} numberOfLines={1}>
            {product.brand}
          </T>
        )}
        <T size={12.5} weight="medium" numberOfLines={2} style={{ minHeight: 36 }}>
          {product.name}
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
          <T size={14.5} weight="bold" color={colors.primary}>
            {money(price)}
          </T>
          {discount > 0 && (
            <T size={10.5} color={colors.muted} style={{ textDecorationLine: 'line-through' }}>
              {money(old)}
            </T>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  imageWrap: { backgroundColor: '#FAFAFC', height: 132, alignItems: 'center', justifyContent: 'center', padding: 10 },
  image: { width: '100%', height: '100%' },
  discount: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  heart: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  outBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(20,16,13,0.78)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
});
