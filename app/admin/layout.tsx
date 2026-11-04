import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getVerifiedAdminSession } from "@/lib/admin-auth";
import { AdminSignOutButton } from "@/components/admin/admin-controls";

export const instant = false;
import {
  ShieldAlert,
  LayoutDashboard,
  Users,
  TicketPercent,
  Flag,
  FileSearch,
  ExternalLink,
  KeyRound,
} from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") || "";
  const isLoginRoute = pathname.startsWith("/admin/login");

  const adminSession = await getVerifiedAdminSession();

  // If on /admin/login and not authenticated yet, render the standalone login screen without redirect loop
  if (isLoginRoute && !adminSession) {
    return <>{children}</>;
  }

  // Strictly enforce Single-Email + Fixed-Password Super Admin session for all /admin/* routes
  if (!adminSession) {
    redirect("/admin/login");
  }

  const navItems = [
    { name: "Global Telemetry", href: "/admin", icon: LayoutDashboard },
    { name: "Workspaces & Locks", href: "/admin/workspaces", icon: Users },
    { name: "Coupon Campaigns", href: "/admin/coupons", icon: TicketPercent },
    { name: "Killswitches & Flags", href: "/admin/flags", icon: Flag },
    { name: "Immutable Audit Log", href: "/admin/audit", icon: FileSearch },
  ];

  return (
    <div className="min-h-screen bg-[#16121c] text-[#f5f0f7] flex flex-col md:flex-row">
      {/* Dark Obsidian Admin Sidebar */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[#2e2638] bg-[#1d1824] flex flex-col justify-between shrink-0">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <Link href="/admin" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#a62639] text-white font-display font-extrabold text-base shadow-sm">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div>
                <span className="font-display font-extrabold text-lg tracking-tight text-white block leading-none">
                  Biolio<span className="text-[#f36b3f]">.</span> Ops
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#ff8f85]">
                  Super Admin Control
                </span>
              </div>
            </Link>
          </div>

          <div className="mb-6 rounded-xl border border-[#277a67]/40 bg-[#277a67]/10 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#6ac2a2]">
              <KeyRound className="h-3 w-3" />
              Single-Credential Lock
            </div>
            <div className="mt-1 truncate text-xs font-mono text-white">
              {adminSession.email}
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#c4b8cb] hover:bg-[#2a2333] hover:text-white transition-colors"
                >
                  <Icon className="h-4 w-4 text-[#f36b3f]" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-6 border-t border-[#2e2638] space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-[#9e93a4] hover:text-white transition-colors"
          >
            <span>Creator Dashboard</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <AdminSignOutButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="mx-auto max-w-6xl">
          <Suspense
            fallback={
              <div className="p-8 text-xs text-[#9e94a3] animate-pulse">
                Loading admin console...
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
