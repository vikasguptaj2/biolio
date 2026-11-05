import { NextRequest, NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * HANDLE AVAILABILITY CHECK (`POST /api/bio/handle/check`)
 * Closes Audit Finding: B-16 (06_PUBLIC_LINKS_AND_ROUTING.md §1.2)
 *
 * Returns `{ status: 'available' | 'taken' | 'reserved' | 'invalid' }` without
 * revealing who owns a handle.
 */
const HANDLE_REGEX = /^[a-z0-9][a-z0-9_-]{2,29}$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawHandle = String(body.handle || "")
      .trim()
      .toLowerCase();

    if (!HANDLE_REGEX.test(rawHandle)) {
      return NextResponse.json({ status: "invalid" });
    }

    const pub = createPublicClient();

    const { data: reserved } = await pub
      .from("reserved_handles")
      .select("handle")
      .eq("handle", rawHandle)
      .maybeSingle();

    if (reserved) {
      return NextResponse.json({ status: "reserved" });
    }

    const { data: existing } = await pub
      .from("bio_profiles")
      .select("handle")
      .eq("handle", rawHandle)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ status: "taken" });
    }

    return NextResponse.json({ status: "available" });
  } catch {
    return NextResponse.json({ status: "invalid" }, { status: 500 });
  }
}

