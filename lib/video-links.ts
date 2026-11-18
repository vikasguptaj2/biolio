export interface PublicVideoLink {
  canonicalUrl: string;
  hostLabel: string;
  embedUrl: string | null;
}

const YOUTUBE_ID = /^[a-zA-Z0-9_-]{11}$/;
const VIMEO_ID = /^\d{5,12}$/;
const DRIVE_ID = /^[a-zA-Z0-9_-]{10,}$/;

/**
 * Parses a creator supplied video URL without fetching it. Only known video
 * providers receive an iframe URL; every other HTTPS URL stays a normal link.
 */
export function parsePublicVideoLink(input: unknown): PublicVideoLink | null {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw || raw.length > 2_048) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  if (
    (url.protocol !== "https:" && url.protocol !== "http:") ||
    url.username ||
    url.password ||
    !url.hostname
  ) {
    return null;
  }

  url.protocol = "https:";
  url.hash = "";
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const canonicalUrl = url.toString();

  if (host === "youtu.be" || host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const pathId = url.pathname.match(/^\/(?:embed\/|shorts\/|live\/)?([a-zA-Z0-9_-]{11})(?:\/|$)/)?.[1];
    const id = host === "youtu.be" ? url.pathname.split("/").filter(Boolean)[0] : url.searchParams.get("v") || pathId;
    if (!id || !YOUTUBE_ID.test(id)) return null;
    return {
      canonicalUrl,
      hostLabel: "YouTube",
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
    };
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const pathParts = url.pathname.split("/").filter(Boolean);
    const idIndex = pathParts.findIndex((part) => VIMEO_ID.test(part));
    const id = idIndex >= 0 ? pathParts[idIndex] : undefined;
    if (!id) return null;
    const unlistedHash = url.searchParams.get("h") || pathParts[idIndex + 1] || "";
    const hashParam = /^[a-zA-Z0-9_-]{4,100}$/.test(unlistedHash)
      ? `?h=${encodeURIComponent(unlistedHash)}`
      : "";
    return {
      canonicalUrl,
      hostLabel: "Vimeo",
      embedUrl: `https://player.vimeo.com/video/${id}${hashParam}`,
    };
  }

  if (host === "drive.google.com") {
    const pathId = url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1];
    const id = url.searchParams.get("id") || pathId;
    if (!id || !DRIVE_ID.test(id)) return null;
    return {
      canonicalUrl,
      hostLabel: "Google Drive",
      embedUrl: `https://drive.google.com/file/d/${id}/preview`,
    };
  }

  if (host === "x.com" || host === "twitter.com") {
    return { canonicalUrl, hostLabel: "X", embedUrl: null };
  }

  return { canonicalUrl, hostLabel: host, embedUrl: null };
}

export function normalizePublicHttpsUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw || raw.length > 2_048) return null;

  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      url.username ||
      url.password ||
      !url.hostname
    ) {
      return null;
    }
    url.protocol = "https:";
    return url.toString();
  } catch {
    return null;
  }
}
