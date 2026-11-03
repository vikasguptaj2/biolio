"use client";

import Link from "next/link";
import {
  Globe,
  Layout,
  FileText,
  Camera,
  ArrowRight,
} from "lucide-react";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";

export default function BioProductPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f4efe7] text-[#211b29]">
      <MarketingHeader />

      <main className="flex-1">
        {/* Product Hero */}
        <section className="pt-16 pb-20 lg:pt-24 lg:pb-32 border-b border-[#e5dcd1] bg-[#fffdf8]">
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#e5dcd1] bg-[#f4efe7] px-3.5 py-1 text-xs font-bold text-[#c45a3a] mb-6">
                <Globe className="h-3.5 w-3.5 text-[#f36b3f]" />
                PRODUCT &bull; BIOLIO BIO WEBSITE STUDIO
              </div>
              <h1 className="font-editorial text-5xl sm:text-6xl font-semibold tracking-tight text-[#211b29] mb-6 leading-tight">
                An editorial portfolio disguised as a bio link.
              </h1>
              <p className="text-base sm:text-lg text-[#7c727e] leading-relaxed mb-8">
                Break free from rigid vertical link stacks. Biolio provides a multi-block canvas featuring high-DPI image galleries, micro-blogging, brand sponsorship banners, and full custom domain SSL.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#f36b3f] px-6 py-3.5 text-xs font-bold text-white shadow-md hover:bg-[#ee7048] transition-all"
                >
                  Create Your Bio Page
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/templates"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#e5dcd1] bg-[#fffdf8] px-6 py-3.5 text-xs font-bold text-[#211b29] hover:bg-[#f4efe7] transition-colors"
                >
                  Explore 6 Seeded Templates
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Studio Blocks Breakdown */}
        <section className="py-20 lg:py-28 border-b border-[#e5dcd1]">
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-[#f36b3f] mb-2 block">
                Modular Architecture
              </span>
              <h2 className="font-editorial text-4xl font-semibold text-[#211b29] mb-4">
                Every block crafted for conversion.
              </h2>
              <p className="text-sm text-[#7c727e]">
                Drag, reorder, toggle, and style each block independently in our split-screen studio editor.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="rounded-xl border border-[#e5dcd1] bg-[#fffdf8] p-8 shadow-xs">
                <div className="h-10 w-10 rounded-lg bg-[#fce8df] text-[#f36b3f] flex items-center justify-center mb-5">
                  <Layout className="h-5 w-5" />
                </div>
                <h3 className="font-editorial text-xl font-bold text-[#211b29] mb-2">
                  Dynamic Link Blocks
                </h3>
                <p className="text-xs text-[#7c727e] leading-relaxed mb-4">
                  Feature primary links, pinned lead magnets, affiliate deals, and social profiles. Track clicks, referrer channels, and conversions per link with zero cookie banners.
                </p>
                <div className="text-[11px] font-bold text-[#c45a3a]">
                  Supports UTM tagging & scheduled visibility
                </div>
              </div>

              {/* Feature 2 */}
              <div className="rounded-xl border border-[#e5dcd1] bg-[#fffdf8] p-8 shadow-xs">
                <div className="h-10 w-10 rounded-lg bg-[#f0eafa] text-[#8068b0] flex items-center justify-center mb-5">
                  <Camera className="h-5 w-5" />
                </div>
                <h3 className="font-editorial text-xl font-bold text-[#211b29] mb-2">
                  Cloudinary Media Galleries
                </h3>
                <p className="text-xs text-[#7c727e] leading-relaxed mb-4">
                  Showcase high-resolution lookbooks, photography, artwork, and product shots via Cloudinary signed upload pipelines with responsive auto-webp delivery.
                </p>
                <div className="text-[11px] font-bold text-[#8068b0]">
                  Full-screen lightbox & custom aspect ratios
                </div>
              </div>

              {/* Feature 3 */}
              <div className="rounded-xl border border-[#e5dcd1] bg-[#fffdf8] p-8 shadow-xs">
                <div className="h-10 w-10 rounded-lg bg-[#e4f1eb] text-[#277a67] flex items-center justify-center mb-5">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="font-editorial text-xl font-bold text-[#211b29] mb-2">
                  Integrated Micro-Blog
                </h3>
                <p className="text-xs text-[#7c727e] leading-relaxed mb-4">
                  Publish editorial essays, recipe drops, and behind-the-scenes stories directly on your bio domain (<code className="text-[#211b29] font-mono">/[handle]/blog/[slug]</code>) with automatic SEO open-graph tags.
                </p>
                <div className="text-[11px] font-bold text-[#277a67]">
                  Rich markdown & reading time estimator
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Custom Domains Callout */}
        <section className="py-20 bg-[#211b29] text-white">
          <div className="mx-auto max-w-7xl px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
              <span className="text-xs font-bold uppercase tracking-widest text-[#c9b5f4] mb-2 block">
                White-label branding
              </span>
              <h2 className="font-editorial text-3xl sm:text-4xl font-semibold mb-4">
                Bring your own domain with automatic SSL.
              </h2>
              <p className="text-xs sm:text-sm text-[#b9aebb] leading-relaxed">
                Map <code className="text-white font-mono bg-[#3a3040] px-2 py-0.5 rounded">yourbrand.com</code> or keep your free canonical handle on <code className="text-white font-mono bg-[#3a3040] px-2 py-0.5 rounded">biolio.site/yourname</code>. Zero Biolio watermarks on Pro & Bundle plans.
              </p>
            </div>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-[#f36b3f] px-6 py-3.5 text-xs font-bold text-white shadow-md hover:bg-[#ee7048] transition-all whitespace-nowrap"
            >
              Start Building Now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

