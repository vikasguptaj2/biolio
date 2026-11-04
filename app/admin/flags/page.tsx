import { createAdminClient } from "@/lib/supabase/admin";
import { FeatureFlagToggleButton } from "@/components/admin/admin-controls";
import { Flag, ShieldAlert, CheckCircle2 } from "lucide-react";

export const instant = false;

export default async function AdminFlagsPage() {
  const adminDb = createAdminClient();

  const { data: flags } = await adminDb
    .from("feature_flags")
    .select("*")
    .order("key", { ascending: true });

  return (
    <div className="space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-[#a62639]/20 border border-[#a62639]/40 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#ff8f85] mb-3">
          <Flag className="h-3.5 w-3.5" />
          Operational Circuit Breakers
        </div>
        <h1 className="font-display text-3xl font-extrabold text-white tracking-tight">
          Global Feature Flags &amp; Killswitches
        </h1>
        <p className="text-xs text-[#9e93a4] mt-1">
          Seeded operational killswitches from <code className="text-white">006_v6_seeds_and_bootstrap.sql</code>. Toggle circuit breakers live to halt Meta webhook ingestion or outbound DM dispatch during incidents.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {flags && flags.length > 0 ? (
          flags.map((flag: { key: string; description: string | null; is_enabled: boolean }) => {
            const isKillswitch = flag.key.startsWith("killswitch.");
            return (
              <div
                key={flag.key}
                className={`rounded-2xl border p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isKillswitch && flag.is_enabled
                    ? "border-[#a62639] bg-[#a62639]/15"
                    : "border-[#2e2638] bg-[#1d1824]"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="font-mono text-sm font-bold text-white">
                      {flag.key}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        isKillswitch
                          ? "bg-[#a62639]/25 text-[#ff8f85]"
                          : "bg-[#c9b5f4]/20 text-[#c9b5f4]"
                      }`}
                    >
                      {isKillswitch ? "Killswitch" : "Feature Flag"}
                    </span>
                  </div>
                  <p className="text-xs text-[#9e93a4]">{flag.description}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {flag.is_enabled ? (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold ${
                        isKillswitch
                          ? "bg-[#a62639]/30 text-[#ff8f85]"
                          : "bg-[#277a67]/25 text-[#6ac2a2]"
                      }`}
                    >
                      {isKillswitch ? (
                        <ShieldAlert className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {isKillswitch ? "KILLSWITCH ACTIVE" : "ENABLED"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#2a2333] px-3.5 py-2 text-xs font-bold text-[#9e93a4]">
                      {isKillswitch ? "Nominal (Inactive)" : "Disabled"}
                    </span>
                  )}

                  <FeatureFlagToggleButton
                    flagKey={flag.key}
                    isEnabled={Boolean(flag.is_enabled)}
                    isKillswitch={isKillswitch}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-[#2e2638] bg-[#1d1824] p-8 text-center text-xs text-[#9e93a4]">
            No feature flags found. Run migration 006 to seed global killswitches.
          </div>
        )}
      </div>
    </div>
  );
}
