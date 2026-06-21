import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE, authRequired, tokenValid } from "@/lib/server/auth";
import { loadState, saveState } from "@/lib/server/db";
import type { PersistedState } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authed(): boolean {
  if (!authRequired()) return true;
  return tokenValid(cookies().get(AUTH_COOKIE)?.value);
}

export async function GET() {
  if (!authed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const state = await loadState();
  return NextResponse.json({ state });
}

export async function PUT(req: Request) {
  if (!authed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { state?: PersistedState } | null;
  if (!body?.state || !Array.isArray(body.state.items)) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }
  await saveState(body.state);
  return NextResponse.json({ ok: true });
}
