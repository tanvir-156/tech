import React, { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { colors } from '../../theme';
import { Card, ErrorState, Header, Loader, Segmented, T } from '../../components/ui';
import { AreaChart } from '../../components/AreaChart';
import { adminApi, ListResponse, Stats } from '../../lib/adminApi';
import { useAsync } from '../../lib/hooks';
import { money, num, titleCase } from '../../lib/format';
import { useAdmin } from '../../store/Admin';

const PERIODS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];

export default function Reports() {
  const { can } = useAdmin();
  const [days, setDays] = useState('30');

  const q = useAsync(async () => {
    const stats = await adminApi<Stats>(`overview/?days=${days}`);
    let payments: { label: string; count: number }[] = [];
    if (can('payments')) {
      try {
        const first = await adminApi<ListResponse>('resources/payments/?page_size=20');
        const options = first.filters.status ?? [];
        payments = await Promise.all(
          options.map(async ([value, label]) => {
            const r = await adminApi<ListResponse>(`resources/payments/?status=${encodeURIComponent(value)}&page_size=20`);
            return { label: String(label), count: r.count };
          }),
        );
      } catch {
        payments = [];
      }
    }
    return { stats, payments };
  }, [days]);

  const s = q.data?.stats;
  const states = s ? Object.entries(s.states) : [];
  const maxState = Math.max(...states.map(([, v]) => v), 1);
  const maxSeller = Math.max(...(s?.sellers.map((x) => x.units) ?? [1]), 1);
  const paymentMax = Math.max(...(q.data?.payments.map((p) => p.count) ?? [1]), 1);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Reports" />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.refresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <Segmented options={PERIODS} value={days} onChange={setDays} />
        {q.loading ? (
          <Loader style={{ paddingVertical: 80 }} />
        ) : q.error || !s ? (
          <ErrorState message={q.error || 'Could not load reports'} onRetry={q.retry} />
        ) : (
          <>
            <Card style={{ marginTop: 16 }}>
              <T size={12} color={colors.muted}>
                Sales Overview
              </T>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                <T size={22} weight="bold">
                  {money(s.revenue)}
                </T>
                <T size={11.5} color={colors.muted}>
                  paid revenue
                </T>
              </View>
              <AreaChart data={s.series.map((p) => ({ label: p.date.slice(5), value: num(p.value) }))} />
            </Card>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <Card style={{ flex: 1 }}>
                <T size={11.5} color={colors.muted}>
                  Orders
                </T>
                <T size={20} weight="bold">
                  {s.orders}
                </T>
              </Card>
              <Card style={{ flex: 1 }}>
                <T size={11.5} color={colors.muted}>
                  Avg. order
                </T>
                <T size={20} weight="bold">
                  {money(s.average)}
                </T>
              </Card>
            </View>

            <T size={16} weight="bold" style={{ marginTop: 22, marginBottom: 10 }}>
              Top Selling Products
            </T>
            <Card>
              {s.sellers.length === 0 && <T color={colors.muted}>No sales in this period.</T>}
              {s.sellers.map((x, i) => (
                <Bar key={x.product_name} label={`${i + 1}. ${x.product_name}`} value={x.units} max={maxSeller} right={`${x.units} sold`} />
              ))}
            </Card>

            <T size={16} weight="bold" style={{ marginTop: 22, marginBottom: 10 }}>
              Orders by Status
            </T>
            <Card>
              {states.length === 0 && <T color={colors.muted}>No orders in this period.</T>}
              {states.map(([k, v]) => (
                <Bar key={k} label={titleCase(k)} value={v} max={maxState} right={String(v)} />
              ))}
            </Card>

            {(q.data?.payments.length ?? 0) > 0 && (
              <>
                <T size={16} weight="bold" style={{ marginTop: 22, marginBottom: 10 }}>
                  Payment Summary (all time)
                </T>
                <Card>
                  {q.data!.payments.map((p) => (
                    <Bar key={p.label} label={p.label} value={p.count} max={paymentMax} right={String(p.count)} />
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

function Bar({ label, value, max, right }: { label: string; value: number; max: number; right: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5, gap: 8 }}>
        <T size={12.5} weight="medium" numberOfLines={1} style={{ flex: 1 }}>
          {label}
        </T>
        <T size={12.5} weight="bold" color={colors.primary}>
          {right}
        </T>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.primarySoft }}>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.primary, width: `${Math.max((value / max) * 100, value > 0 ? 4 : 0)}%` }} />
      </View>
    </View>
  );
}
