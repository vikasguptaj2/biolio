import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

interface CommentValue {
  id: string;
  text?: string;
  from?: {
    id: string;
    username?: string;
  };
  media?: {
    id: string;
  };
}

interface WebhookChange {
  field: string;
  value: CommentValue;
}

interface WebhookMessaging {
  sender?: { id: string };
  recipient?: { id: string };
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
  };
}

interface WebhookEntry {
  id: string;
  time?: number;
  changes?: WebhookChange[];
  messaging?: WebhookMessaging[];
}

interface WebhookPayload {
  object?: string;
  entry?: WebhookEntry[];
}

interface AutomationRuleRecord {
  id: string;
  workspace_id: string;
  keywords: string[];
  match_mode: "exact" | "contains" | "regex" | string;
  private_message_template?: string;
  public_reply_template?: string;
  send_public_reply?: boolean;
  cta_button_label?: string;
  destination_url?: string;
}

/**
 * Meta / Instagram Webhook Verification (GET)
 * Meta calls this endpoint with hub.mode, hub.verify_token, and hub.challenge
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;

  if (!expectedToken) {
    return NextResponse.json(
      { error: "Configuration Error: INSTAGRAM_WEBHOOK_VERIFY_TOKEN is not configured" },
      { status: 500 }
    );
  }

  if (mode === "subscribe" && token === expectedToken) {
    return new Response(challenge || "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json(
    { error: "Forbidden: Verification token mismatch" },
    { status: 403 }
  );
}

/**
 * Meta / Instagram Webhook Event Ingress (POST)
 * Verifies HMAC-SHA256 signature, extracts comments & direct messages,
 * matches against active automation_rules, and writes execution records.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-hub-signature-256");

    const appSecret =
      process.env.META_APP_SECRET || process.env.INSTAGRAM_APP_SECRET;

    // Verify HMAC-SHA256 signature if appSecret is present
    if (appSecret && signature) {
      const expectedSignature = `sha256=${crypto
        .createHmac("sha256", appSecret)
        .update(rawBody)
        .digest("hex")}`;

      const sigBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expectedSignature);

      if (
        sigBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
      ) {
        return NextResponse.json(
          { error: "Unauthorized: Invalid HMAC signature" },
          { status: 401 }
        );
      }
    }

    const payload = JSON.parse(rawBody) as WebhookPayload;
    const entries = payload.entry || [];
    const supabase = createAdminClient();

    for (const entry of entries) {
      const igUserId = entry.id; // Instagram Business Account ID
      const changes = entry.changes || [];
      const messaging = entry.messaging || [];

      // 1. Process Feed & Reel Comments
      for (const change of changes) {
        if (change.field === "comments") {
          const commentValue = change.value;
          const text = (commentValue.text || "").trim().toLowerCase();
          const fromUser = commentValue.from;
          const commentId = commentValue.id;
          const mediaId = commentValue.media?.id;

          // Find active connection for this IG account
          const { data: connection } = await supabase
            .from("instagram_connections")
            .select("id, workspace_id, status, is_paused")
            .eq("ig_user_id", igUserId)
            .maybeSingle();

          if (!connection || connection.is_paused || connection.status !== "connected") {
            continue;
          }

          // Record incoming webhook event
          const { data: webhookRecord } = await supabase
            .from("instagram_webhook_events")
            .insert({
              provider_event_id: commentId || crypto.randomUUID(),
              instagram_connection_id: connection.id,
              ig_user_id: igUserId,
              surface_type: "comment",
              comment_id: commentId || "unknown",
              media_id: mediaId || null,
              commenter_ig_id: fromUser?.id || null,
              commenter_username: fromUser?.username || null,
              comment_text_redacted: text.slice(0, 100),
              comment_created_at: new Date().toISOString(),
              signature_verified: !!(appSecret && signature),
              processing_status: "received",
              retention_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
              received_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          // Find matching rules for this workspace
          const { data: rules } = await supabase
            .from("automation_rules")
            .select("*")
            .eq("workspace_id", connection.workspace_id)
            .eq("is_enabled", true);

          if (!rules) continue;

          for (const rule of rules as AutomationRuleRecord[]) {
            let matches = false;
            const keywords = (rule.keywords || []).map((k: string) => k.toLowerCase().trim());

            if (rule.match_mode === "exact") {
              matches = keywords.some((k: string) => text === k);
            } else if (rule.match_mode === "contains") {
              matches = keywords.some((k: string) => text.includes(k));
            } else if (rule.match_mode === "regex") {
              matches = keywords.some((k: string) => {
                try {
                  return new RegExp(k, "i").test(text);
                } catch {
                  return false;
                }
              });
            }

            if (matches) {
              const attributionToken = crypto.randomBytes(16).toString("hex");

              // Record pending execution in automation_executions
              await supabase.from("automation_executions").insert({
                workspace_id: connection.workspace_id,
                instagram_connection_id: connection.id,
                rule_id: rule.id,
                webhook_event_id: webhookRecord?.id || null,
                provider_event_id_snapshot: commentId || "comment",
                comment_id: commentId || "unknown",
                commenter_ig_id: fromUser?.id || null,
                commenter_username: fromUser?.username || null,
                matched_keyword: text,
                attribution_token: attributionToken,
                status: "queued",
                attempt_count: 0,
              });

              break; // Matched primary rule for this comment
            }
          }
        }
      }

      // 2. Process Direct Messages
      for (const msg of messaging) {
        if (msg.message && !msg.message.is_echo) {
          const text = (msg.message.text || "").trim().toLowerCase();
          const senderId = msg.sender?.id;
          const messageMid = msg.message.mid || `dm_${Date.now()}`;

          const { data: connection } = await supabase
            .from("instagram_connections")
            .select("id, workspace_id, status, is_paused")
            .eq("ig_user_id", igUserId)
            .maybeSingle();

          if (!connection || connection.is_paused || connection.status !== "connected") {
            continue;
          }

          const { data: rules } = await supabase
            .from("automation_rules")
            .select("*")
            .eq("workspace_id", connection.workspace_id)
            .eq("is_enabled", true);

          if (!rules) continue;

          for (const rule of rules as AutomationRuleRecord[]) {
            const keywords = (rule.keywords || []).map((k: string) => k.toLowerCase().trim());
            const matches = keywords.some((k: string) => text.includes(k));

            if (matches) {
              const attributionToken = crypto.randomBytes(16).toString("hex");

              await supabase.from("automation_executions").insert({
                workspace_id: connection.workspace_id,
                instagram_connection_id: connection.id,
                rule_id: rule.id,
                provider_event_id_snapshot: messageMid,
                comment_id: messageMid,
                commenter_ig_id: senderId || null,
                matched_keyword: text,
                attribution_token: attributionToken,
                status: "queued",
                attempt_count: 0,
              });
              break;
            }
          }
        }
      }
    }

    return NextResponse.json({ ok: true, processed: true }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Instagram webhook ingress error:", error);
    // Return 200 to acknowledge webhook so Meta does not relentlessly retry on application error
    return NextResponse.json({ ok: false, error: message }, { status: 200 });
  }
}
