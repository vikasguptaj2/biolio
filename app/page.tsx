"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Globe,
  CheckCircle2,
  TrendingUp,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { Instagram } from "@/components/icons/instagram";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { BIOLIO_TEMPLATES } from "@/lib/design-tokens";

export default function HomePage() {
  const router = useRouter();
  const [handle, setHandle] = useState("");

  const handleClaim = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = handle.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (clean) {
      router.push(`/signup?handle=${clean}`);
    } else {
      router.push("/signup");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f4efe7] text-[#211b29]">
      <MarketingHeader />

      <main className="flex-1">
        {/* ================================================================= */}
        {/* HERO SECTION */}
        {/* ================================================================= */}
        <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-32 border-b border-[#e5dcd1]">
          {/* Subtle background ambient glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#fce8df]/60 blur-3xl pointer-events-none -z-10" />

          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Left Column: Editorial Headline & Handle Claim */}
              <div className="lg:col-span-7 flex flex-col items-start">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#e5dcd1] bg-[#fffdf8] px-3.5 py-1 text-xs font-bold text-[#c45a3a] mb-6 shadow-xs">
                  <span className="flex h-2 w-2 rounded-full bg-[#f36b3f] animate-pulse" />
                  ATELIER EDITION &bull; UNIFIED CREATOR OS
                </div>

                <h1 className="font-editorial text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.04] text-[#211b29] mb-6">
                  Your whole world. <br />
                  <em className="font-normal italic text-[#f36b3f]">One little link.</em>
                </h1>

                <p className="text-base sm:text-lg text-[#7c727e] leading-relaxed max-w-xl mb-8">
                  Biolio unifies a luxury editorial bio website studio with deterministic, instant Instagram DM automation. Capture every lead, book more collabs, and convert audience traffic seamlessly.
                </p>

                {/* Handle Claim Form */}
                <form
                  onSubmit={handleClaim}
                  className="w-full max-w-md flex flex-col sm:flex-row items-stretch gap-2.5 p-2 bg-[#fffdf8] border border-[#e5dcd1] rounded-xl shadow-md mb-6"
                >
                  <div className="flex items-center flex-1 px-3 py-2 bg-transparent">
                    <span className="text-sm font-semibold text-[#a99ca7] mr-1">
                      biolio.site/
                    </span>
                    <input
                      type="text"
                      placeholder="yourname"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      className="w-full bg-transparent text-sm font-bold text-[#211b29] focus:outline-none placeholder:text-[#c4bcbf]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#f36b3f] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#ee7048] transition-all hover:scale-[1.02] active:scale-95"
                  >
                    Claim Handle
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>

                <div className="flex items-center gap-4 text-xs text-[#7c727e]">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#277a67]" />
                    Zero credit card required
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#277a67]" />
                    Instant setup in 60s
                  </span>
                </div>
              </div>

              {/* Right Column: Live Atelier Mockup Preview */}
              <div className="lg:col-span-5 relative flex justify-center">
                {/* Floating Chips */}
                <div className="absolute -top-4 -left-4 sm:left-4 z-20 rounded-xl border border-[#e5dcd1] bg-[#fffdf8] p-3 shadow-lg flex items-center gap-3 animate-bounce [animation-duration:5s]">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e4f1eb] text-[#277a67]">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[#7c727e]">
                      Weekly Impressions
                    </div>
                    <div className="font-display font-extrabold text-sm text-[#211b29]">
                      +48,920 views
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-4 -right-2 sm:right-4 z-20 rounded-xl border border-[#e5dcd1] bg-[#fffdf8] p-3 shadow-lg flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#fce8df] text-[#f36b3f]">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[#7c727e]">
                      Automated DMs
                    </div>
                    <div className="font-display font-extrabold text-sm text-[#211b29]">
                      100% Delivered
                    </div>
                  </div>
                </div>

                {/* Editorial Phone Mockup */}
                <div className="w-[290px] sm:w-[320px] rounded-[36px] border-[6px] border-[#211b29] bg-[#fffdf8] p-4 shadow-2xl relative overflow-hidden">
                  {/* Phone Notch */}
                  <div className="mx-auto h-4 w-28 rounded-b-xl bg-[#211b29] mb-4" />

                  {/* Profile Header */}
                  <div className="text-center pb-4 border-b border-[#eee6dc]">
                    <div className="mx-auto h-20 w-20 rounded-full border-2 border-[#fff] shadow-md bg-gradient-to-tr from-[#f36b3f] to-[#c9b5f4] flex items-center justify-center text-white font-display font-bold text-2xl mb-3">
                      E
                    </div>
                    <h3 className="font-editorial text-xl font-bold text-[#211b29]">
                      Elena Vance
                    </h3>
                    <p className="text-xs text-[#7c727e] mt-1 font-medium">
                      Fashion Editor & Creative Director &bull; Paris
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#fce8df] px-2.5 py-0.5 text-[10px] font-bold text-[#c45a3a]">
                      <Instagram className="h-3 w-3" /> @elenavance
                    </div>
                  </div>

                  {/* Interactive Links in Mockup */}
                  <div className="py-4 space-y-2.5">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#f4efe7] border border-[#e5dcd1] hover:bg-[#fff] transition-colors">
                      <span className="text-xs font-bold text-[#211b29]">
                        Latest Vogue Editorial 2026
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 text-[#f36b3f]" />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#f4efe7] border border-[#e5dcd1] hover:bg-[#fff] transition-colors">
                      <span className="text-xs font-bold text-[#211b29]">
                        Atelier Preset Pack (Vol. 3)
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 text-[#f36b3f]" />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#211b29] text-white transition-colors">
                      <span className="text-xs font-bold">
                        Book Creative Consultation
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-[#f36b3f]" />
                    </div>
                  </div>

                  {/* Mini Gallery Grid */}
                  <div className="pt-2 grid grid-cols-3 gap-1.5">
                    <div className="h-16 rounded-lg bg-[#ded3c7] flex items-center justify-center text-[10px] text-[#7c727e] font-bold">
                      Look 01
                    </div>
                    <div className="h-16 rounded-lg bg-[#e2d8cd] flex items-center justify-center text-[10px] text-[#7c727e] font-bold">
                      Look 02
                    </div>
                    <div className="h-16 rounded-lg bg-[#c9b5f4]/30 flex items-center justify-center text-[10px] text-[#7c727e] font-bold">
                      Look 03
                    </div>
                  </div>

                  {/* Mock Footer */}
                  <div className="mt-5 text-center text-[9px] font-bold tracking-wider text-[#a99ca7] uppercase">
                    Powered by Biolio.site
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* DUAL PRODUCT SHOWCASE */}
        {/* ================================================================= */}
        <section className="py-20 lg:py-32 bg-[#fffdf8] border-b border-[#e5dcd1]">
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-[#f36b3f] mb-2 block">
                Two Workhorses &bull; One Integrated Platform
              </span>
              <h2 className="font-editorial text-4xl sm:text-5xl font-semibold text-[#211b29] mb-4">
                Designed to captivate. Built to convert.
              </h2>
              <p className="text-sm sm:text-base text-[#7c727e]">
                Say goodbye to generic linktrees and unstable bot setups. Biolio delivers high-fashion bio aesthetics with enterprise-grade Instagram automation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
              {/* Product 1: Bio Studio */}
              <div className="rounded-2xl border border-[#e5dcd1] bg-[#f4efe7] p-8 lg:p-10 flex flex-col justify-between hover:shadow-xl transition-shadow">
                <div>
                  <div className="h-12 w-12 rounded-xl bg-[#fce8df] text-[#f36b3f] flex items-center justify-center mb-6">
                    <Globe className="h-6 w-6" />
                  </div>
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#c45a3a]">
                    Engine 01
                  </span>
                  <h3 className="font-editorial text-3xl font-bold text-[#211b29] mt-1 mb-4">
                    Biolio Bio Website Studio
                  </h3>
                  <p className="text-sm text-[#7c727e] leading-relaxed mb-6">
                    Turn casual bio clicks into lifelong subscribers. Craft multi-block pages with editorial fonts, Cloudinary-hosted image galleries, brand collab showcases, and integrated blog articles.
                  </p>
                  <ul className="space-y-3 text-xs font-semibold text-[#211b29] mb-8">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#277a67]" />
                      6 seeded atelier templates or bespoke custom CSS themes
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#277a67]" />
                      Signed Cloudinary image uploads & high-DPI asset optimization
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#277a67]" />
                      Integrated micro-blogging at <code className="bg-[#fffdf8] px-1.5 py-0.5 rounded text-[#211b29]">/[handle]/blog/[slug]</code>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#277a67]" />
                      Custom domain SSL mapping (<code className="bg-[#fffdf8] px-1.5 py-0.5 rounded text-[#211b29]">yourname.com</code>)
                    </li>
                  </ul>
                </div>
                <Link
                  href="/bio"
                  className="inline-flex items-center gap-2 text-xs font-bold text-[#f36b3f] hover:text-[#c45a3a] transition-colors"
                >
                  Explore Bio Builder features <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Product 2: Instagram DM Automation */}
              <div className="rounded-2xl border border-[#e5dcd1] bg-[#211b29] text-white p-8 lg:p-10 flex flex-col justify-between hover:shadow-xl transition-shadow">
                <div>
                  <div className="h-12 w-12 rounded-xl bg-[#3a3040] text-[#c9b5f4] flex items-center justify-center mb-6">
                    <Instagram className="h-6 w-6" />
                  </div>
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#c9b5f4]">
                    Engine 02
                  </span>
                  <h3 className="font-editorial text-3xl font-bold text-white mt-1 mb-4">
                    Instagram DM Automation
                  </h3>
                  <p className="text-sm text-[#b9aebb] leading-relaxed mb-6">
                    Never leave a comment unanswered. Trigger instant, personalized direct messages whenever someone comments on your Reel or sends a keyword. Pure deterministic matching with zero AI hallucinations.
                  </p>
                  <ul className="space-y-3 text-xs font-semibold text-[#fdfcfe] mb-8">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#6ac2a2]" />
                      Official Meta Graph API v21.0 Webhook Ingress
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#6ac2a2]" />
                      Durable background worker queue with exponential backoff
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#6ac2a2]" />
                      Exact, contains & regex matching with spam cooldown guardrails
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#6ac2a2]" />
                      Public comment auto-reply + private DM dispatch
                    </li>
                  </ul>
                </div>
                <Link
                  href="/automation"
                  className="inline-flex items-center gap-2 text-xs font-bold text-[#c9b5f4] hover:text-white transition-colors"
                >
                  Explore Instagram Automation features <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* TEMPLATES PREVIEW SHOWCASE */}
        {/* ================================================================= */}
        <section className="py-20 lg:py-28 bg-[#f4efe7] border-b border-[#e5dcd1]">
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#f36b3f] mb-2 block">
                  Seed Collection
                </span>
                <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#211b29]">
                  Six bespoke templates. Infinite expressions.
                </h2>
              </div>
              <Link
                href="/templates"
                className="inline-flex items-center gap-2 text-xs font-bold text-[#211b29] hover:text-[#f36b3f] transition-colors"
              >
                View all templates <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.values(BIOLIO_TEMPLATES).map((template) => (
                <div
                  key={template.id}
                  className="rounded-xl border border-[#e5dcd1] bg-[#fffdf8] p-6 shadow-xs hover:shadow-md transition-all group"
                >
                  <div
                    className="h-36 rounded-lg mb-5 flex flex-col justify-end p-4 border transition-transform group-hover:scale-[1.02]"
                    style={{
                      backgroundColor: template.theme.bg,
                      borderColor: template.theme.border,
                    }}
                  >
                    <div
                      className="inline-block px-3 py-1 rounded text-[10px] font-bold w-max"
                      style={{
                        backgroundColor: template.theme.buttonBg,
                        color: template.theme.buttonText,
                      }}
                    >
                      Sample Link Card
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-editorial text-xl font-bold text-[#211b29]">
                      {template.name}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#f4efe7] text-[#7c727e]">
                      {template.category}
                    </span>
                  </div>

                  <p className="text-xs text-[#7c727e] line-clamp-2 mb-4 leading-relaxed">
                    {template.description}
                  </p>

                  <div className="pt-3 border-t border-[#eee6dc] flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#a99ca7]">
                      {template.id}
                    </span>
                    <Link
                      href={`/signup?template=${template.id}`}
                      className="text-xs font-bold text-[#f36b3f] hover:underline"
                    >
                      Use this &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* PRICING TEASER / DYNAMIC COUPON BANNER */}
        {/* ================================================================= */}
        <section className="py-20 bg-[#211b29] text-white">
          <div className="mx-auto max-w-7xl px-6 lg:px-12 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-[#c9b5f4] mb-3 block">
              Modular Commercial Architecture
            </span>
            <h2 className="font-editorial text-4xl sm:text-5xl font-semibold mb-6">
              Pay only for what you build.
            </h2>
            <p className="text-sm sm:text-base text-[#b9aebb] max-w-xl mx-auto mb-8 leading-relaxed">
              Choose standalone Bio Builder, standalone Instagram Automation, or the unified Biolio Bundle. Verified atomic coupon discounts calculated in real time by our PostgreSQL engine.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-lg bg-[#f36b3f] px-6 py-3.5 text-xs font-bold text-white shadow-md hover:bg-[#ee7048] transition-all"
              >
                Compare Plans & Test Coupons
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-lg border border-[#3a3040] bg-transparent px-6 py-3.5 text-xs font-bold text-white hover:bg-[#3a3040] transition-colors"
              >
                Start Free 14-Day Trial
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
