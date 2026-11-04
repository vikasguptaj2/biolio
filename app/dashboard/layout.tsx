import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { evaluateWorkspaceEntitlements } from "@/lib/entitlements";

export const instant = false;
import {
  LayoutDashboard,
  Globe,
  MessageSquareCode,
  BarChart3,
  CreditCard,
  Settings,
  ExternalLink,
  LogOut,
  ShieldAlert,
  Lock,
  Sparkles,
} from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Fetch active workspace + entitlements for this user
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select(
      "id, name, slug, status, intended_modules, workspace_entitlements(*)"
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);

  interface WorkspaceLayoutItem {
    id: string;
    name: string;
    slug: string;
    status: string;
    intended_modules?: string[] | null;
    workspace_entitlements?: Record<string, unknown> | Array<Record<string, unknown>> | null;
  }

  const activeWorkspace = (workspaces?.[0] as unknown) as WorkspaceLayoutItem | undefined;
  const rawEnt = Array.isArray(activeWorkspace?.workspace_entitlements)
    ? activeWorkspace.workspace_entitlements[0]
    : activeWorkspace?.workspace_entitlements;

  const entitlements = evaluateWorkspaceEntitlements(
    rawEnt,
    activeWorkspace?.intended_modules
  );

  const navItems = [
    {
      name: "Overview",
      href: "/dashboard",
      icon: LayoutDashboard,
      locked: false,
    },
    {
      name: "Bio Website Studio",
      href: "/dashboard/bio",
      icon: Globe,
      locked: entitlements.isBioProductLocked,
      tierBadge: entitlements.isBioProductLocked
        ? "LOCKED"
        : entitlements.bioTier.toUpperCase(),
    },
    {
      name: "IG DM Automation",
      href: "/dashboard/automation",
      icon: MessageSquareCode,
      locked: entitlements.isAutomationProductLocked,
      tierBadge: entitlements.isAutomationProductLocked
        ? "LOCKED"
        : entitlements.igTier.toUpperCase(),
    },
    {
      name: "Privacy Analytics",
      href: "/dashboard/analytics",
      icon: BarChart3,
      locked: false,
    },
    {
      name: "Billing & Coupons",
      href: "/dashboard/billing",
      icon: CreditCard,
      locked: false,
    },
    {
      name: "Workspace Settings",
      href: "/dashboard/settings",
      icon: Settings,
      locked: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#fbf8f2] flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-68 border-b md:border-b-0 md:border-r border-[#e5dcd1] bg-[#fffdf8] flex flex-col justify-between shrink-0">
        <div className="p-6">
          {/* Brand Header */}
          <div className="flex items-center justify-between mb-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f36b3f] text-white font-display font-extrabold text-base shadow-sm">
                B
              </div>
              <span className="font-display font-extrabold text-xl tracking-tighter text-[#211b29]">
                Biolio<span className="text-[#f36b3f]">.</span>
              </span>
            </Link>
            <span className="rounded-full bg-[#f3ece2] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#211b29]">
              v6.0
            </span>
          </div>

          {/* Workspace Pill + Active Plan Scope */}
          {activeWorkspace ? (
            <div className="mb-6 rounded-2xl border border-[#e5dcd1] bg-[#fbf8f2] p-3.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#7c727e]">
                Active Workspace
              </div>
              <div className="font-display font-bold text-sm text-[#211b29] truncate">
                {activeWorkspace.name}
              </div>
              <Link
                href={`/${activeWorkspace.slug}`}
                target="_blank"
                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#f36b3f] hover:underline"
              >
                biolio.site/{activeWorkspace.slug}
                <ExternalLink className="h-3 w-3" />
              </Link>

              <div className="mt-3 pt-2.5 border-t border-[#e5dcd1] flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#211b29]">
                  <Sparkles className="h-3 w-3 text-[#f36b3f]" />
                  {entitlements.scope === "bio_only"
                    ? "Bio Standalone"
                    : entitlements.scope === "automation_only"
                    ? "IG Standalone"
                    : entitlements.scope === "bundle"
                    ? "All-in-One Bundle"
                    : "Starter Free"}
                </span>
                <Link
                  href="/dashboard/billing"
                  className="text-[10px] font-bold text-[#f36b3f] hover:underline"
                >
                  Change Plan
                </Link>
              </div>
            </div>
          ) : (
            <div className="mb-6 rounded-2xl border border-dashed border-[#f36b3f] bg-[#fff5f0] p-3.5">
              <div className="text-xs font-bold text-[#211b29] mb-1">
                No handle claimed yet
              </div>
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#f36b3f] hover:underline"
              >
                Claim your handle &rarr;
              </Link>
            </div>
          )}

          {/* Navigation */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#4b4351] hover:bg-[#f3ece2] hover:text-[#211b29] transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-[#f36b3f]" />
                    {item.name}
                  </span>
                  {item.tierBadge && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${
                        item.locked
                          ? "bg-[#a62639]/15 text-[#a62639]"
                          : "bg-[#277a67]/15 text-[#1e6051]"
                      }`}
                    >
                      {item.locked && <Lock className="h-2.5 w-2.5" />}
                      {item.tierBadge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer */}
        <div className="p-6 border-t border-[#e5dcd1] space-y-3">
          <Link
            href="/admin/login"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold text-[#7c727e] hover:bg-[#f3ece2] hover:text-[#211b29] transition-colors"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-[#f36b3f]" />
            Super Admin Console
          </Link>
          <div className="px-3 text-[11px] text-[#7c727e] truncate">
            {user.email}
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-[#a62639] hover:bg-[#fde8eb] transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="mx-auto max-w-6xl">
          <Suspense
            fallback={
              <div className="p-8 text-xs text-[#7c727e] animate-pulse">
                Loading dashboard...
              </div>
            }
          >
            {children}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
