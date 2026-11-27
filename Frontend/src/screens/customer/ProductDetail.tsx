
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius } from '../../theme';

import {
  Button,
  Card,
  Empty,
  ErrorState,
  IconButton,
  Img,
  Input,
  Loader,
  Pill,
  Rating,
  T,
  StickyBar,
} from '../../components/ui';

import { api, endpoints, withQuery } from '../../lib/api';
import { useAsync } from '../../lib/hooks';

import {
  asList,
  errorMessage,
  money,
  num,
  shortDate,
  specSections,
  valueText,
} from '../../lib/format';

import { useAuth } from '../../store/Auth';
import { useShop } from '../../store/Shop';
import { useToast } from '../../store/Toast';
import { useNav, useParams } from '../../navigation/hooks';

import type {
  Product,
  ProductImage,
  ProductQuestion,
  ProductReview,
  Variant,
} from '../../types';

type TabKey = 'overview' | 'specs' | 'reviews' | 'qa';

const ramOf = (v: Variant) => String(v.ram ?? '').trim();
const storageOf = (v: Variant) => String(v.storage ?? '').trim();
const colorOf = (v: Variant) => v.color?.id ?? 0;
const hasStock = (v: Variant) => Number(v.stock ?? 0) > 0;

function getProductId(item: unknown): number | null {
  if (!item || typeof item !== 'object') return null;

  const obj = item as Record<string, any>;
  const raw = obj.product_id ?? obj.product;

  if (typeof raw === 'number') return raw;

  if (typeof raw === 'string' && raw.trim()) {
    const id = Number(raw);
    return Number.isFinite(id) ? id : null;
  }

  if (raw && typeof raw === 'object') {
    const id = Number(raw.id);
    return Number.isFinite(id) ? id : null;
  }

  return null;
}

function productOnly<T>(items: T[], productId: number): T[] {
  return items.filter((item) => getProductId(item) === productId);
}

function preferredVariant(variants: Variant[]): Variant | undefined {
  return (
    variants.find((v) => v.is_default && hasStock(v)) ??
    variants.find(hasStock) ??
    variants.find((v) => v.is_default) ??
    variants[0]
  );
}

function firstAvailable(variants: Variant[]): Variant | undefined {
  return variants.find(hasStock);
}

