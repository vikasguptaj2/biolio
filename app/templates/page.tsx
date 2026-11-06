"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Eye, X, Sparkles, Check } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import {
  BIO_TEMPLATES,
  type BiolioTemplateConfig,
} from "@/lib/design-tokens";

export default function TemplatesPage() {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [previewTemplate, setPreviewTemplate] =
    useState<BiolioTemplateConfig | null>(null);

  const categories = [
    { id: "all", label: `All Templates (${BIO_TEMPLATES.length})` },
    { id: "editorial", label: "Editorial & Story" },
    { id: "dark", label: "Dark & Luxury" },
    { id: "wellness", label: "Coastal & Organic" },
    { id: "minimal", label: "Architectural & Minimal" },
  ];

  const filteredTemplates = BIO_TEMPLATES.filter((t) => {
    if (activeFilter === "all") return true;
    return t.filterGroup === activeFilter;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf8f2] text-[#211b29]">
      <MarketingHeader />

      <main className="flex-1">
        {/* Hero Header */}
        <section className="bg-[#f2eae1] py-20 border-b border-[#e5dcd1]">
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="text-[10px] font-extrabold uppercase tracking-[2px] text-[#bd5636] mb-4">
              THE BIOLIO TEMPLATE COLLECTION &bull; 17 CURATED EDITIONS
            </div>
            <h1 className="font-editorial text-5xl sm:text-6xl font-semibold text-[#271f2b] max-w-3xl leading-[1.02]">
              A good first draft <br />
              <em className="font-normal italic text-[#f36b3f]">
                for your online world.
              </em>
            </h1>
            <p className="mt-5 text-sm sm:text-base text-[#776d79] max-w-xl leading-relaxed">
              Choose a visual starting point from our 17 seeded templates—including Sunday Studio, Coastline, Form &amp; Function, Atelier Editorial, and Obsidian Noir. Switch anytime without losing content.
            </p>

            {/* Filter Pills */}
            <div className="mt-8 flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveFilter(cat.id)}
                  className={`rounded-full px-4 py-2 text-xs font-extrabold transition-all cursor-pointer ${
                    activeFilter === cat.id
                      ? "bg-[#211b29] text-white shadow-sm"
                      : "bg-[#fffdf8] text-[#6e6370] border border-[#ded4ca] hover:text-[#211b29]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* All 17 Templates Grid */}
        <section className="py-16 mx-auto max-w-7xl px-6 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((tpl) => (
              <article
                key={tpl.id}
                className="group rounded-[7px] border border-[#e4dbd0] bg-[#fffdf8] p-3.5 shadow-xs hover:shadow-xl transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Editorial Photo + Live Token Mini Card */}
                  <div
                    className="relative h-60 w-full rounded-[5px] overflow-hidden border"
                    style={{
                      backgroundColor: tpl.theme.bg,
                      borderColor: tpl.theme.border,
                    }}
                  >
                    <img
                      src={tpl.previewImage}
                      alt={tpl.name}
                      className="h-32 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="p-4 flex flex-col items-center text-center -mt-7 relative z-10">
                      <div
                        className="h-12 w-12 flex items-center justify-center font-editorial font-bold text-sm shadow-md border-2 border-white"
                        style={{
                          backgroundColor: tpl.theme.accent,
                          color: "#ffffff",
                          borderRadius: tpl.theme.avatarRadius,
                        }}
                      >
                        AM
                      </div>
                      <div
                        className="mt-2 font-editorial font-bold text-base"
                        style={{ color: tpl.theme.text }}
                      >
                        Alex Morgan
                      </div>
                      <div
                        className="mt-2 w-full max-w-[200px] py-1.5 px-3 text-[10px] font-extrabold truncate shadow-2xs"
                        style={{
                          backgroundColor: tpl.theme.buttonBg,
                          color: tpl.theme.buttonText,
                          borderRadius: tpl.theme.cardRadius,
                        }}
                      >
                        Explore Portfolio ↗
                      </div>
                    </div>

                    <span className="absolute top-2.5 right-2.5 rounded bg-[#211b29]/85 backdrop-blur-xs px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white">
                      {tpl.minTier}
                    </span>
                  </div>

                  {/* Metadata */}
                  <div className="pt-4 px-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-editorial text-xl font-semibold text-[#211b29]">
                        {tpl.name}
                      </h3>
                      <span className="text-[10px] font-bold text-[#877c85]">
                        {tpl.category}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-[#7c727e] leading-relaxed">
                      {tpl.description}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 pt-3 border-t border-[#eee6dc] flex items-center justify-between gap-2 px-1">
                  <button
                    type="button"
                    onClick={() => setPreviewTemplate(tpl)}
                    className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#bb5735] hover:text-[#f36b3f] cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Preview template
                  </button>
                  <Link
                    href={`/signup?template=${encodeURIComponent(tpl.id)}`}
                    className="inline-flex items-center gap-1 rounded-[5px] bg-[#211b29] px-3.5 py-2 text-[11px] font-extrabold text-white hover:bg-[#3a3040]"
                  >
                    Use template
                    <ArrowUpRight className="h-3.5 w-3.5 text-[#f36b3f]" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      {/* Interactive Live Phone Modal Preview */}
      {previewTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#211b29]/75 backdrop-blur-xs p-4"
          onClick={() => setPreviewTemplate(null)}
        >
          <div
            className="w-full max-w-3xl rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-6 md:p-8 shadow-2xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Frame */}
            <div className="md:col-span-6 flex justify-center">
              <div
                className="w-[270px] rounded-[28px] border-[6px] border-[#211b29] p-4 shadow-2xl space-y-3"
                style={{
                  backgroundColor: previewTemplate.theme.bg,
                  color: previewTemplate.theme.text,
                }}
              >
                <div className="mx-auto h-3 w-20 rounded-b-lg bg-[#211b29] -mt-4 mb-2" />
                <div className="text-center space-y-1.5">
                  <img
                    src={previewTemplate.previewImage}
                    alt={previewTemplate.name}
                    className="h-16 w-16 mx-auto object-cover border-2 border-white shadow"
                    style={{
                      borderRadius: previewTemplate.theme.avatarRadius,
                    }}
                  />
                  <div className="font-editorial text-lg font-bold">
                    Alex Morgan
                  </div>
                  <div
                    className="text-[10px]"
                    style={{ color: previewTemplate.theme.mutedText }}
                  >
                    Photographer · Visual Storyteller
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  {[
                    "✦ Explore my latest work",
                    "▶ Watch visual diaries",
                    "◈ Brand collaborations",
                    "✉ Work with me",
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="px-3 py-2.5 text-[10px] font-bold flex items-center justify-between border"
                      style={{
                        backgroundColor: previewTemplate.theme.cardBg,
                        color: previewTemplate.theme.text,
                        borderColor: previewTemplate.theme.border,
                        borderRadius: previewTemplate.theme.cardRadius,
                      }}
                    >
                      <span>{item}</span>
                      <span>↗</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Template Details */}
            <div className="md:col-span-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded bg-[#fce8df] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#b74f2e]">
                  <Sparkles className="h-3 w-3" /> {previewTemplate.category}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  className="rounded-lg border border-[#e5dcd1] p-1.5 text-[#7c727e] hover:text-[#211b29] cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <h2 className="font-editorial text-3xl font-semibold text-[#211b29]">
                {previewTemplate.name}
              </h2>
              <p className="text-xs text-[#7c727e] leading-relaxed">
                {previewTemplate.description}
              </p>

              <ul className="space-y-2 text-xs text-[#5f5661] pt-2">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#277a67]" />
                  Includes Hero, Links, Portfolio Gallery, Collaborations &amp; Blog
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#277a67]" />
                  Responsive mobile-first layout &amp; SEO metadata
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#277a67]" />
                  Minimum Tier:{" "}
                  <strong className="uppercase">{previewTemplate.minTier}</strong>
                </li>
              </ul>

              <div className="pt-4 flex gap-3">
                <Link
                  href={`/signup?template=${encodeURIComponent(
                    previewTemplate.id
                  )}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-[5px] bg-[#f36b3f] py-3 px-4 text-xs font-extrabold text-white shadow-md hover:bg-[#e55f34]"
                >
                  Start with {previewTemplate.name} ↗
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <MarketingFooter />
    </div>
  );
}