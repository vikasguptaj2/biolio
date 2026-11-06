import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAnalyticsEvent } from "@/lib/server/analytics/record";

interface LinkRow {
  id: string;
  workspace_id: string;
  bio_profile_id: string;
  url: string;
  is_visible: boolean;
}

interface EntitlementRow {
  bio_state: string;
}

/**
 * SAFE OUTBOUND TRACKED REDIRECT ROUTE (`GET /r/[token]`)
 * Closes Audit Findings: B-07, B-22, F-10 (02_ARCHITECTURE.md §4, DATABASE.md §7)
 *
 * Rules:
 * 1. Checks `opaque_token` existence and `is_visible: true`.
 * 2. Validates destination protocol strictly against allowlist (prevents open redirects and javascript: / data: URI attacks).
 * 3. Enforces Layer 4 Module Lock (`bio_state !== 'locked'`).
 * 4. Records tracked click event in `public.analytics_events` before issuing 302 redirect.
 */
function isSafeDestinationUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return ["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const cleanToken = (token || "").trim();

  if (!cleanToken || cleanToken.length < 4 || cleanToken.length > 64) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const adminDb = createAdminClient();
    const { data: link } = await (
      adminDb.from("bio_links" as never) as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string | boolean) => {
            eq: (col2: string, val2: string | boolean) => {
              maybeSingle: () => Promise<{ data: LinkRow | null }>;
            };
          };
        };
      }
    )
      .select("id, workspace_id, bio_profile_id, url, is_visible")
      .eq("opaque_token", cleanToken)
      .eq("is_visible", true)
      .maybeSingle();

    if (!link || !isSafeDestinationUrl(link.url)) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Verify workspace Bio state is not locked
    const { data: ent } = await (
      adminDb.from("workspace_entitlements" as never) as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            maybeSingle: () => Promise<{ data: EntitlementRow | null }>;
          };
        };
      }
    )
      .select("bio_state")
      .eq("workspace_id", link.workspace_id)
      .maybeSingle();

    if (ent?.bio_state === "locked") {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Record tracked click in analytics_events (F-10)
    await recordAnalyticsEvent({
      workspaceId: link.workspace_id,
      bioProfileId: link.bio_profile_id,
      eventType: "bio.link_click",
      linkId: link.id,
      headers: request.headers,
    });

    const res = NextResponse.redirect(link.url, { status: 302 });
    res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
