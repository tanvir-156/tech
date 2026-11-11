# Technest

A React Native mobile frontend for the supplied Tech Zone commerce project, rebuilt as **Technest**. The customer app and admin workspace share a polished orange, ink, and soft-white design inspired by the supplied references.

Built with Expo SDK 54, React Native 0.81, React 19, and TypeScript. Runs on Android, iOS, and the web from one source project.

## Run it

Use Node.js 20.19.4 or newer. Node.js 22 LTS is recommended.

```bash
npm ci
cp .env.example .env
npx expo start
```

The default environment is a local demo. Open the project in an Expo Go version compatible with SDK 54, or use a development build. Press `a` for an installed Android emulator, `i` for an iOS simulator on macOS, or `w` for the browser.

```bash
npm run android
npm run ios
npm run web
```

For the demo admin panel, open **Account → Technest Admin**. From the admin menu, return to the customer store. Demo sign-in fields are prefilled; they create a local demonstration session rather than authenticating with a server.

## Instant browser preview

A generated demo is included in `web-preview/`. With Node.js installed, run `node scripts/serve-preview.mjs` and open <http://localhost:4173>. This preview does not need `npm ci`. Rebuild it after source changes with `npm run export:web`.

## What you can explore

| Customer app                                                                      | Admin workspace                                              |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Home, categories, catalog search, sorting, and filters                            | Dashboard, order metrics, and sales charts                   |
| Product images, specifications, and configuration details                         | Searchable orders and order status updates                   |
| Wishlist and comparison of up to three products                                   | Product list and three-step product editor                   |
| Seven-component PC builder and cart                                               | Inventory with stock updates and stock filters               |
| Address book and cash-on-delivery checkout                                        | Categories and customer records/summaries                    |
| Orders, tracking, and eligible cancellation                                       | Reports, discount information, and payment records/summaries |
| Profile, sign-in, registration, email verification, password update, and recovery | Staff sign-in for a connected server                         |
| Notifications, support, and app information                                       | Customer/admin workspace switching                           |

The demo includes 18 curated products with bundled imagery from the uploaded project, sample orders, addresses, and a saved customer profile. Cart, wishlist, comparison, PC build, demo orders, product edits, and inventory changes persist on the current device/browser. Clearing the app’s storage restores the seed demo.

Use **TECHNEST10** at demo checkout for 10% off the selected product subtotal, capped at **৳2,000**. Demo delivery is **৳60** per order. Demo orders do not charge money or create shipments.

## Connect the existing backend

Change `.env` and restart Expo:

```dotenv
EXPO_PUBLIC_DATA_MODE=live
EXPO_PUBLIC_API_URL=http://YOUR_SERVER:8000
```

`EXPO_PUBLIC_API_URL` is the Django origin without `/api/v1`. On a phone, use a reachable LAN IP or HTTPS address rather than `localhost`. See [API connection guide](docs/API_CONNECTION.md) for authentication, endpoint mapping, CORS, images, and setup details.

Live mode uses the supplied Django API. Customer and staff sessions are separate. Native tokens use Expo SecureStore; browser tokens use session storage. Staff access is checked in the frontend and by the backend’s permissions. Public Expo variables must not contain secrets.

## Project layout

```text
App.tsx                     App shell, navigation, safe areas, and splash
src/components/ui.tsx       Shared native design components
src/screens/Storefront.tsx  Discovery, product details, builder, comparison
src/screens/Commerce.tsx    Cart, checkout, account, orders, authentication
src/screens/Admin.tsx       Mobile admin workspace
src/state/AppContext.tsx    Application state, persistence, and operations
src/lib/api.ts              HTTP client, sessions, JWT refresh, endpoint map
src/lib/mapping.ts          Django response and checkout adapters
src/lib/data.ts             Bundled demonstration catalog and sample data
assets/                    Brand assets, product photos, and generated icon
tests/                      Business logic and adapter tests
docs/                       Connection, design, and verification notes
```

## Checks and builds

```bash
npm run typecheck
npm test
npm run export:web
npm run export:all
```

See [verification notes](docs/VERIFICATION.md) for the checks actually completed on this delivery.

`eas.json` contains preview and production build profiles. To create installable native builds, configure your own Expo account/project, application identifiers, and signing credentials:

```bash
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --profile preview --platform android
npx eas-cli build --profile production --platform ios
```

The preview Android profile requests an APK. iOS distribution requires the appropriate Apple account and signing setup. This source project does not include signed APK/IPA binaries or store publication.

## Scope and integration limits

This delivery is the mobile frontend. The existing Django server, its database, deployment, email service, and payment gateway remain separate services.

Checkout currently supports **cash on delivery**. Online payment initiation, gateway redirects, settlements, and refunds are not implemented in the mobile app. Live promotions and category/brand management remain in the existing Django admin. The mobile product editor uses one default variant per product; selecting arbitrary additional backend variants is outside the current mobile interface. The PC builder assembles a selection and total; it does not run a complete hardware compatibility engine.

Live checkout follows the supplied Django backend: one saved delivery address, whole-cart checkout, no added delivery fee, and final totals calculated by the server. Demo delivery remains ৳60. Live dashboard/report metrics and customer/payment records come from their admin APIs; demo summaries derive from sample orders. The mobile interface does not perform gateway reconciliation or refunds. Support content is available in the app; no live chat or push-notification delivery service is included.

[Design guide](docs/DESIGN.md) · [API connection guide](docs/API_CONNECTION.md)
