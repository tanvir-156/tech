class ApiConstants {
  // Single source of truth for the API root. Every service builds its
  // endpoint paths off this instead of hardcoding its own host/prefix
  // (previously auth_service.dart and product_service.dart pointed at two
  // different hosts AND different version prefixes — that mismatch is
  // fixed by centralizing it here).
  //
  // ASSUMPTION: your root urls.py versions everything under /api/v1/
  // (matching what auth_service.dart already had for accounts). If your
  // products app isn't under /api/v1/products/, update the paths below.
  //
  // Android emulator -> maps to your PC's own localhost.
  // static const String baseUrl = "http://192.168.0.155:8000/api/v1";
  //
  // static const String baseUrl = "http://10.0.2.2:8000/api/v1";

  static const String baseUrl = 'http://192.168.0.199:8000/api/v1';

// Swap to one of these depending on how you're running the app:
// Chrome / Windows desktop app -> "http://127.0.0.1:8000/api/v1"
// Physical device over WiFi     -> "http://<YOUR_PC_LAN_IP>:8000/api/v1"
//   (find your IP with `ipconfig`, and run Django with:
//   python manage.py runserver 0.0.0.0:8000)

  // ── Product app endpoints ────────────────────────────────────────────
  // Backend/config/urls.py mounts the products app at
  //   path('api/v1/products/', include('products.urls'))
  // and Backend/products/urls.py is a DRF router that registers
  // 'categories', 'brands', 'products', 'variants', ... INSIDE that app.
  // Every endpoint therefore repeats the app segment: the verified URLs
  // (checked against the running backend) are
  //
  //   GET /api/v1/products/products/          product list (paginated)
  //   GET /api/v1/products/products/<slug>/   product detail
  //   GET /api/v1/products/categories/        categories (top-level)
  //   GET /api/v1/products/brands/            brands
  //   GET /api/v1/products/variants/?product=1
  //   GET /api/v1/products/product-images/?variant=1
  //
  // Two paths the app used to ask for were wrong, and both failed in a
  // way that looked like "empty data" instead of an error:
  //   • '/categories/' -> 404, so the app silently fell back to its
  //     hardcoded category list and no tap ever reached the API.
  //   • '/products/'   -> 200, but it is the DRF router's API *index*
  //     (a JSON object of links, not a list), so the product list parsed
  //     as zero products. Tapping a category looked like "no products".
  //
  // (Dio joins baseUrl + path by plain string concatenation, so a leading
  //  slash simply continues the /api/v1/ prefix.)
  static const String productsPath = '/products/products/';
  static const String categoriesPath = '/products/categories/';
  static const String brandsPath = '/products/brands/';
  static const String variantsPath = '/products/variants/';
  static const String productImagesPath = '/products/product-images/';
  static const String reviewsPath = '/products/reviews/';
  static const String questionsPath = '/products/questions/';
}