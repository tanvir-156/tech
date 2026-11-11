import React, { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../state/AppContext';
import type { OrderStatus, Product } from '../lib/types';
import { money } from '../lib/utils';
export const colors = {
  ink: '#111322',
  orange: '#FF6508',
  orangeDark: '#F34A00',
  muted: '#7B7D90',
  bg: '#F7F7FC',
  card: '#FFFFFF',
  line: '#EAEAF2',
  green: '#149368',
  red: '#E94D65',
  purple: '#6D48D9',
  blue: '#3578E5',
};
const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};
export function Txt({
  children,
  size = 14,
  weight = 'regular',
  color = colors.ink,
  style,
  numberOfLines,
  ...rest
}: {
  children?: ReactNode;
  size?: number;
  weight?: keyof typeof fonts;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  testID?: string;
}) {
  return (
    <Text
      {...rest}
      numberOfLines={numberOfLines}
      style={[{ fontFamily: fonts[weight], fontSize: size, lineHeight: size * 1.45, color }, style]}
    >
      {children}
    </Text>
  );
}
export function Icon({
  name,
  size = 22,
  color = colors.ink,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  return (
    <Ionicons
      name={name as React.ComponentProps<typeof Ionicons>['name']}
      size={size}
      color={color}
    />
  );
}
export function IconButton({
  name,
  onPress,
  color = colors.ink,
  size = 22,
  label,
  style,
}: {
  name: string;
  onPress: () => void;
  color?: string;
  size?: number;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label || name.replace(/-outline$/, '').replace(/-/g, ' ')}
      onPress={onPress}
      style={({ pressed }) => [s.iconButton, style, { opacity: pressed ? 0.55 : 1 }]}
    >
      <Icon name={name} size={size} color={color} />
    </Pressable>
  );
}
export function Button({
  title,
  onPress,
  icon,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  small = false,
}: {
  title: string;
  onPress: () => void;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'dark';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const primary = variant === 'primary',
    light = variant === 'secondary' || variant === 'outline';
  const body = (
    <View
      style={[s.buttonInner, { minHeight: small ? 40 : 52, paddingHorizontal: small ? 14 : 20 }]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={light ? colors.orange : '#fff'} />
      ) : (
        <>
          {icon && (
            <Icon name={icon} size={small ? 17 : 20} color={light ? colors.orange : '#fff'} />
          )}
          <Txt weight="semibold" size={small ? 12 : 14} color={light ? colors.orange : '#fff'}>
            {title}
          </Txt>
        </>
      )}
    </View>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        { borderRadius: 15, overflow: 'hidden', opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
        primary && s.primaryShadow,
        style,
      ]}
    >
      {primary ? (
        <LinearGradient
          colors={[colors.orange, colors.orangeDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {body}
        </LinearGradient>
      ) : (
        <View
          style={{
            backgroundColor:
              variant === 'dark'
                ? colors.ink
                : variant === 'danger'
                  ? colors.red
                  : variant === 'secondary'
                    ? '#FFF0E6'
                    : 'transparent',
            borderWidth: variant === 'outline' ? 1 : 0,
            borderColor: colors.orange,
            borderRadius: 15,
          }}
        >
          {body}
        </View>
      )}
    </Pressable>
  );
}
export function Brand({
  light = false,
  admin = false,
  size = 24,
}: {
  light?: boolean;
  admin?: boolean;
  size?: number;
}) {
  return (
    <View style={[styles.row, { gap: 8 }]}>
      <Image
        source={require('../../assets/icon.png')}
        accessibilityIgnoresInvertColors
        style={{ width: size + 12, height: size + 12, borderRadius: 11 }}
      />
      <View style={styles.row}>
        <Txt
          size={size}
          weight="bold"
          color={light ? '#fff' : colors.ink}
          style={{ letterSpacing: -1 }}
        >
          tech
          <Txt size={size} weight="bold" color={colors.orange}>
            nest
          </Txt>
        </Txt>
        {admin && (
          <Txt
            size={10}
            weight="medium"
            color={light ? '#C7C6D0' : colors.muted}
            style={{ marginLeft: 6, marginTop: 6 }}
          >
            ADMIN
          </Txt>
        )}
      </View>
    </View>
  );
}
export function Header({
  title,
  subtitle,
  back = true,
  right,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
}) {
  const app = useApp();
  return (
    <View style={s.header}>
      {back && (
        <IconButton
          name="arrow-back"
          label="Go back"
          onPress={app.back}
          style={{ marginLeft: -12, marginRight: 7 }}
        />
      )}
      <View style={{ flex: 1 }}>
        <Txt size={21} weight="bold" style={{ letterSpacing: -0.7 }}>
          {title}
        </Txt>
        {subtitle && (
          <Txt size={11} color={colors.muted} style={{ marginTop: 3 }}>
            {subtitle}
          </Txt>
        )}
      </View>
      {right}
    </View>
  );
}
export function Card({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, style, { opacity: pressed ? 0.7 : 1 }]}
    >
      {children}
    </Pressable>
  ) : (
    <View style={[styles.card, style]}>{children}</View>
  );
}
export function Badge({
  text,
  tone = 'orange',
}: {
  text: string;
  tone?: 'orange' | 'green' | 'blue' | 'red' | 'neutral';
}) {
  const tones = {
    orange: ['#FFF0DE', '#D65B00'],
    green: ['#E1F6ED', '#10825A'],
    blue: ['#E7F0FF', '#2E6BCB'],
    red: ['#FFE9EF', '#CF3B58'],
    neutral: ['#EFF0F7', '#76788A'],
  };
  return (
    <View
      style={{
        backgroundColor: tones[tone][0],
        borderRadius: 7,
        paddingVertical: 4,
        paddingHorizontal: 8,
        alignSelf: 'flex-start',
      }}
    >
      <Txt size={10} weight="semibold" color={tones[tone][1]}>
        {text}
      </Txt>
    </View>
  );
}
export function Field({
  label,
  error,
  style,
  ...props
}: TextInputProps & { label?: string; error?: string; style?: StyleProp<TextStyle> }) {
  return (
    <View style={{ gap: 7 }}>
      {label && (
        <Txt size={12} weight="semibold">
          {label}
        </Txt>
      )}
      <TextInput
        placeholderTextColor="#9395A7"
        accessibilityLabel={label || props.placeholder}
        {...props}
        style={[
          s.input,
          props.multiline && { minHeight: 100, textAlignVertical: 'top' },
          error && { borderColor: colors.red },
          style,
        ]}
      />
      {error && (
        <Txt size={11} color={colors.red}>
          {error}
        </Txt>
      )}
    </View>
  );
}
export function Chip({
  label,
  active = false,
  onPress,
  icon,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  icon?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        s.chip,
        {
          backgroundColor: active ? colors.orange : '#F0F0F7',
          borderColor: active ? colors.orange : '#EAEAF2',
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      {icon && <Icon name={icon} size={15} color={active ? '#FFF' : colors.muted} />}
      <Txt size={11} weight={active ? 'semibold' : 'medium'} color={active ? '#FFF' : colors.ink}>
        {label}
      </Txt>
    </Pressable>
  );
}
export function Price({ value, old, size = 18 }: { value: number; old?: number; size?: number }) {
  return (
    <View style={[styles.row, { gap: 7, flexWrap: 'wrap' }]}>
      <Txt size={size} color={colors.orangeDark} weight="bold" style={{ letterSpacing: -0.5 }}>
        {money(value)}
      </Txt>
      {old !== undefined && old > value && (
        <Txt
          size={Math.max(10, size - 6)}
          color={colors.muted}
          style={{ textDecorationLine: 'line-through' }}
        >
          {money(old)}
        </Txt>
      )}
    </View>
  );
}
export function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  const app = useApp();
  const saved = app.wishlist.includes(product.id);
  const discount =
    product.oldPrice > product.price ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
  return (
    <Card
      style={[s.productCard, compact && { width: 168 }]}
      onPress={() => app.navigate('product', { id: product.id })}
    >
      <View style={s.productArt}>
        <Image source={product.image} style={{ width: '92%', height: 124 }} resizeMode="contain" />
        <View style={{ position: 'absolute', top: 4, left: 4 }}>
          {discount > 0 && <Badge text={`−${discount}%`} tone="orange" />}
        </View>
        <IconButton
          name={saved ? 'heart' : 'heart-outline'}
          color={saved ? colors.red : colors.muted}
          label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
          onPress={() => {
            void app.toggleWishlist(product.id).catch((e) => app.notify(e.message));
          }}
          style={s.saveButton}
          size={17}
        />
      </View>
      <View style={{ padding: 12, paddingTop: 9, gap: 5 }}>
        <Txt
          size={9}
          weight="semibold"
          color={colors.muted}
          style={{ letterSpacing: 1, textTransform: 'uppercase' }}
        >
          {product.brand}
        </Txt>
        <Txt size={12} weight="semibold" numberOfLines={2} style={{ minHeight: 35 }}>
          {product.name}
        </Txt>
        <View style={[styles.row, { gap: 4 }]}>
          {product.reviews > 0 ? (
            <>
              <Icon name="star" size={10} color="#FFA713" />
              <Txt size={10} weight="medium">
                {product.rating.toFixed(1)}
              </Txt>
              <Txt size={9} color={colors.muted}>
                ({product.reviews})
              </Txt>
            </>
          ) : (
            <Txt size={10} color={colors.muted}>
              No reviews yet
            </Txt>
          )}
        </View>
        <View style={[styles.between, { marginTop: 4 }]}>
          <Price value={product.price} size={14} />
          <IconButton
            name={product.stock > 0 ? 'add' : 'close'}
            label={`Add ${product.name} to cart`}
            onPress={() => {
              void app
                .addToCart(product.id)
                .then(() => app.notify('Added to your cart'))
                .catch((e) => app.notify(e.message));
            }}
            color={colors.orange}
            size={20}
            style={{ backgroundColor: '#FFF0E7', width: 30, height: 30, borderRadius: 9 }}
          />
        </View>
      </View>
    </Card>
  );
}
export function ProductRow({
  product,
  children,
  onPress,
}: {
  product: Product;
  children?: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Card
      onPress={onPress}
      style={{ padding: 13, flexDirection: 'row', gap: 13, alignItems: 'center' }}
    >
      <View
        style={{ width: 68, height: 68, borderRadius: 12, backgroundColor: '#F8F8FC', padding: 5 }}
      >
        <Image
          source={product.image}
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
        />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Txt size={12} weight="semibold" numberOfLines={2}>
          {product.name}
        </Txt>
        <Txt size={10} color={colors.muted}>
          {product.brand} · {product.category}
        </Txt>
        <Price value={product.price} size={14} />
        {children}
      </View>
      {onPress && <Icon name="chevron-forward" size={16} color={colors.muted} />}
    </Card>
  );
}
export function Empty({
  icon,
  title,
  message,
  action,
  onAction,
}: {
  icon: string;
  title: string;
  message: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={{ padding: 30, alignItems: 'center', gap: 12, marginVertical: 32 }}>
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 27,
          backgroundColor: '#FFF0E6',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 6,
        }}
      >
        <Icon name={icon} size={35} color={colors.orange} />
      </View>
      <Txt size={21} weight="bold" style={{ textAlign: 'center', letterSpacing: -0.7 }}>
        {title}
      </Txt>
      <Txt size={13} color={colors.muted} style={{ textAlign: 'center', maxWidth: 280 }}>
        {message}
      </Txt>
      {action && onAction && <Button title={action} onPress={onAction} style={{ marginTop: 12 }} />}
    </View>
  );
}
export function Section({
  title,
  eyebrow,
  action,
  onAction,
  children,
}: {
  title: string;
  eyebrow?: string;
  action?: string;
  onAction?: () => void;
  children?: ReactNode;
}) {
  return (
    <View style={{ gap: 14 }}>
      <View style={styles.between}>
        <View>
          {eyebrow && (
            <Txt
              size={9}
              weight="semibold"
              color={colors.orange}
              style={{ letterSpacing: 1.5, marginBottom: 4 }}
            >
              {eyebrow.toUpperCase()}
            </Txt>
          )}
          <Txt size={20} weight="bold" style={{ letterSpacing: -0.7 }}>
            {title}
          </Txt>
        </View>
        {action && (
          <Pressable accessibilityRole="button" onPress={onAction} hitSlop={10}>
            <Txt size={11} weight="semibold" color={colors.orange}>
              {action} ↗
            </Txt>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}
export function Screen({
  children,
  scroll = true,
  style,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  return scroll ? (
    <ScrollView
      style={[styles.page, style]}
      contentContainerStyle={[{ paddingBottom: 28 }, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.page, style, contentStyle]}>{children}</View>
  );
}
export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.line }} />;
}
export function Progress({ status }: { status: OrderStatus }) {
  const steps = ['Processing', 'Confirmed', 'Shipped', 'Delivered'],
    index = steps.indexOf(status);
  if (status === 'Cancelled') return <Badge text="Order cancelled" tone="red" />;
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 16 }}>
      {steps.map((step, i) => (
        <View key={step} style={{ flex: 1, alignItems: 'center', gap: 9 }}>
          {i < 3 && (
            <View
              style={{
                position: 'absolute',
                left: '50%',
                right: '-50%',
                top: 9,
                height: 2,
                backgroundColor: i < index ? colors.orange : '#DFDFEB',
              }}
            />
          )}
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              borderWidth: i <= index ? 0 : 2,
              borderColor: '#CDCFDE',
              backgroundColor: i <= index ? colors.orange : colors.card,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {i <= index && <Icon name="checkmark" size={12} color="#fff" />}
          </View>
          <Txt
            size={9}
            weight={i === index ? 'semibold' : 'regular'}
            color={i <= index ? colors.orange : colors.muted}
          >
            {i === 0 ? 'Placed' : step}
          </Txt>
        </View>
      ))}
    </View>
  );
}
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 22, gap: 20 },
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EEEEF5',
    padding: 16,
    shadowColor: '#29294C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.025,
    shadowRadius: 12,
    elevation: 1,
  },
  title: { fontFamily: fonts.bold, fontSize: 25, color: colors.ink, letterSpacing: -0.8 },
  body: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink, lineHeight: 21 },
  caption: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, lineHeight: 16 },
});
const s = StyleSheet.create({
  header: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 20,
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  primaryShadow: {
    shadowColor: colors.orangeDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 2,
  },
  brandMark: { backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' },
  input: {
    backgroundColor: '#FCFCFF',
    borderWidth: 1,
    borderColor: '#DFE0ED',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    minHeight: 48,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.ink,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  productCard: { padding: 0, overflow: 'hidden', flex: 1, minWidth: 140 },
  productArt: {
    height: 143,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 6,
    borderRadius: 13,
  },
  saveButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: '#FFFFFFE6',
  },
});
