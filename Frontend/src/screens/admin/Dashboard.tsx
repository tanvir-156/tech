import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow } from '../../theme';
import { Card, ErrorState, Loader, Segmented, SectionHeader, StatusBadge, T } from '../../components/ui';
import { AdminTopBar } from '../../components/AdminKit';
import { AreaChart } from '../../components/AreaChart';
import { adminApi, ListResponse, Stats } from '../../lib/adminApi';
import { api, endpoints, withQuery } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import { compact, money, orderCode, num } from '../../lib/format';
import { useAdmin } from '../../store/Admin';
import { useNav } from '../../navigation/hooks';
import type { Page, Product } from '../../types';

const PERIODS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];

export default function Dashboard() {
  const nav = useNav();
  const { can, workspace } = useAdmin();
  const [days, setDays] = useState('30');

  const q = useAsync(async () => {
    const stats = can('orders') ? await adminApi<Stats>(`overview/?days=${days}`) : null;
    const [customers, products] = await Promise.all([
      can('customers') ? adminApi<ListResponse>('resources/customers/?page_size=20').then((r) => r.count).catch(() => null) : Promise.resolve(null),
      api<Page<Product>>(withQuery(endpoints.products, { limit: 1 }), { auth: false }).then((r) => r.count).catch(() => null),
    ]);
    return { stats, customers, products };
  }, [days]);

  const stats = q.data?.stats;
  const alerts = stats?.alerts ?? workspace?.alerts ?? [];
  const alertTotal = alerts.reduce((t, a) => t + a.count, 0);
  const goMenu = () => nav.navigate('More');

  const cards: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; sub?: string }[] = [
    { icon: 'cart-outline', label: 'Total Sales', value: stats ? money(stats.revenue) : '—', sub: stats ? `Avg order ${money(stats.average)}` : 'Orders permission needed' },
    { icon: 'bag-handle-outline', label: 'Total Orders', value: stats ? String(stats.orders) : '—', sub: stats ? `${stats.pending} pending` : undefined },
    { icon: 'people-outline', label: 'Customers', value: q.data?.customers != null ? String(q.data.customers) : '—', sub: 'Registered accounts' },
    { icon: 'cube-outline', label: 'Products', value: q.data?.products != null ? String(q.data.products) : '—', sub: 'In catalog' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AdminTopBar onMenu={goMenu} alerts={alertTotal} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.refresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <T size={22} weight="bold">
              Dashboard
            </T>
            <T size={11.5} color={colors.muted}>
              Overview of your store performance
            </T>
          </View>
        </View>
        <View style={{ marginTop: 12 }}>
          <Segmented options={PERIODS} value={days} onChange={setDays} />
        </View>

        {q.loading ? (
          <Loader style={{ paddingVertical: 80 }} />
        ) : q.error && !q.data ? (
          <ErrorState message={q.error} onRetry={q.retry} />
        ) : (
          <>
            <View style={styles.grid}>
              {cards.map((c) => (
                <View key={c.label} style={styles.stat}>
                  <View style={styles.statIcon}>
                    <Ionicons name={c.icon} size={20} color={colors.primary} />
                  </View>
                  <T size={19} weight="bold" style={{ marginTop: 10 }} numberOfLines={1}>
                    {c.value}
                  </T>
                  <T size={11.5} color={colors.muted}>
                    {c.label}
                  </T>
                  {!!c.sub && (
                    <T size={10.5} color={colors.success} weight="medium" numberOfLines={1} style={{ marginTop: 2 }}>
                      {c.sub}
                    </T>
                  )}
                </View>
              ))}
            </View>

            {stats && (
              <Card style={{ marginTop: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <View>
                    <T size={15} weight="bold">
                      Sales Overview
                    </T>
                    <T size={11.5} color={colors.muted}>
                      Paid revenue · last {days} days
                    </T>
                  </View>
                  <T size={15} weight="bold" color={colors.primary}>
                    {money(stats.revenue)}
                  </T>
                </View>
                <AreaChart data={stats.series.map((p) => ({ label: p.date.slice(5), value: num(p.value) }))} />
              </Card>
            )}

            {alerts.length > 0 && (
              <>
                <SectionHeader style={{ marginTop: 22 }} title="Needs attention" />
                <Card padded={false}>
                  {alerts.map((a, i) => (
                    <Pressable
                      key={a.key + a.title}
                      onPress={() => nav.navigate('AdminList', { resource: a.key, title: a.title, filter: a.filter })}
                      style={[styles.alert, i < alerts.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                    >
                      <View style={styles.alertCount}>
                        <T size={13} weight="bold" color={colors.primary}>
                          {compact(a.count)}
                        </T>
                      </View>
                      <T size={13} weight="medium" style={{ flex: 1 }}>
                        {a.title}
                      </T>
                      <Ionicons name="chevron-forward" size={17} color={colors.muted} />
                    </Pressable>
                  ))}
                </Card>
              </>
            )}

            {stats && stats.recent.length > 0 && (
              <>
                <SectionHeader style={{ marginTop: 22 }} title="Recent orders" action="View all" onAction={() => nav.navigate('Orders')} />
                <View style={{ gap: 10 }}>
                  {stats.recent.map((o) => (
                    <Card key={o.id} onPress={() => nav.navigate('AdminOrderDetail', { id: o.id })}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <T weight="bold" size={13.5}>
                            {orderCode(o.id)}
                          </T>
                          <T size={11.5} color={colors.muted} numberOfLines={1}>
                            {String(o.shipping_name ?? '')}
                          </T>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          <T weight="bold" size={14}>
                            {money(num(o.total_amount))}
                          </T>
                          <StatusBadge status={String(o.status)} />
                        </View>
                      </View>
                    </Card>
                  ))}
                </View>
              </>
            )}

            {stats && stats.sellers.length > 0 && (
              <>
                <SectionHeader style={{ marginTop: 22 }} title="Best sellers" />
                <Card padded={false}>
                  {stats.sellers.map((s, i) => (
                    <View key={s.product_name} style={[styles.alert, i < stats.sellers.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                      <View style={[styles.alertCount, { backgroundColor: colors.dark }]}>
                        <T size={12} weight="bold" color={colors.white}>
                          {i + 1}
                        </T>
                      </View>
                      <T size={12.5} weight="medium" numberOfLines={2} style={{ flex: 1 }}>
                        {s.product_name}
                      </T>
                      <T size={12} weight="bold" color={colors.primary}>
                        {s.units} sold
                      </T>
                    </View>
                  ))}
                </Card>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  stat: { width: '47.8%', backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border, ...shadow.sm },
  statIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  alertCount: { minWidth: 34, height: 34, borderRadius: 17, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
});
