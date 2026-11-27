
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

import { colors, font, gradients, radius, statusTone } from '../theme';
import { mediaUrl } from '../config';

export type IconName = keyof typeof Ionicons.glyphMap;

// ======================================================
// STATUS BAR
// ======================================================

export function LightStatus() {
  const focused = useIsFocused();
  return focused ? <StatusBar style="light" /> : null;
}

// ======================================================
// TYPOGRAPHY
// ======================================================

export function T({
  children,
  style,
  size = 14,
  weight = 'regular',
  color = colors.text,
  numberOfLines,
  align,
}: {
  children?: React.ReactNode;
  style?: StyleProp<any>;
  size?: number;
  weight?: 'regular' | 'medium' | 'bold';
  color?: string;
  numberOfLines?: number;
  align?: 'left' | 'center' | 'right';
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: font[weight],
          fontSize: size,
          color,
          lineHeight: Math.round(size * 1.42),
          textAlign: align,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

// ======================================================
// BUTTONS
// ======================================================

type BtnVariant =
  | 'primary'
  | 'outline'
  | 'ghost'
  | 'dark'
  | 'danger'
  | 'soft';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  iconRight,
  loading,
  disabled,
  small,
  style,
  full = true,
}: {
  title: string;
  onPress?: () => void;
  variant?: BtnVariant;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  full?: boolean;
}) {
  const off = Boolean(disabled || loading);
  const height = small ? 40 : 50;

  const foreground =
    variant === 'primary' ||
    variant === 'dark' ||
    variant === 'danger'
      ? colors.white
      : variant === 'outline' || variant === 'soft'
        ? colors.primary
        : colors.text2;

  const background =
    variant === 'primary'
      ? colors.primary
      : variant === 'dark'
        ? colors.dark
        : variant === 'danger'
          ? colors.danger
          : variant === 'soft'
            ? colors.primarySoft
            : colors.white;

  const borderColor =
    variant === 'outline'
      ? colors.primary
      : variant === 'ghost'
        ? colors.borderStrong
        : variant === 'soft'
          ? colors.primarySoft
          : background;

  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{
        disabled: off,
        busy: Boolean(loading),
      }}
      style={({ pressed }) => [
        styles.button,
        {
          height,
          backgroundColor: background,
          borderColor,
          alignSelf: full ? 'stretch' : 'auto',
          paddingHorizontal: small ? 12 : 18,
          opacity: off ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <View style={styles.btnInner}>
          {icon && (
            <Ionicons
              name={icon}
              size={small ? 16 : 19}
              color={foreground}
            />
          )}

          <Text
            numberOfLines={1}
            style={{
              fontFamily: font.medium,
              fontSize: small ? 12.5 : 14,
              color: foreground,
              textAlign: 'center',
              flexShrink: 1,
            }}
          >
            {title}
          </Text>

          {iconRight && (
            <Ionicons
              name={iconRight}
              size={small ? 16 : 19}
              color={foreground}
            />
          )}
        </View>
      )}
    </Pressable>
  );
}

// ======================================================
// ICON BUTTON
// ======================================================

