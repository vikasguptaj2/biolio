import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess, handleRouteError } from "@/lib/server/http/guard";
import { createAdminClient } from "@/lib/supabase/admin";

interface CheckoutStatus {
  status: "pending" | "completed" | "failed" | "expired";
  completed_at: string | null;
  plan_id: string;
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireWorkspaceAccess({ minRole: "admin", module: "bio" });
    const sessionId = request.nextUrl.searchParams.get("sessionId") || "";
    if (!/^[0-9a-f-]{36}$/i.test(sessionId)) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid checkout session." } }, { status: 422 });
    }

    const db = createAdminClient();
    const query = (db.from("checkout_sessions" as never) as unknown as {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          eq: (column2: string, value2: string) => {
            eq: (column3: string, value3: string) => {
              maybeSingle: () => Promise<{ data: CheckoutStatus | null; error: unknown }>;
            };
          };
        };
      };
    }).select("status, completed_at, plan_id");

    const { data, error } = await query
      .eq("id", sessionId)
      .eq("workspace_id", access.workspaceId)
      .eq("user_id", access.userId)
      .maybeSingle();
    if (error) throw new Error("Checkout status is unavailable.");
    if (!data) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Checkout session not found." } }, { status: 404 });

    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error);
  }
}
