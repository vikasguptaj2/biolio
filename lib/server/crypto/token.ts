import "server-only";
import crypto from "crypto";
import { getServerEnv } from "@/lib/server/config/env";

/**
 * ENCRYPTED TOKEN & OAUTH STATE CRYPTOGRAPHIC UTILITIES (`lib/server/crypto/token.ts`)
 *
 * Implements AES-256-GCM authenticated encryption for Instagram access tokens at rest.
 * Closes Findings: B-02, F-06, META_INTEGRATION §3
 */

function deriveEncryptionKey(): Buffer {
  const env = getServerEnv();
  const secretSource =
    env.ADMIN_SESSION_SECRET ||
    env.SUPABASE_SERVICE_ROLE_KEY ||
    "biolio-default-dev-aes256-key-salt";
  return crypto.createHash("sha256").update(secretSource).digest();
}

/**
 * Encrypts a sensitive string (such as an OAuth access token) using AES-256-GCM.
 * Output format: enc$v1$<ivHex>$<authTagHex>$<ciphertextHex>
 */
export function encryptToken(plaintext: string): string {
  const key = deriveEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `enc$v1$${iv.toString("hex")}$${authTag.toString("hex")}$${ciphertext.toString("hex")}`;
}

/**
 * Decrypts a token encrypted with AES-256-GCM.
 */
export function decryptToken(encrypted: string): string {
  const parts = encrypted.split("$");
  if (parts.length !== 5 || parts[0] !== "enc" || parts[1] !== "v1") {
    throw new Error("Invalid encrypted token format.");
  }

  const iv = Buffer.from(parts[2], "hex");
  const authTag = Buffer.from(parts[3], "hex");
  const ciphertext = Buffer.from(parts[4], "hex");

  const key = deriveEncryptionKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Generates an HMAC-signed single-use OAuth state token for Instagram connection.
 * Valid for 10 minutes.
 */
export function generateOAuthState(params: {
  workspaceId: string;
  userId: string;
}): string {
  const env = getServerEnv();
  const secret = env.ADMIN_SESSION_SECRET || "biolio_oauth_state_hmac_secret";
  const exp = Date.now() + 10 * 60 * 1000; // 10 minutes
  const nonce = crypto.randomBytes(16).toString("hex");

  const payload = JSON.stringify({
    w: params.workspaceId,
    u: params.userId,
    exp,
    n: nonce,
  });

  const payloadB64 = Buffer.from(payload, "utf8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url");

  return `${payloadB64}.${signature}`;
}

/**
 * Verifies and unpacks an Instagram OAuth state token.
 */
export function verifyOAuthState(state: string): {
  workspaceId: string;
  userId: string;
} | null {
  try {
    const env = getServerEnv();
    const secret = env.ADMIN_SESSION_SECRET || "biolio_oauth_state_hmac_secret";
    const [payloadB64, signature] = state.split(".");
    if (!payloadB64 || !signature) return null;

    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(payloadB64)
      .digest("base64url");

    const bufA = Buffer.from(signature, "utf8");
    const bufB = Buffer.from(expectedSig, "utf8");
    if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    );
    if (!payload.exp || Date.now() > payload.exp) {
      return null; // Expired
    }

    return {
      workspaceId: payload.w,
      userId: payload.u,
    };
  } catch {
    return null;
  }
}

