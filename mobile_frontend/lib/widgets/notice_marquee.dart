import 'package:flutter/material.dart';

import '../core/app_theme.dart';
import '../services/core_service.dart';

/// Scrolling notice strip (like the marquee below the banner in the
/// reference screenshots). Fetches active notices from
/// GET /core/notices/. Hides itself when there is nothing to show.
/// Add notices in the Django admin under "Notices".
class NoticeMarquee extends StatefulWidget {
  const NoticeMarquee({super.key});

  @override
  State<NoticeMarquee> createState() => _NoticeMarqueeState();
}

class _NoticeMarqueeState extends State<NoticeMarquee>
    with SingleTickerProviderStateMixin {
  static const double _stripHeight = 18;

  String _text = '';
  bool _loading = true;
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 20),
    )..repeat();
    _load();
  }

  Future<void> _load() async {
    try {
      final notices = await CoreService.getActiveNotices();
      if (!mounted) return;
      setState(() {
        _text = notices
            .map((n) {
          final title = (n['title'] ?? '').toString();
          final message = (n['message'] ?? '').toString();
          return message.isEmpty ? title : '$title — $message';
        })
            .where((s) => s.isNotEmpty)
            .join('   •   ');
        _loading = false;
      });
      // Scroll speed scales with text length so both short and long
      // notices stay readable.
      if (_text.isNotEmpty) {
        final seconds = (_text.length / 6).clamp(8, 60).round();
        _controller
          ..stop()
          ..duration = Duration(seconds: seconds)
          ..repeat();
      }
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading || _text.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          const Icon(Icons.campaign_outlined,
              size: 18, color: AppTheme.primary),
          const SizedBox(width: 8),
          Expanded(
            child: SizedBox(
              height: _stripHeight,
              child: ClipRect(
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    return AnimatedBuilder(
                      animation: _controller,
                      child: _MeasuredMarqueeText(text: _text),
                      builder: (context, child) {
                        final textWidth =
                        (child as _MeasuredMarqueeText).width(context);
                        final total = constraints.maxWidth + textWidth;
                        final dx =
                            constraints.maxWidth - total * _controller.value;
                        return Stack(
                          clipBehavior: Clip.hardEdge,
                          children: [
                            Positioned(left: dx, child: child),
                          ],
                        );
                      },
                    );
                  },
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MeasuredMarqueeText extends StatelessWidget {
  final String text;
  const _MeasuredMarqueeText({required this.text});

  double width(BuildContext context) {
    final painter = TextPainter(
      text: TextSpan(
        text: text,
        style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
      ),
      maxLines: 1,
      textDirection: Directionality.of(context),
    )..layout();
    return painter.width;
  }

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      maxLines: 1,
      softWrap: false,
      style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
    );
  }
}