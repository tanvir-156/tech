import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../core/app_theme.dart';
import '../services/core_service.dart';

/// Auto-sliding promo banner for the home screen.
///
/// Fetches active banners from GET /core/banners/. If none exist yet
/// (fresh database), the whole section hides itself instead of showing
/// an ugly empty box. Add banners in the Django admin under "Banners"
/// (upload an image OR paste an image_url), set sort_order, done.
class PromoBannerCarousel extends StatefulWidget {
  const PromoBannerCarousel({super.key});

  @override
  State<PromoBannerCarousel> createState() => _PromoBannerCarouselState();
}

class _PromoBannerCarouselState extends State<PromoBannerCarousel> {
  final PageController _pageController = PageController();
  Timer? _timer;
  List<Map<String, dynamic>> _banners = [];
  bool _loading = true;
  int _current = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final banners = await CoreService.getActiveBanners();
      if (!mounted) return;
      setState(() {
        _banners = banners;
        _loading = false;
      });
      if (_banners.length > 1) _startAutoSlide();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _banners = [];
        _loading = false;
      });
    }
  }

  void _startAutoSlide() {
    _timer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted || !_pageController.hasClients || _banners.isEmpty) return;
      final next = (_current + 1) % _banners.length;
      _pageController.animateToPage(
        next,
        duration: const Duration(milliseconds: 450),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading || _banners.isEmpty) return const SizedBox.shrink();

    return Column(
      children: [
        SizedBox(
          height: 170,
          child: PageView.builder(
            controller: _pageController,
            itemCount: _banners.length,
            onPageChanged: (i) => setState(() => _current = i),
            itemBuilder: (context, i) => _BannerCard(banner: _banners[i]),
          ),
        ),
        const SizedBox(height: 8),
        if (_banners.length > 1)
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              _banners.length,
                  (i) => AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.symmetric(horizontal: 3),
                height: 7,
                width: _current == i ? 20 : 7,
                decoration: BoxDecoration(
                  color: _current == i
                      ? AppTheme.primary
                      : Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _BannerCard extends StatelessWidget {
  final Map<String, dynamic> banner;
  const _BannerCard({required this.banner});

  @override
  Widget build(BuildContext context) {
    final imageUrl = absMediaUrl(
        (banner['image'] ?? banner['image_url'])?.toString());
    final title = (banner['title'] ?? '').toString();
    final subtitle = (banner['subtitle'] ?? '').toString();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: imageUrl != null
            ? CachedNetworkImage(
          imageUrl: imageUrl,
          fit: BoxFit.cover,
          width: double.infinity,
          placeholder: (_, __) => _PlaceholderCard(title: title),
          errorWidget: (_, __, ___) => _PlaceholderCard(title: title),
        )
            : _PlaceholderCard(title: title, subtitle: subtitle),
      ),
    );
  }
}

/// Shown when a banner has no image (or the URL is unreachable) so the
/// carousel still looks deliberate instead of broken.
class _PlaceholderCard extends StatelessWidget {
  final String title;
  final String subtitle;
  const _PlaceholderCard({required this.title, this.subtitle = ''});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppTheme.primary, AppTheme.primaryDark],
        ),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (title.isNotEmpty)
            Text(
              title,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.bold,
              ),
            ),
          if (subtitle.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              subtitle,
              style: const TextStyle(color: Colors.white70, fontSize: 13),
            ),
          ],
        ],
      ),
    );
  }
}
