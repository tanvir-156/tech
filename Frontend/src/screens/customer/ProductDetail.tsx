import React, { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, Share, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow } from '../../theme';
import { Button, Card, Empty, ErrorState, IconButton, Img, Input, Loader, Pill, Rating, Stepper, T, StickyBar } from '../../components/ui';
import { api, endpoints, withQuery } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import { asList, errorMessage, money, num, shortDate, specSections, valueText } from '../../lib/format';
import { useAuth } from '../../store/Auth';
import { useShop } from '../../store/Shop';
import { useToast } from '../../store/Toast';
import { useNav, useParams } from '../../navigation/hooks';
import type { Product, ProductImage, ProductQuestion, ProductReview, Variant } from '../../types';

type TabKey = 'overview' | 'specs' | 'reviews' | 'qa';

const ramOf = (v: Variant) => v.ram ?? '';
const storageOf = (v: Variant) => v.storage ?? '';
const colorOf = (v: Variant) => v.color?.id ?? 0;

function pickVariant(all: Variant[], current: Variant | undefined, key: 'ram' | 'storage' | 'color', value: string | number): Variant | undefined {
  const get = (v: Variant) => (key === 'ram' ? ramOf(v) : key === 'storage' ? storageOf(v) : colorOf(v));
  const candidates = all.filter((v) => get(v) === value);
  if (!candidates.length) return current;
  const score = (v: Variant) =>
    (current && ramOf(v) === ramOf(current) ? 2 : 0) +
    (current && storageOf(v) === storageOf(current) ? 2 : 0) +
    (current && colorOf(v) === colorOf(current) ? 2 : 0) +
    (v.stock > 0 ? 1 : 0);
  return candidates.slice().sort((a, b) => score(b) - score(a))[0];
}

