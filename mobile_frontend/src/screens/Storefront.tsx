import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../state/AppContext';
import type { Product } from '../lib/types';
import { money } from '../lib/utils';
import {
  Badge,
  Brand,
  Button,
  Card,
  Chip,
  Divider,
  Empty,
  Header,
  Icon,
  IconButton,
  Price,
  ProductCard,
  Screen,
  Section,
  Txt,
  colors,
} from '../components/ui';

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.';
const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const categoryFamily = (value: string) =>
  /mobile|phone/i.test(value)
    ? 'mobile'
    : /laptop|notebook/i.test(value)
      ? 'laptop'
      : /wearable|watch/i.test(value)
        ? 'wearable'
        : norm(value);
const matchesCategory = (product: Product, category: string) =>
  !category ||
  category === 'All' ||
  categoryFamily(product.category) === categoryFamily(category) ||
  norm(product.category).includes(norm(category)) ||
  norm(category).includes(norm(product.category));

export function HomeScreen() {
  const { products, categories, navigate, user, notifications, mode } = useApp();
  const [search, setSearch] = useState('');
  const [heroIndex, setHeroIndex] = useState(0);
  const { width } = useWindowDimensions();
  const laptopCategory = categories.find((c) => /laptop|notebook/i.test(c.name))?.name ?? 'Laptops';
  const mobileCategory = categories.find((c) => /mobile|phone/i.test(c.name))?.name ?? 'Mobiles';
  const accessoryCategory = categories.find((c) => /accessor/i.test(c.name))?.name ?? 'Accessories';
  const heroSlides = [
    {
      category: laptopCategory,
      eyebrow: 'THE NEXT GENERATION',
      title: 'Big ideas.\nSerious power.',
      body: 'Meet your next everyday\nextraordinary.',
      action: 'Explore laptops',
    },
    {
      category: mobileCategory,
      eyebrow: 'A WORLD OF POSSIBILITY',
      title: 'Your world.\nCloser than ever.',
      body: 'Stay connected to the things\nthat matter most.',
      action: 'Explore mobiles',
    },
    {
      category: accessoryCategory,
      eyebrow: 'THE FINISHING TOUCHES',
      title: 'Little details.\nBig difference.',
      body: 'Good company for your\neveryday setup.',
      action: 'Find your extras',
    },
  ];
  const heroSlide = heroSlides[heroIndex];
  const featured =
    products.find((p) => p.active !== false && matchesCategory(p, heroSlide.category)) ??
    products.find((p) => p.active !== false);
  const deals = products.filter((p) => p.oldPrice > p.price && p.active !== false).slice(0, 4);
  const picks = products.filter((p) => p.id !== featured?.id && p.active !== false).slice(4, 8);
  function searchProducts() {
    navigate('catalog', { search: search.trim() });
  }
  return (
    <Screen contentStyle={{ padding: 22, gap: 24 }}>
      <View style={s.between}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Txt size={10} weight="medium" color={colors.muted} style={s.upper} numberOfLines={1}>
            A LITTLE UPGRADE. A BIG DIFFERENCE.
          </Txt>
          <View style={{ marginTop: 8 }}>
            <Brand size={27} />
          </View>
        </View>
        <View style={s.row}>
          <View>
            <IconButton
              name="notifications-outline"
              label="Notifications"
              onPress={() => navigate('notifications')}
            />
            {notifications.some((n) => !n.read) && <View style={s.notificationDot} />}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="My account"
            onPress={() => navigate('account')}
            style={s.avatar}
          >
            <Txt weight="bold" color={colors.ink}>
              {user?.name?.charAt(0) ?? 'T'}
            </Txt>
          </Pressable>
        </View>
      </View>
      <View style={s.search}>
        <Icon name="search-outline" size={20} color={colors.muted} />
        <TextInput
          accessibilityLabel="Search products"
          placeholder="What are you looking for?"
          placeholderTextColor={colors.muted}
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={searchProducts}
          returnKeyType="search"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search catalog"
          onPress={searchProducts}
          style={s.searchGo}
        >
          <Icon name="arrow-forward" size={18} color={colors.orange} />
        </Pressable>
      </View>
      {mode === 'demo' && (
        <View style={s.demoBar}>
          <View style={s.liveDot} />
          <Txt size={11} weight="medium" color={colors.muted}>
            Explore the Technest experience
          </Txt>
          <Badge text="DEMO" tone="neutral" />
        </View>
      )}
      <LinearGradient
        colors={['#1C1B31', '#171422', '#432117']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        <View style={s.heroOrb} />
        <View style={s.heroOrbSmall} />
        <View style={s.heroTop}>
          <View style={[s.heroEyebrow, { flex: 1 }]}>
            <View style={s.orangeDot} />
            <Txt size={9} color="#FFC59D" weight="semibold" style={s.upper} numberOfLines={1}>
              {heroSlide.eyebrow}
            </Txt>
          </View>
          <Txt color="#A6A2B4" size={10} style={{ marginLeft: 8 }}>
            {String(heroIndex + 1).padStart(2, '0')} / 03
          </Txt>
        </View>
        <Txt color="#FFF" weight="bold" size={34} style={{ lineHeight: 40, maxWidth: 280 }}>
          {heroSlide.title}
        </Txt>
        <Txt color="#B7B1C4" size={12} style={{ maxWidth: 190, lineHeight: 19, marginTop: 9 }}>
          {heroSlide.body}
        </Txt>
        <View style={s.heroBottom}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={heroSlide.action}
            style={s.heroCTA}
            onPress={() => navigate('catalog', { category: heroSlide.category })}
          >
            <Txt color="#FFF" weight="semibold" size={11}>
              {heroSlide.action}
            </Txt>
            <Icon name="arrow-forward" size={16} color="#FFF" />
          </Pressable>
          {featured && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View ${featured.name}`}
              onPress={() => navigate('product', { id: featured.id })}
              style={[s.heroProduct, { width: Math.min(139, Math.max(90, width * 0.28)) }]}
            >
              <Image source={featured.image} style={s.heroImage} resizeMode="contain" />
            </Pressable>
          )}
        </View>
        <View style={s.heroPagination}>
          {heroSlides.map((slide, index) => (
            <Pressable
              key={slide.category + index}
              accessibilityRole="button"
              accessibilityLabel={`Show ${slide.category} feature, slide ${index + 1} of 3`}
              accessibilityState={{ selected: heroIndex === index }}
              onPress={() => setHeroIndex(index)}
              style={s.slideControl}
            >
              <View style={heroIndex === index ? s.activePage : s.pageDot} />
            </Pressable>
          ))}
        </View>
      </LinearGradient>
      <View style={s.shortcuts}>
        {[
          {
            icon: 'laptop-outline',
            label: 'Laptops',
            color: '#FFF0E3',
            onPress: () => navigate('catalog', { category: laptopCategory }),
          },
          {
            icon: 'phone-portrait-outline',
            label: 'Mobiles',
            color: '#E9EEFF',
            onPress: () => navigate('catalog', { category: mobileCategory }),
          },
          {
            icon: 'cube-outline',
            label: 'PC Builder',
            color: '#E4F5EF',
            onPress: () => navigate('builder'),
          },
          {
            icon: 'flash-outline',
            label: 'Hot deals',
            color: '#FFE8EC',
            onPress: () => navigate('catalog', { deals: true }),
          },
        ].map((item) => (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            onPress={item.onPress}
            style={s.shortcut}
          >
            <View style={[s.shortcutIcon, { backgroundColor: item.color }]}>
              <Icon
                name={item.icon}
                size={24}
                color={
                  item.label === 'PC Builder'
                    ? '#25836A'
                    : item.label === 'Mobiles'
                      ? '#5373D0'
                      : colors.orange
                }
              />
            </View>
            <Txt size={11} weight="semibold">
              {item.label}
            </Txt>
          </Pressable>
        ))}
      </View>
      <Section
        eyebrow="GOOD TECH. BETTER PRICES."
        title="The daily upgrade"
        action="View all"
        onAction={() => navigate('catalog', { deals: true })}
      >
        <View style={s.grid}>
          {deals.map((product) => (
            <View key={product.id} style={s.gridCell}>
              <ProductCard product={product} />
            </View>
          ))}
        </View>
      </Section>
      <Card style={s.builderBanner} onPress={() => navigate('builder')}>
        <View style={s.between}>
          <View style={{ flex: 1 }}>
            <Txt size={10} weight="semibold" color={colors.orange} style={s.upper}>
              BUILT AROUND YOU
            </Txt>
            <Txt size={21} weight="bold" style={{ marginTop: 7 }}>
              Your dream setup.{'\n'}Your rules.
            </Txt>
            <Txt color={colors.muted} size={12} style={{ marginTop: 8 }}>
              Start your custom PC build
            </Txt>
          </View>
          <View style={s.builderCube}>
            <Icon name="cube-outline" size={48} color={colors.orange} />
          </View>
        </View>
        <View style={{ marginTop: 15 }}>
          <Icon name="arrow-forward-circle" size={28} color={colors.orange} />
        </View>
      </Card>
      <Section
        eyebrow="FIND YOUR PERFECT FIT"
        title="Shop by category"
        action="Browse"
        onAction={() => navigate('categories')}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12 }}
        >
          {categories.slice(0, 7).map((category) => (
            <Pressable
              accessibilityRole="button"
              key={category.id}
              onPress={() => navigate('catalog', { category: category.name })}
              style={s.categoryMini}
            >
              <Icon name={category.icon} size={25} color={colors.orange} />
              <Txt size={11} weight="semibold" style={{ marginTop: 12 }}>
                {category.name}
              </Txt>
              <Txt color={colors.muted} size={10} style={{ marginTop: 4 }}>
                {products.filter((p) => matchesCategory(p, category.name)).length} picks
              </Txt>
            </Pressable>
          ))}
        </ScrollView>
      </Section>
      {picks.length > 0 && (
        <Section
          eyebrow="A FEW THINGS WE LOVE"
          title="Curated for your world"
          action="View all"
          onAction={() => navigate('catalog')}
        >
          <View style={s.grid}>
            {picks.map((product) => (
              <View key={product.id} style={s.gridCell}>
                <ProductCard product={product} />
              </View>
            ))}
          </View>
        </Section>
      )}
      <View style={s.reassurance}>
        {[
          { icon: 'shield-checkmark-outline', text: 'Genuine tech' },
          { icon: 'cube-outline', text: 'Careful delivery' },
          { icon: 'headset-outline', text: 'Here to help' },
        ].map((item) => (
          <View key={item.text} style={{ alignItems: 'center', gap: 8 }}>
            <Icon name={item.icon} size={22} color={colors.muted} />
            <Txt size={10} color={colors.muted}>
              {item.text}
            </Txt>
          </View>
        ))}
      </View>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Brand size={20} />
        <Txt size={11} color={colors.muted}>
          Make room for what’s next.
        </Txt>
      </View>
    </Screen>
  );
}

export function CategoriesScreen() {
  const { categories, products, navigate } = useApp();
  const [selected, setSelected] = useState(categories[0]?.name ?? '');
  const category = categories.find((c) => c.name === selected) ?? categories[0];
  const selectedProducts = products.filter(
    (p) => p.active !== false && matchesCategory(p, selected),
  );
  return (
    <View style={{ flex: 1 }}>
      <Header
        title="Discover"
        subtitle="Great tech, thoughtfully organized."
        back={false}
        right={
          <IconButton
            name="search-outline"
            label="Search products"
            onPress={() => navigate('catalog')}
          />
        }
      />
      <View style={{ flexDirection: 'row', flex: 1 }}>
        <ScrollView
          style={s.categoryRail}
          contentContainerStyle={{ gap: 8, paddingVertical: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {categories.map((c) => (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityState={{ selected: selected === c.name }}
              onPress={() => setSelected(c.name)}
              style={[s.railItem, selected === c.name && s.railItemActive]}
            >
              <Icon
                name={c.icon}
                size={23}
                color={selected === c.name ? colors.orange : colors.muted}
              />
              <Txt
                size={10}
                weight={selected === c.name ? 'semibold' : 'medium'}
                color={selected === c.name ? colors.orange : colors.muted}
                style={{ textAlign: 'center', marginTop: 8 }}
              >
                {c.name}
              </Txt>
            </Pressable>
          ))}
        </ScrollView>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 22 }}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient colors={['#211B35', '#45315D']} style={s.categoryHero}>
            <Txt color="#D4C5ED" size={10} weight="semibold" style={s.upper}>
              YOUR NEXT UPGRADE
            </Txt>
            <Txt color="#FFF" size={26} weight="bold" style={{ marginTop: 12 }}>
              {category?.name ?? 'Technology'}
            </Txt>
            <Txt color="#CDC4DC" size={11} style={{ lineHeight: 18, marginTop: 8 }}>
              {category?.description ?? 'Discover something extraordinary.'}
            </Txt>
            {selectedProducts[0] && (
              <Image
                source={selectedProducts[0].image}
                style={s.categoryHeroImage}
                resizeMode="contain"
              />
            )}
            <Button
              title="Explore all"
              small
              icon="arrow-forward"
              onPress={() => navigate('catalog', { category: selected })}
              style={{ marginTop: 13 }}
            />
          </LinearGradient>
          <View>
            <Txt size={16} weight="bold">
              Find your fit
            </Txt>
            <Txt color={colors.muted} size={11} style={{ marginTop: 5 }}>
              A selection worth exploring
            </Txt>
          </View>
          <View style={{ gap: 12 }}>
            {selectedProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} compact />
            ))}
            {selectedProducts.length === 0 && (
              <Empty
                icon="sparkles-outline"
                title="More on the way"
                message="Explore the rest of our collection while we prepare something new."
                action="Browse all"
                onAction={() => navigate('catalog')}
              />
            )}
          </View>
          <View style={s.brandStrip}>
            <Txt size={11} color={colors.muted}>
              BRANDS YOU KNOW
            </Txt>
            <View style={{ gap: 14, marginTop: 16 }}>
              {[...new Set(selectedProducts.map((p) => p.brand))].slice(0, 4).map((brand) => (
                <Txt key={brand} size={20} weight="bold" color={colors.ink}>
                  {brand}
                </Txt>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

export function CatalogScreen() {
  const { products, categories, route, navigate } = useApp();
  const [search, setSearch] = useState(String(route.params?.search ?? ''));
  const [category, setCategory] = useState(String(route.params?.category ?? 'All'));
  const [sort, setSort] = useState<'featured' | 'priceLow' | 'priceHigh' | 'rated'>('featured');
  const [stockOnly, setStockOnly] = useState(false);
  const [dealsOnly, setDealsOnly] = useState(Boolean(route.params?.deals));
  const [budget, setBudget] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const filtered = useMemo(
    () =>
      products
        .filter(
          (p) =>
            p.active !== false &&
            matchesCategory(p, category) &&
            (!stockOnly || p.stock > 0) &&
            (!dealsOnly || p.oldPrice > p.price) &&
            (!budget || p.price <= budget) &&
            `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(search.toLowerCase()),
        )
        .sort((a, b) =>
          sort === 'priceLow'
            ? a.price - b.price
            : sort === 'priceHigh'
              ? b.price - a.price
              : sort === 'rated'
                ? b.rating - a.rating
                : 0,
        ),
    [products, category, stockOnly, dealsOnly, budget, search, sort],
  );
  const filterCount = Number(stockOnly) + Number(dealsOnly) + Number(!!budget);
  return (
    <View style={{ flex: 1 }}>
      <Header
        title={
          dealsOnly ? 'The good deals' : category === 'All' ? 'Explore the collection' : category
        }
        subtitle="Find the tech that feels like you."
        right={
          <IconButton
            name="options-outline"
            label="Open product filters"
            onPress={() => setShowFilters(true)}
          />
        }
      />
      <ScrollView
        contentContainerStyle={{ padding: 22, paddingTop: 0, gap: 18 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.search}>
          <Icon name="search-outline" size={20} color={colors.muted} />
          <TextInput
            accessibilityLabel="Search catalog"
            placeholder="Search products, brands..."
            placeholderTextColor={colors.muted}
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {!!search && (
            <IconButton
              name="close-circle"
              size={18}
              label="Clear search"
              onPress={() => setSearch('')}
            />
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {['All', ...categories.map((c) => c.name)].map((name) => (
            <Chip
              key={name}
              label={name}
              active={category === name}
              onPress={() => setCategory(name)}
            />
          ))}
        </ScrollView>
        <View style={s.between}>
          <Txt color={colors.muted} size={12}>
            {filtered.length} {filtered.length === 1 ? 'find' : 'finds'} for you
          </Txt>
          <Pressable accessibilityRole="button" onPress={() => setShowFilters(true)} style={s.row}>
            <Icon name="filter-outline" size={16} color={colors.ink} />
            <Txt size={11} weight="medium" style={{ marginLeft: 7 }}>
              Sort & filter{filterCount ? ` (${filterCount})` : ''}
            </Txt>
          </Pressable>
        </View>
        {filtered.length ? (
          <View style={s.grid}>
            {filtered.map((product) => (
              <View key={product.id} style={s.gridCell}>
                <ProductCard product={product} />
              </View>
            ))}
          </View>
        ) : (
          <Empty
            icon="search-outline"
            title="Let’s try something else"
            message="We couldn’t find a match. Adjust your search or clear the filters."
            action="Clear filters"
            onAction={() => {
              setSearch('');
              setCategory('All');
              setBudget(0);
              setStockOnly(false);
              setDealsOnly(false);
            }}
          />
        )}
        <Button
          title="Compare your favorites"
          variant="outline"
          icon="git-compare-outline"
          onPress={() => navigate('compare')}
        />
      </ScrollView>
      <Modal
        visible={showFilters}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <Pressable
          accessibilityLabel="Close filters"
          style={s.modalBackdrop}
          onPress={() => setShowFilters(false)}
        />
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <View style={s.between}>
            <Txt size={23} weight="bold">
              Make it your own
            </Txt>
            <IconButton name="close" label="Close filters" onPress={() => setShowFilters(false)} />
          </View>
          <Txt size={13} weight="semibold" style={{ marginTop: 22 }}>
            Sort by
          </Txt>
          <View style={s.chipWrap}>
            {[
              { label: 'Featured', value: 'featured' },
              { label: 'Price: low to high', value: 'priceLow' },
              { label: 'Price: high to low', value: 'priceHigh' },
              { label: 'Top rated', value: 'rated' },
            ].map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                active={sort === item.value}
                onPress={() => setSort(item.value as typeof sort)}
              />
            ))}
          </View>
          <Txt size={13} weight="semibold" style={{ marginTop: 22 }}>
            Your budget
          </Txt>
          <View style={s.chipWrap}>
            {[0, 10000, 50000, 100000, 200000].map((value) => (
              <Chip
                key={value}
                label={value ? `Under ${money(value)}` : 'Any price'}
                active={budget === value}
                onPress={() => setBudget(value)}
              />
            ))}
          </View>
          <View style={[s.chipWrap, { marginVertical: 24 }]}>
            <Chip
              label="In stock"
              icon="checkmark-circle-outline"
              active={stockOnly}
              onPress={() => setStockOnly(!stockOnly)}
            />
            <Chip
              label="On sale"
              icon="flash-outline"
              active={dealsOnly}
              onPress={() => setDealsOnly(!dealsOnly)}
            />
          </View>
          <Button
            title={`Show ${filtered.length} products`}
            onPress={() => setShowFilters(false)}
          />
        </View>
      </Modal>
    </View>
  );
}

export function ProductScreen() {
  const {
    products,
    route,
    navigate,
    wishlist,
    toggleWishlist,
    compare,
    toggleCompare,
    addToCart,
    notify,
  } = useApp();
  const product = products.find((p) => p.id === Number(route.params?.id));
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState('Overview');
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [options, setOptions] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setQuantity(1);
    setGalleryIndex(0);
    setOptions({});
    setTab('Overview');
  }, [product?.id]);
  if (!product || product.active === false)
    return (
      <Screen>
        <Header title="Product" />
        <Empty
          icon="cube-outline"
          title="Product unavailable"
          message="This item may have moved. Explore the collection to find your next upgrade."
          action="Explore products"
          onAction={() => navigate('catalog')}
        />
      </Screen>
    );
  const images = product.images?.length ? product.images : [product.image];
  const savings = Math.max(0, product.oldPrice - product.price);
  const selectedOptions = Object.fromEntries(
    Object.entries(product.options ?? {}).map(([key, values]) => [key, options[key] ?? values[0]]),
  );
  const related = products
    .filter(
      (p) => p.active !== false && p.id !== product.id && matchesCategory(p, product.category),
    )
    .slice(0, 2);
  async function add() {
    setBusy(true);
    try {
      await addToCart(product!.id, quantity, selectedOptions);
      notify('A great choice. Added to your cart.');
    } catch (error) {
      notify(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ flex: 1 }}>
      <Header
        title="The details"
        right={
          <View style={s.row}>
            <IconButton
              name={wishlist.includes(product.id) ? 'heart' : 'heart-outline'}
              color={wishlist.includes(product.id) ? colors.red : colors.ink}
              label="Toggle wishlist"
              onPress={() => {
                toggleWishlist(product.id).catch((error) => notify(errorText(error)));
              }}
            />
            <IconButton
              name="git-compare-outline"
              color={compare.includes(product.id) ? colors.orange : colors.ink}
              label="Toggle compare"
              onPress={() => toggleCompare(product.id)}
            />
          </View>
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 22, paddingTop: 0, paddingBottom: 24, gap: 22 }}
      >
        <View style={s.productStage}>
          <View style={s.productStageTop}>
            <Badge
              text={product.stock > 0 ? 'IN STOCK' : 'OUT OF STOCK'}
              tone={product.stock > 0 ? 'green' : 'red'}
            />
            {savings > 0 && (
              <Badge text={`−${Math.round((savings / product.oldPrice) * 100)}%`} tone="orange" />
            )}
          </View>
          <Image
            source={images[Math.min(galleryIndex, images.length - 1)]}
            resizeMode="contain"
            style={s.detailImage}
          />
          <View style={s.galleryCounter}>
            <Txt size={10} color={colors.muted}>
              {Math.min(galleryIndex + 1, images.length)} / {images.length}
            </Txt>
          </View>
        </View>
        {images.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10 }}
          >
            {images.map((image, index) => (
              <Pressable
                key={index}
                accessibilityRole="button"
                accessibilityLabel={`View product image ${index + 1}`}
                onPress={() => setGalleryIndex(index)}
                style={[s.thumbnail, galleryIndex === index && { borderColor: colors.orange }]}
              >
                <Image source={image} resizeMode="contain" style={{ width: 45, height: 45 }} />
              </Pressable>
            ))}
          </ScrollView>
        )}
        <View>
          <View style={s.between}>
            <Txt color={colors.orange} weight="semibold" size={10} style={s.upper}>
              {product.brand} / {product.category}
            </Txt>
            <View style={s.row}>
              {product.reviews > 0 ? (
                <>
                  <Icon name="star" color="#FFAD22" size={13} />
                  <Txt size={11} weight="semibold" style={{ marginLeft: 4 }}>
                    {product.rating.toFixed(1)}
                  </Txt>
                  <Txt color={colors.muted} size={10} style={{ marginLeft: 4 }}>
                    ({product.reviews})
                  </Txt>
                </>
              ) : (
                <Txt size={10} color={colors.muted}>
                  No reviews yet
                </Txt>
              )}
            </View>
          </View>
          <Txt size={25} weight="bold" style={{ lineHeight: 33, marginTop: 10 }}>
            {product.name}
          </Txt>
          <View style={{ marginTop: 15 }}>
            <Price
              value={product.price}
              old={product.oldPrice > product.price ? product.oldPrice : undefined}
              size={29}
            />
          </View>
          {savings > 0 && (
            <Txt color={colors.orange} size={11} weight="medium" style={{ marginTop: 7 }}>
              A little win. Save {money(savings)} today.
            </Txt>
          )}
        </View>
        <Divider />
        {Object.entries(product.options ?? {}).map(([key, values]) => (
          <View key={key}>
            <Txt size={12} weight="semibold" style={{ marginBottom: 10 }}>
              {key}
            </Txt>
            <View style={s.chipWrap}>
              {values.map((value) => (
                <Chip
                  key={value}
                  label={value}
                  active={selectedOptions[key] === value}
                  onPress={() => setOptions((current) => ({ ...current, [key]: value }))}
                />
              ))}
            </View>
          </View>
        ))}
        <View style={s.serviceRow}>
          <Icon name="shield-checkmark-outline" size={21} color={colors.green} />
          <View style={{ flex: 1 }}>
            <Txt size={12} weight="semibold">
              Genuine. Reliable. Yours.
            </Txt>
            <Txt size={10} color={colors.muted} style={{ marginTop: 4 }}>
              Authentic products. Support when you need it.
            </Txt>
          </View>
          <Icon name="checkmark-circle" size={17} color={colors.green} />
        </View>
        <View style={s.chipWrap}>
          {['Overview', 'Specifications'].map((label) => (
            <Chip key={label} label={label} active={tab === label} onPress={() => setTab(label)} />
          ))}
        </View>
        {tab === 'Overview' ? (
          <View style={{ gap: 15 }}>
            <Txt size={13} color={colors.muted} style={{ lineHeight: 23 }}>
              {product.description}
            </Txt>
            {Object.entries(product.specs)
              .slice(0, 3)
              .map(([key, value]) => (
                <View key={key} style={s.featureLine}>
                  <View style={s.checkCircle}>
                    <Icon name="checkmark" size={13} color={colors.orange} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt size={11} color={colors.muted}>
                      {key}
                    </Txt>
                    <Txt size={12} weight="medium" style={{ marginTop: 4 }}>
                      {value}
                    </Txt>
                  </View>
                </View>
              ))}
          </View>
        ) : (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {Object.entries(product.specs).map(([key, value], index) => (
              <View
                key={key}
                style={[s.specRow, { backgroundColor: index % 2 ? '#FFF' : '#FAFAFD' }]}
              >
                <Txt size={11} color={colors.muted} style={{ flex: 0.9 }}>
                  {key}
                </Txt>
                <Txt size={11} weight="medium" style={{ flex: 1.2, lineHeight: 18 }}>
                  {value}
                </Txt>
              </View>
            ))}
          </Card>
        )}
        {related.length > 0 && (
          <Section title="A few more possibilities">
            <View style={s.grid}>
              {related.map((item) => (
                <View key={item.id} style={s.gridCell}>
                  <ProductCard product={item} />
                </View>
              ))}
            </View>
          </Section>
        )}
      </ScrollView>
      <View style={s.purchaseBar}>
        <View style={s.quantity}>
          <IconButton
            name="remove"
            size={17}
            label="Decrease quantity"
            onPress={() => setQuantity((q) => Math.max(1, q - 1))}
          />
          <Txt size={14} weight="semibold">
            {quantity}
          </Txt>
          <IconButton
            name="add"
            size={17}
            label="Increase quantity"
            onPress={() => setQuantity((q) => Math.max(1, Math.min(product.stock, q + 1)))}
          />
        </View>
        <Button
          title={product.stock ? 'Add to cart' : 'Out of stock'}
          icon="bag-add-outline"
          loading={busy}
          disabled={!product.stock}
          onPress={add}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