export function IconButton({
  name,
  onPress,
  size = 40,
  color = colors.text,
  bg = colors.white,
  badge,
  style,
  border = true,
}: {
  name: IconName;
  onPress?: () => void;
  size?: number;
  color?: string;
  bg?: string;
  badge?: number;
  style?: StyleProp<ViewStyle>;
  border?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: radius.md,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: border ? 1 : 0,
          borderColor: colors.border,
          opacity: pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      <Ionicons
        name={name}
        size={Math.round(size * 0.48)}
        color={color}
      />

      {!!badge && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// ======================================================
// HEADER
// ======================================================

export function Header({
  title,
  subtitle,
  back = true,
  right,
  dark,
  onBack,
  left,
  style,
}: {
  title?: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
  left?: React.ReactNode;
  dark?: boolean;
  onBack?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const fg = dark ? colors.white : colors.text;

  const goBack = () => {
    if (onBack) onBack();
    else if (nav.canGoBack()) nav.goBack();
  };

  return (
    <View
      style={[
        {
          paddingTop: insets.top + 8,
          paddingBottom: 10,
          paddingHorizontal: 16,
          backgroundColor: dark ? colors.dark : colors.white,
        },
        style,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerSide}>
          {left ??
            (back ? (
              <IconButton
                name="chevron-back"
                onPress={goBack}
                bg={dark ? 'rgba(255,255,255,0.12)' : colors.bg}
                color={fg}
                border={false}
                size={38}
              />
            ) : null)}
        </View>

        <View style={styles.headerTitle}>
          {!!title && (
            <Text
              numberOfLines={1}
              style={{
                fontFamily: font.bold,
                fontSize: 17,
                color: fg,
              }}
            >
              {title}
            </Text>
          )}

          {!!subtitle && (
            <Text
              numberOfLines={1}
              style={{
                fontFamily: font.regular,
                fontSize: 11,
                color: dark ? '#C9BFB8' : colors.muted,
              }}
            >
              {subtitle}
            </Text>
          )}
        </View>

        <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>
          {right}
        </View>
      </View>
    </View>
  );
}

// ======================================================
// CARD
// ======================================================

export function Card({
  children,
  style,
  onPress,
  padded = true,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
}) {
  const cardStyle = [
    styles.card,
    padded && { padding: 14 },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          ...cardStyle,
          pressed && { opacity: 0.85 },
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

// ======================================================
// STATUS BADGE
// ======================================================

export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const tone = statusTone(status);

  return (
    <View
      style={[
        styles.statusBadge,
        { backgroundColor: tone.bg },
      ]}
    >
      <Text
        style={{
          fontFamily: font.bold,
          fontSize: 11,
          color: tone.fg,
        }}
      >
        {label ?? tone.label}
      </Text>
    </View>
  );
}

// ======================================================
// PILL
// ======================================================

export function Pill({
  text,
  bg = colors.primarySoft,
  fg = colors.primary,
  icon,
}: {
  text: string;
  bg?: string;
  fg?: string;
  icon?: IconName;
}) {
  return (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor: bg,
          flexDirection: 'row',
          gap: 4,
        },
      ]}
    >
      {icon && (
        <Ionicons name={icon} size={12} color={fg} />
      )}

      <Text
        style={{
          fontFamily: font.bold,
          fontSize: 11,
          color: fg,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

// ======================================================
// CHIP
// ======================================================

export function Chip({
  label,
  active,
  onPress,
  icon,
  count,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: IconName;
  count?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active
            ? colors.primary
            : colors.white,
          borderColor: active
            ? colors.primary
            : colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={14}
          color={active ? colors.white : colors.text2}
        />
      )}

      <Text
        style={{
          fontFamily: font.medium,
          fontSize: 12.5,
          color: active ? colors.white : colors.text2,
        }}
      >
        {label}
        {count !== undefined ? ` (${count})` : ''}
      </Text>
    </Pressable>
  );
}

// ======================================================
// DIVIDER
// ======================================================

export function Divider({
  style,
}: {
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          height: 1,
          backgroundColor: colors.border,
        },
        style,
      ]}
    />
  );
}

// ======================================================
// SECTION HEADER
// ======================================================

export function SectionHeader({
  title,
  action,
  onAction,
  style,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        },
        style,
      ]}
    >
      <T size={17} weight="bold">
        {title}
      </T>

      {!!action && (
        <Pressable
          onPress={onAction}
          hitSlop={8}
        >
          <T
            size={12.5}
            weight="medium"
            color={colors.primary}
          >
            {action}
          </T>
        </Pressable>
      )}
    </View>
  );
}

// ======================================================
// INPUT
// ======================================================

