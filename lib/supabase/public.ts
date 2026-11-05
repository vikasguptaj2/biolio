import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/types/database.types";

/**
 * COOKIE-FREE PUBLIC SUPABASE CLIENT (`publicClient()`)
 *
 * Used strictly on cacheable public surfaces (`/[handle]`, `/[handle]/blog/[slug]`,
 * `/r/[token]`, `sitemap.xml`) so Next.js 16 never binds request cookies or
 * calls `supabase.auth.getUser()` on public traffic (Closes Audit B-20).
 */
export function createPublicClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

