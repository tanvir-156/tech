import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadow } from '../../theme';
import {
  LightStatus,
  SearchBar,
  SectionHeader,
  T,
  IconButton,
} from '../../components/ui';
import { Wordmark } from '../../components/Brand';
import { ProductCard } from '../../components/ProductCard';
import { useAsync } from '../../lib/hooks';
import {
  getBrands,
  getImageIndex,
  useCategories,
} from '../../lib/catalog';
import { listProducts } from '../../lib/products';
import { api, endpoints } from '../../lib/api';
import { asList, initials } from '../../lib/format';
import { useAuth } from '../../store/Auth';
import { useNav } from '../../navigation/hooks';

import type {
  Brand,
  Category,
  Notice,
  Product,
} from '../../types';

// ======================================================
// CONFIGURATION
// ======================================================

const BANNERS = [
  require('../../../assets/banner/banner1.png'),
  require('../../../assets/banner/banner2.png'),
  require('../../../assets/banner/banner3.png'),
];

const BANNER_INTERVAL = 2000;
const BANNER_JUMP_DELAY = 650; // wait for the slide animation before silent reset

// Notice scrolling speed in pixels per second.
const NOTICE_SPEED = 45;
const NOTICE_CHAR_WIDTH = 7; // fallback estimate until the real width is measured

const MAX_FEATURED_CATEGORIES = 10;
const NEW_ARRIVALS_LIMIT = 10;
const NEW_ARRIVALS_HOME_COUNT = 6;

// Deals of the Day
const DEALS_POOL_LIMIT = 60; // products fetched to pick from
const DEALS_COUNT = 6; // products shown per day
const DEAL_CARD_WIDTH = 160;
const DEAL_GAP = 12;
const DEALS_SCROLL_INTERVAL = 1000;

type IconName = keyof typeof Ionicons.glyphMap;

// ======================================================
// CATEGORY ICONS
// ======================================================

const CATEGORY_ICON_RULES: [RegExp, IconName][] = [
  [/laptop|notebook|ultrabook|macbook/, 'laptop-outline'],
  [/desktop|computer|pc|workstation/, 'desktop-outline'],
  [/mobile|smartphone|iphone|phone/, 'phone-portrait-outline'],
  [/tablet|ipad/, 'tablet-portrait-outline'],
  [/processor|cpu/, 'hardware-chip-outline'],
  [/motherboard|mainboard/, 'hardware-chip-outline'],
  [/graphics|gpu|video card/, 'hardware-chip-outline'],
  [/ram|memory/, 'layers-outline'],
  [/ssd|hdd|storage|hard disk|drive/, 'server-outline'],
  [/monitor|display|screen/, 'desktop-outline'],
  [/keyboard/, 'keypad-outline'],
  [/mouse|mice/, 'navigate-outline'],
  [/headphone|headset|earphone|earbud/, 'headset-outline'],
  [/speaker|sound|audio/, 'volume-high-outline'],
  [/microphone|mic\b/, 'mic-outline'],
  [/camera|webcam|cctv/, 'camera-outline'],
  [/router|wifi|wi-fi|network/, 'wifi-outline'],
  [/printer|printing/, 'print-outline'],
  [/scanner/, 'scan-outline'],
  [/gaming|game|console|playstation|xbox/, 'game-controller-outline'],
  [/watch|smartwatch/, 'watch-outline'],
  [/television|smart tv|\btv\b/, 'tv-outline'],
  [/refrigerator|fridge|freezer/, 'snow-outline'],
  [/air conditioner|\bac\b|cooling/, 'snow-outline'],
  [/washing machine|laundry/, 'water-outline'],
  [/power supply|psu|ups|battery/, 'battery-charging-outline'],
  [/casing|case|cabinet/, 'cube-outline'],
  [/cooler|cooling fan|fan/, 'sync-outline'],
  [/cable|adapter|charger/, 'flash-outline'],
  [/accessor|gadget/, 'extension-puzzle-outline'],
  [/component/, 'hardware-chip-outline'],
  [/home|appliance/, 'home-outline'],
];

