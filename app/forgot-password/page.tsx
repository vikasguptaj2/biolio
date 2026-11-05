"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { KeyRound, Mail, ArrowLeft, AlertCircle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleResetRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const redirectUrl = `${window.location.origin}/auth/callback?next=/auth/reset-password`;

      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: redirectUrl,
        }
      );

      if (resetErr) {
        setError(resetErr.message);
        setLoading(false);
        return;
      }

      setSent(true);
      setLoading(false);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to process password reset request."
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
          <KeyRound className="h-3.5 w-3.5" />
          Account Recovery
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#211b29]">
          Reset your password
        </h1>
        <p className="mt-2 text-xs text-[#7c727e]">
          Enter the email associated with your Biolio account and we will send you a secure reset link.
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-3xl border border-[#e5dcd1] bg-[#fffdf8] p-8 shadow-xl space-y-6">
          {error && (
            <div className="rounded-xl bg-[#fce8df] border border-[#f5c2c7] p-3.5 text-xs text-[#842029] flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {sent ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#badbcc] bg-[#d1e7dd] p-4 text-xs text-[#0f5132] flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-[#0f5132]" />
                <div>
                  <p className="font-bold text-sm mb-1">Check your inbox</p>
                  <p className="leading-relaxed">
                    If an account exists for <span className="font-bold">{email}</span>, a password reset link has been dispatched. Please click the link in your email to choose a new password.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/signin"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#211b29] py-3 px-5 text-sm font-bold text-white shadow-sm hover:bg-[#3a3040] transition-all"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Return to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleResetRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4351] mb-1.5">
                  Account Email Address
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

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#f36b3f] py-3 px-5 text-sm font-bold text-white shadow-sm hover:bg-[#e25c30] disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <span>Send Password Reset Link</span>
                )}
              </button>

              <div className="pt-4 border-t border-[#e5dcd1] flex items-center justify-between text-xs text-[#7c727e]">
                <Link
                  href="/signin"
                  className="inline-flex items-center gap-1.5 font-bold text-[#211b29] hover:text-[#f36b3f]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Sign In
                </Link>
                <span className="inline-flex items-center gap-1 text-[11px]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#277a67]" />
                  PKCE Secured
                </span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f4efe7]" />}>
      <ForgotPasswordScreen />
    </Suspense>
  );
}
