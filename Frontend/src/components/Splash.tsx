import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, font } from '../theme';
import { Mark, WaveBackground, Wordmark } from './Brand';

export function SplashView({ admin }: { admin?: boolean }) {
  const { width, height } = useWindowDimensions();
  const fade = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    Animated.timing(progress, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }).start();
  }, [fade, progress]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient colors={['#2A1B12', '#14100D', '#0E0B09']} style={StyleSheet.absoluteFill} />
      <WaveBackground width={width} height={height} />
      <Animated.View
        style={[
          styles.center,
          {
            opacity: fade,
            transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }, { scale: fade.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
          },
        ]}
      >
        <Mark size={92} />
        <View style={{ height: 10 }} />
        <Wordmark size={34} suffix={admin ? 'Admin' : undefined} />
        <Text style={styles.tag}>{admin ? 'Manage Your Store\nAnywhere, Anytime' : 'Your Trusted Tech Store'}</Text>
      </Animated.View>
      <View style={styles.progressTrack}>
        <Animated.View
          style={[styles.progressBar, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center' },
  tag: { marginTop: 14, fontFamily: font.regular, fontSize: 14, color: '#D8CEC6', textAlign: 'center', lineHeight: 22 },
  progressTrack: {
    position: 'absolute',
    bottom: 64,
    width: 150,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  progressBar: { height: 4, borderRadius: 2, backgroundColor: colors.primary },
});
