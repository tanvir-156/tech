import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Card, Empty, ErrorState, FAB, Header, Loader, T } from '../../components/ui';
import { getCategories } from '../../lib/catalog';
import { categoryIcon, listProducts } from '../../lib/products';
import { useAsync } from '../../lib/hooks';
import { useAdmin } from '../../store/Admin';
import { useNav } from '../../navigation/hooks';
import type { Category } from '../../types';

export default function AdminCategories() {
  const nav = useNav();
  const { can } = useAdmin();
  const [open, setOpen] = useState<number | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const q = useAsync(() => getCategories(true), []);

  useEffect(() => nav.addListener('focus', () => void q.reload()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []);

  useEffect(() => {
    const list = q.data ?? [];
    let live = true;
    (async () => {
      const entries = await Promise.all(
        list.map(async (c) => {
          const r = await listProducts({ is_active: undefined, category: c.slug, limit: 1 }).catch(() => null);
          return [c.slug, r?.count ?? 0] as const;
        }),
      );
      if (live) setCounts(Object.fromEntries(entries));
    })();
    return () => {
      live = false;
    };
  }, [q.data]);

  const edit = (c: Category) => nav.navigate('AdminRecord', { resource: 'categories', id: c.id, title: c.name });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Categories" />
      {q.loading ? (
        <Loader />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.retry} />
      ) : (
        <FlatList
          data={q.data ?? []}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.refresh} tintColor={colors.primary} colors={[colors.primary]} />}
          ListEmptyComponent={<Empty icon="grid-outline" title="No categories" message="Tap + to create your first category." style={{ flex: 1 }} />}
          renderItem={({ item: c }) => {
            const subs = c.sub_categories ?? [];
            const expanded = open === c.id;
            return (
              <Card padded={false}>
                <Pressable onPress={() => edit(c)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={categoryIcon(c.name)} size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T weight="bold" size={14}>
                      {c.name}
                    </T>
                    <T size={11.5} color={colors.muted}>
                      {subs.length} subcategories
                    </T>
                  </View>
                  <T weight="bold" size={15}>
                    {counts[c.slug] ?? '–'}
                  </T>
                  {subs.length > 0 ? (
                    <Pressable onPress={() => setOpen(expanded ? null : c.id)} hitSlop={10}>
                      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
                    </Pressable>
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                  )}
                </Pressable>
                {expanded &&
                  subs.map((s) => (
                    <Pressable key={s.id} onPress={() => edit(s)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 16, paddingLeft: 70, borderTopWidth: 1, borderTopColor: colors.border }}>
                      <T size={12.5} style={{ flex: 1 }}>
                        {s.name}
                      </T>
                      <Ionicons name="create-outline" size={16} color={colors.primary} />
                    </Pressable>
                  ))}
              </Card>
            );
          }}
        />
      )}
      {can('categories') && <FAB onPress={() => nav.navigate('AdminRecord', { resource: 'categories', title: 'New category' })} />}
    </View>
  );
}
