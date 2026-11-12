import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, shadow } from '../../theme';
import { Button, T } from '../../components/ui';
import { orderCode } from '../../lib/format';
import { useNav, useParams } from '../../navigation/hooks';

export default function OrderSuccess() {
  const nav = useNav();
  const { orderId = 0, method } = useParams<{ orderId: number; method: string }>();
  const scale = useRef(new Animated.Value(0.3)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [scale, fade]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
      <Animated.View style={[{ transform: [{ scale }] }, shadow.glow]}>
        <LinearGradient colors={gradients.primary} style={{ width: 108, height: 108, borderRadius: 54, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="checkmark" size={62} color={colors.white} />
        </LinearGradient>
      </Animated.View>
      <Animated.View style={{ opacity: fade, alignItems: 'center', marginTop: 28 }}>
        <T size={24} weight="bold" align="center">
          Order placed!
        </T>
        <T size={14} color={colors.muted} align="center" style={{ marginTop: 8, maxWidth: 300 }}>
          Thank you for shopping with TechNest. We'll confirm {orderCode(orderId)} shortly{method === 'cod' ? ' — pay in cash when it arrives.' : '.'}
        </T>
      </Animated.View>
      <View style={{ width: '100%', marginTop: 34, gap: 12 }}>
        <Button title="View order" onPress={() => nav.replace('OrderDetail', { id: orderId })} />
        <Button title="Continue shopping" variant="ghost" onPress={() => nav.reset({ index: 0, routes: [{ name: 'CustomerTabs' }] })} />
      </View>
    </View>
  );
}
