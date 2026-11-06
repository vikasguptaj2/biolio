import { Suspense } from "react";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { BIO_TEMPLATES } from "@/lib/design-tokens";
import { PublicContactForm } from "@/components/bio/public-contact-form";
import { recordAnalyticsEvent } from "@/lib/server/analytics/record";
import {
  MapPin,
  ArrowUpRight,
  BookOpen,
  Image as ImageIcon,
  Briefcase,
} from "lucide-react";

interface SnapshotBioPayload {
  workspace_id?: string;
  handle?: string;
  display_name?: string;
  tagline?: string;
  bio_text?: string;
  bio?: string;
  location?: string;
  template_id?: string;
  show_biolio_branding?: boolean;
  contact_form_enabled?: boolean;
  profile?: {
    workspace_id?: string;
    handle?: string;
    display_name?: string;
    tagline?: string;
    short_bio?: string;
    about_story?: string;
    bio?: string;
    category?: string;
    location?: string;
    template_id?: string;
    show_biolio_branding?: boolean;
    contact_form_enabled?: boolean;
  };
  links?: Array<{
    id?: string;
    title: string;
    subtitle?: string;
    url: string;
    icon?: string;
    badge_text?: string;
    position?: number;
  }>;
  gallery?: Array<{
    id?: string;
    media_url?: string;
    external_url?: string;
    title?: string;
    category?: string;
    position?: number;
  }>;
  collaborations?: Array<{
    id?: string;
    brand_name: string;
    role_title?: string;
    campaign_title?: string;
    summary?: string;
    campaign_summary?: string;
    case_study_url?: string;
    position?: number;
  }>;
  blog_posts?: Array<{
    id?: string;
    title: string;
    slug: string;
    reading_minutes?: number;
    reading_time_minutes?: number;
    excerpt?: string;
    content_markdown?: string;
    status?: string;
  }>;
}

interface BioProfileSummary {
  id?: string;
  workspace_id?: string;
  handle?: string;
  display_name?: string | null;
  tagline?: string | null;
  bio_text?: string | null;
  location?: string | null;
  template_id?: string;
  show_biolio_branding?: boolean;
  contact_form_enabled?: boolean;
}

export default function CreatorPublicBioPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  return (
    <Suspense fallback={<BioProfileSkeleton />}>
      <CreatorBioContent params={params} />
    </Suspense>
  );
}

