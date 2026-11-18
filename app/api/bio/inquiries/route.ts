import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  requireWorkspaceAccess,
  verifySameOrigin,
  handleRouteError,
  RouteAccessError,
} from "@/lib/server/http/guard";

const VALID_STATUSES = ["new", "read", "replied", "archived", "spam"] as const;
type InquiryStatus = (typeof VALID_STATUSES)[number];

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceAccess({
      minRole: "editor",
      module: "bio",
    });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const search = (searchParams.get("q") || "").trim().toLowerCase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;

    let query = db
      .from("bio_contact_submissions")
      .select("id, sender_name, sender_email, sender_company, inquiry_type, budget_range, message, status, created_at, updated_at")
      .eq("workspace_id", ctx.workspaceId)
      .order("created_at", { ascending: false });

    if (status !== "all" && VALID_STATUSES.includes(status as InquiryStatus)) {
      query = query.eq("status", status);
    }

    const { data: rawInquiries, error } = await query.limit(100);

    if (error) {
      throw new RouteAccessError(500, "INTERNAL_ERROR", error.message);
    }

    interface InquiryRow {
      sender_name: string;
      sender_email: string;
      message: string;
      sender_company?: string;
    }

    let inquiries = (rawInquiries || []) as InquiryRow[];

    if (search) {
      inquiries = inquiries.filter(
        (i) =>
          i.sender_name.toLowerCase().includes(search) ||
          i.sender_email.toLowerCase().includes(search) ||
          i.message.toLowerCase().includes(search) ||
          (i.sender_company && i.sender_company.toLowerCase().includes(search))
      );
    }

    return NextResponse.json(
      { ok: true, inquiries },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    verifySameOrigin(request);
    const ctx = await requireWorkspaceAccess({
      minRole: "editor",
      module: "bio",
    });

    const body = await request.json().catch(() => ({}));
    const inquiryId = String(body.id || "").trim();
    const newStatus = String(body.status || "").trim().toLowerCase() as InquiryStatus;

    if (!inquiryId || !VALID_STATUSES.includes(newStatus)) {
      throw new RouteAccessError(
        422,
        "VALIDATION_ERROR",
        `Valid inquiry id and status (${VALID_STATUSES.join(", ")}) required.`
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;

    const { data: updated, error } = await db
      .from("bio_contact_submissions")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", inquiryId)
      .eq("workspace_id", ctx.workspaceId)
      .select("id, status, updated_at")
      .maybeSingle();

    if (error || !updated) {
      throw new RouteAccessError(404, "NOT_FOUND", "Inquiry not found in this workspace.");
    }

    return NextResponse.json({ ok: true, inquiry: updated });
  } catch (err) {
    return handleRouteError(err);
  }
}
