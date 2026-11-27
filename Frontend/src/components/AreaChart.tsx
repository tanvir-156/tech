import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient as SvgGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { colors, font } from '../theme';
import { compact, money } from '../lib/format';

type Point = { label: string; value: number };

function smooth(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0].x} ${points[0].y}`;
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const t = 0.18;
    const c1x = p1.x + (p2.x - p0.x) * t;
    const c1y = p1.y + (p2.y - p0.y) * t;
    const c2x = p2.x - (p3.x - p1.x) * t;
    const c2y = p2.y - (p3.y - p1.y) * t;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function AreaChart({ data, height = 170 }: { data: Point[]; height?: number }) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const padL = 40;
  const padR = 12;
  const padT = 14;
  const padB = 24;

  const geometry = useMemo(() => {
    const values = data.map((d) => d.value);
    const max = Math.max(...values, 1);
    const niceMax = max <= 0 ? 1 : max;
    const innerW = Math.max(width - padL - padR, 1);
    const innerH = height - padT - padB;
    const pts = data.map((d, i) => ({
      x: padL + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW),
      y: padT + innerH - (d.value / niceMax) * innerH,
    }));
    const line = smooth(pts);
    const area = pts.length
      ? `${line} L ${pts[pts.length - 1].x} ${padT + innerH} L ${pts[0].x} ${padT + innerH} Z`
      : '';
    return { pts, line, area, max: niceMax, innerH };
  }, [data, width, height]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const pick = (x: number) => {
    if (!geometry.pts.length) return;
    let best = 0;
    let dist = Infinity;
    geometry.pts.forEach((p, i) => {
      const d = Math.abs(p.x - x);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    setActive(best);
  };

  const ticks = [0, 0.5, 1];
  const labelEvery = Math.max(1, Math.ceil(data.length / 5));
  const act = active !== null ? geometry.pts[active] : null;
  const actData = active !== null ? data[active] : null;

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPressIn={(e) => pick(e.nativeEvent.locationX)}
          onTouchMove={(e) => pick(e.nativeEvent.locationX)}
        >
          <Svg width={width} height={height}>
            <Defs>
              <SvgGradient id="area" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.primary} stopOpacity="0.38" />
                <Stop offset="1" stopColor={colors.primary} stopOpacity="0.02" />
              </SvgGradient>
            </Defs>
            {ticks.map((t) => {
              const y = padT + geometry.innerH * (1 - t);
              return (
                <React.Fragment key={t}>
                  <Line x1={padL} x2={width - padR} y1={y} y2={y} stroke={colors.border} strokeDasharray="4 5" strokeWidth={1} />
                  <SvgText x={padL - 8} y={y + 4} fontSize={10} fill={colors.muted} textAnchor="end" fontFamily={font.regular}>
                    {compact(geometry.max * t)}
                  </SvgText>
                </React.Fragment>
              );
            })}
            {geometry.area ? <Path d={geometry.area} fill="url(#area)" /> : null}
            {geometry.line ? <Path d={geometry.line} stroke={colors.primary} strokeWidth={2.6} fill="none" strokeLinecap="round" /> : null}
            {data.map((d, i) =>
              i % labelEvery === 0 ? (
                <SvgText
                  key={`${d.label}${i}`}
                  x={geometry.pts[i]?.x ?? 0}
                  y={height - 6}
                  fontSize={10}
                  fill={colors.muted}
                  textAnchor="middle"
                  fontFamily={font.regular}
                >
                  {d.label}
                </SvgText>
              ) : null,
            )}
            {act && (
              <>
                <Line x1={act.x} x2={act.x} y1={padT} y2={padT + geometry.innerH} stroke={colors.primary} strokeOpacity={0.35} strokeDasharray="3 4" />
                <Circle cx={act.x} cy={act.y} r={6} fill={colors.white} stroke={colors.primary} strokeWidth={3} />
              </>
            )}
          </Svg>
        </Pressable>
      )}
      {act && actData && (
        <View
          pointerEvents="none"
          style={[
            styles.tip,
            { left: Math.min(Math.max(act.x - 46, 4), Math.max(width - 100, 4)), top: Math.max(act.y - 40, 0) },
          ]}
        >
          <Text style={styles.tipText}>{money(actData.value)}</Text>
          <Text style={styles.tipSub}>{actData.label}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tip: {
    position: 'absolute',
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 92,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  tipText: { fontFamily: font.bold, fontSize: 12, color: colors.text },
  tipSub: { fontFamily: font.regular, fontSize: 9.5, color: colors.muted },
});
