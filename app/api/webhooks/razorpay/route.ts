import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/lib/server/config/env";
import { createAdminClient } from "@/lib/supabase/admin";

interface ProviderEventRow {
  id: string;
  processing_status: string;
}

interface CheckoutRow {
  id: string;
  workspace_id: string;
  razorpay_order_id: string | null;
  status: string;
}

function safeEqualHex(actual: string, expected: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(actual) || !/^[a-f0-9]{64}$/i.test(expected)) return false;
  const left = Buffer.from(actual, "hex");
  const right = Buffer.from(expected, "hex");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function POST(request: NextRequest) {
  const env = getServerEnv();
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: { code: "PROVIDER_NOT_READY" } }, { status: 503 });
  }

  const signature = request.headers.get("x-razorpay-signature") || "";
  const rawBody = await request.text();
  if (rawBody.length > 1_048_576) {
    return NextResponse.json({ error: { code: "PAYLOAD_TOO_LARGE" } }, { status: 413 });
  }

  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody, "utf8")
    .digest("hex");
  if (!safeEqualHex(signature, expectedSignature)) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid payload");
    payload = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: { code: "INVALID_PAYLOAD" } }, { status: 400 });
  }

  const eventType = typeof payload.event === "string" ? payload.event : "unknown";
  const eventId = request.headers.get("x-razorpay-event-id") ||
    (typeof payload.id === "string" ? payload.id : "") ||
    `sha256_${crypto.createHash("sha256").update(rawBody).digest("hex")}`;
  if (eventId.length > 255) {
    return NextResponse.json({ error: { code: "INVALID_EVENT_ID" } }, { status: 400 });
  }

  try {
    const db = createAdminClient();
    const events = db.from("provider_events" as never) as unknown as {
      insert: (row: Record<string, unknown>) => {
        select: (columns: string) => {
          maybeSingle: () => Promise<{ data: ProviderEventRow | null; error: { code?: string } | null }>;
        };
      };
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          eq: (column2: string, value2: string) => {
            maybeSingle: () => Promise<{ data: ProviderEventRow | null; error: unknown }>;
          };
        };
      };
      update: (row: Record<string, unknown>) => {
        eq: (column: string, value: string) => Promise<{ error: unknown }>;
      };
    };

    let eventRow: ProviderEventRow | null = null;
    const inserted = await events.insert({
      provider: "razorpay",
      provider_event_id: eventId,
      event_type: eventType,
      signature_verified: true,
      processing_status: "received",
      redacted_summary: { event: eventType },
    }).select("id, processing_status").maybeSingle();
    eventRow = inserted.data;

    if (inserted.error?.code === "23505") {
      const existing = await events.select("id, processing_status")
        .eq("provider", "razorpay")
        .eq("provider_event_id", eventId)
        .maybeSingle();
      if (existing.error || !existing.data) throw new Error("Provider event lookup failed.");
      eventRow = existing.data;
      if (["processed", "ignored_out_of_order"].includes(eventRow.processing_status)) {
        return NextResponse.json({ received: true, duplicate: true });
      }
    } else if (inserted.error || !eventRow) {
      throw new Error("Provider event could not be recorded.");
    }

    const eventBody = payload.payload && typeof payload.payload === "object"
      ? payload.payload as Record<string, unknown>
      : {};
    const payment = eventBody.payment && typeof eventBody.payment === "object"
      ? (eventBody.payment as Record<string, unknown>).entity as Record<string, unknown> | undefined
      : undefined;
    const order = eventBody.order && typeof eventBody.order === "object"
      ? (eventBody.order as Record<string, unknown>).entity as Record<string, unknown> | undefined
      : undefined;
    const refund = eventBody.refund && typeof eventBody.refund === "object"
      ? (eventBody.refund as Record<string, unknown>).entity as Record<string, unknown> | undefined
      : undefined;

    const setEventStatus = async (
      status: "processed" | "ignored_out_of_order" | "failed",
      workspaceId?: string,
      summary?: Record<string, unknown>
    ) => {
      const { error } = await events.update({
        processing_status: status,
        processed_at: new Date().toISOString(),
        ...(workspaceId ? { workspace_id: workspaceId } : {}),
        ...(summary ? { redacted_summary: { event: eventType, ...summary } } : {}),
      }).eq("id", eventRow!.id);
      if (error) throw new Error("Provider event status could not be saved.");
    };

    if (eventType === "payment.captured" || eventType === "order.paid") {
      const orderId = typeof payment?.order_id === "string"
        ? payment.order_id
        : typeof order?.id === "string" ? order.id : "";
      const paymentId = typeof payment?.id === "string" ? payment.id : "";
      const amount = typeof payment?.amount === "number"
        ? payment.amount
        : typeof order?.amount_paid === "number" ? order.amount_paid : -1;
      const currency = typeof payment?.currency === "string"
        ? payment.currency
        : typeof order?.currency === "string" ? order.currency : "";
      const noteData = payment?.notes && typeof payment.notes === "object"
        ? payment.notes as Record<string, unknown>
        : order?.notes && typeof order.notes === "object"
          ? order.notes as Record<string, unknown>
          : {};
      const noteSessionId = typeof noteData.checkout_session_id === "string"
        ? noteData.checkout_session_id : "";

      if (!orderId || !paymentId || !Number.isSafeInteger(amount) || !currency) {
        await setEventStatus("failed", undefined, { reason: "missing_payment_fields" });
        return NextResponse.json({ received: true, processed: false });
      }

      const checkoutTable = db.from("checkout_sessions" as never) as unknown as {
        select: (columns: string) => {
          eq: (column: string, value: string) => {
            maybeSingle: () => Promise<{ data: CheckoutRow | null; error: unknown }>;
          };
        };
      };
      let checkout: CheckoutRow | null = null;
      const byOrder = await checkoutTable.select("id, workspace_id, razorpay_order_id, status")
        .eq("razorpay_order_id", orderId).maybeSingle();
      if (byOrder.error) throw new Error("Checkout lookup failed.");
      checkout = byOrder.data;

      // Notes are signed by Razorpay with the event body. This fallback handles
      // an order-save retry while still requiring the exact pending session.
      if (!checkout && /^[0-9a-f-]{36}$/i.test(noteSessionId)) {
        const byId = await checkoutTable.select("id, workspace_id, razorpay_order_id, status")
          .eq("id", noteSessionId).maybeSingle();
        if (byId.error) throw new Error("Checkout lookup failed.");
        checkout = byId.data;
        if (checkout && checkout.razorpay_order_id && checkout.razorpay_order_id !== orderId) {
          checkout = null;
        }
      }

      if (!checkout) {
        await setEventStatus("ignored_out_of_order", undefined, { reason: "checkout_not_found" });
        return NextResponse.json({ received: true, ignored: true });
      }

      const { error: paymentError } = await (db.rpc as unknown as (
        name: string,
        args: Record<string, unknown>
      ) => Promise<{ data: unknown; error: unknown }>) (
        "process_razorpay_payment",
        {
          p_checkout_session_id: checkout.id,
          p_payment_id: paymentId,
          p_amount_minor: amount,
          p_currency: currency,
          p_provider_event_row_id: eventRow.id,
        }
      );
      if (paymentError) {
        await setEventStatus("failed", checkout.workspace_id, { reason: "payment_projection_failed" });
        return NextResponse.json({ received: true, processed: false }, { status: 500 });
      }
      return NextResponse.json({ received: true });
    }

    if (eventType === "payment.failed") {
      const orderId = typeof payment?.order_id === "string" ? payment.order_id : "";
      if (orderId) {
        const checkoutTable = db.from("checkout_sessions" as never) as unknown as {
          update: (row: Record<string, unknown>) => {
            eq: (column: string, value: string) => {
              eq: (column2: string, value2: string) => Promise<{ error: unknown }>;
            };
          };
        };
        const { error } = await checkoutTable.update({ status: "failed" })
          .eq("razorpay_order_id", orderId).eq("status", "pending");
        if (error) throw new Error("Failed payment status could not be saved.");
      }
      await setEventStatus("processed");
      return NextResponse.json({ received: true });
    }

    if (eventType === "refund.processed") {
      const paymentId = typeof refund?.payment_id === "string" ? refund.payment_id : "";
      const amount = typeof refund?.amount === "number" ? refund.amount : -1;
      if (!paymentId || !Number.isSafeInteger(amount) || amount < 0) {
        await setEventStatus("failed", undefined, { reason: "missing_refund_fields" });
        return NextResponse.json({ received: true, processed: false });
      }
      const { error } = await (db.rpc as unknown as (
        name: string,
        args: Record<string, unknown>
      ) => Promise<{ data: unknown; error: unknown }>) (
        "process_razorpay_refund",
        {
          p_provider_event_row_id: eventRow.id,
          p_payment_id: paymentId,
          p_refund_amount_minor: amount,
        }
      );
      if (error) throw new Error("Refund projection failed.");
      return NextResponse.json({ received: true });
    }

    await setEventStatus("ignored_out_of_order", undefined, { reason: "unhandled_event" });
    return NextResponse.json({ received: true, ignored: true });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Webhook processing failed." } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
