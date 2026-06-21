import { neon } from "@neondatabase/serverless";
import { promises as fs } from "fs";
import path from "path";
import type { PersistedState } from "@/lib/types";

// ---------------------------------------------------------------------------
// Server-side persistence. In production a Neon Postgres database holds the
// whole app state as one JSON document per "space" (single user → one space).
// With no DATABASE_URL (local dev) it falls back to a JSON file under .data/,
// so the API works locally without provisioning anything.
//
// IMPORTANT: neon() must be called lazily (inside functions, never at module
// top level) or `next build` crashes when DATABASE_URL isn't set yet.
// ---------------------------------------------------------------------------

const SPACE = "default";

export function hasDatabase(): boolean {
  return !!process.env.DATABASE_URL;
}

let schemaReady = false;
async function sqlClient() {
  const sql = neon(process.env.DATABASE_URL!);
  if (!schemaReady) {
    await sql`
      CREATE TABLE IF NOT EXISTS linger_state (
        space text PRIMARY KEY,
        data jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    schemaReady = true;
  }
  return sql;
}

// File fallback for local development (no database configured).
const FILE = path.join(process.cwd(), ".data", "state.json");
async function fileLoad(): Promise<PersistedState | null> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as PersistedState;
  } catch {
    return null;
  }
}
async function fileSave(state: PersistedState): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(state), "utf8");
}

export async function loadState(): Promise<PersistedState | null> {
  if (!hasDatabase()) return fileLoad();
  const sql = await sqlClient();
  const rows = (await sql`SELECT data FROM linger_state WHERE space = ${SPACE}`) as {
    data: PersistedState;
  }[];
  return rows[0]?.data ?? null;
}

export async function saveState(state: PersistedState): Promise<void> {
  if (!hasDatabase()) return fileSave(state);
  const sql = await sqlClient();
  await sql`
    INSERT INTO linger_state (space, data, updated_at)
    VALUES (${SPACE}, ${JSON.stringify(state)}::jsonb, now())
    ON CONFLICT (space)
    DO UPDATE SET data = EXCLUDED.data, updated_at = now()
  `;
}
