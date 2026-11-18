import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUpRight,
  BookOpen,
  BriefcaseBusiness,
  MapPin,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BIO_TEMPLATES } from "@/lib/design-tokens";
import { PublicContactForm } from "@/components/bio/public-contact-form";
import { PublicVideo } from "@/components/bio/public-video";
import { normalizePublicHttpsUrl, parsePublicVideoLink } from "@/lib/video-links";
import { recordAnalyticsEvent } from "@/lib/server/analytics/record";

type SectionKey =
  | "links"
  | "featured_work"
  | "gallery"
  | "collaborations"
  | "blog"
  | "about"
  | "contact";

const DEFAULT_SECTION_ORDER: SectionKey[] = [
  "links",
  "featured_work",
  "gallery",
  "collaborations",
  "blog",
  "about",
  "contact",
];

interface PublicPageProps {
  params: Promise<{ handle: string }>;
}

interface SnapshotProfile {
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
  theme_config?: Record<string, unknown>;
  section_order?: string[];
  sections_visibility?: Record<string, unknown>;
  show_biolio_branding?: boolean;
  contact_form_enabled?: boolean;
}

interface SnapshotGalleryItem {
  id?: string;
  media_url?: string;
  external_url?: string;
  media_type?: string;
  title?: string;
  caption?: string;
  category?: string;
  position?: number;
  is_featured?: boolean;
}

interface SnapshotBioPayload {
  workspace_id?: string;
  handle?: string;
  display_name?: string;
  tagline?: string;
  bio_text?: string;
  bio?: string;
  location?: string;
  template_id?: string;
  profile?: SnapshotProfile;
  links?: Array<{
    id?: string;
    opaque_token?: string;
    title: string;
    subtitle?: string;
    url: string;
    icon?: string;
    platform?: string;
    badge_text?: string;
    position?: number;
  }>;
  gallery?: SnapshotGalleryItem[];
  collaborations?: Array<{
    id?: string;
    brand_name: string;
    role_title?: string;
    campaign_title?: string;
    summary?: string;
    campaign_summary?: string;
    category?: string;
    collab_year?: string;
    case_study_url?: string;
    position?: number;
  }>;
  blog_posts?: Array<{
    id?: string;
    title: string;
    slug: string;
    category?: string;
    reading_time_minutes?: number;
    reading_minutes?: number;
    excerpt?: string;
    published_at?: string;
  }>;
}

