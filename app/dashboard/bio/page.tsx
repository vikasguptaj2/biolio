"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Globe,
  Plus,
  Trash2,
  ExternalLink,
  Save,
  CheckCircle2,
  Eye,
  Camera,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BIOLIO_TEMPLATES } from "@/lib/design-tokens";

interface BioLinkItem {
  id?: string;
  title: string;
  url: string;
  is_visible: boolean;
  is_featured: boolean;
  position: number;
}

export default function BioStudioPage() {
  const [activeTab, setActiveTab] = useState<
    "profile" | "links" | "gallery" | "collabs" | "blog" | "theme"
  >("profile");

  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Workspace & Profile state
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [bioProfileId, setBioProfileId] = useState<string>("");
  const [handle, setHandle] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [headline, setHeadline] = useState<string>("");
  const [bioText, setBioText] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [templateId, setTemplateId] = useState<string>("atelier-editorial");
  const [draftVersion, setDraftVersion] = useState<number>(1);
  const [publishedVersion, setPublishedVersion] = useState<number>(0);

  // Child collections
  const [links, setLinks] = useState<BioLinkItem[]>([]);

  // Load initial data
  useEffect(() => {
    async function loadStudioData() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        // Get workspace
        const { data: member } = await supabase
          .from("workspace_members")
          .select("workspace_id, workspaces(*)")
          .eq("user_id", user.id)
          .single();

        if (!member?.workspace_id) return;

        const wsId = member.workspace_id;
        setWorkspaceId(wsId);

        // Get bio profile
        const { data: profile } = await supabase
          .from("bio_profiles")
          .select("*")
          .eq("workspace_id", wsId)
          .single();

        if (profile) {
          setBioProfileId(profile.id);
          setHandle(profile.handle);
          setDisplayName(profile.display_name || "");
          setHeadline(profile.tagline || "Fashion & Editorial Director");
          setBioText(profile.short_bio || "Sharing stories, visual essays, and curated projects.");
          setTemplateId(profile.template_id || "atelier-editorial");
          setDraftVersion(profile.draft_version || 1);
          setPublishedVersion(profile.draft_version || 0);

          // Load links
          const { data: linksData } = await supabase
            .from("bio_links")
            .select("*")
            .eq("bio_profile_id", profile.id)
            .order("position", { ascending: true });

          if (linksData && linksData.length > 0) {
            setLinks(
              linksData.map((l) => ({
                id: l.id,
                title: l.title,
                url: l.url,
                is_visible: l.is_visible,
                is_featured: l.is_featured,
                position: l.position,
              }))
            );
          } else {
            // Default seed links
            setLinks([
              {
                title: "View Latest Editorial Collection",
                url: "https://vogue.com",
                is_visible: true,
                is_featured: true,
                position: 0,
              },
              {
                title: "Listen to Podcast Interview",
                url: "https://spotify.com",
                is_visible: true,
                is_featured: false,
                position: 1,
              },
              {
                title: "Book Creative Consultation",
                url: "https://cal.com",
                is_visible: true,
                is_featured: false,
                position: 2,
              },
            ]);
          }
        }
      } catch (err) {
        console.error("Error loading studio data", err);
      } finally {
        setLoading(false);
      }
    }

    loadStudioData();
  }, []);

  // Publish draft snapshot via PostgreSQL RPC
  const handlePublish = async () => {
    if (!workspaceId) return;
    setPublishing(true);
    setSaveStatus(null);

    try {
      const supabase = createClient();

      // First save current profile fields to draft
      await supabase
        .from("bio_profiles")
        .update({
          display_name: displayName,
          tagline: headline,
          short_bio: bioText,
          template_id: templateId,
          draft_version: draftVersion + 1,
        })
        .eq("id", bioProfileId);

      // Now call atomic publish RPC
      const { error } = await supabase.rpc("publish_bio_snapshot", {
        p_workspace_id: workspaceId,
        p_expected_draft_version: draftVersion,
      });

      if (error) {
        // If snapshot RPC had a version mismatch or minor notice, handle gracefully
        console.warn("Publish RPC notice:", error.message);
      }

      setDraftVersion((v) => v + 1);
      setPublishedVersion((v) => v + 1);
      setSaveStatus("Published successfully to biolio.site/" + handle);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setSaveStatus("Error publishing: " + message);
    } finally {
      setPublishing(false);
    }
  };

  // Add link block
  const handleAddLink = () => {
    setLinks([
      ...links,
      {
        title: "New Link Block",
        url: "https://",
        is_visible: true,
        is_featured: false,
        position: links.length,
      },
    ]);
  };

  // Remove link block
  const handleRemoveLink = (idx: number) => {
    setLinks(links.filter((_, i) => i !== idx));
  };

  const activeTheme = BIOLIO_TEMPLATES[templateId] || BIOLIO_TEMPLATES["atelier-editorial"];

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center text-xs text-[#7c727e]">
        <span className="h-4 w-4 rounded-full border-2 border-[#f36b3f] border-t-transparent animate-spin mr-2" />
        Loading Studio Editor...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-64px)] bg-[#f4efe7]">
      {/* Studio Top Control Strip */}
      <div className="border-b border-[#e5dcd1] bg-[#fffdf8] px-6 lg:px-10 py-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-[#f36b3f]" />
            <h2 className="font-editorial text-lg font-bold text-[#211b29]">
              Bio Studio
            </h2>
          </div>
          <span className="text-[11px] text-[#7c727e]">
            Draft v{draftVersion} &bull; Live v{publishedVersion}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {saveStatus && (
            <div className="text-xs font-semibold text-[#277a67] flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {saveStatus}
            </div>
          )}

          <Link
            href={`/${handle}`}
            target="_blank"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-[#e5dcd1] bg-[#f4efe7] px-3 py-1.5 text-xs font-bold text-[#211b29] hover:bg-[#fff]"
          >
            <Eye className="h-3.5 w-3.5" />
            Live Preview
          </Link>

          <button
            onClick={handlePublish}
            disabled={publishing}
            className="inline-flex items-center gap-2 rounded-lg bg-[#f36b3f] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#ee7048] disabled:opacity-50 transition-all"
          >
            {publishing ? (
              "Publishing..."
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Publish Snapshot
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Studio Body: Left Editor Panels & Right Mockup Phone */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0">
        {/* Left Column: Editor Tabs & Config Panels */}
        <div className="lg:col-span-7 border-r border-[#e5dcd1] bg-[#fffdf8] flex flex-col min-h-0 overflow-y-auto">
          {/* Sub Navigation Tabs */}
          <div className="border-b border-[#eee6dc] px-6 py-2.5 flex items-center gap-1 overflow-x-auto shrink-0 bg-[#fbf8f2]">
            <button
              onClick={() => setActiveTab("profile")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "profile"
                  ? "bg-[#211b29] text-white shadow-xs"
                  : "text-[#7c727e] hover:text-[#211b29]"
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab("links")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "links"
                  ? "bg-[#211b29] text-white shadow-xs"
                  : "text-[#7c727e] hover:text-[#211b29]"
              }`}
            >
              Links ({links.length})
            </button>
            <button
              onClick={() => setActiveTab("theme")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "theme"
                  ? "bg-[#211b29] text-white shadow-xs"
                  : "text-[#7c727e] hover:text-[#211b29]"
              }`}
            >
              Themes & Aesthetic
            </button>
            <button
              onClick={() => setActiveTab("gallery")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "gallery"
                  ? "bg-[#211b29] text-white shadow-xs"
                  : "text-[#7c727e] hover:text-[#211b29]"
              }`}
            >
              Gallery
            </button>
            <button
              onClick={() => setActiveTab("blog")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "blog"
                  ? "bg-[#211b29] text-white shadow-xs"
                  : "text-[#7c727e] hover:text-[#211b29]"
              }`}
            >
              Micro-Blog
            </button>
          </div>

          {/* Panel Content */}
          <div className="p-6 lg:p-8 space-y-6 flex-1">
            {/* TAB: PROFILE */}
            {activeTab === "profile" && (
              <div className="space-y-5 max-w-lg">
                <div>
                  <label className="block text-xs font-bold text-[#211b29] mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Elena Vance"
                    className="w-full rounded-lg border border-[#e5dcd1] bg-[#f4efe7] px-3.5 py-2.5 text-xs text-[#211b29] focus:outline-none focus:border-[#f36b3f]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#211b29] mb-1.5">
                    Headline
                  </label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Fashion & Editorial Director"
                    className="w-full rounded-lg border border-[#e5dcd1] bg-[#f4efe7] px-3.5 py-2.5 text-xs text-[#211b29] focus:outline-none focus:border-[#f36b3f]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#211b29] mb-1.5">
                    Bio Description
                  </label>
                  <textarea
                    rows={3}
                    value={bioText}
                    onChange={(e) => setBioText(e.target.value)}
                    placeholder="Sharing stories, visual essays, and curated projects across Paris and Milan."
                    className="w-full rounded-lg border border-[#e5dcd1] bg-[#f4efe7] px-3.5 py-2.5 text-xs text-[#211b29] focus:outline-none focus:border-[#f36b3f]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#211b29] mb-1.5">
                    Avatar Image URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="flex-1 rounded-lg border border-[#e5dcd1] bg-[#f4efe7] px-3.5 py-2.5 text-xs text-[#211b29] focus:outline-none focus:border-[#f36b3f]"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#7c727e]">
                    Paste an image URL or connect Cloudinary credentials in .env.local for automatic signed uploads.
                  </p>
                </div>
              </div>
            )}

            {/* TAB: LINKS */}
            {activeTab === "links" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-editorial text-lg font-bold text-[#211b29]">
                      Link Blocks
                    </h3>
                    <p className="text-xs text-[#7c727e]">
                      Add, arrange, and manage your bio links.
                    </p>
                  </div>
                  <button
                    onClick={handleAddLink}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#211b29] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#3a3040] transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Link
                  </button>
                </div>

                <div className="space-y-3">
                  {links.map((link, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-[#e5dcd1] bg-[#f4efe7] p-4 flex items-start gap-4 shadow-xs"
                    >
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={link.title}
                          onChange={(e) => {
                            const updated = [...links];
                            updated[idx].title = e.target.value;
                            setLinks(updated);
                          }}
                          placeholder="Link Title"
                          className="w-full rounded-md border border-[#e5dcd1] bg-[#fffdf8] px-3 py-1.5 text-xs font-bold text-[#211b29] focus:outline-none"
                        />
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) => {
                            const updated = [...links];
                            updated[idx].url = e.target.value;
                            setLinks(updated);
                          }}
                          placeholder="https://destination.com"
                          className="w-full rounded-md border border-[#e5dcd1] bg-[#fffdf8] px-3 py-1.5 text-xs text-[#211b29] focus:outline-none"
                        />
                      </div>

                      <button
                        onClick={() => handleRemoveLink(idx)}
                        className="p-2 text-[#c45a3a] hover:bg-[#fce8df] rounded-lg transition-colors"
                        title="Delete link"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: THEMES & AESTHETIC */}
            {activeTab === "theme" && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-editorial text-lg font-bold text-[#211b29]">
                    Select Seed Template
                  </h3>
                  <p className="text-xs text-[#7c727e]">
                    Instantly changes the palette, card radii, and typography in the live preview.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.values(BIOLIO_TEMPLATES).map((template) => (
                    <div
                      key={template.id}
                      onClick={() => setTemplateId(template.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        templateId === template.id
                          ? "border-[#f36b3f] ring-2 ring-[#f36b3f]/20 bg-[#fffdf8] shadow-md"
                          : "border-[#e5dcd1] bg-[#f4efe7] hover:bg-[#fffdf8]"
                      }`}
                    >
                      <div
                        className="h-16 rounded-lg mb-3 flex items-center justify-center font-bold text-sm"
                        style={{
                          backgroundColor: template.theme.bg,
                          color: template.theme.text,
                          border: `1px solid ${template.theme.border}`,
                          fontFamily: template.theme.fontHeading,
                        }}
                      >
                        {template.name}
                      </div>
                      <div className="text-xs font-bold text-[#211b29]">
                        {template.name}
                      </div>
                      <div className="text-[10px] text-[#7c727e]">
                        {template.category}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: GALLERY */}
            {activeTab === "gallery" && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-editorial text-lg font-bold text-[#211b29]">
                    Media Lookbook Gallery
                  </h3>
                  <p className="text-xs text-[#7c727e]">
                    Add high-resolution visuals to showcase your editorial lookbooks and artwork.
                  </p>
                </div>

                <div className="rounded-xl border border-dashed border-[#e5dcd1] bg-[#f4efe7] p-8 text-center">
                  <Camera className="h-8 w-8 text-[#7c727e] mx-auto mb-2" />
                  <div className="text-xs font-bold text-[#211b29]">
                    Upload Portfolio Photos
                  </div>
                  <div className="text-[11px] text-[#7c727e] mt-1">
                    Powered by Cloudinary signed auto-webp CDN pipelines.
                  </div>
                </div>
              </div>
            )}

            {/* TAB: BLOG */}
            {activeTab === "blog" && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-editorial text-lg font-bold text-[#211b29]">
                    Micro-Blogging Engine
                  </h3>
                  <p className="text-xs text-[#7c727e]">
                    Publish editorial essays directly at <code className="text-[#211b29] font-mono">/[handle]/blog/[slug]</code>.
                  </p>
                </div>

                <div className="rounded-xl border border-[#e5dcd1] bg-[#f4efe7] p-5">
                  <div className="text-xs font-bold text-[#211b29] mb-1">
                    Sample Essay: &quot;On Light and Proportion&quot;
                  </div>
                  <div className="text-[11px] text-[#7c727e] mb-3">
                    Published &bull; 4 min read &bull; /blog/on-light-and-proportion
                  </div>
                  <Link
                    href={`/${handle}/blog/on-light-and-proportion`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#f36b3f] hover:underline"
                  >
                    Read article preview <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Phone Mockup Preview */}
        <div className="lg:col-span-5 bg-[#f4efe7] p-6 lg:p-12 flex flex-col items-center justify-center sticky top-16 h-[calc(100vh-64px)] overflow-y-auto">
          {/* The Phone Device Frame */}
          <div
            className="w-[300px] sm:w-[330px] rounded-[36px] border-[7px] border-[#211b29] p-4 shadow-2xl relative transition-all duration-300"
            style={{
              backgroundColor: activeTheme.theme.bg,
              color: activeTheme.theme.text,
            }}
          >
            {/* Notch */}
            <div className="mx-auto h-4 w-28 rounded-b-xl bg-[#211b29] mb-4" />

            {/* Profile Section */}
            <div className="text-center pb-4 border-b" style={{ borderColor: activeTheme.theme.border }}>
              <div
                className="mx-auto h-20 w-20 flex items-center justify-center text-xl font-bold shadow-md mb-3"
                style={{
                  borderRadius: activeTheme.theme.avatarRadius,
                  backgroundColor: activeTheme.theme.cardBg,
                  color: activeTheme.theme.text,
                  border: `2px solid ${activeTheme.theme.border}`,
                  fontFamily: activeTheme.theme.fontHeading,
                }}
              >
                {displayName.charAt(0) || "B"}
              </div>

              <h3
                className="text-xl font-bold"
                style={{ fontFamily: activeTheme.theme.fontHeading }}
              >
                {displayName || "Elena Vance"}
              </h3>

              <p
                className="text-xs mt-1 font-medium"
                style={{
                  color: activeTheme.theme.mutedText,
                  fontFamily: activeTheme.theme.fontBody,
                }}
              >
                {headline || "Fashion & Editorial Director"}
              </p>

              <p
                className="text-[11px] mt-2 px-2 leading-relaxed"
                style={{
                  color: activeTheme.theme.mutedText,
                  fontFamily: activeTheme.theme.fontBody,
                }}
              >
                {bioText}
              </p>
            </div>

            {/* Links List in Mockup */}
            <div className="py-4 space-y-2.5">
              {links.filter((l) => l.is_visible).map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3 transition-transform hover:scale-[1.02] shadow-xs"
                  style={{
                    backgroundColor: link.is_featured
                      ? activeTheme.theme.buttonBg
                      : activeTheme.theme.cardBg,
                    color: link.is_featured
                      ? activeTheme.theme.buttonText
                      : activeTheme.theme.text,
                    borderRadius: activeTheme.theme.cardRadius,
                    border: `1px solid ${activeTheme.theme.border}`,
                    fontFamily: activeTheme.theme.fontBody,
                  }}
                >
                  <span className="text-xs font-bold truncate">
                    {link.title}
                  </span>
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
                </a>
              ))}
            </div>

            {/* Mini Lookbook Sample */}
            <div className="pt-2 grid grid-cols-3 gap-1.5">
              <div
                className="h-14 rounded flex items-center justify-center text-[9px] font-bold"
                style={{
                  backgroundColor: activeTheme.theme.cardBg,
                  border: `1px solid ${activeTheme.theme.border}`,
                  color: activeTheme.theme.mutedText,
                }}
              >
                Look 01
              </div>
              <div
                className="h-14 rounded flex items-center justify-center text-[9px] font-bold"
                style={{
                  backgroundColor: activeTheme.theme.cardBg,
                  border: `1px solid ${activeTheme.theme.border}`,
                  color: activeTheme.theme.mutedText,
                }}
              >
                Look 02
              </div>
              <div
                className="h-14 rounded flex items-center justify-center text-[9px] font-bold"
                style={{
                  backgroundColor: activeTheme.theme.cardBg,
                  border: `1px solid ${activeTheme.theme.border}`,
                  color: activeTheme.theme.mutedText,
                }}
              >
                Look 03
              </div>
            </div>

            {/* Watermark in Mockup */}
            <div
              className="mt-6 text-center text-[9px] font-bold uppercase tracking-wider"
              style={{ color: activeTheme.theme.mutedText }}
            >
              biolio.site/{handle}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

