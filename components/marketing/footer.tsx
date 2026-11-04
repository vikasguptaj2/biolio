import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-[#e5dcd1] bg-[#211b29] text-[#fffdf8] py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Col 1: Brand Info */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 group mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f36b3f] text-white font-display font-extrabold text-lg shadow-sm">
                B
              </div>
              <span className="font-display font-extrabold text-2xl tracking-tighter text-white">
                Biolio<span className="text-[#f36b3f]">.</span>
              </span>
            </Link>
            <p className="text-xs text-[#b9aebb] leading-relaxed mb-6">
              Your whole world. One little link. The unified bio website builder and Instagram DM automation system for creators and ambitious brands.
            </p>
            <div className="text-[11px] text-[#7c727e]">
              Atelier Edition v6.0 &bull; biolio.site
            </div>
          </div>

          {/* Col 2: Products */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#c9b5f4] mb-4">
              Products
            </h4>
            <ul className="flex flex-col gap-2.5 text-xs text-[#d2c8d7]">
              <li>
                <Link href="/bio" className="hover:text-[#ff946f] transition-colors">
                  Bio Website Builder
                </Link>
              </li>
              <li>
                <Link href="/automation" className="hover:text-[#ff946f] transition-colors">
                  Instagram DM Automation
                </Link>
              </li>
              <li>
                <Link href="/templates" className="hover:text-[#ff946f] transition-colors">
                  Design Templates (6 Seeded)
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-[#ff946f] transition-colors">
                  Modular Plans & Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Resources & Platform */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#c9b5f4] mb-4">
              Platform
            </h4>
            <ul className="flex flex-col gap-2.5 text-xs text-[#d2c8d7]">
              <li>
                <Link href="/signin" className="hover:text-[#ff946f] transition-colors">
                  Creator Sign In
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-[#ff946f] transition-colors">
                  Claim Reserved Handle
                </Link>
              </li>
              <li>
                <Link href="/admin/login" className="hover:text-[#ff946f] transition-colors">
                  Super Admin Control Center
                </Link>
              </li>
              <li>
                <a
                  href="https://ainjrwbmsndsypbblqqo.supabase.co"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#ff946f] transition-colors"
                >
                  PostgreSQL 17 Status
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Trust & Guarantee */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#c9b5f4] mb-4">
              Security & Reliability
            </h4>
            <p className="text-xs text-[#b9aebb] leading-relaxed mb-4">
              Zero LLM hallucinations for keyword execution. HMAC SHA256 verified Meta webhooks with durable queue retries and tenant isolation.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#3a3040] px-3 py-1 text-[10px] font-semibold text-[#6ac2a2]">
              <span className="h-2 w-2 rounded-full bg-[#277a67] animate-pulse" />
              Meta Graph API v21.0 Certified
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-[#342b3d] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7c727e]">
          <div>&copy; 2026 Biolio Technologies Inc. All rights reserved.</div>
          <div className="flex gap-6">
            <span className="hover:text-[#b9aebb] cursor-pointer">Privacy Policy</span>
            <span className="hover:text-[#b9aebb] cursor-pointer">Terms of Service</span>
            <span className="hover:text-[#b9aebb] cursor-pointer">Security Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

