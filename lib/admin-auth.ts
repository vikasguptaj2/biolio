import crypto from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE_NAME = "biolio_admin_session";

export const ADMIN_SUPER_EMAIL =
  process.env.ADMIN_SUPER_EMAIL || "admin@biolio.site";
export const ADMIN_SUPER_PASSWORD =
  process.env.ADMIN_SUPER_PASSWORD || "BiolioAdmin@2026!";
export const ADMIN_SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  "biolio-enterprise-super-admin-hmac-secret-2026";

export interface AdminSession {
  email: string;
  role: "super_admin";
  issuedAt: number;
  expiresAt: number;
}

/**
 * Constant-time comparison between two strings to prevent timing attacks.
 */
export function constantTimeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Constant-time dummy compare
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verifies email and password against Super Admin environment credentials.
 */
export function verifyAdminCredentials(email: string, pass: string): boolean {
  const cleanEmail = (email || "").trim().toLowerCase();
  const cleanPass = pass || "";
  const targetEmail = ADMIN_SUPER_EMAIL.trim().toLowerCase();
  const targetPass = ADMIN_SUPER_PASSWORD;

  const emailMatch = constantTimeCompare(cleanEmail, targetEmail);
  const passMatch = constantTimeCompare(cleanPass, targetPass);

  return emailMatch && passMatch;
}

/**
 * Signs an admin session payload and creates an HMAC-SHA256 token.
 */
export function createAdminSessionToken(email: string = ADMIN_SUPER_EMAIL): string {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + 24 * 60 * 60 * 1000; // 24 hours

  const payload: AdminSession = {
    email: email.trim().toLowerCase(),
    role: "super_admin",
    issuedAt,
    expiresAt,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", ADMIN_SESSION_SECRET)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

/**
 * Validates an HMAC-SHA256 admin session token and checks its expiration.
 */
export function verifyAdminSessionToken(token: string): AdminSession | null {
  if (!token || !token.includes(".")) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encodedPayload, signature] = parts;
  const expectedSignature = crypto
    .createHmac("sha256", ADMIN_SESSION_SECRET)
    .update(encodedPayload)
    .digest("base64url");

  if (!constantTimeCompare(signature, expectedSignature)) {
    return null;
  }

  try {
    const payloadJson = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const session = JSON.parse(payloadJson) as AdminSession;

    if (!session || session.role !== "super_admin") {
      return null;
    }

    if (Date.now() > session.expiresAt) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Server Component / Route Handler helper to get current validated Super Admin session.
 */
export async function getVerifiedAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookieValue) return null;
  return verifyAdminSessionToken(cookieValue);
}