export default function ProductDetail() {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { slug = '', name } = useParams<{ slug: string; id: number; name: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const { addToCart, toggleWish, isWished, compareIds, toggleCompare } = useShop();

  const [tab, setTab] = useState<TabKey>('overview');
  const [qty, setQty] = useState(1);
  const [variantId, setVariantId] = useState<number | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const listRef = useRef<FlatList<string>>(null);

  const product = useAsync(async () => {
    const p = await api<Product>(`${endpoints.products}${encodeURIComponent(slug)}/`, { auth: false });
    const [imgs, reviews, questions] = await Promise.all([
      api<unknown>(withQuery(endpoints.images, { product: p.id }), { auth: false }).catch(() => []),
      api<unknown>(withQuery(endpoints.reviews, { product: p.id }), { auth: false }).catch(() => []),
      api<unknown>(withQuery(endpoints.questions, { product: p.id }), { auth: false }).catch(() => []),
    ]);
    const images = asList<ProductImage>(imgs)
      .slice()
      .sort((a, b) => Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)) || (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((i) => i.image)
      .filter(Boolean);
    return { p, images, reviews: asList<ProductReview>(reviews), questions: asList<ProductQuestion>(questions) };
  }, [slug]);

  const p = product.data?.p;
  const variants = useMemo(() => (p?.variants ?? []).filter((v) => v.is_active !== false), [p]);
  const variant: Variant | undefined =
    variants.find((v) => v.id === variantId) ?? variants.find((v) => v.is_default) ?? variants[0];

  const rams = useMemo(() => Array.from(new Set(variants.map(ramOf).filter(Boolean))), [variants]);
  const storages = useMemo(() => Array.from(new Set(variants.map(storageOf).filter(Boolean))), [variants]);
  const colorsList = useMemo(() => {
    const seen = new Map<number, NonNullable<Variant['color']>>();
    variants.forEach((v) => v.color && seen.set(v.color.id, v.color));
    return Array.from(seen.values());
  }, [variants]);

  if (product.loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.white }}>
        <FloatingBar nav={nav} insetsTop={insets.top} />
        <Loader />
      </View>
    );
  }
  if (product.error || !p) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.white }}>
        <FloatingBar nav={nav} insetsTop={insets.top} />
        <ErrorState message={product.error || 'Product not found.'} onRetry={product.retry} />
      </View>
    );
  }

  const { images, reviews, questions } = product.data!;
  const price = num(variant?.discounted_price ?? variant?.price);
  const old = num(variant?.price);
  const discount = Math.round(num(variant?.discount_percentage));
  const saved = Math.max(old - price, 0);
  const stock = variant?.stock ?? 0;
  const avg = reviews.length ? reviews.reduce((t, r) => t + r.rating, 0) / reviews.length : 0;
  const wished = variant ? isWished(variant.id) : false;
  const compared = compareIds.includes(p.id);
  const gallery = images.length ? images : [''];

  const add = async (buyNow: boolean) => {
    if (!variant) return;
    if (!user) {
      toast('Please sign in to continue.', 'info');
      nav.navigate('Login');
      return;
    }
    setBusy(true);
    const ok = await addToCart(variant.id, qty);
    setBusy(false);
    if (ok && buyNow) nav.navigate('Checkout');
  };

  const choose = (key: 'ram' | 'storage' | 'color', value: string | number) => {
    const next = pickVariant(variants, variant, key, value);
    if (next) {
      setVariantId(next.id);
      setQty(1);
    }
  };

  const features = Object.entries(p.key_feature ?? {}).filter(([, v]) => v !== '' && v !== null);

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Gallery */}
        <View style={{ backgroundColor: '#FAFAFC', paddingTop: insets.top + 56 }}>
          <FlatList
            ref={listRef}
            data={gallery}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(u, i) => `${u}${i}`}
            onMomentumScrollEnd={(e) => setImageIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => (
              <View style={{ width, height: 280, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                <Img uri={item} style={{ width: '100%', height: '100%' }} />
              </View>
            )}
          />
          {images.length > 1 && (
            <>
              <View style={styles.counter}>
                <T size={11} weight="bold" color={colors.white}>
                  {imageIndex + 1}/{images.length}
                </T>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, padding: 12, justifyContent: 'center', flexGrow: 1 }}>
                {images.map((u, i) => (
                  <Pressable
                    key={`${u}${i}`}
                    onPress={() => {
                      setImageIndex(i);
                      listRef.current?.scrollToIndex({ index: i, animated: true });
                    }}
                    style={[styles.thumb, i === imageIndex && { borderColor: colors.primary }]}
                  >
                    <Img uri={u} style={{ width: 42, height: 42 }} />
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}
        </View>

        <View style={{ padding: 16 }}>
          {!!p.brand && (
            <T size={12} weight="medium" color={colors.primary}>
              {p.brand}
            </T>
          )}
          <T size={18} weight="bold" style={{ marginTop: 2 }}>
            {p.name}
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <Rating value={avg} count={reviews.length} />
            {reviews.length > 0 && (
              <T size={12} weight="bold">
                {avg.toFixed(1)}
              </T>
            )}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <T size={26} weight="bold" color={colors.primary}>
              {money(price)}
            </T>
            {discount > 0 && (
              <>
                <T size={14} color={colors.muted} style={{ textDecorationLine: 'line-through' }}>
                  {money(old)}
                </T>
                <Pill text={`-${discount}%`} />
              </>
            )}
          </View>
          {saved > 0 && (
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <Pill text={`Save ${money(saved)}`} bg={colors.successSoft} fg={colors.success} icon="pricetag-outline" />
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
            <Ionicons name={stock > 0 ? 'checkmark-circle' : 'close-circle'} size={16} color={stock > 0 ? colors.success : colors.danger} />
            <T size={12.5} weight="medium" color={stock > 0 ? colors.success : colors.danger}>
              {stock > 0 ? (stock <= 5 ? `Only ${stock} left in stock` : 'In stock') : 'Out of stock'}
            </T>
            {!!variant?.sku && (
              <T size={11} color={colors.muted} style={{ marginLeft: 'auto' }} numberOfLines={1}>
                SKU: {variant.sku.length > 22 ? `${variant.sku.slice(0, 22)}…` : variant.sku}
              </T>
            )}
          </View>

          {/* Variant pickers */}
          {rams.length > 0 && (
            <OptionRow label="RAM">
              {rams.map((r) => (
                <Option key={r} text={r} active={variant ? ramOf(variant) === r : false} dim={!variants.some((v) => ramOf(v) === r && v.stock > 0)} onPress={() => choose('ram', r)} />
              ))}
            </OptionRow>
          )}
          {storages.length > 0 && (
            <OptionRow label="Storage">
              {storages.map((s) => (
                <Option key={s} text={s} active={variant ? storageOf(variant) === s : false} dim={!variants.some((v) => storageOf(v) === s && v.stock > 0)} onPress={() => choose('storage', s)} />
              ))}
            </OptionRow>
          )}
          {colorsList.length > 0 && (
            <OptionRow label={`Color${variant?.color ? ` · ${variant.color.name}` : ''}`}>
              {colorsList.map((c) => {
                const on = variant ? colorOf(variant) === c.id : false;
                return (
                  <Pressable key={c.id} onPress={() => choose('color', c.id)} style={[styles.swatchRing, on && { borderColor: colors.primary }]}>
                    <View style={[styles.swatch, { backgroundColor: c.hex_code || '#ccc' }]} />
                  </Pressable>
                );
              })}
            </OptionRow>
          )}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <Button title={wished ? 'Saved' : 'Wishlist'} variant="ghost" small icon={wished ? 'heart' : 'heart-outline'} full={false} onPress={() => variant && toggleWish(variant.id)} style={{ flex: 1 }} />
            <Button title={compared ? 'Added' : 'Compare'} variant="ghost" small icon="git-compare-outline" full={false} onPress={() => toggleCompare(p.id)} style={{ flex: 1 }} />
          </View>
          {compared && (
            <Pressable onPress={() => nav.navigate('Compare')} style={{ marginTop: 8 }}>
              <T size={12} color={colors.primary} weight="medium">
                {compareIds.length} selected · Open compare
              </T>
            </Pressable>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(
            [
              ['overview', 'Overview'],
              ['specs', 'Specs'],
              ['reviews', `Reviews (${reviews.length})`],
              ['qa', `Q&A (${questions.length})`],
            ] as [TabKey, string][]
          ).map(([k, label]) => (
            <Pressable key={k} onPress={() => setTab(k)} style={[styles.tab, tab === k && { borderBottomColor: colors.primary }]}>
              <T size={12.5} weight={tab === k ? 'bold' : 'medium'} color={tab === k ? colors.primary : colors.muted} numberOfLines={1}>
                {label}
              </T>
            </Pressable>
          ))}
        </View>

        <View style={{ padding: 16 }}>
          {tab === 'overview' && (
            <>
              {features.length > 0 && (
                <Card padded={false} style={{ overflow: 'hidden' }}>
                  {features.map(([k, v], i) => (
                    <View key={k} style={[styles.specRow, i % 2 === 0 && { backgroundColor: '#FAFAFC' }]}>
                      <T size={12.5} color={colors.muted} style={{ width: '38%' }}>
                        {k}
                      </T>
                      <T size={12.5} weight="medium" style={{ flex: 1 }}>
                        {valueText(v)}
                      </T>
                    </View>
                  ))}
                </Card>
              )}
              {!!p.description && (
                <>
                  <T weight="bold" size={15} style={{ marginTop: 18, marginBottom: 6 }}>
                    Description
                  </T>
                  <T size={13} color={colors.text2} style={{ lineHeight: 21 }}>
                    {p.description}
                  </T>
                </>
              )}
              {features.length === 0 && !p.description && <Empty icon="document-text-outline" title="No overview yet" />}
            </>
          )}

          {tab === 'specs' && <Specs spec={p.specification} />}
          {tab === 'reviews' && <Reviews productId={p.id} reviews={reviews} signedIn={Boolean(user)} onChanged={product.reload} onLogin={() => nav.navigate('Login')} />}
          {tab === 'qa' && <Questions productId={p.id} items={questions} signedIn={Boolean(user)} onChanged={product.reload} onLogin={() => nav.navigate('Login')} />}
        </View>
      </ScrollView>

      <FloatingBar
        nav={nav}
        insetsTop={insets.top}
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <IconButton name={wished ? 'heart' : 'heart-outline'} color={wished ? colors.danger : colors.text} onPress={() => variant && toggleWish(variant.id)} />
            <IconButton name="share-social-outline" onPress={() => void Share.share({ message: `${p.name} — ${money(price)} on TechNest` })} />
          </View>
        }
      />

      <StickyBar>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Stepper value={qty} onChange={setQty} max={Math.max(stock, 1)} />
          <View style={{ flex: 1 }}>
            <Button title="Add to Cart" icon="cart-outline" onPress={() => add(false)} loading={busy} disabled={stock <= 0 || !variant} />
          </View>
          <Button title="Buy" variant="dark" full={false} onPress={() => add(true)} disabled={stock <= 0 || !variant || busy} style={{ width: 72 }} />
        </View>
      </StickyBar>
    </View>
  );
}

function FloatingBar({ nav, insetsTop, right }: { nav: ReturnType<typeof useNav>; insetsTop: number; right?: React.ReactNode }) {
  return (
    <View style={[styles.floating, { top: insetsTop + 8 }]} pointerEvents="box-none">
      <IconButton name="chevron-back" onPress={() => nav.goBack()} />
      {right}
    </View>
  );
}

function OptionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 16 }}>
      <T size={12.5} weight="bold" style={{ marginBottom: 8 }}>
        {label}
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{children}</View>
    </View>
  );
}

