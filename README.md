# Linger

> *Some wants last · most don't*

A personal **considered-purchase** tool. The wants that linger are the ones worth
keeping — so you log a want, let it sit, and see if it lasts. Time on the list is a
feature, not a delay: it helps you tell a lasting want from a passing one.

## Features

- **Log items** with a product link, image, price, name, brand, desire and
  positive-impact scores, a category, and an optional note. Pasting a link does a
  best-effort auto-fetch of the image/name/price; every field stays editable.
- **Browse** as cards or a comparison list, filter by your own categories, and
  sort by price, date, desire, or impact.
- **Rank** by dragging items into your true order of wanting; if that disagrees
  with your desire scores, it offers to reconcile them.
- **Decide deliberately** — a "decide to buy" flow captures *why* you bought it;
  letting go asks for confirmation first. Each item opens a read-only detail view.
- **Reflect** on a dashboard: how many you're considering / bought / let go, the
  value of wants you released, items-added-by-month, and gentle nudges for things
  you've held a while.

## Stack

- **Next.js 14 (App Router) + TypeScript** — UI and a small server route in one app.
- **Tailwind CSS** — a strict design-token system for the calm, restrained look.
- **Local-first storage** — all data lives in your browser (`localStorage`), so the
  app is fully usable on one device with no accounts or setup. Cross-device sync is
  a later step and only swaps the persistence layer.
- **@dnd-kit** — accessible, touch-friendly drag-and-drop for ranking.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

To build for production:

```bash
npm run build
npm start
```

## How data is stored

Everything lives under the `considered.v1` key in your browser's `localStorage`.
Because it's per-browser, your data won't yet sync between phone and laptop — that's
the job of a later phase, which will add a hosted database behind the same app.

The persistence boundary is isolated in [`lib/storage.ts`](lib/storage.ts); only that
file changes when sync is added.

## Auto-fetch from a product link

Pasting a link and pressing **Fetch details** asks the server route
([`app/api/fetch-metadata/route.ts`](app/api/fetch-metadata/route.ts)) to read the
page's Open Graph / JSON-LD tags. This is **best-effort**: many shops block scrapers
or load prices with JavaScript, so it often returns partial data or nothing. That's
expected — every field is always editable by hand, and a failed fetch never blocks
you from saving.

## Project structure

```
app/
  layout.tsx                  Root layout, font, store provider
  page.tsx                    Home
  globals.css                 Design tokens applied; slider styling
  api/fetch-metadata/route.ts Best-effort server-side metadata fetch
components/                   Cards, form, modals, filters, sliders, icons
lib/
  types.ts                    Domain types
  store.tsx                   React store (items + categories, CRUD)
  storage.ts                  Persistence boundary (localStorage today)
  format.ts                   Currency (GBP) + date / days-on-list helpers
```