export function Input({
  label,
  icon,
  error,
  secure,
  required,
  style,
  inputStyle,
  hint,
  right,
  ...rest
}: TextInputProps & {
  label?: string;
  icon?: IconName;
  error?: string;
  secure?: boolean;
  required?: boolean;
  hint?: string;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<any>;
  right?: React.ReactNode;
}) {
  const [hidden, setHidden] = useState(true);
  const [focus, setFocus] = useState(false);
  const multiline = Boolean(rest.multiline);

  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {!!label && (
        <Text style={styles.label}>
          {label}
          {required ? (
            <Text style={{ color: colors.primary }}> *</Text>
          ) : null}
        </Text>
      )}

      <View
        style={[
          styles.inputWrap,
          multiline && {
            height: undefined,
            minHeight: 96,
            alignItems: 'flex-start',
            paddingTop: 10,
          },
          focus && {
            borderColor: colors.primary,
            backgroundColor: colors.white,
          },
          !!error && { borderColor: colors.danger },
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={focus ? colors.primary : colors.muted}
            style={{
              marginRight: 10,
              marginTop: multiline ? 4 : 0,
            }}
          />
        )}

        <TextInput
          {...rest}
          secureTextEntry={
            secure ? hidden : rest.secureTextEntry
          }
          onFocus={(e) => {
            setFocus(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={colors.muted}
          style={[
            styles.input,
            multiline && {
              textAlignVertical: 'top',
              minHeight: 76,
            },
            inputStyle,
          ]}
        />

        {secure && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
          >
            <Ionicons
              name={
                hidden ? 'eye-outline' : 'eye-off-outline'
              }
              size={19}
              color={colors.muted}
            />
          </Pressable>
        )}

        {right}
      </View>

      {!!hint && !error && (
        <T
          size={11}
          color={colors.muted}
          style={{ marginTop: 4 }}
        >
          {hint}
        </T>
      )}

      {!!error && (
        <T
          size={11.5}
          color={colors.danger}
          style={{ marginTop: 4 }}
        >
          {error}
        </T>
      )}
    </View>
  );
}

// ======================================================
// SEARCH BAR
// ======================================================

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search products, brands…',
  onSubmit,
  onPress,
  autoFocus,
  right,
  style,
  dark,
}: {
  value?: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  onPress?: () => void;
  autoFocus?: boolean;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  dark?: boolean;
}) {
  const body = (
    <View
      style={[
        styles.search,
        dark && { backgroundColor: colors.white },
        style,
      ]}
    >
      <Ionicons
        name="search"
        size={19}
        color={colors.muted}
      />

      {onPress ? (
        <Text
          style={{
            flex: 1,
            fontFamily: font.regular,
            fontSize: 13.5,
            color: colors.muted,
          }}
        >
          {placeholder}
        </Text>
      ) : (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
          autoFocus={autoFocus}
          style={{
            flex: 1,
            fontFamily: font.regular,
            fontSize: 13.5,
            color: colors.text,
            paddingVertical: 0,
          }}
        />
      )}

      {!!value && !onPress && (
        <Pressable
          onPress={() => onChangeText?.('')}
          hitSlop={8}
        >
          <Ionicons
            name="close-circle"
            size={18}
            color={colors.muted}
          />
        </Pressable>
      )}

      {right}
    </View>
  );

  return onPress ? (
    <Pressable onPress={onPress}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

// ======================================================
// BOTTOM SHEET
// ======================================================

export function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
  tall,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  tall?: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios' ? 'padding' : undefined
        }
        style={{ flex: 1 }}
      >
        <Pressable
          style={styles.overlay}
          onPress={onClose}
        />

        <View
          style={[
            styles.sheet,
            tall && { height: '82%' },
            {
              paddingBottom: Math.max(
                insets.bottom,
                12
              ),
            },
          ]}
        >
          <View style={styles.grabber} />

          {!!title && (
            <View style={styles.sheetHead}>
              <T size={17} weight="bold">
                {title}
              </T>

              <IconButton
                name="close"
                onPress={onClose}
                size={32}
                bg={colors.bg}
                border={false}
              />
            </View>
          )}

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={
              tall
                ? { flex: 1 }
                : { maxHeight: 520 }
            }
          >
            {children}
          </ScrollView>

          {footer}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ======================================================
// SELECT FIELD
// ======================================================

export type Option = {
  value: string;
  label: string;
};

export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select…',
  required,
  error,
  searchable,
  style,
}: {
  label?: string;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  searchable?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const current = options.find(
    (o) => o.value === value
  );

  const shown =
    searchable && q
      ? options.filter((o) =>
          o.label.toLowerCase().includes(q.toLowerCase())
        )
      : options;

  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {!!label && (
        <Text style={styles.label}>
          {label}
          {required ? (
            <Text style={{ color: colors.primary }}> *</Text>
          ) : null}
        </Text>
      )}

      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.inputWrap,
          !!error && {
            borderColor: colors.danger,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.input,
            { paddingTop: 14 },
            !current && {
              color: colors.muted,
            },
          ]}
        >
          {current ? current.label : placeholder}
        </Text>

        <Ionicons
          name="chevron-down"
          size={18}
          color={colors.muted}
        />
      </Pressable>

      {!!error && (
        <T
          size={11.5}
          color={colors.danger}
          style={{ marginTop: 4 }}
        >
          {error}
        </T>
      )}

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label ?? 'Select'}
        tall={searchable || options.length > 8}
      >
        {searchable && (
          <View
            style={{
              paddingHorizontal: 16,
              paddingBottom: 8,
            }}
          >
            <SearchBar
              value={q}
              onChangeText={setQ}
              placeholder="Search…"
            />
          </View>
        )}

        {shown.map((o) => {
          const on = o.value === value;

          return (
            <Pressable
              key={o.value + o.label}
              onPress={() => {
                onChange(o.value);
                setOpen(false);
                setQ('');
              }}
              style={[
                styles.optionRow,
                on && {
                  backgroundColor: colors.primarySoft,
                },
              ]}
            >
              <T
                weight={on ? 'bold' : 'regular'}
                color={
                  on ? colors.primary : colors.text
                }
                style={{ flex: 1 }}
              >
                {o.label}
              </T>

              {on && (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.primary}
                />
              )}
            </Pressable>
          );
        })}

        {shown.length === 0 && (
          <T
            color={colors.muted}
            style={{ padding: 20 }}
            align="center"
          >
            No matches
          </T>
        )}
      </Sheet>
    </View>
  );
}

