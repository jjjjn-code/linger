"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { LingerMark } from "./icons";

export default function LoginScreen() {
  const { login } = useStore();
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!passphrase.trim() || busy) return;
    setBusy(true);
    setError(null);
    const ok = await login(passphrase);
    if (!ok) {
      setError("That passphrase doesn't match. Try again.");
      setPassphrase("");
      setBusy(false);
    }
    // On success the store flips to "ready" and this screen unmounts.
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-shell items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <p className="font-mono text-[0.8125rem] text-ink-faint">
          Some wants last, Most don&rsquo;t
        </p>
        <div className="mt-2 flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-ink text-surface">
            <LingerMark className="h-[18px] w-auto" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Linger
          </h1>
        </div>
        <p className="mt-1.5 text-sm text-ink-muted">
          Enter your passphrase to open your list.
        </p>

        <form onSubmit={submit} className="mt-7">
          <label
            htmlFor="passphrase"
            className="font-mono text-label uppercase text-ink-faint"
          >
            Passphrase
          </label>
          <input
            id="passphrase"
            type="password"
            autoFocus
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            className="mt-2 w-full rounded-control border border-line-strong bg-surface px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none"
            placeholder="••••••••••"
            autoComplete="current-password"
          />
          {error ? (
            <p className="mt-2 text-meta text-danger">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={busy || !passphrase.trim()}
            className="mt-4 w-full rounded-control bg-ink px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Opening…" : "Open my list"}
          </button>
        </form>

        <p className="mt-6 font-mono text-meta text-ink-faint">
          Wants worth keeping
        </p>
      </div>
    </div>
  );
}
