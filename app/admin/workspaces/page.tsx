import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateWorkspaceEntitlements } from "@/lib/entitlements";
import { WorkspaceEntitlementControl } from "@/components/admin/admin-controls";
import { Users, CheckCircle2, Ban, ExternalLink, Lock } from "lucide-react";
import Link from "next/link";

interface AdminWorkspaceItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  creator_role?: string | null;
  intended_modules?: string[] | null;
  created_at: string;
  workspace_entitlements?: Record<string, unknown> | Array<Record<string, unknown>> | null;
}

export const instant = false;

export default async function AdminWorkspacesPage() {
  const adminDb = createAdminClient();

  const { data: workspaces } = await adminDb
    .from("workspaces")
    .select(
      "id, name, slug, status, creator_role, intended_modules, created_at, workspace_entitlements(*)"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-[#f36b3f]/15 border border-[#f36b3f]/30 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#ff946f] mb-3">
          <Users className="h-3.5 w-3.5" />
          Tenant &amp; Single-Product Lock Governance
        </div>
        <h1 className="font-display text-3xl font-extrabold text-white tracking-tight">
          Workspaces, Handles &amp; Product Entitlements
        </h1>
        <p className="text-xs text-[#9e93a4] mt-1">
          Inspect creator workspaces and override their active subscription scope between Starter Free, Biolio Bio Standalone (Locks IG Automation), Instagram Automation Standalone (Locks Bio Studio), or All-in-One Bundle.
        </p>
      </div>

      <div className="rounded-2xl border border-[#2e2638] bg-[#1d1824] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#2e2638] text-[10px] font-bold uppercase tracking-wider text-[#9e93a4]">
                <th className="py-3.5 px-5">Workspace / Handle</th>
                <th className="py-3.5 px-5">Active Scope &amp; Locks</th>
                <th className="py-3.5 px-5">Bio Tier / Ig Tier</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">
                  Override Plan &amp; Product Lock
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2e2638] text-xs">
              {workspaces && workspaces.length > 0 ? (
                (workspaces as unknown as AdminWorkspaceItem[]).map((ws) => {
                  const entRaw = Array.isArray(ws.workspace_entitlements)
                    ? ws.workspace_entitlements[0]
                    : ws.workspace_entitlements;
                  const evaluated = evaluateWorkspaceEntitlements(
                    entRaw,
                    ws.intended_modules
                  );

                  return (
                    <tr
                      key={ws.id}
                      className="hover:bg-[#251e2e]/60 transition-colors"
                    >
                      <td className="py-4 px-5">
                        <div className="font-bold text-white">{ws.name}</div>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#f36b3f] font-mono">
                          <span>@{ws.slug}</span>
                          <Link
                            href={`/${ws.slug}`}
                            target="_blank"
                            className="hover:underline inline-flex items-center gap-0.5"
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                          </Link>
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <div className="font-bold text-[#e5dcd1]">
                          {evaluated.activePlanLabel}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {evaluated.isBioProductLocked ? (
                            <span className="inline-flex items-center gap-1 rounded bg-[#a62639]/25 px-2 py-0.5 text-[10px] font-bold text-[#ff8f85]">
                              <Lock className="h-2.5 w-2.5" /> Bio Studio Locked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-[#277a67]/25 px-2 py-0.5 text-[10px] font-bold text-[#6ac2a2]">
                              Bio Active
                            </span>
                          )}
                          {evaluated.isAutomationProductLocked ? (
                            <span className="inline-flex items-center gap-1 rounded bg-[#a62639]/25 px-2 py-0.5 text-[10px] font-bold text-[#ff8f85]">
                              <Lock className="h-2.5 w-2.5" /> IG Automation Locked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-[#277a67]/25 px-2 py-0.5 text-[10px] font-bold text-[#6ac2a2]">
                              IG Active ({evaluated.automationMonthlyActionQuota.toLocaleString()}/mo)
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-[#2a2333] px-2 py-0.5 text-[10px] font-bold uppercase text-[#c9b5f4]">
                            Bio: {evaluated.bioTier}
                          </span>
                          <span className="rounded bg-[#2a2333] px-2 py-0.5 text-[10px] font-bold uppercase text-[#ff946f]">
                            IG: {evaluated.igTier}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        {ws.status === "active" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#277a67]/20 px-2.5 py-0.5 text-[10px] font-bold text-[#6ac2a2]">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#a62639]/20 px-2.5 py-0.5 text-[10px] font-bold text-[#ff8f85]">
                            <Ban className="h-3 w-3" /> {ws.status}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-5 text-right">
                        <WorkspaceEntitlementControl
                          workspaceId={ws.id}
                          currentPlanId={evaluated.activePlanId}
                          currentStatus={ws.status}
                        />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="py-10 text-center text-[#9e93a4]"
                  >
                    No workspaces provisioned yet.
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