function getCategoryIcon(name: string): IconName {
  const n = name.toLowerCase().trim();
  for (const [pattern, icon] of CATEGORY_ICON_RULES) {
    if (pattern.test(n)) return icon;
  }
  return 'grid-outline';
}

// ======================================================
// PRODUCT SORTING
// NEWEST CREATED PRODUCT FIRST
// ======================================================

function sortNewestProducts(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;

    const safeA = Number.isFinite(dateA) ? dateA : 0;
    const safeB = Number.isFinite(dateB) ? dateB : 0;

    return safeB - safeA;
  });
}

// ======================================================
// DAILY DEALS HELPERS
// Same products all day, new set after local midnight.
// ======================================================

function getDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function getNextMidnight(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1,
    0,
    0,
    0,
    0
  );
}

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickDailyDeals(
  products: Product[],
  dayKey: string,
  count: number
): Product[] {
  // Sort by id first so the shuffle is stable no matter what order the API returns.
  const list = [...products].sort((a, b) => Number(a.id) - Number(b.id));
  const rand = mulberry32(hashString(`deals-${dayKey}`));

  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }

  return list.slice(0, count);
}

const pad2 = (n: number) => String(n).padStart(2, '0');

// ======================================================
// BANNER CAROUSEL (smooth, seamless loop)
// ======================================================