const buildSlots = [
  {
    key: 'CPU',
    label: 'Processor',
    icon: 'hardware-chip-outline',
    hint: 'The brains of your build',
  },
  { key: 'Motherboard', label: 'Motherboard', icon: 'grid-outline', hint: 'Bring it all together' },
  { key: 'Memory', label: 'Memory', icon: 'albums-outline', hint: 'More room to do more' },
  {
    key: 'Graphics',
    label: 'Graphics card',
    icon: 'game-controller-outline',
    hint: 'Make every frame count',
  },
  { key: 'Storage', label: 'Storage', icon: 'server-outline', hint: 'Space for your entire world' },
  {
    key: 'Power supply',
    label: 'Power supply',
    icon: 'flash-outline',
    hint: 'Power the possibilities',
  },
  { key: 'Case', label: 'Case', icon: 'cube-outline', hint: 'A home for your new setup' },
];

export function BuilderScreen() {
  const { products, cart, builder, setBuildComponent, clearBuild, addToCart, navigate, notify } =
    useApp();
  const { width } = useWindowDimensions();
  const [batchError, setBatchError] = useState('');
  const batch = useRef<{ signature: string; completed: Set<number> }>({
    signature: '',
    completed: new Set(),
  });
  const [picker, setPicker] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const selected = buildSlots.flatMap((slot) => {
    const product = products.find((p) => p.id === builder[slot.key]);
    return product ? [{ slot, product }] : [];
  });
  const total = selected.reduce((sum, item) => sum + item.product.price, 0);
  const pickerProducts = products.filter(
    (p) =>
      p.active !== false &&
      p.stock > 0 &&
      (norm(p.component ?? '') === norm(picker ?? '') ||
        norm(p.category).includes(norm(picker ?? '___'))),
  );
  const signature = selected.map((item) => `${item.slot.key}:${item.product.id}`).join('|');
  useEffect(() => {
    batch.current = { signature, completed: new Set() };
    setBatchError('');
  }, [signature]);
  async function addBuild() {
    if (busy) return;
    if (batch.current.signature !== signature) batch.current = { signature, completed: new Set() };
    const completed = batch.current.completed;
    setBusy(true);
    setBatchError('');
    try {
      // Validate the entire remaining selection before making any cart changes.
      for (const { product } of selected.filter((item) => !completed.has(item.product.id))) {
        if (product.active === false) throw new Error(`${product.name} is no longer available.`);
        const alreadyInCart = cart.find((item) => item.productId === product.id)?.quantity ?? 0;
        if (alreadyInCart + 1 > product.stock)
          throw new Error(
            `${product.name} does not have enough stock, including the quantity already in your cart.`,
          );
      }
      for (const { product } of selected) {
        if (completed.has(product.id)) continue;
        await addToCart(product.id);
        completed.add(product.id);
      }
      notify('Your selected components are in your cart.');
      navigate('cart');
    } catch (error) {
      const detail = errorText(error);
      const message = completed.size
        ? `${completed.size} of ${selected.length} components added. ${detail} Retry adds only the remaining components.`
        : detail;
      setBatchError(message);
      notify(message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ flex: 1 }}>
      <Header
        title="Build something yours"
        subtitle="Your ambition. Your components."
        back={false}
        right={
          selected.length > 0 ? (
            <IconButton
              name="refresh-outline"
              label="Reset PC build"
              onPress={() => {
                if (!busy) clearBuild();
              }}
            />
          ) : undefined
        }
      />
      <ScrollView
        contentContainerStyle={{ padding: 22, paddingTop: 0, gap: 18 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={['#171827', '#2E2840']} style={s.buildHero}>
          <View style={s.between}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Txt size={10} color="#E6B58B" weight="semibold" style={s.upper}>
                THE PERSONAL TOUCH
              </Txt>
              <Txt size={25} color="#FFF" weight="bold" style={{ lineHeight: 33, marginTop: 9 }}>
                A great PC starts{'\n'}with a great idea.
              </Txt>
            </View>
            <Icon name="cube-outline" size={54} color="#FF9C51" />
          </View>
          <View style={s.buildProgress}>
            <View
              style={[
                s.buildProgressFill,
                { width: `${(selected.length / buildSlots.length) * 100}%` },
              ]}
            />
          </View>
          <Txt size={10} color="#BDB7C8" style={{ marginTop: 10 }}>
            {selected.length} of {buildSlots.length} components selected
          </Txt>
        </LinearGradient>
        <View style={s.helper}>
          <Icon name="information-circle-outline" size={18} color={colors.orange} />
          <Txt color={colors.muted} size={11} style={{ flex: 1, lineHeight: 18 }}>
            Check socket, form factor, memory support, and power requirements before ordering.
          </Txt>
        </View>
        {buildSlots.map((slot) => {
          const product = products.find((p) => p.id === builder[slot.key]);
          return (
            <Card
              key={slot.key}
              onPress={() => {
                if (!busy) setPicker(slot.key);
              }}
              style={{ padding: 16 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                <View style={[s.componentIcon, product && { backgroundColor: '#FFF' }]}>
                  {product ? (
                    <Image
                      source={product.image}
                      resizeMode="contain"
                      style={{ width: 48, height: 48 }}
                    />
                  ) : (
                    <Icon name={slot.icon} color={colors.orange} size={25} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Txt color={colors.muted} size={10}>
                    {slot.label}
                  </Txt>
                  <Txt
                    size={product ? 12 : 13}
                    weight="semibold"
                    numberOfLines={2}
                    style={{ marginTop: 5, lineHeight: 18 }}
                  >
                    {product?.name ?? `Choose ${slot.label.toLowerCase()}`}
                  </Txt>
                  {product ? (
                    <Txt color={colors.orange} size={12} weight="bold" style={{ marginTop: 5 }}>
                      {money(product.price)}
                    </Txt>
                  ) : (
                    <Txt color={colors.muted} size={10} style={{ marginTop: 5 }}>
                      {slot.hint}
                    </Txt>
                  )}
                </View>
                <Icon
                  name={product ? 'swap-horizontal-outline' : 'add-circle-outline'}
                  size={22}
                  color={product ? colors.muted : colors.orange}
                />
              </View>
            </Card>
          );
        })}
        <View style={s.helper}>
          <Icon name="shield-checkmark-outline" color={colors.green} size={20} />
          <Txt size={11} color={colors.muted} style={{ flex: 1, lineHeight: 19 }}>
            Need a second opinion? Our team can help you find the right components for your needs.
          </Txt>
          <IconButton
            name="arrow-forward"
            label="Get build advice"
            onPress={() => navigate('support')}
          />
        </View>
      </ScrollView>
      <View style={{ backgroundColor: '#FFF' }}>
        {!!batchError && (
          <View style={{ paddingHorizontal: 22, paddingTop: 13, gap: 8 }}>
            <Txt size={11} color={colors.red} style={{ lineHeight: 18 }}>
              {batchError}
            </Txt>
            {batch.current.completed.size > 0 && (
              <Pressable accessibilityRole="button" onPress={() => navigate('cart')}>
                <Txt size={11} weight="semibold" color={colors.orange}>
                  Review your cart →
                </Txt>
              </Pressable>
            )}
          </View>
        )}
        <View
          style={[
            s.buildFooter,
            width < 440 && { flexDirection: 'column', alignItems: 'stretch', paddingTop: 13 },
          ]}
        >
          <View style={width < 440 ? s.between : undefined}>
            <Txt size={10} color={colors.muted}>
              YOUR BUILD TOTAL
            </Txt>
            <Txt size={22} weight="bold" style={{ marginTop: width < 440 ? 0 : 5 }}>
              {money(total)}
            </Txt>
          </View>
          <Button
            title={
              batch.current.completed.size > 0 ? 'Add remaining components' : 'Add build to cart'
            }
            icon="bag-add-outline"
            disabled={selected.length === 0}
            loading={busy}
            onPress={addBuild}
          />
        </View>
      </View>
      <Modal
        visible={picker !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPicker(null)}
      >
        <Pressable
          style={s.modalBackdrop}
          accessibilityLabel="Close component picker"
          onPress={() => setPicker(null)}
        />
        <View style={[s.sheet, { maxHeight: '80%' }]}>
          <View style={s.sheetHandle} />
          <View style={s.between}>
            <Txt size={22} weight="bold">
              Choose {picker?.toLowerCase()}
            </Txt>
            <IconButton
              name="close"
              label="Close component picker"
              onPress={() => setPicker(null)}
            />
          </View>
          <ScrollView
            style={{ marginTop: 15 }}
            contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
          >
            {pickerProducts.map((product) => (
              <Card
                key={product.id}
                onPress={() => {
                  setBuildComponent(picker!, product.id);
                  setPicker(null);
                }}
                style={{ padding: 12 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <Image
                    source={product.image}
                    style={{ width: 70, height: 70 }}
                    resizeMode="contain"
                  />
                  <View style={{ flex: 1 }}>
                    <Txt size={12} weight="semibold" numberOfLines={2}>
                      {product.name}
                    </Txt>
                    <Txt size={10} color={colors.muted} style={{ marginTop: 5 }} numberOfLines={2}>
                      {Object.values(product.specs).slice(0, 2).join(' · ')}
                    </Txt>
                    <Txt color={colors.orange} size={14} weight="bold" style={{ marginTop: 7 }}>
                      {money(product.price)}
                    </Txt>
                  </View>
                  <Icon name="add-circle" color={colors.orange} size={25} />
                </View>
              </Card>
            ))}
            {pickerProducts.length === 0 && (
              <Empty
                icon="hardware-chip-outline"
                title="More options coming"
                message="No components are available in this section right now. Explore the catalog or ask our team for help."
                action="Get advice"
                onAction={() => {
                  setPicker(null);
                  navigate('support');
                }}
              />
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

export function CompareScreen() {
  const { products, compare, toggleCompare, navigate, addToCart, notify } = useApp();
  const selected = products.filter((p) => compare.includes(p.id));
  const [showPicker, setShowPicker] = useState(false);
  const available = products.filter((p) => p.active !== false && !compare.includes(p.id));
  const specKeys = [...new Set(selected.flatMap((p) => Object.keys(p.specs)))];
  return (
    <View style={{ flex: 1 }}>
      <Header title="Find your perfect match" subtitle="The details, side by side." />
      <ScrollView
        contentContainerStyle={{ padding: 22, paddingTop: 0, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {selected.length === 0 ? (
          <Empty
            icon="git-compare-outline"
            title="A little perspective helps"
            message="Choose up to 3 products and compare the details that matter to you."
            action="Choose products"
            onAction={() => setShowPicker(true)}
          />
        ) : (
          <>
            <View style={s.between}>
              <Txt size={12} color={colors.muted}>
                {selected.length} of 3 products
              </Txt>
              {selected.length < 3 && (
                <Chip label="Add product" icon="add" onPress={() => setShowPicker(true)} />
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {selected.map((product) => (
                    <View key={product.id} style={s.compareProduct}>
                      <View style={{ alignSelf: 'flex-end' }}>
                        <IconButton
                          name="close"
                          size={17}
                          label={`Remove ${product.name} from comparison`}
                          onPress={() => toggleCompare(product.id)}
                        />
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => navigate('product', { id: product.id })}
                      >
                        <Image
                          source={product.image}
                          style={{ width: 142, height: 130 }}
                          resizeMode="contain"
                        />
                        <Txt
                          size={12}
                          weight="semibold"
                          style={{ height: 50, marginTop: 14, lineHeight: 18 }}
                          numberOfLines={3}
                        >
                          {product.name}
                        </Txt>
                      </Pressable>
                      <Price value={product.price} size={17} />
                      <Button
                        small
                        title="Add to cart"
                        disabled={!product.stock}
                        icon="bag-add-outline"
                        onPress={() => {
                          addToCart(product.id)
                            .then(() => notify('Added to your cart'))
                            .catch((error) => notify(errorText(error)));
                        }}
                        style={{ marginTop: 15 }}
                      />
                    </View>
                  ))}
                </View>
                {[
                  { label: 'Brand', values: selected.map((p) => p.brand) },
                  { label: 'Category', values: selected.map((p) => p.category) },
                  {
                    label: 'Customer rating',
                    values: selected.map((p) =>
                      p.reviews > 0
                        ? `${p.rating.toFixed(1)} / 5 (${p.reviews})`
                        : 'No reviews yet',
                    ),
                  },
                  {
                    label: 'Availability',
                    values: selected.map((p) => (p.stock > 0 ? 'In stock' : 'Out of stock')),
                  },
                  ...specKeys.map((key) => ({
                    label: key,
                    values: selected.map((p) => p.specs[key] ?? '—'),
                  })),
                ].map((row, index) => (
                  <View
                    key={row.label}
                    style={{
                      paddingVertical: 16,
                      backgroundColor: index % 2 ? '#FFF' : '#F0F0F7',
                      borderRadius: 10,
                      marginTop: 8,
                    }}
                  >
                    <Txt
                      size={10}
                      color={colors.muted}
                      weight="semibold"
                      style={{ paddingHorizontal: 14, marginBottom: 10 }}
                    >
                      {row.label.toUpperCase()}
                    </Txt>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      {row.values.map((value, i) => (
                        <View key={i} style={{ width: 170, paddingHorizontal: 14 }}>
                          <Txt
                            size={12}
                            weight={new Set(row.values).size > 1 ? 'semibold' : 'regular'}
                            style={{ lineHeight: 20 }}
                          >
                            {value}
                          </Txt>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </>
        )}
        <Button
          title="Explore the collection"
          variant="outline"
          icon="arrow-forward"
          onPress={() => navigate('catalog')}
        />
      </ScrollView>
      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <Pressable
          style={s.modalBackdrop}
          accessibilityLabel="Close product picker"
          onPress={() => setShowPicker(false)}
        />
        <View style={[s.sheet, { maxHeight: '80%' }]}>
          <View style={s.sheetHandle} />
          <View style={s.between}>
            <Txt size={21} weight="bold">
              Add to comparison
            </Txt>
            <IconButton
              name="close"
              label="Close product picker"
              onPress={() => setShowPicker(false)}
            />
          </View>
          <ScrollView contentContainerStyle={{ gap: 10, paddingTop: 18, paddingBottom: 20 }}>
            {available.map((product) => (
              <Card
                key={product.id}
                onPress={() => {
                  toggleCompare(product.id);
                  setShowPicker(false);
                }}
                style={{ padding: 12 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <Image
                    source={product.image}
                    style={{ width: 64, height: 64 }}
                    resizeMode="contain"
                  />
                  <View style={{ flex: 1 }}>
                    <Txt size={12} weight="semibold" numberOfLines={2}>
                      {product.name}
                    </Txt>
                    <Txt size={12} weight="bold" color={colors.orange} style={{ marginTop: 7 }}>
                      {money(product.price)}
                    </Txt>
                  </View>
                  <Icon name="add-circle-outline" size={23} color={colors.orange} />
                </View>
              </Card>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  upper: { letterSpacing: 1.1 },
  avatar: {
    width: 37,
    height: 37,
    backgroundColor: '#F0E9E5',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  notificationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.orange,
    position: 'absolute',
    right: 11,
    top: 8,
    borderWidth: 1,
    borderColor: colors.bg,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 15,
    paddingRight: 5,
    minHeight: 51,
    borderRadius: 15,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: colors.line,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.ink,
    fontFamily: 'Inter_400Regular',
    paddingVertical: 15,
    minWidth: 0,
  },
  searchGo: { backgroundColor: '#FFF3E9', borderRadius: 11, padding: 10 },
  demoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: -13,
    marginBottom: -10,
  },
  liveDot: { height: 5, width: 5, borderRadius: 3, backgroundColor: colors.orange },
  hero: { padding: 23, borderRadius: 24, minHeight: 310, overflow: 'hidden' },
  heroOrb: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#A7461729',
    right: -85,
    bottom: -100,
  },
  heroOrbSmall: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#8A4C6B16',
    left: -95,
    top: -80,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  heroEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  orangeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.orange },
  heroBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  heroCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.orange,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 14,
    zIndex: 1,
  },
  heroProduct: {
    width: 139,
    height: 112,
    backgroundColor: '#FFF',
    borderRadius: 15,
    marginTop: -57,
    transform: [{ rotate: '-8deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  heroImage: { width: '100%', height: '100%' },
  heroPagination: { flexDirection: 'row', gap: 2, marginTop: 4 },
  slideControl: { minWidth: 25, minHeight: 28, alignItems: 'center', justifyContent: 'center' },
  activePage: { width: 22, height: 3, borderRadius: 2, backgroundColor: colors.orange },
  pageDot: { width: 5, height: 3, borderRadius: 2, backgroundColor: '#57505F' },
  shortcuts: { flexDirection: 'row', justifyContent: 'space-between' },
  shortcut: { alignItems: 'center', gap: 9, width: '23%' },
  shortcutIcon: {
    width: 55,
    height: 55,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCell: { width: '48%', flexGrow: 1, maxWidth: '49%' },
  builderBanner: {
    padding: 22,
    backgroundColor: '#FFF7EF',
    borderColor: '#FFE3CC',
    overflow: 'hidden',
  },
  builderCube: {
    height: 104,
    width: 104,
    borderRadius: 29,
    backgroundColor: '#FFEBDB',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '9deg' }],
  },
  categoryMini: {
    width: 112,
    padding: 17,
    backgroundColor: '#FFF',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.line,
  },
  reassurance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
    paddingVertical: 23,
  },
  categoryRail: { flexGrow: 0, width: 94, backgroundColor: '#EEEEF5' },
  railItem: {
    paddingVertical: 17,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    marginRight: 7,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
  },
  railItemActive: { borderLeftColor: colors.orange, backgroundColor: '#FFF2E9' },
  categoryHero: { borderRadius: 20, padding: 18, overflow: 'hidden' },
  categoryHeroImage: {
    height: 116,
    width: '100%',
    marginTop: 15,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  brandStrip: { padding: 20, borderRadius: 17, backgroundColor: '#F0EFF7' },
  modalBackdrop: { flex: 1, backgroundColor: '#11132280' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 29,
    borderTopRightRadius: 29,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D8D7E2',
    alignSelf: 'center',
    marginBottom: 19,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  productStage: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 23,
    padding: 17,
  },
  productStageTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailImage: { width: '100%', height: 236, marginVertical: 10 },
  galleryCounter: {
    alignSelf: 'flex-end',
    backgroundColor: '#F4F3F8',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  thumbnail: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: colors.line,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#ECF7F2',
    borderRadius: 15,
  },
  featureLine: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkCircle: {
    width: 25,
    height: 25,
    borderRadius: 9,
    backgroundColor: '#FFF0E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  specRow: { flexDirection: 'row', gap: 14, padding: 15 },
  purchaseBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 16,
    paddingHorizontal: 22,
    borderTopWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#FFF',
  },
  quantity: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
    gap: 3,
  },
  buildHero: { borderRadius: 22, padding: 22 },
  buildProgress: {
    height: 4,
    backgroundColor: '#FFFFFF22',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 25,
  },
  buildProgressFill: { height: '100%', backgroundColor: colors.orange, borderRadius: 3 },
  helper: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 4 },
  componentIcon: {
    width: 57,
    height: 57,
    borderRadius: 16,
    backgroundColor: '#FFF2E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buildFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 13,
    backgroundColor: '#FFF',
    padding: 20,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  compareProduct: {
    width: 170,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#FFF',
  },
});
