import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/server/config/env";
import { createAdminClient } from "@/lib/supabase/admin";

export const ADMIN_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Host-biolio_admin"
    : "biolio_admin_session";

export const ADMIN_ABSOLUTE_TTL_MS = 8 * 60 * 60 * 1000;
export const ADMIN_IDLE_TTL_MS = 30 * 60 * 1000;
export const ADMIN_STEP_UP_TTL_MS = 15 * 60 * 1000;

export interface AdminSession {
  sessionId: string;
  email: string;
  emailHash: string;
  role: "super_admin";
  issuedAt: number;
  expiresAt: number;
  stepUpAt: number;
  epoch: number;
}

interface AdminSessionRow {
  id: string;
  email_hash: string;
  expires_at: string;
  last_seen_at: string;
  step_up_at: string;
  epoch: number;
  revoked_at: string | null;
}

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

export function constantTimeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) {
    crypto.timingSafeEqual(left, left);
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

function verifyScryptHash(password: string, formattedHash: string): boolean {
  const parts = formattedHash.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4], "hex");
  const expected = Buffer.from(parts[5], "hex");
  if (
    !Number.isSafeInteger(N) || N < 8192 || N > 262144 || (N & (N - 1)) !== 0 ||
    !Number.isSafeInteger(r) || r < 1 || r > 16 ||
    !Number.isSafeInteger(p) || p < 1 || p > 4 ||
    salt.length < 16 || expected.length !== 64
  ) return false;

  const derived = crypto.scryptSync(password, salt, expected.length, { N, r, p });
  return crypto.timingSafeEqual(derived, expected);
}

export function createScryptPasswordHash(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
  });
  return `scrypt$16384$8$1$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export function verifyAdminCredentials(
  inputEmail: string,
  inputPassword: string
): { ok: boolean; configured: boolean } {
  const env = getServerEnv();
  const email = env.ADMIN_EMAIL;
  const passwordHash = env.ADMIN_PASSWORD_HASH;
  const configured = Boolean(email && passwordHash.startsWith("scrypt$"));

  // Keep the expensive password path for unknown emails too, reducing timing
  // differences that could reveal the configured operator address.
  let passwordMatch = false;
  try {
    passwordMatch = configured
      ? verifyScryptHash(inputPassword || "", passwordHash)
      : verifyScryptHash(
          inputPassword || "",
          "scrypt$16384$8$1$62696f6c696f2d64756d6d792d73616c74$" + "00".repeat(64)
        );
  } catch {
    passwordMatch = false;
  }

  const emailMatch = constantTimeCompare(
    (inputEmail || "").trim().toLowerCase(),
    email || "operator-not-configured"
  );
  return { ok: configured && emailMatch && passwordMatch, configured };
}

function digestSessionToken(token: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(token, "utf8").digest("hex");
}

function requireSessionSecret(): string {
  const secret = getServerEnv().ADMIN_SESSION_SECRET;
  if (secret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must contain at least 32 characters.");
  }
  return secret;
}

/** Persisted opaque sessions fail closed when the session table is unavailable. */
export async function issueAdminSession(params: {
  ipAddress: string;
  userAgent: string;
}): Promise<{ token: string; session: AdminSession }> {
  const env = getServerEnv();
  const secret = requireSessionSecret();
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD_HASH.startsWith("scrypt$")) {
    throw new Error("Admin credentials are not configured securely.");
  }

  const now = Date.now();
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = digestSessionToken(token, secret);
  const emailHash = sha256Hex(env.ADMIN_EMAIL);
  const expiresAt = now + ADMIN_ABSOLUTE_TTL_MS;
  const adminDb = createAdminClient();
  const result = await (adminDb.from("admin_sessions" as never) as unknown as {
    insert: (row: Record<string, unknown>) => {
      select: (columns: string) => {
        single: () => Promise<{ data: { id: string } | null; error: unknown }>;
      };
    };
  })
    .insert({
      token_hash: tokenHash,
      email_hash: emailHash,
      expires_at: new Date(expiresAt).toISOString(),
      step_up_at: new Date(now).toISOString(),
      last_seen_at: new Date(now).toISOString(),
      ip_hash: sha256Hex(params.ipAddress || "unknown"),
      user_agent_hash: sha256Hex(params.userAgent || "unknown"),
      epoch: env.ADMIN_SESSION_EPOCH,
    })
    .select("id")
    .single();

  if (result.error || !result.data?.id) {
    throw new Error("Could not persist the admin session.");
  }

  return {
    token,
    session: {
      sessionId: result.data.id,
      email: env.ADMIN_EMAIL,
      emailHash,
      role: "super_admin",
      issuedAt: now,
      expiresAt,
      stepUpAt: now,
      epoch: env.ADMIN_SESSION_EPOCH,
    },
  };
}

/** The cookie is an opaque bearer token; every request must resolve a live DB row. */
export async function getVerifiedAdminSession(): Promise<AdminSession | null> {
  const env = getServerEnv();
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD_HASH.startsWith("scrypt$")) return null;

  let secret: string;
  try {
    secret = requireSessionSecret();
  } catch {
    return null;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value ||
    (process.env.NODE_ENV !== "production" ? cookieStore.get("biolio_admin_session")?.value : "") || "";
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) return null;

  try {
    const adminDb = createAdminClient();
    const query = (adminDb.from("admin_sessions" as never) as unknown as {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<{ data: AdminSessionRow | null; error: unknown }>;
        };
      };
    }).select("id, email_hash, expires_at, last_seen_at, step_up_at, epoch, revoked_at");
    const { data: row, error } = await query
      .eq("token_hash", digestSessionToken(token, secret))
      .maybeSingle();

    if (error || !row) return null;
    const now = Date.now();
    const expiresAt = new Date(row.expires_at).getTime();
    const lastSeenAt = new Date(row.last_seen_at).getTime();
    if (
      row.revoked_at ||
      row.epoch !== env.ADMIN_SESSION_EPOCH ||
      !constantTimeCompare(row.email_hash, sha256Hex(env.ADMIN_EMAIL)) ||
      !Number.isFinite(expiresAt) || expiresAt <= now ||
      !Number.isFinite(lastSeenAt) || now - lastSeenAt > ADMIN_IDLE_TTL_MS
    ) return null;

    if (now - lastSeenAt > 60_000) {
      const update = (adminDb.from("admin_sessions" as never) as unknown as {
        update: (values: Record<string, unknown>) => {
          eq: (column: string, value: string) => Promise<{ error: unknown }>;
        };
      }).update({ last_seen_at: new Date(now).toISOString() });
      const { error: updateError } = await update.eq("id", row.id);
      if (updateError) return null;
    }

    return {
      sessionId: row.id,
      email: env.ADMIN_EMAIL,
      emailHash: row.email_hash,
      role: "super_admin",
      issuedAt: lastSeenAt,
      expiresAt,
      stepUpAt: new Date(row.step_up_at).getTime(),
      epoch: row.epoch,
    };
  } catch {
    return null;
  }
}
