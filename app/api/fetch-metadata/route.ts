import { NextResponse } from "next/server";
import type { FetchedMetadata } from "@/lib/types";
import { metadataFromBlocked, metadataFromHtml } from "@/lib/productParse";

// Best-effort product metadata extraction. Runs on the server so we sidestep
// browser CORS. Plenty of shops (Zara, for one) answer server requests with a
// 403 — that is expected. We don't try to disguise ourselves; instead we fall
// back to a name/brand guessed from the link, and the add form points to the
// bookmarklet (lib/bookmarklet.ts), which reads the page from the user's own
// browser where there is no block. Parsing lives in lib/productParse.ts so the
// server and the bookmarklet share one implementation.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-GB,en;q=0.9",
      },
    });

    if (res.status === 404 || res.status === 410) {
      return NextResponse.json<FetchedMetadata>({
        ok: false,
        message: "That page doesn't seem to exist — check the link.",
      });
    }
    if (!res.ok) {
      return NextResponse.json<FetchedMetadata>(
        metadataFromBlocked(
          url,
          `wouldn't let Linger read the page (it answered ${res.status}).`
        )
      );
    }

    const html = (await res.text()).slice(0, 1_500_000); // cap to ~1.5MB
    const meta = metadataFromHtml(html, url, "server");
    // A 200 with nothing usable is effectively a block (JS-rendered shell etc.).
    return NextResponse.json<FetchedMetadata>(
      meta.ok ? meta : { ...meta, blocked: true }
    );
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return NextResponse.json<FetchedMetadata>(
      metadataFromBlocked(
        url,
        aborted
          ? "took too long to respond."
          : "couldn't be reached from Linger's server."
      )
    );
  } finally {
    clearTimeout(timeout);
  }
}
