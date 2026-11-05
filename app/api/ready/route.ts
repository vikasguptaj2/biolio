import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";

export async function GET() {
  const start = Date.now();
  try {
    const pub = createPublicClient();
    const { error } = await pub
      .from("feature_flags")
      .select("key")
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

