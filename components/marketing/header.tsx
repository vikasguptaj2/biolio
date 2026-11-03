"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, ArrowRight } from "lucide-react";

export function MarketingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 h-20 border-b border-[#e5dcd1] bg-[#fbf8f2]/90 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6 lg:px-12">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f36b3f] text-white font-display font-extrabold text-xl shadow-md transition-transform group-hover:scale-105">
            B
          </div>
          <span className="font-display font-extrabold text-2xl tracking-tighter text-[#211b29]">
            Biolio<span className="text-[#f36b3f]">.</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="/bio"
            className="text-xs font-bold uppercase tracking-wider text-[#7c727e] hover:text-[#f36b3f] transition-colors"
          >
            Bio Builder
          </Link>
          <Link
            href="/automation"
            className="text-xs font-bold uppercase tracking-wider text-[#7c727e] hover:text-[#f36b3f] transition-colors"
          >
            Instagram Automation
          </Link>
          <Link
            href="/templates"
            className="text-xs font-bold uppercase tracking-wider text-[#7c727e] hover:text-[#f36b3f] transition-colors"
          >
            Templates
          </Link>
          <Link
            href="/pricing"
            className="text-xs font-bold uppercase tracking-wider text-[#7c727e] hover:text-[#f36b3f] transition-colors"
          >
            Pricing
          </Link>
        </nav>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/signin"
            className="text-xs font-bold text-[#211b29] hover:text-[#f36b3f] transition-colors px-3 py-2"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-lg bg-[#211b29] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#3a3040] hover:-translate-y-0.5"
          >
            Claim Your Handle
            <ArrowRight className="h-3.5 w-3.5 text-[#f36b3f]" />
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-[#211b29]"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#e5dcd1] bg-[#fffdf8] px-6 py-6 shadow-xl animate-in slide-in-from-top-4 duration-200">
          <nav className="flex flex-col gap-4">
            <Link
              href="/bio"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-bold text-[#211b29] hover:text-[#f36b3f]"
            >
              Bio Builder
            </Link>
            <Link
              href="/automation"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-bold text-[#211b29] hover:text-[#f36b3f]"
            >
              Instagram Automation
            </Link>
            <Link
              href="/templates"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-bold text-[#211b29] hover:text-[#f36b3f]"
            >
              Templates
            </Link>
            <Link
              href="/pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-bold text-[#211b29] hover:text-[#f36b3f]"
            >
              Pricing
            </Link>
            <div className="pt-4 border-t border-[#e5dcd1] flex flex-col gap-3">
              <Link
                href="/signin"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2 text-sm font-bold text-[#211b29]"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#f36b3f] py-3 text-sm font-bold text-white shadow-md"
              >
                Claim Your Handle
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