export async function generateMetadata({ params }: PublicPageProps): Promise<Metadata> {
  const { handle } = await params;
  const cleanHandle = handle.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{1,29}$/.test(cleanHandle)) {
    return { title: "Creator website | Biolio", robots: { index: false, follow: false } };
  }

  const supabase = await createClient();
  const [{ data: profile }, { data: publishedSnapshot }] = await Promise.all([
    supabase
      .from("bio_profiles")
      .select("display_name, allow_indexing, seo_title, seo_description, is_published, moderation_state")
      .eq("handle", cleanHandle)
      .maybeSingle(),
    supabase
      .from("bio_published_versions")
      .select("snapshot_payload")
      .eq("handle_at_publish", cleanHandle)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!profile || !profile.is_published || profile.moderation_state !== "normal" || !publishedSnapshot) {
    return { title: "Creator website | Biolio", robots: { index: false, follow: false } };
  }

  const payload = publishedSnapshot.snapshot_payload as SnapshotBioPayload;
  const creator = payload.profile || {};
  const displayName = creator.display_name || payload.display_name || profile.display_name || cleanHandle;
  const title = profile.seo_title || `${displayName} — Creator website`;
  const description = profile.seo_description || creator.short_bio || payload.bio_text || `Explore the work, stories and links from ${displayName}.`;
  const themeConfig = creator.theme_config || {};
  const gallery = Array.isArray(payload.gallery) ? payload.gallery : [];
  const visibility = creator.sections_visibility || {};
  const featuredPreview = visibility.featured_work !== false
    ? gallery.find((item) => item.is_featured && item.media_type !== "video_embed")
    : undefined;
  const galleryPreview = visibility.gallery !== false
    ? gallery.find((item) => item.media_type !== "video_embed")
    : undefined;
  const previewImage = (featuredPreview || galleryPreview)?.external_url;
  const imageUrl =
    normalizePublicHttpsUrl(themeConfig.cover_url) ||
    normalizePublicHttpsUrl(themeConfig.avatar_url) ||
    normalizePublicHttpsUrl(previewImage);
  const canIndex = Boolean(profile.allow_indexing);

  return {
    title,
    description,
    robots: { index: canIndex, follow: canIndex },
    openGraph: {
      type: "website",
      title,
      description,
      ...(imageUrl ? { images: [{ url: imageUrl }] } : {}),
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}

function publicLinkHref(value: string): string | null {
  const trimmed = value.trim();
  if (/^mailto:[^\s]+$/i.test(trimmed) || /^tel:\+?[\d().\s-]+$/i.test(trimmed)) {
    return trimmed;
  }
  return normalizePublicHttpsUrl(trimmed);
}

function safeSectionOrder(value: unknown): SectionKey[] {
  if (!Array.isArray(value)) return DEFAULT_SECTION_ORDER;
  const allowed = new Set<string>(DEFAULT_SECTION_ORDER);
  const selected = value.filter(
    (item): item is SectionKey => typeof item === "string" && allowed.has(item),
  );
  return [...new Set([...selected, ...DEFAULT_SECTION_ORDER])];
}

function CreatorBioSkeleton() {
  return (
    <main className="min-h-screen animate-pulse bg-[#fffdf8] px-5 py-12 text-[#211b29]">
      <div className="mx-auto max-w-6xl space-y-16">
        <div className="h-8 w-36 bg-[#eee6dc]" />
        <div className="grid gap-10 md:grid-cols-2">
          <div className="space-y-5">
            <div className="h-20 w-3/4 bg-[#eee6dc]" />
            <div className="h-5 w-2/3 bg-[#eee6dc]" />
            <div className="h-24 w-full bg-[#eee6dc]" />
          </div>
          <div className="aspect-[4/3] bg-[#eee6dc]" />
        </div>
        <div className="h-72 bg-[#eee6dc]" />
      </div>
    </main>
  );
}

export default function CreatorPublicBioPage({
  params,
}: PublicPageProps) {
  return (
    <Suspense fallback={<CreatorBioSkeleton />}>
      <CreatorBioContent params={params} />
    </Suspense>
  );
}

async function CreatorBioContent({
  params,
}: PublicPageProps) {
  const { handle } = await params;
  const cleanHandle = handle.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{1,29}$/.test(cleanHandle)) notFound();

  const supabase = await createClient();
  const [{ data: profile }, { data: publishedSnapshot }] = await Promise.all([
    supabase
      .from("bio_profiles")
      .select("id, workspace_id, handle, display_name, is_published, current_published_version_id, moderation_state")
      .eq("handle", cleanHandle)
      .maybeSingle(),
    supabase
      .from("bio_published_versions")
      .select("snapshot_payload")
      .eq("handle_at_publish", cleanHandle)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Supabase RLS only exposes a published, non-moderated profile and its active snapshot.
  // Never use draft profile content as a public fallback.
  if (
    !profile ||
    !profile.is_published ||
    profile.moderation_state !== "normal" ||
    !publishedSnapshot
  ) {
    notFound();
  }

  const snapshot = publishedSnapshot.snapshot_payload as SnapshotBioPayload;
  const snapshotProfile = snapshot.profile || {};
  const workspaceId = profile.workspace_id || snapshot.workspace_id || snapshotProfile.workspace_id;
  const displayName = snapshotProfile.display_name || snapshot.display_name || profile.display_name || cleanHandle;
  const tagline = snapshotProfile.tagline || snapshot.tagline || "";
  const shortBio = snapshotProfile.short_bio || snapshot.bio_text || snapshot.bio || "";
  const aboutStory = snapshotProfile.about_story || snapshotProfile.bio || shortBio;
  const category = snapshotProfile.category || "Creator";
  const location = snapshotProfile.location || snapshot.location || "";
  const templateId = snapshotProfile.template_id || snapshot.template_id || "atelier-editorial";
  const themeConfig = snapshotProfile.theme_config || {};
  const showBranding =
    typeof themeConfig.show_biolio_branding === "boolean"
      ? themeConfig.show_biolio_branding
      : snapshotProfile.show_biolio_branding ?? true;
  const contactEnabled = snapshotProfile.contact_form_enabled ?? true;
  const sectionVisibility = snapshotProfile.sections_visibility || {};
  const sectionOrder = safeSectionOrder(snapshotProfile.section_order);
  const enabled = (section: SectionKey) => sectionVisibility[section] !== false;
  const template = BIO_TEMPLATES.find((item) => item.id === templateId) || BIO_TEMPLATES[0];
  const avatarUrl = normalizePublicHttpsUrl(typeof themeConfig.avatar_url === "string" ? themeConfig.avatar_url : "");
  const coverUrl = normalizePublicHttpsUrl(typeof themeConfig.cover_url === "string" ? themeConfig.cover_url : "");

  const links = (Array.isArray(snapshot.links) ? snapshot.links : [])
    .map((link) => ({
      ...link,
      href: link.opaque_token
        ? `/r/${encodeURIComponent(link.opaque_token)}`
        : publicLinkHref(link.url),
    }))
    .filter((link) => Boolean(link.href));

  const galleryItems = (Array.isArray(snapshot.gallery) ? snapshot.gallery : [])
    .map((item, index) => {
      const isVideo = item.media_type === "video_embed";
      const source = isVideo
        ? parsePublicVideoLink(item.external_url || item.media_url || "")?.canonicalUrl || null
        : normalizePublicHttpsUrl(item.external_url || item.media_url || "");
      return {
        ...item,
        id: item.id || `${item.position ?? index}`,
        source,
        isVideo,
      };
    })
    .filter((item) => Boolean(item.source));

  const featuredItem = enabled("featured_work")
    ? galleryItems.find((item) => item.is_featured) || null
    : null;
  const remainingGallery = enabled("gallery")
    ? featuredItem
      ? galleryItems.filter((item) => item.id !== featuredItem.id)
      : galleryItems
    : [];
  const collaborations = Array.isArray(snapshot.collaborations) ? snapshot.collaborations : [];
  const blogPosts = Array.isArray(snapshot.blog_posts) ? snapshot.blog_posts : [];
  const contactIsVisible = enabled("contact") && contactEnabled && Boolean(workspaceId);

  if (workspaceId) {
    const requestHeaders = await headers();
    recordAnalyticsEvent({
      workspaceId,
      bioProfileId: profile.id,
      eventType: "bio.page_view",
      headers: requestHeaders,
    }).catch(() => {});
  }

  const sectionItems: Partial<Record<SectionKey, { id: string; label: string }>> = {
    links: enabled("links") && links.length ? { id: "links", label: "Links" } : undefined,
    featured_work: featuredItem ? { id: "featured-work", label: "Featured work" } : undefined,
    gallery: remainingGallery.length ? { id: "portfolio", label: "Portfolio" } : undefined,
    collaborations: enabled("collaborations") && collaborations.length ? { id: "collaborations", label: "Collaborations" } : undefined,
    blog: enabled("blog") && blogPosts.length ? { id: "journal", label: "Journal" } : undefined,
    about: enabled("about") && aboutStory ? { id: "about", label: "About" } : undefined,
    contact: contactIsVisible ? { id: "contact", label: "Contact" } : undefined,
  };

  const renderSection = (key: SectionKey): ReactNode => {
    if (!enabled(key)) return null;

    if (key === "links" && links.length > 0) {
      return (
        <section id="links" key={key} className="scroll-mt-8 py-12 sm:py-16" aria-labelledby="links-heading">
          <div className="mb-7 flex items-end justify-between gap-6">
            <div>
              <h2 id="links-heading" className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Find me around the web</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 opacity-75">The places I share work, ideas and updates.</p>
            </div>
          </div>
          <ul className="border-y border-current/15">
            {links.map((link, index) => (
              <li key={link.id || `${link.title}-${index}`} className="border-b border-current/10 last:border-b-0">
                <a
                  href={link.href || undefined}
                  target={link.href?.startsWith("/") ? undefined : "_blank"}
                  rel={link.href?.startsWith("/") ? undefined : "noopener noreferrer"}
                  className="group flex min-h-16 items-center justify-between gap-6 py-4 focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ color: template.tokens.ink }}
                >
                  <span>
                    <span className="block text-base font-bold">{link.title}</span>
                    {link.subtitle && <span className="mt-1 block text-sm opacity-70">{link.subtitle}</span>}
                  </span>
                  <span className="flex items-center gap-3 text-xs font-semibold opacity-70">
                    {link.platform || "Visit"}
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      );
    }

    if (key === "featured_work" && featuredItem) {
      return (
        <section id="featured-work" key={key} className="scroll-mt-8 py-12 sm:py-16" aria-labelledby="featured-heading">
          <div className="mb-7 flex items-end justify-between gap-6">
            <div>
              <h2 id="featured-heading" className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">One piece I keep coming back to</h2>
              {featuredItem.category && <p className="mt-2 text-sm opacity-70">{featuredItem.category}</p>}
            </div>
            {remainingGallery.length > 0 && <a href="#portfolio" className="hidden items-center gap-2 text-sm font-bold sm:inline-flex">More work <ArrowDown className="h-4 w-4" aria-hidden="true" /></a>}
          </div>
          <article className="grid overflow-hidden md:grid-cols-[1.4fr_0.8fr]" style={{ backgroundColor: template.tokens.surface, borderRadius: template.theme.cardRadius }}>
            <div className="min-h-64 overflow-hidden">
              {featuredItem.isVideo ? (
                <PublicVideo url={featuredItem.source || ""} title={featuredItem.title || "Featured video"} inkColor={template.tokens.ink} surfaceColor={template.tokens.surface} accentColor={template.tokens.accent} />
              ) : (
                <Image src={featuredItem.source || ""} alt={featuredItem.title || "Featured portfolio work"} width={1200} height={840} unoptimized className="h-full min-h-64 w-full object-cover" />
              )}
            </div>
            <div className="flex flex-col justify-center p-6 sm:p-9">
              <h3 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{featuredItem.title || "Selected work"}</h3>
              {featuredItem.caption && <p className="mt-4 text-sm leading-7 opacity-75">{featuredItem.caption}</p>}
              {featuredItem.category && <p className="mt-6 text-sm font-semibold" style={{ color: template.tokens.accent }}>{featuredItem.category}</p>}
            </div>
          </article>
        </section>
      );
    }

    if (key === "gallery" && remainingGallery.length > 0) {
      return (
        <section id="portfolio" key={key} className="scroll-mt-8 py-12 sm:py-16" aria-labelledby="portfolio-heading">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <h2 id="portfolio-heading" className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Selected work</h2>
              <p className="mt-2 text-sm leading-6 opacity-75">A few projects, images and films from my recent work.</p>
            </div>
            <span className="hidden text-sm opacity-65 sm:block">{remainingGallery.length} {remainingGallery.length === 1 ? "piece" : "pieces"}</span>
          </div>
          <div className="grid grid-cols-1 gap-x-5 gap-y-9 md:grid-cols-12">
            {remainingGallery.map((item, index) => {
              const spanClass = index % 3 === 1 ? "md:col-span-5" : index % 3 === 2 ? "md:col-span-7" : "md:col-span-6";
              return (
                <article key={item.id} className={`${spanClass} min-w-0`}>
                  <div className="overflow-hidden" style={{ backgroundColor: template.tokens.surface, borderRadius: template.theme.cardRadius }}>
                    {item.isVideo ? (
                      <PublicVideo url={item.source || ""} title={item.title || "Portfolio video"} inkColor={template.tokens.ink} surfaceColor={template.tokens.surface} accentColor={template.tokens.accent} />
                    ) : (
                      <Image src={item.source || ""} alt={item.title || "Portfolio work"} width={900} height={650} unoptimized className="aspect-[4/3] w-full object-cover" />
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-5 pt-4">
                    <div>
                      <h3 className="text-lg font-bold">{item.title || "Untitled work"}</h3>
                      {item.caption && <p className="mt-2 max-w-2xl text-sm leading-6 opacity-75">{item.caption}</p>}
                    </div>
                    {item.category && <span className="shrink-0 pt-1 text-sm opacity-65">{item.category}</span>}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      );
    }

    if (key === "collaborations" && collaborations.length > 0) {
      return (
        <section id="collaborations" key={key} className="scroll-mt-8 py-12 sm:py-16" aria-labelledby="collaborations-heading">
          <div className="mb-8 flex items-center gap-3">
            <BriefcaseBusiness className="h-5 w-5" style={{ color: template.tokens.accent }} aria-hidden="true" />
            <h2 id="collaborations-heading" className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Good work, good people</h2>
          </div>
          <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {collaborations.map((collaboration, index) => (
              <article key={collaboration.id || `${collaboration.brand_name}-${index}`} className="border-t border-current/15 pt-5">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-xl font-extrabold">{collaboration.brand_name}</h3>
                  {collaboration.collab_year && <span className="text-sm opacity-65">{collaboration.collab_year}</span>}
                </div>
                {(collaboration.campaign_title || collaboration.role_title) && <p className="mt-2 text-sm font-semibold" style={{ color: template.tokens.accent }}>{collaboration.campaign_title || collaboration.role_title}</p>}
                {(collaboration.campaign_summary || collaboration.summary) && <p className="mt-3 text-sm leading-6 opacity-75">{collaboration.campaign_summary || collaboration.summary}</p>}
                {collaboration.case_study_url && publicLinkHref(collaboration.case_study_url) && (
                  <a href={publicLinkHref(collaboration.case_study_url) || undefined} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4">View the project <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a>
                )}
              </article>
            ))}
          </div>
        </section>
      );
    }

    if (key === "blog" && blogPosts.length > 0) {
      return (
        <section id="journal" key={key} className="scroll-mt-8 py-12 sm:py-16" aria-labelledby="journal-heading">
          <div className="mb-7 flex items-center gap-3">
            <BookOpen className="h-5 w-5" style={{ color: template.tokens.accent }} aria-hidden="true" />
            <h2 id="journal-heading" className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Notes from the studio</h2>
          </div>
          <div className="border-y border-current/15">
            {blogPosts.map((post, index) => (
              <article key={post.id || post.slug} className="border-b border-current/10 last:border-b-0">
                <Link href={`/${cleanHandle}/blog/${encodeURIComponent(post.slug)}`} className="group grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    {post.category && <p className="mb-2 text-sm font-semibold" style={{ color: template.tokens.accent }}>{post.category}</p>}
                    <h3 className="font-display text-xl font-bold tracking-tight transition-colors group-hover:opacity-70 sm:text-2xl">{post.title}</h3>
                    {post.excerpt && <p className="mt-2 max-w-3xl text-sm leading-6 opacity-75">{post.excerpt}</p>}
                  </div>
                  <span className="flex items-center gap-3 text-sm opacity-65">
                    {post.reading_time_minutes || post.reading_minutes || 3} min read
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </Link>
              </article>
            ))}
          </div>
        </section>
      );
    }

    if (key === "about" && aboutStory) {
      return (
        <section id="about" key={key} className="scroll-mt-8 py-12 sm:py-16" aria-labelledby="about-heading">
          <div className="grid gap-6 md:grid-cols-[0.65fr_1.35fr] md:gap-12">
            <h2 id="about-heading" className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">A little about me</h2>
            <p className="max-w-3xl whitespace-pre-line text-lg leading-8 opacity-80">{aboutStory}</p>
          </div>
        </section>
      );
    }

    if (key === "contact" && contactIsVisible && workspaceId) {
      return (
        <section id="contact" key={key} className="scroll-mt-8 py-12 sm:py-16" aria-labelledby="contact-heading">
          <div className="grid gap-8 md:grid-cols-[0.7fr_1.3fr] md:gap-14">
            <div>
              <h2 id="contact-heading" className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Have a good project in mind?</h2>
              <p className="mt-3 max-w-md text-sm leading-6 opacity-75">Send a note directly to {displayName}. You can reach out without creating an account.</p>
            </div>
            <PublicContactForm
              workspaceId={workspaceId}
              handle={cleanHandle}
              accentColor={template.tokens.accent}
              surfaceColor={template.tokens.surface}
              inkColor={template.tokens.ink}
            />
          </div>
        </section>
      );
    }

    return null;
  };

  const orderedSections = [...sectionOrder, ...DEFAULT_SECTION_ORDER].filter(
    (key, index, all) => all.indexOf(key) === index,
  );
  const heroMedia = featuredItem || remainingGallery[0] || null;
  const hasVisibleWork = Boolean(featuredItem || remainingGallery.length);
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const navigation = orderedSections
    .filter((key) => key !== "contact" || contactIsVisible)
    .map((key) => ({ key, ...sectionItems[key] }))
    .filter((item): item is { key: SectionKey; id: string; label: string } => Boolean(item.id && item.label));

  return (
    <div
      className="min-h-screen scroll-smooth"
      style={{ backgroundColor: template.tokens.bg, color: template.tokens.ink, fontFamily: template.tokens.fontBody }}
    >
      <header className="border-b border-current/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-5 py-5 md:px-8">
          <Link href={`/${cleanHandle}`} className="min-w-0" aria-label={`${displayName} home`}>
            <span className="block truncate font-display text-base font-extrabold tracking-tight">{displayName}</span>
            <span className="mt-0.5 block truncate text-xs opacity-65">@{cleanHandle}</span>
          </Link>
          <nav aria-label="Creator website sections" className="flex max-w-[60vw] items-center gap-5 overflow-x-auto text-sm font-semibold sm:max-w-none sm:gap-7">
            {navigation.map((item) => (
              <a key={item.key} href={`#${item.id}`} className="whitespace-nowrap opacity-75 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-4">
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 md:px-8">
        <section className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16" aria-labelledby="creator-name">
          <div className="max-w-2xl">
            {avatarUrl && (
              <Image
                src={avatarUrl}
                alt={`${displayName} profile`}
                width={88}
                height={88}
                priority
                unoptimized
                className="mb-6 h-20 w-20 rounded-full object-cover ring-4 ring-current/10 sm:h-24 sm:w-24"
              />
            )}
            <p className="mb-5 flex flex-wrap items-center gap-2 text-sm font-semibold opacity-75">
              <span>{category}</span>
              {location && <><span aria-hidden="true">·</span><span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden="true" />{location}</span></>}
            </p>
            <h1 id="creator-name" className="font-display text-5xl font-extrabold leading-[0.98] tracking-[-0.055em] sm:text-7xl lg:text-8xl">{displayName}</h1>
            {tagline && <p className="mt-6 max-w-xl text-xl font-semibold leading-8 sm:text-2xl">{tagline}</p>}
            {shortBio && <p className="mt-5 max-w-xl text-base leading-7 opacity-75">{shortBio}</p>}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {hasVisibleWork && <a href={featuredItem ? "#featured-work" : "#portfolio"} className="inline-flex min-h-12 items-center justify-center gap-2 px-5 text-sm font-bold text-white transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-4" style={{ backgroundColor: template.tokens.accent }}>Explore my work <ArrowDown className="h-4 w-4" aria-hidden="true" /></a>}
              {contactIsVisible && <a href="#contact" className="inline-flex min-h-12 items-center justify-center gap-2 border border-current/20 px-5 text-sm font-bold transition-colors hover:bg-current/5 focus-visible:outline-2 focus-visible:outline-offset-4">Let&apos;s work together <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a>}
            </div>
          </div>
          <div className="relative min-w-0 overflow-hidden" style={{ backgroundColor: template.tokens.surface, borderRadius: template.theme.cardRadius }}>
            {coverUrl ? (
              <Image src={coverUrl} alt={`${displayName} creator website cover`} width={1100} height={850} priority unoptimized className="aspect-[4/3] w-full object-cover" />
            ) : heroMedia && !heroMedia.isVideo ? (
              <Image src={heroMedia.source || ""} alt={heroMedia.title || `${displayName}'s portfolio`} width={1100} height={850} priority unoptimized className="aspect-[4/3] w-full object-cover" />
            ) : heroMedia?.isVideo ? (
              <PublicVideo url={heroMedia.source || ""} title={heroMedia.title || `${displayName} video`} inkColor={template.tokens.ink} surfaceColor={template.tokens.surface} accentColor={template.tokens.accent} />
            ) : (
              <div className="flex aspect-[4/3] flex-col items-start justify-end p-7 sm:p-10" aria-label={`${displayName} creator profile`}>
                <span className="font-display text-[7rem] font-extrabold leading-[0.8] tracking-[-0.08em] sm:text-[10rem]" style={{ color: template.tokens.accent }}>{initials || "B"}</span>
                <span className="mt-7 text-sm font-semibold opacity-70">{tagline || `${category} · ${cleanHandle}`}</span>
              </div>
            )}
          </div>
        </section>

        <div className="divide-y divide-current/10">
          {orderedSections.map((key) => renderSection(key))}
        </div>
      </main>

      <footer className="mt-8 border-t border-current/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm sm:flex-row sm:items-center sm:justify-between md:px-8">
          <p className="font-bold">{displayName}</p>
          <div className="flex items-center gap-4 opacity-70">
            <span>@{cleanHandle}</span>
            {showBranding && <Link href="/" className="font-semibold underline underline-offset-4">Built with Biolio</Link>}
          </div>
        </div>
      </footer>
    </div>
  );
}
