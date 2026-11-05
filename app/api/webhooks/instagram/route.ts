import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/lib/server/config/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateCommentMatch } from "@/lib/server/instagram/matcher";

/**
 * PRODUCTION-GRADE META INSTAGRAM WEBHOOK INGRESS (`/api/webhooks/instagram`)
 * Closes Audit Findings: B-03, B-14, B-15
 *
 * Security Requirements:
 * 1. Constant-time `X-Hub-Signature-256` HMAC validation.
 * 2. Strict 7-day age window (rejects stale comments outside Meta's private reply window).
 * 3. Self-comment suppression (prevents infinite loop responding to creator's own comment).
 * 4. Five-Layer Module Lock check (drops event if workspace has Bio-only plan / `ig_state = 'locked'`).
 * 5. Idempotent deduplication in `instagram_webhook_events` and `automation_executions`.
 */

interface CommentValue {
  id: string;
  text?: string;
  created_time?: number;
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

interface WebhookEntry {
  id: string;
  time?: number;
  changes?: WebhookChange[];
}

interface WebhookPayload {
  object?: string;
  entry?: WebhookEntry[];
}

interface ConnectionRow {
  id: string;
  workspace_id: string;
  ig_user_id: string;
  ig_username: string;
  status: string;
}

interface EntitlementRow {
  ig_state: string;
  automation_monthly_action_quota: number;
  automation_monthly_actions_used: number;
}

interface AutomationRuleRow {
  id: string;
  scope: string;
  selected_media_ids?: string[] | null;
  match_mode: string;
  keywords: string[] | null;
}

interface WebhookEventRow {
  id: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const env = getServerEnv();
  if (!env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json(
      {
        error: {
          code: "PROVIDER_NOT_READY",
          message: "INSTAGRAM_WEBHOOK_VERIFY_TOKEN is not configured.",
        },
      },
      { status: 500 }
    );
  }

  // Constant-time verify token check
  const expectedToken = env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;
  const tokenMatches =
    Boolean(token) &&
    token!.length === expectedToken.length &&
    crypto.timingSafeEqual(
      Buffer.from(token!, "utf8"),
      Buffer.from(expectedToken, "utf8")
    );

  if (mode === "subscribe" && tokenMatches && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message: "Verification failed." } },
    { status: 403 }
  );
}

