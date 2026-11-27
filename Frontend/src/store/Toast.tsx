import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, shadow } from '../theme';

type Kind = 'success' | 'error' | 'info';
type ToastFn = (message: string, kind?: Kind) => void;

const Ctx = createContext<ToastFn>(() => undefined);
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string; kind: Kind } | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const hide = useCallback(() => {
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setToast(null));
  }, [anim]);

  const show = useCallback<ToastFn>(
    (message, kind = 'info') => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ id: Date.now(), message, kind });
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
      timer.current = setTimeout(hide, kind === 'error' ? 4200 : 2600);
    },
    [anim, hide],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const tone =
    toast?.kind === 'success'
      ? { icon: 'checkmark-circle' as const, c: colors.success }
      : toast?.kind === 'error'
        ? { icon: 'alert-circle' as const, c: colors.danger }
        : { icon: 'information-circle' as const, c: colors.primary };

  return (
    <Ctx.Provider value={show}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.wrap,
            { top: insets.top + 10 },
            {
              opacity: anim,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
            },
          ]}
        >
          <Pressable onPress={hide} style={[styles.toast, shadow.md]}>
            <Ionicons name={tone.icon} size={22} color={tone.c} />
            <Text style={styles.text} numberOfLines={3}>
              {toast.message}
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, zIndex: 9999, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.dark,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    maxWidth: 520,
  },
  text: { flex: 1, color: colors.white, fontFamily: font.medium, fontSize: 13, lineHeight: 19 },
});


