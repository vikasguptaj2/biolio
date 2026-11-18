import Image from "next/image";
import { Image as ImageIcon, Video } from "lucide-react";
import { getSessionContext, createClient } from "@/lib/supabase/server";
import { MediaLibraryUploader } from "@/components/media/media-library-uploader";

export default async function MediaLibraryPage() {
  const { workspace } = await getSessionContext();
  if (!workspace) return null;
  const supabase = await createClient();
  const { data: assets, error } = await supabase
    .from("media_assets")
    .select("id, purpose, secure_url, resource_type, format, bytes, width, height, lifecycle_state, created_at")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const formatBytes = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[1.5px] text-[#c45a3a]">Creator workspace</p>
          <h1 className="mt-2 font-editorial text-3xl font-bold text-[#211b29]">Media library</h1>
          <p className="mt-1 max-w-xl text-sm text-[#7c727e]">Upload and manage the verified images used across your creator website.</p>
        </div>
        <MediaLibraryUploader />
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">Could not load your media library. Refresh the page or contact support if this continues.</div>}

      {!error && (!assets || assets.length === 0) ? (
        <div className="rounded-2xl border border-dashed border-[#d8cdc0] bg-[#fffdf8] px-6 py-16 text-center">
          <ImageIcon className="mx-auto h-9 w-9 text-[#f36b3f]" />
          <h2 className="mt-4 font-editorial text-xl font-bold text-[#211b29]">Your library is ready</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[#7c727e]">Upload an image to start building your portfolio. Uploads are verified with Cloudinary and saved to your workspace.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(assets || []).map((asset) => (
            <article key={asset.id} className="overflow-hidden rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] shadow-xs">
              <div className="relative aspect-[4/3] bg-[#eee6dc]">
                {asset.resource_type === "image" ? (
                  <Image src={asset.secure_url} alt="Creator media asset" fill unoptimized className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" />
                ) : (
                  <video src={asset.secure_url} controls preload="metadata" className="h-full w-full object-cover" aria-label="Creator video asset" />
                )}
              </div>
              <div className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f4efe7] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#695f6c]">
                    {asset.resource_type === "video" ? <Video className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}{asset.purpose.replaceAll("_", " ")}
                  </span>
                  <span className="text-[10px] text-[#7c727e]">{formatBytes(asset.bytes)}</span>
                </div>
                <p className="truncate text-[10px] text-[#7c727e]">{asset.width && asset.height ? `${asset.width} × ${asset.height} · ` : ""}{asset.format.toUpperCase()} · {new Date(asset.created_at).toLocaleDateString()}</p>
                <a href={asset.secure_url} target="_blank" rel="noreferrer" className="inline-block text-[11px] font-bold text-[#c45a3a] hover:underline">Open original ↗</a>
              </div>
            </article>
          ))}
        </div>
      )}
      {(assets?.length || 0) === 200 && <p className="text-center text-xs text-[#7c727e]">Showing the 200 most recent assets.</p>}
    </div>
  );
}
