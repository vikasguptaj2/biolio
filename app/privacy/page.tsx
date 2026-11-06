import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { ShieldCheck, Lock, EyeOff, Clock } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | Biolio",
  description:
    "How Biolio protects creator data, visitor privacy, and Instagram commenter data in accordance with the Digital Personal Data Protection (DPDP) Act.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fbf8f2] text-[#211b29]">
      <MarketingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-[#f2eae1] py-16 border-b border-[#e5dcd1]">
          <div className="mx-auto max-w-4xl px-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#f36b3f]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#d44d22] mb-4">
              <ShieldCheck className="h-3.5 w-3.5" />
              Privacy & Data Governance
            </div>
            <h1 className="font-editorial text-4xl sm:text-5xl font-semibold tracking-tight text-[#271f2b]">
              Privacy Policy
            </h1>
            <p className="mt-4 text-sm sm:text-base text-[#776d79] leading-relaxed">
              Last updated: November 6, 2026 &bull; Effective immediately for all Biolio users, visitors, and connected accounts.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-16">
          <div className="mx-auto max-w-4xl px-6 space-y-12 text-sm leading-relaxed text-[#4b4351]">
            {/* Core Commitments */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-6 shadow-sm">
                <div className="h-9 w-9 rounded-xl bg-[#e5f3ed] text-[#25856e] flex items-center justify-center mb-3">
                  <EyeOff className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-[#211b29] text-base mb-1">Zero Tracking Cookies</h3>
                <p className="text-xs text-[#7c727e]">
                  Public creator bio pages operate completely cookie-free. Visitor analytics are anonymized using one-way daily salted hashes.
                </p>
              </div>

              <div className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-6 shadow-sm">
                <div className="h-9 w-9 rounded-xl bg-[#f2ecfc] text-[#6b47c8] flex items-center justify-center mb-3">
                  <Lock className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-[#211b29] text-base mb-1">Encrypted Meta Tokens</h3>
                <p className="text-xs text-[#7c727e]">
                  Instagram OAuth access tokens are encrypted at rest with AES-256-GCM and accessible solely by backend background jobs.
                </p>
              </div>

              <div className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-6 shadow-sm">
                <div className="h-9 w-9 rounded-xl bg-[#fff2d8] text-[#ad7826] flex items-center justify-center mb-3">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-[#211b29] text-base mb-1">Strict 30-Day Retention</h3>
                <p className="text-xs text-[#7c727e]">
                  Instagram comment text and webhook event payloads are purged automatically within 30 days per DPDP and Meta platform policies.
                </p>
              </div>
            </div>

            {/* Section 1 */}
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-[#211b29]">
                1. Information We Collect
              </h2>
              <p>
                Biolio Technologies Inc. (&ldquo;Biolio&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) collects minimal personal information necessary to deliver creator link-in-bio sites and Instagram DM automation:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
                <li>
                  <strong className="text-[#211b29]">Creator Account Information:</strong> Full name, email address, password hash (scrypt) or Google OAuth profile identifiers when you register a workspace.
                </li>
                <li>
                  <strong className="text-[#211b29]">Workspace &amp; Studio Content:</strong> Custom handle, display name, biography, profile avatar, links, portfolio gallery images, journal/blog markdown, and branding preferences.
                </li>
                <li>
                  <strong className="text-[#211b29]">Instagram Integration Metadata:</strong> Instagram Professional account ID, username, and encrypted OAuth tokens obtained with your explicit consent via Meta Login. We never receive or store your Instagram password.
                </li>
                <li>
                  <strong className="text-[#211b29]">Payment Records:</strong> Razorpay payment identifiers, subscription plan tiers, and billing periods. Credit/debit card details and UPI PINs are processed directly by RBI-authorized payment aggregators (Razorpay) and are never stored on Biolio servers.
                </li>
              </ul>
            </div>

            {/* Section 2 */}
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-[#211b29]">
                2. Privacy-Preserving Bio Analytics
              </h2>
              <p>
                Public bio pages (<code className="bg-[#f4efe7] px-1.5 py-0.5 rounded text-xs">biolio.site/[handle]</code>) respect visitor privacy:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
                <li>We do not place tracking cookies or third-party advertising pixels on creator pages.</li>
                <li>
                  Visitor IP addresses and User-Agent headers are salted with a rotating daily salt and converted to a one-way HMAC-SHA256 hash. The raw IP address is discarded immediately in memory.
                </li>
                <li>
                  Daily hashes cannot be linked across multiple days or reverse-engineered to identify individuals.
                </li>
              </ul>
            </div>

            {/* Section 3 */}
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-[#211b29]">
                3. Instagram Platform Data &amp; Webhook Compliance
              </h2>
              <p>
                When you connect your Instagram Professional account to Biolio Instagram Automation:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
                <li>
                  We receive webhook notifications from Meta containing comment text, media IDs, and commenter Instagram scoped IDs.
                </li>
                <li>
                  Comment text is used exclusively to evaluate your keyword rules (e.g. &ldquo;exact word match&rdquo;) and dispatch automated private replies.
                </li>
                <li>
                  We do not build behavioral profiles, train general AI models on commenter data, or sell commenter contact information to third parties.
                </li>
                <li>
                  All raw webhook events and comment text are permanently deleted after 30 days via automated daily purge jobs.
                </li>
              </ul>
            </div>

            {/* Section 4 */}
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-[#211b29]">
                4. Data Deletion &amp; Meta Deletion Callback
              </h2>
              <p>
                You may disconnect Instagram or delete your entire Biolio account at any time:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
                <li>
                  <strong className="text-[#211b29]">Instagram Disconnect:</strong> In your Biolio dashboard under <Link href="/dashboard/automation" className="text-[#f36b3f] underline">Automation &rarr; Settings</Link>, click &ldquo;Disconnect Instagram&rdquo;. Your access tokens are immediately purged and rules are paused.
                </li>
                <li>
                  <strong className="text-[#211b29]">Meta App Deletion Callback:</strong> If you remove the Biolio application from your Facebook or Instagram App settings, Meta dispatches a data deletion request to our callback endpoint (<code className="bg-[#f4efe7] px-1.5 py-0.5 rounded text-xs">/api/webhooks/instagram/deletion</code>). All associated tokens and queued executions are purged within 24 hours.
                </li>
                <li>
                  <strong className="text-[#211b29]">Full Account Erasure:</strong> To request complete data erasure under the Digital Personal Data Protection (DPDP) Act, visit Account Settings or email our Data Protection Officer at <a href="mailto:privacy@biolio.site" className="text-[#f36b3f] underline">privacy@biolio.site</a>.
                </li>
              </ul>
            </div>

            {/* Section 5 */}
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-[#211b29]">
                5. Grievance Officer &amp; Inquiries
              </h2>
              <p>
                In compliance with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, the details of our Grievance Officer are:
              </p>
              <div className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-5 text-xs space-y-1.5">
                <div className="font-bold text-[#211b29]">Grievance Officer: Vikas Gupta</div>
                <div>Biolio Technologies Inc.</div>
                <div>Email: <a href="mailto:grievance@biolio.site" className="text-[#f36b3f] underline">grievance@biolio.site</a> / <a href="mailto:support@biolio.site" className="text-[#f36b3f] underline">support@biolio.site</a></div>
                <div>Response SLA: Acknowledged within 24 hours, resolved within 15 working days.</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

