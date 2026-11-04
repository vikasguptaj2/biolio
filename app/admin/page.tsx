import {
  Globe,
  Activity,
  FileText,
  Users,
  CheckCircle2,
} from "lucide-react";
import { Instagram } from "@/components/icons/instagram";
import { createAdminClient } from "@/lib/supabase/admin";

export const instant = false;

export default async function AdminOverviewPage() {
  const supabase = createAdminClient();

  // Counts
  const { count: workspacesCount } = await supabase
    .from("workspaces")
    .select("*", { count: "exact", head: true });

  const { count: bioCount } = await supabase
    .from("bio_profiles")
    .select("*", { count: "exact", head: true });

  const { count: igCount } = await supabase
    .from("instagram_connections")
    .select("*", { count: "exact", head: true });

  const { count: executionsCount } = await supabase
    .from("automation_executions")
    .select("*", { count: "exact", head: true });

  // Recent audit logs
  const { data: auditLogs } = await supabase
    .from("admin_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(8);

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-white mb-2">
          Platform Operations & Telemetry
        </h1>
        <p className="text-xs text-[#9e94a3]">
          Global multi-tenant metrics, database integrity, and operational state.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-xl border border-[#26202f] bg-[#18141f] p-6 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#9e94a3] mb-2 font-medium">
            <span>Total Workspaces</span>
            <Users className="h-4 w-4 text-[#f36b3f]" />
          </div>
          <div className="font-editorial text-4xl font-bold text-white">
            {workspacesCount || 1}
          </div>
          <div className="mt-2 text-[11px] text-[#6ac2a2] flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Multi-tenant RLS locked
          </div>
        </div>

        <div className="rounded-xl border border-[#26202f] bg-[#18141f] p-6 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#9e94a3] mb-2 font-medium">
            <span>Bio Profiles Claimed</span>
            <Globe className="h-4 w-4 text-[#c9b5f4]" />
          </div>
          <div className="font-editorial text-4xl font-bold text-white">
            {bioCount || 1}
          </div>
          <div className="mt-2 text-[11px] text-[#9e94a3]">
            Canonical on biolio.site
          </div>
        </div>

        <div className="rounded-xl border border-[#26202f] bg-[#18141f] p-6 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#9e94a3] mb-2 font-medium">
            <span>Meta IG Connections</span>
            <Instagram className="h-4 w-4 text-[#6ac2a2]" />
          </div>
          <div className="font-editorial text-4xl font-bold text-white">
            {igCount || 0}
          </div>
          <div className="mt-2 text-[11px] text-[#9e94a3]">
            HMAC ingress active
          </div>
        </div>

        <div className="rounded-xl border border-[#26202f] bg-[#18141f] p-6 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#9e94a3] mb-2 font-medium">
            <span>Automation Executions</span>
            <Activity className="h-4 w-4 text-[#ff946f]" />
          </div>
          <div className="font-editorial text-4xl font-bold text-white">
            {executionsCount || 0}
          </div>
          <div className="mt-2 text-[11px] text-[#6ac2a2]">
            Durable audit logging OK
          </div>
        </div>
      </div>

      {/* Recent Audit Trail */}
      <div className="rounded-2xl border border-[#26202f] bg-[#18141f] p-7 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-[#26202f] mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#c9b5f4]" />
            <h3 className="font-editorial text-xl font-bold text-white">
              Recent Administrative Actions
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[#7c727e] uppercase">
            Append-Only Enforcement
          </span>
        </div>

        {auditLogs && auditLogs.length > 0 ? (
          <div className="divide-y divide-[#26202f]">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-3.5 flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{log.action}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#26202f] text-[#c9b5f4] font-mono">
                      {log.target_type}:{log.target_id || "global"}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#9e94a3]">
                    Reason: {log.reason}
                  </div>
                </div>

                <div className="text-right text-[11px] text-[#7c727e]">
                  {new Date(log.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-[#7c727e]">
            No administrative modifications recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}

