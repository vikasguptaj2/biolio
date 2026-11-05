"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { AlertCircle, Lock, Mail, Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const ERROR_MESSAGES: Record<string, string> = {
  oauth_failed:
    "Google authentication could not be completed. Please try again.",
  suspended:
    "This creator account has been suspended by Trust & Safety.",
  unverified:
    "Your account email must be verified to sign in to Biolio.",
};

function SignInScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam =
    searchParams?.get("next") || searchParams?.get("redirectTo") || "/dashboard";
  const errorCode = searchParams?.get("error") || "";

  // Google OAuth state
  const [googleLoading, setGoogleLoading] = useState(false);

  // Email / Password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(
    ERROR_MESSAGES[errorCode] || null
  );

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setErrorMsg(null);
    try {
      const supabase = createClient();
      const safeNext =
        nextParam.startsWith("/") && !nextParam.startsWith("//")
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
        setGoogleLoading(false);
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Unable to start Google sign-in."
      );
      setGoogleLoading(false);
    }
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setEmailLoading(true);
    setErrorMsg(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        setEmailLoading(false);
        return;
      }

      if (data?.user) {
        // Defensively ensure user_profiles row exists
        await supabase.from("user_profiles").upsert(
          {
            id: data.user.id,
            email: data.user.email || email.trim(),
            full_name:
              data.user.user_metadata?.full_name ||
              email.split("@")[0] ||
              "Creator",
            account_status: "active",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

        // Check if user has an active workspace membership
        const { data: memberships } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", data.user.id)
          .eq("status", "active")
          .limit(1);

        const safeNext =
          nextParam.startsWith("/") && !nextParam.startsWith("//")
            ? nextParam
            : "/dashboard";

        if (!memberships || memberships.length === 0) {
          router.push("/onboarding");
        } else {
          router.push(safeNext);
        }
        router.refresh();
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Unable to complete sign-in."
      );
      setEmailLoading(false);
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
          Creator Identity
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#211b29]">
          Sign in to Biolio
        </h1>
        <p className="mt-2 text-xs text-[#7c727e]">
          Access your Biolio Link-in-Bio studio and Instagram DM automation.
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

          {/* 1. Google OAuth — Intact & Untouched */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || emailLoading}
            className="w-full inline-flex items-center justify-center gap-3 rounded-2xl bg-[#211b29] py-3.5 px-5 text-sm font-extrabold text-white shadow-md hover:bg-[#3a3040] disabled:opacity-50 transition-all cursor-pointer"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3 14.7 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.7H12z"
              />
            </svg>
            {googleLoading ? "Redirecting to Google..." : "Continue with Google"}
          </button>

          {/* Elegant Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#e5dcd1] w-full" />
            <span className="bg-[#fffdf8] px-3 text-[11px] font-bold uppercase tracking-wider text-[#9e93a4]">
              or sign in with email
            </span>
            <div className="border-t border-[#e5dcd1] w-full" />
          </div>

          {/* 2. Email & Password Form */}
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4351] mb-1.5">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 h-4 w-4 text-[#9e93a4]" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="creator@example.com"
                  className="w-full rounded-xl border border-[#e5dcd1] bg-[#fbf8f2] pl-10 pr-4 py-2.5 text-sm font-medium text-[#211b29] placeholder:text-[#9e93a4] focus:border-[#f36b3f] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4351]">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-bold text-[#f36b3f] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 h-4 w-4 text-[#9e93a4]" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-[#e5dcd1] bg-[#fbf8f2] pl-10 pr-4 py-2.5 text-sm font-medium text-[#211b29] placeholder:text-[#9e93a4] focus:border-[#f36b3f] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={emailLoading || googleLoading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#f36b3f] py-3 px-5 text-sm font-bold text-white shadow-sm hover:bg-[#e25c30] disabled:opacity-50 transition-all cursor-pointer"
            >
              {emailLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In with Password</span>
              )}
            </button>
          </form>

          {/* Security & Sign Up Link */}
          <div className="pt-2 border-t border-[#e5dcd1] flex flex-col sm:flex-row items-center justify-between text-xs text-[#7c727e] gap-2">
            <span className="inline-flex items-center gap-1 text-[11px]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#277a67]" />
              Encrypted Supabase Auth
            </span>
            <Link
              href="/signup"
              className="font-bold text-[#211b29] hover:text-[#f36b3f]"
            >
              New creator? Create account &rarr;
            </Link>
          </div>
        </div>

        {/* Operator Gate Footnote */}
        <div className="mt-6 text-center text-xs text-[#7c727e]">
          <Link
            href="/admin/login"
            className="hover:text-[#211b29] underline decoration-[#c4b8cb]"
          >
            Super Admin Operator Gate &rarr;
          </Link>
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