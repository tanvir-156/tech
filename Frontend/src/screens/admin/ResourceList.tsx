import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { colors } from '../../theme';
import { Button, Card, Empty, ErrorState, FAB, Header, IconButton, Loader, SearchBar, SelectField, Sheet, StatusBadge, T } from '../../components/ui';
import { adminApi, buildQuery, ListResponse, Row } from '../../lib/adminApi';
import { useDebounced } from '../../lib/hooks';
import { dateTime, errorMessage, money, num, titleCase } from '../../lib/format';
import { useNav, useParams } from '../../navigation/hooks';

type Cfg = { title: string; sub?: string[]; flag?: string; status?: string; right?: string; kind?: 'money' | 'text'; suffix?: string };

const CFG: Record<string, Cfg> = {
  payments: { title: 'transaction_id', sub: ['order'], status: 'status', right: 'amount', kind: 'money' },
  refunds: { title: 'payment', sub: ['created_at'], status: 'status', right: 'amount', kind: 'money' },
  variants: { title: 'sku', sub: ['price'], flag: 'is_active', right: 'stock', suffix: ' in stock' },
  brands: { title: 'name', flag: 'is_active' },
  colors: { title: 'name', sub: ['hex_code'], flag: 'is_active' },
  discounts: { title: 'name', sub: ['code'], flag: 'is_active', right: 'used_count', suffix: ' used' },
  notices: { title: 'title', sub: ['notice_type'], flag: 'is_active' },
  reviews: { title: 'product', sub: ['user'], flag: 'is_approved', right: 'rating', suffix: ' ★' },
  questions: { title: 'question', sub: ['product'], flag: 'is_approved' },
  customers: { title: 'email', sub: ['first_name', 'date_joined'], flag: 'is_active' },
  addresses: { title: 'user', sub: ['city', 'region'] },
  carts: { title: 'user', sub: ['updated_at'] },
  wishlists: { title: 'user', sub: ['updated_at'] },
  mappings: { title: 'category', sub: ['component_type'] },
  builds: { title: 'name', sub: ['user', 'updated_at'] },
  team: { title: 'email', sub: ['first_name', 'last_name'], flag: 'is_active' },
  roles: { title: 'name' },
  activity: { title: 'object_repr', sub: ['user', 'action_time'] },
  images: { title: 'product', sub: ['alt_text'], flag: 'is_primary' },
  categories: { title: 'name', sub: ['parent'], flag: 'is_active' },
};

const isIso = (s: string) => /^\d{4}-\d{2}-\d{2}T/.test(s);

function fmt(key: string, v: unknown): string {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return v.map(String).join(', ');
  if (typeof v === 'string' && isIso(v)) return dateTime(v);
  if (key === 'price' || key === 'amount') return money(num(v));
  return String(v);
}

function flagLabel(key: string, on: boolean) {
  if (key === 'is_approved') return on ? 'Approved' : 'Pending';
  if (key === 'is_primary') return on ? 'Cover' : '';
  return on ? 'Active' : 'Inactive';
}

