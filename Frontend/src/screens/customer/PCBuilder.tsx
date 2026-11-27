
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, gradients, radius } from '../../theme';
import {
  Button,
  Card,
  Chip,
  Empty,
  Img,
  Input,
  LightStatus,
  Loader,
  SearchBar,
  Sheet,
  T,
} from '../../components/ui';

import { api, endpoints, withQuery } from '../../lib/api';
import { useDebounced } from '../../lib/hooks';
import {
  asList,
  errorMessage,
  money,
  num,
  pcLabels,
  pcRequired,
} from '../../lib/format';

import { useAuth } from '../../store/Auth';
import { useShop } from '../../store/Shop';
import { useToast } from '../../store/Toast';
import { useNav } from '../../navigation/hooks';

import type {
  Compatibility,
  PcBuild,
  PcVariant,
} from '../../types';

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

  // Edit build name
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBuildId, setEditBuildId] = useState<number | null>(null);

  const active =
    builds.find((b) => b.id === activeId) ??
    builds[0] ??
    null;

  // =====================================================
  // LOAD BUILDS
  // =====================================================

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);

      try {
        const res = await api<unknown>(endpoints.pcBuilds);
        const list = asList<PcBuild>(res);

        setBuilds(list);

        setActiveId((cur) =>
          cur && list.some((b) => b.id === cur)
            ? cur
            : (list[0]?.id ?? null)
        );
      } catch (e) {
        toast(errorMessage(e), 'error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setBuilds([]);
      setActiveId(null);
      return;
    }

    setLoading(true);
    void load();
  }, [user, load]);

  // =====================================================
  // COMPATIBILITY
  // =====================================================

  const loadCompat = useCallback(async (id: number) => {
    try {
      setCompat(
        await api<Compatibility>(
          `${endpoints.pcBuilds}${id}/compatibility/`
        )
      );
    } catch {
      setCompat(null);
    }
  }, []);

  const itemKey = active
    ? active.items
        .map((i) => `${i.id}:${i.variant.id}`)
        .join('|')
    : '';

  useEffect(() => {
    if (active) {
      void loadCompat(active.id);
    } else {
      setCompat(null);
    }
  }, [active?.id, itemKey, loadCompat]);

  // =====================================================
  // ASYNC ACTION WRAPPER
  // =====================================================

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;

    setBusy(true);

    try {
      await fn();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  // =====================================================
  // CREATE BUILD
  // =====================================================

  const create = () =>
    run(async () => {
      const b = await api<PcBuild>(endpoints.pcBuilds, {
        method: 'POST',
        body: {
          name: name.trim() || 'My PC Build',
        },
      });

      setName('');
      await load();
      setActiveId(b.id);

      toast('Build created successfully.', 'success');
    });

  // =====================================================
  // OPEN EDIT BUILD NAME
  // =====================================================

  const openEdit = (build: PcBuild) => {
    setEditBuildId(build.id);
    setEditName(build.name);
    setEditOpen(true);
  };

  // =====================================================
  // SAVE EDITED BUILD NAME
  // =====================================================

  const saveEdit = () =>
    run(async () => {
      if (editBuildId === null) return;

      const newName = editName.trim();

      if (!newName) {
        toast('Please enter a build name.', 'error');
        return;
      }

      await api(`${endpoints.pcBuilds}${editBuildId}/`, {
        method: 'PATCH',
        body: {
          name: newName,
        },
      });

      setBuilds((prev) =>
        prev.map((b) =>
          b.id === editBuildId
            ? { ...b, name: newName }
            : b
        )
      );

      setEditOpen(false);
      setEditBuildId(null);
      setEditName('');

      await load();

      toast('Build name updated successfully.', 'success');
    });

  // =====================================================
  // DELETE BUILD
  // =====================================================

  const deleteBuild = (build: PcBuild) => {
    Alert.alert(
      'Delete build',
      `Are you sure you want to delete "${build.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void run(async () => {
              await api(`${endpoints.pcBuilds}${build.id}/`, {
                method: 'DELETE',
              });

              setBuilds((prev) =>
                prev.filter((b) => b.id !== build.id)
              );

              if (activeId === build.id) {
                setActiveId(null);
              }

              await load();

              toast('Build deleted successfully.', 'success');
            });
          },
        },
      ]
    );
  };

  // =====================================================
  // ADD COMPONENT
  // =====================================================

  const addPart = (variant: PcVariant) =>
    run(async () => {
      if (!active || !picker) return;

      await api(
        `${endpoints.pcBuilds}${active.id}/components/`,
        {
          method: 'POST',
          body: {
            component_type: picker,
            variant_id: variant.id,
            quantity: 1,
          },
        }
      );

      setPicker(null);
      await load();
    });

  // =====================================================
  // REMOVE COMPONENT
  // =====================================================

  const removePart = (itemId: number) =>
    run(async () => {
      if (!active) return;

      await api(
        `${endpoints.pcBuilds}${active.id}/components/${itemId}/`,
        {
          method: 'DELETE',
        }
      );

      await load();
    });

  // =====================================================
  // ADD ALL COMPONENTS TO CART
  // =====================================================

  const addAll = () =>
    run(async () => {
      if (!active) return;

      await api(
        `${endpoints.pcBuilds}${active.id}/add-to-cart/`,
        {
          method: 'POST',
        }
      );

      await reloadCart();

      toast('Build added to your cart.', 'success');
      nav.navigate('Cart');
    });

  // =====================================================
  // HEADER
  // =====================================================

  const head = (
    <LinearGradient
      colors={gradients.dark}
      style={[
        styles.head,
        {
          paddingTop: insets.top + 14,
        },
      ]}
    >
      <LightStatus />

      <T size={22} weight="bold" color={colors.white}>
        PC Builder
      </T>

      <T size={12.5} color="#D8CEC6">
        Pick compatible parts and build your dream rig.
      </T>
    </LinearGradient>
  );

  // =====================================================
  // NOT LOGGED IN
  // =====================================================

  if (!user) {
    return (
      <View style={styles.container}>
        {head}

        <Empty
          icon="hardware-chip-outline"
          title="Sign in to build your PC"
          message="Your builds are saved to your account."
          action="Sign in"
          onAction={() => nav.navigate('Login')}
          style={{ flex: 1 }}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        {head}
        <Loader />
      </View>
    );
  }

  // =====================================================
  // BUILD INFORMATION
  // =====================================================

  const byType = new Map(
    active?.items.map((i) => [i.component_type, i]) ?? []
  );

  const missing = pcRequired.filter(
    (t) => !byType.has(t)
  );

  const ok = compat?.status === 'checks_passed';
  const bad = compat?.status === 'incompatible';

  return (
    <View style={styles.container}>
      {head}

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 30,
        }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ============================================
            SAVED BUILDS
           ============================================ */}

        {builds.length > 0 && (
          <View style={styles.savedBuilds}>
            <T
              size={14}
              weight="bold"
              style={{ marginBottom: 10 }}
            >
              My saved builds
            </T>

            {builds.map((build) => {
              const selected = build.id === active?.id;

              return (
                <View
                  key={build.id}
                  style={[
                    styles.buildRow,
                    selected && styles.buildRowActive,
                  ]}
                >
                  <Pressable
                    onPress={() => setActiveId(build.id)}
                    style={styles.buildSelect}
                  >
                    <Ionicons
                      name={
                        selected
                          ? 'checkmark-circle'
                          : 'ellipse-outline'
                      }
                      size={20}
                      color={
                        selected
                          ? colors.primary
                          : colors.muted
                      }
                    />

                    <T
                      size={13}
                      weight={selected ? 'bold' : 'medium'}
                      numberOfLines={1}
                      style={{ flex: 1 }}
                    >
                      {build.name}
                    </T>
                  </Pressable>

                  {/* EDIT BUTTON */}

                  <Pressable
                    onPress={() => openEdit(build)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Rename ${build.name}`}
                    style={styles.actionIcon}
                  >
                    <Ionicons
                      name="create-outline"
                      size={20}
                      color={colors.primary}
                    />
                  </Pressable>

                  {/* DELETE BUTTON */}

                  <Pressable
                    onPress={() => deleteBuild(build)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${build.name}`}
                    style={styles.actionIcon}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={19}
                      color={colors.danger}
                    />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {/* ============================================
            CREATE BUILD
           ============================================ */}

        <Card style={{ marginBottom: 14 }}>
          <T
            weight="bold"
            size={14}
            style={{ marginBottom: 8 }}
          >
            {builds.length
              ? 'Start a new build'
              : 'Create your first build'}
          </T>

          <View style={styles.createRow}>
            <Input
              style={{
                flex: 1,
                marginBottom: 0,
              }}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Gaming rig 2026"
            />

            <Button
              title="Create"
              small
              full={false}
              onPress={create}
              loading={busy}
              style={{
                height: 50,
                width: 92,
              }}
            />
          </View>
        </Card>

        {/* ============================================
            ACTIVE BUILD
           ============================================ */}

        {active && (
          <>
            {/* ACTIVE BUILD NAME */}

            <View style={styles.activeBuildHeader}>
              <View style={{ flex: 1 }}>
                <T size={11.5} color={colors.muted}>
                  Currently editing
                </T>

                <T size={17} weight="bold" numberOfLines={2}>
                  {active.name}
                </T>
              </View>

              <Pressable
                onPress={() => openEdit(active)}
                style={styles.activeEditButton}
              >
                <Ionicons
                  name="pencil-outline"
                  size={18}
                  color={colors.primary}
                />
              </Pressable>
            </View>

            {/* COMPATIBILITY */}

            {compat && (
              <View
                style={[
                  styles.compat,
                  {
                    backgroundColor: ok
                      ? colors.successSoft
                      : bad
                      ? colors.dangerSoft
                      : colors.warningSoft,
                  },
                ]}
              >
                <Ionicons
                  name={
                    ok
                      ? 'shield-checkmark'
                      : bad
                      ? 'close-circle'
                      : 'warning'
                  }
                  size={22}
                  color={
                    ok
                      ? colors.success
                      : bad
                      ? colors.danger
                      : '#B45309'
                  }
                />

                <View style={{ flex: 1 }}>
                  <T
                    weight="bold"
                    size={13}
                    color={
                      ok
                        ? colors.success
                        : bad
                        ? colors.danger
                        : '#B45309'
                    }
                  >
                    {ok
                      ? 'Compatibility checks passed'
                      : bad
                      ? 'Compatibility issues found'
                      : missing.length
                      ? 'Build in progress'
                      : 'Not fully verified'}
                  </T>

                  {(compat.issues ?? []).map((message, i) => (
                    <T
                      key={`i${i}`}
                      size={12}
                      color={colors.text2}
                    >
                      • {message}
                    </T>
                  ))}

                  {(compat.warnings ?? []).map((message, i) => (
                    <T
                      key={`w${i}`}
                      size={12}
                      color={colors.text2}
                    >
                      • {message}
                    </T>
                  ))}

                  {missing.length > 0 && (
                    <T size={12} color={colors.text2}>
                      Still needed:{' '}
                      {missing
                        .map((m) => pcLabels[m])
                        .join(', ')}
                    </T>
                  )}
                </View>
              </View>
            )}

            {/* ========================================
                COMPONENT SLOTS
               ======================================== */}

            <View style={{ gap: 10 }}>
              {SLOT_ORDER.map((type) => {
                const item = byType.get(type);
                const required = pcRequired.includes(type);

                return (
                  <Card key={type} padded={false}>
                    <View style={styles.componentRow}>
                      {item ? (
                        <Img
                          uri={item.variant.image}
                          style={styles.componentImage}
                        />
                      ) : (
                        <View style={styles.slotIcon}>
                          <Ionicons
                            name={
                              SLOT_ICON[type] ??
                              'hardware-chip-outline'
                            }
                            size={24}
                            color={colors.primary}
                          />
                        </View>
                      )}

                      <View style={{ flex: 1 }}>
                        <View style={styles.componentTitleRow}>
                          <T
                            size={11.5}
                            weight="medium"
                            color={colors.muted}
                          >
                            {pcLabels[type]}
                          </T>

                          {required && !item && (
                            <T
                              size={9.5}
                              weight="bold"
                              color={colors.primary}
                            >
                              REQUIRED
                            </T>
                          )}
                        </View>

                        {item ? (
                          <>
                            <T
                              size={12.5}
                              weight="medium"
                              numberOfLines={2}
                            >
                              {item.variant.product_name}
                            </T>

                            <T
                              size={13}
                              weight="bold"
                              color={colors.primary}
                            >
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
                        <Pressable
                          onPress={() => void removePart(item.id)}
                          disabled={busy}
                          hitSlop={10}
                        >
                          <Ionicons
                            name="close-circle"
                            size={24}
                            color={colors.muted}
                          />
                        </Pressable>
                      ) : (
                        <Pressable
                          onPress={() => setPicker(type)}
                          disabled={busy}
                          style={styles.addBtn}
                        >
                          <Ionicons
                            name="add"
                            size={22}
                            color={colors.white}
                          />
                        </Pressable>
                      )}
                    </View>
                  </Card>
                );
              })}
            </View>

            {/* ========================================
                TOTAL AND CART
               ======================================== */}

            <Card style={{ marginTop: 16 }}>
              <View style={styles.totalRow}>
                <View>
                  <T size={11.5} color={colors.muted}>
                    Estimated total
                  </T>

                  <T
                    size={22}
                    weight="bold"
                    color={colors.primary}
                  >
                    {money(num(active.total_price))}
                  </T>
                </View>

                <Pressable
                  onPress={() => deleteBuild(active)}
                  disabled={busy}
                  hitSlop={10}
                  style={styles.actionIcon}
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={colors.danger}
                  />
                </Pressable>
              </View>

              <View style={{ height: 12 }} />

              <Button
                title="Add all to cart"
                icon="cart-outline"
                onPress={addAll}
                disabled={!active.items.length || busy}
                loading={busy}
              />
            </Card>
          </>
        )}
      </ScrollView>

      {/* ==============================================
          EDIT BUILD NAME SHEET
         ============================================== */}

      <Sheet
        visible={editOpen}
        onClose={() => {
          if (!busy) {
            setEditOpen(false);
          }
        }}
        title="Rename PC Build"
        footer={
          <View style={styles.editFooter}>
            <View style={{ flex: 1 }}>
              <Button
                title="Cancel"
                variant="ghost"
                disabled={busy}
                onPress={() => setEditOpen(false)}
              />
            </View>

            <View style={{ flex: 2 }}>
              <Button
                title="Save Changes"
                onPress={saveEdit}
                loading={busy}
                disabled={!editName.trim() || busy}
              />
            </View>
          </View>
        }
      >
        <View style={{ padding: 16 }}>
          <T
            size={13}
            weight="medium"
            style={{ marginBottom: 10 }}
          >
            Build name
          </T>

          <Input
            value={editName}
            onChangeText={setEditName}
            placeholder="Enter build name"
          />

          <T
            size={11.5}
            color={colors.muted}
            style={{ marginTop: 8 }}
          >
            Only the build name will change. Your selected
            components will remain unchanged.
          </T>
        </View>
      </Sheet>

      {/* COMPONENT PICKER */}

      <Picker
        type={picker}
        onClose={() => setPicker(null)}
        onSelect={addPart}
      />
    </View>
  );
}

// =======================================================
// COMPONENT PICKER
// =======================================================

function Picker({
  type,
  onClose,
  onSelect,
}: {
  type: string | null;
  onClose: () => void;
  onSelect: (v: PcVariant) => void;
}) {
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

    api<unknown>(
      withQuery(endpoints.pcComponents, {
        type,
        search: term,
        page_size: 40,
      }),
      { auth: false }
    )
      .then((r) => {
        if (live) {
          setItems(asList<PcVariant>(r));
        }
      })
      .catch((e) => {
        if (live) {
          setError(errorMessage(e));
        }
      })
      .finally(() => {
        if (live) {
          setLoading(false);
        }
      });

    return () => {
      live = false;
    };
  }, [type, term]);

  useEffect(() => {
    if (!type) {
      setQ('');
    }
  }, [type]);

  return (
    <Sheet
      visible={Boolean(type)}
      onClose={onClose}
      title={
        type
          ? `Choose ${pcLabels[type]}`
          : ''
      }
      tall
    >
      <View
        style={{
          paddingHorizontal: 16,
          paddingBottom: 8,
        }}
      >
        <SearchBar
          value={q}
          onChangeText={setQ}
          placeholder="Search parts…"
        />
      </View>

      {loading ? (
        <Loader style={{ padding: 40 }} />
      ) : error ? (
        <T
          color={colors.danger}
          align="center"
          style={{ padding: 24 }}
        >
          {error}
        </T>
      ) : items.length === 0 ? (
        <Empty
          icon="search-outline"
          title="No parts found"
          message="No products are mapped to this component yet."
        />
      ) : (
        <FlatList
          scrollEnabled={false}
          data={items}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                item.stock > 0 &&
                onSelect(item)
              }
              style={[
                styles.partRow,
                item.stock <= 0 && {
                  opacity: 0.5,
                },
              ]}
            >
              <Img
                uri={item.image}
                style={styles.pickerImage}
              />

              <View style={{ flex: 1 }}>
                <T
                  size={12.5}
                  weight="medium"
                  numberOfLines={2}
                >
                  {item.product_name}
                </T>

                <T size={11} color={colors.muted}>
                  {[
                    item.brand,
                    item.ram,
                    item.storage,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </T>

                <T
                  size={13}
                  weight="bold"
                  color={colors.primary}
                >
                  {money(num(item.discounted_price))}
                  {item.stock <= 0
                    ? '  · Out of stock'
                    : ''}
                </T>
              </View>

              <Ionicons
                name="add-circle"
                size={26}
                color={colors.primary}
              />
            </Pressable>
          )}
        />
      )}
    </Sheet>
  );
}

// =======================================================
// STYLES
// =======================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  head: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  savedBuilds: {
    marginBottom: 14,
  },

  buildRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },

  buildRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },

  buildSelect: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 34,
  },

  actionIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },

  createRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },

  activeBuildHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },

  activeEditButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  compat: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 14,
  },

  componentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },

  componentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  componentImage: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#FAFAFC',
  },

  slotIcon: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  editFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
  },

  partRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  pickerImage: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#FAFAFC',
  },
});
