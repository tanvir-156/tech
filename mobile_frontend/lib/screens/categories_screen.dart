import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/app_theme.dart';
import '../models/category.dart';
import '../providers/product_provider.dart';
import '../services/core_service.dart';
import 'product_list_screen.dart';

/// Categories tab — two-pane layout like the reference screenshots:
/// main categories on the left rail, the selected category's
/// sub-categories on the right, each with its brands. Tapping a
/// sub-category opens its products; tapping a brand opens that brand's
/// products. All data comes from GET /products/categories/ (main
/// categories carry their sub_categories and brands already).
class CategoriesScreen extends StatefulWidget {
  const CategoriesScreen({super.key});

  @override
  State<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends State<CategoriesScreen> {
  int _selectedIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = Provider.of<ProductProvider>(context, listen: false);
      if (provider.categories.isEmpty) provider.fetchCategories();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ProductProvider>();
    final categories =
    provider.categories.where((c) => c.isActive).toList();

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Categories'),
        backgroundColor: Colors.white,
        elevation: 0.5,
      ),
      body: _buildBody(provider, categories),
    );
  }

  Widget _buildBody(ProductProvider provider, List<Category> categories) {
    if (provider.isLoadingCategories && categories.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    if (categories.isEmpty) {
      return Center(
        child: TextButton.icon(
          onPressed: () => provider.fetchCategories(),
          icon: const Icon(Icons.refresh),
          label: const Text('Could not load categories. Retry'),
        ),
      );
    }

    if (_selectedIndex >= categories.length) _selectedIndex = 0;
    final selected = categories[_selectedIndex];

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ---------- left rail: main categories ----------
        Container(
          width: 112,
          color: const Color(0xFFF2F4F7),
          child: ListView.builder(
            itemCount: categories.length,
            itemBuilder: (context, i) {
              final c = categories[i];
              final isSelected = i == _selectedIndex;
              return InkWell(
                onTap: () => setState(() => _selectedIndex = i),
                child: Container(
                  color: isSelected ? Colors.white : Colors.transparent,
                  child: Row(
                    children: [
                      Container(
                        width: 3.5,
                        height: 56,
                        color:
                        isSelected ? AppTheme.primary : Colors.transparent,
                      ),
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 8),
                          child: Column(
                            children: [
                              _RailIcon(category: c, selected: isSelected),
                              const SizedBox(height: 4),
                              Text(
                                c.name,
                                textAlign: TextAlign.center,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: isSelected
                                      ? FontWeight.w700
                                      : FontWeight.w500,
                                  color: isSelected
                                      ? AppTheme.primary
                                      : AppTheme.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        // ---------- right pane: sub-categories + brands ----------
        Expanded(child: _SubCategoryPane(category: selected)),
      ],
    );
  }
}

class _RailIcon extends StatelessWidget {
  final Category category;
  final bool selected;
  const _RailIcon({required this.category, required this.selected});

  @override
  Widget build(BuildContext context) {
    final url = absMediaUrl(category.image ?? category.image_url);
    const size = 30.0;
    if (url == null) {
      return Icon(Icons.grid_view_rounded,
          size: 26,
          color: selected ? AppTheme.primary : AppTheme.textSecondary);
    }
    return CachedNetworkImage(
      imageUrl: url,
      width: size,
      height: size,
      fit: BoxFit.contain,
      errorWidget: (_, __, ___) => Icon(Icons.grid_view_rounded,
          size: 26,
          color: selected ? AppTheme.primary : AppTheme.textSecondary),
    );
  }
}

class _SubCategoryPane extends StatelessWidget {
  final Category category;
  const _SubCategoryPane({required this.category});

  @override
  Widget build(BuildContext context) {
    final subs = (category.subCategories ?? [])
        .where((s) => s.isActive)
        .toList();

    if (subs.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'No sub-categories under ${category.name}',
              style: const TextStyle(color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 12),
            _ViewProductsButton(category: category),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(10),
      itemCount: subs.length,
      itemBuilder: (context, i) => _SubCategoryCard(subCategory: subs[i]),
    );
  }
}

class _ViewProductsButton extends StatelessWidget {
  final Category category;
  const _ViewProductsButton({required this.category});

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: () => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ProductListScreen(initialCategory: category.slug),
        ),
      ),
      icon: const Icon(Icons.inventory_2_outlined, size: 18),
      label: Text('See all ${category.name} products'),
    );
  }
}

class _SubCategoryCard extends StatelessWidget {
  final Category subCategory;
  const _SubCategoryCard({required this.subCategory});

  @override
  Widget build(BuildContext context) {
    final brands = (subCategory.brands ?? [])
        .where((b) => b.isActive)
        .toList();

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            borderRadius:
            const BorderRadius.vertical(top: Radius.circular(14)),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) =>
                    ProductListScreen(initialCategory: subCategory.slug),
              ),
            ),
            child: Padding(
              padding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      subCategory.name,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                  ),
                  const Text(
                    'See all',
                    style: TextStyle(color: AppTheme.primary, fontSize: 12),
                  ),
                  const Icon(Icons.chevron_right,
                      color: AppTheme.primary, size: 18),
                ],
              ),
            ),
          ),
          if (brands.isNotEmpty) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Brands',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppTheme.textSecondary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 10,
                    runSpacing: 12,
                    children: brands
                        .map((b) => _BrandChip(
                      brand: b,
                      subCategory: subCategory,
                    ))
                        .toList(),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _BrandChip extends StatelessWidget {
  final Brand brand;
  final Category subCategory;
  const _BrandChip({required this.brand, required this.subCategory});

  @override
  Widget build(BuildContext context) {
    final url = absMediaUrl(brand.image ?? brand.image_url);

    return InkWell(
      borderRadius: BorderRadius.circular(10),
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ProductListScreen(
            initialCategory: subCategory.slug,
            initialBrand: brand.slug,
          ),
        ),
      ),
      child: SizedBox(
        width: 62,
        child: Column(
          children: [
            Container(
              width: 56,
              height: 56,
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: url != null
                  ? CachedNetworkImage(
                imageUrl: url,
                fit: BoxFit.contain,
                errorWidget: (_, __, ___) =>
                const Icon(Icons.business_outlined,
                    color: AppTheme.textSecondary),
              )
                  : const Icon(Icons.business_outlined,
                  color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 5),
            Text(
              brand.name,
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 10.5),
            ),
          ],
        ),
      ),
    );
  }
}
