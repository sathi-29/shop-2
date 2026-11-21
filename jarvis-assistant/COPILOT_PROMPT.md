# Prompt to paste into GitHub Copilot Chat (VS Code, Agent mode)

Put the `jarvis-assistant` folder in the ROOT of your e-commerce project first, open the project in VS Code, switch Copilot Chat to **Agent** mode, then paste everything below the line.

---

I added a finished voice-assistant module in the folder `jarvis-assistant/` at the root of this project. Your job is ONLY to integrate it into this e-commerce app. Do NOT rewrite, rename or "improve" the assistant itself. Do not change `jarvis-assistant/server/tools.js`, `agent.js`, `prompt.js`, `llm/*`, or `web/jarvis.js` unless I ask. Read `jarvis-assistant/README.md` first.

## What the module does
- `web/jarvis.js` exports `initJarvis(options)`. It adds a voice sheet (speech-to-text and text-to-speech use the browser's Web Speech API). It opens when the user taps the mic button in the bottom navigation bar.
- `server/handler.js` exports `createHandler()` which serves `POST /api/assistant/chat` and `/reset`. It talks to Gemini and calls tools: search products, product details, cart, prepare/confirm order, list/track orders, navigate.
- ALL store data goes through the adapter in `jarvis-assistant/server/adapter/`. `mock.js` is sample data. `custom.js` is the file I need you to fill in with the REAL data of this project.

## Do these steps in order

1. **Explore first.** Find out and tell me: frontend framework and router (React/Vue/Next/etc.), where the bottom navigation with the mic button is, how the cart state is stored, how login/auth works (JWT header, cookie, session), the backend framework and database/ORM, and the models/tables for products, cart, addresses, orders and order tracking. Show me this summary before editing.

2. **Backend mount.** Mount the handler in the existing backend, e.g. for Express: `app.use('/api/assistant', require('./jarvis-assistant/server/handler').createHandler());` (adapt to our framework; if the backend is not Node, run `node jarvis-assistant/server/index.js` as a separate service and proxy `/api/assistant` to it). Make sure CORS and the JSON body parsing work with our setup, and that the route sits behind nothing that would block it except our normal auth.

3. **Implement `jarvis-assistant/server/adapter/custom.js`** using this project's real database or internal API. Keep the exact function names and return shapes documented at the top of that file and in `mock.js` (products, cart lines, orders with `status`, `currentLocation`, `eta`, `events`, etc.). Map our own field names to those shapes. Requirements:
   - `resolveUser(req)` must verify the same auth the website already uses and return `{ id, name }`. If not logged in, throw or return null.
   - Every cart/order function must only read or write the logged-in user's own data.
   - `searchProducts` must support `query`, `brand`, `category`, `subcategory`, `minPrice`, `maxPrice`, `sort`. Return product `image` URLs if we have them.
   - `getCatalogInfo` must return the real brands, categories/sub-categories and price range.
   - `placeOrder` must reuse our existing order-creation logic (stock check, totals, order id, notifications), not duplicate it.
   - Order tracking: map our shipment/tracking data to `status` (placed | packed | shipped | in_transit | out_for_delivery | delivered | cancelled), `currentLocation`, `eta`, `carrier`, `events[]`. If we don't store some of these, tell me what is missing instead of inventing values.
   - Payment: `getPaymentMethods` should list the methods we really support. For online payment methods set `needsPaymentScreen: true` so the app opens our payment screen.
   Then set `ADAPTER=custom` in `jarvis-assistant/.env` (copy from `.env.example`; I will paste my `GEMINI_API_KEY` myself. Never commit `.env`, and add it to `.gitignore`).

4. **Frontend wiring.** In the app's root (so it loads once on every page) call:
   ```js
   import { initJarvis } from './jarvis-assistant/web/jarvis.js';
   initJarvis({
     apiUrl: '/api/assistant',                 // or our API base URL
     micButton: '<selector of the existing mic button>',   // reuse the existing bottom-bar mic, do NOT add a second one
     getAuthToken: () => /* return the token the app already sends to the API */,
     onAction: handleJarvisAction,
   });
   ```
   - Use the existing mic button in the bottom nav (add a stable `id` or `data-` attribute to it if needed). Tapping it must open Jarvis; keep its current look.
   - If the dev server runs on a different port than the backend, add a dev proxy for `/api/assistant`.
   - Write `handleJarvisAction(action)` to do real things:
     - `{type:'navigate', screen, productId, orderId}` → use our router: home, cart, orders, profile, reels, wishlist, product (product detail page for `productId`), checkout, payment.
     - `{type:'cart_changed'}` → refresh the cart state/badge (refetch or invalidate the cart query).
     - `{type:'order_placed', orderId}` → refresh orders state.

5. **Make sure the page works with it:** the mic needs HTTPS or `localhost`; the sheet uses `z-index: 99999`, so check that our bottom nav and modals do not overlap it badly on mobile.

6. **Verify.** Run `cd jarvis-assistant && npm test` (must still pass using the mock adapter). Start the app, then check these flows in Chrome using the text box in the sheet and the mic: (a) "I want a bangle" → Jarvis asks a follow-up and shows a product list; (b) ask a question about a listed product; (c) add to cart → the cart badge in our app updates; (d) order flow: Jarvis reads back the summary and only places the order after I say yes; (e) "where is my order" → it asks which order if there are several, then shows status and current location; (f) a logged-out user gets a polite "please log in" answer and sees no data. Report anything that failed and fix integration issues.

## Rules
- Do not install new dependencies unless truly necessary. The module has zero dependencies.
- Do not expose the Gemini key to the browser. It stays in the server `.env`.
- Keep changes in our own files small and explain each one briefly at the end.
- If something is ambiguous (e.g. several auth methods or order tables), ask me one question instead of guessing.
