"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function checkSession() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      } finally {
        setCheckingAuth(false);
      }
    }
    checkSession();
  }, []);

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateErr } = await supabase.auth.updateUser({
        password,
      });

      if (updateErr) {
        setError(updateErr.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 2000);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to update your password."
      );
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4efe7]">
        <Loader2 className="h-8 w-8 animate-spin text-[#f36b3f]" />
      </div>
    );
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
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#211b29]">
          Set a new password
        </h1>
        <p className="mt-2 text-xs text-[#7c727e]">
          Choose a strong, secure password for your Biolio creator account.
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

          {success ? (
            <div className="rounded-2xl border border-[#badbcc] bg-[#d1e7dd] p-5 text-xs text-[#0f5132] space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="h-5 w-5 text-[#0f5132]" />
                Password updated successfully!
              </div>
              <p className="leading-relaxed">
                Your password has been changed. We are redirecting you to your Biolio dashboard...
              </p>
              <div className="pt-2">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 font-bold text-[#0f5132] underline"
                >
                  Go to dashboard immediately &rarr;
                </Link>
              </div>
            </div>
          ) : !isAuthenticated ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#f5c2c7] bg-[#f8d7da] p-4 text-xs text-[#842029] space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertCircle className="h-5 w-5" />
                  Expired or invalid reset session
                </div>
                <p className="leading-relaxed">
                  This password reset link is invalid or has expired. Please request a new link from the forgot password page.
                </p>
              </div>

              <Link
                href="/forgot-password"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#211b29] py-3 px-5 text-sm font-bold text-white shadow-sm hover:bg-[#3a3040] transition-all"
              >
                Request New Password Link
              </Link>
            </div>
          ) : (
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4351] mb-1.5">
                  New Password (min. 8 characters)
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 h-4 w-4 text-[#9e93a4]" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-[#e5dcd1] bg-[#fbf8f2] pl-10 pr-4 py-2.5 text-sm font-medium text-[#211b29] placeholder:text-[#9e93a4] focus:border-[#f36b3f] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4351] mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 h-4 w-4 text-[#9e93a4]" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
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
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Save New Password</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <div className="pt-4 border-t border-[#e5dcd1] flex items-center justify-between text-xs text-[#7c727e]">
                <Link
                  href="/signin"
                  className="font-bold text-[#211b29] hover:text-[#f36b3f]"
                >
                  Cancel &amp; Sign In
                </Link>
                <span className="inline-flex items-center gap-1 text-[11px]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#277a67]" />
                  Encrypted Hash
                </span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f4efe7]" />}>
      <ResetPasswordScreen />
    </Suspense>
  );
}