function Option({ text, active, dim, onPress }: { text: string; active: boolean; dim?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.option, active ? { backgroundColor: colors.primary, borderColor: colors.primary } : null, dim && !active && { opacity: 0.45 }]}>
      <T size={12.5} weight="bold" color={active ? colors.white : colors.text2}>
        {text}
      </T>
    </Pressable>
  );
}

function Specs({ spec }: { spec?: Record<string, unknown> }) {
  const sections = specSections(spec);
  if (!sections.length) return <Empty icon="list-outline" title="No specifications yet" />;
  return (
    <View style={{ gap: 14 }}>
      {sections.map((s) => (
        <View key={s.title}>
          <T weight="bold" size={14} color={colors.primary} style={{ marginBottom: 6 }}>
            {s.title}
          </T>
          <Card padded={false} style={{ overflow: 'hidden' }}>
            {s.rows.map(([k, v], i) => (
              <View key={k + i} style={[styles.specRow, i % 2 === 0 && { backgroundColor: '#FAFAFC' }]}>
                <T size={12.5} color={colors.muted} style={{ width: '38%' }}>
                  {k}
                </T>
                <T size={12.5} weight="medium" style={{ flex: 1 }}>
                  {v}
                </T>
              </View>
            ))}
          </Card>
        </View>
      ))}
    </View>
  );
}