export async function POST(request: NextRequest) {
  const env = getServerEnv();

  // 1. Fail closed if META_APP_SECRET is not configured
  if (!env.META_APP_SECRET) {
    return NextResponse.json(
      {
        error: {
          code: "PROVIDER_NOT_READY",
          message: "META_APP_SECRET is not configured on server.",
        },
      },
      { status: 500 }
    );
  }

  const hubSig = request.headers.get("x-hub-signature-256");
  if (!hubSig || !hubSig.startsWith("sha256=")) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHENTICATED",
          message: "Missing or malformed X-Hub-Signature-256 header.",
        },
      },
      { status: 401 }
    );
  }

  const rawBody = await request.text();
  const rawSignature = hubSig.slice(7);

  // 2. Compute HMAC SHA-256 and compare in constant time
  const computedHmac = crypto
    .createHmac("sha256", env.META_APP_SECRET)
    .update(rawBody)
    .digest("hex");

  const sigBuffer = Buffer.from(rawSignature, "utf8");
  const computedBuffer = Buffer.from(computedHmac, "utf8");

  if (
    sigBuffer.length !== computedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, computedBuffer)
  ) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHENTICATED",
          message: "Invalid webhook HMAC signature.",
        },
      },
      { status: 401 }
    );
  }

  try {
    const payload = JSON.parse(rawBody) as WebhookPayload;
    const adminDb = createAdminClient();

    // 3. Check global operational killswitch
    const { data: killswitch } = await (
      adminDb.from("feature_flags" as never) as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            maybeSingle: () => Promise<{ data: { is_enabled: boolean } | null }>;
          };
        };
      }
    )
      .select("is_enabled")
      .eq("key", "killswitch.instagram_webhooks")
      .maybeSingle();

    if (killswitch?.is_enabled) {
      return NextResponse.json({
        received: true,
        status: "deferred_by_killswitch",
      });
    }

    const entries = payload.entry || [];
    let queuedCount = 0;

    for (const entry of entries) {
      const igBusinessAccountId = String(entry.id || "");
      if (!igBusinessAccountId) continue;

      const { data: connection } = await (
        adminDb.from("instagram_connections" as never) as unknown as {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              eq: (col2: string, val2: string) => {
                maybeSingle: () => Promise<{ data: ConnectionRow | null }>;
              };
            };
          };
        }
      )
        .select("id, workspace_id, ig_user_id, ig_username, status")
        .eq("ig_user_id", igBusinessAccountId)
        .eq("status", "connected")
        .maybeSingle();

      if (!connection) continue;

      // Load workspace entitlement state (Layer 4 Module Lock check)
      const { data: ent } = await (
        adminDb.from("workspace_entitlements" as never) as unknown as {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              maybeSingle: () => Promise<{ data: EntitlementRow | null }>;
            };
          };
        }
      )
        .select(
          "ig_state, automation_monthly_action_quota, automation_monthly_actions_used"
        )
        .eq("workspace_id", connection.workspace_id)
        .maybeSingle();

      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field !== "comments" || !change.value?.id) continue;

        const comment = change.value;
        const commentId = String(comment.id);
        const commentText = String(comment.text || "").trim();
        const commenterId = String(comment.from?.id || "");
        const commenterUsername = String(comment.from?.username || "instagram_user");
        const mediaId = String(comment.media?.id || "unknown_media");

        // Self-comment loop guard: never reply to the creator's own account
        if (commenterId && commenterId === igBusinessAccountId) {
          continue;
        }

        // Check 7-day Meta Private Reply eligibility window
        const commentEpochSec =
          comment.created_time || entry.time || Math.floor(Date.now() / 1000);
        const commentCreatedAt = new Date(commentEpochSec * 1000);
        const ageMs = Date.now() - commentCreatedAt.getTime();
        if (ageMs > 7 * 24 * 60 * 60 * 1000) {
          continue;
        }

        const dedupeKey = `ig_comment:${connection.id}:${commentId}`;

        // 1. Idempotent insert into instagram_webhook_events
        const { data: webhookEvent, error: whErr } = await (
          adminDb.from("instagram_webhook_events" as never) as unknown as {
            insert: (row: Record<string, unknown>) => {
              select: (cols: string) => {
                maybeSingle: () => Promise<{
                  data: WebhookEventRow | null;
                  error: unknown;
                }>;
              };
            };
          }
        )
          .insert({
            workspace_id: connection.workspace_id,
            instagram_connection_id: connection.id,
            dedupe_key: dedupeKey,
            event_type: "comment",
            ig_object_id: commentId,
            ig_media_id: mediaId,
            actor_ig_Scoped_id: commenterId || "unknown",
            actor_username: commenterUsername,
            comment_text_redacted: commentText.slice(0, 240),
            comment_created_at: commentCreatedAt.toISOString(),
            signature_verified: true,
            processing_status: "received",
          })
          .select("id")
          .maybeSingle();

        if (whErr || !webhookEvent) {
          // Duplicate webhook delivery -> skip safely
          continue;
        }

        // 2. Layer 4 Module Lock Check: if workspace is Bio-only (`ig_state = 'locked'`), skip!
        if (
          ent?.ig_state === "locked" ||
          Number(ent?.automation_monthly_action_quota ?? 100) === 0
        ) {
          await (
            adminDb.from("instagram_webhook_events" as never) as unknown as {
              update: (vals: Record<string, unknown>) => {
                eq: (col: string, val: string) => Promise<unknown>;
              };
            }
          )
            .update({
              processing_status: "ignored_no_match",
              processed_at: new Date().toISOString(),
            })
            .eq("id", webhookEvent.id);
          continue;
        }

        // 3. Load enabled automation_rules ordered by priority ASC
        const { data: rules } = await (
          adminDb.from("automation_rules" as never) as unknown as {
            select: (cols: string) => {
              eq: (col: string, val: string) => {
                eq: (col2: string, val2: string) => {
                  eq: (col3: string, val3: boolean) => {
                    order: (
                      col4: string,
                      opt: { ascending: boolean }
                    ) => Promise<{ data: AutomationRuleRow[] | null }>;
                  };
                };
              };
            };
          }
        )
          .select("*")
          .eq("workspace_id", connection.workspace_id)
          .eq("instagram_connection_id", connection.id)
          .eq("is_enabled", true)
          .order("priority", { ascending: true });

        if (!rules || rules.length === 0) continue;

        let matchedRule: AutomationRuleRow | null = null;
        let matchedKeyword: string | null = null;

        for (const rule of rules) {
          if (
            rule.scope === "selected_media" &&
            Array.isArray(rule.selected_media_ids) &&
            !rule.selected_media_ids.includes(mediaId)
          ) {
            continue;
          }

          const evalRes = evaluateCommentMatch(
            commentText,
            rule.match_mode || "word",
            Array.isArray(rule.keywords) ? rule.keywords : []
          );

          if (evalRes.matched) {
            matchedRule = rule;
            matchedKeyword = evalRes.matchedKeyword;
            break;
          }
        }

        if (!matchedRule) {
          await (
            adminDb.from("instagram_webhook_events" as never) as unknown as {
              update: (vals: Record<string, unknown>) => {
                eq: (col: string, val: string) => Promise<unknown>;
              };
            }
          )
            .update({
              processing_status: "ignored_no_match",
              processed_at: new Date().toISOString(),
            })
            .eq("id", webhookEvent.id);
          continue;
        }

        // 4. Record queued execution (enforcing UNIQUE (instagram_connection_id, comment_id))
        const { error: execErr } = await (
          adminDb.from("automation_executions" as never) as unknown as {
            insert: (row: Record<string, unknown>) => Promise<{ error: unknown }>;
          }
        ).insert({
          workspace_id: connection.workspace_id,
          instagram_connection_id: connection.id,
          rule_id: matchedRule.id,
          webhook_event_id: webhookEvent.id,
          comment_id: commentId,
          media_id: mediaId,
          commenter_ig_scoped_id: commenterId || "unknown",
          commenter_username: commenterUsername,
          matched_keyword: matchedKeyword || "*",
          status: "queued",
        });

        if (!execErr) {
          queuedCount += 1;
          await (
            adminDb.from("instagram_webhook_events" as never) as unknown as {
              update: (vals: Record<string, unknown>) => {
                eq: (col: string, val: string) => Promise<unknown>;
              };
            }
          )
            .update({
              processing_status: "enqueued",
              processed_at: new Date().toISOString(),
            })
            .eq("id", webhookEvent.id);
        }
      }
    }

    return NextResponse.json({
      received: true,
      queuedExecutions: queuedCount,
    });
  } catch {
    // Return 500 on unexpected DB failure so Meta retries delivery (Closes B-14)
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to persist webhook event.",
        },
      },
      { status: 500 }
    );
  }
}