// ======================================================
// MULTI SELECT
// ======================================================

export function MultiSelectField({
  label,
  values,
  options,
  onChange,
  help,
}: {
  label?: string;
  values: string[];
  options: Option[];
  onChange: (v: string[]) => void;
  help?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const shown = q
    ? options.filter((o) =>
        o.label.toLowerCase().includes(q.toLowerCase())
      )
    : options;

  const summary = values.length
    ? options
        .filter((o) => values.includes(o.value))
        .map((o) => o.label)
        .slice(0, 2)
        .join(', ') +
      (values.length > 2
        ? ` +${values.length - 2}`
        : '')
    : 'None selected';

  return (
    <View style={{ marginBottom: 14 }}>
      {!!label && (
        <Text style={styles.label}>
          {label}
        </Text>
      )}

      <Pressable
        onPress={() => setOpen(true)}
        style={styles.inputWrap}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.input,
            { paddingTop: 14 },
            !values.length && {
              color: colors.muted,
            },
          ]}
        >
          {summary}
        </Text>

        <Ionicons
          name="chevron-down"
          size={18}
          color={colors.muted}
        />
      </Pressable>

      {!!help && (
        <T
          size={11}
          color={colors.muted}
          style={{ marginTop: 4 }}
        >
          {help}
        </T>
      )}

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label ?? 'Select'}
        tall
      >
        <View
          style={{
            paddingHorizontal: 16,
            paddingBottom: 8,
          }}
        >
          <SearchBar
            value={q}
            onChangeText={setQ}
            placeholder="Search…"
          />
        </View>

        {shown.map((o) => {
          const on = values.includes(o.value);

          return (
            <Pressable
              key={o.value}
              onPress={() =>
                onChange(
                  on
                    ? values.filter(
                        (v) => v !== o.value
                      )
                    : [...values, o.value]
                )
              }
              style={[
                styles.optionRow,
                on && {
                  backgroundColor: colors.primarySoft,
                },
              ]}
            >
              <T
                color={
                  on ? colors.primary : colors.text
                }
                weight={on ? 'bold' : 'regular'}
                style={{ flex: 1 }}
              >
                {o.label}
              </T>

              <Ionicons
                name={
                  on ? 'checkbox' : 'square-outline'
                }
                size={22}
                color={
                  on
                    ? colors.primary
                    : colors.borderStrong
                }
              />
            </Pressable>
          );
        })}
      </Sheet>
    </View>
  );
}

// ======================================================
// TOGGLE
// ======================================================

