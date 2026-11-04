"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BIO_TEMPLATES } from "@/lib/design-tokens";
import {
  evaluateWorkspaceEntitlements,
  type EvaluatedWorkspaceEntitlements,
} from "@/lib/entitlements";
import {
  ProductLockPaywall,
  FeatureTierBanner,
} from "@/components/dashboard/feature-lock";
import {
  Globe,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Loader2,
  Sparkles,
  Image as ImageIcon,
  Briefcase,
  BookOpen,
  Mail,
  Palette,
  Lock,
} from "lucide-react";

type StudioTab =
  | "identity"
  | "links"
  | "gallery"
  | "collaborations"
  | "blog"
  | "inquiries"
  | "templates";

export default function BioStudioPage() {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<StudioTab>("identity");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishedBanner, setPublishedBanner] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [entitlements, setEntitlements] =
    useState<EvaluatedWorkspaceEntitlements | null>(null);
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [tagline, setTagline] = useState("");
  const [bioText, setBioText] = useState("");
  const [location, setLocation] = useState("");
  const [templateId, setTemplateId] = useState("atelier-editorial");
  const [showBiolioBranding, setShowBiolioBranding] = useState(true);
  const [draftVersion, setDraftVersion] = useState(1);
  const [publishedVersion, setPublishedVersion] = useState(0);
  const [bioProfileId, setBioProfileId] = useState<string | null>(null);

  const [links, setLinks] = useState<
    Array<{ id?: string; title: string; url: string; badge_text: string }>
  >([]);
  const [galleryItems, setGalleryItems] = useState<
    Array<{ id?: string; title: string; media_url: string; category: string }>
  >([]);
  const [collaborations, setCollaborations] = useState<
    Array<{
      id?: string;
      brand_name: string;
      role_title: string;
      summary: string;
      case_study_url: string;
    }>
  >([]);
  const [blogPosts, setBlogPosts] = useState<
    Array<{
      id?: string;
      title: string;
      slug: string;
      excerpt: string;
      body_markdown: string;
      status: string;
    }>
  >([]);
  interface BioInquiry {
    id: string;
    sender_name: string;
    sender_email: string;
    budget_range?: string | null;
    message?: string | null;
    created_at?: string;
  }
  const [inquiries, setInquiries] = useState<BioInquiry[]>([]);

  useEffect(() => {
    async function loadBioData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: wsList } = await supabase
        .from("workspaces")
        .select("id, slug, name, intended_modules, workspace_entitlements(*)")
        .eq("owner_id", user.id)
        .limit(1);

      interface WorkspaceDataRow {
        id: string;
        slug: string;
        name: string;
        intended_modules?: string[] | null;
        workspace_entitlements?: Record<string, unknown> | Array<Record<string, unknown>> | null;
      }
      const ws = (wsList?.[0] as unknown) as WorkspaceDataRow | undefined;
      if (!ws) {
        setLoading(false);
        return;
      }

      setWorkspaceId(ws.id);
      const rawEnt = Array.isArray(ws.workspace_entitlements)
        ? ws.workspace_entitlements[0]
        : ws.workspace_entitlements;
      const evaluated = evaluateWorkspaceEntitlements(
        rawEnt,
        ws.intended_modules
      );
      setEntitlements(evaluated);

      const [
        { data: profile },
        { data: existingLinks },
        { data: existingGallery },
        { data: existingCollabs },
        { data: existingPosts },
        { data: existingInquiries },
      ] = await Promise.all([
        supabase
          .from("bio_profiles")
          .select("*")
          .eq("workspace_id", ws.id)
          .maybeSingle(),
        supabase
          .from("bio_links")
          .select("id, title, url, position, is_visible")
          .eq("workspace_id", ws.id)
          .order("position", { ascending: true }),
        supabase
          .from("bio_gallery_items")
          .select("id, title, external_url, category, position")
          .eq("workspace_id", ws.id)
          .order("position", { ascending: true }),
        supabase
          .from("bio_collaborations")
          .select("id, brand_name, campaign_title, campaign_summary, case_study_url, position")
          .eq("workspace_id", ws.id)
          .order("position", { ascending: true }),
        supabase
          .from("bio_blog_posts")
          .select("id, title, slug, excerpt, content_markdown, status, reading_time_minutes")
          .eq("workspace_id", ws.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("bio_contact_submissions")
          .select("*")
          .eq("workspace_id", ws.id)
          .order("created_at", { ascending: false })
          .limit(25),
      ]);

      if (profile) {
        setBioProfileId(profile.id);
        setHandle(profile.handle || ws.slug);
        setDisplayName(profile.display_name || ws.name);
        setTagline(profile.tagline || "");
        setBioText(profile.short_bio || profile.about_story || "");
        setLocation(profile.location || "");
        setTemplateId(profile.template_id || "atelier-editorial");
        const themeConfig = (profile.theme_config as Record<string, unknown>) || {};
        setShowBiolioBranding(Boolean(themeConfig.show_biolio_branding ?? true));
        setDraftVersion(profile.draft_version || 1);
        setPublishedVersion(profile.current_published_version_id ? 1 : 0);
      }

      if (existingLinks && existingLinks.length > 0) {
        setLinks(
          existingLinks.map((l: { id: string; title: string; url: string }) => ({
            id: l.id,
            title: l.title,
            url: l.url,
            badge_text: "",
          }))
        );
      } else {
        setLinks([
          {
            title: "Download 2026 Creator Kit",
            url: "https://biolio.site",
            badge_text: "NEW",
          },
          {
            title: "Book a 1:1 Brand Consultation",
            url: "https://biolio.site/pricing",
            badge_text: "POPULAR",
          },
        ]);
      }

      if (existingGallery) {
        setGalleryItems(
          existingGallery.map(
            (g: {
              id: string;
              title?: string | null;
              external_url?: string | null;
              media_url?: string | null;
              category?: string | null;
            }) => ({
              id: g.id,
              title: g.title || "",
              media_url: g.external_url || g.media_url || "",
              category: g.category || "Portfolio",
            })
          )
        );
      }

      if (existingCollabs) {
        setCollaborations(
          existingCollabs.map(
            (c: {
              id: string;
              brand_name: string;
              role_title?: string | null;
              campaign_title?: string | null;
              campaign_summary?: string | null;
              summary?: string | null;
              case_study_url?: string | null;
            }) => ({
              id: c.id,
              brand_name: c.brand_name,
              role_title: c.campaign_title || c.role_title || "",
              summary: c.campaign_summary || c.summary || "",
              case_study_url: c.case_study_url || "",
            })
          )
        );
      }

      if (existingPosts) {
        setBlogPosts(
          existingPosts.map(
            (b: {
              id: string;
              title: string;
              slug: string;
              excerpt?: string | null;
              content_markdown?: string | null;
              body_markdown?: string | null;
              status?: string | null;
            }) => ({
              id: b.id,
              title: b.title,
              slug: b.slug,
              excerpt: b.excerpt || "",
              body_markdown: b.content_markdown || b.body_markdown || "",
              status: b.status || "published",
            })
          )
        );
      }

      if (existingInquiries) {
        setInquiries(existingInquiries);
      }

      setLoading(false);
    }

    loadBioData();
  }, [supabase]);

  function handleAddLink() {
    if (
      entitlements?.bioMaxLinks !== null &&
      entitlements?.bioMaxLinks !== undefined &&
      links.length >= entitlements.bioMaxLinks
    ) {
      setErrorMsg(
        `Link cap reached (${entitlements.bioMaxLinks} links on your ${entitlements.bioTier.toUpperCase()} tier). Upgrade on Billing & Coupons to add more links.`
      );
      return;
    }
    setErrorMsg(null);
    setLinks([
      ...links,
      { title: "New Featured Link", url: "https://", badge_text: "" },
    ]);
  }

  function handleAddGalleryItem() {
    if (
      entitlements?.bioMaxGalleryItems !== null &&
      entitlements?.bioMaxGalleryItems !== undefined &&
      galleryItems.length >= entitlements.bioMaxGalleryItems
    ) {
      setErrorMsg(
        `Gallery limit reached (${entitlements.bioMaxGalleryItems} items on your ${entitlements.bioTier.toUpperCase()} tier). Upgrade on Billing & Coupons to add up to 100 portfolio items.`
      );
      return;
    }
    setErrorMsg(null);
    setGalleryItems([
      ...galleryItems,
      {
        title: "Editorial Campaign Shot",
        media_url:
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80",
        category: "Photography",
      },
    ]);
  }

  function handleAddCollaboration() {
    setCollaborations([
      ...collaborations,
      {
        brand_name: "Atelier Studios",
        role_title: "Creative Director",
        summary: "Directed global launch campaign with 3.4M organic impressions.",
        case_study_url: "https://biolio.site",
      },
    ]);
  }

  function handleAddBlogPost() {
    if (!entitlements?.canUseBlogPublishing) {
      setErrorMsg(
        "Micro-Blog publishing is locked on the Free tier. Upgrade to Bio Creator ($9/mo) or All-in-One Bundle ($19/mo) to publish long-form essays."
      );
      return;
    }
    const slug = `essay-${blogPosts.length + 1}-${Date.now().toString().slice(-4)}`;
    setBlogPosts([
      ...blogPosts,
      {
        title: "How I Built My Automated Creator Funnel",
        slug,
        excerpt:
          "Behind the scenes of combining a unified Bio site with deterministic Instagram Comment-to-DM workflows.",
        body_markdown:
          "Every creator needs a direct destination they own and control...",
        status: "published",
      },
    ]);
  }

  async function handleSaveAndPublish() {
    if (!workspaceId) return;
    setSaving(true);
    setPublishedBanner(false);
    setErrorMsg(null);

    try {
      let targetProfileId = bioProfileId;
      if (!targetProfileId) {
        const { data: pRec } = await supabase
          .from("bio_profiles")
          .select("id")
          .eq("workspace_id", workspaceId)
          .maybeSingle();
        if (pRec?.id) {
          targetProfileId = pRec.id;
          setBioProfileId(targetProfileId);
        }
      }

      if (!targetProfileId) {
        throw new Error("Bio profile not found for this workspace. Please refresh and try again.");
      }

      // 1. Update bio_profiles draft with exact schema columns
      const { error: updateErr } = await supabase
        .from("bio_profiles")
        .update({
          display_name: displayName,
          tagline: tagline || null,
          short_bio: bioText ? bioText.slice(0, 160) : null,
          about_story: bioText || null,
          location: location || null,
          template_id: templateId,
          theme_config: {
            show_biolio_branding: entitlements?.canRemoveBiolioBranding
              ? showBiolioBranding
              : true,
          },
        })
        .eq("id", targetProfileId);

      if (updateErr) throw new Error(updateErr.message);

      // 2. Sync bio_links to Supabase (exact schema: bio_profile_id, workspace_id, title, url, position, is_visible)
      await supabase.from("bio_links").delete().eq("bio_profile_id", targetProfileId);
      if (links.length > 0) {
        const { error: linksErr } = await supabase.from("bio_links").insert(
          links.map((l, idx) => ({
            bio_profile_id: targetProfileId,
            workspace_id: workspaceId,
            title: l.title || "Link",
            url: l.url || "https://biolio.site",
            position: idx,
            is_visible: true,
          }))
        );
        if (linksErr) throw new Error(`Failed to save links: ${linksErr.message}`);
      }

      // 3. Sync bio_gallery_items to Supabase (exact schema: bio_profile_id, workspace_id, title, category, position, external_url, status)
      await supabase
        .from("bio_gallery_items")
        .delete()
        .eq("bio_profile_id", targetProfileId);
      if (galleryItems.length > 0) {
        const { error: galleryErr } = await supabase.from("bio_gallery_items").insert(
          galleryItems.map((g, idx) => ({
            bio_profile_id: targetProfileId,
            workspace_id: workspaceId,
            title: g.title || "Portfolio Item",
            category: g.category || "All work",
            position: idx,
            external_url: g.media_url || null,
            status: "published" as const,
          }))
        );
        if (galleryErr) throw new Error(`Failed to save gallery: ${galleryErr.message}`);
      }

      // 4. Sync bio_collaborations to Supabase (exact schema: bio_profile_id, workspace_id, brand_name, campaign_title, campaign_summary, position, case_study_url, status)
      await supabase
        .from("bio_collaborations")
        .delete()
        .eq("bio_profile_id", targetProfileId);
      if (collaborations.length > 0) {
        const { error: collabsErr } = await supabase.from("bio_collaborations").insert(
          collaborations.map((c, idx) => ({
            bio_profile_id: targetProfileId,
            workspace_id: workspaceId,
            brand_name: c.brand_name || "Brand Partner",
            campaign_title: c.role_title || "Partner",
            campaign_summary: c.summary || null,
            case_study_url: c.case_study_url || null,
            position: idx,
            status: "published" as const,
          }))
        );
        if (collabsErr) throw new Error(`Failed to save collaborations: ${collabsErr.message}`);
      }

      // 5. Sync bio_blog_posts if unlocked (exact schema: bio_profile_id, workspace_id, title, slug, excerpt, content_markdown, reading_time_minutes, status, published_at)
      if (entitlements?.canUseBlogPublishing && blogPosts.length > 0) {
        await supabase
          .from("bio_blog_posts")
          .delete()
          .eq("bio_profile_id", targetProfileId);
        const { error: postsErr } = await supabase.from("bio_blog_posts").insert(
          blogPosts.map((b) => ({
            bio_profile_id: targetProfileId,
            workspace_id: workspaceId,
            title: b.title || "Untitled Post",
            slug:
              b.slug ||
              `post-${Math.random().toString(36).substring(2, 7)}`,
            excerpt: b.excerpt || null,
            content_markdown: b.body_markdown || "",
            sanitized_html: b.body_markdown || "",
            reading_time_minutes: 3,
            status: "published" as const,
            published_at: new Date().toISOString(),
          }))
        );
        if (postsErr) throw new Error(`Failed to save blog posts: ${postsErr.message}`);
      }

      // 6. Trigger atomic publish_bio_snapshot RPC
      const { data: pubData, error: pubError } = await supabase.rpc(
        "publish_bio_snapshot",
        {
          p_workspace_id: workspaceId,
          p_expected_draft_version: draftVersion,
        }
      );

      if (pubError) throw new Error(pubError.message);

      if (pubData) {
        const res = pubData as {
          ok?: boolean;
          message?: string;
          code?: string;
          draft_version?: number;
          published_version?: number;
          version_number?: number;
        };
        if (!res.ok) {
          throw new Error(res.message || res.code || "Failed to publish snapshot.");
        }
        if (res.draft_version) {
          setDraftVersion(res.draft_version);
        } else {
          setDraftVersion((prev) => prev + 1);
        }
        if (res.published_version || res.version_number) {
          setPublishedVersion(res.version_number ?? res.published_version ?? 1);
        }
        setPublishedBanner(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to publish Bio snapshot.";
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#f36b3f]" />
      </div>
    );
  }

  // STRICT SINGLE-PRODUCT LOCK GATE:
  // If user subscribed to Instagram Automation Standalone (`ig_creator` or `ig_pro`), lock Bio Studio!
  if (entitlements?.isBioProductLocked) {
    return (
      <ProductLockPaywall
        lockedProduct="bio"
        currentPlanLabel={entitlements.activePlanLabel}
        lockReason={
          entitlements.bioLockReason ||
          "Your workspace is subscribed to Instagram Automation Standalone. Upgrade to the All-in-One Bundle or add Biolio Bio to unlock the Bio Website Studio."
        }
      />
    );
  }

  const activeTemplate =
    BIO_TEMPLATES.find((t) => t.id === templateId) || BIO_TEMPLATES[0];

  const tabs: Array<{
    id: StudioTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    locked?: boolean;
  }> = [
    { id: "identity", label: "Identity & Bio", icon: Globe },
    { id: "links", label: `Links (${links.length})`, icon: Sparkles },
    { id: "gallery", label: `Gallery (${galleryItems.length})`, icon: ImageIcon },
    {
      id: "collaborations",
      label: `Brands (${collaborations.length})`,
      icon: Briefcase,
    },
    {
      id: "blog",
      label: `Blog (${blogPosts.length})`,
      icon: BookOpen,
      locked: !entitlements?.canUseBlogPublishing,
    },
    {
      id: "inquiries",
      label: `Inbox (${inquiries.length})`,
      icon: Mail,
    },
    { id: "templates", label: "Templates", icon: Palette },
  ];

  return (
    <div className="space-y-8">
      {/* Studio Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5dcd1] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-display text-3xl font-extrabold text-[#211b29] tracking-tight">
              Bio Website Studio
            </h1>
            <span className="rounded-full bg-[#277a67]/15 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-[#1e6051]">
              {entitlements?.bioTier.toUpperCase()} Tier
            </span>
          </div>
          <p className="text-xs text-[#7c727e]">
            Draft v{draftVersion} &bull; Published Snapshot v{publishedVersion} &bull; Link Limit:{" "}
            {entitlements?.bioMaxLinks === null
              ? "Unlimited"
              : `${links.length}/${entitlements?.bioMaxLinks ?? 5}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {handle && (
            <a
              href={`/${handle}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-[#e5dcd1] bg-[#fffdf8] px-4 py-2.5 text-xs font-bold text-[#211b29] hover:border-[#211b29]"
            >
              View Live Site
              <ExternalLink className="h-3.5 w-3.5 text-[#f36b3f]" />
            </a>
          )}
          <button
            onClick={handleSaveAndPublish}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#f36b3f] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#e0562b] disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Publish Snapshot
          </button>
        </div>
      </div>

      {publishedBanner && (
        <div className="rounded-2xl border border-[#277a67]/30 bg-[#e3f5ef] p-4 text-xs font-bold text-[#1d5e4f] flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Published immutable snapshot v{publishedVersion} to biolio.site/{handle}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-2xl border border-[#f5c2c7] bg-[#f8d7da] p-4 text-xs font-bold text-[#842029]">
          {errorMsg}
        </div>
      )}

      {entitlements?.bioTier === "free" && (
        <FeatureTierBanner
          title="Free Starter Bio Limits Active (Max 5 Links • 3 Gallery Items • Blog Locked)"
          description="Upgrade to Biolio Bio Creator ($9/mo) or the All-in-One Bundle ($19/mo) to unlock 25+ links, 24 gallery items, custom themes, and Micro-Blog publishing."
          requiredTier="Bio Creator or Bundle"
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Cols: Studio Editor */}
        <div className="lg:col-span-7 space-y-6">
          {/* Sub-navigation Tabs */}
          <div className="flex flex-wrap gap-2 rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
                    isActive
                      ? "bg-[#211b29] text-white shadow-sm"
                      : "text-[#7c727e] hover:text-[#211b29]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {tab.locked && <Lock className="h-3 w-3 text-[#f36b3f]" />}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="rounded-3xl border border-[#e5dcd1] bg-[#fffdf8] p-6 md:p-8 shadow-sm">
            {activeTab === "identity" && (
              <div className="space-y-4">
                <h3 className="font-display text-lg font-bold text-[#211b29] mb-2">
                  Creator Identity &amp; Hero
                </h3>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4351] mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-xl border border-[#e5dcd1] bg-[#fbf8f2] px-4 py-3 text-sm text-[#211b29]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4351] mb-1.5">
                    Headline / Tagline
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Multidisciplinary Designer & Filmmaker"
                    className="w-full rounded-xl border border-[#e5dcd1] bg-[#fbf8f2] px-4 py-3 text-sm text-[#211b29]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4351] mb-1.5">
                    Bio Story
                  </label>
                  <textarea
                    rows={4}
                    value={bioText}
                    onChange={(e) => setBioText(e.target.value)}
                    placeholder="Share what you create, who you help, and what visitors should explore below..."
                    className="w-full rounded-xl border border-[#e5dcd1] bg-[#fbf8f2] px-4 py-3 text-sm text-[#211b29]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4351] mb-1.5">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="New York / Tokyo"
                    className="w-full rounded-xl border border-[#e5dcd1] bg-[#fbf8f2] px-4 py-3 text-sm text-[#211b29]"
                  />
                </div>

                {/* Pro Feature Lock: Remove Biolio Branding */}
                <div className="pt-2">
                  <div className="rounded-xl border border-[#e5dcd1] bg-[#fbf8f2] p-3.5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#211b29]">
                        Display &ldquo;Powered by Biolio&rdquo; Footer Badge
                      </div>
                      <div className="text-[11px] text-[#7c727e]">
                        White-label branding removal requires Bio Pro or Bundle Pro.
                      </div>
                    </div>
                    {entitlements?.canRemoveBiolioBranding ? (
                      <input
                        type="checkbox"
                        checked={showBiolioBranding}
                        onChange={(e) =>
                          setShowBiolioBranding(e.target.checked)
                        }
                        className="h-4 w-4 rounded border-[#e5dcd1] text-[#f36b3f]"
                      />
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-[#211b29] px-2.5 py-1 text-[10px] font-bold text-white">
                        <Lock className="h-3 w-3 text-[#f36b3f]" /> Pro Only
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "links" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#211b29]">
                      Smart Links &amp; CTAs
                    </h3>
                    <p className="text-[11px] text-[#7c727e]">
                      Using {links.length} of{" "}
                      {entitlements?.bioMaxLinks === null
                        ? "Unlimited"
                        : entitlements?.bioMaxLinks ?? 5}{" "}
                      allowed links on your plan.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddLink}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#211b29] px-3.5 py-2 text-xs font-bold text-white"
                  >
                    <Plus className="h-3.5 w-3.5 text-[#f36b3f]" />
                    Add Link
                  </button>
                </div>

                <div className="space-y-3">
                  {links.map((link, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-[#e5dcd1] bg-[#fbf8f2] p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={link.title}
                          onChange={(e) => {
                            const updated = [...links];
                            updated[idx].title = e.target.value;
                            setLinks(updated);
                          }}
                          placeholder="Link Title"
                          className="flex-1 rounded-lg border border-[#e5dcd1] bg-white px-3 py-2 text-xs font-bold text-[#211b29]"
                        />
                        <input
                          type="text"
                          value={link.badge_text}
                          onChange={(e) => {
                            const updated = [...links];
                            updated[idx].badge_text = e.target.value;
                            setLinks(updated);
                          }}
                          placeholder="Badge (e.g. NEW)"
                          className="w-28 rounded-lg border border-[#e5dcd1] bg-white px-3 py-2 text-xs text-[#211b29]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setLinks(links.filter((_, i) => i !== idx))
                          }
                          className="p-2 text-[#a62639] hover:bg-[#fde8eb] rounded-lg"
                          aria-label="Remove link"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <input
                        type="url"
                        value={link.url}
                        onChange={(e) => {
                          const updated = [...links];
                          updated[idx].url = e.target.value;
                          setLinks(updated);
                        }}
                        placeholder="https://..."
                        className="w-full rounded-lg border border-[#e5dcd1] bg-white px-3 py-2 text-xs text-[#7c727e]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "gallery" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#211b29]">
                      Visual Portfolio Gallery
                    </h3>
                    <p className="text-[11px] text-[#7c727e]">
                      Using {galleryItems.length} of{" "}
                      {entitlements?.bioMaxGalleryItems === null
                        ? "Unlimited"
                        : entitlements?.bioMaxGalleryItems ?? 3}{" "}
                      allowed items.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddGalleryItem}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#211b29] px-3.5 py-2 text-xs font-bold text-white"
                  >
                    <Plus className="h-3.5 w-3.5 text-[#f36b3f]" />
                    Add Portfolio Item
                  </button>
                </div>

                {galleryItems.length === 0 ? (
                  <p className="text-xs text-[#7c727e] py-6 text-center">
                    No gallery items added yet. Click &ldquo;Add Portfolio Item&rdquo; to showcase your work.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {galleryItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl border border-[#e5dcd1] bg-[#fbf8f2] p-4 space-y-2.5"
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
                            placeholder="Project Title"
                            className="flex-1 rounded-lg border border-[#e5dcd1] bg-white px-3 py-2 text-xs font-bold text-[#211b29]"
                          />
                          <input
                            type="text"
                            value={item.category}
                            onChange={(e) => {
                              const next = [...galleryItems];
                              next[idx].category = e.target.value;
                              setGalleryItems(next);
                            }}
                            placeholder="Category"
                            className="w-32 rounded-lg border border-[#e5dcd1] bg-white px-3 py-2 text-xs text-[#211b29]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setGalleryItems(
                                galleryItems.filter((_, i) => i !== idx)
                              )
                            }
                            className="p-2 text-[#a62639] hover:bg-[#fde8eb] rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <input
                          type="url"
                          value={item.media_url}
                          onChange={(e) => {
                            const next = [...galleryItems];
                            next[idx].media_url = e.target.value;
                            setGalleryItems(next);
                          }}
                          placeholder="https://res.cloudinary.com/... or image URL"
                          className="w-full rounded-lg border border-[#e5dcd1] bg-white px-3 py-2 text-xs text-[#7c727e]"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "collaborations" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#211b29]">
                      Brand Collaborations &amp; Case Studies
                    </h3>
                    <p className="text-[11px] text-[#7c727e]">
                      Highlight past brand partnerships and campaign results.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCollaboration}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#211b29] px-3.5 py-2 text-xs font-bold text-white"
                  >
                    <Plus className="h-3.5 w-3.5 text-[#f36b3f]" />
                    Add Brand Partner
                  </button>
                </div>

                {collaborations.map((c, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-[#e5dcd1] bg-[#fbf8f2] p-4 space-y-2.5"
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
                        placeholder="Brand Name"
                        className="flex-1 rounded-lg border border-[#e5dcd1] bg-white px-3 py-2 text-xs font-bold text-[#211b29]"
                      />
                      <input
                        type="text"
                        value={c.role_title}
                        onChange={(e) => {
                          const next = [...collaborations];
                          next[idx].role_title = e.target.value;
                          setCollaborations(next);
                        }}
                        placeholder="Role (e.g. Creator Partner)"
                        className="w-44 rounded-lg border border-[#e5dcd1] bg-white px-3 py-2 text-xs text-[#211b29]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setCollaborations(
                            collaborations.filter((_, i) => i !== idx)
                          )
                        }
                        className="p-2 text-[#a62639] hover:bg-[#fde8eb] rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={c.summary}
                      onChange={(e) => {
                        const next = [...collaborations];
                        next[idx].summary = e.target.value;
                        setCollaborations(next);
                      }}
                      placeholder="Short outcome summary..."
                      className="w-full rounded-lg border border-[#e5dcd1] bg-white px-3 py-2 text-xs text-[#5d5360]"
                    />
                  </div>
                ))}
              </div>
            )}

            {activeTab === "blog" && (
              <div className="space-y-4">
                {!entitlements?.canUseBlogPublishing ? (
                  <FeatureTierBanner
                    title="Micro-Blog Publishing is Locked on Starter Free"
                    description="Upgrade to Biolio Bio Creator ($9/mo) or the All-in-One Bundle ($19/mo) to publish native SEO articles at biolio.site/your-handle/blog/post-slug."
                    requiredTier="Bio Creator / Pro"
                  />
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-lg font-bold text-[#211b29]">
                        Micro-Blog Posts
                      </h3>
                      <button
                        type="button"
                        onClick={handleAddBlogPost}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#211b29] px-3.5 py-2 text-xs font-bold text-white"
                      >
                        <Plus className="h-3.5 w-3.5 text-[#f36b3f]" />
                        New Article
                      </button>
                    </div>

                    {blogPosts.map((post, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl border border-[#e5dcd1] bg-[#fbf8f2] p-4 space-y-2.5"
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
                            placeholder="Article Headline"
                            className="flex-1 rounded-lg border border-[#e5dcd1] bg-white px-3 py-2 text-xs font-bold text-[#211b29]"
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
                            className="w-36 rounded-lg border border-[#e5dcd1] bg-white px-3 py-2 text-xs font-mono text-[#7c727e]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setBlogPosts(
                                blogPosts.filter((_, i) => i !== idx)
                              )
                            }
                            className="p-2 text-[#a62639] hover:bg-[#fde8eb] rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <textarea
                          rows={3}
                          value={post.body_markdown}
                          onChange={(e) => {
                            const next = [...blogPosts];
                            next[idx].body_markdown = e.target.value;
                            next[idx].excerpt = e.target.value.slice(0, 140);
                            setBlogPosts(next);
                          }}
                          placeholder="Write your essay in Markdown..."
                          className="w-full rounded-lg border border-[#e5dcd1] bg-white px-3 py-2 text-xs text-[#211b29]"
                        />
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {activeTab === "inquiries" && (
              <div className="space-y-4">
                <h3 className="font-display text-lg font-bold text-[#211b29]">
                  Visitor Contact &amp; Booking Inquiries ({inquiries.length})
                </h3>
                {inquiries.length === 0 ? (
                  <p className="text-xs text-[#7c727e]">
                    No visitor inquiries submitted yet. Visitors on{" "}
                    <code className="font-mono">biolio.site/{handle}</code> can send you direct brand &amp; booking requests.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {inquiries.map((inq) => (
                      <div
                        key={inq.id}
                        className="rounded-2xl border border-[#e5dcd1] bg-[#fbf8f2] p-4 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between font-bold text-[#211b29]">
                          <span>
                            {inq.sender_name} ({inq.sender_email})
                          </span>
                          {inq.budget_range && (
                            <span className="rounded bg-[#277a67]/15 px-2 py-0.5 text-[10px] text-[#1e6051]">
                              {inq.budget_range}
                            </span>
                          )}
                        </div>
                        <p className="text-[#5d5360]">{inq.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "templates" && (
              <div className="space-y-4">
                <h3 className="font-display text-lg font-bold text-[#211b29] mb-2">
                  Switch Bio Template
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {BIO_TEMPLATES.map((tpl) => {
                    const lockedTemplate =
                      tpl.minTier !== "free" &&
                      !entitlements?.canUseCustomThemes;

                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        disabled={lockedTemplate}
                        onClick={() => setTemplateId(tpl.id)}
                        className={`rounded-2xl border-2 p-4 text-left transition-all ${
                          templateId === tpl.id
                            ? "border-[#f36b3f] bg-[#fff5f0]"
                            : "border-[#e5dcd1] bg-[#fbf8f2]"
                        } ${lockedTemplate ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-display font-bold text-sm text-[#211b29]">
                            {tpl.name}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#e5dcd1] text-[#211b29]">
                            {lockedTemplate && <Lock className="h-2.5 w-2.5" />}
                            {tpl.minTier}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#7c727e]">
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

        {/* Right 5 Cols: Live Mobile Preview Frame */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-[360px] rounded-[42px] border-[10px] border-[#211b29] bg-[#16121c] p-2 shadow-2xl">
            <div
              className="rounded-[32px] min-h-[600px] p-6 flex flex-col justify-between transition-colors duration-300"
              style={{
                backgroundColor: activeTemplate.tokens.bg,
                color: activeTemplate.tokens.ink,
              }}
            >
              <div>
                <div className="text-center mb-6 pt-4">
                  <div
                    className="mx-auto mb-3 h-20 w-20 rounded-full flex items-center justify-center font-display text-2xl font-extrabold shadow-md"
                    style={{
                      backgroundColor: activeTemplate.tokens.accent,
                      color: "#ffffff",
                    }}
                  >
                    {(displayName || handle || "B").charAt(0).toUpperCase()}
                  </div>
                  <h2 className="font-display text-xl font-extrabold tracking-tight">
                    {displayName || handle || "Your Name"}
                  </h2>
                  <p className="text-xs opacity-75 mt-1">
                    {tagline || "Creator & Founder"}
                  </p>
                  {bioText && (
                    <p className="text-xs opacity-80 mt-3 leading-relaxed">
                      {bioText}
                    </p>
                  )}
                </div>

                {/* Live Links Preview */}
                <div className="space-y-2.5">
                  {links.map((link, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl px-4 py-3.5 text-xs font-bold flex items-center justify-between shadow-sm border border-black/10"
                      style={{
                        backgroundColor: activeTemplate.tokens.surface,
                        color: activeTemplate.tokens.ink,
                      }}
                    >
                      <span className="truncate">{link.title}</span>
                      {link.badge_text && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[9px] font-extrabold text-white shrink-0"
                          style={{
                            backgroundColor: activeTemplate.tokens.accent,
                          }}
                        >
                          {link.badge_text}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {showBiolioBranding && (
                <div className="pt-8 text-center text-[10px] font-bold uppercase tracking-widest opacity-50">
                  Biolio.site/{handle}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
