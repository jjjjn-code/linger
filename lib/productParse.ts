// Pure product-metadata parsing — no DOM, no Node APIs — so the exact same code
// runs on the server (fetch-metadata route) and in the browser (bookmarklet
// capture). Everything is best-effort; callers always let the user edit.

import type { FetchedMetadata } from "./types";

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

function safeCodePoint(n: number): string {
  try {
    return String.fromCodePoint(n);
  } catch {
    return "";
  }
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Pull a <meta> content value by matching property/name attributes. */
function metaContent(html: string, keys: string[]): string | undefined {
  for (const key of keys) {
    const k = escapeRe(key);
    // Quote-aware: a value runs to its *own* closing quote and can't contain it,
    // so an apostrophe inside a double-quoted value — "Men's coat" — doesn't
    // truncate the match, and a match can't leak into the next tag. Attribute
    // order varies, so try both.
    const patterns = [
      new RegExp(
        `<meta\\b[^>]*?\\b(?:property|name)=(["'])${k}\\1[^>]*?\\bcontent=(["'])((?:(?!\\2)[\\s\\S])*)\\2`,
        "i"
      ),
      new RegExp(
        `<meta\\b[^>]*?\\bcontent=(["'])((?:(?!\\1)[\\s\\S])*)\\1[^>]*?\\b(?:property|name)=(["'])${k}\\3`,
        "i"
      ),
    ];
    const a = html.match(patterns[0]);
    if (a && a[3]) return decodeEntities(a[3]);
    const b = html.match(patterns[1]);
    if (b && b[2]) return decodeEntities(b[2]);
  }
  return undefined;
}

export function parsePrice(raw: string | number | undefined | null): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  // Keep digits, dots, commas. Handle "1.299,00" and "1,299.00" loosely.
  const cleaned = raw.replace(/[^\d.,]/g, "");
  if (!cleaned) return null;
  let normalized = cleaned;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    // Assume the last separator is the decimal point.
    normalized =
      cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (cleaned.includes(",")) {
    // Comma only: treat as thousands unless it looks like decimals (1–2 digits after).
    normalized = /,\d{1,2}$/.test(cleaned)
      ? cleaned.replace(",", ".")
      : cleaned.replace(/,/g, "");
  }
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

/** JSON-LD `image` may be a string, an array, or an ImageObject ({url}). */
function imageUrlFrom(img: unknown): string | undefined {
  if (!img) return undefined;
  if (typeof img === "string") return img;
  if (Array.isArray(img)) return imageUrlFrom(img[0]);
  if (typeof img === "object") {
    const o = img as Record<string, unknown>;
    const u = o.url ?? o["@id"] ?? o.contentUrl;
    return typeof u === "string" ? u : undefined;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// JSON-LD (schema.org) — Product, and ProductGroup with hasVariant
// ---------------------------------------------------------------------------

type Json = any; // JSON-LD is wild; we defensively probe every field.

const PRODUCT_TYPES = ["Product", "ProductGroup", "IndividualProduct", "ProductModel"];

function isProductNode(node: Json): boolean {
  const t = node?.["@type"];
  const types: unknown[] = Array.isArray(t) ? t : [t];
  return types.some((x) => typeof x === "string" && PRODUCT_TYPES.includes(x));
}

/** Flatten top-level arrays and @graph wrappers into a list of nodes. */
function collectNodes(data: Json, out: Json[] = [], depth = 0): Json[] {
  if (!data || typeof data !== "object" || depth > 4) return out;
  if (Array.isArray(data)) {
    for (const d of data) collectNodes(d, out, depth + 1);
    return out;
  }
  out.push(data);
  if (Array.isArray(data["@graph"])) collectNodes(data["@graph"], out, depth + 1);
  return out;
}

/** Offers can be one Offer, an array, or an AggregateOffer wrapping more. */
function flattenOffers(offers: Json, out: Json[] = []): Json[] {
  if (!offers) return out;
  if (Array.isArray(offers)) {
    for (const o of offers) flattenOffers(o, out);
    return out;
  }
  if (typeof offers !== "object") return out;
  out.push(offers);
  if (offers.offers) flattenOffers(offers.offers, out);
  return out;
}

function offerPrice(o: Json): number | null {
  const spec = Array.isArray(o?.priceSpecification)
    ? o.priceSpecification[0]
    : o?.priceSpecification;
  return parsePrice(o?.price ?? o?.lowPrice ?? spec?.price);
}

function offerCurrency(o: Json): string | undefined {
  const spec = Array.isArray(o?.priceSpecification)
    ? o.priceSpecification[0]
    : o?.priceSpecification;
  const c = o?.priceCurrency ?? spec?.priceCurrency;
  return typeof c === "string" ? c.toUpperCase() : undefined;
}

function inStock(o: Json): boolean {
  return /InStock|LimitedAvailability|PreOrder/i.test(String(o?.availability ?? ""));
}

function sameUrl(a: unknown, b: string): boolean {
  if (typeof a !== "string") return false;
  const norm = (u: string) => u.split("#")[0].replace(/\/+$/, "");
  return norm(a) === norm(b);
}

/**
 * For a ProductGroup, pick the variant that best represents "this page":
 * 1) variants whose offer URL equals the page URL (e.g. Zara's ?v1= colour),
 * 2) among those (or all, if none matched) in-stock first, then cheapest.
 */
function pickVariant(variants: Json[], pageUrl: string): Json | undefined {
  const usable = variants.filter((v) => v && typeof v === "object");
  if (usable.length === 0) return undefined;
  const matched = usable.filter((v) =>
    flattenOffers(v.offers).some((o) => sameUrl(o?.url, pageUrl))
  );
  const pool = matched.length > 0 ? matched : usable;
  const score = (v: Json) => {
    const offers = flattenOffers(v.offers);
    const stocked = offers.some(inStock) ? 0 : 1;
    const prices = offers.map(offerPrice).filter((p): p is number => p != null);
    return [stocked, prices.length ? Math.min(...prices) : Infinity] as const;
  };
  return [...pool].sort((a, b) => {
    const [as, ap] = score(a);
    const [bs, bp] = score(b);
    return as - bs || ap - bp;
  })[0];
}

interface Parsed {
  name?: string;
  brand?: string;
  imageUrl?: string;
  price?: number | null;
  currency?: string;
}

function fromJsonLd(html: string, pageUrl: string): Parsed {
  const out: Parsed = {};
  const blocks = html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const block of blocks) {
    let data: unknown;
    try {
      data = JSON.parse(block[1].trim());
    } catch {
      continue;
    }
    for (const node of collectNodes(data)) {
      if (!isProductNode(node)) continue;

      if (node.name && !out.name) out.name = decodeEntities(String(node.name));
      const brand = typeof node.brand === "string" ? node.brand : node.brand?.name;
      if (brand && !out.brand) out.brand = decodeEntities(String(brand));

      // Variant (ProductGroup) or the node itself (plain Product).
      const variants = Array.isArray(node.hasVariant) ? node.hasVariant : [];
      const chosen = pickVariant(variants, pageUrl);

      const image = imageUrlFrom(chosen?.image) ?? imageUrlFrom(node.image);
      if (image && !out.imageUrl) out.imageUrl = image;

      if (out.price == null) {
        const offers = [
          ...flattenOffers(chosen?.offers),
          ...flattenOffers(node.offers),
        ];
        // Prefer an offer for this exact page, then in-stock, then anything.
        const best =
          offers.find((o) => sameUrl(o?.url, pageUrl) && offerPrice(o) != null) ??
          offers.find((o) => inStock(o) && offerPrice(o) != null) ??
          offers.find((o) => offerPrice(o) != null);
        if (best) {
          out.price = offerPrice(best);
          out.currency = offerCurrency(best);
        }
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Whole-document parse (JSON-LD first, then OpenGraph / <title>)
// ---------------------------------------------------------------------------

function cleanTitle(t: string): string {
  // "Coat - Brown | ZARA United Kingdom" → "Coat - Brown". Only split on a
  // spaced pipe/en-dash/em-dash so ordinary hyphens in names survive.
  return decodeEntities(t).replace(/\s+[|–—]\s+[^|–—]*$/, "").trim();
}

export function parseProductHtml(html: string, pageUrl: string): Parsed {
  const ld = fromJsonLd(html, pageUrl);

  const ogTitle = metaContent(html, ["og:title", "twitter:title"]);
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const ogImage = metaContent(html, [
    "og:image:secure_url",
    "og:image",
    "twitter:image",
    "twitter:image:src",
  ]);
  const ogSite = metaContent(html, ["og:site_name"]);
  const priceMeta = metaContent(html, [
    "product:price:amount",
    "og:price:amount",
    "twitter:data1",
  ]);
  const currencyMeta = metaContent(html, [
    "product:price:currency",
    "og:price:currency",
  ]);

  let imageUrl = ld.imageUrl ?? ogImage;
  if (imageUrl) {
    try {
      imageUrl = new URL(imageUrl, pageUrl).toString();
    } catch {
      /* leave as-is */
    }
  }

  const price = ld.price ?? parsePrice(priceMeta);
  return {
    name: ld.name ?? ogTitle ?? (titleTag ? cleanTitle(titleTag) : undefined),
    brand: ld.brand ?? ogSite,
    imageUrl,
    price,
    currency: ld.price != null ? ld.currency : currencyMeta?.toUpperCase(),
  };
}

// ---------------------------------------------------------------------------
// Fallback: guess from the link itself (works even when the shop blocks us)
// ---------------------------------------------------------------------------

export function guessFromUrl(rawUrl: string): { name?: string; brand?: string } {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return {};
  }

  // Brand/shop: the registrable label — zara.com → Zara, asos.co.uk → Asos.
  const labels = u.hostname.replace(/^www\./, "").split(".");
  const twoPartTld =
    labels.length >= 3 && /^(co|com|org|net|ac|gov)$/.test(labels[labels.length - 2]);
  const core = labels[labels.length - (twoPartTld ? 3 : 2)] ?? labels[0];
  const brand = core ? core.charAt(0).toUpperCase() + core.slice(1) : undefined;

  // Name: the path segment that looks most like a product slug (most hyphens),
  // minus file extensions and trailing ids like "-p08491242" / "-123456".
  const segments = u.pathname
    .split("/")
    .map((s) => decodeURIComponent(s))
    .filter(Boolean);
  let best: string | undefined;
  let bestHyphens = 1; // need at least 3 words to count as a slug
  for (const seg of segments) {
    const base = seg
      .replace(/\.(html?|php|aspx?)$/i, "")
      .replace(/[-_](p|prd|pid|id)?\d{5,}$/i, "")
      .replace(/[-_]\d+$/, "");
    const hyphens = (base.match(/[-_]/g) ?? []).length;
    if (hyphens > bestHyphens) {
      best = base;
      bestHyphens = hyphens;
    }
  }
  const name = best
    ? best.replace(/[-_]+/g, " ").trim().replace(/^./, (c) => c.toUpperCase())
    : undefined;

  return { name, brand };
}

// ---------------------------------------------------------------------------
// What callers actually use
// ---------------------------------------------------------------------------

/** Build the response for a page we managed to read (server fetch or capture). */
export function metadataFromHtml(
  html: string,
  pageUrl: string,
  via: "server" | "browser" = "server"
): FetchedMetadata {
  const p = parseProductHtml(html, pageUrl);
  const guess = guessFromUrl(pageUrl);
  const gotPage = Boolean(p.name || p.brand || p.imageUrl || p.price != null);

  // Linger is GBP-only: don't drop a dollar price into a £ field.
  const foreign = p.currency && p.currency !== "GBP" ? p.currency : undefined;
  const price = foreign ? null : p.price ?? null;

  let message = gotPage
    ? via === "browser"
      ? "Read straight from the page you were on — please check each field."
      : "Best-effort guess — please check each field."
    : "Couldn't read this page. Fill the details in by hand.";
  if (foreign && p.price != null) {
    message += ` The shop lists this in ${foreign}, so I left the price blank.`;
  } else if (gotPage && price == null) {
    message += " I couldn't find a price.";
  }

  return {
    ok: gotPage,
    name: p.name ?? guess.name,
    brand: p.brand ?? guess.brand,
    imageUrl: p.imageUrl,
    price,
    message,
  };
}

/** Response for a shop that refused (or timed out): a guess from the link only. */
export function metadataFromBlocked(pageUrl: string, reason: string): FetchedMetadata {
  const guess = guessFromUrl(pageUrl);
  let host = "The shop";
  try {
    host = new URL(pageUrl).hostname.replace(/^www\./, "");
  } catch {
    /* keep default */
  }
  return {
    ok: false,
    blocked: true,
    name: guess.name,
    brand: guess.brand,
    price: null,
    message: `${host} ${reason}${
      guess.name ? " I've guessed the name from the link." : ""
    }`,
  };
}
