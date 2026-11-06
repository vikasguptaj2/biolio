import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { evaluateWorkspaceEntitlements } from "@/lib/entitlements";
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

export const instant = false;

interface WorkspaceRow {
  id: string;
  name: string;
  slug: string;
  creator_role?: string | null;
  status: string;
  intended_modules?: string[] | null;
  workspace_entitlements?: Record<string, unknown> | Array<Record<string, unknown>> | null;
}

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
      "id, name, slug, creator_role, status, intended_modules, workspace_entitlements(*)"
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);

  const activeWorkspace = (workspaces?.[0] as unknown as WorkspaceRow) || null;
  const rawEnt = Array.isArray(activeWorkspace?.workspace_entitlements)
    ? activeWorkspace.workspace_entitlements[0]
    : activeWorkspace?.workspace_entitlements;

  const entitlements = evaluateWorkspaceEntitlements(
    rawEnt as Record<string, unknown> | undefined,
    activeWorkspace?.intended_modules
  );

  const initials = (activeWorkspace?.name || user.email || "AM")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#f4efe7] text-[#211b29] flex flex-col md:flex-row">
      {/* Atelier Concept 03 Dark Ink Navigation Sidebar (#211b29) */}
      <aside className="w-full md:w-[258px] bg-[#211b29] text-white flex flex-col justify-between shrink-0 md:h-screen md:sticky md:top-0 shadow-[10px_0_40px_rgba(29,22,31,0.08)]">
        <div className="p-5 overflow-y-auto">
          {/* Wordmark */}
          <div className="flex items-center justify-between mb-6 px-1">
            <Link
              href="/dashboard"
              className="font-display text-[27px] font-extrabold tracking-[-1.8px] text-white"
            >
              biolio<span className="text-[#f36b3f]">.</span>
            </Link>
            <span className="rounded bg-white/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#e4d8ed]">
              Atelier v6
            </span>
          </div>

          {/* Workspace Switcher Card */}
          {activeWorkspace ? (
            <div className="mb-6 rounded-[7px] border border-white/15 bg-white/[0.06] p-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#f4b69d] to-[#c9b5f4] flex items-center justify-center font-extrabold text-xs text-[#211b29] shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">
                    {activeWorkspace.name}
                  </div>
                  <div className="text-[10px] text-[#b9aebb] truncate">
                    @{activeWorkspace.slug}
                  </div>
                </div>
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px]">
                <span className="text-[#ff9c7e] font-bold">
                  {entitlements.activePlanLabel}
                </span>
                <Link
                  href={`/${activeWorkspace.slug}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-[#c9b5f4] hover:underline"
                >
                  Live ↗
                </Link>
              </div>
            </div>
          ) : (
            <div className="mb-6 rounded-[7px] border border-dashed border-[#f36b3f] bg-[#f36b3f]/15 p-3">
              <div className="text-xs font-bold text-white">
                No handle claimed yet
              </div>
              <Link
                href="/onboarding"
                className="mt-1 inline-block text-[11px] font-bold text-[#ff9c7e] hover:underline"
              >
                Complete onboarding &rarr;
              </Link>
            </div>
          )}

          {/* Section 1: Workspace */}
          <div className="text-[9px] font-extrabold uppercase tracking-[1.7px] text-[#a89bac] px-2.5 mb-1.5">
            Workspace
          </div>
          <nav className="space-y-1 mb-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 rounded-[6px] px-2.5 py-2.5 text-[11px] font-semibold text-[#c9c0cb] hover:bg-white/10 hover:text-white transition-colors"
            >
              <LayoutDashboard className="h-4 w-4 text-[#f36b3f]" />
              Overview
            </Link>
          </nav>

          {/* Section 2: Biolio Bio */}
          <div className="flex items-center justify-between px-2.5 mb-1.5 mt-4">
            <span className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[1.3px] text-[#9b8da0]">
              <span className="h-2 w-2 rounded-full bg-[#f36b3f]" />
              Biolio Bio
            </span>
            {entitlements.isBioProductLocked ? (
              <span className="inline-flex items-center gap-1 rounded bg-[#a62639]/30 px-1.5 py-0.5 text-[8px] font-extrabold uppercase text-[#ff8f85]">
                <Lock className="h-2.5 w-2.5" /> Locked
              </span>
            ) : (
              <span className="rounded bg-white/15 px-1.5 py-0.5 text-[8px] font-extrabold uppercase text-[#e4d8ed]">
                {entitlements.bioTier}
              </span>
            )}
          </div>
          <nav className="space-y-1 mb-4">
            <Link
              href="/dashboard/bio"
              className="flex items-center justify-between rounded-[6px] px-2.5 py-2 text-[11px] font-semibold text-[#c9c0cb] hover:bg-white/10 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <Globe className="h-4 w-4 text-[#ff9c7e]" />
                Website builder &amp; studio
              </span>
              <span className="rounded bg-[#f36b3f]/25 px-1.5 py-0.5 text-[8px] font-extrabold text-[#ff9c7e]">
                LIVE
              </span>
            </Link>
            <Link
              href="/dashboard/analytics"
              className="flex items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-[11px] font-semibold text-[#c9c0cb] hover:bg-white/10 hover:text-white transition-colors"
            >
              <BarChart3 className="h-4 w-4 text-[#c9b5f4]" />
              Bio analytics &amp; insights
            </Link>
          </nav>

          {/* Section 3: Instagram Automation */}
          <div className="flex items-center justify-between px-2.5 mb-1.5 mt-4">
            <span className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[1.3px] text-[#9b8da0]">
              <span className="h-2 w-2 rounded-full bg-[#6ac2a2]" />
              Instagram Automation
            </span>
            {entitlements.isAutomationProductLocked ? (
              <span className="inline-flex items-center gap-1 rounded bg-[#a62639]/30 px-1.5 py-0.5 text-[8px] font-extrabold uppercase text-[#ff8f85]">
                <Lock className="h-2.5 w-2.5" /> Locked
              </span>
            ) : (
              <span className="rounded bg-white/15 px-1.5 py-0.5 text-[8px] font-extrabold uppercase text-[#6ac2a2]">
                {entitlements.igTier}
              </span>
            )}
          </div>
          <nav className="space-y-1 mb-4">
            <Link
              href="/dashboard/automation"
              className="flex items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-[11px] font-semibold text-[#c9c0cb] hover:bg-white/10 hover:text-white transition-colors"
            >
              <MessageSquareCode className="h-4 w-4 text-[#6ac2a2]" />
              Automations &amp; flow builder
            </Link>
          </nav>

          {/* Section 4: Account & Billing */}
          <div className="text-[9px] font-extrabold uppercase tracking-[1.7px] text-[#a89bac] px-2.5 mb-1.5 mt-4">
            Billing &amp; Settings
          </div>
          <nav className="space-y-1">
            <Link
              href="/dashboard/billing"
              className="flex items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-[11px] font-semibold text-[#c9c0cb] hover:bg-white/10 hover:text-white transition-colors"
            >
              <CreditCard className="h-4 w-4 text-[#f36b3f]" />
              Plans, locks &amp; coupons
            </Link>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-[11px] font-semibold text-[#c9c0cb] hover:bg-white/10 hover:text-white transition-colors"
            >
              <Settings className="h-4 w-4 text-[#c9b5f4]" />
              Workspace settings
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer: Upgrade Box + User Mini */}
        <div className="p-5 border-t border-white/10 space-y-3">
          <div className="rounded-[7px] border border-white/15 bg-[#332a39] p-3.5">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#f36b3f]" />
              Make your presence bigger.
            </div>
            <p className="text-[10px] text-[#c5b9c7] mt-1 leading-relaxed">
              Unlock both Bio Studio &amp; Instagram Automation with the All-in-One Bundle.
            </p>
            <Link
              href="/dashboard/billing"
              className="mt-2.5 inline-block rounded-[5px] bg-[#f36b3f] px-3 py-1.5 text-[10px] font-extrabold text-white hover:bg-[#e55f34]"
            >
              Explore Pro &amp; Bundle ↗
            </Link>
          </div>

          <div className="flex items-center justify-between pt-1">
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#b9aebb] hover:text-white"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-[#f36b3f]" />
              Admin Console
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="inline-flex items-center gap-1 text-[10px] font-bold text-[#ff9c7e] hover:underline cursor-pointer"
              >
                <LogOut className="h-3 w-3" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content Area with Atelier Concept 03 Topbar */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-[68px] border-b border-[#e7ded3] bg-[#f8f4ed] px-6 lg:px-12 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2 text-xs text-[#958a91]">
            <span>Workspace</span>
            <span>/</span>
            <strong className="text-[#211b29] font-bold">
              {activeWorkspace?.name || "Creator Studio"}
            </strong>
          </div>

          <div className="flex items-center gap-3">
            {activeWorkspace && (
              <Link
                href={`/${activeWorkspace.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-[5px] border border-[#ded4c9] bg-[#fffdf8] px-3 py-1.5 text-[11px] font-bold text-[#211b29] hover:border-[#211b29]"
              >
                Preview site
                <ExternalLink className="h-3 w-3 text-[#f36b3f]" />
              </Link>
            )}
            <div className="hidden sm:flex items-center gap-2 rounded-[5px] border border-[#e4dacf] bg-[#fffdf8] px-3 py-1.5 text-[10px] font-semibold text-[#695f6c]">
              <span className="h-2 w-2 rounded-full bg-[#31a47e]" />
              {entitlements.activePlanLabel}
            </div>
            <span className="hidden lg:inline-block border-l border-[#e4dacf] pl-3 text-[9px] font-extrabold tracking-[1.25px] text-[#9c8f91] uppercase">
              ATELIER EDITION / CONCEPT 03
            </span>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-12 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}