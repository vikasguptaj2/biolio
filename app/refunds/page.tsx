import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { Receipt, CheckCircle } from "lucide-react";

export const metadata = {
  title: "Refund and Cancellation Policy | Biolio",
  description: "Biolio refund policy, subscription cancellation terms, and Razorpay dispute procedures.",
};

export default function RefundsPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fbf8f2] text-[#211b29]">
      <MarketingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-[#f2eae1] py-16 border-b border-[#e5dcd1]">
          <div className="mx-auto max-w-4xl px-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#f36b3f]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#d44d22] mb-4">
              <Receipt className="h-3.5 w-3.5" />
              Fair Billing Guarantee
            </div>
            <h1 className="font-editorial text-4xl sm:text-5xl font-semibold tracking-tight text-[#271f2b]">
              Refund &amp; Cancellation Policy
            </h1>
            <p className="mt-4 text-sm sm:text-base text-[#776d79] leading-relaxed">
              Clear, transparent terms regarding your subscriptions, upgrades, and refund eligibility.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-16">
          <div className="mx-auto max-w-4xl px-6 space-y-12 text-sm leading-relaxed text-[#4b4351]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-[#badbcc] bg-[#d1e7dd]/40 p-6">
                <div className="flex items-center gap-2 text-[#0f5132] font-bold text-base mb-2">
                  <CheckCircle className="h-5 w-5" />
                  14-Day Money-Back Guarantee
                </div>
                <p className="text-xs text-[#0f5132]/90 leading-relaxed">
                  If you purchase an annual plan or your first monthly subscription and determine that Biolio is not the right fit for your brand within 14 calendar days of payment, we will issue a full refund upon request.
                </p>
              </div>

              <div className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-6">
                <div className="flex items-center gap-2 text-[#211b29] font-bold text-base mb-2">
                  <Receipt className="h-5 w-5 text-[#f36b3f]" />
                  Self-Serve One-Click Cancellation
                </div>
                <p className="text-xs text-[#7c727e] leading-relaxed">
                  Cancel anytime directly from your Biolio billing console with zero lock-in or retention hoops. Your service remains active until the end of the paid billing period.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-[#211b29]">
                1. How to Cancel Your Subscription
              </h2>
              <p>
                To cancel your recurring Biolio subscription:
              </p>
              <ol className="list-decimal pl-5 space-y-2 text-xs sm:text-sm">
                <li>Log in to your workspace at <Link href="/dashboard/billing" className="text-[#f36b3f] underline">biolio.site/dashboard/billing</Link>.</li>
                <li>Under &ldquo;Subscription Details&rdquo;, click &ldquo;Manage Subscription&rdquo; &rarr; &ldquo;Cancel Plan&rdquo;.</li>
                <li>Confirm the cancellation. Your plan will not renew at the next billing date.</li>
              </ol>
              <p>
                No further charges will be made to your payment method once cancellation is requested.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-[#211b29]">
                2. Eligibility for Refunds
              </h2>
              <p>
                Refunds are processed under the following terms:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
                <li>
                  <strong className="text-[#211b29]">Initial Purchase:</strong> Refund requests submitted within 14 days of the initial subscription payment are eligible for a 100% full refund.
                </li>
                <li>
                  <strong className="text-[#211b29]">Monthly Renewals:</strong> Monthly renewal charges are non-refundable after 48 hours following the renewal date, except in cases of verified technical malfunction or duplicate billing.
                </li>
                <li>
                  <strong className="text-[#211b29]">Annual Subscriptions:</strong> Beyond the 14-day window, annual plans may be cancelled for a prorated refund reflecting the unused remaining full months.
                </li>
                <li>
                  <strong className="text-[#211b29]">Promotional or Discounted Purchases:</strong> Plans purchased using promotional coupon codes remain eligible for the 14-day refund policy, refunded at the actual amount paid after discount.
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-[#211b29]">
                3. Refund Processing Time
              </h2>
              <p>
                Once approved by our billing team, refunds are dispatched immediately through our payment partner (Razorpay). Depending on your banking institution, funds typically reflect in your account within 5 to 7 business days (Credit/Debit Cards, Net Banking) or 24 to 48 hours (UPI).
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-[#211b29]">
                4. Requesting a Refund
              </h2>
              <p>
                To request a refund, please send an email to <a href="mailto:billing@biolio.site" className="text-[#f36b3f] underline">billing@biolio.site</a> with:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
                <li>Your registered account email address.</li>
                <li>Workspace slug (e.g. <code className="bg-[#f4efe7] px-1.5 py-0.5 rounded text-xs">biolio.site/yourhandle</code>).</li>
                <li>Razorpay payment ID or invoice number (available in your billing dashboard).</li>
              </ul>
              <p>
                Our billing team responds within 24 business hours.
              </p>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

