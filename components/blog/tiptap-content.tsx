import { createElement, Fragment, type ReactNode } from "react";
import { validateTiptapJson } from "@/lib/server/blog/tiptap-server";

interface TiptapNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>;
}

function safeHttpsUrl(input: unknown): string | null {
  if (typeof input !== "string" || input.length > 2_048) return null;
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function safeImageUrl(input: unknown): string | null {
  const safeUrl = safeHttpsUrl(input);
  if (!safeUrl) return null;
  try {
    const url = new URL(safeUrl);
    return url.hostname === "res.cloudinary.com" && url.pathname.includes("/image/upload/")
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function safeLink(input: unknown): string | null {
  if (typeof input !== "string" || input.length > 2_048) return null;
  const value = input.trim();
  if (!value || value.startsWith("//") || value.startsWith("/\\") || /[\u0000-\u001f]/.test(value)) return null;
  if (value.startsWith("/")) return value;
  try {
    const url = new URL(value);
    if (url.username || url.password) return null;
    if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
    if (url.protocol === "mailto:" || url.protocol === "tel:") return value;
  } catch {
    return null;
  }
  return null;
}

function renderText(node: TiptapNode, key: string): ReactNode {
  let result: ReactNode = node.text || "";
  for (const [index, mark] of (node.marks || []).entries()) {
    const markKey = `${key}-mark-${index}`;
    switch (mark.type) {
      case "bold": result = createElement("strong", { key: markKey }, result); break;
      case "italic": result = createElement("em", { key: markKey }, result); break;
      case "underline": result = createElement("u", { key: markKey }, result); break;
      case "strike": result = createElement("s", { key: markKey }, result); break;
      case "highlight": result = createElement("mark", { key: markKey }, result); break;
      case "code": result = createElement("code", { key: markKey }, result); break;
      case "link": {
        const href = safeLink(mark.attrs?.href);
        result = href
          ? createElement("a", {
              key: markKey,
              href,
              rel: "nofollow noopener noreferrer",
              target: href.startsWith("http") ? "_blank" : undefined,
            }, result)
          : result;
        break;
      }
    }
  }
  return result;
}

function getYouTubeEmbed(input: unknown): string | null {
  const safeUrl = safeHttpsUrl(input);
  if (!safeUrl) return null;
  try {
    const url = new URL(safeUrl);
    const hostname = url.hostname.toLowerCase();
    let videoId = "";
    if (hostname === "youtu.be") videoId = url.pathname.split("/").filter(Boolean)[0] || "";
    else if (hostname === "youtube.com" || hostname === "www.youtube.com" || hostname === "m.youtube.com") {
      videoId = url.searchParams.get("v") || url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1] || "";
    }
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
    return `https://www.youtube-nocookie.com/embed/${videoId}`;
  } catch {
    return null;
  }
}

function renderNode(node: TiptapNode, key: string): ReactNode {
  if (node.type === "text") return renderText(node, key);
  const children = (node.content || []).map((child, index) =>
    renderNode(child, `${key}-${index}`)
  );
  const attrs = node.attrs || {};

  switch (node.type) {
    case "doc": return createElement(Fragment, { key }, ...children);
    case "paragraph": return createElement("p", { key, className: "my-4 leading-8" }, ...children);
    case "heading": {
      const level = Number(attrs.level);
      const tag = `h${Number.isInteger(level) && level >= 1 && level <= 6 ? level : 2}`;
      return createElement(tag, { key, className: "mt-8 mb-3 font-semibold leading-tight" }, ...children);
    }
    case "bulletList": return createElement("ul", { key, className: "my-4 list-disc space-y-2 pl-6" }, ...children);
    case "orderedList": {
      const start = Number(attrs.start);
      return createElement("ol", {
        key,
        start: Number.isInteger(start) && start > 0 && start <= 10_000 ? start : undefined,
        className: "my-4 list-decimal space-y-2 pl-6",
      }, ...children);
    }
    case "listItem": return createElement("li", { key }, ...children);
    case "blockquote": return createElement("blockquote", { key, className: "my-6 border-l-2 border-current/30 pl-5 italic opacity-85" }, ...children);
    case "codeBlock": return createElement("pre", { key, className: "my-6 overflow-x-auto rounded-lg bg-black/5 p-4" }, createElement("code", null, ...children));
    case "horizontalRule": return createElement("hr", { key, className: "my-8 border-current/20" });
    case "hardBreak": return createElement("br", { key });
    case "image": {
      const src = safeImageUrl(attrs.src);
      if (!src) return null;
      const alt = typeof attrs.alt === "string" ? attrs.alt.slice(0, 300) : "";
      return createElement("figure", { key, className: "my-7" },
        createElement("img", { src, alt, loading: "lazy", decoding: "async", className: "h-auto max-w-full rounded-lg" }),
        typeof attrs.title === "string" && attrs.title
          ? createElement("figcaption", { className: "mt-2 text-center text-sm opacity-70" }, attrs.title.slice(0, 300))
          : null
      );
    }
    case "youtube": {
      const src = getYouTubeEmbed(attrs.src);
      if (!src) return null;
      return createElement("div", { key, className: "my-7 aspect-video overflow-hidden rounded-lg" },
        createElement("iframe", {
          src,
          title: "YouTube video",
          loading: "lazy",
          referrerPolicy: "strict-origin-when-cross-origin",
          allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
          allowFullScreen: true,
          className: "h-full w-full border-0",
        })
      );
    }
    case "table": return createElement("div", { key, className: "my-6 overflow-x-auto" }, createElement("table", { className: "w-full border-collapse text-left" }, ...children));
    case "tableRow": return createElement("tr", { key, className: "border-b border-current/15" }, ...children);
    case "tableCell": return createElement("td", { key, className: "px-3 py-2 align-top" }, ...children);
    case "tableHeader": return createElement("th", { key, scope: "col", className: "px-3 py-2 text-sm font-semibold" }, ...children);
    default: return createElement(Fragment, { key }, ...children);
  }
}

export function TiptapContent({ document }: { document: unknown }) {
  if (!validateTiptapJson(document).valid) return null;
  return <>{renderNode(document as TiptapNode, "root")}</>;
}

export function LegacyMarkdownContent({ markdown }: { markdown: string }) {
  const blocks = markdown
    .slice(0, 100_000)
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return <>{blocks.map((block, index) => {
    const heading = block.match(/^(#{1,6})\s+([\s\S]+)$/);
    if (heading) {
      const tag = `h${heading[1].length}`;
      return createElement(tag, { key: index, className: "mt-8 mb-3 font-semibold leading-tight" }, heading[2]);
    }
    if (block.startsWith("> ")) {
      return createElement("blockquote", { key: index, className: "my-6 border-l-2 border-current/30 pl-5 italic opacity-85" }, block.slice(2));
    }
    if (/^(?:[-*])\s/m.test(block)) {
      const items = block.split("\n").map((line) => line.match(/^(?:[-*])\s+(.+)$/)?.[1]).filter((line): line is string => Boolean(line));
      return createElement("ul", { key: index, className: "my-4 list-disc space-y-2 pl-6" }, ...items.map((item, itemIndex) => createElement("li", { key: itemIndex }, item)));
    }
    return createElement("p", { key: index, className: "my-4 leading-8" }, block);
  })}</>;
}
