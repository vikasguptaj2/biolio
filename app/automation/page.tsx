"use client";

import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Instagram } from "@/components/icons/instagram";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";

export default function AutomationProductPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f4efe7] text-[#211b29]">
      <MarketingHeader />

      <main className="flex-1">
        {/* Product Hero */}
        <section className="pt-16 pb-20 lg:pt-24 lg:pb-32 border-b border-[#e5dcd1] bg-[#211b29] text-white">
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#3a3040] bg-[#2d2536] px-3.5 py-1 text-xs font-bold text-[#c9b5f4] mb-6">
                <Instagram className="h-3.5 w-3.5 text-[#ff946f]" />
                PRODUCT &bull; DETERMINISTIC INSTAGRAM AUTOMATION
              </div>
              <h1 className="font-editorial text-5xl sm:text-6xl font-semibold tracking-tight text-white mb-6 leading-tight">
                Turn comments into conversations. Conversations into customers.
              </h1>
              <p className="text-base sm:text-lg text-[#b9aebb] leading-relaxed mb-8">
                Say goodbye to clunky bot builders that fail during viral spikes. Biolio connects directly to Meta Graph API v21.0 with HMAC SHA-256 ingress and durable PostgreSQL worker queues.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#f36b3f] px-6 py-3.5 text-xs font-bold text-white shadow-md hover:bg-[#ee7048] transition-all"
                >
                  Connect Your Instagram
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#3a3040] bg-transparent px-6 py-3.5 text-xs font-bold text-white hover:bg-[#3a3040] transition-colors"
                >
                  View Automation Pricing
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Flow */}
        <section className="py-20 lg:py-28 border-b border-[#e5dcd1] bg-[#fffdf8]">
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-[#f36b3f] mb-2 block">
                How It Works
              </span>
              <h2 className="font-editorial text-4xl font-semibold text-[#211b29] mb-4">
                Zero AI hallucinations. Instant execution.
              </h2>
              <p className="text-sm text-[#7c727e]">
                Every rule is deterministic. You choose the exact keywords, we ensure the message delivers within seconds.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="rounded-xl border border-[#e5dcd1] bg-[#f4efe7] p-8">
                <div className="text-3xl font-editorial font-bold text-[#f36b3f] mb-4">
                  01
                </div>
                <h3 className="font-editorial text-2xl font-bold text-[#211b29] mb-2">
                  Comment or DM Trigger
                </h3>
                <p className="text-xs text-[#7c727e] leading-relaxed">
                  A follower comments <code className="bg-[#fffdf8] px-1.5 py-0.5 rounded font-mono text-[#211b29]">&quot;WORKSHOP&quot;</code> on your Reel, or mentions your handle in their Story.
                </p>
              </div>

              {/* Step 2 */}
              <div className="rounded-xl border border-[#e5dcd1] bg-[#f4efe7] p-8">
                <div className="text-3xl font-editorial font-bold text-[#f36b3f] mb-4">
                  02
                </div>
                <h3 className="font-editorial text-2xl font-bold text-[#211b29] mb-2">
                  Durable Verification
                </h3>
                <p className="text-xs text-[#7c727e] leading-relaxed">
                  Meta delivers the webhook to our HMAC-verified ingress. The job is queued atomically in PostgreSQL with cooldown & rate limit checks.
                </p>
              </div>

              {/* Step 3 */}
              <div className="rounded-xl border border-[#e5dcd1] bg-[#f4efe7] p-8">
                <div className="text-3xl font-editorial font-bold text-[#f36b3f] mb-4">
                  03
                </div>
                <h3 className="font-editorial text-2xl font-bold text-[#211b29] mb-2">
                  Instant DM Delivery
                </h3>
                <p className="text-xs text-[#7c727e] leading-relaxed">
                  Within 2 seconds, the user receives their custom direct message with your private link, coupon, or download attachment.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Guardrails and Safety Section */}
        <section className="py-20 lg:py-28 bg-[#f4efe7]">
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#277a67] mb-2 block">
                  Built-in Instagram Compliance
                </span>
                <h2 className="font-editorial text-4xl font-semibold text-[#211b29] mb-6">
                  Protecting your account reputation 24/7.
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[#277a67] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-[#211b29]">
                        Per-User Cooldown Timers
                      </h4>
                      <p className="text-xs text-[#7c727e] mt-1">
                        Prevent spam flooding by configuring a minimum cooldown window (e.g. 1 hour) before the same user can re-trigger the same rule.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[#277a67] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-[#211b29]">
                        Daily Rate Limit Safeguards
                      </h4>
                      <p className="text-xs text-[#7c727e] mt-1">
                        Hard throttles respect Meta&apos;s rolling 24-hour interaction windows so your account never triggers shadowbans or spam flags.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[#277a67] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-[#211b29]">
                        Append-Only Execution Logging
                      </h4>
                      <p className="text-xs text-[#7c727e] mt-1">
                        Every single trigger, matched keyword, payload, and API dispatch status is immutably recorded for complete auditability.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-8 shadow-md">
                <div className="flex items-center justify-between pb-4 border-b border-[#eee6dc] mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-[#277a67]" />
                    <span className="text-xs font-bold text-[#211b29]">
                      Rule: Reel Giveaway Link
                    </span>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-[#e4f1eb] text-[#277a67] px-2 py-0.5 rounded font-bold">
                    Active
                  </span>
                </div>

                <div className="space-y-3 text-xs text-[#7c727e]">
                  <div className="flex justify-between py-2 border-b border-[#eee6dc]">
                    <span className="font-medium">Trigger Type:</span>
                    <span className="font-bold text-[#211b29]">Post & Reel Comments</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#eee6dc]">
                    <span className="font-medium">Matching Mode:</span>
                    <span className="font-bold text-[#211b29]">Contains Any Keyword</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#eee6dc]">
                    <span className="font-medium">Keywords:</span>
                    <span className="font-mono text-[#f36b3f] font-bold">
                      &quot;LINK&quot;, &quot;GIFT&quot;, &quot;PRESET&quot;
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#eee6dc]">
                    <span className="font-medium">Per-User Cooldown:</span>
                    <span className="font-bold text-[#211b29]">30 Minutes</span>
                  </div>
                  <div className="pt-2">
                    <span className="font-medium block mb-2">Automated DM Payload:</span>
                    <div className="rounded-lg bg-[#f4efe7] p-3 text-[11px] text-[#211b29] font-medium leading-relaxed">
                      &quot;Hey there! Thanks for your comment. Here is your VIP download link: https://biolio.site/elena/presets &amp; enjoy!&quot;
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