export default function ProductDetail() {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { slug = '' } = useParams<{
    slug: string;
    id: number;
    name: string;
  }>();

  const { user } = useAuth();
  const toast = useToast();

  const {
    cartCount,
    addToCart,
    toggleWish,
    isWished,
    compareIds,
    toggleCompare,
  } = useShop();

  const [tab, setTab] = useState<TabKey>('overview');
  const [variantId, setVariantId] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [zoomVisible, setZoomVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const galleryRef = useRef<FlatList<string>>(null);

  const product = useAsync(async () => {
    const p = await api<Product>(
      `${endpoints.products}${encodeURIComponent(slug)}/`,
      { auth: false }
    );

    const [imageResponse, reviewResponse, questionResponse] =
      await Promise.all([
        api<unknown>(
          withQuery(endpoints.images, { product: p.id }),
          { auth: false }
        ).catch(() => []),

        api<unknown>(
          withQuery(endpoints.reviews, { product: p.id }),
          { auth: false }
        ).catch(() => []),

        api<unknown>(
          withQuery(endpoints.questions, { product: p.id }),
          { auth: false }
        ).catch(() => []),
      ]);

    const images = asList<ProductImage>(imageResponse)
      .filter((img) => {
        const id = getProductId(img);
        return id === null || id === p.id;
      })
      .sort(
        (a, b) =>
          Number(Boolean(b.is_primary)) -
            Number(Boolean(a.is_primary)) ||
          (a.display_order ?? 0) - (b.display_order ?? 0)
      )
      .map((img) => img.image)
      .filter(Boolean);

    return {
      p,
      images,
      reviews: productOnly(
        asList<ProductReview>(reviewResponse),
        p.id
      ),
      questions: productOnly(
        asList<ProductQuestion>(questionResponse),
        p.id
      ),
    };
  }, [slug]);

  const p = product.data?.p;

  const variants = useMemo(
    () => (p?.variants ?? []).filter((v) => v.is_active !== false),
    [p]
  );

  const variant =
    variants.find((v) => v.id === variantId) ??
    preferredVariant(variants);

  const selectedRam = variant ? ramOf(variant) : '';
  const selectedStorage = variant ? storageOf(variant) : '';
  const selectedColor = variant ? colorOf(variant) : 0;

  const rams = useMemo(
    () => [...new Set(variants.map(ramOf).filter(Boolean))],
    [variants]
  );

  const storages = useMemo(
    () => [...new Set(variants.map(storageOf).filter(Boolean))],
    [variants]
  );

  const colorOptions = useMemo(() => {
    const map = new Map<number, NonNullable<Variant['color']>>();

    variants.forEach((v) => {
      if (v.color) map.set(v.color.id, v.color);
    });

    return [...map.values()];
  }, [variants]);

  useEffect(() => {
    setVariantId(null);
    setQty(1);
    setImageIndex(0);
    setZoomVisible(false);
    setTab('overview');
  }, [slug]);

  if (product.loading) {
    return (
      <View style={styles.screen}>
        <FloatingBar nav={nav} top={insets.top} />
        <Loader />
      </View>
    );
  }

  if (product.error || !p) {
    return (
      <View style={styles.screen}>
        <FloatingBar nav={nav} top={insets.top} />
        <ErrorState
          message={product.error || 'Product not found.'}
          onRetry={product.retry}
        />
      </View>
    );
  }

  const { images, reviews, questions } = product.data!;

  const gallery = images.length ? images : [''];

  const stock = Math.max(0, Number(variant?.stock ?? 0));
  const price = num(variant?.discounted_price ?? variant?.price);
  const originalPrice = num(variant?.price);
  const discount = Math.round(num(variant?.discount_percentage));
  const saved = Math.max(originalPrice - price, 0);

  const wished = variant ? isWished(variant.id) : false;
  const compared = compareIds.includes(p.id);

  const avg = reviews.length
    ? reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) /
      reviews.length
    : 0;

  const features = Object.entries(p.key_feature ?? {}).filter(
    ([, value]) => value !== null && value !== undefined && value !== ''
  );

  // ====================================================
  // STRICT API-BASED VARIANT AVAILABILITY
  //
  // RAM: available if any real variant has stock.
  // Storage: must match selected RAM.
  // Color: must match selected RAM + Storage.
  //
  // Selecting RAM automatically resolves a real
  // in-stock variant, then Storage and Color follow it.
  // ====================================================

  const ramAvailable = (ram: string) =>
    variants.some((v) => ramOf(v) === ram && hasStock(v));

  const storageAvailable = (storage: string) =>
    variants.some(
      (v) =>
        ramOf(v) === selectedRam &&
        storageOf(v) === storage &&
        hasStock(v)
    );

  const colorAvailable = (colorId: number) =>
    variants.some(
      (v) =>
        ramOf(v) === selectedRam &&
        storageOf(v) === selectedStorage &&
        colorOf(v) === colorId &&
        hasStock(v)
    );

  const selectRam = (ram: string) => {
    if (!ramAvailable(ram)) return;

    const matches = variants.filter(
      (v) => ramOf(v) === ram && hasStock(v)
    );

    const next =
      matches.find(
        (v) =>
          storageOf(v) === selectedStorage &&
          colorOf(v) === selectedColor
      ) ??
      matches.find((v) => storageOf(v) === selectedStorage) ??
      matches.find((v) => colorOf(v) === selectedColor) ??
      firstAvailable(matches);

    if (next) {
      setVariantId(next.id);
      setQty(1);
    }
  };

  const selectStorage = (storage: string) => {
    if (!storageAvailable(storage)) return;

    const matches = variants.filter(
      (v) =>
        ramOf(v) === selectedRam &&
        storageOf(v) === storage &&
        hasStock(v)
    );

    const next =
      matches.find((v) => colorOf(v) === selectedColor) ??
      firstAvailable(matches);

    if (next) {
      setVariantId(next.id);
      setQty(1);
    }
  };

  const selectColor = (colorId: number) => {
    if (!colorAvailable(colorId)) return;

    const next = variants.find(
      (v) =>
        ramOf(v) === selectedRam &&
        storageOf(v) === selectedStorage &&
        colorOf(v) === colorId &&
        hasStock(v)
    );

    if (next) {
      setVariantId(next.id);
      setQty(1);
    }
  };

  const add = async (buyNow: boolean) => {
    if (busy) return;

    if (!variant || !hasStock(variant)) {
      toast('Selected variant is unavailable.', 'info');
      return;
    }

    if (qty < 1 || qty > stock) {
      toast(`Available quantity: ${stock}`, 'info');
      return;
    }

    if (!user) {
      toast('Please sign in to continue.', 'info');
      nav.navigate('Login');
      return;
    }

    setBusy(true);

    try {
      // Actual selected variant ID from Django.
      const ok = await addToCart(variant.id, qty);

      if (ok && buyNow) {
        nav.navigate('Checkout');
      }
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleCompare = () => {
    if (!compared && compareIds.length >= 4) {
      toast('You can compare up to four products.', 'info');
      return;
    }

    toggleCompare(p.id);

    toast(
      compared ? 'Removed from compare list' : 'Added to compare list',
      compared ? 'info' : 'success'
    );
  };

  const changeImage = (index: number) => {
    const next = Math.max(0, Math.min(index, gallery.length - 1));

    setImageIndex(next);

    galleryRef.current?.scrollToOffset({
      offset: next * width,
      animated: true,
    });
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* PRODUCT GALLERY */}

        <View
          style={[
            styles.gallery,
            { paddingTop: insets.top + 56 },
          ]}
        >
          <FlatList
            ref={galleryRef}
            data={gallery}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => `${item}-${index}`}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            onMomentumScrollEnd={(event) => {
              setImageIndex(
                Math.round(event.nativeEvent.contentOffset.x / width)
              );
            }}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.gallerySlide, { width }]}
                onPress={() => {
                  if (item) setZoomVisible(true);
                }}
              >
                <Img
                  uri={item}
                  fit="contain"
                  style={styles.galleryImage}
                />

                {!!item && (
                  <View style={styles.zoomHint}>
                    <Ionicons
                      name="expand-outline"
                      size={15}
                      color={colors.text2}
                    />
                    <T size={11} color={colors.text2}>
                      Pinch to zoom
                    </T>
                  </View>
                )}
              </Pressable>
            )}
          />

          {images.length > 1 && (
            <>
              <View style={styles.imageCounter}>
                <T size={11} weight="bold" color={colors.white}>
                  {imageIndex + 1}/{images.length}
                </T>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnails}
              >
                {images.map((url, index) => (
                  <Pressable
                    key={`${url}-${index}`}
                    onPress={() => changeImage(index)}
                    style={[
                      styles.thumbnail,
                      index === imageIndex && styles.thumbnailActive,
                    ]}
                  >
                    <Img
                      uri={url}
                      fit="contain"
                      style={{ width: 44, height: 44 }}
                    />
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}
        </View>

        {/* PRODUCT DETAILS */}

        <View style={styles.content}>
          {!!p.brand && (
            <T size={12} weight="medium" color={colors.primary}>
              {p.brand}
            </T>
          )}

          <T size={18} weight="bold" style={{ marginTop: 4 }}>
            {p.name}
          </T>

          <View style={styles.ratingRow}>
            <Rating value={avg} count={reviews.length} />
            {reviews.length > 0 && (
              <T size={12} weight="bold">
                {avg.toFixed(1)}
              </T>
            )}
          </View>

          <View style={styles.priceRow}>
            <T size={26} weight="bold" color={colors.primary}>
              {money(price)}
            </T>

            {discount > 0 && (
              <>
                <T
                  size={13}
                  color={colors.muted}
                  style={{ textDecorationLine: 'line-through' }}
                >
                  {money(originalPrice)}
                </T>

                <Pill text={`-${discount}%`} />
              </>
            )}
          </View>

          {saved > 0 && (
            <View style={{ alignSelf: 'flex-start', marginTop: 8 }}>
              <Pill
                text={`Save ${money(saved)}`}
                bg={colors.successSoft}
                fg={colors.success}
                icon="pricetag-outline"
              />
            </View>
          )}

          <View style={styles.stockRow}>
            <Ionicons
              name={stock > 0 ? 'checkmark-circle' : 'close-circle'}
              size={17}
              color={stock > 0 ? colors.success : colors.danger}
            />

            <T
              size={12}
              weight="medium"
              color={stock > 0 ? colors.success : colors.danger}
            >
              {stock > 0 ? `${stock} available` : 'Out of stock'}
            </T>
          </View>

          {!!variant?.sku && (
            <T size={11} color={colors.muted} style={{ marginTop: 5 }}>
              SKU: {variant.sku}
            </T>
          )}

          {/* RAM */}

          {rams.length > 0 && (
            <OptionRow label="RAM">
              {rams.map((ram) => (
                <VariantOption
                  key={ram}
                  label={ram}
                  selected={selectedRam === ram}
                  available={ramAvailable(ram)}
                  onPress={() => selectRam(ram)}
                />
              ))}
            </OptionRow>
          )}

          {/* STORAGE */}

          {storages.length > 0 && (
            <OptionRow label="Storage">
              {storages.map((storage) => (
                <VariantOption
                  key={storage}
                  label={storage}
                  selected={selectedStorage === storage}
                  available={storageAvailable(storage)}
                  onPress={() => selectStorage(storage)}
                />
              ))}
            </OptionRow>
          )}

          {/* COLOR */}

          {colorOptions.length > 0 && (
            <OptionRow
              label={`Color${variant?.color ? ` · ${variant.color.name}` : ''}`}
            >
              {colorOptions.map((color) => {
                const available = colorAvailable(color.id);
                const selected = selectedColor === color.id;

                return (
                  <Pressable
                    key={color.id}
                    disabled={!available}
                    accessibilityRole="button"
                    accessibilityLabel={`${color.name}${available ? '' : ', unavailable'}`}
                    style={[
                      styles.colorOption,
                      selected && styles.colorSelected,
                      !available && styles.disabledOption,
                    ]}
                    onPress={() => selectColor(color.id)}
                  >
                    <View
                      style={[
                        styles.colorDot,
                        {
                          backgroundColor:
                            color.hex_code || '#CCCCCC',
                        },
                      ]}
                    />

                    <T
                      size={11}
                      weight="medium"
                      color={available ? colors.text : colors.muted}
                    >
                      {color.name}
                    </T>

                    {!available && (
                      <Ionicons
                        name="close-circle"
                        size={13}
                        color={colors.muted}
                      />
                    )}
                  </Pressable>
                );
              })}
            </OptionRow>
          )}

          {/* WISHLIST / COMPARE */}

          <View style={styles.secondaryActions}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Button
                title={wished ? 'Saved' : 'Wishlist'}
                variant="ghost"
                small
                icon={wished ? 'heart' : 'heart-outline'}
                onPress={() => variant && toggleWish(variant.id)}
              />
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Button
                title={compared ? 'Added' : 'Compare'}
                variant="ghost"
                small
                icon="git-compare-outline"
                onPress={handleCompare}
              />
            </View>
          </View>

          {compared && (
            <Pressable
              style={{ marginTop: 10 }}
              onPress={() => nav.navigate('Compare')}
            >
              <T size={12} color={colors.primary} weight="medium">
                {compareIds.length}/4 selected · Open compare list
              </T>
            </Pressable>
          )}
        </View>

        {/* TABS */}

        <View style={styles.tabs}>
          {(
            [
              ['overview', 'Overview'],
              ['specs', 'Specs'],
              ['reviews', `Reviews (${reviews.length})`],
              ['qa', `Q&A (${questions.length})`],
            ] as [TabKey, string][]
          ).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              style={[
                styles.tab,
                tab === key && styles.activeTab,
              ]}
            >
              <T
                size={11.5}
                weight={tab === key ? 'bold' : 'medium'}
                color={tab === key ? colors.primary : colors.muted}
                numberOfLines={1}
              >
                {label}
              </T>
            </Pressable>
          ))}
        </View>

        <View style={styles.tabContent}>
          {tab === 'overview' && (
            <>
              {features.length > 0 && (
                <Card padded={false} style={{ overflow: 'hidden' }}>
                  {features.map(([key, value], index) => (
                    <View
                      key={key}
                      style={[
                        styles.specRow,
                        index % 2 === 0 && styles.alternateRow,
                      ]}
                    >
                      <T
                        size={12}
                        color={colors.muted}
                        style={{ width: '38%' }}
                      >
                        {key}
                      </T>

                      <T size={12} weight="medium" style={{ flex: 1 }}>
                        {valueText(value)}
                      </T>
                    </View>
                  ))}
                </Card>
              )}

              {!!p.description && (
                <>
                  <T
                    size={15}
                    weight="bold"
                    style={{ marginTop: 18, marginBottom: 8 }}
                  >
                    Description
                  </T>

                  <T
                    size={13}
                    color={colors.text2}
                    style={{ lineHeight: 21 }}
                  >
                    {p.description}
                  </T>
                </>
              )}

              {!features.length && !p.description && (
                <Empty
                  icon="document-text-outline"
                  title="No overview yet"
                />
              )}
            </>
          )}

          {tab === 'specs' && <Specs spec={p.specification} />}

          {tab === 'reviews' && (
            <Reviews
              key={`reviews-${p.id}`}
              productId={p.id}
              reviews={reviews}
              signedIn={Boolean(user)}
              onChanged={product.reload}
              onLogin={() => nav.navigate('Login')}
            />
          )}

          {tab === 'qa' && (
            <Questions
              key={`questions-${p.id}`}
              productId={p.id}
              items={questions}
              signedIn={Boolean(user)}
              onChanged={product.reload}
              onLogin={() => nav.navigate('Login')}
            />
          )}
        </View>
      </ScrollView>

      {/* HEADER */}

      <FloatingBar
        nav={nav}
        top={insets.top}
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <IconButton
              name={wished ? 'heart' : 'heart-outline'}
              color={wished ? colors.danger : colors.text}
              onPress={() => variant && toggleWish(variant.id)}
            />

            <IconButton
              name="cart-outline"
              badge={cartCount}
              onPress={() =>
                nav.navigate('CustomerTabs', {
                  screen: 'Cart',
                })
              }
            />

            <IconButton
              name="share-social-outline"
              onPress={() =>
                void Share.share({
                  message: `${p.name} — ${money(price)} on TechNest`,
                })
              }
            />
          </View>
        }
      />

      {/* IMPROVED PURCHASE BAR */}

      <StickyBar>
        <View style={styles.purchaseArea}>
          <View style={styles.quantityRow}>
            <View style={styles.quantityLabel}>
              <T size={14} weight="bold">Quantity</T>
              <T size={11} color={colors.muted}>
                {stock > 0 ? `${stock} in stock` : 'Unavailable'}
              </T>
            </View>
            <View style={styles.quantityColumn}>
              <QuantitySelector
                value={qty}
                max={stock}
                onChange={setQty}
              />
            </View>
          </View>

          <View style={styles.purchaseButtons}>
            <Pressable
              accessibilityRole="button"
              disabled={busy || stock <= 0 || !variant}
              onPress={() => add(false)}
              style={({ pressed }) => [
                styles.purchaseButton,
                styles.cartPurchaseButton,
                (pressed || busy || stock <= 0 || !variant) && styles.purchaseButtonDimmed,
              ]}
            >
              {busy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <T size={13} weight="bold" color={colors.white} numberOfLines={1}>
                  {stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                </T>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy || stock <= 0 || !variant}
              onPress={() => add(true)}
              style={({ pressed }) => [
                styles.purchaseButton,
                styles.buyPurchaseButton,
                (pressed || busy || stock <= 0 || !variant) && styles.purchaseButtonDimmed,
              ]}
            >
              {busy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <T size={13} weight="bold" color={colors.white} numberOfLines={1}>
                  Buy Now
                </T>
              )}
            </Pressable>
          </View>
        </View>
      </StickyBar>

      {/* REAL PINCH ZOOM */}

      <PinchZoomViewer
        visible={zoomVisible}
        images={gallery}
        index={imageIndex}
        onChangeIndex={changeImage}
        onClose={() => setZoomVisible(false)}
      />
    </View>
  );
}

