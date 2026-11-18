import "server-only";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Youtube from "@tiptap/extension-youtube";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { sanitizeHtml } from "@/lib/server/sanitize/html";

export const ALLOWED_TIPTAP_NODES = new Set([
  "doc",
  "paragraph",
  "heading",
  "text",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "codeBlock",
  "horizontalRule",
  "hardBreak",
  "image",
  "youtube",
  "table",
  "tableRow",
  "tableCell",
  "tableHeader",
]);

export const ALLOWED_TIPTAP_MARKS = new Set([
  "bold",
  "italic",
  "underline",
  "strike",
  "code",
  "link",
  "highlight",
]);

interface TiptapNode {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

/**
 * Validates Tiptap canonical JSON document against schema rules:
 * - Must be an object with type 'doc'
 * - Max depth: 10
 * - Max total nodes: 2000
 * - Only registered nodes & marks
 * - Rejects unsafe href / src (javascript:, data:, vbscript:)
 */
export function validateTiptapJson(doc: unknown): { valid: boolean; error?: string } {
  if (!doc || typeof doc !== "object") {
    return { valid: false, error: "Tiptap document must be an object." };
  }

  const root = doc as TiptapNode;
  if (root.type !== "doc") {
    return { valid: false, error: "Root document node must have type 'doc'." };
  }

  let nodeCount = 0;

  function traverse(node: TiptapNode, depth: number): string | null {
    if (depth > 10) {
      return "Document nesting exceeds maximum depth limit of 10.";
    }

    nodeCount++;
    if (nodeCount > 2000) {
      return "Document exceeds maximum allowed node limit of 2000.";
    }

    if (!ALLOWED_TIPTAP_NODES.has(node.type)) {
      return `Unsupported document node type: '${node.type}'.`;
    }

    // Check marks
    if (Array.isArray(node.marks)) {
      for (const mark of node.marks) {
        if (!ALLOWED_TIPTAP_MARKS.has(mark.type)) {
          return `Unsupported mark type: '${mark.type}'.`;
        }
        if (mark.type === "link" && mark.attrs?.href) {
          const href = String(mark.attrs.href).trim().toLowerCase();
          if (
            href.startsWith("javascript:") ||
            href.startsWith("data:") ||
            href.startsWith("vbscript:")
          ) {
            return "Unsafe link protocol detected.";
          }
        }
      }
    }

    // Check node attributes for image and youtube
    if (node.type === "image" && node.attrs?.src) {
      const src = String(node.attrs.src).trim().toLowerCase();
      if (!src.startsWith("https://") && !src.startsWith("http://")) {
        return "Image URL must use http or https.";
      }
    }

    if (node.type === "youtube" && node.attrs?.src) {
      const src = String(node.attrs.src).trim().toLowerCase();
      if (
        !src.includes("youtube.com") &&
        !src.includes("youtu.be")
      ) {
        return "YouTube embed URL must originate from youtube.com or youtu.be.";
      }
    }

    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        const err = traverse(child, depth + 1);
        if (err) return err;
      }
    }

    return null;
  }

  const error = traverse(root, 1);
  return error ? { valid: false, error } : { valid: true };
}

/**
 * Recursively extracts plain text from a Tiptap canonical JSON document.
 * Used for database full-text search indexing and reading time estimation.
 */
export function extractPlainTextFromTiptapJson(doc: unknown): string {
  if (!doc || typeof doc !== "object") return "";

  const root = doc as TiptapNode;
  const tokens: string[] = [];

  function walk(node: TiptapNode) {
    if (node.text) {
      tokens.push(node.text);
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child);
      }
    }
  }

  walk(root);
  return tokens.join(" ").trim();
}

/**
 * Calculates estimated reading time in minutes based on 200 words per minute.
 */
export function calculateReadingTimeMinutes(text: string): number {
  if (!text) return 1;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/**
 * Server-side HTML renderer: transforms Tiptap JSON to sanitized HTML.
 * Uses exact same extension configurations as the client editor.
 */
export function renderTiptapJsonToHtml(doc: unknown): string {
  if (!doc || typeof doc !== "object") return "";

  const validation = validateTiptapJson(doc);
  if (!validation.valid) {
    return "";
  }

  try {
    const rawHtml = generateHTML(doc as Record<string, unknown>, [
      StarterKit,
      Image,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer nofollow",
          target: "_blank",
        },
      }),
      Youtube.configure({
        HTMLAttributes: {
          class: "w-full aspect-video rounded-xl shadow-md",
        },
      }),
      Underline,
      Highlight,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Table.configure({
        resizable: false,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ]);

    return sanitizeHtml(rawHtml);
  } catch {
    return "";
  }
}

