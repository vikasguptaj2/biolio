"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Globe,
} from "lucide-react";
import { Instagram } from "@/components/icons/instagram";
import { createClient } from "@/lib/supabase/client";
import { BIOLIO_TEMPLATES } from "@/lib/design-tokens";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(1);
  const [handle, setHandle] = useState(searchParams?.get("handle") || "");
  const [displayName, setDisplayName] = useState(searchParams?.get("name") || "");
  const [creatorRole, setCreatorRole] = useState("Creator / Influencer");
  const [intendedModules, setIntendedModules] = useState<string[]>(["bio", "automation"]);
  const [selectedTemplate, setSelectedTemplate] = useState(
    searchParams?.get("template") || "atelier-editorial"
  );

  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function verifyUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/signin?redirectTo=/onboarding");
        return;
      }

      if (!displayName && user.user_metadata?.full_name) {
        setDisplayName(user.user_metadata.full_name);
      }
      if (!handle && user.user_metadata?.preferred_handle) {
        setHandle(user.user_metadata.preferred_handle);
      }
      setCheckingAuth(false);
    }
    verifyUser();
  }, [router, displayName, handle]);

  const toggleModule = (mod: string) => {
    if (intendedModules.includes(mod)) {
      if (intendedModules.length > 1) {
        setIntendedModules(intendedModules.filter((m) => m !== mod));
      }
    } else {
      setIntendedModules([...intendedModules, mod]);
    }
  };

  const handleCompleteOnboarding = async () => {
    setErrorMsg(null);
    setLoading(true);

    try {
      const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
      if (!cleanHandle || cleanHandle.length < 3) {
        throw new Error("Handle must be at least 3 characters long.");
      }
      if (!displayName.trim()) {
        throw new Error("Please enter your display name.");
      }

      const supabase = createClient();

      // Defensively ensure user_profiles row exists before provisioning workspace
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase.from("user_profiles").upsert(
          {
            id: user.id,
            email: user.email || `${cleanHandle}@biolio.site`,
            full_name: displayName.trim() || user.user_metadata?.full_name || cleanHandle,
            account_status: "active",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      }

      interface ProvisionResponse {
        ok: boolean;
        workspace_id?: string;
        bio_profile_id?: string;
        handle?: string;
        message?: string;
      }

      // Call our atomic PostgreSQL RPC to claim handle and provision workspace
      const { data, error } = await supabase.rpc(
        "provision_workspace_and_claim_handle",
        {
          p_handle: cleanHandle,
          p_display_name: displayName.trim(),
          p_creator_role: creatorRole,
          p_intended_modules: intendedModules,
        }
      );

      if (error) throw error;

      const result = data as unknown as (ProvisionResponse & { status?: string });
      if (!result?.ok && result?.status !== "provisioned") {
        throw new Error(result?.message || "Failed to provision workspace.");
      }

      // If a template was selected and bio_profile was created, update template_id
      if (result.bio_profile_id && selectedTemplate) {
        await supabase
          .from("bio_profiles")
          .update({
            template_id: selectedTemplate,
          })
          .eq("id", result.bio_profile_id);
      }

      // Route directly to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Failed to complete onboarding.");
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4efe7] text-[#211b29]">
        <div className="flex items-center gap-3 text-sm font-semibold text-[#7c727e]">
          <span className="h-4 w-4 rounded-full border-2 border-[#f36b3f] border-t-transparent animate-spin" />
          Verifying creator session...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-6 sm:px-12 bg-[#f4efe7] text-[#211b29]">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#e5dcd1] bg-[#fffdf8] px-3.5 py-1 text-xs font-bold text-[#c45a3a] mb-4">
          STEP {step} OF 3 &bull; ATELIER ONBOARDING
        </div>
        <h2 className="font-editorial text-3xl sm:text-4xl font-bold tracking-tight text-[#211b29]">
          {step === 1 && "Confirm your handle & brand identity"}
          {step === 2 && "Configure your creator intentions"}
          {step === 3 && "Select your launch template"}
        </h2>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-8 shadow-md">
          {errorMsg && (
            <div className="mb-6 rounded-lg bg-[#fce8df] p-3 text-xs text-[#c45a3a] flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Handle & Name */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[#211b29] mb-1.5">
                  Public Handle
                </label>
                <div className="flex items-center rounded-lg border border-[#e5dcd1] bg-[#f4efe7] px-3 py-2.5">
                  <span className="text-xs font-semibold text-[#a99ca7]">
                    biolio.site/
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="yourhandle"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-[#211b29] focus:outline-none"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-[#7c727e]">
                  This forms your permanent bio link URL. You can also connect a custom domain later.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#211b29] mb-1.5">
                  Display / Brand Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Elena Vance"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-[#e5dcd1] bg-[#f4efe7] px-3.5 py-2.5 text-xs text-[#211b29] focus:outline-none focus:border-[#f36b3f]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#211b29] mb-1.5">
                  Creator Role
                </label>
                <select
                  value={creatorRole}
                  onChange={(e) => setCreatorRole(e.target.value)}
                  className="w-full rounded-lg border border-[#e5dcd1] bg-[#f4efe7] px-3.5 py-2.5 text-xs text-[#211b29] focus:outline-none focus:border-[#f36b3f]"
                >
                  <option value="Creator / Influencer">Creator / Influencer</option>
                  <option value="Fashion / Model / Stylist">Fashion / Model / Stylist</option>
                  <option value="Photographer / Artist">Photographer / Artist</option>
                  <option value="Writer / Journalist">Writer / Journalist</option>
                  <option value="Culinary / Hospitality">Culinary / Hospitality</option>
                  <option value="Brand / E-commerce">Brand / E-commerce</option>
                  <option value="Agency / Management">Agency / Management</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!handle.trim() || !displayName.trim()) {
                      setErrorMsg("Please fill in both your handle and brand name.");
                      return;
                    }
                    setErrorMsg(null);
                    setStep(2);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#211b29] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#3a3040] transition-colors"
                >
                  Next: Select Engines
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Engines & Modules */}
          {step === 2 && (
            <div className="space-y-5">
              <p className="text-xs text-[#7c727e]">
                Which Biolio engines do you plan to use? (You can toggle these at any time in your workspace settings).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => toggleModule("bio")}
                  className={`p-5 rounded-xl border cursor-pointer transition-all ${
                    intendedModules.includes("bio")
                      ? "border-[#f36b3f] bg-[#fce8df]/30 shadow-xs"
                      : "border-[#e5dcd1] bg-[#f4efe7] opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-9 w-9 rounded-lg bg-[#fce8df] text-[#f36b3f] flex items-center justify-center">
                      <Globe className="h-5 w-5" />
                    </div>
                    {intendedModules.includes("bio") && (
                      <CheckCircle2 className="h-5 w-5 text-[#f36b3f]" />
                    )}
                  </div>
                  <h4 className="font-editorial text-lg font-bold text-[#211b29]">
                    Bio Website Studio
                  </h4>
                  <p className="text-[11px] text-[#7c727e] mt-1">
                    Editorial link page, image galleries, and micro-blog.
                  </p>
                </div>

                <div
                  onClick={() => toggleModule("automation")}
                  className={`p-5 rounded-xl border cursor-pointer transition-all ${
                    intendedModules.includes("automation")
                      ? "border-[#211b29] bg-[#211b29]/5 shadow-xs"
                      : "border-[#e5dcd1] bg-[#f4efe7] opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-9 w-9 rounded-lg bg-[#211b29] text-white flex items-center justify-center">
                      <Instagram className="h-5 w-5" />
                    </div>
                    {intendedModules.includes("automation") && (
                      <CheckCircle2 className="h-5 w-5 text-[#211b29]" />
                    )}
                  </div>
                  <h4 className="font-editorial text-lg font-bold text-[#211b29]">
                    Instagram Automation
                  </h4>
                  <p className="text-[11px] text-[#7c727e] mt-1">
                    Instant keyword DM triggers & comment auto-replies.
                  </p>
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-bold text-[#7c727e] hover:text-[#211b29]"
                >
                  &larr; Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#211b29] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#3a3040] transition-colors"
                >
                  Next: Pick Template
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Initial Template */}
          {step === 3 && (
            <div className="space-y-5">
              <p className="text-xs text-[#7c727e]">
                Choose your launch aesthetic. You can modify colors, typography, and blocks at any time.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.values(BIOLIO_TEMPLATES).map((template) => (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all text-center ${
                      selectedTemplate === template.id
                        ? "border-[#f36b3f] ring-2 ring-[#f36b3f]/20 bg-[#fff]"
                        : "border-[#e5dcd1] bg-[#f4efe7] hover:bg-[#fff]"
                    }`}
                  >
                    <div
                      className="h-14 rounded-lg mb-2 flex items-center justify-center font-bold text-xs"
                      style={{
                        backgroundColor: template.theme.bg,
                        color: template.theme.text,
                        border: `1px solid ${template.theme.border}`,
                        fontFamily: template.theme.fontHeading,
                      }}
                    >
                      Aa
                    </div>
                    <div className="text-xs font-bold text-[#211b29] truncate">
                      {template.name}
                    </div>
                    <div className="text-[10px] text-[#7c727e] truncate">
                      {template.category}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-[#eee6dc] flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs font-bold text-[#7c727e] hover:text-[#211b29]"
                >
                  &larr; Back
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleCompleteOnboarding}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#f36b3f] px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-[#ee7048] disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    "Provisioning Workspace..."
                  ) : (
                    <>
                      Launch Biolio Workspace
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f4efe7]" />}>
      <OnboardingContent />
    </Suspense>
  );
}