// ======================================================
// QUANTITY SELECTOR
// ======================================================

function QuantitySelector({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const decreaseDisabled = value <= 1 || max <= 0;
  const increaseDisabled = value >= max || max <= 0;

  return (
    <View style={styles.quantityControl}>
      <Pressable
        disabled={decreaseDisabled}
        onPress={() => onChange(Math.max(1, value - 1))}
        style={[
          styles.quantityAction,
          decreaseDisabled && styles.quantityDisabled,
        ]}
      >
        <Ionicons name="remove" size={21} color={colors.text} />
      </Pressable>

      <View style={styles.quantityValue}>
        <T size={16} weight="bold" color={colors.text}>
          {value}
        </T>
      </View>

      <Pressable
        disabled={increaseDisabled}
        onPress={() => onChange(Math.min(max, value + 1))}
        style={[
          styles.quantityAction,
          increaseDisabled && styles.quantityDisabled,
        ]}
      >
        <Ionicons name="add" size={21} color={colors.text} />
      </Pressable>
    </View>
  );
}

// ======================================================
// PINCH ZOOM VIEWER
// Built-in two-touch pinch and drag gestures.
// No extra package required.
// ======================================================

function PinchZoomViewer({
  visible,
  images,
  index,
  onChangeIndex,
  onClose,
}: {
  visible: boolean;
  images: string[];
  index: number;
  onChangeIndex: (index: number) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });

  const scaleRef = useRef(1);
  const translateRef = useRef({ x: 0, y: 0 });

  const gestureRef = useRef({
    initialDistance: 0,
    initialScale: 1,
    initialX: 0,
    initialY: 0,
    initialTranslateX: 0,
    initialTranslateY: 0,
    touches: 0,
  });

  const lastTap = useRef(0);

  const setZoom = (next: number) => {
    const clamped = Math.max(1, Math.min(4, next));
    scaleRef.current = clamped;
    setScale(clamped);

    if (clamped === 1) {
      translateRef.current = { x: 0, y: 0 };
      setTranslate({ x: 0, y: 0 });
    }
  };

  const setPosition = (x: number, y: number) => {
    const currentScale = scaleRef.current;

    const maxX = Math.max(0, ((currentScale - 1) * width) / 2);
    const maxY = Math.max(0, ((currentScale - 1) * height) / 2);

    const next = {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };

    translateRef.current = next;
    setTranslate(next);
  };

  const resetZoom = () => {
    scaleRef.current = 1;
    translateRef.current = { x: 0, y: 0 };
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  };

  useEffect(() => {
    resetZoom();
  }, [index, visible]);

  const distance = (touches: readonly { pageX: number; pageY: number }[]) => {
    if (touches.length < 2) return 0;

    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;

    return Math.sqrt(dx * dx + dy * dy);
  };

  const midpoint = (touches: readonly { pageX: number; pageY: number }[]) => {
    if (touches.length < 2) {
      return {
        x: touches[0]?.pageX ?? 0,
        y: touches[0]?.pageY ?? 0,
      };
    }

    return {
      x: (touches[0].pageX + touches[1].pageX) / 2,
      y: (touches[0].pageY + touches[1].pageY) / 2,
    };
  };

  const startGesture = (touches: readonly { pageX: number; pageY: number }[]) => {
    const point = midpoint(touches);

    gestureRef.current = {
      initialDistance: distance(touches),
      initialScale: scaleRef.current,
      initialX: point.x,
      initialY: point.y,
      initialTranslateX: translateRef.current.x,
      initialTranslateY: translateRef.current.y,
      touches: touches.length,
    };
  };

  const handleMove = (touches: readonly { pageX: number; pageY: number }[]) => {
    if (!touches.length) return;

    if (gestureRef.current.touches !== touches.length) {
      startGesture(touches);
      return;
    }

    const point = midpoint(touches);
    const gesture = gestureRef.current;

    if (touches.length >= 2) {
      const currentDistance = distance(touches);

      if (gesture.initialDistance > 0) {
        const nextScale =
          gesture.initialScale *
          (currentDistance / gesture.initialDistance);

        setZoom(nextScale);
      }

      setPosition(
        gesture.initialTranslateX + point.x - gesture.initialX,
        gesture.initialTranslateY + point.y - gesture.initialY
      );
    } else if (scaleRef.current > 1) {
      setPosition(
        gesture.initialTranslateX + point.x - gesture.initialX,
        gesture.initialTranslateY + point.y - gesture.initialY
      );
    }
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (event) =>
          event.nativeEvent.touches.length >= 2 ||
          scaleRef.current > 1,

        onMoveShouldSetPanResponder: (event) =>
          event.nativeEvent.touches.length >= 2 ||
          scaleRef.current > 1,

        onPanResponderGrant: (event) => {
          startGesture(event.nativeEvent.touches);
        },

        onPanResponderMove: (event) => {
          handleMove(event.nativeEvent.touches);
        },

        onPanResponderRelease: () => {
          gestureRef.current.touches = 0;
        },

        onPanResponderTerminate: () => {
          gestureRef.current.touches = 0;
        },
      }),
    [width, height]
  );

  const doubleTap = () => {
    const now = Date.now();

    if (now - lastTap.current < 300) {
      if (scaleRef.current > 1) {
        resetZoom();
      } else {
        setZoom(2.5);
      }
    }

    lastTap.current = now;
  };

  const previous = () => {
    if (index > 0) {
      resetZoom();
      onChangeIndex(index - 1);
    }
  };

  const next = () => {
    if (index < images.length - 1) {
      resetZoom();
      onChangeIndex(index + 1);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.zoomScreen}>
        <View
          style={[
            styles.zoomHeader,
            { paddingTop: insets.top + 12 },
          ]}
        >
          <T size={13} color={colors.white} weight="medium">
            {index + 1} / {images.length}
          </T>

          <Pressable onPress={onClose} style={styles.zoomClose}>
            <Ionicons name="close" size={25} color={colors.white} />
          </Pressable>
        </View>

        <View style={styles.zoomStage} {...responder.panHandlers}>
          <Pressable
            onPress={doubleTap}
            style={styles.zoomTouchArea}
          >
            <Img
              uri={images[index] ?? ''}
              fit="contain"
              style={[
                {
                  width: width - 24,
                  height: Math.min(height * 0.7, 550),
                },
                {
                  transform: [
                    { translateX: translate.x },
                    { translateY: translate.y },
                    { scale },
                  ],
                },
              ]}
            />
          </Pressable>
        </View>

        <View
          style={[
            styles.zoomFooter,
            {
              paddingBottom: Math.max(insets.bottom, 12) + 12,
            },
          ]}
        >
          <Pressable
            disabled={index === 0}
            onPress={previous}
            style={[
              styles.zoomArrow,
              index === 0 && { opacity: 0.3 },
            ]}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={colors.white}
            />
          </Pressable>

          <View style={{ alignItems: 'center', gap: 5 }}>
            <T size={12} color={colors.white}>
              {Math.round(scale * 100)}%
            </T>

            <T size={10} color="#BBBBBB">
              Pinch with two fingers
            </T>

            <Pressable onPress={resetZoom}>
              <T size={11} color="#FF9B50">
                Reset zoom
              </T>
            </Pressable>
          </View>

          <Pressable
            disabled={index === images.length - 1}
            onPress={next}
            style={[
              styles.zoomArrow,
              index === images.length - 1 && { opacity: 0.3 },
            ]}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={colors.white}
            />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ======================================================
// COMMON COMPONENTS
// ======================================================

function FloatingBar({
  nav,
  top,
  right,
}: {
  nav: ReturnType<typeof useNav>;
  top: number;
  right?: React.ReactNode;
}) {
  return (
    <View
      pointerEvents="box-none"
      style={[styles.floating, { top: top + 8 }]}
    >
      <IconButton
        name="chevron-back"
        onPress={() => nav.goBack()}
      />
      {right}
    </View>
  );
}

function OptionRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginTop: 18 }}>
      <T size={12.5} weight="bold" style={{ marginBottom: 9 }}>
        {label}
      </T>

      <View style={styles.optionsRow}>{children}</View>
    </View>
  );
}

