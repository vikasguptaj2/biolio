"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ShieldCheck, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const ERROR_MESSAGES: Record<string, string> = {
  oauth_failed:
    "Google authentication could not be completed. Please try again.",
  suspended:
    "This creator account has been suspended by Trust & Safety.",
  unverified:
    "Your Google account email must be verified to sign in to Biolio.",
};

function SignInScreen() {
  const searchParams = useSearchParams();
  const nextParam =
    searchParams?.get("next") || searchParams?.get("redirectTo") || "/dashboard";
  const errorCode = searchParams?.get("error") || "";

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(
    ERROR_MESSAGES[errorCode] || null
  );

  async function handleGoogleSignIn() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const supabase = createClient();
      const safeNext = nextParam.startsWith("/") && !nextParam.startsWith("//")
        ? nextParam
        : "/dashboard";

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            safeNext
          )}`,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Unable to start Google sign-in."
      );
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-6 sm:px-12 bg-[#f4efe7] text-[#211b29]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 group mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f36b3f] text-white font-display font-extrabold text-xl shadow-md">
            B
          </div>
          <span className="font-display font-extrabold text-2xl tracking-tighter text-[#211b29]">
            Biolio<span className="text-[#f36b3f]">.</span>
          </span>
        </Link>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f36b3f]/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#d44d22] mb-3">
          <Sparkles className="h-3.5 w-3.5" />
          Passwordless Creator Identity
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#211b29]">
          Sign in or create your Biolio workspace
        </h1>
        <p className="mt-2 text-xs text-[#7c727e]">
          One verified Google identity for both Biolio Bio and Instagram DM Automation.
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-3xl border border-[#e5dcd1] bg-[#fffdf8] p-8 shadow-xl space-y-6">
          {errorMsg && (
            <div className="rounded-xl bg-[#fce8df] border border-[#f5c2c7] p-3.5 text-xs text-[#842029] flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
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

          <div className="rounded-2xl border border-[#e5dcd1] bg-[#fbf8f2] p-4 text-[11px] text-[#5d5360] space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-[#211b29]">
              <ShieldCheck className="h-4 w-4 text-[#277a67]" />
              Zero Password Pre-Hijacking
            </div>
            <p className="leading-relaxed">
              Biolio uses Google OAuth 2.0 PKCE exclusively for creators. New accounts automatically proceed to handle claiming on <code className="font-mono">/onboarding</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f4efe7]" />}>
      <SignInScreen />
    </Suspense>
  );
}
