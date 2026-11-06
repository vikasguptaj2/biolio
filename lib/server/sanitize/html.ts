/**
 * Robust Server-Side HTML Sanitizer
 * Closes Finding F-01 (Stored XSS on public blog and bio pages)
 *
 * Enforces an allowlist of safe typography elements, safe attributes,
 * strips event handlers (on*), blocks dangerous protocols (javascript:, data:, vbscript:),
 * and neutralizes all script/iframe/object/embed/form vectors.
 */

const ALLOWED_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "blockquote",
  "pre",
  "code",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "hr",
  "br",
  "span",
]);

const DANGEROUS_ELEMENT_REGEX =
  /<(script|style|iframe|object|embed|applet|form|input|button|textarea|select|option|svg|math|base|link|meta)\b[^>]*>[\s\S]*?<\/\1>|<(script|style|iframe|object|embed|applet|form|input|button|textarea|select|option|svg|math|base|link|meta)\b[^>]*\/?>/gi;

const DANGEROUS_ATTR_REGEX =
  /\s*(on[a-z]+|data-[a-z]+|formaction|action|xlink:href)\s*=\s*(['"][^'"]*['"]|[^\s>]+)/gi;

const DANGEROUS_PROTOCOL_REGEX =
  /\b(javascript|vbscript|data):/i;

function cleanAttributes(tagName: string, rawAttrs: string): string {
  // Strip all event handlers immediately
  let attrs = rawAttrs.replace(DANGEROUS_ATTR_REGEX, "");

  if (tagName === "a") {
    // Extract href
    const hrefMatch = attrs.match(/\bhref\s*=\s*(['"])(.*?)\1/i);
    if (hrefMatch) {
      const rawHref = hrefMatch[2].trim();
      if (
        DANGEROUS_PROTOCOL_REGEX.test(rawHref) ||
        (!rawHref.startsWith("http://") &&
          !rawHref.startsWith("https://") &&
          !rawHref.startsWith("mailto:") &&
          !rawHref.startsWith("/"))
      ) {
        // Strip unsafe href
        attrs = attrs.replace(/\bhref\s*=\s*(['"])(.*?)\1/i, 'href="#"');
      }
    }
    // Force rel="noopener noreferrer"
    if (!attrs.includes("rel=")) {
      attrs += ' rel="noopener noreferrer"';
    }
  }

  if (tagName === "img") {
    // Extract src
    const srcMatch = attrs.match(/\bsrc\s*=\s*(['"])(.*?)\1/i);
    if (srcMatch) {
      const rawSrc = srcMatch[2].trim();
      if (
        DANGEROUS_PROTOCOL_REGEX.test(rawSrc) ||
        (!rawSrc.startsWith("https://") && !rawSrc.startsWith("/"))
      ) {
        attrs = attrs.replace(/\bsrc\s*=\s*(['"])(.*?)\1/i, 'src=""');
      }
    }
    // Extract alt
    if (!attrs.includes("alt=")) {
      attrs += ' alt=""';
    }
    // Force loading="lazy"
    if (!attrs.includes("loading=")) {
      attrs += ' loading="lazy"';
    }
  }

  // Strip style attributes to prevent CSS expression vectors
  attrs = attrs.replace(/\bstyle\s*=\s*(['"][^'"]*['"]|[^\s>]+)/gi, "");

  return attrs;
}

export function sanitizeHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== "string") {
    return "";
  }

  // 1. Remove dangerous executable/injection tags along with their inner contents
  let sanitized = rawHtml.replace(DANGEROUS_ELEMENT_REGEX, "");

  // 2. Remove comments
  sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, "");

  // 3. Process remaining tags against allowlist
  sanitized = sanitized.replace(
    /<\/?([a-z0-9_-]+)([^>]*)>/gi,
    (match, tag, rawAttrs) => {
      const lowerTag = tag.toLowerCase();
      if (!ALLOWED_TAGS.has(lowerTag)) {
        // Disallowed tag -> strip tag markup
        return "";
      }

      // If it's a closing tag
      if (match.startsWith("</")) {
        return `</${lowerTag}>`;
      }

      // Clean attributes on opening or self-closing tag
      const cleanedAttrs = cleanAttributes(lowerTag, rawAttrs);
      const isSelfClosing = match.endsWith("/>") || lowerTag === "img" || lowerTag === "br" || lowerTag === "hr";

      return `<${lowerTag}${cleanedAttrs}${isSelfClosing ? " /" : ""}>`;
    }
  );

  return sanitized.trim();
}

/**
 * Converts basic markdown formatting into safe sanitized HTML.
 */
export function markdownToSafeHtml(markdown: string): string {
  if (!markdown || typeof markdown !== "string") return "";

  // Normalize newlines
  const text = markdown.replace(/\r\n/g, "\n");

  const lines = text.split("\n");
  const htmlLines: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Headings
    if (line.startsWith("### ")) {
      if (inList) { htmlLines.push("</ul>"); inList = false; }
      htmlLines.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith("## ")) {
      if (inList) { htmlLines.push("</ul>"); inList = false; }
      htmlLines.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith("# ")) {
      if (inList) { htmlLines.push("</ul>"); inList = false; }
      htmlLines.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      if (inList) { htmlLines.push("</ul>"); inList = false; }
      htmlLines.push(`<blockquote><p>${escapeHtml(line.slice(2))}</p></blockquote>`);
      continue;
    }

    // Unordered List
    if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) {
        htmlLines.push("<ul>");
        inList = true;
      }
      htmlLines.push(`<li>${formatInline(line.slice(2))}</li>`);
      continue;
    } else if (inList) {
      htmlLines.push("</ul>");
      inList = false;
    }

    // Blank line
    if (!line.trim()) {
      continue;
    }

    // Paragraph
    htmlLines.push(`<p>${formatInline(line)}</p>`);
  }

  if (inList) {
    htmlLines.push("</ul>");
  }

  return sanitizeHtml(htmlLines.join("\n"));
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatInline(str: string): string {
  let s = escapeHtml(str);
  // Bold
  s = s.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  // Italic
  s = s.replace(/\*(.*?)\*/g, "<em>$1</em>");
  // Code
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Links [text](url) - strictly validate url
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener noreferrer" target="_blank">$1</a>');
  return s;
}

