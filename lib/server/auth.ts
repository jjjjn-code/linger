import { createHmac, timingSafeEqual } from "crypto";

// ---------------------------------------------------------------------------
// Single-user passphrase auth. If APP_PASSPHRASE is set, the API requires a
// valid signed cookie (issued after the correct passphrase). If it's unset
// (local dev), auth is disabled so the app just works.
// ---------------------------------------------------------------------------

export const AUTH_COOKIE = "linger_auth";

function secret(): string {
  return process.env.AUTH_SECRET || "linger-dev-secret-change-me";
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function authRequired(): boolean {
  return !!process.env.APP_PASSPHRASE;
}

export function passphraseOk(input: string): boolean {
  const pass = process.env.APP_PASSPHRASE || "";
  return pass.length > 0 && safeEqual(input, pass);
}

/** A signed token proving the passphrase was entered. Stored in an httpOnly cookie. */
export function makeToken(): string {
  return createHmac("sha256", secret()).update("authed").digest("hex");
}

export function tokenValid(token: string | undefined): boolean {
  if (!token) return false;
  return safeEqual(token, makeToken());
}
