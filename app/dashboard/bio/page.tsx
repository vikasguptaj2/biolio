"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { BIO_TEMPLATES } from "@/lib/design-tokens";
import { CloudinaryUpload } from "@/components/media/cloudinary-upload";
import type { EvaluatedWorkspaceEntitlements } from "@/lib/entitlements";
import {
  ProductLockPaywall,
  FeatureTierBanner,
} from "@/components/dashboard/feature-lock";
import {
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Loader2,
  Sparkles,
  Lock,
  Copy,
  Eye,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { parsePublicVideoLink } from "@/lib/video-links";

type BuilderSection =
  | "content"
  | "links"
  | "sections"
  | "gallery"
  | "collabs"
  | "blog"
  | "inquiries"
  | "seo"
  | "style"
  | "preview";

interface InquiryItem {
  id: string;
  sender_name: string;
  sender_email: string;
  budget_range?: string;
  message: string;
}

const PAGE_SECTIONS = [
  { key: "links", title: "Smart links & socials", desc: "Your primary destinations", icon: "↗" },
  { key: "featured_work", title: "Featured work", desc: "One project visitors should see first", icon: "✦" },
  { key: "gallery", title: "Portfolio gallery", desc: "Images and linked video work", icon: "▦" },
  { key: "collaborations", title: "Brand collaborations", desc: "Partnerships and client work", icon: "◈" },
  { key: "blog", title: "Blog & journal", desc: "Long-form notes and essays", icon: "▤" },
  { key: "about", title: "About me", desc: "Your longer introduction", icon: "Aa" },
  { key: "contact", title: "Contact inquiries", desc: "Messages from brands and visitors", icon: "✉" },
] as const;

const DEFAULT_PAGE_SECTION_ORDER = PAGE_SECTIONS.map((section) => section.key);

export default function BioStudioPage() {
  const [activeTab, setActiveTab] = useState<BuilderSection>("content");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [entitlements, setEntitlements] =
    useState<EvaluatedWorkspaceEntitlements | null>(null);
  const [handle, setHandle] = useState("");
  const [bioProfileId, setBioProfileId] = useState("");
  const [avatarMediaId, setAvatarMediaId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverMediaId, setCoverMediaId] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [tagline, setTagline] = useState("");
  const [shortBio, setShortBio] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [igFollowers, setIgFollowers] = useState("");
  const [ytSubscribers, setYtSubscribers] = useState("");
  const [templateId, setTemplateId] = useState("sunday-studio");
  const [showBiolioBranding, setShowBiolioBranding] = useState(true);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [allowIndexing, setAllowIndexing] = useState(true);
  const [publishedVersion, setPublishedVersion] = useState(1);

  const [sectionsVisibility, setSectionsVisibility] = useState<
    Record<string, boolean>
  >({
    links: true,
    featured_work: true,
    gallery: true,
    collaborations: true,
    blog: true,
    about: true,
    services: false,
    contact: true,
  });
  const [sectionOrder, setSectionOrder] = useState<string[]>([...DEFAULT_PAGE_SECTION_ORDER]);

  const [links, setLinks] = useState<
    Array<{
      id?: string;
      title: string;
      url: string;
      icon: string;
      is_visible: boolean;
    }>
  >([]);

  const [galleryItems, setGalleryItems] = useState<
    Array<{
      id?: string;
      title: string;
      caption: string;
      external_url: string;
      category: string;
      media_asset_id?: string | null;
      media_type: "image" | "video_embed";
      is_featured: boolean;
    }>
  >([]);

  const [collaborations, setCollaborations] = useState<
    Array<{
      id?: string;
      brand_name: string;
      campaign_title: string;
      campaign_summary: string;
      collab_year: string;
      case_study_url: string;
    }>
  >([]);

  const [blogPosts, setBlogPosts] = useState<
    Array<{
      id?: string;
      title: string;
      slug: string;
      category: string;
      excerpt: string;
      content_markdown: string;
      status: string;
    }>
  >([]);

  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);

  function movePageSection(sectionKey: string, direction: -1 | 1) {
    setSectionOrder((current) => {
      const from = current.indexOf(sectionKey);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= current.length) return current;
      const next = [...current];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }

  useEffect(() => {
    async function loadStudio() {
      try {
        const res = await fetch("/api/bio/studio");
        const data = await res.json();
        if (!res.ok) {
          if (data?.error?.code === "MODULE_LOCKED") {
            setEntitlements({
              activePlanId: "ig_creator",
              activePlanLabel: "Biolio plan",
              activeScope: "automation_only",
              scope: "automation_only",
              bioState: "locked",
              igState: "paid",
              isBioProductLocked: true,
              isAutomationProductLocked: false,
              bioLockReason: data.error.message,
              bioTier: "free",
              bioMaxLinks: 0,
              bioMaxGalleryItems: 0,
              bioMaxBlogPosts: 0,
              canRemoveBranding: false,
              canRemoveBiolioBranding: false,
              canUseBlogPublishing: false,
              canExportAnalytics: false,
              canUseCustomThemes: false,
              igTier: "creator",
              automationMaxActiveRules: 5,
              automationMonthlyActionQuota: 2500,
              automationMonthlyActionsUsed: 0,
              automationQuotaPercent: 0,
              canUsePublicCommentReplies: true,
              logRetentionDays: 30,
            });
          } else {
            setErrorMsg(data?.error?.message || "Could not load Bio Studio.");
          }
          setLoading(false);
          return;
        }

        setEntitlements(data.entitlements);
        const p = data.profile || {};
        setBioProfileId(p.id || "");
        setAvatarMediaId(p.avatar_media_id || null);
        setCoverMediaId(p.cover_media_id || null);
        setAvatarUrl(p.avatar_url || "");
        setCoverUrl(p.cover_url || "");
        setHandle(p.handle || data.workspace?.slug || "");
        setDisplayName(
          p.display_name || data.workspace?.name || ""
        );
        setTagline(p.tagline || "");
        setShortBio(p.short_bio || p.about_story || "");
        setCategory(p.category || "");
        setLocation(p.location || "");
        setTemplateId(p.template_id || "sunday-studio");
        setSeoTitle(
          p.seo_title ||
            (p.display_name ? `${p.display_name} — Creator Website` : "")
        );
        setSeoDescription(
          p.seo_description ||
            p.short_bio ||
            ""
        );
        setAllowIndexing(Boolean(p.allow_indexing ?? true));

        if (p.sections_visibility) {
          setSectionsVisibility(p.sections_visibility);
        }
        if (Array.isArray(p.section_order)) {
          const requested = p.section_order.filter((key: string) => DEFAULT_PAGE_SECTION_ORDER.includes(key as typeof DEFAULT_PAGE_SECTION_ORDER[number]));
          setSectionOrder([...new Set([...requested, ...DEFAULT_PAGE_SECTION_ORDER])]);
        }
        if (p.theme_config && typeof p.theme_config === "object") {
          const tc = p.theme_config as Record<string, unknown>;
          if (tc.show_biolio_branding !== undefined) {
            setShowBiolioBranding(Boolean(tc.show_biolio_branding));
          }
        }
        const metrics = Array.isArray(p.creator_metrics)
          ? p.creator_metrics
          : [];
        const igMetric = metrics.find((m: { platform: string; value: string }) => m.platform === "instagram");
        const ytMetric = metrics.find((m: { platform: string; value: string }) => m.platform === "youtube");
        if (igMetric?.value) setIgFollowers(igMetric.value);
        if (ytMetric?.value) setYtSubscribers(ytMetric.value);

        if (Array.isArray(data.links) && data.links.length > 0) {
          setLinks(
            data.links.map((l: { id?: string; title: string; url: string; icon?: string; is_visible?: boolean }) => ({
              id: l.id,
              title: l.title,
              url: l.url,
              icon: l.icon || "✦",
              is_visible: Boolean(l.is_visible ?? true),
            }))
          );
        } else {
          setLinks([]);
        }

        if (Array.isArray(data.gallery) && data.gallery.length > 0) {
          setGalleryItems(
            data.gallery.map((g: { id?: string; title: string; caption?: string | null; external_url?: string; category?: string; media_asset_id?: string | null; media_type?: string; is_featured?: boolean }) => ({
              id: g.id,
              title: g.title,
              caption: g.caption || "",
              external_url: g.external_url || "",
              category: g.category || "General",
              media_asset_id: g.media_asset_id || null,
              media_type: g.media_type === "video_embed" ? "video_embed" : "image",
              is_featured: Boolean(g.is_featured),
            }))
          );
        } else {
          setGalleryItems([]);
        }

        if (
          Array.isArray(data.collaborations) &&
          data.collaborations.length > 0
        ) {
          setCollaborations(
            data.collaborations.map((c: { id?: string; brand_name: string; campaign_title?: string; campaign_summary?: string; collab_year?: string; case_study_url?: string }) => ({
              id: c.id,
              brand_name: c.brand_name,
              campaign_title: c.campaign_title || "Creative Partner",
              campaign_summary: c.campaign_summary || "",
              collab_year: c.collab_year || "2026",
              case_study_url: c.case_study_url || "https://biolio.site",
            }))
          );
        } else {
          setCollaborations([]);
        }

        if (Array.isArray(data.blogPosts) && data.blogPosts.length > 0) {
          setBlogPosts(
            data.blogPosts.map((b: { id?: string; title: string; slug: string; category?: string; excerpt?: string; content_markdown?: string; status?: string }) => ({
              id: b.id,
              title: b.title,
              slug: b.slug,
              category: b.category || "EDITORIAL",
              excerpt: b.excerpt || "",
              content_markdown: b.content_markdown || "",
              status: b.status || "published",
            }))
          );
        } else {
          setBlogPosts([]);
        }

        if (Array.isArray(data.inquiries)) {
          setInquiries(data.inquiries as InquiryItem[]);
        }
        if (Array.isArray(data.versions) && data.versions[0]?.version_number) {
          setPublishedVersion(data.versions[0].version_number);
        }
      } catch {
        setErrorMsg("Failed to connect to Bio Studio API.");
      } finally {
        setLoading(false);
      }
    }
    loadStudio();
  }, []);

  async function handleSaveAndPublish() {
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/bio/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          tagline,
          shortBio,
          aboutStory: shortBio,
          category,
          location,
          templateId,
          showBiolioBranding,
          avatarMediaId,
          coverMediaId,
          sectionsVisibility,
          sectionOrder,
          creatorMetrics: [
            { platform: "instagram", label: "Instagram", value: igFollowers },
            { platform: "youtube", label: "YouTube", value: ytSubscribers },
          ],
          seoTitle,
          seoDescription,
          allowIndexing,
          links,
          gallery: galleryItems,
          collaborations,
          blogPosts,
          publish: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error?.message || "Failed to publish changes.");
      } else {
        if (data?.published?.version_number) {
          setPublishedVersion(data.published.version_number);
        }
        showToast(
          `Published live snapshot v${
            data?.published?.version_number || publishedVersion
          } to biolio.site/${handle}`
        );
      }
    } catch {
      setErrorMsg("Network error while saving studio changes.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-[#f36b3f]" />
      </div>
    );
  }

  if (entitlements?.isBioProductLocked) {
    return (
      <ProductLockPaywall
        lockedProduct="bio"
        currentPlanLabel={entitlements.activePlanLabel}
        lockReason={
          entitlements.bioLockReason ||
          "Choose an active Biolio Bio plan to publish your creator website and portfolio."
        }
      />
    );
  }

  const activeTemplate =
    BIO_TEMPLATES.find((t) => t.id === templateId) || BIO_TEMPLATES[0];

  // Full-Page Public View Preview Mode
  if (activeTab === "preview") {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e2d8cd] pb-5">
          <div>
            <div className="text-[9px] font-extrabold uppercase tracking-[2px] text-[#c45a3a] mb-2">
              BIOLIO BIO &bull; PUBLIC VIEW
            </div>
            <h1 className="font-editorial text-4xl font-semibold text-[#251d2a]">
              This is what the world sees.
            </h1>
            <p className="text-xs text-[#817680] mt-1">
              Full-page preview of <code className="font-mono">biolio.site/{handle}</code> using the{" "}
              <strong>{activeTemplate.name}</strong> template.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab("content")}
              className="rounded-[5px] border border-[#ded4c9] bg-[#fffdf8] px-4 py-2.5 text-xs font-bold text-[#211b29] cursor-pointer"
            >
              &larr; Back to editor
            </button>
            <a
              href={`/${handle}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-[5px] bg-[#f36b3f] px-4 py-2.5 text-xs font-extrabold text-white"
            >
              Open Live URL ↗
            </a>
          </div>
        </div>

        <div className="rounded-[7px] border border-[#e5dbd0] bg-[#eee8e3] p-6">
          <div
            className="mx-auto max-w-3xl rounded-2xl overflow-hidden shadow-2xl border"
            style={{
              backgroundColor: activeTemplate.theme.bg,
              color: activeTemplate.theme.text,
              borderColor: activeTemplate.theme.border,
            }}
          >
            <div
              className="h-64 p-8 flex items-end relative bg-cover bg-center"
              style={{
                backgroundImage: `linear-gradient(90deg, rgba(33,27,41,0.75), rgba(33,27,41,0.2)), url('${activeTemplate.previewImage}')`,
              }}
            >
              <div className="text-white">
                <span className="rounded bg-white/20 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider">
                  {category}
                </span>
                <h2 className="font-editorial text-4xl font-bold mt-3">
                  {displayName}
                </h2>
                <p className="text-xs opacity-90 mt-1">{tagline}</p>
              </div>
            </div>

            <div className="p-8 space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6" style={{ borderColor: activeTemplate.theme.border }}>
                <div>
                  <div className="text-[9px] font-extrabold uppercase tracking-widest opacity-60">
                    A LITTLE ABOUT ME
                  </div>
                  <p className="font-editorial text-lg mt-2 max-w-xl leading-relaxed">
                    {shortBio}
                  </p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <div className="rounded-lg border p-3 text-center min-w-[90px]" style={{ backgroundColor: activeTemplate.theme.cardBg, borderColor: activeTemplate.theme.border }}>
                    <div className="text-[10px] opacity-70">◎ Instagram</div>
                    <div className="font-bold text-sm mt-0.5">{igFollowers}</div>
                  </div>
                  <div className="rounded-lg border p-3 text-center min-w-[90px]" style={{ backgroundColor: activeTemplate.theme.cardBg, borderColor: activeTemplate.theme.border }}>
                    <div className="text-[10px] opacity-70">▶ YouTube</div>
                    <div className="font-bold text-sm mt-0.5">{ytSubscribers}</div>
                  </div>
                </div>
              </div>

              {/* Links */}
              <div className="space-y-2.5">
                <div className="text-[9px] font-extrabold uppercase tracking-widest opacity-60">
                  FEATURED DESTINATIONS
                </div>
                {links
                  .filter((l) => l.is_visible)
                  .map((l, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3.5 border text-xs font-bold"
                      style={{
                        backgroundColor: activeTemplate.theme.cardBg,
                        borderColor: activeTemplate.theme.border,
                        borderRadius: activeTemplate.theme.cardRadius,
                      }}
                    >
                      <span>
                        {l.icon} {l.title}
                      </span>
                      <span>↗</span>
                    </div>
                  ))}
              </div>

              {/* Gallery */}
              {galleryItems.length > 0 && (
                <div className="space-y-3">
                  <div className="text-[9px] font-extrabold uppercase tracking-widest opacity-60">
                    SELECTED VISUAL STORIES
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {galleryItems.slice(0, 6).map((g, i) => (
                      <div
                        key={i}
                        className="rounded-lg overflow-hidden border"
                        style={{ borderColor: activeTemplate.theme.border }}
                      >
                        {g.external_url && (g.media_type === "video_embed" ? (
                          <a href={parsePublicVideoLink(g.external_url)?.canonicalUrl || undefined} target="_blank" rel="noopener noreferrer" className="flex h-36 items-center justify-center bg-[#211b29] px-3 text-center text-xs font-bold text-white">
                            {parsePublicVideoLink(g.external_url)?.hostLabel || "Video link"}
                          </a>
                        ) : (
                          <img src={g.external_url} alt={g.title} className="h-36 w-full object-cover" />
                        ))}
                        <div className="p-2.5 text-[11px] font-bold truncate">
                          {g.title}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-[6px] bg-[#211b29] px-4 py-3 text-xs font-bold text-white shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#6ac2a2]" />
          {toastMsg}
        </div>
      )}

      {/* Atelier Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e2d8cd] pb-5">
        <div>
          <div className="text-[9px] font-extrabold uppercase tracking-[2px] text-[#c45a3a] mb-2">
            BIOLIO BIO &bull; WEBSITE STUDIO
          </div>
          <h1 className="font-editorial text-4xl sm:text-5xl font-semibold tracking-tight text-[#251d2a]">
            Your website, your way.
          </h1>
          <p className="text-xs text-[#817680] mt-2">
            Shape a home for everything you create. Published Snapshot v{publishedVersion} &bull; Active Template:{" "}
            <strong className="text-[#211b29]">{activeTemplate.name}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className="inline-flex items-center gap-1.5 rounded-[5px] border border-[#ded4c9] bg-[#fffdf8] px-4 py-2.5 text-xs font-bold text-[#211b29] hover:border-[#211b29] cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5 text-[#f36b3f]" />
            Preview full page
          </button>
          <button
            type="button"
            onClick={handleSaveAndPublish}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-[5px] bg-[#ee7048] px-5 py-2.5 text-xs font-extrabold text-white shadow-[0_5px_12px_rgba(233,119,80,0.25)] hover:bg-[#e05e36] disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Publish changes
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-[7px] border border-[#f5c2c7] bg-[#f8d7da] p-4 text-xs font-bold text-[#842029]">
          {errorMsg}
        </div>
      )}

      {entitlements?.bioTier === "free" && (
        <FeatureTierBanner
          title="Starter Free Tier Active (5 Links · 6 Gallery Items · 1 Blog Post)"
          description="Upgrade to Biolio Bio Creator (₹299/mo) for more publishing capacity, or Bio Pro (₹699/mo) for unlimited galleries, publishing, and advanced analytics."
          requiredTier="Bio Creator or Pro"
        />
      )}

      {/* Atelier Two-Column Builder Layout: Left Main Surface (Menu + Editor) + Right Sticky Phone Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Builder Main Surface */}
        <div className="lg:col-span-8 rounded-[7px] border border-[#e5dbd0] bg-[#fffdf8] shadow-xs overflow-hidden">
          {/* Builder Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eee6dc] bg-[#fffdf8] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="rounded bg-[#e4f1eb] px-2 py-0.5 text-[9px] font-extrabold uppercase text-[#277a67]">
                ● Published
              </span>
              <a
                href={`/${handle}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-[#211b29] hover:text-[#f36b3f] inline-flex items-center gap-1"
              >
                biolio.site/{handle}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    `https://biolio.site/${handle}`
                  );
                  showToast(`Copied https://biolio.site/${handle}`);
                }}
                className="inline-flex items-center gap-1.5 rounded border border-[#ded4c9] bg-white px-2.5 py-1 text-[10px] font-bold text-[#211b29] cursor-pointer"
              >
                <Copy className="h-3 w-3" /> Copy link
              </button>
            </div>
          </div>

          {/* Builder Columns: 220px Section Menu + Editor Pane */}
          <div className="grid grid-cols-1 md:grid-cols-12 min-h-[580px]">
            {/* Left Section Menu */}
            <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-[#eee6dc] bg-[#f8f4ed] p-4 space-y-1">
              <div className="text-[9px] font-extrabold uppercase tracking-[1.4px] text-[#a197a2] px-2 py-1">
                PAGE CONTENTS
              </div>
              {[
                { id: "content", num: "01", label: "Profile & intro" },
                {
                  id: "links",
                  num: "02",
                  label: `Social & links (${links.length})`,
                },
                { id: "sections", num: "03", label: "Page sections" },
                {
                  id: "gallery",
                  num: "04",
                  label: `Gallery & portfolio (${galleryItems.length})`,
                },
                {
                  id: "collabs",
                  num: "05",
                  label: `Brand collaborations (${collaborations.length})`,
                },
                {
                  id: "blog",
                  num: "06",
                  label: `Blog & stories (${blogPosts.length})`,
                },
                {
                  id: "inquiries",
                  num: "07",
                  label: `Visitor inbox (${inquiries.length})`,
                },
                { id: "seo", num: "08", label: "SEO & sharing" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id as BuilderSection)}
                  className={`w-full flex items-center gap-2.5 rounded-[5px] px-2.5 py-2.5 text-left text-[11px] font-bold transition-colors cursor-pointer ${
                    activeTab === item.id
                      ? "bg-[#f7e6de] text-[#b64e31]"
                      : "text-[#685f6c] hover:bg-[#eee6dc]"
                  }`}
                >
                  <span className="h-5 w-5 rounded bg-white flex items-center justify-center text-[9px] font-extrabold text-[#211b29] shrink-0">
                    {item.num}
                  </span>
                  <span className="truncate">{item.label}</span>
                </button>
              ))}

              <div className="pt-3 mt-3 border-t border-[#e5dcd1] text-[9px] font-extrabold uppercase tracking-[1.4px] text-[#a197a2] px-2 py-1">
                DESIGN &amp; TEMPLATES
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("style")}
                className={`w-full flex items-center gap-2.5 rounded-[5px] px-2.5 py-2.5 text-left text-[11px] font-bold transition-colors cursor-pointer ${
                  activeTab === "style"
                    ? "bg-[#f7e6de] text-[#b64e31]"
                    : "text-[#685f6c] hover:bg-[#eee6dc]"
                }`}
              >
                <span className="h-5 w-5 rounded bg-white flex items-center justify-center text-[10px]">
                  ✧
                </span>
                <span>Templates &amp; theme (17)</span>
              </button>

              <div className="mt-4 rounded-[5px] border border-[#e2d8ef] bg-[#f2edf8] p-3 text-[10px] text-[#79659e] leading-relaxed">
                ✦ Your page is mobile-first. Preview how it looks on a phone as you edit.
              </div>
            </div>

            {/* Right Active Editor */}
            <div className="md:col-span-8 p-6 space-y-5">
              {activeTab === "content" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-base font-extrabold text-[#211b29]">
                        Make your first impression count.
                      </h3>
                      <p className="text-[11px] text-[#857a83]">
                        Introduce yourself in a way that feels like you.
                      </p>
                    </div>
                    <span className="rounded bg-[#fce8df] px-2 py-1 text-[9px] font-extrabold uppercase text-[#b74f2e]">
                      Profile
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#5e5661] mb-1">
                        Display name
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full rounded-[5px] border border-[#e4dbd1] bg-[#fffefa] px-3 py-2.5 text-xs text-[#211b29]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#5e5661] mb-1">
                        Public handle
                      </label>
                      <input
                        type="text"
                        value={`biolio.site/${handle}`}
                        disabled
                        className="w-full rounded-[5px] border border-[#e4dbd1] bg-[#f4efe7] px-3 py-2.5 text-xs font-mono text-[#7c727e]"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 rounded-xl border border-[#e5dcd1] bg-[#fbf8f2] p-4 sm:grid-cols-2">
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-xs font-extrabold text-[#211b29]">Profile photo</h4>
                        <p className="mt-1 text-[11px] leading-5 text-[#857a83]">A clear portrait helps visitors recognize your creator page.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f36b3f] text-lg font-extrabold text-white">
                          {avatarUrl ? <img src={avatarUrl} alt={`${displayName || "Creator"} profile`} className="h-full w-full object-cover" /> : (displayName.trim()[0] || "B").toUpperCase()}
                        </div>
                        <CloudinaryUpload
                          purpose="avatar"
                          resourceType="image"
                          bioProfileId={bioProfileId || undefined}
                          onUploaded={(asset) => {
                            setAvatarMediaId(asset.id);
                            setAvatarUrl(asset.secure_url);
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-xs font-extrabold text-[#211b29]">Cover image</h4>
                        <p className="mt-1 text-[11px] leading-5 text-[#857a83]">Shown as the visual introduction on your public creator website.</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex h-20 items-center justify-center overflow-hidden rounded-lg border border-[#e5dcd1] bg-white text-xs font-semibold text-[#857a83]">
                          {coverUrl ? <img src={coverUrl} alt={`${displayName || "Creator"} website cover`} className="h-full w-full object-cover" /> : "Your cover image preview"}
                        </div>
                        <CloudinaryUpload
                          purpose="cover"
                          resourceType="image"
                          bioProfileId={bioProfileId || undefined}
                          onUploaded={(asset) => {
                            setCoverMediaId(asset.id);
                            setCoverUrl(asset.secure_url);
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#5e5661] mb-1">
                        Headline / Tagline
                      </label>
                      <input
                        type="text"
                        value={tagline}
                        onChange={(e) => setTagline(e.target.value)}
                        placeholder="Photographer · Creator · Story collector"
                        className="w-full rounded-[5px] border border-[#e4dbd1] bg-[#fffefa] px-3 py-2.5 text-xs text-[#211b29]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#5e5661] mb-1">
                        Creator category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full rounded-[5px] border border-[#e4dbd1] bg-[#fffefa] px-3 py-2.5 text-xs text-[#211b29]"
                      >
                        <option>Photography &amp; Travel</option>
                        <option>Beauty &amp; Lifestyle</option>
                        <option>Design &amp; Architecture</option>
                        <option>Tech &amp; SaaS Founder</option>
                        <option>Education &amp; Coaching</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#5e5661] mb-1">
                      Short introduction ({shortBio.length}/160)
                    </label>
                    <textarea
                      rows={3}
                      maxLength={160}
                      value={shortBio}
                      onChange={(e) => setShortBio(e.target.value)}
                      className="w-full rounded-[5px] border border-[#e4dbd1] bg-[#fffefa] px-3 py-2.5 text-xs text-[#211b29]"
                    />
                  </div>

                  <div className="pt-2 border-t border-[#eee6dc]">
                    <div className="text-xs font-extrabold text-[#211b29] mb-2">
                      Audience stats &amp; location
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-[#7c727e] mb-1">
                          Instagram followers
                        </label>
                        <input
                          type="text"
                          value={igFollowers}
                          onChange={(e) => setIgFollowers(e.target.value)}
                          className="w-full rounded-[5px] border border-[#e4dbd1] bg-[#fffefa] px-3 py-2 text-xs text-[#211b29]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#7c727e] mb-1">
                          YouTube subscribers
                        </label>
                        <input
                          type="text"
                          value={ytSubscribers}
                          onChange={(e) => setYtSubscribers(e.target.value)}
                          className="w-full rounded-[5px] border border-[#e4dbd1] bg-[#fffefa] px-3 py-2 text-xs text-[#211b29]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#7c727e] mb-1">
                          Location
                        </label>
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="w-full rounded-[5px] border border-[#e4dbd1] bg-[#fffefa] px-3 py-2 text-xs text-[#211b29]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "links" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-base font-extrabold text-[#211b29]">
                        Bring your favourite places together.
                      </h3>
                      <p className="text-[11px] text-[#857a83]">
                        Using {links.length} of{" "}
                        {entitlements?.bioMaxLinks === null
                          ? "Unlimited"
                          : entitlements?.bioMaxLinks ?? 5}{" "}
                        links.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setLinks([
                          ...links,
                          {
                            title: "New featured link",
                            url: "https://biolio.site",
                            icon: "✦",
                            is_visible: true,
                          },
                        ])
                      }
                      className="inline-flex items-center gap-1 rounded-[5px] bg-[#ee7048] px-3 py-2 text-xs font-extrabold text-white cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add link
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {links.length === 0 ? (
                      <div className="rounded-[7px] border border-dashed border-[#e5dcd1] bg-[#faf8f5] p-8 text-center space-y-2">
                        <p className="text-xs font-bold text-[#211b29]">No links configured yet</p>
                        <p className="text-[11px] text-[#7c727e]">Click &quot;Add link&quot; above to connect your YouTube, portfolio, shop, or social channels.</p>
                      </div>
                    ) : (
                      links.map((link, idx) => (
                        <div
                          key={idx}
                          className="rounded-[7px] border border-[#e5dcd1] bg-white p-3 space-y-2"
                        >
                        <div className="flex items-center gap-2">
                          <span className="text-[#b7aeb8] font-bold">⠿</span>
                          <input
                            type="text"
                            value={link.icon}
                            onChange={(e) => {
                              const next = [...links];
                              next[idx].icon = e.target.value;
                              setLinks(next);
                            }}
                            className="w-10 rounded border border-[#e5dcd1] px-2 py-1.5 text-center text-xs"
                          />
                          <input
                            type="text"
                            value={link.title}
                            onChange={(e) => {
                              const next = [...links];
                              next[idx].title = e.target.value;
                              setLinks(next);
                            }}
                            placeholder="Link title"
                            className="flex-1 rounded border border-[#e5dcd1] px-3 py-1.5 text-xs font-bold text-[#211b29]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...links];
                              next[idx].is_visible = !next[idx].is_visible;
                              setLinks(next);
                            }}
                            className={`rounded px-2 py-1 text-[10px] font-bold cursor-pointer ${
                              link.is_visible
                                ? "bg-[#e4f1eb] text-[#277a67]"
                                : "bg-[#eee6dc] text-[#7c727e]"
                            }`}
                          >
                            {link.is_visible ? "Visible" : "Hidden"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setLinks(links.filter((_, i) => i !== idx))
                            }
                            className="p-1.5 text-[#a62639] hover:bg-[#fde8eb] rounded cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) => {
                            const next = [...links];
                            next[idx].url = e.target.value;
                            setLinks(next);
                          }}
                          placeholder="https://..."
                          className="w-full rounded border border-[#e5dcd1] bg-[#fbf8f2] px-3 py-1.5 text-xs text-[#7c727e]"
                        />
                      </div>
                    )))}
                  </div>
                </div>
              )}

              {activeTab === "sections" && (
                <div className="space-y-3">
                  <h3 className="font-display text-base font-extrabold text-[#211b29]">
                    Build a page that tells your story.
                  </h3>
                  <p className="text-[11px] text-[#857a83]">
                    Choose what visitors can see, then arrange the sections in your preferred order.
                  </p>
                  {sectionOrder.map((key, index) => {
                    const section = PAGE_SECTIONS.find((item) => item.key === key);
                    if (!section) return null;
                    const isVisible = Boolean(sectionsVisibility[key]);
                    return (
                      <div key={key} className="flex items-center justify-between gap-3 rounded-[7px] border border-[#e5dcd1] bg-white p-3.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#f0eafa] text-xs font-bold text-[#7863a7]">
                            {section.icon}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#211b29]">{section.title}</div>
                            <div className="text-[10px] text-[#7c727e]">{section.desc}</div>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <div className="flex flex-col">
                            <button type="button" disabled={index === 0} onClick={() => movePageSection(key, -1)} aria-label={`Move ${section.title} up`} className="rounded p-1 text-[#695f6c] hover:bg-[#f4efe7] disabled:opacity-30">
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" disabled={index === sectionOrder.length - 1} onClick={() => movePageSection(key, 1)} aria-label={`Move ${section.title} down`} className="rounded p-1 text-[#695f6c] hover:bg-[#f4efe7] disabled:opacity-30">
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <button
                            type="button"
                            aria-pressed={isVisible}
                            onClick={() => setSectionsVisibility({ ...sectionsVisibility, [key]: !isVisible })}
                            className={`rounded-full px-3 py-1 text-[10px] font-extrabold ${isVisible ? "bg-[#277a67] text-white" : "bg-[#eee6dc] text-[#7c727e]"}`}
                          >
                            {isVisible ? "Visible" : "Hidden"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === "gallery" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display text-base font-extrabold text-[#211b29]">
                        Your work deserves a window.
                      </h3>
                      <p className="text-[11px] text-[#857a83]">
                        Upload images and connect videos from YouTube, Vimeo, Google Drive, X or another video site.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setGalleryItems([...galleryItems, { title: "", caption: "", external_url: "", category: "General", media_type: "image", is_featured: false }])}
                        className="inline-flex items-center gap-1 rounded-[5px] bg-[#ee7048] px-3 py-2 text-xs font-extrabold text-white"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add image
                      </button>
                      <button
                        type="button"
                        onClick={() => setGalleryItems([...galleryItems, { title: "", caption: "", external_url: "", category: "Video", media_type: "video_embed", is_featured: false }])}
                        className="inline-flex items-center gap-1 rounded-[5px] border border-[#e5dcd1] bg-white px-3 py-2 text-xs font-extrabold text-[#211b29]"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add video link
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {galleryItems.length === 0 ? (
                      <div className="rounded-[7px] border border-dashed border-[#e5dcd1] bg-[#faf8f5] p-8 text-center space-y-2">
                        <p className="text-xs font-bold text-[#211b29]">Your portfolio is waiting for its first piece.</p>
                        <p className="text-[11px] text-[#7c727e]">Upload a still image or link a video hosted on another platform.</p>
                      </div>
                    ) : (
                      galleryItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-[7px] border border-[#e5dcd1] bg-white p-3 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => {
                              const next = [...galleryItems];
                              next[idx].title = e.target.value;
                              setGalleryItems(next);
                            }}
                            aria-label="Portfolio title"
                            placeholder={item.media_type === "video_embed" ? "Video title" : "Image or project title"}
                            className="flex-1 rounded border border-[#e5dcd1] px-3 py-1.5 text-xs font-bold"
                          />
                          <input
                            type="text"
                            value={item.category}
                            onChange={(e) => {
                              const next = [...galleryItems];
                              next[idx].category = e.target.value;
                              setGalleryItems(next);
                            }}
                            aria-label="Portfolio category"
                            placeholder="Category"
                            className="w-28 rounded border border-[#e5dcd1] px-2.5 py-1.5 text-xs"
                          />
                          <button
                            type="button"
                            aria-label={item.is_featured ? "Remove featured work" : "Feature this work"}
                            aria-pressed={item.is_featured}
                            onClick={() => {
                              const next = galleryItems.map((entry, entryIndex) => ({
                                ...entry,
                                is_featured: entryIndex === idx ? !entry.is_featured : false,
                              }));
                              setGalleryItems(next);
                            }}
                            className={`rounded px-2 py-1.5 text-[11px] font-bold ${item.is_featured ? "bg-[#fce8df] text-[#a5482c]" : "border border-[#e5dcd1] text-[#695f6c]"}`}
                          >
                            {item.is_featured ? "Featured" : "Feature"}
                          </button>
                          <button
                            type="button"
                            aria-label={`Remove ${item.title || "portfolio item"}`}
                            onClick={() =>
                              setGalleryItems(
                                galleryItems.filter((_, i) => i !== idx)
                              )
                            }
                            className="p-1.5 text-[#a62639] hover:bg-[#fde8eb] rounded cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <input
                          type="url"
                          value={item.external_url}
                          onChange={(e) => {
                            const next = [...galleryItems];
                            next[idx].external_url = e.target.value;
                            next[idx].media_asset_id = null;
                            setGalleryItems(next);
                          }}
                          aria-label={item.media_type === "video_embed" ? "Video link" : "Image URL"}
                          placeholder={item.media_type === "video_embed" ? "https://youtu.be/... or a public video link" : "Optional image URL, or upload an image below"}
                          className="w-full rounded border border-[#e5dcd1] bg-[#fbf8f2] px-3 py-1.5 text-xs text-[#7c727e]"
                        />
                        <textarea
                          value={item.caption}
                          onChange={(e) => {
                            const next = [...galleryItems];
                            next[idx].caption = e.target.value;
                            setGalleryItems(next);
                          }}
                          aria-label="Portfolio description"
                          placeholder="A short description of this work (optional)"
                          rows={2}
                          maxLength={500}
                          className="w-full resize-y rounded border border-[#e5dcd1] px-3 py-2 text-xs"
                        />
                        {item.media_type === "image" ? (
                          <CloudinaryUpload
                            purpose="gallery"
                            resourceType="image"
                            compact
                            onUploaded={(asset) => {
                              const next = [...galleryItems];
                              next[idx] = { ...next[idx], external_url: asset.secure_url, media_asset_id: asset.id, media_type: "image" };
                              setGalleryItems(next);
                            }}
                          />
                        ) : (
                          <p className="text-[11px] leading-5 text-[#7c727e]">Video files stay on their original platform. For Google Drive, set sharing to “Anyone with the link” so visitors can watch.</p>
                        )}
                      </div>
                    )))}
                  </div>
                </div>
              )}

              {activeTab === "collabs" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-base font-extrabold text-[#211b29]">
                        Good work. Good people.
                      </h3>
                      <p className="text-[11px] text-[#857a83]">
                        Make your partnerships and client work part of your story.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setCollaborations([
                          ...collaborations,
                          {
                            brand_name: "",
                            campaign_title: "",
                            campaign_summary: "",
                            collab_year: new Date().getFullYear().toString(),
                            case_study_url: "",
                          },
                        ])
                      }
                      className="inline-flex items-center gap-1 rounded-[5px] bg-[#ee7048] px-3 py-2 text-xs font-extrabold text-white cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add collaboration
                    </button>
                  </div>

                  <div className="space-y-3">
                    {collaborations.length === 0 ? (
                      <div className="rounded-[7px] border border-dashed border-[#e5dcd1] bg-[#faf8f5] p-8 text-center space-y-2">
                        <p className="text-xs font-bold text-[#211b29]">No brand collaborations added yet</p>
                        <p className="text-[11px] text-[#7c727e]">Click &quot;Add collaboration&quot; above to highlight client campaigns and partnerships.</p>
                      </div>
                    ) : (
                      collaborations.map((c, idx) => (
                      <div
                        key={idx}
                        className="rounded-[7px] border border-[#e5dcd1] bg-white p-3.5 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={c.brand_name}
                            onChange={(e) => {
                              const next = [...collaborations];
                              next[idx].brand_name = e.target.value;
                              setCollaborations(next);
                            }}
                            placeholder="Brand Name (e.g. NORTH)"
                            className="flex-1 rounded border border-[#e5dcd1] px-3 py-1.5 text-xs font-bold"
                          />
                          <input
                            type="text"
                            value={c.campaign_title}
                            onChange={(e) => {
                              const next = [...collaborations];
                              next[idx].campaign_title = e.target.value;
                              setCollaborations(next);
                            }}
                            placeholder="Role / Campaign"
                            className="w-40 rounded border border-[#e5dcd1] px-3 py-1.5 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setCollaborations(
                                collaborations.filter((_, i) => i !== idx)
                              )
                            }
                            className="p-1.5 text-[#a62639] hover:bg-[#fde8eb] rounded cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={c.campaign_summary}
                          onChange={(e) => {
                            const next = [...collaborations];
                            next[idx].campaign_summary = e.target.value;
                            setCollaborations(next);
                          }}
                          placeholder="Short campaign summary..."
                          className="w-full rounded border border-[#e5dcd1] bg-[#fbf8f2] px-3 py-1.5 text-xs text-[#5d5360]"
                        />
                      </div>
                    )))}
                  </div>
                </div>
              )}

              {activeTab === "blog" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-base font-extrabold text-[#211b29]">
                        Your ideas have a home.
                      </h3>
                      <p className="text-[11px] text-[#857a83]">
                        Write stories and let your website grow beyond social feeds.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setBlogPosts([
                          ...blogPosts,
                          {
                            title: "",
                            slug: `story-${blogPosts.length + 1}`,
                            category: "EDITORIAL",
                            excerpt: "",
                            content_markdown: "",
                            status: "draft",
                          },
                        ])
                      }
                      className="inline-flex items-center gap-1 rounded-[5px] bg-[#ee7048] px-3 py-2 text-xs font-extrabold text-white cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Write a story
                    </button>
                  </div>

                  {blogPosts.length === 0 ? (
                    <p className="text-xs text-[#7c727e] py-6 text-center">
                      No journal stories yet. Click &ldquo;Write a story&rdquo; to publish your first post.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {blogPosts.map((post, idx) => (
                        <div
                          key={idx}
                          className="rounded-[7px] border border-[#e5dcd1] bg-white p-3.5 space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={post.title}
                              onChange={(e) => {
                                const next = [...blogPosts];
                                next[idx].title = e.target.value;
                                setBlogPosts(next);
                              }}
                              placeholder="Story title"
                              className="flex-1 rounded border border-[#e5dcd1] px-3 py-1.5 text-xs font-bold"
                            />
                            <input
                              type="text"
                              value={post.slug}
                              onChange={(e) => {
                                const next = [...blogPosts];
                                next[idx].slug = e.target.value
                                    .toLowerCase()
                                    .replace(/[^a-z0-9-]/g, "-");
                                setBlogPosts(next);
                              }}
                              placeholder="url-slug"
                              className="w-32 rounded border border-[#e5dcd1] px-2.5 py-1.5 text-xs font-mono"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setBlogPosts(
                                  blogPosts.filter((_, i) => i !== idx)
                                )
                              }
                              className="p-1.5 text-[#a62639] hover:bg-[#fde8eb] rounded cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <textarea
                            rows={3}
                            value={post.content_markdown}
                            onChange={(e) => {
                              const next = [...blogPosts];
                              next[idx].content_markdown = e.target.value;
                              next[idx].excerpt = e.target.value.slice(0, 140);
                              setBlogPosts(next);
                            }}
                            placeholder="Write your story..."
                            className="w-full rounded border border-[#e5dcd1] bg-[#fbf8f2] px-3 py-2 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "inquiries" && (
                <div className="space-y-3">
                  <h3 className="font-display text-base font-extrabold text-[#211b29]">
                    Visitor Contact &amp; Booking Inquiries ({inquiries.length})
                  </h3>
                  {inquiries.length === 0 ? (
                    <p className="text-xs text-[#7c727e]">
                      No inquiries received yet. Visitors on{" "}
                      <code className="font-mono">biolio.site/{handle}</code> can send you direct collaboration requests.
                    </p>
                  ) : (
                    inquiries.map((inq: InquiryItem) => (
                      <div
                        key={inq.id}
                        className="rounded-[7px] border border-[#e5dcd1] bg-white p-3.5 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>
                            {inq.sender_name} ({inq.sender_email})
                          </span>
                          {inq.budget_range && (
                            <span className="rounded bg-[#e4f1eb] px-2 py-0.5 text-[10px] text-[#277a67]">
                              {inq.budget_range}
                            </span>
                          )}
                        </div>
                        <p className="text-[#5d5360]">{inq.message}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "seo" && (
                <div className="space-y-4">
                  <h3 className="font-display text-base font-extrabold text-[#211b29]">
                    Help people find you.
                  </h3>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#5e5661] mb-1">
                      Page SEO Title
                    </label>
                    <input
                      type="text"
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      className="w-full rounded-[5px] border border-[#e4dbd1] bg-[#fffefa] px-3 py-2.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#5e5661] mb-1">
                      Search Description
                    </label>
                    <textarea
                      rows={3}
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value)}
                      className="w-full rounded-[5px] border border-[#e4dbd1] bg-[#fffefa] px-3 py-2.5 text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-[7px] border border-[#e5dcd1] bg-white p-3.5">
                    <div>
                      <div className="text-xs font-bold text-[#211b29]">
                        Allow search engines to index my page
                      </div>
                      <div className="text-[10px] text-[#7c727e]">
                        Help new people discover your work on Google.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowIndexing}
                      onChange={(e) => setAllowIndexing(e.target.checked)}
                      className="h-4 w-4 accent-[#f36b3f]"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-[7px] border border-[#e5dcd1] bg-white p-3.5">
                    <div>
                      <div className="text-xs font-bold text-[#211b29]">
                        Display &ldquo;Made with Biolio&rdquo; branding badge
                      </div>
                      <div className="text-[10px] text-[#7c727e]">
                        {entitlements?.canRemoveBranding
                          ? "Creator & Pro plans can hide the platform badge."
                          : "Upgrade to Creator or Pro to remove the Biolio badge."}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={showBiolioBranding}
                      disabled={!entitlements?.canRemoveBranding}
                      onChange={(e) => setShowBiolioBranding(e.target.checked)}
                      className="h-4 w-4 accent-[#f36b3f]"
                    />
                  </div>
                </div>
              )}

              {activeTab === "style" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-display text-base font-extrabold text-[#211b29]">
                      Find your visual language (All 17 Seeded Templates).
                    </h3>
                    <p className="text-[11px] text-[#857a83]">
                      Select any template below to update your live phone preview immediately.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[430px] overflow-y-auto pr-1">
                    {BIO_TEMPLATES.map((tpl) => {
                      const locked =
                        tpl.minTier !== "free" &&
                        !entitlements?.canUseCustomThemes;
                      const selected = templateId === tpl.id;
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          disabled={locked}
                          onClick={() => setTemplateId(tpl.id)}
                          className={`rounded-[7px] border-2 p-3 text-left transition-all cursor-pointer ${
                            selected
                              ? "border-[#f36b3f] bg-[#fff5f0]"
                              : "border-[#e5dcd1] bg-white hover:border-[#cbb9a9]"
                          } ${locked ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          <div className="flex gap-1.5 mb-2">
                            {[
                              tpl.theme.bg,
                              tpl.theme.cardBg,
                              tpl.theme.accent,
                              tpl.theme.text,
                            ].map((hex, i) => (
                              <span
                                key={i}
                                className="h-5 flex-1 rounded border border-black/10"
                                style={{ backgroundColor: hex }}
                              />
                            ))}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-editorial font-bold text-sm text-[#211b29]">
                              {tpl.name}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded bg-[#eee6dc] px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-[#211b29]">
                              {locked && <Lock className="h-2.5 w-2.5" />}
                              {tpl.minTier}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#7c727e] mt-1 line-clamp-1">
                            {tpl.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Sticky Atelier Phone Preview */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <div className="text-xs font-extrabold text-[#211b29]">
                Live preview
              </div>
              <div className="text-[10px] text-[#857a83]">
                {activeTemplate.name} &bull; Mobile view
              </div>
            </div>
            <span className="rounded bg-[#e4f1eb] px-2 py-0.5 text-[9px] font-extrabold uppercase text-[#277a67]">
              Live
            </span>
          </div>

          <div className="rounded-[7px] bg-gradient-to-br from-[#ded3c7] to-[#f4e9de] p-5 flex justify-center">
            <div
              className="w-[248px] rounded-[22px] border-[5px] border-[#211b29] p-3.5 shadow-2xl min-h-[490px] flex flex-col justify-between transition-colors"
              style={{
                backgroundColor: activeTemplate.theme.bg,
                color: activeTemplate.theme.text,
              }}
            >
              <div>
                <div className="mx-auto h-3 w-20 rounded-b-lg bg-[#211b29] -mt-3.5 mb-3" />
                <div className="text-center space-y-1.5">
                  <img
                    src={activeTemplate.previewImage}
                    alt={displayName}
                    className="h-16 w-16 mx-auto object-cover border-2 border-white shadow"
                    style={{
                      borderRadius: activeTemplate.theme.avatarRadius,
                    }}
                  />
                  <h3 className="font-editorial text-base font-bold">
                    {displayName}
                  </h3>
                  <p
                    className="text-[9px] leading-relaxed px-2"
                    style={{ color: activeTemplate.theme.mutedText }}
                  >
                    {shortBio}
                  </p>
                  <div className="flex justify-center gap-1.5 pt-1">
                    {["◎", "▶", "in", "✉"].map((s, i) => (
                      <span
                        key={i}
                        className="h-5 w-5 rounded-full bg-black/5 flex items-center justify-center text-[9px]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {links
                    .filter((l) => l.is_visible)
                    .map((l, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-2 text-[9px] font-extrabold border shadow-2xs"
                        style={{
                          backgroundColor: activeTemplate.theme.cardBg,
                          color: activeTemplate.theme.text,
                          borderColor: activeTemplate.theme.border,
                          borderRadius: activeTemplate.theme.cardRadius,
                        }}
                      >
                        <span
                          className="h-5 w-5 rounded flex items-center justify-center text-white shrink-0"
                          style={{
                            backgroundColor: activeTemplate.theme.accent,
                          }}
                        >
                          {l.icon || "✦"}
                        </span>
                        <span className="truncate">{l.title}</span>
                      </div>
                    ))}
                </div>

                {galleryItems.length > 0 && (
                  <div className="grid grid-cols-2 gap-1.5 mt-3">
                    {galleryItems.slice(0, 2).map((g, i) => g.media_type === "video_embed" ? (
                      <div key={i} className="flex h-14 items-center justify-center rounded bg-[#211b29] px-2 text-center text-[8px] font-bold text-white">Video link · {parsePublicVideoLink(g.external_url)?.hostLabel || "External platform"}</div>
                    ) : (
                      <img key={i} src={g.external_url} alt={g.title} className="h-14 w-full object-cover rounded" />
                    ))}
                  </div>
                )}
              </div>

              {showBiolioBranding && (
                <div className="pt-4 text-center text-[8px] font-bold uppercase tracking-widest opacity-55">
                  © 2026 {displayName} · BIOLIO
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
