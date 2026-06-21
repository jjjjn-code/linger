import { NextResponse } from "next/server";
import type { FetchedMetadata } from "@/lib/types";

// Best-effort product metadata extraction. Runs on the server so we sidestep
// browser CORS. This WILL fail or return partial data for many shops (bot
// blocking, dynamic pricing, JS-rendered pages) — that is expected and fine.
// The UI always lets the user fill in or correct everything by hand.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/** Pull a <meta> content value by matching property/name attributes. */
function metaContent(html: string, keys: string[]): string | undefined {
  for (const key of keys) {
    // property/name may appear before or after content; try both orders.
    const patterns = [
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`,
        "i"
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`,
        "i"
      ),
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m && m[1]) return decode(m[1]);
    }
  }
  return undefined;
}

function parsePrice(raw: string | undefined): number | null {
  if (!raw) return null;
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

/** Try to dig structured product data out of JSON-LD blocks. */
function fromJsonLd(html: string): Partial<FetchedMetadata> {
  const out: Partial<FetchedMetadata> = {};
  const blocks = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const block of blocks) {
    let data: unknown;
    try {
      data = JSON.parse(block[1].trim());
    } catch {
      continue;
    }
    const candidates: any[] = Array.isArray(data) ? data : [data];
    // Some sites wrap things in @graph.
    for (const c of candidates.slice()) {
      if (c && Array.isArray(c["@graph"])) candidates.push(...c["@graph"]);
    }
    for (const node of candidates) {
      if (!node || typeof node !== "object") continue;
      const type = node["@type"];
      const isProduct = Array.isArray(type)
        ? type.includes("Product")
        : type === "Product";
      if (!isProduct) continue;
      if (node.name && !out.name) out.name = decode(String(node.name));
      const brand =
        typeof node.brand === "string" ? node.brand : node.brand?.name;
      if (brand && !out.brand) out.brand = decode(String(brand));
      const image = imageUrlFrom(node.image);
      if (image && !out.imageUrl) out.imageUrl = image;
      const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers;
      if (offers?.price && out.price == null)
        out.price = parsePrice(String(offers.price));
    }
  }
  return out;
}

export async function POST(req: Request) {
  let url = "";
  try {
    const body = await req.json();
    url = String(body?.url ?? "").trim();
  } catch {
    /* ignore */
  }

  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json<FetchedMetadata>(
      { ok: false, message: "Enter a valid http(s) link." },
      { status: 200 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Look like a normal browser; many sites still block, which is fine.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-GB,en;q=0.9",
      },
    });

    if (!res.ok) {
      return NextResponse.json<FetchedMetadata>({
        ok: false,
        message: `The shop returned ${res.status}. Fill the details in by hand.`,
      });
    }

    const html = (await res.text()).slice(0, 1_500_000); // cap to ~1.5MB

    const jsonLd = fromJsonLd(html);

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

    let imageUrl = jsonLd.imageUrl ?? ogImage;
    // Resolve protocol-relative or root-relative image URLs.
    if (imageUrl) {
      try {
        imageUrl = new URL(imageUrl, url).toString();
      } catch {
        /* leave as-is */
      }
    }

    const name = jsonLd.name ?? ogTitle ?? (titleTag ? decode(titleTag) : undefined);
    const brand = jsonLd.brand ?? ogSite;
    const price = jsonLd.price ?? parsePrice(priceMeta);

    const anything = Boolean(name || brand || imageUrl || price != null);

    return NextResponse.json<FetchedMetadata>({
      ok: anything,
      name,
      brand,
      imageUrl,
      price: price ?? null,
      message: anything
        ? "Best-effort guess — please check each field."
        : "Couldn't read this page. Fill the details in by hand.",
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return NextResponse.json<FetchedMetadata>({
      ok: false,
      message: aborted
        ? "The shop took too long to respond. Fill the details in by hand."
        : "Couldn't reach this page. Fill the details in by hand.",
    });
  } finally {
    clearTimeout(timeout);
  }
}