export function Toggle({
  label,
  value,
  onChange,
  help,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  help?: string;
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={styles.toggleRow}
    >
      <View style={{ flex: 1 }}>
        <T weight="medium" size={14}>
          {label}
        </T>

        {!!help && (
          <T size={11} color={colors.muted}>
            {help}
          </T>
        )}
      </View>

      <View
        style={[
          styles.switch,
          {
            backgroundColor: value
              ? colors.primary
              : colors.borderStrong,
          },
        ]}
      >
        <View
          style={[
            styles.knob,
            {
              alignSelf: value
                ? 'flex-end'
                : 'flex-start',
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

// ======================================================
// STEPPER
// ======================================================

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
  small,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  small?: boolean;
}) {
  const size = small ? 28 : 36;

  const control = (
    name: IconName,
    disabled: boolean,
    next: number
  ) => (
    <Pressable
      onPress={() => onChange(next)}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => ({
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.35 : pressed ? 0.65 : 1,
      })}
    >
      <Ionicons
        name={name}
        size={small ? 15 : 18}
        color={colors.text}
      />
    </Pressable>
  );

  return (
    <View
      style={[
        styles.stepper,
        { height: size + 2 },
      ]}
    >
      {control('remove', value <= min, value - 1)}

      <Text
        style={{
          minWidth: small ? 22 : 30,
          textAlign: 'center',
          fontFamily: font.bold,
          fontSize: small ? 13 : 15,
          color: colors.text,
        }}
      >
        {value}
      </Text>

      {control('add', value >= max, value + 1)}
    </View>
  );
}

// ======================================================
// SEGMENTED CONTROL
// ======================================================

export function Segmented({
  options,
  value,
  onChange,
}: {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const on = o.value === value;

        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[
              styles.segItem,
              on && {
                backgroundColor: colors.white,
                borderColor: colors.border,
              },
            ]}
          >
            <T
              size={12.5}
              weight={on ? 'bold' : 'medium'}
              color={
                on ? colors.primary : colors.muted
              }
            >
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

// ======================================================
// IMAGE
// ======================================================

export function Img({
  uri,
  style,
  fit = 'contain',
  icon = 'image-outline',
  radiusValue,
}: {
  uri?: string | null;
  style?: StyleProp<any>;
  fit?: 'contain' | 'cover';
  icon?: IconName;
  radiusValue?: number;
}) {
  const [failed, setFailed] = useState(false);
  const url = mediaUrl(uri);

  if (!url || failed) {
    return (
      <View
        style={[
          {
            backgroundColor: colors.bg,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radiusValue,
          },
          style,
        ]}
      >
        <Ionicons
          name={icon}
          size={22}
          color={colors.borderStrong}
        />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: url }}
      contentFit={fit}
      transition={180}
      onError={() => setFailed(true)}
      style={[
        { borderRadius: radiusValue },
        style,
      ]}
    />
  );
}

// ======================================================
// LOADER
// ======================================================

export function Loader({
  label,
  style,
}: {
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        },
        style,
      ]}
    >
      <ActivityIndicator
        size="large"
        color={colors.primary}
      />

      {!!label && (
        <T
          color={colors.muted}
          style={{ marginTop: 12 }}
        >
          {label}
        </T>
      )}
    </View>
  );
}

// ======================================================
// EMPTY STATE
// ======================================================

export function Empty({
  icon = 'file-tray-outline',
  title,
  message,
  action,
  onAction,
  style,
}: {
  icon?: IconName;
  title: string;
  message?: string;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        },
        style,
      ]}
    >
      <View style={styles.emptyIcon}>
        <Ionicons
          name={icon}
          size={34}
          color={colors.primary}
        />
      </View>

      <T
        size={16}
        weight="bold"
        align="center"
        style={{ marginTop: 14 }}
      >
        {title}
      </T>

      {!!message && (
        <T
          size={13}
          color={colors.muted}
          align="center"
          style={{
            marginTop: 6,
            maxWidth: 280,
          }}
        >
          {message}
        </T>
      )}

      {!!action && (
        <View
          style={{
            marginTop: 18,
            minWidth: 180,
          }}
        >
          <Button
            title={action}
            onPress={onAction}
            small
            full={false}
          />
        </View>
      )}
    </View>
  );
}

// ======================================================
// ERROR STATE
// ======================================================

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Empty
      icon="cloud-offline-outline"
      title="Couldn't load this"
      message={message}
      action={onRetry ? 'Try again' : undefined}
      onAction={onRetry}
    />
  );
}

// ======================================================
// SKELETON
// ======================================================

export function Skeleton({
  w,
  h,
  r = 10,
  style,
}: {
  w?: number | string;
  h: number;
  r?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          width: w as any,
          height: h,
          borderRadius: r,
          backgroundColor: '#EBEBF1',
        },
        style,
      ]}
    />
  );
}

