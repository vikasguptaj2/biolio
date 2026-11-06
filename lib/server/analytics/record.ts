import "server-only";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/server/config/env";

export type AnalyticsEventType =
  | "bio.page_view"
  | "bio.link_click"
  | "bio.blog_view"
  | "bio.contact_submit"
  | "bio.publish"
  | "automation.api_accepted"
  | "automation.dm_link_click";

export interface AnalyticsRecordOptions {
  workspaceId: string;
  bioProfileId?: string | null;
  eventType: AnalyticsEventType;
  linkId?: string | null;
  blogPostId?: string | null;
  automationRuleId?: string | null;
  headers?: Headers | null;
  referrer?: string | null;
}

const BOT_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /crawling/i,
  /headless/i,
  /wget/i,
  /curl/i,
  /postman/i,
  /lighthouse/i,
  /semrush/i,
  /ahref/i,
];

function isBotOrPrefetch(headers?: Headers | null): boolean {
  if (!headers) return false;

  // Check prefetch headers
  const purpose = headers.get("purpose") || headers.get("sec-purpose") || "";
  if (purpose.toLowerCase().includes("prefetch")) {
    return true;
  }

  // Check user-agent
  const ua = headers.get("user-agent") || "";
  if (!ua || BOT_PATTERNS.some((pattern) => pattern.test(ua))) {
    return true;
  }

  return false;
}

function resolveDeviceClass(ua: string): "mobile" | "desktop" | "tablet" {
  const lower = ua.toLowerCase();
  if (lower.includes("tablet") || lower.includes("ipad")) {
    return "tablet";
  }
  if (
    lower.includes("mobile") ||
    lower.includes("iphone") ||
    lower.includes("android")
  ) {
    return "mobile";
  }
  return "desktop";
}

function extractReferrerHost(referrerUrl?: string | null): string {
  if (!referrerUrl) return "direct";
  try {
    const parsed = new URL(referrerUrl);
    return parsed.hostname.toLowerCase() || "direct";
  } catch {
    return "direct";
  }
}

/**
 * PRIVACY-PRESERVING ANALYTICS CAPTURE (015_ANALYTICS_CAPTURE, DATABASE.md §7)
 * Closes Finding: F-10
 *
 * Rules:
 * 1. IP addresses and exact user-agents are never stored in plain text.
 * 2. Visitor identity is anonymized with `HMAC-SHA256(VISITOR_HASH_SALT || yyyy-mm-dd, ip || ua)`.
 * 3. Drops search engine crawlers, scraper bots, and browser prefetch requests.
 * 4. Fails safely and non-blockingly so creator pages never crash on analytics failure.
 */
export async function recordAnalyticsEvent(options: AnalyticsRecordOptions): Promise<void> {
  try {
    const { headers } = options;
    if (isBotOrPrefetch(headers)) {
      return;
    }

    const env = getServerEnv();
    const ua = headers?.get("user-agent") || "unknown";
    const xff = headers?.get("x-forwarded-for") || "127.0.0.1";
    const clientIp = xff.split(",")[0]?.trim() || "127.0.0.1";

    const todayDate = new Date().toISOString().slice(0, 10);
    const salt = `${env.VISITOR_HASH_SALT || "biolio_visitor_salt"}:${todayDate}`;

    const visitorDailyHmac = crypto
      .createHmac("sha256", salt)
      .update(`${clientIp}:${ua}`)
      .digest("hex");

    const rawRef = options.referrer || headers?.get("referer");
    const referrerHost = extractReferrerHost(rawRef);
    const deviceClass = resolveDeviceClass(ua);

    const adminDb = createAdminClient();

    await (
      adminDb.from("analytics_events" as never) as unknown as {
        insert: (row: Record<string, unknown>) => Promise<unknown>;
      }
    ).insert({
      workspace_id: options.workspaceId,
      bio_profile_id: options.bioProfileId || null,
      event_type: options.eventType,
      link_id: options.linkId || null,
      blog_post_id: options.blogPostId || null,
      automation_rule_id: options.automationRuleId || null,
      visitor_daily_hmac: visitorDailyHmac,
      referrer_host: referrerHost,
      device_class: deviceClass,
    });
  } catch {
    // Non-blocking catch for analytics capture
  }
}

