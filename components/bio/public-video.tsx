import { ArrowUpRight, Play } from "lucide-react";
import { parsePublicVideoLink } from "@/lib/video-links";

export function PublicVideo({
  url,
  title,
  inkColor,
  surfaceColor,
  accentColor,
}: {
  url: string;
  title: string;
  inkColor: string;
  surfaceColor: string;
  accentColor: string;
}) {
  const video = parsePublicVideoLink(url);
  if (!video) return null;

  if (video.embedUrl) {
    return (
      <div className="aspect-video w-full overflow-hidden bg-black">
        <iframe
          src={video.embedUrl}
          title={title || `${video.hostLabel} video`}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="h-full w-full border-0"
        />
      </div>
    );
  }

  return (
    <a
      href={video.canonicalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex aspect-video w-full flex-col items-center justify-center gap-3 p-5 text-center transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-4"
      style={{ backgroundColor: inkColor, color: surfaceColor }}
      aria-label={`Watch ${title || "video"} on ${video.hostLabel} (opens in a new tab)`}
    >
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: accentColor, color: "#ffffff" }}
      >
        <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden="true" />
      </span>
      <span className="inline-flex items-center gap-2 text-sm font-bold">
        Watch on {video.hostLabel}
        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
      </span>
    </a>
  );
}