function VariantOption({
  label,
  selected,
  available,
  onPress,
}: {
  label: string;
  selected: boolean;
  available: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={!available}
      accessibilityRole="button"
      accessibilityState={{ disabled: !available, selected }}
      onPress={onPress}
      style={[
        styles.variantOption,
        selected && styles.variantSelected,
        !available && styles.disabledOption,
      ]}
    >
      <T
        size={12}
        weight="medium"
        color={
          !available
            ? colors.muted
            : selected
              ? colors.white
              : colors.text
        }
      >
        {label}
      </T>

      {!available && (
        <Ionicons
          name="close-circle-outline"
          size={13}
          color={colors.muted}
        />
      )}
    </Pressable>
  );
}

function Specs({
  spec,
}: {
  spec?: Record<string, unknown>;
}) {
  const sections = specSections(spec);

  if (!sections.length) {
    return <Empty icon="list-outline" title="No specifications yet" />;
  }

  return (
    <View style={{ gap: 15 }}>
      {sections.map((section) => (
        <View key={section.title}>
          <T
            size={14}
            weight="bold"
            color={colors.primary}
            style={{ marginBottom: 7 }}
          >
            {section.title}
          </T>

          <Card padded={false} style={{ overflow: 'hidden' }}>
            {section.rows.map(([key, value], index) => (
              <View
                key={`${key}-${index}`}
                style={[
                  styles.specRow,
                  index % 2 === 0 && styles.alternateRow,
                ]}
              >
                <T
                  size={12}
                  color={colors.muted}
                  style={{ width: '38%' }}
                >
                  {key}
                </T>

                <T size={12} weight="medium" style={{ flex: 1 }}>
                  {value}
                </T>
              </View>
            ))}
          </Card>
        </View>
      ))}
    </View>
  );
}