function BioProfileSkeleton() {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 bg-[#f4efe7] animate-pulse">
      <div className="mx-auto max-w-xl space-y-10">
        <div className="text-center space-y-3">
          <div className="mx-auto h-24 w-24 rounded-full bg-[#e5dcd1]" />
          <div className="h-8 w-48 bg-[#e5dcd1] rounded-md mx-auto" />
          <div className="h-4 w-32 bg-[#e5dcd1] rounded-md mx-auto" />
        </div>
        <div className="space-y-3">
          <div className="h-14 bg-[#e5dcd1] rounded-2xl" />
          <div className="h-14 bg-[#e5dcd1] rounded-2xl" />
          <div className="h-14 bg-[#e5dcd1] rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

async function CreatorBioContent({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const cleanHandle = handle.toLowerCase();

  const supabase = await createClient();

  // 1. Read immutable published snapshot from bio_published_versions (accessible to anon under RLS)
  const { data: publishedSnapshot } = await supabase
    .from("bio_published_versions")
    .select("*")
    .eq("handle_at_publish", cleanHandle)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 2. Fallback to bio_profiles if in draft/preview mode for workspace owner (only select anon-authorized columns)
  const { data: profile } = await supabase
    .from("bio_profiles")
    .select("id, workspace_id, handle, display_name, is_published, current_published_version_id, moderation_state")
    .eq("handle", cleanHandle)
    .maybeSingle();

  if (!publishedSnapshot && !profile) {
    notFound();
  }

  const snapshotPayload =
    ((publishedSnapshot?.snapshot_payload as unknown) as SnapshotBioPayload) || {};
  const profileData = snapshotPayload.profile || {};
  const profileSummary = (profile as unknown) as BioProfileSummary | null;

  const workspaceId =
    profile?.workspace_id ||
    snapshotPayload.workspace_id ||
    profileData.workspace_id ||
    publishedSnapshot?.workspace_id;

  const displayName =
    profileData.display_name ||
    snapshotPayload.display_name ||
    profile?.display_name ||
    profileSummary?.display_name ||
    cleanHandle;

  const tagline =
    profileData.tagline ||
    snapshotPayload.tagline ||
    profileSummary?.tagline ||
    "";

  const bioText =
    profileData.short_bio ||
    profileData.about_story ||
    profileData.bio ||
    snapshotPayload.bio_text ||
    snapshotPayload.bio ||
    profileSummary?.bio_text ||
    "";

  const location =
    profileData.location ||
    snapshotPayload.location ||
    profileSummary?.location ||
    "";

  const templateId =
    profileData.template_id ||
    snapshotPayload.template_id ||
    profileSummary?.template_id ||
    "atelier-editorial";

  const showBranding =
    profileData.show_biolio_branding ??
    snapshotPayload.show_biolio_branding ??
    profileSummary?.show_biolio_branding ??
    true;

  const contactEnabled =
    profileData.contact_form_enabled ??
    snapshotPayload.contact_form_enabled ??
    profileSummary?.contact_form_enabled ??
    true;

  if (workspaceId) {
    const headerList = await headers();
    recordAnalyticsEvent({
      workspaceId,
      bioProfileId: profile?.id || null,
      eventType: "bio.page_view",
      headers: headerList,
    }).catch(() => {});
  }

  // Read links, gallery, collaborations, and blog_posts directly from snapshot_payload first
  // so anonymous visitors never hit RLS blocks on draft tables!
  const links = Array.isArray(snapshotPayload.links)
    ? snapshotPayload.links
    : [];
  const galleryItems = Array.isArray(snapshotPayload.gallery)
    ? snapshotPayload.gallery
    : [];
  const collaborations = Array.isArray(snapshotPayload.collaborations)
    ? snapshotPayload.collaborations
    : [];
  const blogPosts = Array.isArray(snapshotPayload.blog_posts)
    ? snapshotPayload.blog_posts
    : [];

  const template =
    BIO_TEMPLATES.find((t) => t.id === templateId) || BIO_TEMPLATES[0];

  return (
    <div
      className="min-h-screen py-12 px-4 sm:px-6 transition-colors"
      style={{
        backgroundColor: template.tokens.bg,
        color: template.tokens.ink,
      }}
    >
      <div className="mx-auto max-w-xl space-y-10">
        {/* Hero Identity Card */}
        <div className="text-center space-y-3">
          <div
            className="mx-auto h-24 w-24 rounded-full flex items-center justify-center font-display text-3xl font-extrabold shadow-lg"
            style={{
              backgroundColor: template.tokens.accent,
              color: "#ffffff",
            }}
          >
            {String(displayName).charAt(0).toUpperCase()}
          </div>

          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            {displayName}
          </h1>

          {tagline && (
            <p className="text-sm font-medium opacity-80">{tagline}</p>
          )}

          {location && (
            <div className="inline-flex items-center gap-1.5 text-xs opacity-65">
              <MapPin className="h-3.5 w-3.5" />
              {location}
            </div>
          )}

          {bioText && (
            <p className="text-sm leading-relaxed opacity-85 max-w-md mx-auto pt-2">
              {bioText}
            </p>
          )}
        </div>

        {/* Smart Links Section */}
        {links.length > 0 && (
          <div className="space-y-3">
            {links.map((link, idx) => (
              <a
                key={link.id || idx}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center justify-between rounded-2xl p-4 shadow-sm border border-black/10 transition-transform hover:-translate-y-0.5"
                style={{
                  backgroundColor: template.tokens.surface,
                  color: template.tokens.ink,
                }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{link.title}</span>
                    {link.badge_text && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white"
                        style={{ backgroundColor: template.tokens.accent }}
                      >
                        {link.badge_text}
                      </span>
                    )}
                  </div>
                  {link.subtitle && (
                    <p className="text-xs opacity-70 mt-0.5">{link.subtitle}</p>
                  )}
                </div>
                <ArrowUpRight className="h-4 w-4 opacity-60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
            ))}
          </div>
        )}

        {/* Portfolio Gallery Section */}
        {galleryItems.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-70">
              <ImageIcon className="h-3.5 w-3.5" /> Selected Works
            </div>
            <div className="grid grid-cols-2 gap-4">
              {galleryItems.map((item, idx) => {
                const imgUrl = item.external_url || item.media_url;
                return (
                  <div
                    key={item.id || idx}
                    className="rounded-2xl overflow-hidden border border-black/10 shadow-sm"
                    style={{ backgroundColor: template.tokens.surface }}
                  >
                    {imgUrl && (
                      <Image
                        src={imgUrl}
                        alt={item.title || "Portfolio item"}
                        width={400}
                        height={300}
                        unoptimized
                        className="h-40 w-full object-cover"
                      />
                    )}
                    {item.title && (
                      <div className="p-3">
                        <div className="text-xs font-bold truncate">
                          {item.title}
                        </div>
                        {item.category && (
                          <div className="text-[10px] opacity-60">
                            {item.category}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Brand Collaborations Section */}
        {collaborations.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-70">
              <Briefcase className="h-3.5 w-3.5" /> Brand Collaborations
            </div>
            <div className="space-y-2.5">
              {collaborations.map((c, idx) => {
                const collabTitle = c.campaign_title || c.role_title;
                const collabSummary = c.campaign_summary || c.summary;
                return (
                  <div
                    key={c.id || idx}
                    className="rounded-2xl p-4 border border-black/10 shadow-sm"
                    style={{ backgroundColor: template.tokens.surface }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-sm">
                        {c.brand_name}
                      </span>
                      {collabTitle && (
                        <span className="text-[11px] font-bold opacity-70">
                          {collabTitle}
                        </span>
                      )}
                    </div>
                    {collabSummary && (
                      <p className="text-xs opacity-75 mt-1">{collabSummary}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Micro-Blog Section */}
        {blogPosts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-70">
              <BookOpen className="h-3.5 w-3.5" /> Journal &amp; Notes
            </div>
            <div className="space-y-3">
              {blogPosts.map((post, idx) => {
                const readingMinutes = post.reading_time_minutes || post.reading_minutes || 3;
                return (
                  <Link
                    key={post.id || idx}
                    href={`/${cleanHandle}/blog/${post.slug}`}
                    className="block rounded-2xl p-4 border border-black/10 shadow-sm transition hover:-translate-y-0.5"
                    style={{ backgroundColor: template.tokens.surface }}
                  >
                    <div className="flex items-center justify-between text-[11px] opacity-60 mb-1">
                      <span>{readingMinutes} min read</span>
                      <span>Read article &rarr;</span>
                    </div>
                    <h3 className="font-display font-bold text-base">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="text-xs opacity-75 mt-1 line-clamp-2">
                        {post.excerpt}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Visitor Contact & Booking Inquiry Form */}
        {contactEnabled && workspaceId && (
          <PublicContactForm
            workspaceId={workspaceId}
            handle={cleanHandle}
            accentColor={template.tokens.accent}
            surfaceColor={template.tokens.surface}
            inkColor={template.tokens.ink}
          />
        )}

        {/* Footer Badge */}
        {showBranding && (
          <div className="pt-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold shadow-sm border border-black/10 opacity-80 hover:opacity-100 transition-opacity"
              style={{
                backgroundColor: template.tokens.surface,
                color: template.tokens.ink,
              }}
            >
              <span
                className="flex h-4 w-4 items-center justify-center rounded text-[10px] text-white font-extrabold"
                style={{ backgroundColor: template.tokens.accent }}
              >
                B
              </span>
              Built with Biolio
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
