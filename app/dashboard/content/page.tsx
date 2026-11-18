"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Eye,
  Trash2,
  ExternalLink,
  Edit3,
  Loader2,
  Save,
  Globe,
  Archive,
  ArrowLeft,
  Calendar,
} from "lucide-react";
import { TiptapEditor } from "@/components/blog/tiptap-editor";
import { uploadCloudinaryAsset } from "@/components/media/cloudinary-upload";

interface BlogPostItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt?: string;
  content_markdown?: string;
  content_json?: Record<string, unknown>;
  content_text?: string;
  reading_time_minutes?: number;
  status: "draft" | "published" | "archived";
  seo_title?: string;
  seo_description?: string;
  created_at: string;
  published_at?: string | null;
}

export default function ContentDashboardPage() {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imageUploadResolver = useRef<((url: string | null) => void) | null>(null);
  const [posts, setPosts] = useState<BlogPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [handle, setHandle] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Editor modal/view state
  const [isEditing, setIsEditing] = useState(false);
  const [editingPost, setEditingPost] = useState<Partial<BlogPostItem>>({
    title: "",
    slug: "",
    category: "EDITORIAL",
    excerpt: "",
    content_markdown: "",
    content_json: {},
    content_text: "",
    status: "draft",
    seo_title: "",
    seo_description: "",
  });

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }

  function requestBlogImageUpload(): Promise<string | null> {
    return new Promise((resolve) => {
      imageUploadResolver.current = resolve;
      if (!imageInputRef.current) {
        imageUploadResolver.current = null;
        resolve(null);
        return;
      }
      imageInputRef.current.click();
    });
  }

  async function handleBlogImageSelection(file?: File) {
    const resolve = imageUploadResolver.current;
    imageUploadResolver.current = null;
    if (!file) {
      resolve?.(null);
      return;
    }
    try {
      const asset = await uploadCloudinaryAsset(file, "blog_cover", "image");
      resolve?.(asset.secure_url);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Could not upload article image.");
      resolve?.(null);
    } finally {
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  async function loadBlogData() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/bio/studio");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to load stories.");
      }
      setPosts(data.blogPosts || []);
      setHandle(data.profile?.handle || data.workspace?.slug || "");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error loading blog stories.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBlogData();
  }, []);

  function handleOpenNew() {
    const freshSlug = `story-${posts.length + 1}-${Date.now().toString().slice(-4)}`;
    setEditingPost({
      title: "",
      slug: freshSlug,
      category: "EDITORIAL",
      excerpt: "",
      content_markdown: "",
      content_json: {},
      content_text: "",
      status: "draft",
      seo_title: "",
      seo_description: "",
    });
    setIsEditing(true);
  }

  function handleEditPost(post: BlogPostItem) {
    setEditingPost({ ...post });
    setIsEditing(true);
  }

  async function handleSaveStory(publishStatus?: "draft" | "published" | "archived") {
    if (!editingPost.title?.trim()) {
      alert("Story title is required.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const targetStatus = publishStatus || editingPost.status || "draft";
    const cleanSlug = (editingPost.slug || editingPost.title || "story")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const updatedPost: BlogPostItem = {
      id: editingPost.id || "",
      title: editingPost.title.trim(),
      slug: cleanSlug,
      category: (editingPost.category || "EDITORIAL").toUpperCase(),
      excerpt: editingPost.excerpt?.trim() || "",
      content_markdown: editingPost.content_markdown || "",
      content_json: editingPost.content_json || {},
      content_text: editingPost.content_text || "",
      status: targetStatus,
      seo_title: editingPost.seo_title || undefined,
      seo_description: editingPost.seo_description || undefined,
      created_at: editingPost.created_at || new Date().toISOString(),
      published_at: targetStatus === "published" ? editingPost.published_at || new Date().toISOString() : null,
    };

    let nextPosts: BlogPostItem[];
    if (editingPost.id) {
      nextPosts = posts.map((p) => (p.id === editingPost.id ? updatedPost : p));
    } else {
      nextPosts = [updatedPost, ...posts];
    }

    try {
      const res = await fetch("/api/bio/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blogPosts: nextPosts,
          publish: false, // Save draft without forcing full bio snapshot unless published
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to save story.");
      }

      showToast(
        targetStatus === "published"
          ? "Story published successfully!"
          : "Draft saved successfully."
      );
      setIsEditing(false);
      await loadBlogData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error saving story.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteStory(id: string) {
    if (!confirm("Are you sure you want to delete this story?")) return;
    setSaving(true);
    try {
      const nextPosts = posts.filter((p) => p.id !== id);
      const res = await fetch("/api/bio/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blogPosts: nextPosts,
          publish: false,
        }),
      });
      if (!res.ok) throw new Error("Failed to delete story.");
      showToast("Story deleted.");
      await loadBlogData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error deleting story");
    } finally {
      setSaving(false);
    }
  }

  // Filter and search
  const filteredPosts = posts.filter((p) => {
    if (activeTab !== "all" && p.status !== activeTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.excerpt && p.excerpt.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const publishedCount = posts.filter((p) => p.status === "published").length;
  const draftCount = posts.filter((p) => p.status === "draft").length;

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-[#211b29] px-4 py-3 text-xs font-bold text-white shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#6ac2a2]" />
          {toastMsg}
        </div>
      )}

      {/* Editor Modal / Screen */}
      {isEditing ? (
        <div className="space-y-6">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            onChange={(event) => void handleBlogImageSelection(event.currentTarget.files?.[0])}
          />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#eee6dc]">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7c727e] hover:text-[#211b29] cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Back to all stories
            </button>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSaveStory("draft")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5dcd1] bg-[#fffdf8] px-4 py-2 text-xs font-bold text-[#211b29] hover:border-[#211b29] cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" /> Save Draft
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSaveStory("published")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#f36b3f] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#ee7048] disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Globe className="h-3.5 w-3.5" />
                )}
                Publish Story
              </button>
            </div>
          </div>

          {/* Story Meta Fields */}
          <div className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-6 space-y-4 shadow-xs">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#7c727e] mb-1">
                Story Title *
              </label>
              <input
                type="text"
                required
                value={editingPost.title || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setEditingPost((prev) => ({
                    ...prev,
                    title: val,
                    slug: prev.slug || val.toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
                  }));
                }}
                placeholder="e.g. A Quiet Morning in the Studio"
                className="w-full font-editorial text-2xl font-bold text-[#211b29] border-b border-[#e5dcd1] pb-2 focus:outline-none focus:border-[#f36b3f] bg-transparent"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#7c727e] mb-1">
                  URL Slug (biolio.site/{handle}/blog/...)
                </label>
                <input
                  type="text"
                  value={editingPost.slug || ""}
                  onChange={(e) =>
                    setEditingPost((prev) => ({
                      ...prev,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                    }))
                  }
                  className="w-full rounded-lg border border-[#e5dcd1] bg-white px-3 py-2 text-xs font-mono text-[#211b29] focus:outline-none focus:border-[#f36b3f]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#7c727e] mb-1">
                  Category / Topic
                </label>
                <input
                  type="text"
                  value={editingPost.category || "EDITORIAL"}
                  onChange={(e) =>
                    setEditingPost((prev) => ({ ...prev, category: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[#e5dcd1] bg-white px-3 py-2 text-xs text-[#211b29] focus:outline-none focus:border-[#f36b3f]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#7c727e] mb-1">
                Short Excerpt (SEO Summary)
              </label>
              <textarea
                rows={2}
                maxLength={400}
                value={editingPost.excerpt || ""}
                onChange={(e) =>
                  setEditingPost((prev) => ({ ...prev, excerpt: e.target.value }))
                }
                placeholder="Brief 1-2 sentence preview for social cards and search engines..."
                className="w-full rounded-lg border border-[#e5dcd1] bg-white px-3 py-2 text-xs text-[#211b29] focus:outline-none focus:border-[#f36b3f]"
              />
            </div>
          </div>

          {/* Tiptap Rich-Text Editor */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#7c727e] mb-2">
              Article Canvas
            </div>
            <TiptapEditor
              initialContent={editingPost.content_json}
              placeholder="Tell your story. Format with headings, bullet points, images, and videos..."
              onImageUploadRequest={requestBlogImageUpload}
              onChange={(json, text) => {
                setEditingPost((prev) => ({
                  ...prev,
                  content_json: json,
                  content_text: text,
                  content_markdown: text, // sync plain text fallback
                }));
              }}
            />
          </div>
        </div>
      ) : (
        /* Stories List View */
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#e5dcd1] bg-[#fffdf8] px-3 py-1 text-xs font-bold text-[#c45a3a] mb-2 shadow-xs">
                <BookOpen className="h-3.5 w-3.5 text-[#f36b3f]" />
                EDITORIAL CMS &bull; TIPTAP RICH-TEXT ENGINE
              </div>
              <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#211b29]">
                Blog Stories &amp; Publishing
              </h1>
              <p className="text-xs text-[#7c727e] max-w-xl mt-1">
                Write long-form articles, essays, and notes hosted directly on your creator website.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenNew}
              className="inline-flex items-center gap-2 self-start rounded-lg bg-[#f36b3f] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#ee7048] transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Write New Story</span>
            </button>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-800">
              {errorMsg}
            </div>
          )}

          {/* Control Bar: Status Tabs & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-2 border-b border-[#eee6dc]">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: "all", label: `All (${posts.length})` },
                { id: "published", label: `Published (${publishedCount})` },
                { id: "draft", label: `Drafts (${draftCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                    activeTab === tab.id
                      ? "bg-[#211b29] text-white shadow-xs"
                      : "bg-[#fffdf8] border border-[#e5dcd1] text-[#7c727e] hover:text-[#211b29]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#a89bac]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stories by title or slug..."
                className="w-full rounded-lg border border-[#e5dcd1] bg-[#fffdf8] pl-9 pr-3.5 py-1.5 text-xs text-[#211b29] placeholder-[#a89bac] focus:outline-none focus:border-[#f36b3f]"
              />
            </div>
          </div>

          {/* Stories List */}
          {loading ? (
            <div className="min-h-[300px] flex items-center justify-center text-xs text-[#7c727e]">
              <span className="h-4 w-4 rounded-full border-2 border-[#f36b3f] border-t-transparent animate-spin mr-2" />
              Loading stories...
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#e5dcd1] bg-[#fffdf8] p-12 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-[#fce8df] text-[#f36b3f] flex items-center justify-center mx-auto">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="font-editorial text-lg font-bold text-[#211b29]">
                No stories published yet
              </h3>
              <p className="text-xs text-[#7c727e] max-w-sm mx-auto leading-relaxed">
                Your blog gives your digital presence depth beyond fleeting social media algorithms.
                Write essays, journals, or tutorials with Tiptap.
              </p>
              <button
                type="button"
                onClick={handleOpenNew}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#f36b3f] hover:underline pt-2 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Write your first story
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-[#211b29]/40 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-[#7c727e]">
                      <span className="font-extrabold uppercase tracking-wider text-[#c45a3a]">
                        {post.category || "EDITORIAL"}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-[9px] font-extrabold uppercase ${
                          post.status === "published"
                            ? "bg-[#e4f1eb] text-[#277a67]"
                            : "bg-[#f4efe7] text-[#7c727e]"
                        }`}
                      >
                        {post.status}
                      </span>
                    </div>

                    <h3 className="font-editorial text-xl font-bold text-[#211b29] line-clamp-2">
                      {post.title}
                    </h3>

                    {post.excerpt && (
                      <p className="text-xs text-[#5d5360] line-clamp-2 leading-relaxed">
                        {post.excerpt}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#eee6dc] flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 text-[#7c727e]">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{post.reading_time_minutes || 2} min read</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {post.status === "published" && handle && (
                        <Link
                          href={`/${handle}/blog/${post.slug}`}
                          target="_blank"
                          className="p-1.5 text-[#7c727e] hover:text-[#f36b3f] rounded cursor-pointer"
                          title="View live article"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => handleEditPost(post)}
                        className="p-1.5 text-[#211b29] hover:bg-[#eee6dc] rounded cursor-pointer"
                        title="Edit article"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStory(post.id)}
                        className="p-1.5 text-[#a62639] hover:bg-red-50 rounded cursor-pointer"
                        title="Delete article"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

