"use client";

import { useRouter } from "next/navigation";
import { CloudinaryUpload } from "@/components/media/cloudinary-upload";

export function MediaLibraryUploader() {
  const router = useRouter();
  return (
    <CloudinaryUpload purpose="gallery" resourceType="image" onUploaded={() => router.refresh()} />
  );
}
