# Verification

Verified on 11 November 2026. Checks used Node.js 24, Expo SDK 54, TypeScript 5.9, and Chromium in the managed Linux workspace.

## Automated checks

- `npm run typecheck`: passed.
- `npm test`: 10 tests passed. Cases cover selected-item totals, discount caps, demo/live delivery differences, purchased price snapshots, stock/quantity validation, structured checkout fields, product/order adapters, Django admin form preservation, and address round trips.
- `npm run format:check`: passed after final formatting.
- `npx expo install --check`: dependencies match the installed Expo SDK.
- `npm run export:all`: Android, iOS, and web production JavaScript/asset exports completed.
- `npm run export:web`: bundled browser preview completed in demo mode.

## Browser flows

The generated production preview was exercised in Chromium. No page errors were observed in the tested flows.

- Search → catalog → product → comparison selection → add to cart.
- Cart quantity, checkout, invalid/valid promotion codes, demo order placement, and order details.
- Seven-component PC build → cart, then persistence after reload.
- Admin dashboard, orders, products, and editor navigation in the production preview.
- Hero slide selection and customer/admin screenshots at 390px; narrow 360px layout check.

Additional development-browser checks covered address creation/editing/deletion, order cancellation, password-recovery validation/completion, admin order status changes, product creation/editing, image selection, inventory changes, report filters, category drilldowns, customers, payments, and persistence. Forms and cancellation controls were checked at 360px.

## Django integration checks

The supplied backend was copied to an isolated validation workspace with its own SQLite database and temporary QA accounts. The original uploaded database was not modified. Successful requests covered customer sign-in and JWT refresh, profile/address updates, cart, wishlist, cash-on-delivery checkout, order cancellation, staff sign-in, admin order transitions, product/variant creation and updates, inventory changes, reporting/resources, and multipart image upload. Live browser checks also covered customer sign-in, cart, cash-on-delivery order placement/cancellation, and staff dashboard/orders. Live checkout previews use the backend’s zero-delivery calculation.

## Scope of verification

Production exports validate the native JavaScript and assets; they are not signed APK/IPA builds. No physical Android/iOS device or simulator was available for native execution. Device-specific keyboard behavior, permissions, screen-reader behavior, image-library interactions, larger system text, and release signing still require device QA. Email delivery for live registration and recovery depends on the backend’s email configuration. Online payment is unavailable in this frontend; live checkout uses cash on delivery. The API connection guide documents the default-variant, address, whole-cart, and admin limitations.

The archive includes the full mobile frontend source, local assets, package lock, configuration, documentation, tests, and a generated browser preview. It excludes dependency installations, backend databases, credentials, QA accounts, and internal scratch files.
