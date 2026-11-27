import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients, radius } from '../../theme';
import { Button, Card, Chip, Empty, Img, Input, LightStatus, Loader, SearchBar, Sheet, T } from '../../components/ui';
import { api, endpoints, withQuery } from '../../lib/api';
import { useDebounced } from '../../lib/hooks';
import { asList, errorMessage, money, num, pcLabels, pcRequired } from '../../lib/format';
import { useAuth } from '../../store/Auth';
import { useShop } from '../../store/Shop';
import { useToast } from '../../store/Toast';
import { useNav } from '../../navigation/hooks';
import type { Compatibility, PcBuild, PcVariant } from '../../types';

const SLOT_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  cpu: 'hardware-chip-outline',
  cpu_cooler: 'snow-outline',
  motherboard: 'albums-outline',
  ram: 'layers-outline',
  storage: 'server-outline',
  gpu: 'desktop-outline',
  psu: 'flash-outline',
  case: 'cube-outline',
  monitor: 'tv-outline',
  case_cooler: 'sync-outline',
  keyboard: 'keypad-outline',
  mouse: 'radio-button-on-outline',
  speaker: 'volume-high-outline',
  headphone: 'headset-outline',
  network: 'wifi-outline',
  ups: 'battery-charging-outline',
};
const SLOT_ORDER = Object.keys(pcLabels);

