import { ShieldAlert } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminFlagsPage() {
  const supabase = createAdminClient();

  const { data: settings } = await supabase
    .from("platform_settings")
    .select("*");

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-white mb-2">
          Emergency Killswitches &amp; Feature Flags
        </h1>
        <p className="text-xs text-[#9e94a3]">
          Fail-closed global switches and gradual rollout flags across the entire platform.
        </p>
      </div>

      {/* Emergency Platform Switches */}
      <div className="rounded-2xl border border-[#26202f] bg-[#18141f] p-7 shadow-xs">
        <div className="flex items-center gap-2 pb-4 border-b border-[#26202f] mb-6">
          <ShieldAlert className="h-5 w-5 text-[#f36b3f]" />
          <h3 className="font-editorial text-xl font-bold text-white">
            Global Emergency Killswitches ({settings?.length || 0})
          </h3>
        </div>

        <div className="space-y-4">
          {settings && settings.length > 0 ? (
            settings.map((setting) => (
              <div
                key={setting.key}
                className="p-4 rounded-xl border border-[#26202f] bg-[#120f17] flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-white font-mono">
                    {setting.key}
                  </div>
                  <div className="text-[11px] text-[#9e94a3] mt-0.5">
                    Version: v{setting.version} &bull; Public Readable:{" "}
                    {setting.is_public_readable ? "Yes" : "No"}
                  </div>
                </div>
                <span className="rounded-full bg-[#1b332b] px-3 py-1 text-xs font-bold text-[#6ac2a2]">
                  {JSON.stringify(setting.value)}
                </span>
              </div>
            ))
          ) : (
            <div className="p-4 rounded-xl border border-[#26202f] bg-[#120f17] text-xs text-[#7c727e]">
              No custom platform settings active.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
