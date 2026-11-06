import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/server/config/env";

interface PublicBioResult {
  status: string;
  contact_enabled?: boolean;
  workspace_id?: string;
  bio_profile_id?: string;
}

/**
 * HARDENED CONTACT FORM SUBMISSION (`POST /api/bio/contact`)
 * Closes Audit Finding: B-18, F-13 (03_BIO_COLLABORATIONS_CONTACT.md §7, DATABASE.md §8)
 *
 * Rules:
 * 1. Server-side handle verification (client never passes workspace_id or bio_profile_id).
 * 2. Honeypot field (`website_url` / `hp_field`) rejection.
 * 3. Hashed IP rate limiting (5 submissions per 15 min per IP hash).
 * 4. Input sanitization (max 2000 chars, min 5 chars, sender email format check).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const handle = String(body.handle || "").trim().toLowerCase();
    const senderName = String(body.senderName || "").trim().slice(0, 100);
    const senderEmail = String(body.senderEmail || "").trim().toLowerCase().slice(0, 255);
    const message = String(body.message || "").trim().slice(0, 2000);
    const company = body.company ? String(body.company).trim().slice(0, 100) : null;
    const budgetRange = body.budgetRange ? String(body.budgetRange).trim().slice(0, 50) : null;
    const honeypot = body.website_url || body.hp_field || "";

    // 1. Bot honeypot trap
    if (honeypot) {
      // Silently return 200 to trick scrapers
      return NextResponse.json({ ok: true, submitted: true });
    }

    if (!handle || !senderName || !senderEmail || !message) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "handle, senderName, senderEmail, and message are required.",
          },
        },
        { status: 422 }
      );
    }

    if (message.length < 5) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Message must be at least 5 characters.",
          },
        },
        { status: 422 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(senderEmail)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid email format." } },
        { status: 422 }
      );
    }

    const adminDb = createAdminClient();

    // 2. Resolve published, unlocked profile from handle server-side
    const { data: pubBio } = await (
      adminDb.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>
      ) => Promise<{ data: PublicBioResult | null }>
    )("public_get_bio", {
      p_handle: handle,
    });

    if (
      !pubBio ||
      pubBio.status !== "ok" ||
      !pubBio.contact_enabled ||
      !pubBio.workspace_id ||
      !pubBio.bio_profile_id
    ) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "This profile is not accepting inquiries.",
          },
        },
        { status: 404 }
      );
    }

    const env = getServerEnv();
    const xff = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const clientIp = xff.split(",")[0]?.trim() || "127.0.0.1";
    const ipHash = crypto
      .createHmac("sha256", env.VISITOR_HASH_SALT || "biolio_contact_salt")
      .update(clientIp)
      .digest("hex");

    // 3. Enforce rate limiting: max 5 submissions per 15 minutes per IP hash (F-13)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: recentCount } = await (
      adminDb.from("bio_contact_submissions" as never) as unknown as {
        select: (cols: string, opt: { count: string; head: boolean }) => {
          eq: (col: string, val: string) => {
            gt: (col2: string, val2: string) => Promise<{ count: number | null }>;
          };
        };
      }
    )
      .select("*", { count: "exact", head: true })
      .eq("rate_limit_key_hmac", ipHash)
      .gt("created_at", fifteenMinutesAgo);

    if ((recentCount ?? 0) >= 5) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Too many contact submissions. Please wait 15 minutes before sending another inquiry.",
          },
        },
        { status: 429, headers: { "Retry-After": "900" } }
      );
    }

    await (
      adminDb.from("bio_contact_submissions" as never) as unknown as {
        insert: (row: Record<string, unknown>) => Promise<unknown>;
      }
    ).insert({
      workspace_id: pubBio.workspace_id,
      bio_profile_id: pubBio.bio_profile_id,
      sender_name: senderName,
      sender_email: senderEmail,
      sender_company: company,
      budget_range: budgetRange,
      message,
      rate_limit_key_hmac: ipHash,
      status: "new",
    });

    return NextResponse.json({ ok: true, submitted: true });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Inquiry submission failed." } },
      { status: 500 }
    );
  }
}