// ======================================================
// API REVIEWS
// ======================================================

function Reviews({
  productId,
  reviews,
  signedIn,
  onChanged,
  onLogin,
}: {
  productId: number;
  reviews: ProductReview[];
  signedIn: boolean;
  onChanged: () => void;
  onLogin: () => void;
}) {
  const toast = useToast();

  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!text.trim()) {
      toast('Please write your review.', 'info');
      return;
    }

    setBusy(true);

    try {
      await api(endpoints.reviews, {
        method: 'POST',
        body: {
          product: productId,
          rating,
          review: text.trim(),
        },
      });

      setText('');
      toast('Review submitted successfully.', 'success');
      onChanged();
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Card>
        <T size={14} weight="bold" style={{ marginBottom: 10 }}>
          Write a review
        </T>

        {signedIn ? (
          <>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Pressable key={i} onPress={() => setRating(i)}>
                  <Ionicons
                    name={i <= rating ? 'star' : 'star-outline'}
                    size={28}
                    color={i <= rating ? '#F5A524' : colors.borderStrong}
                  />
                </Pressable>
              ))}
            </View>

            <Input
              multiline
              value={text}
              onChangeText={setText}
              placeholder="Share your experience…"
            />

            <Button
              title="Submit Review"
              small
              loading={busy}
              onPress={submit}
            />
          </>
        ) : (
          <Button
            title="Sign in to review"
            variant="soft"
            small
            onPress={onLogin}
          />
        )}
      </Card>

      <View style={{ gap: 12, marginTop: 15 }}>
        {reviews.length === 0 && (
          <Empty
            icon="chatbubble-ellipses-outline"
            title="No reviews yet"
            message="Be the first to review this product."
          />
        )}

        {reviews.map((review) => (
          <Card key={review.id}>
            <View style={styles.feedbackHeader}>
              <T size={13} weight="bold">
                {review.user_name || 'Customer'}
              </T>

              <T size={11} color={colors.muted}>
                {shortDate(review.created_at)}
              </T>
            </View>

            <View style={{ marginVertical: 6 }}>
              <Rating value={review.rating} size={12} />
            </View>

            <T size={13} color={colors.text2}>
              {review.review}
            </T>
          </Card>
        ))}
      </View>
    </View>
  );
}

