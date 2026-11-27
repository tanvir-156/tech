# TechNest — React Native (Expo) mobile app

Mobile front end for the TechZone Django project, rebranded **TechNest**.
One app, two experiences, both talking to your existing Django REST API:

| Experience | Who | Entry |
|---|---|---|
| **Customer app** | shoppers | opens by default |
| **Admin app** ("TechNest Admin") | staff | *Account → Staff & admin panel*, or *Sign in → Staff & admin sign in* |

The visual language (orange `#FF6B00` on warm-black, soft cards, Poppins type, the `TN` monogram, wave splash, pill status badges) follows the two design boards you supplied.

---

## 1. Run it

### Backend (once)
The phone reaches Django over your Wi-Fi, so Django must listen on your network and trust that host:

```bash
cd Backend
# in Backend/.env — add your computer's LAN IP (and 10.0.2.2 for the Android emulator)
ALLOWED_HOSTS=localhost,127.0.0.1,192.168.0.10,10.0.2.2

python manage.py runserver 0.0.0.0:8000
```
(Find your LAN IP with `ipconfig` on Windows or `ifconfig`/`ip a` on macOS/Linux.)

### Mobile app
```bash
cd technest-mobile
npm install
npx expo install --fix      # aligns native package versions with your Expo Go / SDK
npx expo start
```
Scan the QR code with **Expo Go** (phone and computer on the same Wi-Fi), or press `a` / `i` for an emulator.

### Server address
* The app guesses `http://<your computer's IP>:8000` automatically from Expo.
* Override at any time inside the app: **Account → Server settings** (it has a *Test* button), or set `EXPO_PUBLIC_API_URL` (see `.env.example`).
* Android emulator → `http://10.0.2.2:8000`. Tunnel mode (`--tunnel`) can't be auto-detected; enter the address manually.

### Staff / admin access
Use any staff account created for the TechZone console (see `ADMIN_SETUP.md` in the Django project). Sections shown in the admin app follow that user's permissions exactly as the web console does.

---

## 2. What is included

### Customer
Splash · Home (hero, notices, quick categories, **Deals of the Day** countdown, featured, brands, new arrivals) · Categories (rail + subcategories + brands) · Product list (sort, price/brand/stock/sale filters, infinite scroll) · Search (debounced, recent searches) · Product detail (gallery, RAM/Storage/Color pickers, stock, savings, specs sections, reviews, Q&A, wishlist, compare, share) · Cart · Checkout (address, COD / SSLCommerz, promo codes) · Order success · My Orders · Order detail (timeline, cancel, pay now) · Wishlist · Compare · **PC Builder** (16 component slots, compatibility check, add build to cart) · Profile · Addresses · Account info · Change password · Notifications · Help · About · Login / Register / Email OTP / Forgot-reset password.

### Admin
Splash · Dashboard (sales, orders, customers, products, sales chart, "needs attention", recent orders, best sellers) · Orders (status tabs with counts, search, infinite scroll) · Order detail (timeline, update status, cancel) · Products (category tabs, search, FAB) · **Add/Edit Product wizard** (Basic → Specs → Images, uploads) · Categories · Inventory (healthy / low / out) · Reports · "More" menu · Quick-create "+" button · and a **generic list + editor for every other console section** (payments, refunds, brands, colors, discounts, notices, reviews, questions, customers, addresses, carts, wishlists, PC mappings, saved builds, staff, roles, activity log). The editor renders the exact form the Django console returns, so validation, choices, permissions, optimistic-locking and delete safeguards are the server's.

---

## 3. Notes on where the app differs from the mock-ups

These are deliberate, so the app never shows something the API can't back up:

* **No growth percentages** (↑ +18.4 %) on dashboard cards — the API returns the current period only and the backend states it does not invent comparisons. Cards show factual captions (average order value, pending count) instead.
* **No cart checkboxes / ৳60 delivery line.** The cart API has no per-item selection and the backend adds no delivery fee, so the whole cart is ordered and delivery is shown as "calculated at checkout".
* **Reports:** "Sales by Category" has no API endpoint, so the screen offers Sales Overview, Top Selling Products, Orders by Status and Payment Summary.
* Order numbers are shown as `#TN-00056`.
* Brand mark: *TechZone* → *TechNest*, `TZ` → `TN` everywhere in the mobile app (icon, splash, headers).

---

## 4. Project layout

```
App.tsx                      providers, splash gate, customer/admin switch
src/config.ts                API base URL (auto-detect + override) and media URL fixing
src/lib/api.ts               customer API client (JWT in SecureStore, auto refresh)
src/lib/adminApi.ts          staff console client (+ typed responses)
src/lib/formParser.ts        turns the console's Django form HTML into native fields
src/store/                   Auth, Shop (cart/wishlist/compare), Admin, Toast
src/components/              ui kit, charts, brand marks, product card, admin kit
src/navigation/              Customer.tsx, Admin.tsx (custom tab bars)
src/screens/{auth,customer,admin}
assets/                      icon, adaptive icon, splash, Poppins fonts
```

## 5. Troubleshooting

* **"Can't reach the server"** — check Server settings, that Django runs with `0.0.0.0:8000`, same Wi-Fi, and your IP is in `ALLOWED_HOSTS` (a Django "DisallowedHost" 400 means it's missing).
* **Images missing** — product images are served from Django `/media/`; keep `DEBUG=True` locally (the app rewrites `localhost` media URLs to your server address).
* **Version warnings from Expo Go** — run `npx expo install --fix`; if your Expo Go is newer than SDK 52, upgrade with `npx expo install expo@latest && npx expo install --fix`.
* **Online payment** opens SSLCommerz in the in-app browser; after paying, return to the app — the order screen refreshes automatically and shows the new payment status.
* Plain-HTTP API access is enabled for development (`usesCleartextTraffic`, iOS ATS exception in `app.json`). Use HTTPS and remove both before publishing to the stores.
* Type-check: `npm run typecheck`.
