import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { ArrowUpRight } from "lucide-react";

export default function FaqPage() {
  const faqs = [
    {
      q: "What exactly is Biolio?",
      a: "Biolio brings together two connected creator products in one workspace: Biolio Bio (your customizable creator website, portfolio, gallery, collaborations, and journal) and Biolio Instagram Automation (deterministic, rule-based comment-to-DM workflows).",
    },
    {
      q: "Do both products share one account and workspace?",
      a: "Yes. One Biolio account and one workspace manage both Biolio Bio and Instagram Automation. You can subscribe to Bio alone, Instagram Automation alone, or unlock both with the 25%-off All-in-One Bundle.",
    },
    {
      q: "What happens if I only pay for a single product?",
      a: "Biolio enforces a strict 5-Layer Single-Product Lock. If you subscribe to Biolio Bio Standalone (₹299/mo or ₹599/mo), Instagram Automation is locked until you upgrade to the Bundle. If you subscribe to Instagram Automation Standalone (₹499/mo or ₹999/mo), Bio Website Studio is locked until you upgrade.",
    },
    {
      q: "Can I customize my creator website with templates and a blog?",
      a: "Yes. Biolio includes 17 curated editorial templates (such as Sunday Studio, Coastline, Form & Function, Atelier Editorial, Obsidian Noir, and Sage Botanical) plus sections for links, social metrics, portfolio galleries, brand collaborations, visitor contact inquiries, and a built-in blog.",
    },
    {
      q: "How does Instagram Automation work safely?",
      a: "Biolio connects via Meta's official Graph API v21.0 OAuth flow and never asks for your Instagram password. Incoming comments are verified with HMAC-SHA256 signatures, matched deterministically using word-boundary rules (zero AI hallucinations), and dispatched with 6-hour per-user cooldowns.",
    },
    {
      q: "How do promotional coupons work?",
      a: "Promotional codes (such as launch discounts or partner codes) are validated server-side, reserved atomically for 30 minutes during Razorpay checkout, and confirmed once payment succeeds.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf8f2] text-[#211b29]">
      <MarketingHeader />

      <main className="flex-1">
        <section className="bg-[#f2eae1] py-20 border-b border-[#e5dcd1]">
          <div className="mx-auto max-w-6xl px-6 lg:px-12">
            <div className="text-[10px] font-extrabold uppercase tracking-[2px] text-[#bd5636] mb-4">
              BIOLIO SUPPORT &amp; RESOURCES
            </div>
            <h1 className="font-editorial text-5xl sm:text-6xl font-semibold tracking-tight text-[#271f2b] leading-[1.02]">
              Clear answers. <br />
              <em className="font-normal italic text-[#f36b3f]">
                Less guesswork.
              </em>
            </h1>
            <p className="mt-5 text-sm sm:text-base text-[#776d79] max-w-xl leading-relaxed">
              Everything you need to know about Biolio Bio, Instagram Automation, single-product vs. bundle subscriptions, and security.
            </p>
          </div>
        </section>

        <section className="py-20 mx-auto max-w-6xl px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4">
              <div className="text-[10px] font-extrabold uppercase tracking-[2px] text-[#bd5636] mb-3">
                THE BASICS
              </div>
              <h2 className="font-editorial text-4xl font-semibold text-[#271f2b]">
                Good to know.
              </h2>
              <p className="mt-3 text-xs text-[#776d79] leading-relaxed">
                Need help with your workspace or custom enterprise coupon batch? Reach our team anytime at{" "}
                <span className="font-bold text-[#211b29]">
                  support@biolio.site
                </span>
                .
              </p>
            </div>

            <div className="lg:col-span-8 divide-y divide-[#e5dcd1] border-t border-b border-[#e5dcd1]">
              {faqs.map((item, idx) => (
                <details
                  key={idx}
                  open={idx === 0}
                  className="group py-5 cursor-pointer"
                >
                  <summary className="flex items-center justify-between text-sm font-extrabold text-[#211b29] list-none">
                    <span>{item.q}</span>
                    <span className="text-[#f36b3f] font-bold text-lg group-open:rotate-45 transition-transform">
                      ＋
                    </span>
                  </summary>
                  <p className="mt-3 text-xs text-[#776d79] leading-relaxed max-w-2xl">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f4e8df] py-20 px-6 text-center border-t border-[#e5dcd1]">
          <div className="text-[10px] font-extrabold uppercase tracking-[2px] text-[#bd5636] mb-3">
            YOUR NEXT CHAPTER STARTS HERE
          </div>
          <h2 className="font-editorial text-4xl sm:text-5xl font-semibold text-[#271f2b]">
            Ready to make it yours?
          </h2>
          <p className="mt-3 mb-7 text-sm text-[#776d79] max-w-md mx-auto">
            Start with a free workspace and explore both Biolio Bio and Instagram Automation.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-[5px] bg-[#f36b3f] px-6 py-4 text-xs font-extrabold text-white shadow-lg hover:bg-[#e55f34]"
          >
            Create your account
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