// ======================================================
// API QUESTIONS
// ======================================================

function Questions({
  productId,
  items,
  signedIn,
  onChanged,
  onLogin,
}: {
  productId: number;
  items: ProductQuestion[];
  signedIn: boolean;
  onChanged: () => void;
  onLogin: () => void;
}) {
  const toast = useToast();

  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!text.trim()) {
      toast('Please enter your question.', 'info');
      return;
    }

    setBusy(true);

    try {
      await api(endpoints.questions, {
        method: 'POST',
        body: {
          product: productId,
          question: text.trim(),
        },
      });

      setText('');
      toast('Question submitted successfully.', 'success');
      onChanged();
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Card>
        <T size={14} weight="bold" style={{ marginBottom: 10 }}>
          Ask a question
        </T>

        {signedIn ? (
          <>
            <Input
              multiline
              value={text}
              onChangeText={setText}
              placeholder="Ask about this product…"
            />

            <Button
              title="Send Question"
              small
              loading={busy}
              onPress={submit}
            />
          </>
        ) : (
          <Button
            title="Sign in to ask"
            variant="soft"
            small
            onPress={onLogin}
          />
        )}
      </Card>

      <View style={{ gap: 12, marginTop: 15 }}>
        {items.length === 0 && (
          <Empty
            icon="help-circle-outline"
            title="No questions for this product"
          />
        )}

        {items.map((question) => (
          <Card key={question.id}>
            <T size={13} weight="bold">
              Q: {question.question}
            </T>

            <T
              size={11}
              color={colors.muted}
              style={{ marginTop: 5, marginBottom: 8 }}
            >
              {question.user_name || 'Customer'} ·{' '}
              {shortDate(question.created_at)}
            </T>

            {question.answer ? (
              <View style={styles.answerBox}>
                <T size={12.5} color={colors.text2}>
                  A: {question.answer}
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

// ======================================================
// STYLES - FLAT DESIGN, NO SHADOWS
// ======================================================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },

  floating: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 5,
  },

  gallery: {
    backgroundColor: '#FAFAFC',
  },

  gallerySlide: {
    height: 290,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  galleryImage: {
    width: '100%',
    height: 245,
  },

  zoomHint: {
    position: 'absolute',
    bottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },

  imageCounter: {
    position: 'absolute',
    right: 16,
    bottom: 77,
    backgroundColor: 'rgba(20,16,13,0.75)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  thumbnails: {
    gap: 8,
    padding: 12,
    flexGrow: 1,
    justifyContent: 'center',
  },

  thumbnail: {
    width: 54,
    height: 54,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  thumbnailActive: {
    borderColor: colors.primary,
    borderWidth: 2,
  },

  content: {
    padding: 16,
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },

  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 14,
  },

  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },

  variantOption: {
    minHeight: 43,
    minWidth: 70,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  variantSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  disabledOption: {
    opacity: 0.45,
    backgroundColor: colors.bg,
    borderColor: colors.border,
  },

  colorOption: {
    minHeight: 43,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  colorSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primarySofter,
  },

  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },

  secondaryActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },

  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  tab: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 13,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },

  activeTab: {
    borderBottomColor: colors.primary,
  },

  tabContent: {
    padding: 16,
  },

  specRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  alternateRow: {
    backgroundColor: '#FAFAFC',
  },

  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  answerBox: {
    backgroundColor: colors.primarySofter,
    padding: 12,
    borderRadius: radius.sm,
  },

  // LARGE QUANTITY SELECTOR

  purchaseArea: {
    gap: 7,
  },

  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  quantityLabel: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    height: 40,
  },

  quantityColumn: {
    flex: 1,
    minWidth: 0,
  },

  quantityControl: {
    height: 40,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },

  quantityAction: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },

  quantityDisabled: {
    opacity: 0.3,
  },

  quantityValue: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },

  purchaseButtons: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },

  purchaseButton: {
    flex: 1,
    minWidth: 0,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },

  cartPurchaseButton: {
    backgroundColor: colors.primary,
  },

  buyPurchaseButton: {
    backgroundColor: colors.dark,
  },

  purchaseButtonDimmed: {
    opacity: 0.65,
  },

  // PINCH ZOOM

  zoomScreen: {
    flex: 1,
    backgroundColor: '#101010',
  },

  zoomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    zIndex: 2,
  },

  zoomClose: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: '#292929',
  },

  zoomStage: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  zoomTouchArea: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  zoomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 24,
  },

  zoomArrow: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#292929',
    borderRadius: radius.md,
  },
});