export default function ResourceList() {
  const nav = useNav();
  const { resource = '', title = 'List', filter } = useParams<{ resource: string; title: string; filter: string }>();
  const cfg = CFG[resource];

  const initialFilters: Record<string, string> = {};
  if (filter) {
    const [k, v] = filter.split('=');
    if (k && v !== undefined) initialFilters[k] = v;
  }

  const [filters, setFilters] = useState<Record<string, string>>(initialFilters);
  const [sheet, setSheet] = useState(false);
  const [q, setQ] = useState('');
  const term = useDebounced(q.trim(), 400);
  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState<ListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const req = useRef(0);

  const load = useCallback(
    async (mode: 'reset' | 'refresh' | 'more') => {
      const id = ++req.current;
      const next = mode === 'more' ? page + 1 : 1;
      if (mode === 'reset') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      if (mode === 'more') setMore(true);
      try {
        const res = await adminApi<ListResponse>(`resources/${resource}/${buildQuery({ ...filters, q: term, page: next, page_size: 20 })}`);
        if (id !== req.current) return;
        setMeta(res);
        setRows((prev) => (mode === 'more' ? [...prev, ...res.rows.filter((r) => !prev.some((p) => p.id === r.id))] : res.rows));
        setPage(res.page);
        setError('');
      } catch (e) {
        if (id === req.current) setError(errorMessage(e));
      } finally {
        if (id === req.current) {
          setLoading(false);
          setRefreshing(false);
          setMore(false);
        }
      }
    },
    [resource, filters, term, page],
  );

  useEffect(() => {
    void load('reset');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource, filters, term]);

  useEffect(() => nav.addListener('focus', () => void load('refresh')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []);

  const columns = meta?.columns ?? [];
  const filterKeys = Object.keys(meta?.filters ?? {});
  const activeCount = Object.values(filters).filter(Boolean).length;

  const open = (id: number) => {
    if (resource === 'products') nav.navigate('AdminProductForm', { id });
    else nav.navigate('AdminRecord', { resource, id, title: titleCase(title) });
  };

  const renderRow = (r: Row) => {
    const c: Cfg = cfg ?? { title: columns[0] ?? 'id', sub: columns.slice(1, 3) };
    const main = fmt(c.title, r[c.title]) || `#${r.id}`;
    const sub = (c.sub ?? [])
      .map((k) => fmt(k, r[k]))
      .filter(Boolean)
      .join(' · ');
    const statusVal = c.status ? String(r[c.status] ?? '') : '';
    const flagVal = c.flag ? r[c.flag] : undefined;
    const right = c.right ? r[c.right] : undefined;
    return (
      <Card onPress={() => open(r.id)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <T weight="bold" size={13.5} numberOfLines={2}>
              {main}
            </T>
            {!!sub && (
              <T size={11.5} color={colors.muted} numberOfLines={1}>
                {sub}
              </T>
            )}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 5 }}>
            {right !== undefined && right !== null && (
              <T weight="bold" size={13.5}>
                {c.kind === 'money' ? money(num(right)) : `${right}${c.suffix ?? ''}`}
              </T>
            )}
            {!!statusVal && <StatusBadge status={statusVal} />}
            {typeof flagVal === 'boolean' && (flagVal || c.flag !== 'is_primary') && (
              <StatusBadge status={flagVal ? 'active' : c.flag === 'is_approved' ? 'pending' : 'inactive'} label={flagLabel(c.flag!, flagVal)} />
            )}
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        title={title}
        subtitle={meta ? `${meta.count} record${meta.count === 1 ? '' : 's'}` : undefined}
        right={filterKeys.length ? <IconButton name="options-outline" onPress={() => setSheet(true)} bg={activeCount ? colors.primary : colors.bg} color={activeCount ? colors.white : colors.text} border={false} size={38} badge={activeCount || undefined} /> : undefined}
      />
      <View style={{ backgroundColor: colors.white, paddingHorizontal: 16, paddingBottom: 12 }}>
        <SearchBar value={q} onChangeText={setQ} placeholder={`Search ${title.toLowerCase()}`} />
      </View>

      {loading ? (
        <Loader />
      ) : error && !rows.length ? (
        <ErrorState message={error} onRetry={() => load('reset')} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={colors.primary} colors={[colors.primary]} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (meta && page < meta.pages && !more && !loading) void load('more');
          }}
          ListEmptyComponent={<Empty icon="file-tray-outline" title="Nothing here" message="No records match your filters." style={{ flex: 1 }} />}
          ListFooterComponent={more ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 14 }} /> : null}
          renderItem={({ item }) => renderRow(item)}
        />
      )}

      {meta?.create && <FAB onPress={() => (resource === 'products' ? nav.navigate('AdminProductForm', {}) : nav.navigate('AdminRecord', { resource, title: `New ${title}` }))} />}

      <Sheet
        visible={sheet}
        onClose={() => setSheet(false)}
        title="Filters"
        footer={
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10 }}>
            <View style={{ flex: 1 }}>
              <Button title="Reset" variant="ghost" onPress={() => setFilters({})} />
            </View>
            <View style={{ flex: 2 }}>
              <Button title="Apply" onPress={() => setSheet(false)} />
            </View>
          </View>
        }
      >
        <View style={{ padding: 16 }}>
          {filterKeys.map((k) => (
            <SelectField
              key={k}
              label={titleCase(k)}
              value={filters[k] ?? ''}
              onChange={(v) => setFilters((p) => ({ ...p, [k]: v }))}
              options={[{ value: '', label: 'All' }, ...(meta?.filters[k] ?? []).map(([value, label]) => ({ value: String(value), label: String(label) }))]}
            />
          ))}
        </View>
      </Sheet>
    </View>
  );
}
