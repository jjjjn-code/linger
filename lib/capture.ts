// Reads what the Linger bookmarklet (lib/bookmarklet.ts) put in the URL
// fragment and turns it into a pre-filled "Add an item" form.

import type { FetchedMetadata } from "./types";
import { CAPTURE_HASH_PREFIX } from "./bookmarklet";
import { metadataFromHtml } from "./productParse";

/** Values to pre-fill the add form with. */
export interface Prefill extends FetchedMetadata {
  url: string;
}

const MAX_HTML = 400_000;

/**
 * Returns null unless `hash` is a well-formed capture. The fragment can be
 * crafted by anyone who links to Linger, so this only ever produces form
 * pre-fill (never saves anything) and accepts http(s) URLs only.
 */
export function readCaptureFromHash(hash: string): Prefill | null {
  if (!hash.startsWith(CAPTURE_HASH_PREFIX)) return null;
  try {
    const payload = JSON.parse(
      decodeURIComponent(hash.slice(CAPTURE_HASH_PREFIX.length))
    ) as { u?: unknown; h?: unknown };
    if (typeof payload.u !== "string" || typeof payload.h !== "string") return null;
    if (!/^https?:\/\//i.test(payload.u) || payload.h.length > MAX_HTML) return null;

    const meta = metadataFromHtml(payload.h, payload.u, "browser");
    return {
      ...meta,
      imageUrl:
        meta.imageUrl && /^https?:\/\//i.test(meta.imageUrl)
          ? meta.imageUrl
          : undefined,
      url: payload.u,
    };
  } catch {
    return null;
  }
}
