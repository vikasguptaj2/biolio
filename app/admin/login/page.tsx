"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Lock, Loader2, AlertCircle, KeyRound } from "lucide-react";

/**
 * HARDENED SUPER ADMIN LOGIN PAGE (`app/admin/login/page.tsx`)
 * Closes Audit Findings: B-02, B-10
 * Zero literal credentials or default password hints in client source code.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdminSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data?.error?.message || "Invalid credentials or rate limit exceeded."
        );
        setLoading(false);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Failed to contact Super Admin authentication gate.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#16121c] text-white flex flex-col justify-center items-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-[#2e2638] bg-[#1d1824] p-8 md:p-10 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#a62639] text-white shadow-lg">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-xl font-extrabold tracking-tight">
              Biolio Super Admin
            </h1>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#ff8f85]">
              Isolated Operator Session Gate
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-[#3a3042] bg-[#16121c] p-3.5 text-[11px] text-[#c4b8cb] leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold text-[#f5b851] mb-1">
            <KeyRound className="h-3.5 w-3.5" />
            Server-Verified Root Credential Gate
          </div>
          Protected by <code className="text-white">ADMIN_EMAIL</code> and{" "}
          <code className="text-white">ADMIN_PASSWORD_HASH</code> (scrypt) with brute-force lockout and audited session tracking.
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-[#a62639] bg-[#a62639]/20 p-3.5 text-xs text-[#ff8f85] flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAdminSignIn} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#9e93a4] mb-1.5">
              Authorized Operator Email
            </label>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@biolio.site"
              className="w-full rounded-xl border border-[#2e2638] bg-[#16121c] px-4 py-3 text-sm text-white placeholder:text-[#5e5466] focus:border-[#f36b3f] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#9e93a4] mb-1.5">
              Master Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••••••"
              className="w-full rounded-xl border border-[#2e2638] bg-[#16121c] px-4 py-3 text-sm text-white placeholder:text-[#5e5466] focus:border-[#f36b3f] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#a62639] py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-[#8c1f30] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            Authenticate Operator Session
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-[#2e2638] text-center">
          <Link
            href="/"
            className="text-xs text-[#9e93a4] hover:text-white transition-colors"
          >
            &larr; Return to Public Biolio Site
          </Link>
        </div>
      </div>
    </div>
  );
}
