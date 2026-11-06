import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { Mail, MessageSquare, ShieldCheck, Clock } from "lucide-react";

export const metadata = {
  title: "Contact & Support | Biolio",
  description: "Get in touch with the Biolio engineering, billing, and trust & safety teams.",
};

export default function ContactUsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fbf8f2] text-[#211b29]">
      <MarketingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-[#f2eae1] py-16 border-b border-[#e5dcd1]">
          <div className="mx-auto max-w-4xl px-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#f36b3f]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#d44d22] mb-4">
              <MessageSquare className="h-3.5 w-3.5" />
              Creator Support &amp; Redressal
            </div>
            <h1 className="font-editorial text-4xl sm:text-5xl font-semibold tracking-tight text-[#271f2b]">
              Contact Biolio
            </h1>
            <p className="mt-4 text-sm sm:text-base text-[#776d79] leading-relaxed">
              We&apos;re here to assist with workspace setup, template design, Instagram Meta review questions, and billing inquiries.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-16">
          <div className="mx-auto max-w-4xl px-6 space-y-12">
            {/* Contact channels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-6 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-[#fce9e1] text-[#f36b3f] flex items-center justify-center mb-4">
                  <Mail className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-[#211b29] text-base mb-1">Creator Support</h3>
                <p className="text-xs text-[#7c727e] mb-3 leading-relaxed">
                  General technical assistance, bug reports, and studio feedback.
                </p>
                <a
                  href="mailto:support@biolio.site"
                  className="text-xs font-bold text-[#f36b3f] hover:underline"
                >
                  support@biolio.site &rarr;
                </a>
              </div>

              <div className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-6 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-[#e5f3ed] text-[#25856e] flex items-center justify-center mb-4">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-[#211b29] text-base mb-1">Grievance &amp; Privacy</h3>
                <p className="text-xs text-[#7c727e] mb-3 leading-relaxed">
                  DPDP compliance officer, data deletion, and Trust &amp; Safety.
                </p>
                <a
                  href="mailto:grievance@biolio.site"
                  className="text-xs font-bold text-[#25856e] hover:underline"
                >
                  grievance@biolio.site &rarr;
                </a>
              </div>

              <div className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-6 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-[#f2ecfc] text-[#6b47c8] flex items-center justify-center mb-4">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-[#211b29] text-base mb-1">Billing &amp; Invoices</h3>
                <p className="text-xs text-[#7c727e] mb-3 leading-relaxed">
                  GST invoices, Razorpay transactions, refunds, and corporate partnerships.
                </p>
                <a
                  href="mailto:billing@biolio.site"
                  className="text-xs font-bold text-[#6b47c8] hover:underline"
                >
                  billing@biolio.site &rarr;
                </a>
              </div>
            </div>

            {/* Direct message card */}
            <div className="rounded-3xl border border-[#e5dcd1] bg-[#fffdf8] p-8 shadow-sm">
              <h2 className="font-display text-2xl font-bold text-[#211b29] mb-2">
                Need immediate guidance?
              </h2>
              <p className="text-xs text-[#7c727e] mb-6">
                Check our documentation or common questions first before opening a support ticket.
              </p>

              <div className="flex flex-wrap gap-4 text-xs font-bold">
                <Link
                  href="/faq"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#211b29] px-5 py-3 text-white hover:bg-[#39303f] transition-all"
                >
                  <MessageSquare className="h-4 w-4" />
                  Read Biolio FAQ
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#e5dcd1] bg-[#fbf8f2] px-5 py-3 text-[#211b29] hover:bg-[#eae2dc] transition-all"
                >
                  View Modular Pricing
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
