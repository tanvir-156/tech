import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { Button, Card, Empty, ErrorState, Header, Img, Loader, T } from '../../components/ui';
import { api, endpoints, withQuery } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import { money, num, valueText } from '../../lib/format';
import { useShop } from '../../store/Shop';
import { useNav } from '../../navigation/hooks';
import type { CompareResult } from '../../types';

const LABEL_W = 108;
const COL_W = 150;

export default function Compare() {
  const nav = useNav();
  const { compareIds, toggleCompare, clearCompare } = useShop();
  const key = compareIds.join(',');

  const data = useAsync(async () => {
    if (compareIds.length < 2) return null;
    return api<CompareResult>(withQuery(endpoints.compare, { ids: key }), { auth: false });
  }, [key]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        title="Compare"
        right={
          compareIds.length > 0 ? (
            <Pressable onPress={clearCompare}>
              <T size={13} weight="medium" color={colors.primary}>
                Clear
              </T>
            </Pressable>
          ) : undefined
        }
      />
      {compareIds.length < 2 ? (
        <Empty
          icon="git-compare-outline"
          title={compareIds.length === 0 ? 'Nothing to compare yet' : 'Pick one more product'}
          message="Open a product and tap Compare to add it. You can compare up to four products."
          action="Browse products"
          onAction={() => nav.navigate('ProductList', { title: 'All products' })}
        />
      ) : data.loading ? (
        <Loader />
      ) : data.error || !data.data ? (
        <ErrorState message={data.error || 'Could not load the comparison.'} onRetry={data.retry} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
            <View>
              <View style={{ flexDirection: 'row' }}>
                <View style={{ width: LABEL_W }} />
                {data.data.products.map((p) => (
                  <Card key={p.id} style={{ width: COL_W - 10, marginRight: 10, alignItems: 'center' }}>
                    <Pressable onPress={() => toggleCompare(p.id)} style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }} hitSlop={8}>
                      <Ionicons name="close-circle" size={20} color={colors.muted} />
                    </Pressable>
                    <Img uri={p.image} style={{ width: 90, height: 90 }} />
                    <T size={12} weight="medium" numberOfLines={2} align="center" style={{ marginTop: 6, minHeight: 34 }}>
                      {p.name}
                    </T>
                    <T size={14} weight="bold" color={colors.primary}>
                      {money(num(p.variant?.discounted_price ?? p.default_variant?.discounted_price))}
                    </T>
                    <Button
                      title="View"
                      variant="soft"
                      small
                      onPress={() => nav.navigate('ProductDetail', { slug: p.slug, id: p.id, name: p.name })}
                      style={{ marginTop: 8, alignSelf: 'stretch' }}
                    />
                  </Card>
                ))}
              </View>
              {data.data.specification_sections.map((s) => (
                <View key={s.name} style={{ marginTop: 14 }}>
                  <T weight="bold" size={13} color={colors.primary} style={{ marginBottom: 6 }}>
                    {s.name}
                  </T>
                  {s.rows.map((r, ri) => (
                    <View key={r.label + ri} style={{ flexDirection: 'row', backgroundColor: r.different ? colors.primarySofter : ri % 2 ? colors.white : '#FAFAFC', borderRadius: radius.sm, paddingVertical: 8 }}>
                      <T size={11.5} color={colors.muted} style={{ width: LABEL_W, paddingHorizontal: 8 }}>
                        {r.label}
                      </T>
                      {r.values.map((v, vi) => (
                        <T key={vi} size={12} weight={r.different ? 'medium' : 'regular'} style={{ width: COL_W - 10, marginRight: 10, paddingHorizontal: 4 }}>
                          {valueText(v)}
                        </T>
                      ))}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </ScrollView>
      )}
    </View>
  );
}
