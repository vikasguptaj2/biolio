"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { BIOLIO_TEMPLATES } from "@/lib/design-tokens";

export default function TemplatesPage() {
  const [activeFilter, setActiveFilter] = useState("all");

  const categories = [
    { id: "all", label: "All Templates" },
    { id: "editorial", label: "Editorial & Fashion" },
    { id: "dark", label: "Dark & Luxury" },
    { id: "wellness", label: "Clean & Organic" },
    { id: "minimal", label: "Minimalist" },
  ];

  const templatesList = Object.values(BIOLIO_TEMPLATES);

  const filteredTemplates = templatesList.filter((t) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "editorial") return t.id === "atelier-editorial" || t.id === "sunset-amber";
    if (activeFilter === "dark") return t.id === "obsidian-noir" || t.id === "tokyo-cyber";
    if (activeFilter === "wellness") return t.id === "sage-botanical";
    if (activeFilter === "minimal") return t.id === "studio-minimal";
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#f4efe7] text-[#211b29]">
      <MarketingHeader />

      <main className="flex-1 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#f36b3f] mb-2 block">
              Curated Design System
            </span>
            <h1 className="font-editorial text-4xl sm:text-5xl font-semibold text-[#211b29] mb-4">
              Templates designed like magazine covers.
            </h1>
            <p className="text-sm sm:text-base text-[#7c727e]">
              Every template is powered by typography pairings and responsive container tokens. Fully customizable in your bio studio.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center justify-center gap-2 mb-12 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveFilter(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  activeFilter === cat.id
                    ? "bg-[#211b29] text-white shadow-sm"
                    : "bg-[#fffdf8] text-[#7c727e] border border-[#e5dcd1] hover:text-[#211b29]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] overflow-hidden shadow-xs hover:shadow-xl transition-all group flex flex-col justify-between"
              >
                {/* Visual Preview Box */}
                <div
                  className="p-8 min-h-[260px] flex flex-col items-center justify-center border-b transition-colors relative"
                  style={{
                    backgroundColor: template.theme.bg,
                    borderColor: template.theme.border,
                  }}
                >
                  {/* Miniature Avatar */}
                  <div
                    className="h-16 w-16 mb-4 flex items-center justify-center text-xl font-bold shadow-md"
                    style={{
                      borderRadius: template.theme.avatarRadius,
                      backgroundColor: template.theme.cardBg,
                      color: template.theme.text,
                      border: `2px solid ${template.theme.border}`,
                      fontFamily: template.theme.fontHeading,
                    }}
                  >
                    B
                  </div>

                  {/* Title & Subtitle */}
                  <div
                    className="text-center font-bold text-base mb-1"
                    style={{
                      color: template.theme.text,
                      fontFamily: template.theme.fontHeading,
                    }}
                  >
                    {template.name}
                  </div>
                  <div
                    className="text-[11px] text-center mb-4 max-w-[200px]"
                    style={{
                      color: template.theme.mutedText,
                      fontFamily: template.theme.fontBody,
                    }}
                  >
                    {template.category}
                  </div>

                  {/* Sample Link Button */}
                  <div
                    className="w-full max-w-[210px] py-2.5 px-3 text-center text-xs font-bold shadow-xs transition-transform group-hover:scale-105"
                    style={{
                      backgroundColor: template.theme.buttonBg,
                      color: template.theme.buttonText,
                      borderRadius: template.theme.cardRadius,
                      fontFamily: template.theme.fontBody,
                    }}
                  >
                    View Latest Editorial
                  </div>
                </div>

                {/* Details Card */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-editorial text-2xl font-bold text-[#211b29]">
                      {template.name}
                    </h3>
                    <span className="text-[10px] font-mono font-bold uppercase bg-[#f4efe7] text-[#7c727e] px-2 py-0.5 rounded">
                      {template.id}
                    </span>
                  </div>

                  <p className="text-xs text-[#7c727e] leading-relaxed mb-6">
                    {template.description}
                  </p>

                  <div className="pt-4 border-t border-[#eee6dc] flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#277a67]">
                      <Check className="h-3.5 w-3.5" />
                      Free with all plans
                    </div>
                    <Link
                      href={`/signup?template=${template.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#f36b3f] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#ee7048] transition-colors"
                    >
                      Use Template
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}

