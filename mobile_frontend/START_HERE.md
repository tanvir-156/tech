# Welcome to Technest

**Quick preview (Node.js required)**

Run `node scripts/serve-preview.mjs` in this folder and open <http://localhost:4173>. This bundled preview works without installing project dependencies. It demonstrates the same React Native app in a browser.

**Develop or run on your phone**

Run `npm ci`, copy `.env.example` to `.env`, then run `npx expo start`. Use Expo Go compatible with SDK 54, an emulator, or your own native build.

**Open the admin panel**

Choose **Account → Technest Admin** in the demo. Return to the store from **More**. Changes are stored on the current device. No real purchases or shipments occur in demo mode.

See **README.md** for full instructions, **docs/API_CONNECTION.md** for your existing Django server, and **docs/VERIFICATION.md** for the checks completed. Online payment is not enabled in this frontend; checkout uses cash on delivery. Native installation packages require a separate Expo/EAS build with your own app identifiers and account.
