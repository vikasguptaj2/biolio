"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";

export type MediaPurpose = "avatar" | "cover" | "gallery" | "blog_cover" | "collab_logo";
export type MediaResourceType = "image";

interface SignedUpload {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
  publicId: string;
  overwrite: false;
  resourceType: MediaResourceType;
  allowedFormats: string;
  maxBytes: number;
}

export interface UploadedMedia {
  id: string;
  secure_url: string;
  purpose: MediaPurpose;
  resource_type: MediaResourceType;
  format: string;
  bytes: number;
  width: number | null;
  height: number | null;
}

export async function uploadCloudinaryAsset(
  file: File,
  purpose: MediaPurpose,
  resourceType: MediaResourceType,
  bioProfileId?: string,
): Promise<UploadedMedia> {
  if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
    throw new Error("Choose a file smaller than 10 MB.");
  }

  const signResponse = await fetch("/api/media/cloudinary/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purpose, resourceType }),
  });
  const signData = await signResponse.json();
  if (!signResponse.ok || !signData?.ok) {
    throw new Error(signData?.error?.message || "Could not prepare secure upload.");
  }
  const signed = signData as SignedUpload;
  if (!signed.cloudName || !signed.signature || signed.maxBytes < file.size) {
    throw new Error("Upload configuration is incomplete or the file is too large.");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", signed.apiKey);
  form.append("timestamp", String(signed.timestamp));
  form.append("signature", signed.signature);
  form.append("folder", signed.folder);
  form.append("public_id", signed.publicId);
  form.append("overwrite", "false");
  form.append("allowed_formats", signed.allowedFormats);

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(signed.cloudName)}/${signed.resourceType}/upload`,
    { method: "POST", body: form },
  );
  const cloudinaryData = await uploadResponse.json();
  if (!uploadResponse.ok || typeof cloudinaryData?.public_id !== "string") {
    throw new Error(cloudinaryData?.error?.message || "Cloudinary upload failed.");
  }

  const finalizeResponse = await fetch("/api/media/cloudinary/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      purpose,
      resourceType: signed.resourceType,
      cloudinaryPublicId: cloudinaryData.public_id,
      ...(bioProfileId ? { bioProfileId } : {}),
    }),
  });
  const finalizeData = await finalizeResponse.json();
  if (!finalizeResponse.ok || !finalizeData?.mediaAsset) {
    throw new Error(finalizeData?.error?.message || "Upload verification could not be completed.");
  }
  return finalizeData.mediaAsset as UploadedMedia;
}

export function CloudinaryUpload({
  purpose = "gallery",
  resourceType = "image",
  bioProfileId,
  onUploaded,
  compact = false,
}: {
  purpose?: MediaPurpose;
  resourceType?: MediaResourceType;
  bioProfileId?: string;
  onUploaded?: (asset: UploadedMedia) => void;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function upload(file: File) {
    setMessage("");
    setBusy(true);
    try {
      const asset = await uploadCloudinaryAsset(file, purpose, resourceType, bioProfileId);
      setMessage("Upload complete.");
      onUploaded?.(asset);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-1.5">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        disabled={busy}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void upload(file);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className={`inline-flex items-center justify-center gap-2 rounded-lg border border-[#e5dcd1] bg-white text-xs font-bold text-[#211b29] transition-colors hover:border-[#f36b3f] disabled:cursor-wait disabled:opacity-60 ${compact ? "px-2.5 py-1.5" : "px-4 py-2.5"}`}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5 text-[#f36b3f]" />}
        {busy ? "Uploading securely…" : "Upload image"}
      </button>
      {message && <p role="status" className="text-[11px] text-[#7c727e]">{message}</p>}
    </div>
  );
}
