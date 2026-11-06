import crypto from "crypto";
import { getServerEnv } from "@/lib/server/config/env";

/**
 * UNIFIED COUPON CODE HASH CONTRACT
 * Closes Finding F-05 (Coupon Hash Mismatch & Enumeration Resistance)
 *
 * Matrix:
 * 1. Normalize: trim, uppercase, strip spaces and hyphens.
 * 2. Hash: HMAC-SHA256(COUPON_HASH_PEPPER, normalized_code) in hex.
 * 3. Uniformly used across Admin Creation, Checkout, and Preview.
 */

export function normalizeCouponCode(rawCode: string): string {
  if (!rawCode || typeof rawCode !== "string") return "";
  return rawCode
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "");
}

export function hashCouponCode(rawCode: string): string {
  const norm = normalizeCouponCode(rawCode);
  if (!norm) return "";
  const env = getServerEnv();
  const pepper = env.COUPON_HASH_PEPPER || "biolio_coupon_pepper_2026";
  return crypto.createHmac("sha256", pepper).update(norm).digest("hex");
}

export function maskCouponCode(rawCode: string): string {
  const norm = normalizeCouponCode(rawCode);
  if (norm.length <= 4) return "****";
  return `${norm.slice(0, 3)}***${norm.slice(-2)}`;
}

/**
 * Generates a collision-resistant Crockford-style campaign code.
 * e.g. "CF26-X9A2-K7QM"
 */
export function generateCouponCode(prefix = "BIO"): string {
  const alphabet = "23456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford base32 (no 0, 1, I, L, O)
  const bytes = crypto.randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  const cleanPrefix = prefix.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  return cleanPrefix
    ? `${cleanPrefix}-${code.slice(0, 4)}-${code.slice(4)}`
    : `${code.slice(0, 4)}-${code.slice(4)}`;
}

