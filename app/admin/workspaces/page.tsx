import { ExternalLink } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminWorkspacesPage() {
  const supabase = createAdminClient();

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("*, workspace_entitlements(*)")
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-white mb-2">
          Workspaces & Claimed Handles
        </h1>
        <p className="text-xs text-[#9e94a3]">
          Inspect tenant environments, reserved slugs, and enforce platform compliance.
        </p>
      </div>

      <div className="rounded-2xl border border-[#26202f] bg-[#18141f] shadow-xs overflow-hidden">
        <div className="p-6 border-b border-[#26202f] flex items-center justify-between">
          <div className="text-xs font-bold text-white">
            All Registered Workspaces ({workspaces?.length || 0})
          </div>
        </div>

        <div className="divide-y divide-[#26202f]">
          {workspaces && workspaces.length > 0 ? (
            workspaces.map((ws) => (
              <div
                key={ws.id}
                className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#1f1a28] transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-editorial text-lg font-bold text-white">
                      {ws.name}
                    </span>
                    <span className="rounded bg-[#26202f] px-2 py-0.5 text-[11px] font-mono text-[#c9b5f4]">
                      /{ws.slug}
                    </span>
                  </div>
                  <div className="text-xs text-[#9e94a3]">
                    Role: {ws.creator_role || "Creator"} &bull; Created:{" "}
                    {new Date(ws.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <a
                    href={`/${ws.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#342b3d] bg-[#120f17] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#26202f] transition-colors"
                  >
                    <span>View Bio</span>
                    <ExternalLink className="h-3 w-3 text-[#f36b3f]" />
                  </a>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-xs text-[#7c727e]">
              No workspaces found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