export default function PCBuilder() {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { user } = useAuth();
  const { reloadCart } = useShop();

  const [builds, setBuilds] = useState<PcBuild[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [compat, setCompat] = useState<Compatibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [picker, setPicker] = useState<string | null>(null);

  const active = builds.find((b) => b.id === activeId) ?? builds[0] ?? null;

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const res = await api<unknown>(endpoints.pcBuilds);
      const list = asList<PcBuild>(res);
      setBuilds(list);
      setActiveId((cur) => (cur && list.some((b) => b.id === cur) ? cur : (list[0]?.id ?? null)));
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setBuilds([]);
      return;
    }
    void load();
  }, [user, load]);

  const loadCompat = useCallback(async (id: number) => {
    try {
      setCompat(await api<Compatibility>(`${endpoints.pcBuilds}${id}/compatibility/`));
    } catch {
      setCompat(null);
    }
  }, []);

  const itemKey = active ? active.items.map((i) => `${i.id}:${i.variant.id}`).join('|') : '';
  useEffect(() => {
    if (active) void loadCompat(active.id);
    else setCompat(null);
  }, [active?.id, itemKey, loadCompat]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const create = () =>
    run(async () => {
      const b = await api<PcBuild>(endpoints.pcBuilds, { method: 'POST', body: { name: name.trim() || 'My PC Build' } });
      setName('');
      await load();
      setActiveId(b.id);
      toast('Build created.', 'success');
    });

  const addPart = (variant: PcVariant) =>
    run(async () => {
      if (!active || !picker) return;
      await api(`${endpoints.pcBuilds}${active.id}/components/`, { method: 'POST', body: { component_type: picker, variant_id: variant.id, quantity: 1 } });
      setPicker(null);
      await load();
    });

  const removePart = (itemId: number) =>
    run(async () => {
      if (!active) return;
      await api(`${endpoints.pcBuilds}${active.id}/components/${itemId}/`, { method: 'DELETE' });
      await load();
    });

  const addAll = () =>
    run(async () => {
      if (!active) return;
      await api(`${endpoints.pcBuilds}${active.id}/add-to-cart/`, { method: 'POST' });
      await reloadCart();
      toast('Build added to your cart.', 'success');
      nav.navigate('Cart');
    });

  const deleteBuild = () =>
    Alert.alert('Delete build', `Delete “${active?.name}”?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          run(async () => {
            if (!active) return;
            await api(`${endpoints.pcBuilds}${active.id}/`, { method: 'DELETE' });
            await load();
          }),
      },
    ]);

  const head = (
    <LinearGradient colors={gradients.dark} style={[styles.head, { paddingTop: insets.top + 14 }]}>
      <LightStatus />
      <T size={22} weight="bold" color={colors.white}>
        PC Builder
      </T>
      <T size={12.5} color="#D8CEC6">
        Pick compatible parts and build your dream rig.
      </T>
    </LinearGradient>
  );

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {head}
        <Empty icon="hardware-chip-outline" title="Sign in to build your PC" message="Your builds are saved to your account." action="Sign in" onAction={() => nav.navigate('Login')} style={{ flex: 1 }} />
      </View>
    );
  }
  if (loading) return <View style={{ flex: 1, backgroundColor: colors.bg }}>{head}<Loader /></View>;

  const byType = new Map(active?.items.map((i) => [i.component_type, i]) ?? []);
  const missing = pcRequired.filter((t) => !byType.has(t));
  const ok = compat?.status === 'checks_passed';
  const bad = compat?.status === 'incompatible';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {head}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {builds.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
            {builds.map((b) => (
              <Chip key={b.id} label={b.name} active={b.id === active?.id} onPress={() => setActiveId(b.id)} />
            ))}
          </ScrollView>
        )}

        <Card style={{ marginBottom: 14 }}>
          <T weight="bold" size={14} style={{ marginBottom: 8 }}>
            {builds.length ? 'Start a new build' : 'Create your first build'}
          </T>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <Input style={{ flex: 1, marginBottom: 0 }} value={name} onChangeText={setName} placeholder="e.g. Gaming rig 2026" />
            <Button title="Create" small full={false} onPress={create} loading={busy} style={{ height: 50, width: 92 }} />
          </View>
        </Card>

        {active && (
          <>
            {compat && (
              <View style={[styles.compat, { backgroundColor: ok ? colors.successSoft : bad ? colors.dangerSoft : colors.warningSoft }]}>
                <Ionicons name={ok ? 'shield-checkmark' : bad ? 'close-circle' : 'warning'} size={22} color={ok ? colors.success : bad ? colors.danger : '#B45309'} />
                <View style={{ flex: 1 }}>
                  <T weight="bold" size={13} color={ok ? colors.success : bad ? colors.danger : '#B45309'}>
                    {ok ? 'Compatibility checks passed' : bad ? 'Compatibility issues found' : missing.length ? 'Build in progress' : 'Not fully verified'}
                  </T>
                  {(compat.issues ?? []).map((m, i) => (
                    <T key={`i${i}`} size={12} color={colors.text2}>
                      • {m}
                    </T>
                  ))}
                  {(compat.warnings ?? []).map((m, i) => (
                    <T key={`w${i}`} size={12} color={colors.text2}>
                      • {m}
                    </T>
                  ))}
                  {missing.length > 0 && (
                    <T size={12} color={colors.text2}>
                      Still needed: {missing.map((m) => pcLabels[m]).join(', ')}
                    </T>
                  )}
                </View>
              </View>
            )}

            <View style={{ gap: 10 }}>
              {SLOT_ORDER.map((type) => {
                const item = byType.get(type);
                const required = pcRequired.includes(type);
                return (
                  <Card key={type} padded={false}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 }}>
                      {item ? (
                        <Img uri={item.variant.image} style={{ width: 54, height: 54, borderRadius: 12, backgroundColor: '#FAFAFC' }} />
                      ) : (
                        <View style={styles.slotIcon}>
                          <Ionicons name={SLOT_ICON[type] ?? 'hardware-chip-outline'} size={24} color={colors.primary} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <T size={11.5} weight="medium" color={colors.muted}>
                            {pcLabels[type]}
                          </T>
                          {required && !item && (
                            <T size={9.5} weight="bold" color={colors.primary}>
                              REQUIRED
                            </T>
                          )}
                        </View>
                        {item ? (
                          <>
                            <T size={12.5} weight="medium" numberOfLines={2}>
                              {item.variant.product_name}
                            </T>
                            <T size={13} weight="bold" color={colors.primary}>
                              {money(num(item.subtotal))}
                            </T>
                          </>
                        ) : (
                          <T size={12.5} color={colors.muted}>
                            Not selected
                          </T>
                        )}
                      </View>
                      {item ? (
                        <Pressable onPress={() => void removePart(item.id)} hitSlop={10}>
                          <Ionicons name="close-circle" size={24} color={colors.muted} />
                        </Pressable>
                      ) : (
                        <Pressable onPress={() => setPicker(type)} style={styles.addBtn}>
                          <Ionicons name="add" size={22} color={colors.white} />
                        </Pressable>
                      )}
                    </View>
                  </Card>
                );
              })}
            </View>

            <Card style={{ marginTop: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <T size={11.5} color={colors.muted}>
                    Estimated total
                  </T>
                  <T size={22} weight="bold" color={colors.primary}>
                    {money(num(active.total_price))}
                  </T>
                </View>
                <Pressable onPress={deleteBuild} hitSlop={10}>
                  <Ionicons name="trash-outline" size={20} color={colors.muted} />
                </Pressable>
              </View>
              <View style={{ height: 12 }} />
              <Button title="Add all to cart" icon="cart-outline" onPress={addAll} disabled={!active.items.length} loading={busy} />
            </Card>
          </>
        )}
      </ScrollView>

      <Picker type={picker} onClose={() => setPicker(null)} onSelect={addPart} />
    </View>
  );
}

function Picker({ type, onClose, onSelect }: { type: string | null; onClose: () => void; onSelect: (v: PcVariant) => void }) {
  const [q, setQ] = useState('');
  const term = useDebounced(q.trim(), 350);
  const [items, setItems] = useState<PcVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!type) return;
    let live = true;
    setLoading(true);
    setError('');
    api<unknown>(withQuery(endpoints.pcComponents, { type, search: term, page_size: 40 }), { auth: false })
      .then((r) => live && setItems(asList<PcVariant>(r)))
      .catch((e) => live && setError(errorMessage(e)))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [type, term]);

  useEffect(() => {
    if (!type) setQ('');
  }, [type]);

  return (
    <Sheet visible={Boolean(type)} onClose={onClose} title={type ? `Choose ${pcLabels[type]}` : ''} tall>
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <SearchBar value={q} onChangeText={setQ} placeholder="Search parts…" />
      </View>
      {loading ? (
        <Loader style={{ padding: 40 }} />
      ) : error ? (
        <T color={colors.danger} align="center" style={{ padding: 24 }}>
          {error}
        </T>
      ) : items.length === 0 ? (
        <Empty icon="search-outline" title="No parts found" message="No products are mapped to this component yet." />
      ) : (
        <FlatList
          scrollEnabled={false}
          data={items}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => (
            <Pressable onPress={() => item.stock > 0 && onSelect(item)} style={[styles.partRow, item.stock <= 0 && { opacity: 0.5 }]}>
              <Img uri={item.image} style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: '#FAFAFC' }} />
              <View style={{ flex: 1 }}>
                <T size={12.5} weight="medium" numberOfLines={2}>
                  {item.product_name}
                </T>
                <T size={11} color={colors.muted}>
                  {[item.brand, item.ram, item.storage].filter(Boolean).join(' · ')}
                </T>
                <T size={13} weight="bold" color={colors.primary}>
                  {money(num(item.discounted_price))}
                  {item.stock <= 0 ? '  · Out of stock' : ''}
                </T>
              </View>
              <Ionicons name="add-circle" size={26} color={colors.primary} />
            </Pressable>
          )}
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 20, paddingBottom: 18, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  compat: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.md, marginBottom: 14 },
  slotIcon: { width: 54, height: 54, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  partRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
});
