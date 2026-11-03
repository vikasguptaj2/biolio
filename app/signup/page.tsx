"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialHandle = searchParams?.get("handle") || "";
  const initialTemplate = searchParams?.get("template") || "";
  const initialPlan = searchParams?.get("plan") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [handle, setHandle] = useState(initialHandle);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
      if (cleanHandle && cleanHandle.length < 3) {
        throw new Error("Handle must be at least 3 characters long.");
      }

      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            preferred_handle: cleanHandle,
            preferred_template: initialTemplate,
          },
        },
      });

      if (error) throw error;

      // Forward to onboarding to claim handle & select initial template
      const params = new URLSearchParams();
      if (cleanHandle) params.set("handle", cleanHandle);
      if (fullName) params.set("name", fullName);
      if (initialTemplate) params.set("template", initialTemplate);
      if (initialPlan) params.set("plan", initialPlan);

      router.push(`/onboarding?${params.toString()}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create account.";
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
          Claim your corner of the web.
        </h2>
        <p className="mt-2 text-xs text-[#7c727e]">
          Set up your Biolio workspace in 60 seconds.
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

          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#211b29] mb-1.5">
                Desired Handle
              </label>
              <div className="flex items-center rounded-lg border border-[#e5dcd1] bg-[#f4efe7] px-3 py-2">
                <span className="text-xs font-medium text-[#a99ca7]">
                  biolio.site/
                </span>
                <input
                  type="text"
                  required
                  placeholder="yourname"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-[#211b29] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#211b29] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="Elena Vance"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-[#e5dcd1] bg-[#f4efe7] px-3.5 py-2.5 text-xs text-[#211b29] focus:outline-none focus:border-[#f36b3f]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#211b29] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="elena@atelier.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[#e5dcd1] bg-[#f4efe7] px-3.5 py-2.5 text-xs text-[#211b29] focus:outline-none focus:border-[#f36b3f]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#211b29] mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[#e5dcd1] bg-[#f4efe7] px-3.5 py-2.5 text-xs text-[#211b29] focus:outline-none focus:border-[#f36b3f]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#f36b3f] py-3 px-4 text-xs font-bold text-white shadow-sm hover:bg-[#ee7048] disabled:opacity-50 transition-all mt-2"
            >
              {loading ? (
                "Creating Account..."
              ) : (
                <>
                  Continue to Workspace Setup
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#eee6dc] text-center text-xs text-[#7c727e]">
            Already have an account?{" "}
            <Link
              href="/signin"
              className="font-bold text-[#211b29] hover:text-[#f36b3f] transition-colors"
            >
              Sign in &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

