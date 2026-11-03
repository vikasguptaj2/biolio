import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Globe,
  BarChart3,
  CreditCard,
  Settings,
  ExternalLink,
  LogOut,
  Layers,
} from "lucide-react";
import { Instagram } from "@/components/icons/instagram";
import { getSessionContext } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, workspace } = await getSessionContext();

  if (!user) {
    redirect("/signin");
  }

  if (!workspace) {
    redirect("/onboarding");
  }

  const handle = workspace.slug;

  return (
    <div className="min-h-screen flex bg-[#f4efe7] text-[#211b29]">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-[#e5dcd1] bg-[#211b29] text-white flex flex-col justify-between shrink-0 hidden md:flex sticky top-0 h-screen">
        <div>
          {/* Brand & Workspace Pill */}
          <div className="p-6 border-b border-[#342b3d]">
            <Link href="/dashboard" className="flex items-center gap-2 mb-6 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f36b3f] text-white font-display font-extrabold text-lg shadow-sm">
                B
              </div>
              <span className="font-display font-extrabold text-2xl tracking-tighter text-white">
                Biolio<span className="text-[#f36b3f]">.</span>
              </span>
            </Link>

            {/* Workspace Selector Card */}
            <div className="rounded-xl border border-[#3a3040] bg-[#2c2435] p-3 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">
                  {workspace.name || "My Atelier"}
                </div>
                <div className="text-[10px] text-[#b9aebb] truncate font-mono">
                  biolio.site/{handle}
                </div>
              </div>
              <span className="h-2 w-2 rounded-full bg-[#277a67]" />
            </div>
          </div>

          {/* Nav Links */}
          <nav className="p-4 space-y-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-[#d2c8d7] hover:bg-[#342b3d] hover:text-white transition-colors"
            >
              <Layers className="h-4 w-4 text-[#f36b3f]" />
              Workspace Hub
            </Link>

            <Link
              href="/dashboard/bio"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-[#d2c8d7] hover:bg-[#342b3d] hover:text-white transition-colors"
            >
              <Globe className="h-4 w-4 text-[#f36b3f]" />
              Bio Website Studio
            </Link>

            <Link
              href="/dashboard/automation"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-[#d2c8d7] hover:bg-[#342b3d] hover:text-white transition-colors"
            >
              <Instagram className="h-4 w-4 text-[#c9b5f4]" />
              Instagram Automation
            </Link>

            <Link
              href="/dashboard/analytics"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-[#d2c8d7] hover:bg-[#342b3d] hover:text-white transition-colors"
            >
              <BarChart3 className="h-4 w-4 text-[#6ac2a2]" />
              Analytics & Clicks
            </Link>

            <Link
              href="/dashboard/billing"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-[#d2c8d7] hover:bg-[#342b3d] hover:text-white transition-colors"
            >
              <CreditCard className="h-4 w-4 text-[#fce8df]" />
              Plans & Billing
            </Link>

            <Link
              href="/dashboard/settings"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-[#d2c8d7] hover:bg-[#342b3d] hover:text-white transition-colors"
            >
              <Settings className="h-4 w-4 text-[#a99ca7]" />
              Settings
            </Link>
          </nav>
        </div>

        {/* Footer / User Profile & Live Link */}
        <div className="p-4 border-t border-[#342b3d] space-y-3">
          <Link
            href={`/${handle}`}
            target="_blank"
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#3a3040] text-xs font-bold text-white hover:bg-[#473b4f] transition-colors"
          >
            <span className="flex items-center gap-2 truncate">
              <Globe className="h-3.5 w-3.5 text-[#f36b3f]" />
              View Live Bio
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-[#b9aebb]" />
          </Link>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-[#f36b3f] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {profile?.full_name || "Creator"}
                </div>
                <div className="text-[10px] text-[#b9aebb] truncate">
                  {user.email}
                </div>
              </div>
            </div>

            <form action="/auth/signout" method="post">
              <button
                type="submit"
                title="Sign out"
                className="p-1.5 text-[#b9aebb] hover:text-white transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-[#e5dcd1] bg-[#fffdf8] px-6 lg:px-10 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#7c727e]">Workspace</span>
            <span className="text-[#a99ca7]">/</span>
            <span className="font-bold text-[#211b29]">{workspace.name}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-[#e5dcd1] bg-[#f4efe7] px-3 py-1 text-[11px] font-bold text-[#277a67]">
              <span className="h-2 w-2 rounded-full bg-[#277a67] animate-pulse" />
              PostgreSQL 17 Synced
            </div>

            <Link
              href={`/${handle}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#211b29] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#3a3040] transition-colors"
            >
              <span>biolio.site/{handle}</span>
              <ExternalLink className="h-3 w-3 text-[#f36b3f]" />
            </Link>
          </div>
        </header>

        {/* Child Pages */}
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}

