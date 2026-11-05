import "server-only";

/**
 * BIOLIO v6.0 — SERVER-ONLY ENVIRONMENT CONFIGURATION (`lib/server/config/env.ts`)
 *
 * Rules (Audit B-02, 02_ARCHITECTURE §10):
 * - Never hard-code fallback passwords, webhook secrets, or HMAC keys in source code.
 * - Separates public browser-safe configuration from server-only secrets.
 */

export interface PublicEnvConfig {
  NEXT_PUBLIC_SITE_URL: string;
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
}

export interface ServerEnvConfig extends PublicEnvConfig {
  SUPABASE_SERVICE_ROLE_KEY: string;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD_HASH: string;
  ADMIN_SUPER_PASSWORD: string;
  ADMIN_SESSION_SECRET: string;
  ADMIN_SESSION_EPOCH: number;
  ADMIN_IP_ALLOWLIST: string[];
  COUPON_HASH_PEPPER: string;
  META_APP_SECRET: string;
  INSTAGRAM_WEBHOOK_VERIFY_TOKEN: string;
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  RAZORPAY_WEBHOOK_SECRET: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  CRON_SECRET: string;
  VISITOR_HASH_SALT: string;
}

export function getPublicEnv(): PublicEnvConfig {
  return {
    NEXT_PUBLIC_SITE_URL: (
      process.env.NEXT_PUBLIC_SITE_URL || "https://biolio.site"
    ).replace(/\/+$/, ""),
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  };
}

export function getServerEnv(): ServerEnvConfig {
  const pub = getPublicEnv();
  const rawAllowlist = process.env.ADMIN_IP_ALLOWLIST || "";

  return {
    ...pub,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    ADMIN_EMAIL: (
      process.env.ADMIN_EMAIL ||
      process.env.ADMIN_SUPER_EMAIL ||
      ""
    )
      .trim()
      .toLowerCase(),
    ADMIN_PASSWORD_HASH: (process.env.ADMIN_PASSWORD_HASH || "").trim(),
    ADMIN_SUPER_PASSWORD: process.env.ADMIN_SUPER_PASSWORD || "",
    ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET || "",
    ADMIN_SESSION_EPOCH: Number(process.env.ADMIN_SESSION_EPOCH || "1") || 1,
    ADMIN_IP_ALLOWLIST: rawAllowlist
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    COUPON_HASH_PEPPER: process.env.COUPON_HASH_PEPPER || "",
    META_APP_SECRET:
      process.env.META_APP_SECRET || process.env.INSTAGRAM_APP_SECRET || "",
    INSTAGRAM_WEBHOOK_VERIFY_TOKEN:
      process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN ||
      process.env.META_WEBHOOK_VERIFY_TOKEN ||
      "",
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || "",
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || "",
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || "",
    CLOUDINARY_CLOUD_NAME:
      process.env.CLOUDINARY_CLOUD_NAME ||
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
      "",
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "",
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "",
    CRON_SECRET: process.env.CRON_SECRET || "",
    VISITOR_HASH_SALT: process.env.VISITOR_HASH_SALT || "",
  };
}

