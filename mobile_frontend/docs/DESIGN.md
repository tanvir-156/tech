# Technest design guide

Technest adapts the supplied mobile storefront and admin references into a shared React Native visual system. The identity centers on warm orange actions, deep ink surfaces, soft-white backgrounds, restrained shadows, and rounded cards. Both workspaces use the same components, typography, and status language.

## Color and type

| Token       | Value     | Use                                                   |
| ----------- | --------- | ----------------------------------------------------- |
| Ink         | `#111322` | Primary text, dark hero surfaces, app identity        |
| Orange      | `#FF6508` | Primary actions, active navigation, selected controls |
| Deep orange | `#F34A00` | Gradient endpoint and product prices                  |
| Background  | `#F7F7FC` | App canvas                                            |
| Card        | `#FFFFFF` | Product, order, and form surfaces                     |
| Line        | `#EAEAF2` | Borders, dividers, neutral separation                 |
| Muted       | `#7B7D90` | Secondary labels and supporting text                  |
| Green       | `#149368` | Available stock and positive states                   |
| Red         | `#E94D65` | Errors, cancelled states, and saved hearts            |
| Purple      | `#6D48D9` | Supporting accents                                    |

Inter supplies regular, medium, semibold, and bold weights through bundled Expo font assets. Large headings establish hierarchy; small uppercase eyebrows provide context. Prices and key metrics use bold type. Ionicons provide a consistent icon vocabulary.

The central definitions live in `src/components/ui.tsx`. Update shared components before introducing screen-specific variants.

## Composition

- A dark launch treatment and a hexagonal Technest brand mark introduce the app.
- The storefront combines an editorial gradient hero, tactile category shortcuts, product cards, and warm promotional panels.
- Category navigation uses a compact icon rail and a focused content pane. Catalog filters use a native modal sheet.
- Product detail gives the image breathing room, followed by clear identity, availability, price, configuration, and specifications. The purchase row remains outside the scrolling content.
- The PC builder presents components as a progressive selection with a visible running total and explicit compatibility guidance.
- Account screens use a warm ink/orange profile header. Cart, checkout, and order tracking keep amounts and progress easy to scan.
- Admin metrics, charts, stock cards, status badges, and product forms share the same visual vocabulary. Reports are calculated from available data rather than decorative fixed figures.

Spacing generally follows 8/12/16/20/22/24-point steps. Cards use generous corner radii, subtle borders, and light shadows. Orange gradients identify primary actions. Neutral chips and white fields support dense tasks without crowding the interface.

## Native interaction and accessibility

The interface uses React Native primitives throughout, including native scrolling, text inputs, pressable controls, modal sheets, image selection, and safe-area handling. It does not embed the original website in a WebView.

Navigation has five primary tabs in each workspace. Detail and editing screens use back navigation; Android hardware back is handled by the app shell. Forms show validation errors close to their controls, pending actions display progress, and state-changing actions report their result. Destructive order cancellation uses confirmation.

Icon actions have accessible labels, selectable chips expose selected state, and tabs expose their active state. Availability and order status use text alongside color. Native text scaling is retained. Screen readers, larger system font settings, keyboard behavior, and device-specific safe areas should be included in release-device QA.

On wider web/tablet displays, the app stays within a centered mobile-width canvas. The browser target is a useful preview of the same React Native interface.

## Screen inventory

| Workspace          | Screens                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Customer discovery | Home, categories, catalog, product detail, PC builder, comparison                                                               |
| Shopping           | Cart, checkout, wishlist, orders, order detail                                                                                  |
| Account and help   | Account, addresses, profile/password, notifications, support, about                                                             |
| Authentication     | Sign-in, registration/email verification                                                                                        |
| Admin              | Dashboard, orders, order detail, products, product editor, categories, inventory, reports, menu, customers, discounts, payments |

The project contains 31 routed screens plus the launch presentation. Demo and connected environments are identified in the interface. Demo seed content is designed to demonstrate the complete experience without requiring a running server.

## Assets

Product photography is curated from the user-supplied project and bundled for the demo. The Technest icon, adaptive icon, and splash assets live in `assets/`. Live image delivery follows the connected backend’s media URLs. Retain permission to use product photography and brand marks when preparing a public release.
