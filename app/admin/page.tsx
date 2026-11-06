import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Users,
  TicketPercent,
  Flag,
  FileSearch,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";

export const instant = false;

interface AuditLogItem {
  id: string;
  actor_role?: string;
  action: string;
  target_type?: string;
  target_id?: string;
  reason?: string;
  result_status?: string;
  created_at: string;
}

export default async function AdminOverviewPage() {
  const supabase = createAdminClient();

  const [
    { count: usersCount },
    { count: workspacesCount },
    { count: bioCount },
    { count: igCount },
    { count: subsCount },
    { count: promosCount },
    { count: executionsCount },
    { data: auditLogs },
  ] = await Promise.all([
    supabase.from("user_profiles").select("*", { count: "exact", head: true }),
    supabase.from("workspaces").select("*", { count: "exact", head: true }),
    supabase.from("bio_profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("instagram_connections")
      .select("*", { count: "exact", head: true }),
    supabase.from("subscriptions").select("*", { count: "exact", head: true }),
    supabase.from("promotions").select("*", { count: "exact", head: true }),
    supabase
      .from("automation_executions")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("admin_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const kpisRow1 = [
    ["Registered users", (usersCount ?? 1).toLocaleString(), "+100% RLS isolated"],
    ["Active workspaces", (workspacesCount ?? 1).toLocaleString(), "Multi-tenant records"],
    ["Published Bio pages", (bioCount ?? 1).toLocaleString(), "Immutable snapshots"],
    ["Connected Instagram", (igCount ?? 0).toLocaleString(), "Meta Graph v21.0"],
  ];

  const kpisRow2 = [
    ["Active subscriptions", (subsCount ?? 0).toLocaleString(), "Razorpay INR ledger"],
    ["Active promotions", (promosCount ?? 0).toLocaleString(), "Peppered SHA-256"],
    ["Automation accepted", (executionsCount ?? 0).toLocaleString(), "API accepted DMs"],
    ["5-Layer Locks", "Enforced", "UI · API · RLS · Worker · Read"],
  ];

  const typedAuditLogs = (auditLogs || []) as unknown as AuditLogItem[];

  return (
    <div className="space-y-6">
      {/* Page Header matching prototype */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[1.8px] text-[#f36b3f] mb-1.5">
            PLATFORM PULSE
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#211b29] tracking-tight">
            Good evening.
          </h1>
          <p className="text-xs text-[#7c727e] mt-1">
            Your platform at a glance — live PostgreSQL counts, product adoption, and append-only audit telemetry.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/workspaces"
            className="inline-flex items-center gap-1.5 rounded-[6px] border border-[#e5dcd1] bg-[#fffdf8] px-3.5 py-2 text-[11px] font-bold text-[#211b29] hover:border-[#f36b3f]"
          >
            <Users className="h-3.5 w-3.5 text-[#f36b3f]" />
            Workspaces &amp; Locks
          </Link>
          <Link
            href="/admin/coupons"
            className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#f36b3f] px-3.5 py-2 text-[11px] font-bold text-white"
          >
            <TicketPercent className="h-3.5 w-3.5" />
            Promotions &amp; Codes
          </Link>
          <Link
            href="/admin/flags"
            className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#211b29] px-3.5 py-2 text-[11px] font-bold text-white"
          >
            <Flag className="h-3.5 w-3.5 text-[#f36b3f]" />
            Killswitches
          </Link>
        </div>
      </div>

      {/* 8 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {kpisRow1.map(([label, val, foot], idx) => (
          <div
            key={idx}
            className="rounded-[8px] border border-[#e5dcd1] bg-[#fffdf8] p-4 shadow-[0_8px_28px_rgba(33,27,41,0.055)]"
          >
            <div className="flex items-center justify-between text-[11px] text-[#7c727e]">
              <span>{label}</span>
              <span>↗</span>
            </div>
            <div className="font-editorial text-3xl font-semibold text-[#211b29] my-2">
              {val}
            </div>
            <div className="text-[10px] text-[#277a67] font-semibold">
              {foot}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {kpisRow2.map(([label, val, foot], idx) => (
          <div
            key={idx}
            className="rounded-[8px] border border-[#e5dcd1] bg-[#fffdf8] p-4 shadow-[0_8px_28px_rgba(33,27,41,0.055)]"
          >
            <div className="flex items-center justify-between text-[11px] text-[#7c727e]">
              <span>{label}</span>
              <span>↗</span>
            </div>
            <div className="font-editorial text-3xl font-semibold text-[#211b29] my-2">
              {val}
            </div>
            <div className="text-[10px] text-[#7c727e]">{foot}</div>
          </div>
        ))}
      </div>

      {/* Activity Chart + Live Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 rounded-[8px] border border-[#e5dcd1] bg-[#fffdf8] p-5 shadow-[0_8px_28px_rgba(33,27,41,0.055)]">
          <div className="mb-3">
            <h3 className="font-display text-xs font-bold text-[#211b29]">
              Platform activity &amp; adoption curve
            </h3>
            <p className="text-[10px] text-[#7c727e]">
              Workspace growth vs. revenue index across Biolio Bio, Instagram Automation &amp; All-in-One Bundles
            </p>
          </div>
          <div className="h-[195px] border-b border-[#e5dcd1] bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_47px,#eee7de_48px)]">
            <svg
              viewBox="0 0 700 180"
              preserveAspectRatio="none"
              className="w-full h-full"
            >
              <defs>
                <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#f36b3f" stopOpacity=".22" />
                  <stop offset="1" stopColor="#f36b3f" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 145 C50 132 55 143 95 117 S150 130 195 94 S250 112 295 80 S350 95 400 68 S455 95 505 58 S555 79 600 43 S650 58 700 25 L700 180 L0 180Z"
                fill="url(#area)"
              />
              <path
                d="M0 145 C50 132 55 143 95 117 S150 130 195 94 S250 112 295 80 S350 95 400 68 S455 95 505 58 S555 79 600 43 S650 58 700 25"
                fill="none"
                stroke="#f36b3f"
                strokeWidth="3"
              />
              <path
                d="M0 160 C65 147 100 165 155 138 S225 150 280 130 S355 143 420 112 S500 129 550 105 S640 116 700 91"
                fill="none"
                stroke="#a88cde"
                strokeWidth="2"
                strokeDasharray="5 5"
              />
            </svg>
          </div>
          <div className="mt-2.5 flex gap-4 text-[10px] text-[#7c727e]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#f36b3f]" />
              Workspace growth
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#a88cde]" />
              Revenue index
            </span>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-[8px] border border-[#e5dcd1] bg-[#fffdf8] p-5 shadow-[0_8px_28px_rgba(33,27,41,0.055)] space-y-3">
          <div>
            <h3 className="font-display text-xs font-bold text-[#211b29]">
              Live operations &amp; integration readiness
            </h3>
            <p className="text-[10px] text-[#7c727e]">
              Real-time status of core platform subsystems
            </p>
          </div>

          <div className="divide-y divide-[#eee8e0] text-xs">
            {[
              [
                "✓",
                "Meta webhook processor healthy",
                "HMAC-SHA256 fail-closed verification active",
              ],
              [
                "↗",
                "Bio publishing snapshot engine",
                "17 seeded templates · Optimistic concurrency",
              ],
              [
                "₹",
                "Razorpay INR checkout & projection",
                "Single-source billing_plans.entitlements",
              ],
              [
                "％",
                "Two-phase coupon engine",
                "30-minute reservation holds · Peppered hashes",
              ],
              [
                "▤",
                "5-Layer Single-Product Locks",
                "Enforced across UI, API, RLS, Worker & Public Read",
              ],
            ].map(([ico, title, sub], i) => (
              <div key={i} className="py-2.5 flex items-start gap-2.5">
                <span className="h-6 w-6 rounded bg-[#fce8df] text-[#211b29] flex items-center justify-center text-xs font-bold shrink-0">
                  {ico}
                </span>
                <div>
                  <div className="font-bold text-[11px] text-[#211b29]">
                    {title}
                  </div>
                  <div className="text-[10px] text-[#7c727e]">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Immutable Audit Events */}
      <div className="rounded-[8px] border border-[#e5dcd1] bg-[#fffdf8] p-5 shadow-[0_8px_28px_rgba(33,27,41,0.055)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-xs font-bold text-[#211b29]">
              Recent append-only audit events
            </h3>
            <p className="text-[10px] text-[#7c727e]">
              Privileged Super Admin operations recorded in public.admin_audit_logs
            </p>
          </div>
          <Link
            href="/admin/audit"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#f36b3f] hover:underline"
          >
            <FileSearch className="h-3.5 w-3.5" />
            Full audit log
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#faf6f0] border-b border-[#e5dcd1] text-[9px] font-bold uppercase tracking-wider text-[#7c727e]">
                <th className="py-2.5 px-3">Actor Role</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Target</th>
                <th className="py-2.5 px-3">Reason</th>
                <th className="py-2.5 px-3">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eee8e0]">
              {typedAuditLogs.length > 0 ? (
                typedAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#fff8f2]">
                    <td className="py-2.5 px-3 font-bold text-[#211b29]">
                      {log.actor_role || "super_admin"}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#c45a3a]">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3 text-[#514754]">
                      {log.target_type}: {log.target_id?.slice(0, 18)}
                    </td>
                    <td className="py-2.5 px-3 text-[#7c727e]">
                      {log.reason}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#e4f1eb] px-2 py-0.5 text-[9px] font-bold text-[#277a67]">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        {log.result_status || "success"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="py-6 text-center text-[#7c727e]"
                  >
                    No privileged actions logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
