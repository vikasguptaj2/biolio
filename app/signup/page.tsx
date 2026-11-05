"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sparkles, ShieldCheck, AlertCircle } from "lucide-react";

function SignUpScreen() {
  const searchParams = useSearchParams();
  const desiredHandle = (searchParams?.get("handle") || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
  const [handleInput, setHandleInput] = useState(desiredHandle);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinueWithGoogle(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const onboardingPath = handleInput
        ? `/onboarding?handle=${encodeURIComponent(handleInput)}`
        : "/onboarding";

      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            onboardingPath
          )}`,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (oauthErr) {
        setError(oauthErr.message);
        setLoading(false);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to start Google sign-up."
      );
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#fbf8f2] px-6 py-12">
      <div className="mx-auto w-full max-w-md text-center pt-6">
        <Link href="/" className="inline-flex items-center gap-2 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f36b3f] text-white font-display font-extrabold text-xl shadow-sm">
            B
          </div>
          <span className="font-display font-extrabold text-2xl tracking-tighter text-[#211b29]">
            Biolio<span className="text-[#f36b3f]">.</span>
          </span>
        </Link>
      </div>

      <div className="mx-auto w-full max-w-md rounded-3xl border border-[#e5dcd1] bg-[#fffdf8] p-8 md:p-10 shadow-xl space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f36b3f]/10 border border-[#f36b3f]/25 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#d44d22] mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            Claim Your Creator Handle
          </div>
          <h1 className="font-display text-3xl font-extrabold text-[#211b29] tracking-tight mb-2">
            Start with Google
          </h1>
          <p className="text-xs text-[#7c727e]">
            Sign in with Google to reserve your handle and choose Biolio Bio, Instagram Automation, or the Bundle.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-[#f5c2c7] bg-[#f8d7da] p-3.5 text-xs text-[#842029] flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleContinueWithGoogle} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4351] mb-1.5">
              Desired Handle (Optional)
            </label>
            <div className="flex items-center rounded-xl border border-[#e5dcd1] bg-[#fbf8f2] px-3.5 py-3 focus-within:border-[#f36b3f]">
              <span className="text-xs font-bold text-[#7c727e] select-none">
                biolio.site/
              </span>
              <input
                type="text"
                value={handleInput}
                onChange={(e) =>
                  setHandleInput(
                    e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "")
                  )
                }
                placeholder="aria_studio"
                className="w-full bg-transparent text-sm font-bold text-[#211b29] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-3 rounded-2xl bg-[#211b29] py-4 px-5 text-sm font-extrabold text-white shadow-md hover:bg-[#3a3040] disabled:opacity-50 transition-all"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3 14.7 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.7H12z"
              />
            </svg>
            {loading ? "Redirecting to Google..." : "Continue with Google"}
          </button>
        </form>

        <div className="pt-4 border-t border-[#e5dcd1] flex items-center justify-between text-xs text-[#7c727e]">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-[#277a67]" />
            Google OAuth PKCE
          </span>
          <Link href="/signin" className="font-bold text-[#211b29] hover:text-[#f36b3f]">
            Already a creator? Sign in &rarr;
          </Link>
        </div>
      </div>

      <div className="text-center text-xs text-[#7c727e]">
        &copy; {new Date().getFullYear()} Biolio Technologies Inc.
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fbf8f2]" />}>
      <SignUpScreen />
    </Suspense>
  );
}
