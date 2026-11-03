import { ShieldCheck } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminAuditPage() {
  const supabase = createAdminClient();

  const { data: logs } = await supabase
    .from("admin_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-white mb-2">
          Append-Only Audit Trail
        </h1>
        <p className="text-xs text-[#9e94a3]">
          Every staff operation, ban, entitlement alteration, and security override is immutably written here. Updates and deletions are blocked at the database trigger level.
        </p>
      </div>

      <div className="rounded-2xl border border-[#26202f] bg-[#18141f] shadow-xs overflow-hidden">
        <div className="p-6 border-b border-[#26202f] flex items-center justify-between">
          <div className="text-xs font-bold text-white">
            Audit Records ({logs?.length || 0})
          </div>
          <div className="text-[10px] text-[#6ac2a2] flex items-center gap-1 font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" />
            Append-Only Trigger Active
          </div>
        </div>

        <div className="divide-y divide-[#26202f]">
          {logs && logs.length > 0 ? (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#1f1a28] transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white text-sm">
                      {log.action}
                    </span>
                    <span className="rounded bg-[#26202f] px-2 py-0.5 text-[10px] font-mono text-[#c9b5f4]">
                      {log.target_type}:{log.target_id || "global"}
                    </span>
                    <span className="rounded bg-[#1b332b] px-2 py-0.5 text-[10px] font-bold text-[#6ac2a2]">
                      {log.result_status}
                    </span>
                  </div>

                  <div className="text-xs text-[#9e94a3]">
                    Reason: <span className="text-white italic">{log.reason}</span>
                  </div>
                </div>

                <div className="text-right text-xs text-[#7c727e] font-mono">
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-xs text-[#7c727e]">
              No audit logs recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

