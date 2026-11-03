import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BIOLIO_TEMPLATES } from "@/lib/design-tokens";

interface PageProps {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const cleanHandle = handle.toLowerCase();

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("bio_profiles")
    .select("display_name, handle")
    .eq("handle", cleanHandle)
    .maybeSingle();

  if (!profile) {
    return {
      title: "Creator Not Found | Biolio",
    };
  }

  return {
    title: `${profile.display_name} — Biolio`,
    description: `Explore ${profile.display_name}'s official bio website.`,
    openGraph: {
      title: `${profile.display_name} | Biolio Atelier`,
      description: `Official bio website.`,
      url: `https://biolio.site/${cleanHandle}`,
    },
  };
}

export default async function PublicBioPage({ params }: PageProps) {
  const { handle } = await params;
  const cleanHandle = handle.toLowerCase();

  const supabase = await createClient();

  // Fetch bio profile respecting column-level security for anon
  const { data: profile } = await supabase
    .from("bio_profiles")
    .select("id, workspace_id, handle, display_name, is_published, current_published_version_id, moderation_state")
    .eq("handle", cleanHandle)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  // If a published version snapshot exists, pull snapshot payload
  let snapshotPayload: Record<string, unknown> | null = null;
  if (profile.current_published_version_id) {
    const { data: version } = await supabase
      .from("bio_published_versions")
      .select("snapshot_payload")
      .eq("id", profile.current_published_version_id)
      .maybeSingle();
    snapshotPayload = (version?.snapshot_payload as Record<string, unknown>) || null;
  }

  // Fetch active links
  const { data: links } = await supabase
    .from("bio_links")
    .select("*")
    .eq("bio_profile_id", profile.id)
    .eq("is_visible", true)
    .order("position", { ascending: true });

  // Fetch active gallery items
  const { data: galleryItems } = await supabase
    .from("bio_gallery_items")
    .select("*, media_assets(*)")
    .eq("bio_profile_id", profile.id)
    .eq("status", "published")
    .order("position", { ascending: true });

  // Fetch published blog posts
  const { data: blogPosts } = await supabase
    .from("bio_blog_posts")
    .select("*")
    .eq("bio_profile_id", profile.id)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(3);

  // Template theme tokens from snapshot or defaults
  const headline = (snapshotPayload?.headline as string) || (snapshotPayload?.tagline as string) || "Creator & Curator";
  const bio = (snapshotPayload?.bio as string) || (snapshotPayload?.short_bio as string) || "Sharing visual stories and curated projects.";
  const templateId = (snapshotPayload?.theme_template_id as string) || (snapshotPayload?.template_id as string) || "atelier-editorial";
  const themeConfig = BIOLIO_TEMPLATES[templateId] || BIOLIO_TEMPLATES["atelier-editorial"];
  const theme = themeConfig.theme;

  return (
    <div
      className="min-h-screen py-12 px-4 sm:px-6 flex flex-col items-center justify-between selection:bg-[#f36b3f] selection:text-white"
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
      }}
    >
      <main className="w-full max-w-md mx-auto flex flex-col items-center space-y-6">
        {/* Profile Card Header */}
        <div className="w-full text-center pb-6 border-b" style={{ borderColor: theme.border }}>
          {/* Avatar */}
          <div
            className="mx-auto h-24 w-24 flex items-center justify-center text-3xl font-bold shadow-md mb-4"
            style={{
              borderRadius: theme.avatarRadius,
              backgroundColor: theme.cardBg,
              color: theme.text,
              border: `2px solid ${theme.border}`,
              fontFamily: theme.fontHeading,
            }}
          >
            {profile.display_name?.charAt(0) || "B"}
          </div>

          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight"
            style={{ fontFamily: theme.fontHeading }}
          >
            {profile.display_name}
          </h1>

          {headline && (
            <p
              className="text-xs font-semibold mt-1 tracking-wide"
              style={{
                color: theme.mutedText,
                fontFamily: theme.fontBody,
              }}
            >
              {headline}
            </p>
          )}

          {bio && (
            <p
              className="text-xs mt-3 px-4 leading-relaxed font-normal"
              style={{
                color: theme.mutedText,
                fontFamily: theme.fontBody,
              }}
            >
              {bio}
            </p>
          )}
        </div>

        {/* Links Stack */}
        <div className="w-full space-y-3">
          {links && links.length > 0 ? (
            links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-between p-4 transition-all duration-200 hover:scale-[1.01] hover:shadow-md"
                style={{
                  backgroundColor: link.is_featured ? theme.buttonBg : theme.cardBg,
                  color: link.is_featured ? theme.buttonText : theme.text,
                  borderRadius: theme.cardRadius,
                  border: `1px solid ${theme.border}`,
                  fontFamily: theme.fontBody,
                }}
              >
                <span className="text-xs font-bold truncate pr-3">
                  {link.title}
                </span>
                <ExternalLink className="h-4 w-4 shrink-0 opacity-70" />
              </a>
            ))
          ) : (
            <div
              className="p-4 text-center text-xs rounded-xl"
              style={{
                backgroundColor: theme.cardBg,
                color: theme.mutedText,
                border: `1px solid ${theme.border}`,
              }}
            >
              No public links configured yet.
            </div>
          )}
        </div>

        {/* Lookbook / Gallery Showcase (if present) */}
        {galleryItems && galleryItems.length > 0 && (
          <div className="w-full pt-4">
            <h2
              className="text-sm font-bold uppercase tracking-wider mb-3 text-center"
              style={{
                color: theme.mutedText,
                fontFamily: theme.fontHeading,
              }}
            >
              Visual Lookbook
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {galleryItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg p-3 text-center border text-xs"
                  style={{
                    backgroundColor: theme.cardBg,
                    borderColor: theme.border,
                  }}
                >
                  <div className="font-bold truncate">{item.title}</div>
                  {item.caption && (
                    <div className="text-[10px] mt-1 line-clamp-1" style={{ color: theme.mutedText }}>
                      {item.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Micro-Blog Articles (if present) */}
        {blogPosts && blogPosts.length > 0 && (
          <div className="w-full pt-4">
            <h2
              className="text-sm font-bold uppercase tracking-wider mb-3 text-center"
              style={{
                color: theme.mutedText,
                fontFamily: theme.fontHeading,
              }}
            >
              Editorial Essays
            </h2>
            <div className="space-y-2">
              {blogPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/${cleanHandle}/blog/${post.slug}`}
                  className="block p-3.5 rounded-lg border transition-all hover:scale-[1.01]"
                  style={{
                    backgroundColor: theme.cardBg,
                    borderColor: theme.border,
                  }}
                >
                  <div className="text-xs font-bold" style={{ fontFamily: theme.fontHeading }}>
                    {post.title}
                  </div>
                  {post.excerpt && (
                    <div className="text-[11px] mt-1 line-clamp-2" style={{ color: theme.mutedText }}>
                      {post.excerpt}
                    </div>
                  )}
                  <div className="mt-2 text-[10px] font-bold flex items-center gap-1" style={{ color: theme.accent }}>
                    Read Essay ({post.reading_time_minutes} min read) &rarr;
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Biolio Footer Brandmark */}
      <footer className="mt-12 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-opacity hover:opacity-80"
          style={{
            backgroundColor: theme.cardBg,
            color: theme.mutedText,
            border: `1px solid ${theme.border}`,
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#f36b3f]" />
          Powered by Biolio.site
        </Link>
      </footer>
    </div>
  );
}
