import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js 16 Proxy (`proxy.ts`)
 * Narrowed strictly to private creator & admin paths so public Bio pages (`/[handle]`),
 * tracked outbound redirects (`/r/*`), and webhooks (`/api/webhooks/*`) pay zero
 * auth round-trip overhead and remain cacheable (Closes Audit B-09).
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding", "/admin/:path*"],
};
