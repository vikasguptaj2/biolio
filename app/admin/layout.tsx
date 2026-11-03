import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ShieldCheck,
  Globe,
  Tag,
  Flag,
  FileText,
  Activity,
  ArrowLeft,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If unauthenticated, redirect to admin login
  if (!user) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen flex bg-[#120f17] text-[#fdfcfe]">
      {/* Admin Sidebar */}
      <aside className="w-64 border-r border-[#26202f] bg-[#18141f] text-white flex flex-col justify-between shrink-0 hidden md:flex sticky top-0 h-screen">
        <div>
          {/* Brand & Badge */}
          <div className="p-6 border-b border-[#26202f]">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f36b3f] text-white font-display font-extrabold text-base shadow-sm">
                B
              </div>
              <span className="font-display font-extrabold text-xl tracking-tighter text-white">
                Biolio<span className="text-[#f36b3f]">.</span>
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#26202f] px-2.5 py-1 text-[10px] font-bold text-[#c9b5f4]">
              <ShieldCheck className="h-3 w-3 text-[#6ac2a2]" />
              Super Admin Operations
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-[#b9aebb] hover:bg-[#26202f] hover:text-white transition-colors"
            >
              <Activity className="h-4 w-4 text-[#f36b3f]" />
              Platform Overview
            </Link>

            <Link
              href="/admin/workspaces"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-[#b9aebb] hover:bg-[#26202f] hover:text-white transition-colors"
            >
              <Globe className="h-4 w-4 text-[#c9b5f4]" />
              Workspaces & Handles
            </Link>

            <Link
              href="/admin/coupons"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-[#b9aebb] hover:bg-[#26202f] hover:text-white transition-colors"
            >
              <Tag className="h-4 w-4 text-[#6ac2a2]" />
              Coupons & Commercial
            </Link>

            <Link
              href="/admin/flags"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-[#b9aebb] hover:bg-[#26202f] hover:text-white transition-colors"
            >
              <Flag className="h-4 w-4 text-[#ff946f]" />
              Killswitches & Flags
            </Link>

            <Link
              href="/admin/audit"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-[#b9aebb] hover:bg-[#26202f] hover:text-white transition-colors"
            >
              <FileText className="h-4 w-4 text-[#fce8df]" />
              Append-Only Audit Logs
            </Link>
          </nav>
        </div>

        {/* Bottom Switcher */}
        <div className="p-4 border-t border-[#26202f] space-y-3">
          <Link
            href="/dashboard"
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#26202f] text-xs font-bold text-[#b9aebb] hover:text-white transition-colors"
          >
            <span className="flex items-center gap-2">
              <ArrowLeft className="h-3.5 w-3.5" />
              Creator Workspace
            </span>
          </Link>

          <div className="text-[10px] text-[#7c727e] truncate px-1">
            Signed in: {user.email}
          </div>
        </div>
      </aside>

      {/* Admin Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-[#26202f] bg-[#18141f] px-6 lg:px-10 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#7c727e]">Control Center</span>
            <span className="text-[#473b4f]">/</span>
            <span className="font-bold text-white">Super Admin</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full border border-[#26202f] bg-[#120f17] px-3 py-1 text-[11px] font-bold text-[#6ac2a2]">
              <span className="h-2 w-2 rounded-full bg-[#277a67] animate-pulse" />
              Audit Trigger Active
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}