function HomeBanner({ onPress }: { onPress: () => void }) {
  const { width } = useWindowDimensions();
  const bannerWidth = Math.max(1, width - 32);
  const count = BANNERS.length;

  // Clone the first slide at the end so the last -> first move
  // is a normal forward slide, then we silently reset to 0.
  const slides = count > 1 ? [...BANNERS, BANNERS[0]] : BANNERS;

  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const posRef = useRef(0); // raw position, 0..count (count = clone)
  const draggingRef = useRef(false);
  const resumeAtRef = useRef(0);
  const jumpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);

  const dotAnims = useRef(
    BANNERS.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))
  ).current;

  // Animate the dots whenever the active banner changes.
  useEffect(() => {
    dotAnims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: i === activeIndex ? 1 : 0,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // width/color cannot use the native driver
      }).start();
    });
  }, [activeIndex, dotAnims]);

  const normalizePosition = () => {
    if (count > 1 && posRef.current >= count && !draggingRef.current) {
      posRef.current = 0;
      scrollRef.current?.scrollTo({ x: 0, animated: false });
    }
  };

  // Reset when width changes (rotation etc.)
  useEffect(() => {
    posRef.current = 0;
    setActiveIndex(0);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [bannerWidth]);

  // Auto play
  useEffect(() => {
    if (count <= 1) return;

    const timer = setInterval(() => {
      if (draggingRef.current) return;
      if (Date.now() < resumeAtRef.current) return;

      const next = posRef.current + 1;
      if (next > count) return;

      posRef.current = next;
      scrollRef.current?.scrollTo({
        x: next * bannerWidth,
        animated: true,
      });

      if (next === count) {
        // Landed on the clone: after the slide finishes, jump to the real first slide.
        if (jumpTimerRef.current) clearTimeout(jumpTimerRef.current);
        jumpTimerRef.current = setTimeout(
          normalizePosition,
          BANNER_JUMP_DELAY
        );
      }
    }, BANNER_INTERVAL);

    return () => {
      clearInterval(timer);
      if (jumpTimerRef.current) clearTimeout(jumpTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bannerWidth, count]);

  const selectBanner = (index: number) => {
    posRef.current = index;
    setActiveIndex(index);
    resumeAtRef.current = Date.now() + BANNER_INTERVAL;

    scrollRef.current?.scrollTo({
      x: index * bannerWidth,
      animated: true,
    });
  };

  return (
    <View style={styles.bannerSection}>
      <View style={styles.bannerFrame}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          bounces={false}
          overScrollMode="never"
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScroll={(event) => {
            const raw = Math.round(
              event.nativeEvent.contentOffset.x / bannerWidth
            );
            setActiveIndex(((raw % count) + count) % count);
          }}
          onScrollBeginDrag={() => {
            draggingRef.current = true;
          }}
          onScrollEndDrag={() => {
            draggingRef.current = false;
            resumeAtRef.current = Date.now() + BANNER_INTERVAL;
          }}
          onMomentumScrollEnd={(event) => {
            const raw = Math.max(
              0,
              Math.min(
                slides.length - 1,
                Math.round(event.nativeEvent.contentOffset.x / bannerWidth)
              )
            );

            posRef.current = raw;
            draggingRef.current = false;
            resumeAtRef.current = Date.now() + BANNER_INTERVAL;

            // If the user swiped onto the clone, silently go back to slide 0.
            normalizePosition();
          }}
        >
          {slides.map((banner, index) => (
            <Pressable
              key={index}
              onPress={onPress}
              style={{
                width: bannerWidth,
                height: bannerWidth * 0.48,
              }}
            >
              <Image
                source={banner}
                resizeMode="cover"
                style={styles.bannerImage}
              />
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.bannerDots}>
        {BANNERS.map((_, index) => (
          <Pressable
            key={index}
            onPress={() => selectBanner(index)}
            hitSlop={8}
          >
            <Animated.View
              style={[
                styles.bannerDot,
                {
                  width: dotAnims[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [7, 22],
                  }),
                  backgroundColor: dotAnims[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [colors.border, colors.primary],
                  }),
                },
              ]}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ======================================================
// CONTINUOUS NOTICE (fixed)
// ======================================================

type AnimatedNoticeProps = {
  notices: Notice[];
  onPress: () => void;
};

function AnimatedNotice({ notices, onPress }: AnimatedNoticeProps) {
  const translateX = useRef(new Animated.Value(0)).current;

  const [viewportWidth, setViewportWidth] = useState(0);
  const [measuredWidth, setMeasuredWidth] = useState(0);

  const messages = useMemo(
    () =>
      notices
        .map((notice) => String(notice.message ?? '').trim())
        .filter(Boolean),
    [notices]
  );

  const messageKey = messages.join('\u0001');

  // Estimated width so the animation can start immediately,
  // even before (or if) onLayout reports the real width.
  const estimatedWidth = useMemo(
    () =>
      messages.reduce(
        (sum, m) => sum + m.length * NOTICE_CHAR_WIDTH + 37,
        0
      ),
    [messages]
  );

  const sequenceWidth = measuredWidth > 0 ? measuredWidth : estimatedWidth;

  const copies =
    sequenceWidth > 0
      ? Math.max(2, Math.ceil(viewportWidth / sequenceWidth) + 1)
      : 2;

  // Manual infinite loop (more reliable than Animated.loop with native driver)
  useEffect(() => {
    if (!messageKey || sequenceWidth <= 0) return;

    let cancelled = false;
    let current: Animated.CompositeAnimation | null = null;

    const duration = Math.max(
      1000,
      Math.round((sequenceWidth / NOTICE_SPEED) * 1000)
    );

    const run = () => {
      if (cancelled) return;

      translateX.setValue(0);

      current = Animated.timing(translateX, {
        toValue: -sequenceWidth,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      });

      current.start(({ finished }) => {
        if (finished && !cancelled) run();
      });
    };

    run();

    return () => {
      cancelled = true;
      current?.stop();
    };
  }, [messageKey, sequenceWidth, translateX]);

  if (!messages.length) {
    return null;
  }

  const renderSequence = (prefix: string) => (
    <View style={styles.noticeSequence}>
      {messages.map((message, i) => (
        <View key={`${prefix}-${i}`} style={styles.noticeMessageItem}>
          <Text numberOfLines={1} style={styles.noticeText}>
            {message}
          </Text>
          <View style={styles.noticeSeparator}>
            <Text style={styles.noticeSeparatorText}>✦</Text>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <Pressable style={styles.notice} onPress={onPress}>
      <Ionicons name="megaphone-outline" size={18} color={colors.primary} />

      <View
        style={styles.noticeViewport}
        pointerEvents="none"
        onLayout={(e) => setViewportWidth(e.nativeEvent.layout.width)}
      >
        {/* Hidden, very wide box used only to measure the real text width */}
        <View key={messageKey} style={styles.noticeMeasure}>
          <View
            style={styles.noticeMeasureInner}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              if (w > 0) setMeasuredWidth(w);
            }}
          >
            {renderSequence('measure')}
          </View>
        </View>

        {/* Moving track with an explicit width, so it is never clamped */}
        <Animated.View
          style={[
            styles.noticeTrack,
            {
              width: sequenceWidth * copies + 200,
              transform: [{ translateX }],
            },
          ]}
        >
          {Array.from({ length: copies }).map((_, i) => (
            <React.Fragment key={i}>{renderSequence(`seq${i}`)}</React.Fragment>
          ))}
        </Animated.View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}

// ======================================================
// FEATURED CATEGORY CARD
// ======================================================

type FeaturedCategoryItemProps = {
  category: Category;
  onPress: () => void;
};

function FeaturedCategoryItem({
  category,
  onPress,
}: FeaturedCategoryItemProps) {
  const icon = getCategoryIcon(category.name);

  return (
    <Pressable onPress={onPress} style={styles.featuredCategoryItem}>
      <View style={styles.featuredCategoryIconWrap}>
        <Ionicons name={icon} size={27} color={colors.primary} />
      </View>

      <Text numberOfLines={2} style={styles.featuredCategoryName}>
        {category.name}
      </Text>
    </Pressable>
  );
}

// ======================================================
// DEALS OF THE DAY
// ======================================================

function DealItem({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 480,
      delay: index * 100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim, index]);

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [
          {
            translateX: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [48, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

function TimerBox({ value }: { value: string }) {
  return (
    <View style={styles.timerBox}>
      <Text style={styles.timerText}>{value}</Text>
    </View>
  );
}

type DealsOfTheDayProps = {
  pool: Product[];
  images?: Map<number, string[]>;
  onPressProduct: (product: Product) => void;
  onSeeAll: () => void;
};

function DealsOfTheDay({
  pool,
  images,
  onPressProduct,
  onSeeAll,
}: DealsOfTheDayProps) {
  // The ticking state lives here so the whole Home screen does not re-render every second.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const current = new Date(now);
  const dayKey = getDayKey(current);
  const msLeft = Math.max(0, getNextMidnight(current).getTime() - now);

  const totalSeconds = Math.floor(msLeft / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // New random set each day (changes automatically when dayKey changes at midnight).
  const deals = useMemo(
    () => pickDailyDeals(pool, dayKey, DEALS_COUNT),
    [pool, dayKey]
  );

  // ---- Auto-scrolling row ----
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const xRef = useRef(0);
  const contentWRef = useRef(0);
  const layoutWRef = useRef(0);
  const draggingRef = useRef(false);
  const resumeAtRef = useRef(0);

  useEffect(() => {
    // Back to the start for a new day's products.
    xRef.current = 0;
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [dayKey]);

  useEffect(() => {
    if (deals.length <= 1) return;

    const timer = setInterval(() => {
      if (draggingRef.current) return;
      if (Date.now() < resumeAtRef.current) return;

      const maxX = Math.max(0, contentWRef.current - layoutWRef.current);
      if (maxX <= 0) return;

      const step = DEAL_CARD_WIDTH + DEAL_GAP;
      const nextX =
        xRef.current >= maxX - 1 ? 0 : Math.min(xRef.current + step, maxX);

      scrollRef.current?.scrollTo({ x: nextX, animated: true });
    }, DEALS_SCROLL_INTERVAL);

    return () => clearInterval(timer);
  }, [deals.length]);

  if (deals.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.dealsHeader}>
        <View style={styles.dealsTitleWrap}>
          <Ionicons name="flash" size={20} color={colors.primary} />
          <Text style={styles.dealsTitle}>Deals of the Day</Text>
        </View>

        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text style={styles.dealsSeeAll}>See all</Text>
        </Pressable>
      </View>

      <View style={styles.timerRow}>
        <Ionicons name="time-outline" size={15} color={colors.muted} />
        <Text style={styles.timerLabel}>Ends in</Text>
        <TimerBox value={pad2(hours)} />
        <Text style={styles.timerColon}>:</Text>
        <TimerBox value={pad2(minutes)} />
        <Text style={styles.timerColon}>:</Text>
        <TimerBox value={pad2(seconds)} />
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productRow}
        scrollEventThrottle={16}
        onScroll={(event) => {
          xRef.current = event.nativeEvent.contentOffset.x;
        }}
        onLayout={(event) => {
          layoutWRef.current = event.nativeEvent.layout.width;
        }}
        onContentSizeChange={(w) => {
          contentWRef.current = w;
        }}
        onScrollBeginDrag={() => {
          draggingRef.current = true;
        }}
        onScrollEndDrag={() => {
          draggingRef.current = false;
          resumeAtRef.current = Date.now() + DEALS_SCROLL_INTERVAL * 2;
        }}
        onMomentumScrollEnd={() => {
          draggingRef.current = false;
          resumeAtRef.current = Date.now() + DEALS_SCROLL_INTERVAL * 2;
        }}
      >
        {deals.map((product, index) => (
          <DealItem key={`${dayKey}-${product.id}`} index={index}>
            <ProductCard
              product={product}
              image={images?.get(product.id)?.[0]}
              width={DEAL_CARD_WIDTH}
              onPress={() => onPressProduct(product)}
            />
          </DealItem>
        ))}
      </ScrollView>
    </View>
  );
}

// ======================================================
// HOME SCREEN
// ======================================================

export default function Home() {
  const nav = useNav();
  const insets = useSafeAreaInsets();

  const { user } = useAuth();
  const { categories } = useCategories();

  // ====================================================
  // FEATURED CATEGORIES FROM DJANGO
  // ====================================================

  const featuredCategories = categories
    .filter(
      (category) =>
        category.is_featured === true && category.is_active !== false
    )
    .slice(0, MAX_FEATURED_CATEGORIES);

  // ====================================================
  // FETCH HOMEPAGE DATA FROM DJANGO API
  // ====================================================

  const feed = useAsync(async () => {
    const [featured, latest, pool, brands, images, notices] =
      await Promise.all([
        // Featured products
        listProducts({
          is_featured: true,
          limit: 10,
        }).catch(() => null),

        // New Arrivals
        listProducts({
          ordering: '-created_at',
          limit: NEW_ARRIVALS_LIMIT,
        }).catch(() => null),

        // Pool of products for Deals of the Day
        listProducts({
          limit: DEALS_POOL_LIMIT,
        }).catch(() => null),

        // Brands
        getBrands().catch(() => [] as Brand[]),

        // Product images
        getImageIndex().catch(() => new Map<number, string[]>()),

        // Notices
        api<unknown>(
          `${endpoints.notices}?is_active=true&is_featured=true`,
          { auth: false }
        ).catch(() => []),
      ]);

    const featuredProducts = featured?.results ?? [];
    const latestProducts = sortNewestProducts(latest?.results ?? []);

    // Merge + de-duplicate so deals still work even if one request failed.
    const merged = new Map<number, Product>();
    [
      ...(pool?.results ?? []),
      ...latestProducts,
      ...featuredProducts,
    ].forEach((p) => merged.set(p.id, p));

    return {
      featured: featuredProducts,
      latest: latestProducts,
      dealsPool: Array.from(merged.values()),
      brands,
      images,
      notices: asList<Notice>(notices),
    };
  }, []);

  const data = feed.data;

  // ====================================================
  // NAVIGATION
  // ====================================================

  const openProduct = (product: Product) => {
    nav.navigate('ProductDetail', {
      slug: product.slug,
      id: product.id,
      name: product.name,
    });
  };

  const openAllProducts = () => {
    nav.navigate('ProductList', {
      title: 'All Products',
    });
  };

  const openAllCategories = () => {
    nav.navigate('Category');
  };

  const openCategory = (category: Category) => {
    nav.navigate('ProductList', {
      category: category.slug,
      title: category.name,
    });
  };

  const openNewArrivals = () => {
    nav.navigate('ProductList', {
      title: 'New Arrivals',
    });
  };

  // ====================================================
  // REUSABLE PRODUCT ROW
  // ====================================================

  const productRow = (items: Product[]) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.productRow}
    >
      {items.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          image={data?.images.get(product.id)?.[0]}
          width={160}
          onPress={() => openProduct(product)}
        />
      ))}
    </ScrollView>
  );

  // ====================================================
  // MAIN UI
  // ====================================================

  return (
    <View style={styles.container}>
      <LightStatus />

      {/* HEADER */}
      <View
        style={[
          styles.top,
          {
            paddingTop: insets.top + 10,
          },
        ]}
      >
        <View style={styles.topRow}>
          <Wordmark size={24} />

          <View style={styles.headerActions}>
            <IconButton
              name="notifications-outline"
              onPress={() => nav.navigate('Notifications')}
              bg="rgba(255,255,255,0.12)"
              color={colors.white}
              border={false}
            />

            <Pressable
              style={styles.avatar}
              onPress={() =>
                user ? nav.navigate('Account') : nav.navigate('Login')
              }
            >
              {user ? (
                <T size={13} weight="bold" color={colors.white}>
                  {initials(user.first_name, user.last_name, user.email)}
                </T>
              ) : (
                <Ionicons name="person" size={18} color={colors.white} />
              )}
            </Pressable>
          </View>
        </View>

        <SearchBar
          onPress={() => nav.navigate('Search')}
          style={styles.search}
          placeholder="Search for products, brands…"
        />
      </View>

      {/* MAIN CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={feed.refreshing}
            onRefresh={feed.refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={styles.content}
      >
        {/* BANNER CAROUSEL */}
        <HomeBanner onPress={openAllProducts} />

        {/* CONTINUOUS NOTICE */}
        <AnimatedNotice
          notices={data?.notices ?? []}
          onPress={() => nav.navigate('Notifications')}
        />

        {/* FEATURED CATEGORIES */}
        <View style={styles.featuredCategorySection}>
          <SectionHeader
            style={styles.sectionHeader}
            title="Featured Categories"
            action="See All"
            onAction={openAllCategories}
          />

          {featuredCategories.length > 0 && (
            <View style={styles.featuredCategoryGrid}>
              {featuredCategories.map((category) => (
                <FeaturedCategoryItem
                  key={category.id}
                  category={category}
                  onPress={() => openCategory(category)}
                />
              ))}
            </View>
          )}
        </View>

        {/* DEALS OF THE DAY */}
        {(data?.dealsPool.length ?? 0) > 0 && (
          <DealsOfTheDay
            pool={data!.dealsPool}
            images={data?.images}
            onPressProduct={openProduct}
            onSeeAll={openAllProducts}
          />
        )}

        {/* FEATURED PRODUCTS */}
        {(data?.featured.length ?? 0) > 0 && (
          <View style={styles.section}>
            <SectionHeader
              style={styles.sectionHeader}
              title="Featured Products"
              action="See all"
              onAction={() =>
                nav.navigate('ProductList', {
                  featured: true,
                  title: 'Featured Products',
                })
              }
            />

            {productRow(data!.featured)}
          </View>
        )}

        {/* TOP BRANDS */}
        {(data?.brands.length ?? 0) > 0 && (
          <View style={styles.section}>
            <SectionHeader style={styles.sectionHeader} title="Top Brands" />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.brandRow}
            >
              {data!.brands.slice(0, 14).map((brand) => (
                <Pressable
                  key={brand.id}
                  style={styles.brand}
                  onPress={() =>
                    nav.navigate('ProductList', {
                      brand: brand.slug,
                      title: brand.name,
                    })
                  }
                >
                  <T size={13} weight="bold" color={colors.text2}>
                    {brand.name}
                  </T>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* NEW ARRIVALS */}
        {(data?.latest.length ?? 0) > 0 && (
          <View style={styles.section}>
            <SectionHeader
              style={styles.sectionHeader}
              title="New Arrivals"
              action="See all"
              onAction={openNewArrivals}
            />

            <View style={styles.newArrivals}>
              {data!.latest
                .slice(0, NEW_ARRIVALS_HOME_COUNT)
                .map((product) => (
                  <View key={product.id} style={styles.newArrivalCard}>
                    <ProductCard
                      product={product}
                      image={data?.images.get(product.id)?.[0]}
                      onPress={() => openProduct(product)}
                    />
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* ERROR */}
        {feed.error && !data && (
          <View style={styles.error}>
            <T color={colors.muted} align="center">
              {feed.error}
            </T>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  content: {
    paddingBottom: 32,
  },

  // HEADER
  top: {
    backgroundColor: colors.dark,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  search: {
    marginTop: 14,
    backgroundColor: colors.white,
  },

  // BANNER
  bannerSection: {
    marginTop: 16,
  },

  bannerFrame: {
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.white,
    ...shadow.sm,
  },

  bannerImage: {
    width: '100%',
    height: '100%',
  },

  bannerDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 10,
    marginBottom: 2,
  },

  bannerDot: {
    height: 7,
    borderRadius: 5,
  },

  // CONTINUOUS NOTICE
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 14,
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.primarySofter,
    borderWidth: 1,
    borderColor: '#FFE0C7',
    borderRadius: radius.md,
  },

  noticeViewport: {
    flex: 1,
    height: 22,
    overflow: 'hidden',
    justifyContent: 'center',
  },

  noticeTrack: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
  },

  noticeMeasure: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 20000,
    opacity: 0,
  },

  noticeMeasureInner: {
    alignSelf: 'flex-start',
  },

  noticeSequence: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },

  noticeMessageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },

  noticeText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: colors.text2,
    includeFontPadding: false,
    flexShrink: 0,
  },

  noticeSeparator: {
    marginHorizontal: 18,
    flexShrink: 0,
  },

  noticeSeparatorText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary,
  },

  // FEATURED CATEGORIES
  featuredCategorySection: {
    marginTop: 22,
  },

  featuredCategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginTop: 15,
    rowGap: 18,
  },

  featuredCategoryItem: {
    width: '20%',
    alignItems: 'center',
    paddingHorizontal: 3,
  },

  featuredCategoryIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 17,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },

  featuredCategoryName: {
    fontSize: 10.5,
    fontWeight: '500',
    color: colors.text2,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 14,
  },

  // DEALS OF THE DAY
  dealsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },

  dealsTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  dealsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text2,
  },

  dealsSeeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },

  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },

  timerLabel: {
    fontSize: 12.5,
    fontWeight: '500',
    color: colors.muted,
    marginRight: 2,
  },

  timerBox: {
    minWidth: 30,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },

  timerText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
    fontVariant: ['tabular-nums'],
  },

  timerColon: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },

  // PRODUCT SECTIONS
  section: {
    marginTop: 24,
  },

  sectionHeader: {
    paddingHorizontal: 16,
  },

  productRow: {
    paddingHorizontal: 16,
    gap: DEAL_GAP,
  },

  // BRANDS
  brandRow: {
    paddingHorizontal: 16,
    gap: 10,
  },

  brand: {
    paddingHorizontal: 18,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // NEW ARRIVALS
  newArrivals: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },

  newArrivalCard: {
    width: '48%',
  },

  // ERROR
  error: {
    padding: 24,
  },
});