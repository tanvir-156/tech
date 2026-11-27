import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import { Mark, WaveBackground, Wordmark } from '../../components/Brand';
import { LightStatus, T } from '../../components/ui';
import { useNav } from '../../navigation/hooks';

export function AuthLayout({
  title,
  subtitle,
  children,
  admin,
  back = true,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  admin?: boolean;
  back?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const nav = useNav();
  const headerH = 250 + insets.top;
  return (
    <View style={{ flex: 1, backgroundColor: colors.dark }}>
      <LightStatus />
      <LinearGradient colors={['#2A1B12', '#14100D']} style={[StyleSheet.absoluteFill]} />
      <View style={{ height: headerH, position: 'absolute', left: 0, right: 0, top: 0 }}>
        <WaveBackground width={width} height={headerH} />
      </View>
      {back && (
        <Pressable
          onPress={() => (nav.canGoBack() ? nav.goBack() : undefined)}
          hitSlop={10}
          style={[styles.back, { top: insets.top + 10 }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
      )}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
          bounces={false}
        >
          <View style={{ height: headerH - 50, alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }}>
            <Mark size={56} />
            <Wordmark size={26} suffix={admin ? 'Admin' : undefined} />
          </View>
          <View style={styles.card}>
            <T size={24} weight="bold">
              {title}
            </T>
            {!!subtitle && (
              <T size={13} color={colors.muted} style={{ marginTop: 4, marginBottom: 22 }}>
                {subtitle}
              </T>
            )}
            {!subtitle && <View style={{ height: 18 }} />}
            {children}
            <View style={{ height: Math.max(insets.bottom, 16) }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 26,
    minHeight: 420,
  },
});