// ======================================================
// RATING
// ======================================================

export function Rating({
  value,
  size = 13,
  count,
}: {
  value: number;
  size?: number;
  count?: number;
}) {
  const full = Math.round(value);

  return (
    <View style={styles.rating}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={
            i <= full ? 'star' : 'star-outline'
          }
          size={size}
          color={
            i <= full
              ? '#F5A524'
              : colors.borderStrong
          }
        />
      ))}

      {count !== undefined && (
        <T
          size={11}
          color={colors.muted}
          style={{ marginLeft: 4 }}
        >
          ({count})
        </T>
      )}
    </View>
  );
}

// ======================================================
// MENU ROW
// ======================================================

export function MenuRow({
  icon,
  title,
  subtitle,
  onPress,
  right,
  danger,
  badge,
  last,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
  badge?: number;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.menuRow,
        !last && {
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.menuIcon,
          danger && {
            backgroundColor: colors.dangerSoft,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={
            danger ? colors.danger : colors.primary
          }
        />
      </View>

      <View style={{ flex: 1 }}>
        <T
          weight="medium"
          size={14}
          color={
            danger ? colors.danger : colors.text
          }
        >
          {title}
        </T>

        {!!subtitle && (
          <T size={11.5} color={colors.muted}>
            {subtitle}
          </T>
        )}
      </View>

      {!!badge && badge > 0 && (
        <View style={styles.menuBadge}>
          <Text
            style={{
              fontFamily: font.bold,
              fontSize: 11,
              color: colors.white,
            }}
          >
            {badge}
          </Text>
        </View>
      )}

      {right ?? (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.muted}
        />
      )}
    </Pressable>
  );
}

// ======================================================
// FLOATING ACTION BUTTON
// ======================================================

export function FAB({
  onPress,
  icon = 'add',
  style,
}: {
  onPress: () => void;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.fabPosition,
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      <LinearGradient
        colors={gradients.primary}
        style={styles.fab}
      >
        <Ionicons
          name={icon}
          size={26}
          color={colors.white}
        />
      </LinearGradient>
    </Pressable>
  );
}

// ======================================================
// STICKY BAR
// ======================================================

export function StickyBar({
  children,
}: {
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.sticky,
        {
          paddingBottom: Math.max(
            insets.bottom,
            12
          ),
        },
      ]}
    >
      {children}
    </View>
  );
}

// ======================================================
// GLOBAL STYLES
// ======================================================

const styles = StyleSheet.create({
  // BUTTONS
  button: {
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    elevation: 0,
    shadowOpacity: 0,
  },

  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  // BADGES
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.white,
  },

  badgeText: {
    color: colors.white,
    fontFamily: font.bold,
    fontSize: 9.5,
  },

  // HEADER
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },

  headerSide: {
    width: 84,
    justifyContent: 'center',
  },

  headerTitle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // CARDS
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 0,
    shadowOpacity: 0,
  },

  // STATUS
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // CHIPS
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
  },

  // FORMS
  label: {
    fontFamily: font.medium,
    fontSize: 12.5,
    color: colors.text2,
    marginBottom: 6,
  },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
  },

  input: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 0,
  },

  // SEARCH
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    paddingHorizontal: 14,
  },

  // SHEET
    overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.overlay,
  },

  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: 8,
    elevation: 0,
    shadowOpacity: 0,
  },

  grabber: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: 8,
  },

  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 8,
  },

  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: radius.md,
    marginHorizontal: 8,
  },

  // TOGGLE
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 6,
    gap: 12,
  },

  switch: {
    width: 46,
    height: 27,
    borderRadius: 14,
    padding: 3,
    justifyContent: 'center',
  },

  knob: {
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: colors.white,
  },

  // STEPPER
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },

  // SEGMENTED
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
  },

  segItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },

  // EMPTY STATE
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // RATING
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },

  // MENU
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },

  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuBadge: {
    minWidth: 24,
    height: 22,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    marginRight: 4,
  },

  // FLOATING BUTTON
  fabPosition: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    elevation: 0,
    shadowOpacity: 0,
  },

  fab: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // STICKY BOTTOM BAR
  sticky: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    elevation: 0,
    shadowOpacity: 0,
  },
});
