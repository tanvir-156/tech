import React from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Card, Empty, ErrorState, Header, Loader, T } from '../../components/ui';
import { api, endpoints } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import { asList, dateTime } from '../../lib/format';
import type { Notice } from '../../types';

const iconFor = (t: string): keyof typeof Ionicons.glyphMap =>
  t === 'promotion' ? 'pricetag-outline' : t === 'order' ? 'bag-handle-outline' : t === 'system' ? 'settings-outline' : 'megaphone-outline';

export default function Notifications() {
  const q = useAsync(async () => {
    const res = await api<unknown>(`${endpoints.notices}?is_active=true`, { auth: false });
    const now = Date.now();
    return asList<Notice>(res)
      .filter((n) => (!n.start_at || new Date(n.start_at).getTime() <= now) && (!n.end_at || new Date(n.end_at).getTime() >= now))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Notifications" />
      {q.loading ? (
        <Loader />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.retry} />
      ) : (
        <FlatList
          data={q.data ?? []}
          keyExtractor={(n) => String(n.id)}
          contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.refresh} tintColor={colors.primary} colors={[colors.primary]} />}
          ListEmptyComponent={<Empty icon="notifications-outline" title="You're all caught up" message="Offers and announcements from TechNest will appear here." style={{ flex: 1 }} />}
          renderItem={({ item }) => (
            <Card>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={iconFor(item.notice_type)} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <T weight="bold" size={13.5}>
                    {item.title}
                  </T>
                  <T size={12.5} color={colors.text2} style={{ marginTop: 2 }}>
                    {item.message}
                  </T>
                  <T size={10.5} color={colors.muted} style={{ marginTop: 6 }}>
                    {dateTime(item.created_at)}
                  </T>
                </View>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}
