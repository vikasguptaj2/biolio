import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { Scale } from "lucide-react";

export const metadata = {
  title: "Terms of Service | Biolio",
  description: "Terms and conditions governing the use of Biolio creator websites and Instagram DM automation.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fbf8f2] text-[#211b29]">
      <MarketingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-[#f2eae1] py-16 border-b border-[#e5dcd1]">
          <div className="mx-auto max-w-4xl px-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#f36b3f]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#d44d22] mb-4">
              <Scale className="h-3.5 w-3.5" />
              Legal Agreement
            </div>
            <h1 className="font-editorial text-4xl sm:text-5xl font-semibold tracking-tight text-[#271f2b]">
              Terms of Service
            </h1>
            <p className="mt-4 text-sm sm:text-base text-[#776d79] leading-relaxed">
              Last updated: November 6, 2026 &bull; Please read these terms carefully before creating a Biolio workspace.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-16">
          <div className="mx-auto max-w-4xl px-6 space-y-12 text-sm leading-relaxed text-[#4b4351]">
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-[#211b29]">
                1. Acceptance of Terms
              </h2>
              <p>
                By signing up for, accessing, or using Biolio (operated by Biolio Technologies Inc. at <code className="bg-[#f4efe7] px-1.5 py-0.5 rounded text-xs">biolio.site</code>), you agree to be bound by these Terms of Service. If you are entering into this agreement on behalf of a company or other legal entity, you represent that you have the authority to bind such entity.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-[#211b29]">
                2. Biolio Products &amp; Modular Plans
              </h2>
              <p>
                Biolio provides two modular products within a unified creator platform:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
                <li>
                  <strong className="text-[#211b29]">Biolio Bio:</strong> Customizable link-in-bio website studio, 17 curated aesthetic templates, blog/journal editor, portfolio gallery, brand collaborations showcase, and visitor inquiry forms.
                </li>
                <li>
                  <strong className="text-[#211b29]">Biolio Instagram Automation:</strong> Meta Graph API v21.0 compliant keyword matching, comment-to-DM triggers, and execution queue workflows.
                </li>
              </ul>
              <p>
                Subscriptions are offered standalone or as an All-in-One Bundle. Single-product subscriptions enforce a strict product lock on the unsubscribed module until an upgrade or bundle switch is completed.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-[#211b29]">
                3. Instagram Automation &amp; Meta Platform Policies
              </h2>
              <p>
                When using Biolio Instagram Automation, you agree to:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
                <li>
                  Strictly abide by Meta&apos;s Platform Terms and Instagram Community Guidelines.
                </li>
                <li>
                  Send private replies only to users who have voluntarily commented on your posts or Reels.
                </li>
                <li>
                  Never send misleading, fraudulent, defamatory, sexually explicit, or unsolicited commercial messages (spam).
                </li>
                <li>
                  Acknowledge that Meta enforces an hourly ceiling of 750 private replies per account. Biolio enforces internal queue rate limiting to protect your account reputation.
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-[#211b29]">
                4. Account Responsibilities &amp; Content Moderation
              </h2>
              <p>
                You retain all ownership rights to the content you publish on your Biolio site or dispatch via Instagram. However, you grant Biolio a worldwide, royalty-free license to host, display, and transmit your content solely for the purpose of operating the service.
              </p>
              <p>
                Biolio reserves the right to immediately suspend or terminate any workspace found distributing malware, phishing links, illegal material, copyright infringement, or hate speech.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-[#211b29]">
                5. Billing, Renewals &amp; Cancellation
              </h2>
              <p>
                Paid subscriptions renew automatically at the end of each billing cycle (monthly or annually) via Razorpay recurring authorization until explicitly cancelled. You may cancel your subscription at any time from your Billing Dashboard; your access will remain active until the end of the current paid billing period.
              </p>
              <p>
                For details on refunds and chargebacks, please review our{" "}
                <Link href="/refunds" className="text-[#f36b3f] underline">
                  Refund &amp; Cancellation Policy
                </Link>.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-[#211b29]">
                6. Limitation of Liability
              </h2>
              <p>
                To the maximum extent permitted by applicable Indian law, Biolio Technologies Inc. shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues resulting from Meta platform downtime, API deprecations, or account suspension by Meta.
              </p>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

