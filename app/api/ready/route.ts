import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * PRODUCTION READINESS PROBE (`GET /api/ready`)
 * Closes Finding: F-19
 *
 * Checks database connectivity using public readable catalog table (`bio_templates`).
 * Returns 200 with latencyMs if database responds, or 503 if unavailable.
 */
export async function GET() {
  const start = Date.now();
  try {
    const pub = createPublicClient();
    const { error } = await pub
      .from("bio_templates")
      .select("id")
      .limit(1);

    if (error) {
      return NextResponse.json(
        { status: "degraded", latencyMs: Date.now() - start },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { status: "ready", latencyMs: Date.now() - start },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { status: "unavailable", latencyMs: Date.now() - start },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
