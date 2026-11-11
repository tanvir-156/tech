# Connecting Technest to the Django project

Technest has two explicit data environments. `demo` uses the bundled catalog and device storage. `live` connects to the API structure in the uploaded Tech Zone project; it does not silently substitute demo data when a request fails.

## 1. Start your existing server

Use the `Backend` directory from the uploaded project. Retain its own dependency and environment setup. For a fresh local installation, create a virtual environment, install `requirements.txt`, copy `.env.example` to `.env`, and set a unique `DJANGO_SECRET_KEY`.

```bash
python -m venv .venv
# macOS/Linux:
source .venv/bin/activate
# Windows PowerShell instead:
# .venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
```

The supplied requirements are maintained by the original backend project. Backend installation and production deployment are separate from the mobile frontend.

Set `ALLOWED_HOSTS` to include the hostname or LAN IP clients will use. For the Expo web preview, add its exact origin to `CORS_ALLOWED_ORIGINS`, for example:

```dotenv
ALLOWED_HOSTS=localhost,127.0.0.1,192.168.1.20
CORS_ALLOWED_ORIGINS=http://localhost:8081,http://192.168.1.20:8081
CORS_ALLOW_ALL_ORIGINS=False
```

Match the port printed by Expo if it uses a different one. Native requests do not use browser CORS, but still need a reachable server, correct `ALLOWED_HOSTS`, and a permitted network path. Keep the existing website origins in the comma-separated lists if you still use that website.

## 2. Point the app at that origin

Create `.env` next to `package.json`:

```dotenv
EXPO_PUBLIC_DATA_MODE=live
EXPO_PUBLIC_API_URL=http://192.168.1.20:8000
```

Use the origin only, without `/api/v1`, `/admin`, or a trailing resource path. Restart Metro after changing the environment:

```bash
npx expo start --clear
```

| Client                            | Typical development API origin     |
| --------------------------------- | ---------------------------------- |
| Browser on the server’s computer  | `http://localhost:8000`            |
| Android Studio emulator           | `http://10.0.2.2:8000`             |
| iOS simulator on the server’s Mac | `http://localhost:8000`            |
| Physical phone                    | `http://YOUR_COMPUTER_LAN_IP:8000` |
| Deployed application              | Your reachable HTTPS API origin    |

The phone and development server must be able to reach each other. An Expo tunnel carries the development bundle; it does not automatically expose your Django server. For native release deployments, use HTTPS and your own production server configuration. Public Expo variables are bundled into the client and must not contain API secrets, gateway credentials, or Django’s secret key.

## 3. Sign in with the correct account type

Customers sign in through `POST /api/v1/accounts/token/`. The access and refresh JWTs are saved together. Expired customer access tokens trigger a shared refresh request and one retry; a failed refresh clears the saved session. Live registration uses the backend’s email verification flow and requires working backend email delivery (or the backend’s development console email output).

The native **Forgot password?** dialog completes email → six-digit code → new password without leaving sign-in. It posts `{email}` to `forgot-password/`, `{email, otp}` to `verify-password-otp/`, then `{reset_token, password, password2}` to `reset-password/`. The reset token and password stay in memory and are cleared when the dialog closes. Working backend email delivery is required. Demo mode simulates this flow with code `123456`; it sends no email and does not change the demo account password.

Staff use **Account → Staff sign in**, which calls `POST /api/v1/admin-panel/login/`. The server must authorize an active staff account. This endpoint returns a one-hour access token without a refresh token; staff sign in again after expiry. Resource access also depends on the account’s Django permissions. A superuser is useful for initial local integration; regular staff should have only the permissions they need.

Native JWTs use Expo SecureStore. Browser JWTs use `sessionStorage`, so closing that browser session may require another sign-in. Customer and staff sessions are deliberately separate; switching accounts replaces the current session. The Django API remains responsible for authorization, validation, and final order amounts.

## Endpoint map

All paths below are relative to `EXPO_PUBLIC_API_URL`.

| Feature                            | API calls used by the mobile frontend                                                                                |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Public catalog                     | `GET /api/v1/products/products/`, `categories/`, and `product-images/` under `/api/v1/products/`                     |
| Customer login and refresh         | `POST /api/v1/accounts/token/`, `POST /api/v1/accounts/token/refresh/`                                               |
| Registration and verification      | `POST /api/v1/accounts/register/`, `verify-email/`, and `resend-email-otp/`                                          |
| Password recovery                  | `POST /api/v1/accounts/forgot-password/`, `verify-password-otp/`, and `reset-password/`                              |
| Profile and password               | `GET/PATCH /api/v1/accounts/me/`, `POST /api/v1/accounts/change-password/`                                           |
| Address book                       | `GET/POST /api/v1/accounts/address/`, `PATCH/DELETE /api/v1/accounts/address/{id}/`                                  |
| Cart                               | `GET /api/v1/cart/`, `POST /api/v1/cart/items/`, `PATCH/DELETE /api/v1/cart/items/{id}/`                             |
| Wishlist                           | `GET /api/v1/wishlist/`, `POST /api/v1/wishlist/items/`, `DELETE /api/v1/wishlist/items/{id}/`                       |
| Customer orders                    | `GET /api/v1/orders/`, `POST /api/v1/orders/checkout/`, `POST /api/v1/orders/{id}/cancel/`                           |
| Staff session and orders           | `POST /api/v1/admin-panel/login/`, `GET /api/v1/admin-panel/workspace/`, `GET /api/v1/admin-panel/resources/orders/` |
| Staff reporting                    | `GET /api/v1/admin-panel/overview/?days=7`, `30`, or `90`                                                            |
| Staff customer and payment records | `GET /api/v1/admin-panel/resources/customers/` and `payments/`                                                       |
| Staff order detail and actions     | `GET /api/v1/admin-panel/resources/orders/{id}/`, `POST /api/v1/admin-panel/resources/orders/{id}/action/`           |
| Staff product and stock edits      | `GET/POST /api/v1/admin-panel/resources/products/{id-or-new}/` and `variants/{id-or-new}/`                           |
| Staff image upload                 | Multipart `POST /api/v1/admin-panel/resources/images/new/`                                                           |

