import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getVerifiedAdminSession } from "@/lib/admin-auth";
import { AdminSignOutButton } from "@/components/admin/admin-controls";
import {
  LayoutDashboard,
  Users,
  TicketPercent,
  Flag,
  FileSearch,
  ExternalLink,
  KeyRound,
} from "lucide-react";

export const instant = false;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") || "";
  const isLoginRoute = pathname.startsWith("/admin/login");

  const adminSession = await getVerifiedAdminSession();

  if (isLoginRoute && !adminSession) {
    return <>{children}</>;
  }

  if (!adminSession) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-[#f4efe7] text-[#211b29] flex flex-col md:flex-row">
      {/* Atelier Control Center Sidebar (#211b29 — Matches prototype) */}
      <aside className="w-full md:w-[258px] bg-[#211b29] text-[#f8f3ec] flex flex-col justify-between shrink-0 md:h-screen md:sticky md:top-0">
        <div className="overflow-y-auto">
          <div className="p-6 pb-5 border-b border-white/10">
            <Link
              href="/admin"
              className="font-display text-[27px] font-extrabold tracking-[-1.6px] text-white block leading-none"
            >
              biolio<span className="text-[#f36b3f]">.</span>
            </Link>
            <small className="block mt-1.5 text-[9px] uppercase tracking-[1.7px] text-[#b9aebb]">
              Atelier Control Center
            </small>
          </div>

          <div className="mx-3.5 my-3.5 rounded-[6px] bg-[#473b4b] px-3 py-2 text-[10px] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <KeyRound className="h-3 w-3 text-[#f7c47f]" />
              Operator Gate
            </span>
            <strong className="text-[9px] text-[#f7c47f] uppercase">
              EPOCH #{adminSession.epoch}
            </strong>
          </div>

          {/* Group 1: Platform & Revenue */}
          <div className="px-3 py-2">
            <div className="px-2.5 pb-1.5 text-[9px] font-bold uppercase tracking-[1.7px] text-[#9f94a4]">
              Platform &amp; Tenancy
            </div>
            <nav className="space-y-1">
              <Link
                href="/admin"
                className="flex items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-[11px] font-semibold text-[#d7d0d9] hover:bg-white/10 hover:text-white transition-colors"
              >
                <LayoutDashboard className="h-4 w-4 text-[#ffa27e]" />
                Overview &amp; All 16 Consoles
              </Link>
              <Link
                href="/admin/workspaces"
                className="flex items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-[11px] font-semibold text-[#d7d0d9] hover:bg-white/10 hover:text-white transition-colors"
              >
                <Users className="h-4 w-4 text-[#cdb9d5]" />
                Workspaces &amp; Product Locks
              </Link>
            </nav>
          </div>

          {/* Group 2: Growth & Governance */}
          <div className="px-3 py-2">
            <div className="px-2.5 pb-1.5 text-[9px] font-bold uppercase tracking-[1.7px] text-[#9f94a4]">
              Revenue &amp; Governance
            </div>
            <nav className="space-y-1">
              <Link
                href="/admin/coupons"
                className="flex items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-[11px] font-semibold text-[#d7d0d9] hover:bg-white/10 hover:text-white transition-colors"
              >
                <TicketPercent className="h-4 w-4 text-[#cdb9d5]" />
                Promotions &amp; Codes
              </Link>
              <Link
                href="/admin/flags"
                className="flex items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-[11px] font-semibold text-[#d7d0d9] hover:bg-white/10 hover:text-white transition-colors"
              >
                <Flag className="h-4 w-4 text-[#cdb9d5]" />
                Killswitches &amp; Flags
              </Link>
              <Link
                href="/admin/audit"
                className="flex items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-[11px] font-semibold text-[#d7d0d9] hover:bg-white/10 hover:text-white transition-colors"
              >
                <FileSearch className="h-4 w-4 text-[#cdb9d5]" />
                Audit &amp; Security Log
              </Link>
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-white/10 space-y-2.5 text-[10px] text-[#aaa0ad]">
          <div className="flex items-center gap-2.5 text-white">
            <div className="h-7 w-7 rounded-full bg-[#d8caed] text-[#211b29] flex items-center justify-center font-extrabold text-xs">
              SA
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs truncate">Platform Admin</div>
              <div className="text-[10px] text-[#bdb2c1] truncate">
                Super Admin &bull; Verified
              </div>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="flex items-center justify-between rounded-[6px] px-2.5 py-1.5 text-[11px] font-semibold text-[#d7d0d9] hover:bg-white/10"
          >
            <span>Creator Dashboard</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <AdminSignOutButton />
        </div>
      </aside>

      {/* Main Content Area with Atelier Control Center Topbar */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-[68px] sticky top-0 z-10 bg-[#f8f4ed] border-b border-[#e5dcd1] flex items-center justify-between px-6 lg:px-8">
          <div className="text-xs text-[#7c727e]">
            Biolio <span className="px-1.5">/</span>
            <strong className="text-[#211b29]">Atelier Control Center</strong>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-[#f0eafa] px-3 py-1.5 text-[10px] font-extrabold tracking-wider text-[#211b29] uppercase">
              SUPER ADMIN
            </span>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
