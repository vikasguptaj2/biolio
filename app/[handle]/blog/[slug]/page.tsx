import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BIOLIO_TEMPLATES } from "@/lib/design-tokens";
import { sanitizeHtml } from "@/lib/server/sanitize/html";

interface PageProps {
  params: Promise<{ handle: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { handle, slug } = await params;
    const cleanHandle = handle.toLowerCase();

    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("bio_profiles")
      .select("id, workspace_id, handle, display_name, is_published, current_published_version_id, moderation_state")
      .eq("handle", cleanHandle)
      .maybeSingle();

    if (!profile || !profile.is_published || profile.moderation_state === "banned") {
      return { title: "Article Not Found | Biolio" };
    }

    const { data: post } = await supabase
      .from("bio_blog_posts")
      .select("title, excerpt, seo_title, seo_description")
      .eq("bio_profile_id", profile.id)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (!post) return { title: "Article Not Found | Biolio" };

    return {
      title: `${post.seo_title || post.title} — ${profile.display_name}`,
      description: post.seo_description || post.excerpt || `An essay by ${profile.display_name}`,
    };
  } catch {
    return { title: "Article | Biolio" };
  }
}

export default function BlogPostPage({ params }: PageProps) {
  return (
    <Suspense fallback={<BlogPostSkeleton />}>
      <BlogPostContent params={params} />
    </Suspense>
  );
}

function BlogPostSkeleton() {
  return (
    <div className="min-h-screen py-12 px-6 lg:px-8 bg-[#fffdf8] animate-pulse">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="h-4 w-28 bg-[#e5dcd1] rounded-md" />
        <div className="h-10 w-3/4 bg-[#e5dcd1] rounded-md" />
        <div className="h-4 w-1/2 bg-[#e5dcd1] rounded-md" />
        <div className="space-y-3 pt-6">
          <div className="h-4 bg-[#e5dcd1] rounded-md" />
          <div className="h-4 bg-[#e5dcd1] rounded-md" />
          <div className="h-4 w-5/6 bg-[#e5dcd1] rounded-md" />
        </div>
      </div>
    </div>
  );
}

async function BlogPostContent({ params }: PageProps) {
  const { handle, slug } = await params;
  const cleanHandle = handle.toLowerCase();

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("bio_profiles")
    .select("id, workspace_id, handle, display_name, is_published, current_published_version_id, moderation_state")
    .eq("handle", cleanHandle)
    .maybeSingle();

  if (!profile || !profile.is_published || profile.moderation_state === "banned") {
    notFound();
  }

  const { data: post } = await supabase
    .from("bio_blog_posts")
    .select("id, bio_profile_id, workspace_id, title, slug, category, excerpt, sanitized_html, cover_media_id, reading_time_minutes, seo_title, seo_description, status, published_at")
    .eq("bio_profile_id", profile.id)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!post) notFound();

  // Resolve template from published snapshot or fallback
  let templateId = "atelier-editorial";
  if (profile.current_published_version_id) {
    const { data: snapshot } = await supabase
      .from("bio_published_versions")
      .select("snapshot_payload")
      .eq("id", profile.current_published_version_id)
      .maybeSingle();
    const payload = snapshot?.snapshot_payload as Record<string, unknown> | undefined;
    const profileObj = payload?.profile as Record<string, unknown> | undefined;
    templateId =
      (typeof payload?.template_id === "string"
        ? payload.template_id
        : typeof profileObj?.template_id === "string"
        ? profileObj.template_id
        : "atelier-editorial");
  }

  const themeConfig = BIOLIO_TEMPLATES[templateId] || BIOLIO_TEMPLATES["atelier-editorial"];
  const theme = themeConfig.theme;

  return (
    <div
      className="min-h-screen py-12 px-6 lg:px-8 selection:bg-[#f36b3f] selection:text-white"
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
      }}
    >
      <article className="max-w-2xl mx-auto">
        {/* Navigation back to bio */}
        <div className="mb-8">
          <Link
            href={`/${cleanHandle}`}
            className="inline-flex items-center gap-2 text-xs font-bold transition-opacity hover:opacity-75"
            style={{ color: theme.accent }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {profile.display_name}
          </Link>
        </div>

        {/* Article Header */}
        <header className="pb-8 border-b mb-8" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-4 text-xs font-semibold mb-4" style={{ color: theme.mutedText }}>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {post.published_at ? new Date(post.published_at).toLocaleDateString() : "Recent"}
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {post.reading_time_minutes} min read
            </span>
            <span>&bull;</span>
            <span className="uppercase tracking-wider font-bold">
              {post.category || "Editorial"}
            </span>
          </div>

          <h1
            className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight mb-4"
            style={{ fontFamily: theme.fontHeading }}
          >
            {post.title}
          </h1>

          {post.excerpt && (
            <p
              className="text-base sm:text-lg leading-relaxed font-medium italic"
              style={{ color: theme.mutedText }}
            >
              {post.excerpt}
            </p>
          )}

          {/* Author Tag */}
          <div className="mt-6 flex items-center gap-3">
            <div
              className="h-10 w-10 flex items-center justify-center font-bold text-sm shadow-xs"
              style={{
                borderRadius: theme.avatarRadius,
                backgroundColor: theme.cardBg,
                color: theme.text,
                border: `1px solid ${theme.border}`,
              }}
            >
              {profile.display_name?.charAt(0) || "B"}
            </div>
            <div>
              <div className="text-xs font-bold">{profile.display_name}</div>
              <div className="text-[10px]" style={{ color: theme.mutedText }}>
                biolio.site/{cleanHandle}
              </div>
            </div>
          </div>
        </header>

        {/* Article Body Content */}
        <div
          className="prose prose-sm sm:prose-base max-w-none leading-relaxed space-y-6"
          style={{ fontFamily: theme.fontBody }}
        >
          {post.sanitized_html ? (
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.sanitized_html) }} />
          ) : post.excerpt ? (
            <p className="text-sm sm:text-base leading-relaxed">{post.excerpt}</p>
          ) : (
            <p className="text-sm sm:text-base leading-relaxed italic" style={{ color: theme.mutedText }}>
              No content available.
            </p>
          )}
        </div>

        {/* Article Footer & Return Link */}
        <footer className="mt-16 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: theme.border }}>
          <Link
            href={`/${cleanHandle}`}
            className="inline-flex items-center gap-2 text-xs font-bold"
            style={{ color: theme.accent }}
          >
            <ArrowLeft className="h-4 w-4" />
            More links and projects from {profile.display_name}
          </Link>

          <Link
            href="/"
            className="text-[10px] uppercase font-bold tracking-wider"
            style={{ color: theme.mutedText }}
          >
            Biolio Editorial Magazine
          </Link>
        </footer>
      </article>
    </div>
  );
}
