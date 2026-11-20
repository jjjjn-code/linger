import type { Metadata } from "next";
import BookmarkletSetup from "@/components/BookmarkletSetup";

export const metadata: Metadata = {
  title: "Send to Linger · Linger",
  description: "A one-tap bookmarklet that adds a product to Linger from any shop.",
};

export default function BookmarkletPage() {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-5 pb-24 pt-10 sm:px-8 sm:pt-14">
      <a
        href="/"
        className="font-mono text-meta text-ink-faint transition-colors hover:text-ink"
      >
        ← Linger
      </a>
      <p className="mt-6 font-mono text-label uppercase text-ink-faint">
        Add from any shop
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
        Send to Linger
      </h1>
      <p className="mt-2 max-w-prose text-sm text-ink-muted">
        Some shops block Linger from reading their pages, so you end up typing
        everything in. This bookmark reads the page from your own browser
        instead — one tap and the form is filled in.
      </p>
      <div className="mt-8">
        <BookmarkletSetup />
      </div>
    </div>
  );
}