function Reviews({ productId, reviews, signedIn, onChanged, onLogin }: { productId: number; reviews: ProductReview[]; signedIn: boolean; onChanged: () => void; onLogin: () => void }) {
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!text.trim()) {
      toast('Write a few words about the product.', 'info');
      return;
    }
    setBusy(true);
    try {
      await api(endpoints.reviews, { method: 'POST', body: { product: productId, rating, review: text.trim() } });
      setText('');
      toast('Thanks! Your review will appear after approval.', 'success');
      onChanged();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <View>
      <Card>
        <T weight="bold" size={14} style={{ marginBottom: 8 }}>
          Write a review
        </T>
        {signedIn ? (
          <>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Pressable key={i} onPress={() => setRating(i)} hitSlop={4}>
                  <Ionicons name={i <= rating ? 'star' : 'star-outline'} size={28} color={i <= rating ? '#F5A524' : colors.borderStrong} />
                </Pressable>
              ))}
            </View>
            <Input multiline value={text} onChangeText={setText} placeholder="Share your experience…" />
            <Button title="Submit review" small onPress={submit} loading={busy} />
          </>
        ) : (
          <Button title="Sign in to review" variant="soft" small onPress={onLogin} />
        )}
      </Card>
      <View style={{ gap: 10, marginTop: 14 }}>
        {reviews.length === 0 && <Empty icon="chatbubble-ellipses-outline" title="No reviews yet" message="Be the first to review this product." />}
        {reviews.map((r) => (
          <Card key={r.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <T weight="bold" size={13}>
                {r.user_name || 'Customer'}
              </T>
              <T size={11} color={colors.muted}>
                {shortDate(r.created_at)}
              </T>
            </View>
            <View style={{ marginVertical: 4 }}>
              <Rating value={r.rating} size={12} />
            </View>
            <T size={13} color={colors.text2}>
              {r.review}
            </T>
          </Card>
        ))}
      </View>
    </View>
  );
}

function Questions({ productId, items, signedIn, onChanged, onLogin }: { productId: number; items: ProductQuestion[]; signedIn: boolean; onChanged: () => void; onLogin: () => void }) {
  const toast = useToast();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await api(endpoints.questions, { method: 'POST', body: { product: productId, question: text.trim() } });
      setText('');
      toast('Question sent. It will show once approved.', 'success');
      onChanged();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <View>
      <Card>
        <T weight="bold" size={14} style={{ marginBottom: 8 }}>
          Ask a question
        </T>
        {signedIn ? (
          <>
            <Input multiline value={text} onChangeText={setText} placeholder="Ask about specs, warranty, delivery…" />
            <Button title="Send question" small onPress={submit} loading={busy} />
          </>
        ) : (
          <Button title="Sign in to ask" variant="soft" small onPress={onLogin} />
        )}
      </Card>
      <View style={{ gap: 10, marginTop: 14 }}>
        {items.length === 0 && <Empty icon="help-circle-outline" title="No questions yet" />}
        {items.map((q) => (
          <Card key={q.id}>
            <T weight="bold" size={13}>
              Q: {q.question}
            </T>
            <T size={11} color={colors.muted} style={{ marginBottom: 6 }}>
              {q.user_name || 'Customer'} · {shortDate(q.created_at)}
            </T>
            {q.answer ? (
              <View style={{ backgroundColor: colors.primarySofter, padding: 10, borderRadius: radius.sm }}>
                <T size={12.5} color={colors.text2}>
                  A: {q.answer}
                </T>
              </View>
            ) : (
              <T size={12} color={colors.muted}>
                Awaiting answer from TechNest
              </T>
            )}
          </Card>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floating: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 5 },
  counter: { position: 'absolute', right: 16, top: undefined, bottom: 76, backgroundColor: 'rgba(20,16,13,0.7)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  thumb: { width: 54, height: 54, borderRadius: 12, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  option: { minWidth: 64, paddingHorizontal: 16, height: 40, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  swatchRing: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.borderStrong },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 8, ...shadow.sm, shadowOpacity: 0 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  specRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
});