For the public catalog, categories and images are separate resources. The mobile adapter joins product IDs to image records and maps the default product variant to price, inventory, and the cart variant ID. List loading supports array responses and Django REST Framework pagination. Admin resources use the original console’s `rows`/`pages` shape.

The original admin endpoint provides a rendered Django form alongside record values and a concurrency version. The frontend preserves unedited form fields, resolves brand/category labels to relation IDs, and sends `X-Record-Version` for existing-record edits and actions. Create categories and brands in Django admin before choosing them in the mobile product editor. The single selling-price field saves the default variant price and clears its percentage discount, so the displayed price is not discounted a second time.

## Product images and variants

Demo photos are local bundled assets. In live mode, image records come from `/api/v1/products/product-images/`. Absolute image URLs are used directly; relative media paths are resolved against the configured API origin. When no image record exists, the adapter falls back to `/media/products/default.jpg` on that server.

The API must return media URLs reachable by the phone. A URL containing `localhost` points to the phone itself when opened on a physical device. Use the correct public/LAN media origin, and serve uploaded media from Django during development or from your production media service.

The product editor opens the device photo library using Expo ImagePicker. A newly selected local image is uploaded as multipart form data after product and variant details are saved. Remote image URLs remain remote. After an image upload, earlier primary images are demoted so the new image becomes the catalog cover. If a later inventory/image step fails, the app reports that product details may already have been saved; review the record before retrying.

The current product interface uses one default backend variant. RAM/storage/color labels shown in live mode describe that variant; they do not imply a complete variant-switching implementation. Products without a usable variant or inventory cannot be purchased successfully. The adapter is the intended place to add further variant-selection rules for your catalog.

## Checkout behavior

Live checkout posts the backend’s shipping fields: recipient, phone, house, road, division, district, upazila/area, four-digit Bangladesh postal code, and `payment_method=cod`. Complete the address form before checkout. The supplied backend supports one saved address per account; edit that address to change the delivery details. Demo mode supports multiple addresses. The adapter stores area and road as labelled lines in the existing `address2` field and reads older comma-separated values. Order details display the server’s complete shipping-address snapshot once. A nonempty promotion code is submitted as `discount_type=promo` and `discount_code`; Django validates the code and calculates the final amount.

The supplied Django checkout processes the whole server cart. In live mode, remove unselected cart items before checking out. The mobile app blocks checkout when the local cart contains unselected items, so the order cannot silently include products the customer did not select.

The frontend’s **TECHNEST10** offer and ৳60 delivery are demo rules. Live previews use no delivery fee, matching the supplied Django checkout, and do not apply the demo promotion locally. The server calculates any submitted live discount and returns the final order total. Cash on delivery is the implemented payment flow. Online gateway initiation, redirects/deep-link returns, settlement, and refunds require further integration.

## Other boundaries

Catalog search, sorting, filtering, comparison, and PC component selection run in the frontend over the loaded catalog. The PC builder does not call the existing server’s compatibility engine. The adapter maps common component/category names (such as Processor, RAM, and Casing) to canonical picker slots. Extend those aliases for your own catalog taxonomy if necessary.

Demo dashboard, reports, customer summaries, and payment-method summaries derive from the sample orders. Live dashboards and reports use the Django overview API for paid revenue, trends, and status counts. Live customer and payment pages read their actual admin resource records; they do not infer those records from incomplete order-list rows. Staff permissions control which resources are available. The order list loads compact rows; full item, address, and date details load when an order is opened. These screens do not replace comprehensive customer management, gateway reconciliation, or the backend’s full reporting tools. Promotions, category/brand creation, account recovery, permissions management, and other advanced administration continue through the existing website/Django admin.

Connection failures appear as errors with a retry action. Check the exact API origin, backend logs, credentials, allowed hosts, CORS for browser clients, and media URLs when diagnosing integration issues. See `src/lib/api.ts`, `src/lib/mapping.ts`, and `src/state/AppContext.tsx` for the implemented adapters.
