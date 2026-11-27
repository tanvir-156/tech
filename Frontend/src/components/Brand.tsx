import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import { colors, font } from '../theme';

/** The TN monogram: italic, orange gradient look, drawn with text + skew. */
export function Mark({ size = 64 }: { size?: number }) {
  return (
    <View style={{ height: size, justifyContent: 'center' }}>
      <Text
        style={{
          fontFamily: font.bold,
          fontSize: size,
          lineHeight: size * 1.2,
          color: colors.primary,
          letterSpacing: -2,
          transform: [{ skewX: '-10deg' }],
          includeFontPadding: false,
        }}
      >
        TN
      </Text>
    </View>
  );
}

export function Wordmark({
  size = 22,
  dark,
  suffix,
}: {
  size?: number;
  dark?: boolean;
  suffix?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <Text style={{ fontFamily: font.bold, fontSize: size, color: dark ? colors.text : colors.white, letterSpacing: -0.4 }}>Tech</Text>
      <Text style={{ fontFamily: font.bold, fontSize: size, color: colors.primary, letterSpacing: -0.4 }}>Nest</Text>
      {!!suffix && (
        <Text style={{ fontFamily: font.medium, fontSize: size * 0.55, color: dark ? colors.muted : '#D6CCC4', marginLeft: 5 }}>{suffix}</Text>
      )}
    </View>
  );
}

/** Flowing orange light-trails on a dark base, echoing the design's splash. */
export function WaveBackground({ height = 420, width = 400, opacity = 1 }: { height?: number; width?: number; opacity?: number }) {
  const h = height;
  const w = width;
  const paths = [
    `M0 ${h * 0.62} C ${w * 0.25} ${h * 0.45}, ${w * 0.55} ${h * 0.8}, ${w} ${h * 0.55}`,
    `M0 ${h * 0.7} C ${w * 0.3} ${h * 0.52}, ${w * 0.6} ${h * 0.88}, ${w} ${h * 0.64}`,
    `M0 ${h * 0.78} C ${w * 0.28} ${h * 0.6}, ${w * 0.62} ${h * 0.95}, ${w} ${h * 0.73}`,
    `M0 ${h * 0.34} C ${w * 0.3} ${h * 0.12}, ${w * 0.6} ${h * 0.5}, ${w} ${h * 0.22}`,
    `M0 ${h * 0.42} C ${w * 0.32} ${h * 0.2}, ${w * 0.62} ${h * 0.58}, ${w} ${h * 0.3}`,
  ];
  return (
    <View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice">
        <Defs>
          <SvgGradient id="wave" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FF6B00" stopOpacity="0" />
            <Stop offset="0.5" stopColor="#FF8A1F" stopOpacity="0.9" />
            <Stop offset="1" stopColor="#FF6B00" stopOpacity="0.05" />
          </SvgGradient>
        </Defs>
        {paths.map((d, i) => (
          <Path key={i} d={d} stroke="url(#wave)" strokeWidth={i % 2 ? 1.2 : 2.4} fill="none" opacity={0.35 + (i % 3) * 0.2} />
        ))}
      </Svg>
    </View>
  );
}
