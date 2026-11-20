"use client";

import { useEffect, useRef, useState } from "react";
import { buildBookmarklet } from "@/lib/bookmarklet";

// The bookmarklet is built from *this* page's origin, so install it from the
// address you actually use Linger at (your deployed URL, not localhost).
export default function BookmarkletSetup() {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [isLocal, setIsLocal] = useState(false);

  useEffect(() => {
    const built = buildBookmarklet(window.location.origin);
    setCode(built);
    setIsLocal(/^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname));
    // Set via the DOM: React refuses to render `javascript:` hrefs.
    linkRef.current?.setAttribute("href", built);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the code is selectable below */
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-card border border-line bg-surface p-6">
        <p className="font-mono text-label uppercase text-ink-faint">Step 1</p>
        <h2 className="mt-1 text-base font-semibold text-ink">
          Save the bookmarklet
        </h2>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {/* href is assigned in the effect above */}
          <a
            ref={linkRef}
            onClick={(e) => e.preventDefault()}
            draggable
            className="inline-flex cursor-grab items-center rounded-control bg-ink px-4 py-2.5 text-sm font-semibold text-white active:cursor-grabbing"
          >
            Send to Linger
          </a>
          <button
            type="button"
            onClick={() => void copy()}
            disabled={!code}
            className="rounded-control border border-line-strong px-3 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-sunken disabled:opacity-60"
          >
            {copied ? "Copied" : "Copy bookmarklet code"}
          </button>
        </div>

        <ul className="mt-5 space-y-2 text-sm text-ink-muted">
          <li>
            <span className="font-medium text-ink-soft">Desktop:</span> drag the
            black button onto your bookmarks bar. (Can&rsquo;t see the bar?
            Chrome: ⇧⌘B · Safari: View → Show Favorites Bar.)
          </li>
          <li>
            <span className="font-medium text-ink-soft">iPhone / iPad Safari:</span>{" "}
            bookmark any page, then edit that bookmark: rename it &ldquo;Send to
            Linger&rdquo; and paste the copied code over its address.
          </li>
          <li>
            <span className="font-medium text-ink-soft">Android Chrome:</span>{" "}
            bookmark any page, edit the bookmark, paste the code as its URL. To
            use it, type &ldquo;Send to Linger&rdquo; in the address bar and tap
            the bookmark suggestion.
          </li>
        </ul>

        {isLocal ? (
          <p className="mt-4 rounded-control bg-flag-soft px-3 py-2 text-meta text-ink-soft">
            You&rsquo;re on localhost, so this bookmarklet will only work on this
            computer while the dev server is running. Open this page from your
            deployed Linger address to make one that works everywhere.
          </p>
        ) : null}
      </section>

      <section className="rounded-card border border-line bg-surface p-6">
        <p className="font-mono text-label uppercase text-ink-faint">Step 2</p>
        <h2 className="mt-1 text-base font-semibold text-ink">
          Use it on a product page
        </h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-ink-muted">
          <li>Open the product in your normal browser, as you would to shop.</li>
          <li>Tap the &ldquo;Send to Linger&rdquo; bookmark.</li>
          <li>
            Linger opens with the name, brand, price and image filled in. Add
            your desire score and a note, then save.
          </li>
        </ol>
        <p className="mt-4 text-meta text-ink-faint">
          How it works: shops like Zara refuse automated requests from servers,
          but your own browser has already loaded the page. The bookmarklet copies
          only the page&rsquo;s title, meta tags and product data (a few KB) and
          hands them to Linger in the link&rsquo;s <code>#</code> fragment, which
          is never sent to any server. Linger reads them in your browser. If a
          pop-up is blocked, allow pop-ups for the shop once.
        </p>
      </section>
    </div>
  );
}
