import 'package:dio/dio.dart';
import '../core/api_client.dart';
import '../core/constants.dart';

/// Turns a possibly-relative media URL ("/media/brands/x.png") into an
/// absolute one the app can load. External URLs (https://…) pass through.
String? absMediaUrl(String? url) {
  if (url == null || url.isEmpty) return null;
  if (url.startsWith('http')) return url;
  final base = ApiConstants.baseUrl; // e.g. http://192.168.0.105:8000/api/v1
  final origin = base.contains('/api/')
      ? base.substring(0, base.indexOf('/api/'))
      : base;
  return '$origin$url';
}

/// Small service for the `core` Django app (notices, banners).
/// Kept provider-free on purpose: the widgets that need this data fetch
/// it themselves and hide gracefully if nothing has been added yet.
class CoreService {
  static final Dio _dio = ApiClient.instance.dio;

  static Future<List<Map<String, dynamic>>> getActiveBanners() =>
      _getList('/core/banners/');

  static Future<List<Map<String, dynamic>>> getActiveNotices() =>
      _getList('/core/notices/');

  static Future<List<Map<String, dynamic>>> _getList(String path) async {
    try {
      final response =
      await _dio.get(path, queryParameters: {'is_active': true});
      final data = response.data;
      final List results = data is List ? data : (data['results'] as List? ?? []);
      return results.map((e) => Map<String, dynamic>.from(e)).toList();
    } on DioException catch (e) {
      throw Exception(ApiClient.errorMessage(e));
    }
  }
}
