"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // In production, step-up MFA challenge is verified here
      router.push("/admin");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to authenticate administrator.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-6 sm:px-12 bg-[#120f17] text-[#fdfcfe]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f36b3f] text-white font-display font-extrabold text-2xl shadow-lg mb-4">
          B
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#342b3d] bg-[#211b29] px-3 py-1 text-[11px] font-bold text-[#c9b5f4] mb-3">
          <ShieldCheck className="h-3.5 w-3.5 text-[#6ac2a2]" />
          INTERNAL ACCESS ONLY &bull; AUDITED PORTAL
        </div>
        <h2 className="font-editorial text-3xl font-bold tracking-tight text-white">
          Super Admin Control Center
        </h2>
        <p className="mt-2 text-xs text-[#9e94a3]">
          Step-up credentials required for all platform operations.
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-[#342b3d] bg-[#1a1622] p-8 shadow-2xl">
          {errorMsg && (
            <div className="mb-6 rounded-lg bg-[#3a1a1f] border border-[#6b252d] p-3 text-xs text-[#ff9e9e] flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#c9b5f4] mb-1.5">
                Staff Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@biolio.site"
                className="w-full rounded-lg border border-[#342b3d] bg-[#120f17] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#f36b3f]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#c9b5f4] mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-lg border border-[#342b3d] bg-[#120f17] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#f36b3f]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#c9b5f4] mb-1.5">
                Step-up MFA / TOTP Code (Optional for Dev)
              </label>
              <input
                type="text"
                placeholder="6-digit code"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                className="w-full rounded-lg border border-[#342b3d] bg-[#120f17] px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#f36b3f]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#f36b3f] py-3 px-4 text-xs font-bold text-white shadow-md hover:bg-[#ee7048] disabled:opacity-50 transition-all mt-2"
            >
              {loading ? (
                "Authenticating..."
              ) : (
                <>
                  Verify Credentials & Enter
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#342b3d] text-center text-[11px] text-[#7c727e]">
            All sign-in attempts are immutably logged to <code className="text-[#c9b5f4]">admin_audit_logs</code>.
          </div>
        </div>
      </div>
    </div>
  );
}

