import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  AUTH_COOKIE,
  authRequired,
  makeToken,
  passphraseOk,
  tokenValid,
} from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const required = authRequired();
  const token = cookies().get(AUTH_COOKIE)?.value;
  return NextResponse.json({ required, authed: !required || tokenValid(token) });
}

export async function POST(req: Request) {
  if (!authRequired()) return NextResponse.json({ authed: true });
  const body = await req.json().catch(() => ({}));
  if (!passphraseOk(String(body?.passphrase ?? ""))) {
    return NextResponse.json(
      { error: "That passphrase doesn't match." },
      { status: 401 }
    );
  }
  const res = NextResponse.json({ authed: true });
  res.cookies.set(AUTH_COOKIE, makeToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ authed: false });
  res.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
