import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/app_theme.dart';
import '../models/category.dart';
import '../providers/product_provider.dart';
import '../services/core_service.dart';
import '../widgets/notice_marquee.dart';
import '../widgets/product_card.dart';
import '../widgets/promo_banner_carousel.dart';
import 'product_detail_screen.dart';
import 'product_list_screen.dart';
import 'search_screen.dart';

/// Home tab — Star-Tech-style layout:
///   search bar → featured categories grid → auto promo banner →
///   notice marquee → featured products.
/// The bottom navigation itself lives in main_shell.dart.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadAll());
  }

  Future<void> _loadAll() async {
    final provider = Provider.of<ProductProvider>(context, listen: false);
    if (provider.categories.isEmpty) {
      await provider.fetchCategories();
    }
    await provider.fetchFeaturedProducts();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ProductProvider>();

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadAll,
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            children: [
              const SizedBox(height: 14),
              const _HomeSearchBar(),
              const SizedBox(height: 18),
              _FeaturedCategories(categories: provider.categories),
              const SizedBox(height: 16),
              const PromoBannerCarousel(),
              const NoticeMarquee(),
              const SizedBox(height: 20),
              _SectionHeader(
                title: 'Featured Products',
                onSeeAll: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const ProductListScreen(),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              _FeaturedProductsGrid(provider: provider),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

// =========================================================
// Search bar (taps open the real SearchScreen)
// =========================================================
class _HomeSearchBar extends StatelessWidget {
  const _HomeSearchBar();

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(28),
      child: InkWell(
        borderRadius: BorderRadius.circular(28),
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const SearchScreen()),
        ),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: const Row(
            children: [
              Icon(Icons.search, color: AppTheme.textSecondary, size: 22),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Search products, brands, anything',
                  style:
                  TextStyle(color: AppTheme.textSecondary, fontSize: 14),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// =========================================================
// Featured categories grid (top section)
// =========================================================
class _FeaturedCategories extends StatelessWidget {
  final List<Category> categories;
  const _FeaturedCategories({required this.categories});

  @override
  Widget build(BuildContext context) {
    if (categories.isEmpty) return const SizedBox.shrink();

    // Categories flagged is_featured in the admin come first;
    // if nobody flagged anything yet, just take the first 10.
    final featured =
    categories.where((c) => c.isFeatured && c.isActive).toList();
    final shown =
    (featured.isNotEmpty ? featured : categories.where((c) => c.isActive))
        .take(10)
        .toList();
    if (shown.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Categories',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.bold,
            color: AppTheme.textPrimary,
          ),
        ),
        const SizedBox(height: 12),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: shown.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 5,
            mainAxisSpacing: 14,
            crossAxisSpacing: 8,
            childAspectRatio: 0.72,
          ),
          itemBuilder: (context, i) => _CategoryIconTile(category: shown[i]),
        ),
      ],
    );
  }
}

class _CategoryIconTile extends StatelessWidget {
  final Category category;
  const _CategoryIconTile({required this.category});

  @override
  Widget build(BuildContext context) {
    final iconUrl = absMediaUrl(category.image ?? category.image_url);

    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ProductListScreen(initialCategory: category.slug),
        ),
      ),
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.primary.withOpacity(0.08),
              borderRadius: BorderRadius.circular(16),
            ),
            child: iconUrl != null
                ? CachedNetworkImage(
              imageUrl: iconUrl,
              fit: BoxFit.contain,
              errorWidget: (_, __, ___) => const Icon(
                Icons.category_outlined,
                color: AppTheme.primary,
              ),
            )
                : const Icon(Icons.category_outlined,
                color: AppTheme.primary),
          ),
          const SizedBox(height: 6),
          Expanded(
            child: Text(
              category.name,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 10.5, height: 1.15),
            ),
          ),
        ],
      ),
    );
  }
}

// =========================================================
// Section header with "See all"
// =========================================================
class _SectionHeader extends StatelessWidget {
  final String title;
  final VoidCallback? onSeeAll;
  const _SectionHeader({required this.title, this.onSeeAll});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.bold,
            color: AppTheme.textPrimary,
          ),
        ),
        if (onSeeAll != null)
          InkWell(
            onTap: onSeeAll,
            child: const Row(
              children: [
                Text(
                  'See all',
                  style: TextStyle(color: AppTheme.primary, fontSize: 13),
                ),
                Icon(Icons.chevron_right, color: AppTheme.primary, size: 18),
              ],
            ),
          ),
      ],
    );
  }
}

// =========================================================
// Featured products grid
// =========================================================
class _FeaturedProductsGrid extends StatelessWidget {
  final ProductProvider provider;
  const _FeaturedProductsGrid({required this.provider});

  @override
  Widget build(BuildContext context) {
    if (provider.isLoadingFeatured && provider.featuredProducts.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 40),
        child: Center(child: CircularProgressIndicator()),
      );
    }

    final products = provider.featuredProducts.take(10).toList();
    if (products.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Center(
          child: Text(
            'No featured products yet.\nTick "is featured" on some products in the admin panel.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
          ),
        ),
      );
    }

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: products.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 0.62,
      ),
      itemBuilder: (context, i) {
        final product = products[i];
        return GestureDetector(
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => ProductDetailScreen(slug: product.slug),
            ),
          ),
          child: ProductCard(product: product),
        );
      },
    );
  }
}
