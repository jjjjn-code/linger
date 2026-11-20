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
page's JSON-LD (including `ProductGroup` / `hasVariant`, which Zara and other
variant-heavy shops use) and Open Graph tags. This is **best-effort**: plenty of
shops answer server requests with a 403 or load prices with JavaScript. Linger
doesn't try to disguise itself; when a shop refuses, the form still pre-fills a name
guessed from the link's slug and the brand from its domain, and points you at the
bookmarklet below. Every field is always editable by hand.

### "Send to Linger" bookmarklet (works on shops that block the server)

Your own browser has already loaded the page fine, so a bookmarklet reads it there.

1. Open **/bookmarklet** on your *deployed* Linger (also linked in the footer) and
   save the button as a bookmark. iOS Safari: bookmark any page, edit the bookmark,
   paste the copied code as its address.
2. On any product page, tap the bookmark. Linger opens with name, brand, price and
   image filled in (you still set desire and a note).

How it works: the bookmarklet ([`lib/bookmarklet.ts`](lib/bookmarklet.ts)) copies
only the page's `<title>`, `<meta>` tags and JSON-LD (a few KB) into the URL
*fragment* (`#linger=…`), which is never sent to any server. Linger parses it in the
browser ([`lib/capture.ts`](lib/capture.ts)) with the same parser the server route
uses ([`lib/productParse.ts`](lib/productParse.ts)), clears the fragment, and opens the
add form. In hosted mode it waits until you've signed in. Prices in a currency other
than GBP are left blank rather than dropped into the £ field.

## Project structure

```
app/
  layout.tsx                  Root layout, font, store provider
  page.tsx                    Home
  globals.css                 Design tokens applied; slider styling
  api/fetch-metadata/route.ts Best-effort server-side metadata fetch
  bookmarklet/page.tsx        Install page for the Send-to-Linger bookmarklet
components/                   Cards, form, modals, filters, sliders, icons
lib/
  types.ts                    Domain types
  store.tsx                   React store (items + categories, CRUD)
  storage.ts                  Persistence boundary (localStorage today)
  format.ts                   Currency (GBP) + date / days-on-list helpers
  productParse.ts             Shared product-page parser (server + browser)
  bookmarklet.ts / capture.ts Bookmarklet source + fragment reader
```
