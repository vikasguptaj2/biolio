"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get("redirectTo") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isMagicLink, setIsMagicLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const supabase = createClient();

      if (isMagicLink) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(
              redirectTo
            )}`,
          },
        });
        if (error) throw error;
        setSuccessMsg(
          "Check your inbox! We sent you a secure magic sign-in link."
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // Route to dashboard or targeted redirect
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign in. Please verify your credentials.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

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
        <h2 className="font-editorial text-3xl font-bold tracking-tight text-[#211b29]">
          Welcome back to the Atelier.
        </h2>
        <p className="mt-2 text-xs text-[#7c727e]">
          Sign in to manage your bio website and Instagram automations.
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-8 shadow-md">
          {errorMsg && (
            <div className="mb-6 rounded-lg bg-[#fce8df] p-3 text-xs text-[#c45a3a] flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 rounded-lg bg-[#e4f1eb] p-3 text-xs text-[#277a67] flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#211b29] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="creator@atelier.com"
                className="w-full rounded-lg border border-[#e5dcd1] bg-[#f4efe7] px-3.5 py-2.5 text-xs text-[#211b29] focus:outline-none focus:border-[#f36b3f]"
              />
            </div>

            {!isMagicLink && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#211b29]">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsMagicLink(true)}
                    className="text-[11px] font-semibold text-[#f36b3f] hover:underline"
                  >
                    Use magic link instead?
                  </button>
                </div>
                <input
                  type="password"
                  required={!isMagicLink}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-lg border border-[#e5dcd1] bg-[#f4efe7] px-3.5 py-2.5 text-xs text-[#211b29] focus:outline-none focus:border-[#f36b3f]"
                />
              </div>
            )}

            {isMagicLink && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setIsMagicLink(false)}
                  className="text-[11px] font-semibold text-[#f36b3f] hover:underline"
                >
                  Use password instead?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#f36b3f] py-3 px-4 text-xs font-bold text-white shadow-sm hover:bg-[#ee7048] disabled:opacity-50 transition-all mt-2"
            >
              {loading ? (
                "Signing In..."
              ) : isMagicLink ? (
                "Send Magic Link"
              ) : (
                <>
                  Sign In to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#eee6dc] text-center text-xs text-[#7c727e]">
            Don&apos;t have an account yet?{" "}
            <Link
              href="/signup"
              className="font-bold text-[#211b29] hover:text-[#f36b3f] transition-colors"
            >
              Claim your handle &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f4efe7]" />}>
      <SignInForm />
    </Suspense>
  );
}

